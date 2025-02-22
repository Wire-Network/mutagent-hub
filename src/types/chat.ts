
import { Message } from "@/hooks/useWire";

export interface ExtendedMessage extends Message {
    aiReply?: string | null;
    messageText?: string | null;
}

export interface HistoryResponse {
    full_convo_history_cid: string;
}

export interface HistoryData {
    text: string;
    timestamp: string;
    persona: string;
    traits: string[];
    user?: string;
    history: boolean;
    messages: Array<{
        key?: number;
        message_cid: string;
        text: string;
        timestamp: string;
        user?: string;
        aiReply?: string;
        pre_state_cid?: string;
        post_state_cid?: string;
    }>;
}

export interface ChainMessage {
    key: number;
    pre_state_cid: string;
    msg_cid: string;
    post_state_cid: string;
    response: string;
}
