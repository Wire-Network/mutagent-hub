import { useState, useCallback } from 'react';
import { WireService } from '../services/wire-service';
import { useToast } from '@/components/ui/use-toast';

export interface Persona {
    persona_name: string;
    current_state_cid: string;
}

export interface Message {
    message_id: number;
    persona_name: string;
    message_cid: string;
    pre_persona_state_cid: string;
    completion_cid: string;
    post_persona_state_cid: string;
    finalized: boolean;
    user: string;
    created_at: string;
}

export function useWire() {
    const wireService = WireService.getInstance();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleError = useCallback((e: any) => {
        const message = e.details?.[0]?.message || e.message || 'An error occurred';
        setError(message);
        toast({
            variant: "destructive",
            title: "Error",
            description: message,
        });
        console.error('WIRE Error:', e);
    }, [toast]);

    const getPersonas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const personas = await wireService.getPersonas();
            return personas as Persona[];
        } catch (e) {
            handleError(e);
            return [];
        } finally {
            setLoading(false);
        }
    }, [handleError, wireService]);

    const getMessages = useCallback(async (personaName?: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await wireService.getMessages(personaName);
            return response.messages as Message[];
        } catch (e) {
            handleError(e);
            return [];
        } finally {
            setLoading(false);
        }
    }, [handleError, wireService]);

    const submitMessage = useCallback(async (
        personaName: string,
        userAccount: string,
        preStateCid: string,
        messageCid: string,
        fullConvoHistoryCid: string 
    ) => {
        setLoading(true);
        setError(null);
        try {
            const result = await wireService.submitMessage(personaName, userAccount, preStateCid, messageCid, fullConvoHistoryCid);
            toast({
                title: "Message Submitted",
                description: "Your message has been submitted to the blockchain.",
            });
            return result;
        } catch (e) {
            handleError(e);
        } finally {
            setLoading(false);
        }
    }, [handleError, toast, wireService]);

    return {
        loading,
        error,
        getPersonas,
        getMessages,
        submitMessage
    };
} 