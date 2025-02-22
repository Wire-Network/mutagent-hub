
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
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 backdrop-blur-xl bg-background/80 border-primary/30 shadow-lg shadow-primary/20"
        align="center"
      >
        <ScrollArea className="h-[200px] w-full pr-4">
          <div className="space-y-4">
            <div className="border-l-2 border-primary/50 pl-4">
              <p className="text-sm leading-relaxed text-foreground/90">
                {backstory}
              </p>
            </div>
          </div>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  );
};
