import { ethers } from 'ethers';
import { WireService } from './wire-service';
import config from '../config';
import { PermissionLevel, Name, KeyType, Bytes, PublicKey } from '@wireio/core';

export class MetaMaskService {
    private static instance: MetaMaskService;
    private provider: ethers.BrowserProvider | null = null;
    private wireService: WireService;
    private readonly curve = getCurve(KeyType.EM);

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

    private ethPubKeyToWirePubKey(ethPubKey: string, keyType = KeyType.EM): string {
        if (ethPubKey.startsWith('0x')) {
            ethPubKey = ethPubKey.slice(2);
        }
        const keypair = this.curve.keyFromPublic(ethPubKey, 'hex');
        const x = keypair.getPublic().getX().toArray('be', 32);
        const y = keypair.getPublic().getY().toArray('be', 32);
        const keyData = new Uint8Array([y[31] & 1 ? 3 : 2, ...x]);
        const bytes = Bytes.from(keyData);
        const publicKey = new PublicKey(keyType, bytes);
        return publicKey.toString();
    }

    async checkAndCreateAccount(address: string): Promise<string> {
        try {
            const wireName = this.addressToWireName(address);
            
            // Check if account exists
            try {
                const result = await this.wireService.getRows({
                    contract: 'sysio',
                    scope: 'sysio',
                    table: 'userres',
                    lower_bound: wireName,
                    upper_bound: wireName,
                    limit: 1
                });
                
                if (result.rows.length > 0) {
                    console.log('Account exists:', wireName);
                    return wireName;
                }
                
                // Account doesn't exist, create it
                console.log('Account does not exist, creating:', wireName);
                await this.createNewAccount(wireName, address);
                return wireName;
            } catch (err) {
                console.error('Error checking account:', err);
                throw err;
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
            
            // Recover public key using ethers utils
            const msgHash = ethers.hashMessage(message);
            const publicKey = ethers.SigningKey.recoverPublicKey(msgHash, signature);
            
            // Convert Ethereum public key to WIRE format
            const formattedPubKey = this.ethPubKeyToWirePubKey(publicKey);

            // Prepare sysio authorization
            const sysioAuth = [
                PermissionLevel.from({ 
                    actor: Name.from('sysio'), 
                    permission: Name.from('active') 
                })
            ];

            // Register account on WIRE with sysio authority
            await this.wireService.pushTransaction(
                {
                    account: 'sysio',
                    name: 'newaccount',
                    authorization: sysioAuth,
                    data: {
                        creator: 'sysio',
                        name: wireName,
                        owner: {
                            threshold: 1,
                            keys: [{
                                key: formattedPubKey,
                                weight: 1
                            }],
                            accounts: [],
                            waits: []
                        },
                        active: {
                            threshold: 1,
                            keys: [{
                                key: formattedPubKey,
                                weight: 1
                            }],
                            accounts: [],
                            waits: []
                        }
                    }
                },
                config.wire.demoPrivateKey
            );
        } catch (error) {
            console.error('Error creating new account:', error);
            throw error;
        }
    }
}
