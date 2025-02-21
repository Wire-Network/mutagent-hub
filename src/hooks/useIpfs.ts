import { useState } from 'react';
import { PinataService } from '@/services/pinata-service';

export interface IpfsMessage {
    data: {
        text: string;
        timestamp: string;
        persona: string;
        traits: string[];
        user?: string;
    };
    contentType: string;
}

export function useIpfs() {
    const [error, setError] = useState<Error | null>(null);
    const pinataService = PinataService.getInstance();

    const uploadMessage = async (message: IpfsMessage): Promise<string> => {
        try {
            const cid = await pinataService.uploadJSON(message);
            console.log('Message uploaded to IPFS via Pinata, CID:', cid);
            return cid;
        } catch (err) {
            console.error('Error uploading to IPFS:', err);
            setError(err as Error);
            throw err;
        }
    };

    const fetchMessage = async (cid: string): Promise<IpfsMessage> => {
        try {
            const response = await pinataService.getContent(cid);
            console.log('Raw IPFS response:', response);
            
            // Handle nested data structure
            let messageData = response;
            if (response.data && response.data.data) {
                messageData = response.data;
            }
            
            // Ensure the data has the required fields
            if (!messageData.data || !messageData.data.text) {
                throw new Error('Invalid message format');
            }

            const message: IpfsMessage = {
                data: {
                    text: messageData.data.text,
                    timestamp: messageData.data.timestamp || new Date().toISOString(),
                    persona: messageData.data.persona || '',
                    traits: messageData.data.traits || [],
                    user: messageData.data.user
                },
                contentType: messageData.contentType || 'application/json'
            };

            console.log('Processed IPFS message:', message);
            return message;
        } catch (err) {
            console.error('Error fetching from IPFS:', err);
            setError(err as Error);
            throw err;
        }
    };

    return {
        isInitialized: true,
        error,
        uploadMessage,
        fetchMessage,
        isContentAvailable: async (cid: string) => {
            try {
                await pinataService.getContent(cid);
                return true;
            } catch {
                return false;
            }
        }
    };
}