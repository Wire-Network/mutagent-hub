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
const POLLING_INTERVAL = 30000; // Increased to 30 seconds

const Chat = () => {
    const { personaName } = useParams<{ personaName: string }>();
    const { toast } = useToast();
    const { loading: wireLoading, error, getMessages, submitMessage } = useWire();
    const { uploadMessage, fetchMessage } = useIpfs();
    const wireService = WireService.getInstance();
    const { accountName } = useAuth();
    
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const localMessagesRef = useRef<{[key: string]: ExtendedMessage}>({});
    const pollingTimeoutRef = useRef<NodeJS.Timeout>();
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup polling and fetch on unmount
    useEffect(() => {
        return () => {
            if (pollingTimeoutRef.current) {
                clearTimeout(pollingTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const loadMessages = useCallback(async () => {
        if (!personaName || isLoadingMessages) return;

        // Cancel any ongoing fetches
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoadingMessages(true);
        try {
            const fetchedMessages = await getMessages(personaName);
            
            // Process messages one at a time sequentially
            const processMessages = async (messages: Message[]) => {
                const results = [];
                
                for (const message of messages) {
                    // Check if aborted
                    if (abortControllerRef.current?.signal.aborted) {
                        throw new Error('Message loading aborted');
                    }

                    // Skip if message is already in localMessagesRef
                    if (localMessagesRef.current[message.message_cid]) {
                        results.push(localMessagesRef.current[message.message_cid]);
                        continue;
                    }

                    // Skip if message is pending finalization
                    if (!message.finalized && !message.completion_cid) {
                        results.push({
                            ...message,
                            messageText: null,
                            aiReply: null
                        });
                        continue;
                    }

                    const extendedMessage: ExtendedMessage = { 
                        ...message, 
                        aiReply: null, 
                        messageText: null 
                    };
                    
                    try {
                        // Fetch original message text if not already in local ref
                        const messageData = await fetchMessage(message.message_cid);
                        extendedMessage.messageText = messageData.data.text;

                        // Only fetch AI reply if message is finalized and has completion CID
                        if (message.finalized && message.completion_cid) {
                            const replyData = await fetchMessage(message.completion_cid);
                            extendedMessage.aiReply = replyData.data.text;
                        }
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            throw error;
                        }
                        console.error('Error fetching message content:', error);
                        // Continue with partial data
                    }
                    
                    results.push(extendedMessage);
                }
                return results;
            };

            const updatedMessages = await processMessages(fetchedMessages);
            
            // Check if aborted before updating state
            if (!abortControllerRef.current?.signal.aborted) {
                // Update local messages ref with the latest data
                updatedMessages.forEach(msg => {
                    if (msg.message_cid) {
                        localMessagesRef.current[msg.message_cid] = msg;
                    }
                });

                // Merge with any pending local messages that aren't yet in the blockchain
                const allMessages = [...updatedMessages];
                Object.values(localMessagesRef.current).forEach(localMsg => {
                    if (!updatedMessages.find(m => m.message_cid === localMsg.message_cid)) {
                        allMessages.push(localMsg);
                    }
                });

                // Sort messages by timestamp
                allMessages.sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );

                setMessages(allMessages);

                // Schedule next poll
                if (pollingTimeoutRef.current) {
                    clearTimeout(pollingTimeoutRef.current);
                }
                pollingTimeoutRef.current = setTimeout(loadMessages, POLLING_INTERVAL);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading messages:', error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load messages. Will retry in a moment.",
                });
                // Retry after error with a longer delay
                if (pollingTimeoutRef.current) {
                    clearTimeout(pollingTimeoutRef.current);
                }
                pollingTimeoutRef.current = setTimeout(loadMessages, POLLING_INTERVAL * 2);
            }
        } finally {
            setIsLoadingMessages(false);
        }
    }, [personaName, getMessages, fetchMessage, isLoadingMessages, toast]);

    useEffect(() => {
        if (personaName && accountName) {
            loadMessages();
        }
    }, [personaName, accountName, loadMessages]);

    const handleSendMessage = async (messageText: string) => {
        if (!personaName || !accountName || submitting) return;

        setSubmitting(true);
        try {
            // Get the persona's current state
            const persona = await wireService.getPersona(personaName);
            if (!persona.initial_state_cid) {
                throw new Error('Persona state not initialized');
            }

            // Format and upload message to IPFS
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

            // Create or update conversation history
            const convoHistoryCid = await uploadMessage({
                data: {
                    text: messageText,
                    timestamp: new Date().toISOString(),
                    persona: personaName,
                    user: accountName,
                    traits: [],
                    history: true
                },
                contentType: 'application/json'
            });

            // Create new message object
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

            // Store in local ref and update state immediately
            localMessagesRef.current[messageCid] = newMessageObj;
            setMessages(prev => [...prev, newMessageObj]);

            // Submit to blockchain with all required parameters
            await submitMessage(
                personaName,
                accountName,
                persona.initial_state_cid,
                messageCid,
                convoHistoryCid
            );
            
            // Trigger a message reload after a short delay
            setTimeout(loadMessages, 1000);
        } catch (e: any) {
            console.error('Error sending message:', e);
            toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "Failed to send message",
            });
            // Remove the failed message from state
            const failedCid = Object.keys(localMessagesRef.current).find(
                key => localMessagesRef.current[key].messageText === messageText
            );
            if (failedCid) {
                delete localMessagesRef.current[failedCid];
                setMessages(prev => prev.filter(msg => msg.message_cid !== failedCid));
            }
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
                                    content={message.messageText || message.message_cid}
                                    isUser={message.user === accountName}
                                    timestamp={new Date(message.created_at).toLocaleString()}
                                    ipfsCid={message.message_cid}
                                    aiReply={message.aiReply}
                                    isPending={!message.finalized}
                                />
                            ))}
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
