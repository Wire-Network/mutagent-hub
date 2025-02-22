
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatHeader } from "@/components/ChatHeader";
import { useChat } from "@/hooks/useChat";

const Chat = () => {
    const { personaName } = useParams<{ personaName: string }>();
    const { accountName } = useAuth();
    const navigate = useNavigate();

    if (!personaName || !accountName) {
        return null;
    }

    const {
        messages,
        submitting,
        handleSendMessage,
        messagesEndRef,
        scrollToBottom,
        messageCache,
        hasLoadedHistory,
        getMessagesRef,
        fetchMessage,
        setMessages
    } = useChat(personaName, accountName);

    // Load chat history once on mount
    useEffect(() => {
        const loadHistory = async () => {
            if (!personaName || !accountName || hasLoadedHistory.current) return;
            
            hasLoadedHistory.current = true;

            try {
                const response = await getMessagesRef.current(personaName, accountName);
                const processedMessages = [];

                for (const message of response.messages) {
                    try {
                        if (!message.msg_cid) continue;

                        const messageData = await fetchMessage(message.msg_cid);
                        if (!messageData.data || !messageData.data.text) continue;
                        
                        const extendedMessage = { 
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
                hasLoadedHistory.current = false;
            }
        };

        loadHistory();
    }, [personaName, accountName]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="flex-1 p-4 overflow-hidden">
                <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg h-full flex flex-col">
                    <ChatHeader 
                        personaName={personaName} 
                        onBack={() => navigate('/')} 
                    />
                    
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
