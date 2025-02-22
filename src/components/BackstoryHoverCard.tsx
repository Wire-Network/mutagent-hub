
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
        className="w-80 bg-secondary border-2 border-primary shadow-[0_0_30px_-5px] shadow-primary/30 
        p-4 rounded-lg"
        align="center"
        sideOffset={10}
      >
        <ScrollArea className="h-[200px] w-full pr-4">
          <div className="space-y-4">
            <div className="border-l-2 border-primary pl-4">
              <p className="text-sm leading-relaxed text-white">
                {backstory}
              </p>
            </div>
          </div>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  );
};
