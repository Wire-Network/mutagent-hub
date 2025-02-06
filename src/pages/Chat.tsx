
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { PersonaPanel } from "@/components/PersonaPanel";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Mock data - in a real app, this would be fetched based on the persona name
const getPersonaDetails = (name: string) => ({
  name: name.charAt(0).toUpperCase() + name.slice(1),
  backstory: "The Dark Knight of Gotham City, a vigilante who fights crime using his intellect, martial arts skills, and advanced technology.",
  traits: ["Detective", "Vigilante", "Billionaire", "Martial Artist"],
});

const Chat = () => {
  const { personaName } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Array<{
    content: string;
    isUser: boolean;
    timestamp: string;
    txHash?: string;
    ipfsCid?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const { toast } = useToast();

  const persona = getPersonaDetails(personaName || "");

  const handleSendMessage = async (content: string) => {
    setIsLoading(true);
    console.log("Preparing to send message to WIRE network:", content);
    
    const userMessage = {
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
      ipfsCid: "QmExample...",
      txHash: "0xExample...",
    };
    setMessages((prev) => [...prev, userMessage]);

    // TODO: Implement WIRE network transaction
    setTimeout(() => {
      const aiMessage = {
        content: "I am vengeance. I am the night. I am Batman!",
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        ipfsCid: "QmExample2...",
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-background">
      <PersonaPanel
        persona={persona}
        isCollapsed={isPanelCollapsed}
        onToggle={() => setIsPanelCollapsed(!isPanelCollapsed)}
      />
      
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between p-4 bg-card border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Chat with {persona.name}</h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} {...msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
              <div className="animate-pulse">●</div>
              <div className="animate-pulse delay-100">●</div>
              <div className="animate-pulse delay-200">●</div>
            </div>
          )}
        </div>

        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Chat;
