
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import config from "@/config"

export function usePersonaGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

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

Important: The name MUST be exactly 9 characters long using ONLY lowercase letters and numbers 1-5 (no dots or special characters).`
          }],
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate persona')
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      const nameMatch = content.match(/Name:\s*([a-z1-5]{9})/i)
      const backstoryMatch = content.match(/Backstory:\s*(.*?)(?=\nTraits:|$)/s)
      const traitsMatch = content.match(/Traits:\s*(.*?)(?=\n|$)/s)

      if (!nameMatch?.[1]) {
        throw new Error('Failed to generate valid name')
      }

      return {
        name: nameMatch[1].toLowerCase() + '.ai',
        backstory: backstoryMatch?.[1]?.trim() || '',
        traits: traitsMatch?.[1]?.trim() || ''
      }
    } catch (error) {
      console.error('Error generating persona:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate random persona",
      })
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateRandomPersona,
    isGenerating
  }
}
