'use client'

import { useEffect } from 'react'
import { useApp } from '@/store/hooks'

export function AppInit() {
  const { loadUser } = useApp()

  useEffect(() => {
    loadUser()
      .then(() => console.log('App initialized'))
      .catch(error => console.error('Failed to initialize app:', error))
  }, [loadUser])

  return null
}