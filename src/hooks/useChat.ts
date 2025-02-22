
import { useState, useRef, useCallback } from "react";
import { useWire } from "@/hooks/useWire";
import { useIpfs } from "@/hooks/useIpfs";
import { useToast } from "@/components/ui/use-toast";
import { WireService } from "@/services/wire-service";
import { ExtendedMessage } from "@/types/chat";

export const useChat = (personaName: string, accountName: string) => {
    const { toast } = useToast();
    const { loading: wireLoading, getMessages, submitMessage } = useWire();
    const { uploadMessage, fetchMessage } = useIpfs();
    const wireService = WireService.getInstance();
    
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

    return {
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
    };
};
