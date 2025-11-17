'use client'

import { useEffect } from 'react'
import { useApp } from '@/store/hooks'

export function AppInit() {
  const appStore = useApp()

  useEffect(() => {
    appStore.loadUser()
      .then(() => console.log('App initialized'))
      .catch(error => console.error('Failed to initialize app:', error))
  }, [])

  return null
}