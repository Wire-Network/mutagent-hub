
import { PinataSDK } from 'pinata-web3';
import config from '@/config';

export class PinataService {
    private static instance: PinataService;
    private pinata: PinataSDK;

    constructor() {
        const jwt = config.pinata.jwt;
        const gateway = config.pinata.gateway;
        if (!jwt) {
            throw new Error('Pinata JWT not found in environment variables');
        }

        this.pinata = new PinataSDK({
            pinataJwt: jwt,
            pinataGateway: gateway,
        });
    }

    static getInstance(): PinataService {
        if (!PinataService.instance) {
            PinataService.instance = new PinataService();
        }
        return PinataService.instance;
    }

    async uploadJSON(content: any, name?: string): Promise<string> {
        try {
            const options = name ? {
                pinataMetadata: {
                    name,
                    keyvalues: {
                        contentType: 'application/json'
                    }
                }
            } : undefined;

            // Convert content to File object
            const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
            const file = new File([blob], `${name || 'content'}.json`, { type: 'application/json' });

            const result = await this.pinata.upload.file(file, options);
            console.log('Content uploaded to Pinata:', result);
            return result.IpfsHash;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            throw new Error('Failed to upload content to IPFS');
        }
    }

    async getContent(hashOrName: string): Promise<any> {
        try {
            // First try to get by hash directly
            try {
                const data = await this.pinata.gateways.get(hashOrName);
                return data;
            } catch (error) {
                // If direct hash lookup fails, try searching by name
                console.log('Direct CID lookup failed, searching by name...');
                const files = await this.pinata.search.files({
                    metadata: { name: hashOrName }
                });

                if (files && files.length > 0) {
                    // Get the most recent file with matching name
                    const mostRecent = files[0];
                    return await this.pinata.gateways.get(mostRecent.IpfsHash);
                }
                throw new Error('Content not found');
            }
        } catch (error) {
            console.error('Error fetching from IPFS:', error);
            throw error;
        }
    }

    async isContentPinned(cid: string): Promise<boolean> {
        try {
            await this.pinata.gateways.get(cid);
            return true;
        } catch (error) {
            console.error('Error checking pin status:', error);
            return false;
        }
    }
}
