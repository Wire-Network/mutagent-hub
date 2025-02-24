import { useState, useCallback } from 'react';
import { WireService } from '../services/wire-service';
import { useToast } from '@/components/ui/use-toast';
import { PersonaInfo, RawPersona } from '@/types/persona';
import { useAuth } from '@/contexts/AuthContext';

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
    response?: string;
}

export function useWire() {
    const wireService = WireService.getInstance();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isWalletAuth } = useAuth();

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

    const getPersonas = useCallback(async (): Promise<RawPersona[]> => {
        try {
            const personas = await wireService.getPersonas();
            return personas;
        } catch (e) {
            handleError(e);
            return [];
        }
    }, [handleError]);

    const getMessages = useCallback(async (personaName: string, userAccount?: string) => {
        try {
            const response = await wireService.getMessages(personaName, userAccount);
            return response;
        } catch (e) {
            handleError(e);
            return { messages: [] };
        }
    }, [handleError]);

    const getPersonaInfo = useCallback(async (personaName: string): Promise<PersonaInfo | null> => {
        try {
            return await wireService.getPersona(personaName);
        } catch (e) {
            handleError(e);
            return null;
        }
    }, [handleError]);

    const submitMessage = useCallback(async (
        personaName: string,
        userAccount: string,
        preStateCid: string,
        messageCid: string,
        fullConvoHistoryCid: string 
    ) => {
        setLoading(true);
        try {
            const result = await wireService.submitMessage(
                personaName,
                userAccount,
                preStateCid,
                messageCid,
                fullConvoHistoryCid,
                isWalletAuth
            );
            return result;
        } catch (e) {
            handleError(e);
            throw e;
        } finally {
            setLoading(false);
        }
    }, [handleError, isWalletAuth]);

    return {
        loading,
        error,
        getPersonas,
        getMessages,
        getPersonaInfo,
        submitMessage
    };
} 