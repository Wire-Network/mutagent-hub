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
        privateKey?: string
    ): Promise<API.v1.PushTransactionResponse | undefined> {
        try {
            const actions = await this.anyToAction(action);
            const info = await wire.v1.chain.get_info();
            const header = info.getTransactionHeader();
            const transaction = Transaction.from({ ...header, actions });
            const digest = transaction.signingDigest(info.chain_id);
    
            // Use provided private key or fall back to demo key
            const pvt_key = PrivateKey.from(privateKey || config.wire.demoPrivateKey);
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
        // Instantiate the ContractFactory.
        // Note: Here we use the personaName as the new account name.
        const factory = new ContractFactory(
            config.wire.endpoint,
            personaName,
            PrivateKey.from(config.wire.demoPrivateKey)
        );

        // Retrieve the persona contract's WASM and ABI from configuration.
        // (Make sure these values are defined in your config file, for example in config.persona)
        const wasmHexString = config.persona.wasm;
        const serializedAbiHex = config.persona.abi;

        // Step 1: Deploy the new persona contract.
        const deployResult = await factory.deployContract(
            personaName,
            wasmHexString,
            serializedAbiHex
        );
        console.log(`Contract deployed for ${personaName}. Transaction ID: ${deployResult.transaction_id}`);

        // Step 2: Add policy to the new persona account.
        const addPolicyAction = {
            account: "sysio.roa",
            name: "addpolicy",
            authorization: [
                {
                    actor: "nodeowner1",
                    permission: "active",
                },
            ],
            data: {
                owner: personaName,
                issuer: "nodeowner1",
                net_weight: "0.0300 SYS",
                cpu_weight: "0.0300 SYS",
                ram_weight: "0.0030 SYS",
                time_block: 1,
                network_gen: 0
            },
        };
        const addPolicyResponse = await this.pushTransaction(addPolicyAction);
        console.log(`Policy added to the persona account. Transaction ID: ${addPolicyResponse.transaction_id}`);

        // Step 2: Store the newly created persona in the personas table.
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
        const storePersonaResponse = await this.pushTransaction(storePersonaAction);
        console.log(`Persona stored in the personas table. Transaction ID: ${storePersonaResponse.transaction_id}`);

        // Step 3: Initialize the persona contract by calling the "initpersona" action.
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

        // Make sure that the pushTransaction method is available (it might need to be made public).
        const initResponse = await this.pushTransaction(initPersonaAction);
        console.log(`initpersona action complete for ${personaName}. Transaction ID: ${initResponse.transaction_id}`);

        return {
            deployResult,
            initResponse,
        };
    }

    async submitMessage(
        personaName: string,
        userAccount: string,
        preStateCid: string,
        messageCid: string,
        fullConvoHistoryCid: string,
    ) {
        const action = {
            account: personaName,
            name: 'submitmsg',
            authorization: [
                {
                    actor: personaName,
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

        return this.pushTransaction(action);
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
                scope: personaName,  // This is the contract's own scope
                limit: 1,
                lower_bound: 1,  // The ID is always 1 as per the contract
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
        conversation?: { account_name: string; full_convo_history_cid: string };
        messages: any[];
    }> {
        const result: {
            conversation?: { account_name: string; full_convo_history_cid: string };
            messages: any[];
        } = {
            messages: []
        };

        // If userAccount is provided, get their specific messages
        if (userAccount) {
            const messagesResult = await this.getRows({
                contract: personaName,
                scope: userAccount,
                table: "messages"
            });
            result.messages = messagesResult.rows;

            // Get the conversation history for this user
            const convosResult = await this.getRows({
                contract: personaName,
                scope: personaName,
                table: "convos",
                lower_bound: userAccount,
                upper_bound: userAccount,
                key_type: "name",
                limit: 1
            });
            
            if (convosResult.rows.length > 0) {
                result.conversation = convosResult.rows[0];
            }
        } else {
            // If no userAccount provided, get all conversations
            const convosResult = await this.getRows({
                contract: personaName,
                scope: personaName,
                table: "convos"
            });
            result.conversation = convosResult.rows[0];
        }

        return result;
    }
}
