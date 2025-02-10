
import {
    APIClient,
    FetchProvider,
    API,
    AnyAction,
    ABI,
    NameType,
    Action,
    Transaction,
    SignedTransaction,
    APIError,
    PrivateKey
} from '@wireio/core';
import config from '../config';

// Initialize WIRE client
const wire = new APIClient({ provider: new FetchProvider(config.wire.endpoint) });

// Define valid table index types according to WIRE API
type TableIndexType = 'i64' | 'i128' | 'float64' | 'float128' | 'sha256' | 'ripemd160';

export interface GetRowsOptions {
    contract: string;
    scope?: string;
    table: string;
    index_position?: string | number;
    limit?: number;
    lower_bound?: string | number;
    upper_bound?: string | number;
    key_type?: TableIndexType;
    reverse?: boolean;
}

export class WireService {
    private static instance: WireService;
    private knownAbis = new Map<NameType, ABI>();

    private constructor() {}

    static getInstance(): WireService {
        if (!WireService.instance) {
            WireService.instance = new WireService();
        }
        return WireService.instance;
    }

    async getRows(options: GetRowsOptions): Promise<API.v1.GetTableRowsResponse> {
        try {
            const response = await wire.v1.chain.get_table_rows({
                json: true,
                code: options.contract,
                scope: options.scope ?? options.contract,
                table: options.table,
                index_position: options.index_position,
                limit: options.limit ?? 100,
                lower_bound: options.lower_bound,
                upper_bound: options.upper_bound,
                key_type: options.key_type || 'i64',
                reverse: options.reverse,
            });
            
            return {
                rows: [],
                more: false,
                next_key: "",
                ...response
            };
        } catch (e: any) {
            console.error('Error fetching rows:', e);
            if (e.details?.[0]?.message?.includes("Table does not exist") || 
                e.details?.[0]?.message?.includes("Fail to retrieve")) {
                return {
                    rows: [],
                    more: false,
                    next_key: ""
                };
            }
            throw e;
        }
    }

    private async anyToAction(action: AnyAction | AnyAction[]): Promise<Action[]> {
        if (!Array.isArray(action)) action = [action];
        const actions: Action[] = [];
        
        for (const act of action) {
            if (!this.knownAbis.has(act.account)) {
                const abiRes = await wire.v1.chain.get_abi(act.account);
                this.knownAbis.set(act.account, ABI.from(abiRes.abi!));
            }
            actions.push(Action.from(act, this.knownAbis.get(act.account)!));
        }
        return actions;
    }

    async pushTransaction(
        action: AnyAction | AnyAction[],
        privateKeyStr: string
    ): Promise<API.v1.PushTransactionResponse> {
        try {
            const actions = await this.anyToAction(action);
            const info = await wire.v1.chain.get_info();
            const header = info.getTransactionHeader();
            const transaction = Transaction.from({ ...header, actions });
            const digest = transaction.signingDigest(info.chain_id);

            const pvtKey = PrivateKey.from(privateKeyStr);
            const signature = pvtKey.signDigest(digest).toString();

            const signedTrx = SignedTransaction.from({
                ...transaction,
                signatures: [signature]
            });

            return await wire.v1.chain.push_transaction(signedTrx);
        } catch (e) {
            if (e instanceof APIError) {
                console.error("Transaction error:", e.details[0].message);
            } else {
                console.error("Transaction error:", e);
            }
            throw e;
        }
    }

    async addPersona(
        personaName: string,
        initialStateCid: string
    ) {
        const action = {
            account: config.wire.contract,
            name: 'addpersona',
            authorization: [
                {
                    actor: config.wire.contract,
                    permission: 'active',
                },
            ],
            data: {
                persona_name: personaName,
                initial_state_cid: initialStateCid,
            },
        };

        return this.pushTransaction(action, config.wire.demoPrivateKey);
    }

    async submitMessage(
        personaName: string,
        messageCid: string,
        privateKey: string
    ) {
        const action = {
            account: config.wire.contract,
            name: 'submitmsg',
            authorization: [
                {
                    actor: config.wire.contract,
                    permission: 'active',
                },
            ],
            data: {
                persona_name: personaName,
                message_cid: messageCid,
            },
        };

        return this.pushTransaction(action, privateKey);
    }

    async getPersonas(): Promise<any[]> {
        const result = await this.getRows({
            contract: config.wire.contract,
            table: 'personas'
        });
        return result.rows;
    }

    async getMessages(personaName?: string, limit = 100): Promise<any[]> {
        const options: GetRowsOptions = {
            contract: config.wire.contract,
            table: 'messages',
            limit
        };

        if (personaName) {
            options.index_position = 2;
            options.key_type = 'i64';
            options.lower_bound = personaName;
            options.upper_bound = personaName;
        }

        const result = await this.getRows(options);
        return result.rows;
    }
}
