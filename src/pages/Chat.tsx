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
        if (!personaName || !accountName || isLoadingMessages) return;

        // Cancel any ongoing fetches
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoadingMessages(true);
        try {
            console.log('Fetching messages for:', { personaName, accountName });
            const response = await getMessages(personaName, accountName);
            console.log('Raw response from chain:', response);
            
            // Ensure we have an array of messages
            const fetchedMessages = Array.isArray(response.messages) ? response.messages : [];
            console.log('Fetched messages from chain:', fetchedMessages);
            
            if (fetchedMessages.length === 0) {
                setMessages([]);
                return;
            }
            
            // Get the latest message for polling optimization
            const latestMessage = fetchedMessages[fetchedMessages.length - 1];
            const latestLocalMessage = messages[messages.length - 1];
            
            // If we have messages and the latest message hasn't changed, only check the latest
            if (messages.length > 0 && latestMessage && latestLocalMessage && 
                latestMessage.msg_cid === latestLocalMessage.message_cid) {
                
                // If the latest message has a new response, process just that one
                if (latestMessage.response && (!latestLocalMessage.aiReply || latestLocalMessage.aiReply !== latestMessage.response)) {
                    console.log('Processing updated response for latest message:', latestMessage);
                    const updatedMessage: ExtendedMessage = {
                        ...latestLocalMessage,
                        aiReply: latestMessage.response,
                        finalized: true,
                        post_persona_state_cid: latestMessage.post_state_cid
                    };
                    
                    // Update the message in local cache and state
                    localMessagesRef.current[latestMessage.msg_cid] = updatedMessage;
                    setMessages(prev => prev.map(msg => 
                        msg.message_cid === latestMessage.msg_cid ? updatedMessage : msg
                    ));
                }
                
                // Schedule next poll
                if (pollingTimeoutRef.current) {
                    clearTimeout(pollingTimeoutRef.current);
                }
                pollingTimeoutRef.current = setTimeout(loadMessages, POLLING_INTERVAL);
                setIsLoadingMessages(false);
                return;
            }
            
            // Process messages one at a time sequentially
            const processMessages = async (chainMessages: ChainMessage[]) => {
                const results = [];
                
                for (const message of chainMessages) {
                    // Check if aborted
                    if (abortControllerRef.current?.signal.aborted) {
                        throw new Error('Message loading aborted');
                    }

                    // Skip if message is already in localMessagesRef and hasn't been finalized
                    if (localMessagesRef.current[message.msg_cid] && 
                        (!message.response || localMessagesRef.current[message.msg_cid].aiReply === message.response)) {
                        results.push(localMessagesRef.current[message.msg_cid]);
                        continue;
                    }

                    try {
                        // Always fetch the message content first
                        console.log('Fetching message content for CID:', message.msg_cid);
                        const messageData = await fetchMessage(message.msg_cid);
                        console.log('Fetched message data:', messageData);

                        const extendedMessage: ExtendedMessage = { 
                            message_id: message.key,
                            persona_name: personaName || '',
                            message_cid: message.msg_cid,
                            pre_persona_state_cid: message.pre_state_cid,
                            completion_cid: '',
                            post_persona_state_cid: message.post_state_cid,
                            finalized: !!message.response,
                            user: accountName || '',
                            created_at: messageData.data.timestamp || new Date().toISOString(),
                            aiReply: message.response || null,
                            messageText: messageData.data.text // Set the message text directly from IPFS data
                        };
                        
                        results.push(extendedMessage);
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            throw error;
                        }
                        console.error('Error processing message:', error);
                        // If we can't fetch the content, create a message with just the CID
                        const fallbackMessage: ExtendedMessage = {
                            message_id: message.key,
                            persona_name: personaName || '',
                            message_cid: message.msg_cid,
                            pre_persona_state_cid: message.pre_state_cid,
                            completion_cid: '',
                            post_persona_state_cid: message.post_state_cid,
                            finalized: !!message.response,
                            user: accountName || '',
                            created_at: new Date().toISOString(),
                            aiReply: message.response || null,
                            messageText: 'Error loading message content...'
                        };
                        results.push(fallbackMessage);
                    }
                }
                return results;
            };

            const updatedMessages = await processMessages(fetchedMessages);
            console.log('Processed messages:', updatedMessages);
            
            // Check if aborted before updating state
            if (!abortControllerRef.current?.signal.aborted) {
                // Update local messages ref with the latest data
                updatedMessages.forEach(msg => {
                    if (msg.message_cid) {
                        localMessagesRef.current[msg.message_cid] = msg;
                    }
                });

                // Sort messages by timestamp
                const allMessages = [...updatedMessages].sort((a, b) => 
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
    }, [personaName, accountName, getMessages, fetchMessage, isLoadingMessages, toast, messages]);

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
