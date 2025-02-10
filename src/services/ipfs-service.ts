
import { create } from 'kubo-rpc-client';
import config from '../config';

export class IPFSService {
    private static instance: IPFSService;
    private ipfs;

    private constructor() {
        this.ipfs = create({ url: config.ipfs.endpoint });
    }

    static getInstance(): IPFSService {
        if (!IPFSService.instance) {
            IPFSService.instance = new IPFSService();
        }
        return IPFSService.instance;
    }

    async uploadText(text: string): Promise<string> {
        try {
            const { cid } = await this.ipfs.add(text);
            return cid.toString();
        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            throw error;
        }
    }

    async getText(cid: string): Promise<string> {
        try {
            const stream = await this.ipfs.cat(cid);
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return new TextDecoder().decode(chunks.reduce((a, b) => {
                const c = new Uint8Array(a.length + b.length);
                c.set(a);
                c.set(b, a.length);
                return c;
            }));
        } catch (error) {
            console.error('Error getting text from IPFS:', error);
            throw error;
        }
    }
}
