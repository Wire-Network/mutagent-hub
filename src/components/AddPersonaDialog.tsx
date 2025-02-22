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

export function AddPersonaDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [backstory, setBackstory] = useState("")
  const [traits, setTraits] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const { isReady, uploadContent } = usePersonaContent()
  const wireService = WireService.getInstance()
  const queryClient = useQueryClient()

  const generateRandomPersona = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.venice.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b",
          messages: [{
            role: "user",
            content: `Create an AI persona based on a famous character from movies, books, TV shows, history, or music.
Format the response EXACTLY as follows (the name format is strict and must be followed):

Name: [Create a recognizable 9-character name based on a famous character or personality. Use only lowercase letters a-z and numbers 1-5 (no dots). The .ai suffix will be added automatically.]
Backstory: [Write 2-3 sentences about the character's background and motivations WITHOUT mentioning any names. Focus on their role, achievements, and unique characteristics.]
Traits: [List exactly 3 personality traits, comma-separated, no period at the end]

Important: The name MUST be exactly 9 characters long using ONLY lowercase letters and numbers 1-5 (no dots or special characters).
Examples of good character-based names:
- starkbot15 (Iron Man)
- sherlock15 (Sherlock Holmes)
- batmanbot5 (Batman)
- jedimind15 (Star Wars)
- thorgod451 (Thor)

Example format:
Name: starkbot15
Backstory: A brilliant inventor and billionaire who created advanced technology to protect the world. After a life-changing incident, dedicated their existence to fighting evil using cutting-edge robotic suits and artificial intelligence.
Traits: genius inventor, charismatic leader, determined hero

Remember: 
- Name must be AT MOST 9 characters
- Only use lowercase letters a-z and numbers 1-5
- NO dots or special characters (the .ai will be added automatically)
- Make it recognizable based on the character
- Do NOT mention character names in the backstory
- Traits must be exactly 3, comma-separated`
          }],
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate persona')
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      console.log('AI Response:', content)
      
      // Parse the response
      const nameMatch = content.match(/Name:\s*([a-z1-5]{9})/i)
      console.log('Name match:', nameMatch)
      
      const backstoryMatch = content.match(/Backstory:\s*(.*?)(?=\nTraits:|$)/s)
      console.log('Backstory match:', backstoryMatch)
      
      const traitsMatch = content.match(/Traits:\s*(.*?)(?=\n|$)/s)
      console.log('Traits match:', traitsMatch)

      if (nameMatch && nameMatch[1]) {
        const generatedName = nameMatch[1].toLowerCase() + '.ai'
        console.log('Setting name to:', generatedName)
        setName(generatedName)
        validateName(generatedName)
      } else {
        console.error('Failed to parse name from response')
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate valid name, please try again",
        })
        return
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
    } catch (error) {
      console.error('Error generating persona:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate random persona",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const validateName = (value: string) => {
    // Reset error
    setNameError("")
    
    // Check if name ends with .ai
    if (!value.endsWith('.ai')) {
      setNameError("Name must end with .ai")
      return false
    }

    // Get the base name (without .ai)
    const baseName = value.slice(0, -3)
    
    // Check base name length (must be exactly 9 characters)
    if (baseName.length !== 9) {
      setNameError("Name must be exactly 9 characters (excluding .ai)")
      return false
    }

    // Check for valid characters (only lowercase a-z and numbers 1-5)
    if (!/^[a-z1-5]+$/.test(baseName)) {
      setNameError("Only lowercase letters a-z and numbers 1-5 are allowed")
      return false
    }

    // Check total length (must be exactly 12 characters including .ai)
    if (value.length !== 12) {
      setNameError("Total name length must be exactly 12 characters")
      return false
    }

    return true
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase()
    setName(value)
    validateName(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      console.log('Step 1: Preparing persona data for IPFS')
      
      // Format traits into array
      const traitArray = traits.split(',').map(t => t.trim()).filter(t => t)
      
      // Create initial state message
      const message = {
        text: backstory,
        timestamp: new Date().toISOString(),
        persona: name,
        traits: traitArray
      }

      console.log('Uploading initial state to IPFS:', message)
      const initialStateCid = await uploadContent(message)
      console.log('Initial state uploaded to IPFS with CID:', initialStateCid)

      console.log('Step 2: Creating persona account and deploying contract')
      const result = await wireService.addPersona(
        name.toLowerCase(),
        backstory,
        initialStateCid
      )
      
      console.log('Persona creation complete:', {
        name: name.toLowerCase(),
        initialStateCid,
        deployResult: result.deployResult,
        initResponse: result.initResponse
      })

      toast({
        title: "Success",
        description: "Persona created successfully!",
      })

      // Invalidate and refetch personas query
      await queryClient.invalidateQueries({ queryKey: ['personas'] })
      
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
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. starkbot15.ai"
                required
                className={nameError ? "border-red-500" : ""}
                pattern="[a-z1-5]{9}\.ai"
                title="Must be 9 characters using only lowercase letters and numbers 1-5, followed by .ai"
              />
              {nameError && (
                <p className="text-sm text-red-500">{nameError}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Must be exactly 9 characters using only lowercase letters and numbers 1-5, followed by .ai
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
