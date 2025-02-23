
import { useState } from 'react'
import { PinataService } from '@/services/pinata-service'
import { PersonaData } from '@/types/persona'

export function usePersonaContent() {
  const [isReady] = useState(true)
  const pinataService = PinataService.getInstance()

  const uploadContent = async (content: any) => {
    try {
      const cid = await pinataService.uploadJSON(content)
      console.log('Content uploaded to Pinata:', cid)
      return cid
    } catch (error) {
      console.error('Error uploading content:', error)
      throw error
    }
  }

  const getContent = async (cid: string) => {
    try {
      const content = await pinataService.getContent(cid)
      console.log('Content retrieved from Pinata:', content)
      return content
    } catch (error) {
      console.error('Error fetching content:', error)
      throw error
    }
  }

  const getPersonas = async (): Promise<PersonaData[]> => {
    // This is a placeholder implementation - replace with actual data fetching
    return [
      {
        id: '1',
        name: 'Example Persona',
        description: 'An example persona description',
        backstory: 'Example backstory',
        traits: ['friendly', 'helpful'],
        imageUrl: '/placeholder.svg'
      }
    ]
  }

  return {
    isReady,
    uploadContent,
    getContent,
    getPersonas
  }
}
