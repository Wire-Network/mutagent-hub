import { useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { PersonaPanel } from "@/components/PersonaPanel";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockPersona = {
  name: "Batman",
  backstory: "The Dark Knight of Gotham City, a vigilante who fights crime using his intellect, martial arts skills, and advanced technology.",
  traits: ["Detective", "Vigilante", "Billionaire", "Martial Artist"],
};

const Index = () => {
  const [messages, setMessages] = useState<Array<{
    content: string;
    isUser: boolean;
    timestamp: string;
    txHash?: string;
    ipfsCid?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async (content: string) => {
    if (!isWalletConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to send messages.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // Add user message immediately
    const userMessage = {
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
      ipfsCid: "QmExample...", // This would be the actual IPFS CID
      txHash: "0xExample...", // This would be the actual transaction hash
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response after 2 seconds
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

  const toggleWallet = () => {
    setIsWalletConnected(!isWalletConnected);
    toast({
      title: isWalletConnected ? "Wallet disconnected" : "Wallet connected",
      description: isWalletConnected ? "You've been disconnected" : "You can now send messages",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <PersonaPanel
        persona={mockPersona}
        isCollapsed={isPanelCollapsed}
        onToggle={() => setIsPanelCollapsed(!isPanelCollapsed)}
      />
      
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between p-4 bg-card border-b">
          <h1 className="text-2xl font-bold">Chat with {mockPersona.name}</h1>
          <Button onClick={toggleWallet} variant={isWalletConnected ? "default" : "outline"}>
            <Wallet className="h-4 w-4 mr-2" />
            {isWalletConnected ? "Connected" : "Connect Wallet"}
          </Button>
        </header>

        <div className="chat-container">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} {...msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
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

export default Index;