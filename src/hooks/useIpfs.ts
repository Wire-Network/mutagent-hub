import { useState, useEffect } from 'react';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { webSockets } from '@libp2p/websockets';
import { bootstrap } from '@libp2p/bootstrap';
import { createLibp2p } from 'libp2p';
import { MemoryBlockstore } from 'blockstore-core';
import { MemoryDatastore } from 'datastore-core';

export interface IpfsMessage {
    text: string;
    timestamp: string;
    persona: string;
    traits: string[];
    user?: string;
    history?: boolean;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function useIpfs() {
    const [helia, setHelia] = useState(null);
    const [fs, setFs] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        const initHelia = async () => {
            try {
                console.log('Starting Helia initialization...');
                
                const blockstore = new MemoryBlockstore();
                const datastore = new MemoryDatastore();

                // Create and configure libp2p
                const libp2p = await createLibp2p({
                    datastore,
                    transports: [webSockets()],
                    connectionEncryption: [noise()],
                    streamMuxers: [yamux()],
                    peerDiscovery: [
                        bootstrap({
                            list: [
                                '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                                '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                                '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                                '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
                            ],
                        }),
                    ],
                });

                // Create Helia node
                const heliaNode = await createHelia({
                    datastore,
                    blockstore,
                    libp2p,
                });

                // Create UnixFS instance
                const unixFs = unixfs(heliaNode);

                if (mounted) {
                    setHelia(heliaNode);
                    setFs(unixFs);
                    setIsInitialized(true);
                    console.log('Helia node initialized successfully');
                }
            } catch (err) {
                console.error('Error initializing Helia:', err);
                if (mounted) {
                    setError(err as Error);
                }
            }
        };

        initHelia();

        return () => {
            mounted = false;
            if (helia) {
                helia.stop().catch(console.error);
            }
        };
    }, []);

    const uploadMessage = async (message: IpfsMessage): Promise<string> => {
        if (!fs || !isInitialized) {
            throw new Error('IPFS not initialized');
        }

        try {
            const bytes = encoder.encode(JSON.stringify(message));
            const cid = await fs.addBytes(bytes);
            console.log('Message uploaded to IPFS, CID:', cid.toString());
            return cid.toString();
        } catch (err) {
            console.error('Error uploading to IPFS:', err);
            setError(err as Error);
            throw err;
        }
    };

    const isContentAvailable = async (cid: string): Promise<boolean> => {
        if (!fs || !isInitialized) return false;
        try {
            // Try to get the first chunk to verify content exists
            for await (const _ of fs.cat(cid)) {
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const fetchMessage = async (cid: string): Promise<IpfsMessage> => {
        if (!fs || !isInitialized) {
            throw new Error('IPFS not initialized');
        }

        try {
            // First check if we can get the content
            const available = await isContentAvailable(cid);
            if (!available) {
                console.log(`Content ${cid} not found in local node, waiting for network...`);
                // Wait a bit for the network to potentially find the content
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            let data = '';
            for await (const chunk of fs.cat(cid)) {
                data += decoder.decode(chunk, { stream: true });
            }
            const message = JSON.parse(data);
            console.log('Message retrieved from IPFS:', message);
            return message;
        } catch (err) {
            console.error('Error fetching from IPFS:', err);
            setError(err as Error);
            throw err;
        }
    };

    return {
        isInitialized,
        error,
        uploadMessage,
        fetchMessage,
        isContentAvailable
    };
}
