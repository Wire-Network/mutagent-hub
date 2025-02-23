
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function HelpButton() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 bg-background/50 backdrop-blur-sm hover:bg-background/80"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Need Help?</h4>
            <p className="text-sm text-muted-foreground">
              Learn more about ImmutableNPC Hub and how it works.
            </p>
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => navigate('/about')}
            >
              About
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
