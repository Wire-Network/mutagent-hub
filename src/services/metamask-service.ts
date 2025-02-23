
import { ethers } from 'ethers';
import { WireService } from './wire-service';
import config from '../config';
import { PermissionLevel, Name, KeyType, Bytes, PublicKey, getCurve } from '@wireio/core';

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

    async connectWallet(requestNewAccount: boolean = false): Promise<string> {
        if (!window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        try {
            this.provider = new ethers.BrowserProvider(window.ethereum);
            
            if (requestNewAccount) {
                await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }]
                });
            }
            
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
            
            // First try to get account info directly
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
                    console.log('Account exists, using existing account:', wireName);
                    return wireName;
                }
            } catch (error) {
                console.log('Error checking account existence:', error);
            }

            // If account doesn't exist, try to create it
            try {
                console.log('Account does not exist, creating:', wireName);
                await this.createNewAccount(wireName, address);
                return wireName;
            } catch (error) {
                // If we get an account_exists error, the account exists - return it
                if (error instanceof Error && 
                    (error.message.includes('account_name_exists') || 
                     error.message.includes('name is already taken'))) {
                    console.log('Account already exists (caught from creation error):', wireName);
                    return wireName;
                }
                throw error;
            }
        } catch (error) {
            console.error('Error in checkAndCreateAccount:', error);
            throw error;
        }
    }

    private async createNewAccount(wireName: string, address: string): Promise<void> {
        try {
            const message = "Retrieve Public Key";
            const signature = await this.signMessage(message);
            const msgHash = ethers.hashMessage(message);
            const publicKey = ethers.SigningKey.recoverPublicKey(msgHash, signature);
            const formattedPubKey = this.ethPubKeyToWirePubKey(publicKey);

            const sysioAuth = [
                PermissionLevel.from({ 
                    actor: Name.from('sysio'), 
                    permission: Name.from('active') 
                })
            ];

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
