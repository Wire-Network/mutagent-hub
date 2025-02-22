
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { usePersonaAvatar } from "@/hooks/usePersonaAvatar";
import { usePersonaContent } from "@/hooks/usePersonaContent";
import { useWire } from "@/hooks/useWire";

interface ChatHeaderProps {
    personaName: string;
    onBack: () => void;
    onAvatarClick: () => void;
}

export const ChatHeader = ({ personaName, onBack, onAvatarClick }: ChatHeaderProps) => {
    const [avatarUrl, setAvatarUrl] = useState<string>("/placeholder.svg");
    const { generateAvatar } = usePersonaAvatar();
    const { getPersonaInfo } = useWire();
    const { isReady, getContent } = usePersonaContent();

    useEffect(() => {
        const loadAvatar = async () => {
            if (!isReady) return;

            try {
                const personaInfo = await getPersonaInfo(personaName);
                if (!personaInfo?.initial_state_cid) return;

                const stateData = await getContent(personaInfo.initial_state_cid);
                const avatarBase64 = await generateAvatar(personaName, stateData.data.text);
                
                if (avatarBase64) {
                    setAvatarUrl(`data:image/png;base64,${avatarBase64}`);
                }
            } catch (error) {
                console.error('Error loading avatar:', error);
            }
        };

        loadAvatar();
    }, [personaName, isReady, generateAvatar, getPersonaInfo, getContent]);

    return (
        <div className="p-4 border-b">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="hover:bg-accent"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold capitalize flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
                    Chat with {personaName}
                </h1>
                <div className="ml-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 h-12 rounded-full p-0 overflow-hidden"
                        onClick={onAvatarClick}
                    >
                        <img
                            src={avatarUrl}
                            alt={personaName}
                            className="w-full h-full object-cover"
                        />
                    </Button>
                </div>
            </div>
        </div>
    );
};
