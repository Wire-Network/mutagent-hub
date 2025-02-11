/* eslint-disable @typescript-eslint/no-explicit-any */
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
export interface GetRowsOptions {
    contract: NameType;
    scope?: NameType;
    table: NameType;
    index_position?: "primary" | "secondary" | "tertiary" | "fourth" | "fifth" | "sixth" | "seventh" | "eighth" | "ninth" | "tenth" | undefined;
    limit?: number;
    lower_bound?: NameType | number | string ;
    upper_bound?: NameType | number | string ;
    key_type?: NameType | number | string ;
    reverse?: boolean;
    [key: string]: any; // Add this line
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

    async getRows<T = any>(options: GetRowsOptions): Promise<API.v1.GetTableRowsResponse<any, T>> {
        try {
            // Trim string fields
            for (const key in options) {
                if (typeof options[key] === 'string') {
                    options[key] = (options[key] as string).trim();
            }
            }
            if (!options.key_type) options.key_type = 'uint64'; // default to int keytype
        
            const response = await wire.v1.chain.get_table_rows({
                json: true,
                code: options.contract,
                scope: options.scope !== undefined ? options.scope : options.contract,
                table: options.table,
                index_position: options.index_position,
                limit: options.limit ?? 100,
                lower_bound: options.lower_bound,
                upper_bound: options.upper_bound,
                key_type: options.key_type as any,
                reverse: options.reverse,
            });

            return response as API.v1.GetTableRowsResponse<any, T>;
        } catch (e: any) {
            console.error('getRows error:', e.error?.details?.[0]?.message);
            throw e;
        }
    }

    async anyToAction(action: AnyAction | AnyAction[]): Promise<Action[]> {
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
    ): Promise<API.v1.PushTransactionResponse | undefined> {
        try {
            const actions = await this.anyToAction(action);
            const info = await wire.v1.chain.get_info();
            const header = info.getTransactionHeader();
            const transaction = Transaction.from({ ...header, actions });
            const digest = transaction.signingDigest(info.chain_id);
    
            const pvt_key = PrivateKey.from(privateKeyStr);
            const signature = pvt_key.signDigest(digest).toString();
    
            const signedTrx = SignedTransaction.from({ ...transaction, signatures: [signature] });
            return await wire.v1.chain.push_transaction(signedTrx);
        } catch (e) {
            if (e instanceof APIError) console.log("PushTransaction error:", e.details[0].message);
            else console.log("PushTransaction error:", e);
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
            options.index_position = "secondary";
            options.key_type = 'name';
            options.lower_bound = personaName;
            options.upper_bound = personaName;
        }

        const result = await this.getRows(options);
        return result.rows;
    }
}
