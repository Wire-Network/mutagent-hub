import { useHelia } from './useHelia'
import { unixfs } from '@helia/unixfs'
import { useState, useEffect } from 'react'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function usePersonaContent() {
  const helia = useHelia()
  const [fs, setFs] = useState<any>(null)

  useEffect(() => {
    if (!helia) return

    setFs(unixfs(helia))
  }, [helia])

  const uploadContent = async (content: any) => {
    if (!fs) throw new Error('UnixFS not initialized')

    const bytes = encoder.encode(JSON.stringify(content))
    const cid = await fs.addBytes(bytes)
    return cid.toString()
  }

  const getContent = async (cid: string) => {
    if (!fs) throw new Error('UnixFS not initialized')

    let data = ''
    for await (const chunk of fs.cat(cid)) {
      data += decoder.decode(chunk, { stream: true })
    }
    return JSON.parse(data)
  }

  return {
    isReady: !!fs,
    uploadContent,
    getContent
  }
} 