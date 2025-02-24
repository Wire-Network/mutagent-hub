import { ethers } from 'ethers';
import { addressToWireName, ethPubKeyToWirePubKey, evmSigToWIRE } from '@wireio/wns';
import { WireService } from './wire-service';

export type AccountType = 'metamask' | 'walletconnect';

export interface ConnectedAccount {
    address: string;
    type: AccountType;
    username: string;
}

export class EthereumService {
    private static instance: EthereumService;
    private provider?: ethers.providers.Web3Provider;
    private wireService: WireService;
    private connected: boolean = false;

    private constructor() {
        this.wireService = WireService.getInstance();
        this.setupEventListeners();
    }

    private setupEventListeners() {
        if (typeof window !== 'undefined') {
            const ethereum = (window as any).ethereum;
            if (ethereum) {
                ethereum.on('accountsChanged', () => {
                    console.log('Accounts changed, resetting connection');
                    this.disconnect();
                });
                ethereum.on('chainChanged', () => {
                    console.log('Chain changed, resetting connection');
                    this.disconnect();
                });
                ethereum.on('disconnect', () => {
                    console.log('Wallet disconnected');
                    this.disconnect();
                });
            }
        }
    }

    static getInstance(): EthereumService {
        if (!EthereumService.instance) {
            EthereumService.instance = new EthereumService();
        }
        return EthereumService.instance;
    }

    async connectWallet(type: AccountType = 'metamask'): Promise<ConnectedAccount> {
        try {
            switch (type) {
                case 'metamask':
                    const ethereum = (window as any).ethereum;
                    if (!ethereum) throw new Error('MetaMask is not installed');
                    
                    console.log('Requesting new wallet permissions...');
                    // Force MetaMask to show the account selection popup
                    await ethereum.request({
                        method: 'wallet_requestPermissions',
                        params: [{ eth_accounts: {} }]
                    });
                    
                    console.log('Requesting account access...');
                    // Now request accounts
                    const accounts = await ethereum.request({ 
                        method: 'eth_requestAccounts',
                        params: []
                    });
                    
                    if (!accounts || accounts.length === 0) {
                        throw new Error('No accounts provided by MetaMask');
                    }

                    console.log('Connected accounts:', accounts);
                    
                    this.provider = new ethers.providers.Web3Provider(ethereum, 'any');
                    this.connected = true;
                    break;
                default:
                    throw new Error('Unsupported wallet type');
            }

            // Get the connected accounts
            const signer = this.provider.getSigner();
            const address = await signer.getAddress();
            console.log('Selected address:', address);
            const username = addressToWireName(address);
            console.log('Derived username:', username);

            return {
                address,
                type,
                username
            };
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.disconnect();
            throw error;
        }
    }

    async signMessage(message: string | Uint8Array): Promise<string> {
        if (!this.provider || !this.connected) throw new Error('No wallet connected');
        try {
            console.log('Requesting message signature for:', message);
            const signer = this.provider.getSigner();
            const signature = await signer.signMessage(message);
            console.log('Received signature:', signature);
            return signature;
        } catch (error) {
            console.error('Error signing message:', error);
            throw error;
        }
    }

    async verifyAccount(address: string): Promise<boolean> {
        try {
            const username = addressToWireName(address);
            console.log('Verifying account existence for:', username);
            // Check if account exists on chain
            await this.wireService.getAccount(username);
            return true;
        } catch (error) {
            console.log('Account verification failed:', error);
            return false;
        }
    }

    async createWireAccount(address: string): Promise<void> {
        if (!this.provider || !this.connected) throw new Error('No wallet connected');

        try {
            // Get public key by asking user to sign a message
            const message = 'Sign this message to retrieve your public key for WIRE account creation';
            console.log('Requesting signature for public key retrieval');
            
            // This will trigger MetaMask popup
            const signature = await this.signMessage(message);
            console.log('Received signature for public key');
            
            // Recover public key from signature
            const msgHash = ethers.utils.hashMessage(message);
            const publicKey = ethers.utils.recoverPublicKey(msgHash, signature);
            console.log('Recovered public key:', publicKey);
            
            // Convert to WIRE format
            const wirePubKey = ethPubKeyToWirePubKey(publicKey);
            console.log('Converted to WIRE pubkey:', wirePubKey);
            const username = addressToWireName(address);

            // Create account action
            const action = {
                account: 'sysio',
                name: 'newaccount',
                authorization: [
                    {
                        actor: 'sysio',
                        permission: 'active',
                    },
                ],
                data: {
                    creator: 'sysio',
                    name: username,
                    owner: {
                        threshold: 1,
                        keys: [{ key: wirePubKey, weight: 1 }],
                        accounts: [],
                        waits: []
                    },
                    active: {
                        threshold: 1,
                        keys: [{ key: wirePubKey, weight: 1 }],
                        accounts: [],
                        waits: []
                    }
                }
            };

            console.log('Creating WIRE account with action:', action);
            await this.wireService.pushTransaction(action);
            console.log('Account created successfully');
        } catch (error) {
            console.error('Error creating WIRE account:', error);
            throw error;
        }
    }

    async signAndPushTransaction(action: any): Promise<void> {
        if (!this.provider || !this.connected) throw new Error('No wallet connected');

        try {
            console.log('Preparing transaction:', action);
            const info = await this.wireService.getChainInfo();
            const transaction = await this.wireService.createTransaction(action);
            const digest = transaction.signingDigest(info.chain_id);
            console.log('Transaction digest:', digest.hexString);
            
            // Sign with Ethereum wallet - directly use the messageBytes without converting to hex
            const messageBytes = ethers.utils.arrayify('0x' + digest.hexString);
            console.log('Requesting signature for transaction');
            const signature = await this.signMessage(messageBytes);
            console.log('Received signature:', signature);
            
            // Convert signature to WIRE format
            const wireSignature = evmSigToWIRE(signature, 'EM');
            console.log('Converted to WIRE signature:', wireSignature);
            
            // Push transaction
            await this.wireService.pushSignedTransaction(transaction, [wireSignature]);
            console.log('Transaction pushed successfully');
        } catch (error) {
            console.error('Error signing and pushing transaction:', error);
            throw error;
        }
    }

    disconnect(): void {
        console.log('Disconnecting wallet');
        this.provider = undefined;
        this.connected = false;
    }
} 