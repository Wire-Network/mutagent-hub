import { useState, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { PersonaPanel } from "@/components/PersonaPanel";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BrowserProvider } from "ethers";

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

  useEffect(() => {
    checkWalletConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setIsWalletConnected(true);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setIsWalletConnected(true);
    } else {
      setIsWalletConnected(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast({
        title: "Metamask not found",
        description: "Please install Metamask to use this feature",
        variant: "destructive",
      });
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length > 0) {
        setIsWalletConnected(true);
        toast({
          title: "Wallet connected",
          description: "You can now send messages",
        });
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

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
          <Button 
            onClick={connectWallet} 
            variant={isWalletConnected ? "default" : "outline"}
          >
            <Wallet className="h-4 w-4 mr-2" />
            {isWalletConnected ? "Connected" : "Connect Wallet"}
          </Button>
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

export default Index;