/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
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
const POLLING_INTERVAL = 5000;

const Chat = () => {
    const { personaName } = useParams<{ personaName: string }>();
    const { toast } = useToast();
    const { loading, error, getMessages, submitMessage } = useWire();
    const { uploadMessage, fetchMessage } = useIpfs();
    const wireService = WireService.getInstance();
    const { accountName } = useAuth();
    
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const localMessagesRef = useRef<{[key: string]: ExtendedMessage}>({});

    useEffect(() => {
        if (personaName && accountName) {
            loadMessages();
            // Set up polling for new messages
            const interval = setInterval(loadMessages, POLLING_INTERVAL);
            return () => clearInterval(interval);
        }
    }, [personaName, accountName]);

    const loadMessages = async () => {
        if (!personaName) return;
        try {
            const fetchedMessages = await getMessages(personaName); // Fixed: removed second argument
            
            // Fetch message contents and AI replies for messages
            const updatedMessages = await Promise.all(
                fetchedMessages.map(async (message) => {
                    // If we have a local copy of this message, use it
                    if (localMessagesRef.current[message.message_cid]) {
                        return {
                            ...localMessagesRef.current[message.message_cid],
                            ...message // Update with any new blockchain data
                        };
                    }

                    const extendedMessage: ExtendedMessage = { ...message, aiReply: null, messageText: null };
                    
                    // Fetch original message text
                    try {
                        const messageData = await fetchMessage(message.message_cid);
                        extendedMessage.messageText = messageData.text;
                    } catch (error) {
                        console.error('Error fetching message:', error);
                    }

                    // Fetch AI reply if available
                    if (message.finalized && message.completion_cid) {
                        try {
                            const replyData = await fetchMessage(message.completion_cid);
                            extendedMessage.aiReply = replyData.text;
                        } catch (error) {
                            console.error('Error fetching AI reply:', error);
                        }
                    }
                    
                    return extendedMessage;
                })
            );
            
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
        } catch (error) {
            console.error('Error loading messages:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load messages",
            });
        }
    };

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
                text: messageText,
                timestamp: new Date().toISOString(),
                persona: personaName,
                user: accountName
            });

            // Create or update conversation history
            const convoHistoryCid = await uploadMessage({
                text: messageText,
                timestamp: new Date().toISOString(),
                persona: personaName,
                user: accountName,
                history: true
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

            // Store in local ref and update state
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
            toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "Failed to send message",
            });
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
                                    isUser={true}
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
                            isLoading={submitting || loading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
