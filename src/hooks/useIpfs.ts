import { useState } from 'react';
import { PinataService } from '@/services/pinata-service';

export interface IpfsMessage {
    data: {
        text: string;
        timestamp: string;
        persona: string;
        traits: string[];
        user?: string;
        history?: boolean;
    };
    contentType: string;
}
export function useIpfs() {
    const [error, setError] = useState<Error | null>(null);
    const pinataService = PinataService.getInstance();

    const uploadMessage = async (message: IpfsMessage): Promise<string> => {
        try {
            const isConversationHistory = message.data.history === true;
            const contentType = isConversationHistory ? 'Conversation History' : 'Message';
            
            const cid = await pinataService.uploadJSON(message);
            console.log(`${contentType} uploaded to IPFS via Pinata, CID:`, cid);
            return cid;
        } catch (err) {
            console.error('Error uploading to IPFS:', err);
            setError(err as Error);
            throw err;
        }
    };

    const fetchMessage = async (cid: string): Promise<IpfsMessage> => {
        try {
            const message = await pinataService.getContent(cid);
            const contentType = message.data.history === true ? 'Conversation History' : 'Message';
            console.log(`${contentType} retrieved from IPFS via Pinata:`, message);
            return message;
        } catch (err) {
            console.error('Error fetching from IPFS:', err);
            setError(err as Error);
            throw err;
        }
    };

    return {
        isInitialized: true, // Always true since we're using Pinata
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