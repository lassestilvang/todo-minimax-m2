'use client'

import { useEffect } from 'react'
import { useApp } from '@/store/hooks'

export function AppInit() {
  const { loadUser } = useApp()

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize app state
        await loadUser()
        console.log('App initialized')
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }

    initializeApp()
  }, [loadUser])

  return null
}