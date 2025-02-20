import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
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
  const [ipfsContent, setIpfsContent] = useState<IpfsMessage | null>(null);
  const { fetchMessage } = useIpfs();

  useEffect(() => {
    if (ipfsCid) {
      fetchMessage(ipfsCid)
        .then(message => {
          setIpfsContent(message);
        })
        .catch(error => {
          console.error('Failed to fetch IPFS content:', error);
        });
    }
  }, [ipfsCid, fetchMessage]);

  return (
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
          
          {ipfsContent && (
            <div className="mt-3 pt-3 border-t border-border/10">
              <p className="text-sm text-muted-foreground">
                Original Message: {ipfsContent.text}
              </p>
              {ipfsContent.traits && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ipfsContent.traits.map((trait, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-accent/50 px-2 py-0.5 rounded-full"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {aiReply && (
            <div className="mt-3 pt-3 border-t border-border/10">
              <p className="whitespace-pre-wrap text-sm">{aiReply}</p>
            </div>
          )}
          
          {isPending && (
            <div className="mt-2 flex items-center gap-2 text-sm opacity-70">
              <div className="animate-spin h-3 w-3 border-2 border-current rounded-full border-t-transparent"></div>
              <span>Waiting for response...</span>
            </div>
          )}
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
  );
};
