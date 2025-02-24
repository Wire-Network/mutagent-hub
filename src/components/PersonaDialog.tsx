
import { useEffect, useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useWire } from "@/hooks/useWire";
import { PersonaState } from "@/types/persona";
import { PinataService } from "@/services/pinata-service";
import { usePersonaContent } from "@/hooks/usePersonaContent";

interface PersonaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    personaName: string;
}

// Cache for storing persona data to prevent repeated fetches
const PERSONA_CACHE = new Map<string, {
    data: PersonaState;
    timestamp: number;
    avatarUrl: string;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

export function PersonaDialog({ open, onOpenChange, personaName }: PersonaDialogProps) {
    const { getPersonaInfo } = useWire();
    const { isReady, getContent } = usePersonaContent();
    const [personaData, setPersonaData] = useState<PersonaState | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string>("/placeholder.svg");
    const pinataService = PinataService.getInstance();

    const loadPersonaData = useCallback(async () => {
        if (!isReady || !open) return;

        // Check cache first
        const cached = PERSONA_CACHE.get(personaName);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            setPersonaData(cached.data);
            setAvatarUrl(cached.avatarUrl);
            return;
        }

        try {
            const personaInfo = await getPersonaInfo(personaName);
            if (!personaInfo?.initial_state_cid) {
                console.warn(`No initial state CID found for persona ${personaName}`);
                return;
            }

            const stateData = await getContent(personaInfo.initial_state_cid) as PersonaState;
            setPersonaData(stateData);

            // If we have a stored avatar CID, use it
            if (stateData.data.avatar_cid) {
                try {
                    const avatarData = await pinataService.getContent(stateData.data.avatar_cid);
                    if (avatarData?.data?.imageData) {
                        const newAvatarUrl = `data:image/png;base64,${avatarData.data.imageData}`;
                        setAvatarUrl(newAvatarUrl);
                        
                        // Update cache
                        PERSONA_CACHE.set(personaName, {
                            data: stateData,
                            timestamp: Date.now(),
                            avatarUrl: newAvatarUrl
                        });
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching avatar:', error);
                }
            }

            // Fallback to placeholder if no avatar is found
            setAvatarUrl("/placeholder.svg");
            
            // Cache even without avatar
            PERSONA_CACHE.set(personaName, {
                data: stateData,
                timestamp: Date.now(),
                avatarUrl: "/placeholder.svg"
            });
        } catch (error) {
            console.error('Error loading persona data:', error);
        }
    }, [personaName, open, isReady, getPersonaInfo, getContent]);

    useEffect(() => {
        if (open) {
            loadPersonaData();
        }
    }, [open, loadPersonaData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-4">
                        <img
                            src={avatarUrl}
                            alt={personaName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
                        />
                        <span className="capitalize">{personaName}</span>
                    </DialogTitle>
                    <DialogDescription>
                        About
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                    <div>
                        <h3 className="font-medium mb-2">Backstory</h3>
                        <p className="text-sm text-muted-foreground">
                            {personaData?.data.text || "Loading..."}
                        </p>
                    </div>
                    {personaData?.data.traits && personaData.data.traits.length > 0 && (
                        <div>
                            <h3 className="font-medium mb-2">Traits</h3>
                            <div className="flex flex-wrap gap-2">
                                {personaData.data.traits.map((trait, index) => (
                                    <span
                                        key={index}
                                        className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-xs"
                                    >
                                        {trait}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
