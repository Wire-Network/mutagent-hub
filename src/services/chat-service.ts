
import { WireService } from './wire-service';
import { IPFSService } from './ipfs-service';

export class ChatService {
    private static instance: ChatService;
    private wireService: WireService;
    private ipfsService: IPFSService;

    private constructor() {
        this.wireService = WireService.getInstance();
        this.ipfsService = IPFSService.getInstance();
    }

    static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    async submitUserMessage(personaName: string, messageText: string, privateKey: string): Promise<void> {
        try {
            // Step 1: Upload message text to IPFS
            const messageCid = await this.ipfsService.uploadText(messageText);
            
            // Step 2: Submit message CID to blockchain
            await this.wireService.submitMessage(personaName, messageCid, privateKey);
        } catch (error) {
            console.error('Error submitting message:', error);
            throw error;
        }
    }

    async getMessageContent(messageCid: string): Promise<string> {
        return this.ipfsService.getText(messageCid);
    }
}
