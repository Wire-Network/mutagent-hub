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

    async uploadJSON(content: any): Promise<string> {
        try {
            // Convert content to File object
            const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
            const file = new File([blob], 'content.json', { type: 'application/json' });

            const result = await this.pinata.upload.file(file);
            console.log('Content uploaded to Pinata:', result);
            return result.IpfsHash;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            throw new Error('Failed to upload content to IPFS');
        }
    }

    async getContent(cid: string): Promise<any> {
        try {
            const data = await this.pinata.gateways.get(cid);
            return data;
        } catch (error) {
            console.error('Error fetching from IPFS:', error);
            if (error instanceof Error && error.message.includes('timeout')) {
                throw new Error('IPFS request timed out');
            }
            throw new Error('Failed to fetch content from IPFS');
        }
    }

    async isContentPinned(cid: string): Promise<boolean> {
        try {
            // Use the gateway to check if content is available
            await this.pinata.gateways.get(cid);
            return true;
        } catch (error) {
            console.error('Error checking pin status:', error);
            return false;
        }
    }
}
