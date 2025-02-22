
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
      <HoverCardTrigger asChild className="block w-full h-full">
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="fixed w-[var(--radix-hover-card-trigger-width)] h-[var(--radix-hover-card-trigger-height)] 
        bg-secondary/90 backdrop-blur-sm border-2 border-primary/50 rounded-lg 
        transition-all duration-300 z-[100] p-0 m-0"
        align="center"
        sideOffset={0}
      >
        <ScrollArea className="h-full w-full px-6 py-4">
          <div className="h-full flex items-center">
            <div className="border-l-2 border-primary/70 pl-4">
              <p className="text-base leading-relaxed text-white/90">
                {backstory}
              </p>
            </div>
          </div>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  );
};
