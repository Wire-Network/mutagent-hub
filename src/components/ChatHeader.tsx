
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ChatHeaderProps {
    personaName: string;
    onBack: () => void;
}

export const ChatHeader = ({ personaName, onBack }: ChatHeaderProps) => {
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
            </div>
        </div>
    );
};
