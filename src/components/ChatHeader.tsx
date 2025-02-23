
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
            console.log('Starting avatar load process for:', personaName);
            console.log('isReady status:', isReady);
            
            if (!isReady) {
                console.log('Content service not ready yet');
                return;
            }

            try {
                console.log('Fetching persona info for:', personaName);
                const personaInfo = await getPersonaInfo(personaName);
                console.log('Persona info received:', personaInfo);
                
                if (!personaInfo?.initial_state_cid) {
                    console.log('No initial state CID found');
                    return;
                }

                console.log('Fetching state data with CID:', personaInfo.initial_state_cid);
                const stateData = await getContent(personaInfo.initial_state_cid);
                console.log('State data received:', stateData);
                
                // If we have a stored avatar CID, use it
                if (stateData.data.avatar_cid) {
                    try {
                        console.log('Fetching avatar data with CID:', stateData.data.avatar_cid);
                        const avatarData = await getContent(stateData.data.avatar_cid);
                        console.log('Avatar data received:', avatarData);
                        
                        if (avatarData?.imageData) {
                            console.log('Setting avatar URL from image data');
                            setAvatarUrl(`data:image/png;base64,${avatarData.imageData}`);
                            return;
                        } else {
                            console.log('No image data found in avatar data');
                        }
                    } catch (error) {
                        console.error('Error fetching avatar:', error);
                    }
                } else {
                    console.log('No avatar CID found in state data');
                }

                // Fallback to placeholder if no avatar is found
                console.log('Falling back to placeholder avatar');
                setAvatarUrl("/placeholder.svg");
            } catch (error) {
                console.error('Error in avatar load process:', error);
                setAvatarUrl("/placeholder.svg");
            }
        };

        loadAvatar();
    }, [personaName, isReady, getPersonaInfo, getContent]);

    return (
        <div className="p-4 border-b border-primary/20">
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
                        className="w-12 h-12 rounded-full p-0 overflow-hidden border border-primary/20 hover:border-primary/40 transition-colors"
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
