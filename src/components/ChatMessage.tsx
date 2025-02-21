import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { useIpfs, IpfsMessage } from "@/hooks/useIpfs";

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
      <div className={cn(
        "flex flex-col",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "max-w-[80%] rounded-lg shadow-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          <div className="px-4 py-2 text-sm font-medium border-b border-border/10">
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
      </div>

      {/* AI Response */}
      {aiReply && (
        <div className="flex flex-col items-start">
          <div className="max-w-[80%] rounded-lg shadow-sm bg-muted text-muted-foreground">
            <div className="px-4 py-2 text-sm font-medium border-b border-border/10">
              Batman
            </div>
            <div className="p-4">
              <p className="whitespace-pre-wrap">{aiReply}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 px-2">
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Pending Indicator */}
      {isPending && !aiReply && (
        <div className="flex flex-col items-start">
          <div className="max-w-[80%] rounded-lg shadow-sm bg-muted/50 text-muted-foreground p-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="animate-spin h-3 w-3 border-2 border-current rounded-full border-t-transparent"></div>
              <span>Waiting for response...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
