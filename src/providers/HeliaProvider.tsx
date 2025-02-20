import React, { createContext, useContext, useEffect, useState } from 'react'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'

// Create the context with a simple Helia instance
export const HeliaContext = createContext<any>(null)

export const useHelia = () => useContext(HeliaContext)

export function HeliaProvider({ children }: { children: React.ReactNode }) {
  const [helia, setHelia] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (helia) return

      try {
        console.log('Initializing Helia node...')
        const blockstore = new MemoryBlockstore()
        const datastore = new MemoryDatastore()

        console.log('Creating libp2p instance...')
        const libp2p = await createLibp2p({
          datastore,
          transports: [webSockets()],
          connectionEncryption: [noise()],
          streamMuxers: [yamux()],
          peerDiscovery: [
            bootstrap({
              list: [
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
              ]
            })
          ]
        })

        console.log('Creating Helia node...')
        const heliaNode = await createHelia({
          datastore,
          blockstore,
          libp2p
        })

        if (mounted) {
          console.log('Helia node created successfully')
          // Log some debug info
          console.log('Helia node info:', {
            peerId: heliaNode.libp2p.peerId.toString(),
            addresses: heliaNode.libp2p.getMultiaddrs().map(addr => addr.toString())
          })
          setHelia(heliaNode)
        }
      } catch (error) {
        console.error('Failed to initialize Helia:', error)
      }
    }

    init()

    return () => {
      mounted = false
      if (helia) {
        console.log('Stopping Helia...')
        helia.stop()
      }
    }
  }, [helia])

  return (
    <HeliaContext.Provider value={helia}>
      {children}
    </HeliaContext.Provider>
  )
} 