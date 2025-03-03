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

import { ContractFactory } from '../contract-factory';

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
    getLatestHistoryCid(personaName: string, accountName: string): Promise<{ full_convo_history_cid: string } | null> {
        return this.getRows({
            contract: personaName,
            scope: personaName,
            table: "convos",
            lower_bound: accountName,
            upper_bound: accountName,
            key_type: "name",
            limit: 1
        }).then(result => result.rows[0] || null);
    }
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
        privateKey: string
    ): Promise<API.v1.PushTransactionResponse | undefined> {
        try {
            const actions = await this.anyToAction(action);
            const info = await wire.v1.chain.get_info();
            const header = info.getTransactionHeader();
            const transaction = Transaction.from({ ...header, actions });
            const digest = transaction.signingDigest(info.chain_id);
    
            const pvt_key = PrivateKey.from(privateKey);
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
        backstory: string,
        initialStateCid: string
    ) {
        console.log('Starting contract deployment for persona:', personaName);
        
        // Instantiate the ContractFactory
        console.log('Creating ContractFactory instance...');
        const factory = new ContractFactory(
            config.wire.endpoint,
            personaName,
            PrivateKey.from(config.wire.sysioPrivateKey)
        );

        // Get contract code
        const wasmHexString = config.persona.wasm;
        const serializedAbiHex = config.persona.abi;
        console.log('Contract code loaded');

        // Step 1: Deploy the new persona contract
        console.log('Deploying persona contract...');
        const deployResult = await factory.deployContract(
            personaName,
            wasmHexString,
            serializedAbiHex
        );
        console.log('Contract deployed successfully:', {
            transaction_id: deployResult.transaction_id,
            persona: personaName
        });

        // Step 2: Add policy to the new persona account
        console.log('Adding resource policy...');
        const addPolicyAction = {
            account: "sysio.roa",
            name: "addpolicy",
            authorization: [
                {
                    actor: "nodedaddy",
                    permission: "active",
                },
            ],
            data: {
                owner: personaName,
                issuer: "nodedaddy",
                net_weight: "0.5000 SYS",
                cpu_weight: "0.5000 SYS",
                ram_weight: "1.0000 SYS",
                time_block: 1,
                network_gen: 0
            },
        };

        const policyResponse = await this.pushTransaction(addPolicyAction, config.wire.nodedaddyPrivateKey);
        console.log('Resource policy added:', {
            transaction_id: policyResponse?.transaction_id
        });

        // Step 3: Store the persona in the allpersonas contract
        console.log('Storing persona in allpersonas contract...');
        const storePersonaAction = {
            account: "allpersonas",
            name: "storepersona",
            authorization: [
                {
                    actor: "allpersonas",
                    permission: "active",
                },
            ],
            data: {
                persona_name: personaName,
            },
        };
        const storePersonaResponse = await this.pushTransaction(storePersonaAction, config.wire.allpersonasPrivateKey);
        console.log('Persona stored in allpersonas:', {
            transaction_id: storePersonaResponse?.transaction_id,
            persona_name: personaName
        });

        // Step 4: Initialize the persona contract
        console.log('Initializing persona contract...');
        const initPersonaAction = {
            account: personaName,
            name: 'initpersona',
            authorization: [
                {
                    actor: personaName,
                    permission: 'active',
                },
            ],
            data: {
                initial_state_cid: initialStateCid,
            },
        };

        const initResponse = await this.pushTransaction(initPersonaAction, config.wire.sysioPrivateKey);
        console.log('Persona contract initialized:', {
            transaction_id: initResponse?.transaction_id,
            initial_state_cid: initialStateCid
        });

        return {
            deployResult,
            initResponse,
            storePersonaResponse
        };
    }

    async submitMessage(
        personaName: string,
        userAccount: string,
        preStateCid: string,
        messageCid: string,
        fullConvoHistoryCid: string,
        isWalletAuth?: boolean,
        privateKey?: string
    ) {
        const action = {
            account: personaName,
            name: 'submitmsg',
            authorization: [
                {
                    actor: userAccount,
                    permission: 'active',
                },
            ],
            data: {
                account_name: userAccount,
                pre_state_cid: preStateCid,
                msg_cid: messageCid,
                full_convo_history_cid: fullConvoHistoryCid,
            },
        };

        if (isWalletAuth) {
            // Get EthereumService instance and use it to sign and push
            const ethService = (await import('./ethereum-service')).EthereumService.getInstance();
            return ethService.signAndPushTransaction(action);
        } else if (privateKey) {
            return this.pushTransaction(action, privateKey);
        } else {
            throw new Error('No private key provided for transaction');
        }
    }

    async getPersonas(): Promise<any[]> {
        const result = await this.getRows({
            contract: "allpersonas",
            table: "personas"
        });
        console.log('Raw personas from allpersonas:', result.rows);
        return result.rows;
    }

    async getPersona(personaName: string) {
        try {
            // Get persona info from the persona's contract
            const personaInfo = await this.getRows({
                contract: personaName,
                table: "personainfo",
                scope: personaName,
                limit: 1,
                lower_bound: 1,
                upper_bound: 1
            });

            if (personaInfo.rows.length === 0) {
                throw new Error('Persona info not found');
            }

            // Add debug logging
            console.log('Raw persona info:', personaInfo.rows[0]);

            return {
                persona_name: personaName,
                initial_state_cid: personaInfo.rows[0].initial_state_cid
            };
        } catch (error) {
            console.error(`Error fetching persona ${personaName}:`, error);
            throw error;
        }
    }

    async getMessages(personaName: string, userAccount?: string): Promise<{
        messages: any[];
    }> {
        const result: {
            messages: any[];
        } = {
            messages: []
        };

        // Get messages for the specific user
        if (userAccount) {
            const messagesResult = await this.getRows({
                contract: personaName,
                scope: userAccount,
                table: "messages",
                limit: 100,  // Reasonable limit for pagination
                reverse: true  // Get newest messages first
            });
            result.messages = messagesResult.rows;
        }

        return result;
    }

    async verifyAccount(accountName: string, privateKey: string): Promise<boolean> {
        try {
            // Get account info
            const accountInfo = await wire.v1.chain.get_account(accountName);
            
            // Convert private key to public key
            const pvtKey = PrivateKey.from(privateKey);
            const publicKey = pvtKey.toPublic().toString();

            // Check if the public key exists in active permission
            const activePermission = accountInfo.permissions.find(p => p.perm_name.toString() === 'active');
            if (!activePermission) return false;

            // Check if the derived public key matches any key in the active permission
            return activePermission.required_auth.keys.some(k => k.key.toString() === publicKey);
        } catch (error) {
            console.error('Account verification error:', error);
            return false;
        }
    }

    async getChainInfo(): Promise<API.v1.GetInfoResponse> {
        return wire.v1.chain.get_info();
    }

    async createTransaction(action: AnyAction | AnyAction[]): Promise<Transaction> {
        const actions = await this.anyToAction(action);
        const info = await wire.v1.chain.get_info();
        const header = info.getTransactionHeader();
        return Transaction.from({ ...header, actions });
    }

    async pushSignedTransaction(transaction: Transaction, signatures: string[]): Promise<API.v1.PushTransactionResponse> {
        const signedTrx = SignedTransaction.from({ ...transaction, signatures });
        return wire.v1.chain.push_transaction(signedTrx);
    }

    async getAccount(accountName: string): Promise<API.v1.AccountObject> {
        return wire.v1.chain.get_account(accountName);
    }
}
