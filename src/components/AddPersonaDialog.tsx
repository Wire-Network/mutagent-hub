
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UserRoundPlus } from "lucide-react"
import { useState } from "react"
import { useToast } from "./ui/use-toast"
import { usePersonaContent } from "@/hooks/usePersonaContent"
import { WireService } from "@/services/wire-service"
import { useQueryClient } from '@tanstack/react-query'
import { usePersonaAvatar } from "@/hooks/usePersonaAvatar"
import { PinataService } from "@/services/pinata-service"
import { PersonaNameInput } from "./persona/PersonaNameInput"
import { PersonaBackstoryInput } from "./persona/PersonaBackstoryInput"
import { PersonaTraitsInput } from "./persona/PersonaTraitsInput"
import { GenerateRandomButton } from "./persona/GenerateRandomButton"
import { usePersonaGenerator } from "./persona/usePersonaGenerator"

export function AddPersonaDialog({ onPersonaAdded }: { onPersonaAdded?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [isNameValid, setIsNameValid] = useState(false)
  const [backstory, setBackstory] = useState("")
  const [traits, setTraits] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const { toast } = useToast()
  const { isReady, uploadContent } = usePersonaContent()
  const wireService = WireService.getInstance()
  const queryClient = useQueryClient()
  const pinataService = PinataService.getInstance()
  const { generateAvatar } = usePersonaAvatar()
  const { generateRandomPersona, isGenerating } = usePersonaGenerator()

  const handleRandomGenerate = async () => {
    const persona = await generateRandomPersona()
    if (persona) {
      setName(persona.name)
      setBackstory(persona.backstory)
      setTraits(persona.traits)
      toast({
        title: "Success",
        description: "Generated random persona!",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isNameValid) {
      return
    }

    if (!isReady) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "IPFS is not initialized yet. Please try again in a moment.",
      })
      return
    }

    setIsLoading(true)
    try {
      const avatarBase64 = await generateAvatar(name, backstory)
      let avatarCid = null

      if (avatarBase64) {
        const avatarData = {
          imageData: avatarBase64,
          metadata: {
            version: 1,
            personaName: name,
            timestamp: new Date().toISOString()
          }
        }
        avatarCid = await pinataService.uploadJSON(avatarData)
      }

      const traitArray = traits.split(',').map(t => t.trim()).filter(t => t)
      
      const message = {
        text: backstory,
        timestamp: new Date().toISOString(),
        persona: name,
        traits: traitArray,
        avatar_cid: avatarCid
      }

      const initialStateCid = await uploadContent(message)
      await wireService.addPersona(name.toLowerCase(), backstory, initialStateCid)

      toast({
        title: "Success",
        description: "Persona created successfully!",
      })

      onPersonaAdded?.()
      setOpen(false)
      setName("")
      setBackstory("")
      setTraits("")
    } catch (error: any) {
      console.error('Error creating persona:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create persona",
      })
    } finally {
      setIsLoading(false)
    }
  }

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
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Create New Persona</DialogTitle>
            </div>
            <GenerateRandomButton
              onClick={handleRandomGenerate}
              isGenerating={isGenerating}
            />
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <PersonaNameInput
              value={name}
              onChange={(value, isValid) => {
                setName(value)
                setIsNameValid(isValid)
              }}
            />
            <PersonaBackstoryInput
              value={backstory}
              onChange={setBackstory}
            />
            <PersonaTraitsInput
              value={traits}
              onChange={setTraits}
            />
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading || !isReady || !isNameValid}
            >
              {isLoading ? "Creating..." : "Create Persona"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
