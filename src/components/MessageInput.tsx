
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const MessageInput = ({ onSendMessage, isLoading }: MessageInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const placeholderText = isLoading 
    ? "Waiting for response..."
    : "Type your message...";

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" onKeyDown={(e) => {
      // Prevent Enter key from submitting when loading
      if (e.key === 'Enter' && isLoading) {
        e.preventDefault();
      }
    }}>
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholderText}
        disabled={isLoading}
        className="flex-1"
        aria-label={isLoading ? "Cannot send message while waiting for response" : "Type your message"}
      />
      <Button 
        type="submit" 
        disabled={isLoading || !message.trim()}
        className="flex items-center gap-2"
      >
        <Send className="h-4 w-4" />
        {isLoading ? 'Waiting...' : 'Send'}
      </Button>
    </form>
  );
};
