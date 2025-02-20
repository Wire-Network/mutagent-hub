import { useState } from 'react'
import { PinataService } from '@/services/pinata-service'

export function usePersonaContent() {
  const [isReady] = useState(true) // Always ready since we're just using Pinata
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

  return {
    isReady,
    uploadContent,
    getContent
  }
} 