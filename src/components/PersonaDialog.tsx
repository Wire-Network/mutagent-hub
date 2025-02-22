
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { usePersonaContent } from "@/hooks/usePersonaContent";
import { useWire } from "@/hooks/useWire";
import { usePersonaAvatar } from "@/hooks/usePersonaAvatar";
import { PersonaState } from "@/types/persona";

interface PersonaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    personaName: string;
}

export function PersonaDialog({ open, onOpenChange, personaName }: PersonaDialogProps) {
    const { getPersonaInfo } = useWire();
    const { isReady, getContent } = usePersonaContent();
    const { generateAvatar } = usePersonaAvatar();
    const [personaData, setPersonaData] = useState<PersonaState | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string>("/placeholder.svg");

    useEffect(() => {
        const loadPersonaData = async () => {
            if (!isReady || !open) return;

            try {
                const personaInfo = await getPersonaInfo(personaName);
                if (!personaInfo?.initial_state_cid) {
                    console.warn(`No initial state CID found for persona ${personaName}`);
                    return;
                }

                const stateData = await getContent(personaInfo.initial_state_cid) as PersonaState;
                setPersonaData(stateData);

                const avatarBase64 = await generateAvatar(personaName, stateData.data.text);
                if (avatarBase64) {
                    setAvatarUrl(`data:image/png;base64,${avatarBase64}`);
                }
            } catch (error) {
                console.error('Error loading persona data:', error);
            }
        };

        loadPersonaData();
    }, [personaName, open, isReady, getPersonaInfo, getContent, generateAvatar]);

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
