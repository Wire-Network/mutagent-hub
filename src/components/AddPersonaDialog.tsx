import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserRoundPlus } from "lucide-react"
import { useState } from "react"
import { useToast } from "./ui/use-toast"
import { usePersonaContent } from "@/hooks/usePersonaContent"
import { WireService } from "@/services/wire-service"
import config from "@/config"
import { useQueryClient } from '@tanstack/react-query'

export function AddPersonaDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [backstory, setBackstory] = useState("")
  const [traits, setTraits] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { isReady, uploadContent } = usePersonaContent()
  const wireService = WireService.getInstance()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isReady) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "IPFS is not initialized yet. Please try again in a moment.",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting persona creation process...');
      console.log('Step 1: Preparing persona data for IPFS');
      
      // Format traits into array
      const traitArray = traits.split(',').map(t => t.trim()).filter(t => t);
      
      // Create initial state message
      const message = {
        text: backstory,
        timestamp: new Date().toISOString(),
        persona: name,
        traits: traitArray
      };

      console.log('Uploading initial state to IPFS:', message);
      const initialStateCid = await uploadContent(message);
      console.log('Initial state uploaded to IPFS with CID:', initialStateCid);

      console.log('Step 2: Creating persona account and deploying contract');
      const result = await wireService.addPersona(
        name.toLowerCase(),
        backstory,
        initialStateCid
      );
      
      console.log('Persona creation complete:', {
        name: name.toLowerCase(),
        initialStateCid,
        deployResult: result.deployResult,
        initResponse: result.initResponse
      });

      toast({
        title: "Success",
        description: "Persona created successfully!",
      });

      // Invalidate and refetch personas query
      await queryClient.invalidateQueries({ queryKey: ['personas'] });
      
      setOpen(false);
      setName("");
      setBackstory("");
      setTraits("");
    } catch (error: any) {
      console.error('Error creating persona:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create persona",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserRoundPlus className="h-4 w-4" />
          Add New Persona
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Persona</DialogTitle>
            <DialogDescription>
              Add a new character persona with their backstory and traits.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name">Name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Batman"
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="backstory">Backstory</label>
              <Textarea
                id="backstory"
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                placeholder="Tell us about this character's background..."
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="traits">Traits</label>
              <Input
                id="traits"
                value={traits}
                onChange={(e) => setTraits(e.target.value)}
                placeholder="e.g. Detective, Vigilante, Billionaire (comma-separated)"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading || !isReady}
            >
              {isLoading ? "Creating..." : "Create Persona"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
