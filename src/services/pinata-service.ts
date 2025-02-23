
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
            console.log('Fetching content from Pinata with CID:', cid);
            const response = await this.pinata.gateways.get(cid);
            console.log('Raw Pinata response:', JSON.stringify(response, null, 2));
            
            // If the response is already parsed JSON
            if (response && typeof response === 'object') {
                if ('metadata' in response && 'imageData' in response) {
                    return response; // Return avatar data directly
                } else if ('data' in response) {
                    return response; // Return persona state data
                }
            }
            
            // Try to parse the response if it's a string
            try {
                const parsedData = JSON.parse(response);
                return parsedData;
            } catch (e) {
                console.log('Response is not JSON, returning as is');
                return response;
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
