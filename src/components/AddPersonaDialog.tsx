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
import { useIpfs, IpfsMessage } from "@/hooks/useIpfs"
import { WireService } from "@/services/wire-service"
import config from "@/config"

export function AddPersonaDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [backstory, setBackstory] = useState("")
  const [traits, setTraits] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { uploadMessage } = useIpfs()
  const wireService = WireService.getInstance()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create initial state object
      const initialState: IpfsMessage = {
        text: backstory,
        timestamp: new Date().toISOString(),
        name,
        traits: traits.split(',').map(t => t.trim()),
      };

      // Upload initial state to IPFS
      const initialStateCid = await uploadMessage(initialState);

      // Add persona to blockchain
      await wireService.addPersona(name.toLowerCase(), backstory, initialStateCid);

      toast({
        title: "Success",
        description: "Persona has been created successfully.",
      });
      setOpen(false);
      setName("");
      setBackstory("");
      setTraits("");
    } catch (error: any ) {
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Persona"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
