import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { ChatHeader } from "@/components/ChatHeader";
import { useChat } from "@/hooks/useChat";
import { PersonaDialog } from "@/components/PersonaDialog";
import { motion, AnimatePresence } from "framer-motion";

const Chat = () => {
    const { personaName } = useParams<{ personaName: string }>();
    const { accountName } = useAuth();
    const navigate = useNavigate();
    const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);
    
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
    } = useChat(personaName || '', accountName || '');
    
    useEffect(() => {
        if (!personaName || !accountName || hasLoadedHistory.current) return;
        
        const loadHistory = async () => {
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
    }, [personaName, accountName, fetchMessage, getMessagesRef, messageCache, setMessages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);
    
    // Early return if necessary params are missing
    if (!personaName || !accountName) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div 
                className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
            >
                <motion.div 
                    className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg h-[calc(100vh-3rem)] flex flex-col border border-primary/20"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <ChatHeader 
                        personaName={personaName}
                        onBack={() => navigate('/')}
                        onAvatarClick={() => setIsPersonaDialogOpen(true)}
                    />
                    
                  
                        <motion.div 
                            className="space-y-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {messages.map((message) => (
                                <motion.div
                                    key={message.message_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChatMessage
                                        content={message.messageText}
                                        isUser={message.user === accountName}
                                        timestamp={message.finalized ? new Date(message.created_at).toLocaleString() : new Date().toLocaleString()}
                                        ipfsCid={message.message_cid}
                                        aiReply={message.aiReply}
                                        isPending={!message.finalized}
                                        personaName={personaName}
                                    />
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </motion.div>

                    <motion.div 
                        className="p-4 border-t border-primary/20 bg-secondary/10"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                    >
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            isLoading={submitting}
                        />
                    </motion.div>
                </motion.div>

                <PersonaDialog
                    open={isPersonaDialogOpen}
                    onOpenChange={setIsPersonaDialogOpen}
                    personaName={personaName}
                />
            </motion.div>
        </AnimatePresence>
    );
};

export default Chat;
