import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonaDetails {
  name: string;
  backstory: string;
  traits: string[];
}

interface PersonaPanelProps {
  persona: PersonaDetails;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const PersonaPanel = ({ persona, isCollapsed, onToggle }: PersonaPanelProps) => {
  return (
    <div
      className={cn(
        "persona-panel transition-all duration-300",
        isCollapsed ? "w-[60px]" : "w-[300px]"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={onToggle}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform",
            !isCollapsed && "rotate-180"
          )}
        />
      </Button>
      
      {!isCollapsed && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{persona.name}</h2>
          <p className="text-sm text-muted-foreground">{persona.backstory}</p>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Traits</h3>
            <div className="flex flex-wrap gap-2">
              {persona.traits.map((trait) => (
                <span
                  key={trait}
                  className="bg-accent px-2 py-1 rounded-full text-xs"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};