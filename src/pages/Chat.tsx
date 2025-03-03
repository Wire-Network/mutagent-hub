import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatHeader } from "@/components/ChatHeader";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonaDialog } from "@/components/PersonaDialog";
import { motion, AnimatePresence } from "framer-motion";

const Chat = () => {
    const { personaName } = useParams<{ personaName: string }>();
    const { accountName } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);

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

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <AnimatePresence>
            <motion.div 
                className="flex min-h-screen bg-background"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
            >
                <motion.div 
                    className={cn(
                        "fixed left-0 top-0 h-full bg-secondary/30 backdrop-blur-md border-r border-primary/20 z-20",
                        isSidebarOpen ? "w-64" : "w-16"
                    )}
                    initial={{ x: -100 }}
                    animate={{ x: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    <div className="p-4 flex flex-col h-full">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-8 h-8 mb-8 hover:bg-primary/20 transition-colors"
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                        <motion.div 
                            className={cn(
                                "flex-1 flex flex-col",
                                !isSidebarOpen && "hidden"
                            )}
                            animate={{ opacity: isSidebarOpen ? 1 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="space-y-4 flex-1">
                                <div>
                                    <h2 className="text-xl font-bold text-primary font-heading">Mutagent</h2>
                                    <div className="border-t border-primary/20 mt-4 pt-4">
                                        <p className="text-sm text-muted-foreground">
                                            Choose your companion and start chatting with unique AI personas.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-primary/20">
                                <Button 
                                    variant="outline" 
                                    className="w-full hover:bg-primary/20 transition-colors"
                                    onClick={() => navigate('/')}
                                >
                                    Back to Personas
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                <motion.div 
                    className={cn(
                        "flex-1 transition-[margin] duration-300 ease-in-out",
                        isSidebarOpen ? "ml-64" : "ml-16"
                    )}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg h-screen flex flex-col border border-primary/20">
                        <ChatHeader 
                            personaName={personaName}
                            onBack={() => navigate('/')}
                            onAvatarClick={() => setIsPersonaDialogOpen(true)}
                        />
                        
                        <ScrollArea className="flex-1 p-4">
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
                        </ScrollArea>

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
                    </div>
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
