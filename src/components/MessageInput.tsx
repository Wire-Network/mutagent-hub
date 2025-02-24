
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.form 
      onSubmit={handleSubmit} 
      className="flex gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && isLoading) {
          e.preventDefault();
        }
      }}
    >
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholderText}
        disabled={isLoading}
        className="flex-1 bg-secondary/20 border-primary/20 focus:border-primary transition-all duration-300"
        aria-label={isLoading ? "Cannot send message while waiting for response" : "Type your message"}
      />
      <Button 
        type="submit" 
        disabled={isLoading || !message.trim()}
        className="flex items-center gap-2 cyber-button transition-all duration-300"
      >
        <Send className="h-4 w-4" />
        {isLoading ? 'Waiting...' : 'Send'}
      </Button>
    </motion.form>
  );
};
