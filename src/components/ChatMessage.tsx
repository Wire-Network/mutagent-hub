import { cn } from "@/lib/utils";

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
    <div className={cn(
      "flex flex-col",
      isUser ? "items-end" : "items-start"
    )}>
      <div className={cn(
        "message-bubble p-4 rounded-lg",
        isUser ? "bg-primary/10" : "bg-muted"
      )}>
        <p>{content}</p>
        
        {aiReply && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-primary">{aiReply}</p>
          </div>
        )}
        
        {isPending && (
          <p className="text-sm text-muted-foreground italic mt-2">
            Waiting for response...
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <span>{timestamp}</span>
        {txHash && (
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-secondary transition-colors"
          >
            Tx
          </a>
        )}
        {ipfsCid && (
          <a
            href={`https://ipfs.io/ipfs/${ipfsCid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-secondary transition-colors"
          >
            IPFS
          </a>
        )}
      </div>
    </div>
  );
};