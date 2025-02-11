
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useWire, Message } from "@/hooks/useWire";
import { useToast } from "@/components/ui/use-toast";
import { useIpfs } from "@/hooks/useIpfs";
import { MessageInput } from "@/components/MessageInput";
import { ChatMessage } from "@/components/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import config from '@/config';

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
    
    const [messages, setMessages] = useState<ExtendedMessage[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (personaName) {
            loadMessages();
            // Set up polling for new messages
            const interval = setInterval(loadMessages, POLLING_INTERVAL);
            return () => clearInterval(interval);
        }
    }, [personaName]);

    const loadMessages = async () => {
        if (!personaName) return;
        try {
            const fetchedMessages = await getMessages(personaName);
            
            // Fetch message contents and AI replies for messages
            const updatedMessages = await Promise.all(
                fetchedMessages.map(async (message) => {
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
            
            setMessages(updatedMessages);
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
        if (!personaName || submitting) return;

        setSubmitting(true);
        try {
            // Format and upload message to IPFS
            const messageCid = await uploadMessage({
                text: messageText,
                timestamp: new Date().toISOString(),
                persona: personaName
            });

            // Submit to blockchain
            await submitMessage(
                personaName,
                messageCid,
                config.wire.demoPrivateKey
            );
            
            // Add optimistic update
            const newMessageObj: ExtendedMessage = {
                message_id: Date.now(),
                message_cid: messageCid,
                messageText: messageText,
                created_at: new Date().toISOString(),
                finalized: false,
                completion_cid: null,
                aiReply: null,
                persona_name: personaName,
                pre_persona_state_cid: '',
                post_persona_state_cid: '',
                user: config.wire.demoPrivateKey
            };
            
            setMessages(prev => [...prev, newMessageObj]);
            
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
                            isLoading={submitting}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
