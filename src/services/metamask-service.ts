
import { ethers } from 'ethers';
import { WireService } from './wire-service';

export class MetaMaskService {
    private static instance: MetaMaskService;
    private provider: ethers.BrowserProvider | null = null;
    private wireService: WireService;

    private constructor() {
        this.wireService = WireService.getInstance();
    }

    static getInstance(): MetaMaskService {
        if (!MetaMaskService.instance) {
            MetaMaskService.instance = new MetaMaskService();
        }
        return MetaMaskService.instance;
    }

    async connectWallet(): Promise<string> {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        try {
            this.provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await this.provider.send('eth_requestAccounts', []);
            return accounts[0];
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
            throw error;
        }
    }

    async signMessage(message: string): Promise<string> {
        if (!this.provider) {
            throw new Error('Provider not initialized');
        }

        try {
            const signer = await this.provider.getSigner();
            const signature = await signer.signMessage(message);
            return signature;
        } catch (error) {
            console.error('Error signing message:', error);
            throw error;
        }
    }

    evmSigToWIRE(ethSig: string, prefix: 'K1' | 'EM' = 'EM'): string {
        // Remove '0x' prefix if present
        const sigWithoutPrefix = ethSig.startsWith('0x') ? ethSig.slice(2) : ethSig;
        
        // Convert to WIRE signature format
        return `SIG_${prefix}_${sigWithoutPrefix}`;
    }

    async createWireLink(username: string, address: string): Promise<void> {
        try {
            const nonce = new Date().getTime();
            const message = `${address}${nonce}${username}`;
            const messageHash = ethers.id(message);
            
            // Convert the hash to a string for signing
            const ethSignature = await this.signMessage(messageHash);
            const wireSignature = this.evmSigToWIRE(ethSignature);

            await this.wireService.pushTransaction({
                account: 'auth.msg',
                name: 'createlink',
                authorization: [{ actor: username, permission: 'active' }],
                data: {
                    sig: wireSignature,
                    msg_hash: messageHash.slice(2),
                    nonce: nonce,
                    account_name: username,
                }
            });
        } catch (error) {
            console.error('Error creating WIRE link:', error);
            throw error;
        }
    }
}
