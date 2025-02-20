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
  const [ipfsContent, setIpfsContent] = useState<IpfsMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchMessage } = useIpfs();

  const fetchIpfsContent = useCallback(async () => {
    if (!ipfsCid || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const message = await fetchMessage(ipfsCid);
      setIpfsContent(message);
    } catch (error: any) {
      console.error('Failed to fetch IPFS content:', error);
      setError(error.message || 'Failed to load message content');
    } finally {
      setIsLoading(false);
    }
  }, [ipfsCid, fetchMessage, isLoading]);

  useEffect(() => {
    if (ipfsCid) {
      // Add a small delay before fetching to prevent too many simultaneous requests
      const timeoutId = setTimeout(fetchIpfsContent, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [ipfsCid, fetchIpfsContent]);

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
          
          {isLoading && (
            <div className="mt-2 flex items-center gap-2 text-sm opacity-70">
              <div className="animate-spin h-3 w-3 border-2 border-current rounded-full border-t-transparent"></div>
              <span>Loading message content...</span>
            </div>
          )}

          {error && (
            <div className="mt-2 text-sm text-red-500">
              {error}
            </div>
          )}
          
          {ipfsContent && (
            <div className="mt-3 pt-3 border-t border-border/10">
              <p className="text-sm text-muted-foreground">
              </p>
              {ipfsContent.data.traits && ipfsContent.data.traits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ipfsContent.data.traits.map((trait, index) => (
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
