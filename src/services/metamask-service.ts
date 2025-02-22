
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

    addressToWireName(address: string): string {
        if (![40, 42].includes(address.length)) {
            throw new Error('Invalid address length');
        }

        let addr = address.includes('0x') ? address.slice(2) : address;
        if (addr[40] !== '0') {
            addr = addr.slice(0, -1) + '0';
        }

        const int = BigInt('0x' + addr.slice(0, 8) + addr.slice(-8));
        const charMap = '.12345abcdefghijklmnopqrstuvwxyz';
        const str = [];
        let tmp = BigInt.asUintN(64, int);

        for (let i = 0; i <= 12; ++i) {
            const bigiAnd = BigInt(i === 0 ? 0x0f : 0x1f);
            const idx = tmp & bigiAnd;
            str[12 - i] = charMap[Number(idx.toString())];
            const bigi = BigInt(i === 0 ? 4 : 5);
            tmp = tmp >> bigi;
        }

        return str.join('').replace(/\.+$/g, '');
    }

    evmSigToWIRE(ethSig: string, prefix: 'K1' | 'EM' = 'EM'): string {
        const sigWithoutPrefix = ethSig.startsWith('0x') ? ethSig.slice(2) : ethSig;
        return `SIG_${prefix}_${sigWithoutPrefix}`;
    }

    async createWireLink(username: string, address: string): Promise<void> {
        try {
            const nonce = new Date().getTime();
            const message = `${address}${nonce}${username}`;
            const messageHash = ethers.id(message);
            
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

    async checkAndCreateAccount(address: string): Promise<string> {
        try {
            const wireName = this.addressToWireName(address);
            
            // Check if account exists
            try {
                await this.wireService.getAccount(wireName);
                console.log('Account exists:', wireName);
                return wireName;
            } catch (err) {
                // Account doesn't exist, create it
                console.log('Account does not exist, creating:', wireName);
                await this.createNewAccount(wireName, address);
                return wireName;
            }
        } catch (error) {
            console.error('Error in checkAndCreateAccount:', error);
            throw error;
        }
    }

    private async createNewAccount(wireName: string, address: string): Promise<void> {
        try {
            // Get public key from MetaMask
            const message = "Retrieve Public Key";
            const signature = await this.signMessage(message);
            const publicKey = ethers.recoverPublicKey(
                ethers.hashMessage(message),
                signature
            );
            
            // Format public key for WIRE
            const formattedPubKey = `PUB_EM_${publicKey.slice(2)}`;

            // Register account on WIRE
            await this.wireService.pushTransaction({
                account: this.wireService.namespace,
                name: 'newaccount',
                authorization: [{ actor: this.wireService.namespace, permission: 'active' }],
                data: {
                    account_name: wireName,
                    public_key: formattedPubKey,
                    address: address
                }
            });
        } catch (error) {
            console.error('Error creating new account:', error);
            throw error;
        }
    }
}
