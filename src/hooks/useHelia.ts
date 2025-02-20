import { useContext } from 'react'
import { HeliaContext } from '../providers/HeliaProvider'

export function useHelia() {
  return useContext(HeliaContext)
} 