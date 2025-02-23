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
import { UserRoundPlus, Wand2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "./ui/use-toast"
import { usePersonaContent } from "@/hooks/usePersonaContent"
import { WireService } from "@/services/wire-service"
import config from "@/config"
import { useQueryClient } from '@tanstack/react-query'
import { usePersonaAvatar } from "@/hooks/usePersonaAvatar"
import { PinataService } from "@/services/pinata-service"
import { cn } from "@/lib/utils"

export function AddPersonaDialog({ onPersonaAdded }: { onPersonaAdded?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [nameError, setNameError] = useState("")
  const [backstory, setBackstory] = useState("")
  const [traits, setTraits] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const { isReady, uploadContent } = usePersonaContent()
  const wireService = WireService.getInstance()
  const queryClient = useQueryClient()
  const pinataService = PinataService.getInstance()
  const { generateAvatar } = usePersonaAvatar()

  const generateRandomPersona = async () => {
    setIsGenerating(true)
    try {
      console.log('Starting random persona generation...');
      const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.venice.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b",
          messages: [{
            role: "system",
            content: "You are a creative AI that generates diverse and unique character personas. Avoid using obvious or common characters. Be original and surprising with your choices."
          }, {
            role: "user",
            content: `Create an AI persona based on a completely random character archetype - avoid obvious choices like detectives or common characters.
Format the response EXACTLY as follows (the name format is strict and must be followed):

Name: [Create a unique 9-character name based on the character's role or nature. Use only lowercase letters a-z and numbers 1-5 (no dots). The .ai suffix will be added automatically.]
Backstory: [Write 2-3 sentences about the character's background and motivations WITHOUT mentioning any names. Focus on their role, achievements, and unique characteristics.]
Traits: [List exactly 3 personality traits, comma-separated, no period at the end]

Important: The name MUST be exactly 9 characters long using ONLY lowercase letters and numbers 1-5 (no dots or special characters).`
          }],
          temperature: 0.9,
          presence_penalty: 1.0,
          frequency_penalty: 1.0,
        })
      })

      if (!response.ok) {
        console.error('Venice API error:', response.status, await response.text());
        throw new Error('Failed to generate persona')
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      console.log('AI Raw Response:', content)
      
      const nameMatch = content.match(/Name:\s*([a-z1-5]{9})/i)
      console.log('Name match:', nameMatch)
      
      const backstoryMatch = content.match(/Backstory:\s*(.*?)(?=\nTraits:|$)/s)
      console.log('Backstory match:', backstoryMatch)
      
      const traitsMatch = content.match(/Traits:\s*(.*?)(?=\n|$)/s)
      console.log('Traits match:', traitsMatch)

      if (nameMatch && nameMatch[1]) {
        const generatedName = nameMatch[1].toLowerCase()
        console.log('Setting name to:', generatedName)
        setName(generatedName)
        setDisplayName(generatedName)
        validateName(generatedName)
      } else {
        console.error('Failed to parse name from response:', content)
        throw new Error('Failed to generate valid name, please try again')
      }

      if (backstoryMatch && backstoryMatch[1]) {
        const backstoryText = backstoryMatch[1].trim()
        console.log('Setting backstory to:', backstoryText)
        setBackstory(backstoryText)
      }

      if (traitsMatch && traitsMatch[1]) {
        const traitsText = traitsMatch[1].trim()
        console.log('Setting traits to:', traitsText)
        setTraits(traitsText)
      }

      toast({
        title: "Success",
        description: "Generated random persona!",
      })
    } catch (error: any) {
      console.error('Error generating persona:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate random persona",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const validateName = (value: string) => {
    setNameError("")
    const baseName = value.endsWith('.ai') ? value.slice(0, -3) : value
    if (baseName.length > 9) {
      setNameError("Name must be at most 9 characters (excluding .ai)")
      return false
    }
    if (!/^[a-z1-5]+$/.test(baseName)) {
      setNameError("Only lowercase letters a-z and numbers 1-5 are allowed")
      return false
    }
    return true
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase()
    const baseName = value.endsWith('.ai') ? value.slice(0, -3) : value
    setDisplayName(baseName)
    setName(baseName)
    validateName(baseName)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const fullName = `${name}.ai`
    if (!validateName(name)) {
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
      console.log('Starting persona creation process...')
      
      const avatarBase64 = await generateAvatar(fullName, backstory)
      let avatarCid = null

      if (avatarBase64) {
        const avatarData = {
          imageData: avatarBase64,
          metadata: {
            version: 1,
            personaName: fullName,
            timestamp: new Date().toISOString()
          }
        }
        avatarCid = await pinataService.uploadJSON(avatarData)
        console.log('Avatar stored in IPFS with CID:', avatarCid)
      }

      const traitArray = traits.split(',').map(t => t.trim()).filter(t => t)
      
      const message = {
        text: backstory,
        timestamp: new Date().toISOString(),
        persona: fullName,
        traits: traitArray,
        avatar_cid: avatarCid
      }

      console.log('Uploading initial state to IPFS:', message)
      const initialStateCid = await uploadContent(message)
      console.log('Initial state uploaded to IPFS with CID:', initialStateCid)

      console.log('Creating persona account and deploying contract')
      const result = await wireService.addPersona(
        fullName,
        backstory,
        initialStateCid
      )
      
      console.log('Persona creation complete:', result)

      toast({
        title: "Success",
        description: "Persona created successfully!",
      })

      onPersonaAdded?.()
      setOpen(false)
      setDisplayName("")
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={generateRandomPersona}
              disabled={isGenerating}
            >
              <Wand2 className="h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Random"}
            </Button>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name">Name</label>
              <div className="relative group">
                <Input
                  id="name"
                  value={displayName}
                  onChange={handleNameChange}
                  placeholder="e.g. starkbot15"
                  required
                  className={cn(
                    nameError ? "border-red-500" : "",
                    "pr-12 transition-all duration-300"
                  )}
                  pattern="[a-z1-5]{1,9}"
                  title="Must be up to 9 characters using only lowercase letters and numbers 1-5"
                />
                <span 
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground",
                    "transition-all duration-300 group-hover:text-primary",
                    displayName ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
                  )}
                >
                  .ai
                </span>
              </div>
              {nameError && (
                <p className="text-sm text-red-500 animate-fade-in">{nameError}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Must be at most 9 characters using only lowercase letters and numbers 1-5
              </p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="backstory">Backstory</label>
              <Textarea
                id="backstory"
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                placeholder="Tell us about this character's background..."
                required
                className="min-h-[100px] resize-none border border-muted/30 focus:border-primary focus-visible:ring-0"
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
              disabled={isLoading || !isReady || !!nameError}
            >
              {isLoading ? "Creating..." : "Create Persona"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
