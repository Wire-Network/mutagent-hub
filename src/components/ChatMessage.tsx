import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: string;
  txHash?: string;
  ipfsCid?: string;
}

export const ChatMessage = ({ content, isUser, timestamp, txHash, ipfsCid }: ChatMessageProps) => {
  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div className={cn("message-bubble", isUser ? "user-message" : "npc-message")}>
        <p>{content}</p>
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