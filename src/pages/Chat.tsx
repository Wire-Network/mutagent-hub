/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useWire, Message } from "@/hooks/useWire";
import { useToast } from "@/components/ui/use-toast";
import { useIpfs } from "@/hooks/useIpfs";
import { MessageInput } from "@/components/MessageInput";
import { ChatMessage } from "@/components/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import config from '@/config';
import { WireService } from "@/services/wire-service";

// Extend the Message type to include AI reply
interface ExtendedMessage extends Message {
    aiReply?: string | null;
    messageText?: string | null;
}

// Polling interval in milliseconds
const POLLING_INTERVAL = 3000; // Poll every 3 seconds to catch finalized messages quickly

interface ChainMessage {
    key: number;
    pre_state_cid: string;
    msg_cid: string;
    post_state_cid: string;
    response: string;
}

interface HistoryResponse {
    full_convo_history_cid: string;
}

interface HistoryData {
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

const Chat = () => {
    const { personaName } = useParams<{ personaName: string }>();
    const { toast } = useToast();
    const { loading: wireLoading, error, getMessages, submitMessage } = useWire();
    const { uploadMessage, fetchMessage } = useIpfs();
    const wireService = WireService.getInstance();
    const { accountName } = useAuth();
    
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const messageCache = useRef<Map<string, ExtendedMessage>>(new Map());
    const pollingTimeoutRef = useRef<NodeJS.Timeout>();
    const hasLoadedHistory = useRef(false);
    const pendingMessageRef = useRef<string | null>(null);
    const getMessagesRef = useRef(getMessages);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Keep getMessages reference stable
    useEffect(() => {
        getMessagesRef.current = getMessages;
    }, [getMessages]);

    // Load chat history once on mount
    useEffect(() => {
        const loadHistory = async () => {
            if (!personaName || !accountName || hasLoadedHistory.current) return;
            
            hasLoadedHistory.current = true;

            try {
                const response = await getMessagesRef.current(personaName, accountName);
                const processedMessages: ExtendedMessage[] = [];

                for (const message of response.messages) {
                    try {
                        if (!message.msg_cid) continue;

                        const messageData = await fetchMessage(message.msg_cid);
                        if (!messageData.data || !messageData.data.text) continue;
                        
                        const extendedMessage: ExtendedMessage = { 
                            message_id: message.key || Date.now(),
                            persona_name: personaName,
                            message_cid: message.msg_cid,
                            pre_persona_state_cid: message.pre_state_cid || '',
                            completion_cid: '',
                            post_persona_state_cid: message.post_state_cid || '',
                            finalized: !!message.response,
                            user: messageData.data.user || accountName,
                            created_at: messageData.data.timestamp || new Date().toISOString(),
                            aiReply: message.response || null,
                            messageText: messageData.data.text
                        };
                        
                        messageCache.current.set(message.msg_cid, extendedMessage);
                        processedMessages.push(extendedMessage);
                    } catch (error) {
                        console.error('Error processing message:', error);
                    }
                }

                const sortedMessages = processedMessages.sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );

                setMessages(sortedMessages);
            } catch (error) {
                console.error('Error loading chat history:', error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load chat history",
                });
                hasLoadedHistory.current = false;
            }
        };

        loadHistory();

        return () => {
            hasLoadedHistory.current = false;
            if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
            }
        };
    }, [personaName, accountName]);

    const startPolling = useCallback(async () => {
        if (!personaName || !accountName || !pendingMessageRef.current) return;

        try {
            const response = await getMessagesRef.current(personaName, accountName);
            const pendingMessage = response.messages.find(msg => msg.msg_cid === pendingMessageRef.current);
            
            if (pendingMessage?.response) {
                const cachedMsg = messageCache.current.get(pendingMessage.msg_cid)!;
                const updatedMsg = {
                    ...cachedMsg,
                    finalized: true,
                    aiReply: pendingMessage.response
                };
                messageCache.current.set(pendingMessage.msg_cid, updatedMsg);
                setMessages(prev => 
                    prev.map(msg => 
                        msg.message_cid === pendingMessage.msg_cid ? updatedMsg : msg
                    )
                );
                pendingMessageRef.current = null;
                if (pollingTimeoutRef.current) {
                    clearTimeout(pollingTimeoutRef.current);
                    pollingTimeoutRef.current = undefined;
                }
            } else {
                pollingTimeoutRef.current = setTimeout(startPolling, 3000);
            }
        } catch (error) {
            console.error('Error checking message status:', error);
            pendingMessageRef.current = null;
            if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
                pollingTimeoutRef.current = undefined;
            }
        }
    }, [personaName, accountName]);

    const handleSendMessage = async (messageText: string) => {
        if (!personaName || !accountName || submitting) return;

        setSubmitting(true);
        // Clean up any existing polling
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = undefined;
        }
        pendingMessageRef.current = null;

        try {
            const persona = await wireService.getPersona(personaName);
            if (!persona.initial_state_cid) {
                throw new Error('Persona state not initialized');
            }

            const messageCid = await uploadMessage({
                data: {
                    text: messageText,
                    timestamp: new Date().toISOString(),
                    persona: personaName,
                    user: accountName,
                    traits: [],
                },
                contentType: 'application/json'
            });

            const newMessageObj: ExtendedMessage = {
                message_id: Date.now(),
                message_cid: messageCid,
                messageText: messageText,
                created_at: new Date().toISOString(),
                finalized: false,
                completion_cid: null,
                aiReply: null,
                persona_name: personaName,
                pre_persona_state_cid: persona.initial_state_cid,
                post_persona_state_cid: '',
                user: accountName
            };

            pendingMessageRef.current = messageCid;
            messageCache.current.set(messageCid, newMessageObj);
            setMessages(prev => [...prev, newMessageObj]);

            await submitMessage(
                personaName,
                accountName,
                persona.initial_state_cid,
                messageCid,
                messageCid
            );
            
            // Start polling after message is submitted
            startPolling();
        } catch (e: any) {
            console.error('Error sending message:', e);
            toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "Failed to send message",
            });
            if (messageCache.current.has(e.messageCid)) {
                messageCache.current.delete(e.messageCid);
            }
            setMessages(prev => prev.filter(msg => msg.messageText !== messageText));
            pendingMessageRef.current = null;
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="flex-1 p-4 overflow-hidden">
                <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg h-full flex flex-col">
                    <div className="p-4 border-b">
                        <h1 className="text-2xl font-bold capitalize flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
                            Chat with {personaName}
                        </h1>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.message_id}
                                    content={message.messageText}
                                    isUser={message.user === accountName}
                                    timestamp={new Date(message.created_at).toLocaleString()}
                                    ipfsCid={message.message_cid}
                                    aiReply={message.aiReply}
                                    isPending={!message.finalized}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            isLoading={submitting}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;