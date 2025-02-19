import { create } from 'kubo-rpc-client';      

// Initialize IPFS client and gateway
const ipfs = create({
    host: '127.0.0.1',
    port: 5001,
    protocol: 'http'
});
const IPFS_GATEWAY = 'http://localhost:8080';

export interface IpfsMessage {
    text: string;
    timestamp: string;
    persona?: string;
    name?: string;
    backstory?: string;
    traits?: string[];
    history?: boolean;  // Flag to indicate if this is a conversation history message
}

export function useIpfs() {
    const uploadMessage = async (message: IpfsMessage) => {
        try {
            console.log('Attempting to upload to IPFS...', { message });
            const { cid } = await ipfs.add(JSON.stringify(message));
            console.log('Successfully uploaded to IPFS:', cid.toString());
            return cid.toString();
        } catch (error) {
            console.error('Detailed IPFS upload error:', {
                error,
                message,
                ipfsConfig: {
                    host: '127.0.0.1',
                    port: 5001,
                    protocol: 'http'
                }
            });
            throw error;
        }
    };

    const fetchMessage = async (cid: string) => {
        try {
            const response = await fetch(`${IPFS_GATEWAY}/ipfs/${cid}`);
            const data = await response.json();
            return data as IpfsMessage;
        } catch (error) {
            console.error('Error fetching from IPFS:', error);
            throw error;
        }
    };

    return {
        uploadMessage,
        fetchMessage,
        ipfsGateway: IPFS_GATEWAY
    };
}
