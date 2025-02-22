
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BackstoryHoverCardProps {
  children: React.ReactNode;
  backstory: string;
}

export const BackstoryHoverCard = ({ children, backstory }: BackstoryHoverCardProps) => {
  return (
    <HoverCard openDelay={100} closeDelay={150}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 bg-secondary/95 border-2 border-primary/50 shadow-[0_0_30px_-5px] shadow-primary/30 
        backdrop-blur-2xl rounded-lg animate-in zoom-in-95 duration-200 data-[state=closed]:animate-out 
        data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 
        data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 
        data-[side=top]:slide-in-from-bottom-2"
        align="center"
        sideOffset={10}
      >
        <ScrollArea className="h-[200px] w-full pr-4">
          <div className="space-y-4">
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm leading-relaxed text-primary-foreground">
                {backstory}
              </p>
            </div>
          </div>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  );
};
