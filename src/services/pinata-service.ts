
import { PinataSDK } from 'pinata-web3';
import config from '@/config';

interface PinataResponse {
    data?: {
        imageData?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

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
            const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
            const file = new File([blob], 'content.json', { type: 'application/json' });
            const result = await this.pinata.upload.file(file);
            return result.IpfsHash;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            throw new Error('Failed to upload content to IPFS');
        }
    }

    async getContent(cid: string): Promise<PinataResponse> {
        try {
            const response = await this.pinata.gateways.get(cid) as PinataResponse;
            return response;
        } catch (error) {
            console.error('Error fetching from IPFS:', error);
            throw error;
        }
    }

    async isContentPinned(cid: string): Promise<boolean> {
        try {
            await this.pinata.gateways.get(cid);
            return true;
        } catch {
            return false;
        }
    }
}
