
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: string;
  txHash?: string;
  ipfsCid?: string;
  aiReply?: string | null;
  isPending?: boolean;
}

export const ChatMessage = ({ 
  content, 
  isUser, 
  timestamp, 
  txHash, 
  ipfsCid,
  aiReply,
  isPending 
}: ChatMessageProps) => {
  return (
    <div className="space-y-4">
      {/* User Message */}
      <motion.div 
        className={cn(
          "flex flex-col",
          isUser ? "items-end" : "items-start"
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className={cn(
          "max-w-[80%] rounded-lg shadow-lg border transition-all duration-300",
          isUser 
            ? "bg-primary text-primary-foreground border-primary hover:shadow-[0_0_15px_rgba(120,255,0,0.3)]" 
            : "bg-secondary/30 text-foreground border-secondary/50 hover:shadow-[0_0_15px_rgba(33,2,35,0.3)]"
        )}>
          <div className={cn(
            "px-4 py-2 text-sm font-medium border-b",
            isUser ? "border-primary/20" : "border-secondary/20"
          )}>
            {isUser ? "You" : "Assistant"}
          </div>
          <div className="p-4">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 px-2">
          <span>{timestamp}</span>
          {txHash && (
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              View transaction
            </a>
          )}
          {ipfsCid && (
            <a
              href={`https://ipfs.io/ipfs/${ipfsCid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              View on IPFS
            </a>
          )}
        </div>
      </motion.div>

      {/* AI Response */}
      {aiReply && (
        <motion.div 
          className="flex flex-col items-start"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <div className="max-w-[80%] rounded-lg shadow-lg border border-secondary/50 bg-secondary/30 text-foreground hover:shadow-[0_0_15px_rgba(33,2,35,0.3)] transition-all duration-300">
            <div className="px-4 py-2 text-sm font-medium border-b border-secondary/20">
              Assistant
            </div>
            <div className="p-4">
              <p className="whitespace-pre-wrap">{aiReply}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 px-2">
            <span>{new Date().toLocaleString()}</span>
          </div>
        </motion.div>
      )}

      {/* Pending Indicator */}
      {isPending && !aiReply && (
        <motion.div 
          className="flex flex-col items-start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="max-w-[80%] rounded-lg shadow-sm bg-secondary/20 text-muted-foreground p-4 border border-secondary/30">
            <div className="flex items-center gap-2 text-sm">
              <div className="animate-spin h-3 w-3 border-2 border-primary rounded-full border-t-transparent"></div>
              <span>Waiting for response...</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
