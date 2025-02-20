import { 
    APIClient, 
    FetchProvider, 
    AnyAction,
    API,
    PermissionLevel,
    Name,
    Transaction,
    SignedTransaction,
    PrivateKey,
    Action,
    ABI,
    NameType,
    APIError
} from '@wireio/core';



export class ContractFactory {
    private api: APIClient;

    constructor(
        private endpoint: string,
        private account: string,
        private pvt_key: PrivateKey
    ) {
        this.api = new APIClient({ 
            provider: new FetchProvider(endpoint)
        });

    }

    /**
     * Converts AnyAction to Action array with proper ABI resolution
     */
    private async anyToAction(action: AnyAction | AnyAction[]): Promise<Action[]> {
        if (!Array.isArray(action)) action = [action];
        const actions: Action[] = [];
        const knownAbis = new Map<NameType, ABI>();
        
        for (const act of action) {
            if (!knownAbis.has(act.account)) {
                const abi_res = await this.api.v1.chain.get_abi(act.account);
                knownAbis.set(act.account, ABI.from(abi_res.abi!));
            }
            actions.push(Action.from(act, knownAbis.get(act.account)!));
        }
        return actions;
    }

    /**
     * Signs and pushes a transaction to the blockchain.
     */
    private async pushTransaction(
        action: AnyAction | AnyAction[],
    ): Promise<API.v1.PushTransactionResponse> {
        try {
            const actions = await this.anyToAction(action);
            const info = await this.api.v1.chain.get_info();
            const header = info.getTransactionHeader();
            const transaction = Transaction.from({ ...header, actions });
            const digest = transaction.signingDigest(info.chain_id);

            const signature = this.pvt_key.signDigest(digest).toString();

            const signedTrx = SignedTransaction.from({ 
                ...transaction, 
                signatures: [signature] 
            });
            
            return await this.api.v1.chain.push_transaction(signedTrx);
        } catch (e) {
            if (e instanceof APIError) {
                console.error("PushTransaction error:", e.details[0].message);
            } else {
                console.error("PushTransaction error:", e);
            }
            throw e;
        }
    }

    /**
     * Creates a new account and deploys a smart contract to that account.
     *
     * The flow bundles three actions into a single transaction:
     * 1. newaccount – Creates a new account with owner/active keys.
     * 2. setcode – Deploys the WASM code to the new account.
     * 3. setabi – Deploys the ABI to the new account.
     *
     * @param newAccountName The name for the new account.
     * @param wasmHexString The hex string of the WASM file.
     * @param serializedAbiHex The hex string of the ABI file.
     * @param privateKey The private key used for signing the transaction and setting up the new account's keys.
     */
    async deployContract(
        accountName: string,
        wasmHexString: string,
        serializedAbiHex: string
    ): Promise<API.v1.PushTransactionResponse> {
        console.log(`Starting contract deployment process for account: ${accountName}`);
        
        try {
            console.log('Creating account...');
            // 1. Prepare the creator's authorization
            const creatorAuth = [
                PermissionLevel.from({ 
                    actor: Name.from(this.account), 
                    permission: Name.from('active') 
                })
            ];

            const sysioAuth = [
                PermissionLevel.from({ 
                    actor: Name.from('sysio'), 
                    permission: Name.from('active') 
                })
            ];

            // 2. Create the new account using the 'newaccount' action.
            const newAccountAction: AnyAction = {
                account: 'sysio',
                name: 'newaccount',
                authorization: sysioAuth,
                data: {
                    creator: "sysio",   
                    name: accountName,
                    owner: {
                        threshold: 1,
                        keys: [{
                            key: this.pvt_key.toPublic(),
                            weight: 1
                        }],
                        accounts: [],
                        waits: []
                    },
                    active: {
                        threshold: 1,
                        keys: [{
                            key: this.pvt_key.toPublic(),
                            weight: 1
                        }],
                        accounts: [],
                        waits: []
                    }
                }
            };

            // 3. Push new account creation in a separate transaction.
            console.log(`Creating account: ${accountName}`);
            const createAccountResult = await this.pushTransaction(newAccountAction);
            console.log('New account created successfully:', createAccountResult.transaction_id);

            // 5. Prepare sysio authorization for deploying the contract.
            // Changing authorization to come from 'sysio' instead of the new account


            // 6. Deploy the WASM contract code to the new account.
            const setcodeAction: AnyAction = {
                account: 'sysio',
                name: 'setcode',
                authorization: creatorAuth,
                data: {
                    account: accountName,
                    vmtype: 0,
                    vmversion: 0,
                    code: wasmHexString
                }
            };

            // 7. Deploy the contract ABI to the new account.
            const setabiAction: AnyAction = {
                account: 'sysio',
                name: 'setabi',
                authorization: creatorAuth,
                data: {
                    account: accountName,
                    abi: serializedAbiHex
                }
            };

            // 8. Push the contract deployment transaction.
            const deployActions: AnyAction[] = [setcodeAction, setabiAction];
            console.log(`Deploying contract to account: ${accountName}`);
            const deployResult = await this.pushTransaction(deployActions);
            console.log('Contract deployed successfully:', deployResult.transaction_id);

            return deployResult;
        } catch (error) {
            console.error('Contract deployment failed:', error);
            throw error;
        }
    }
}