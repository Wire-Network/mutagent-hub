import { create } from 'ipfs-http-client';
import config from '@/config';

// Initialize IPFS client and gateway
const ipfs = create({ url: config.ipfs.endpoint });
const IPFS_GATEWAY = 'https://ipfs.io';

export interface IpfsMessage {
    text: string;
    timestamp: string;
    persona?: string;
}

export function useIpfs() {
    const uploadMessage = async (message: IpfsMessage) => {
        const { cid } = await ipfs.add(JSON.stringify(message));
        return cid.toString();
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