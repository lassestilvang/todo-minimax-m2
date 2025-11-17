/**
 * Persistence Middleware for Zustand Stores
 * Handles state persistence with localStorage
 */

import { StateStorage } from 'zustand/middleware/persist'

interface PersistConfig {
  name: string
  partialize?: (state: any) => any
  version?: number
  storage?: StateStorage
}

export function createPersistConfig(config: PersistConfig): PersistConfig {
  return {
    ...config,
    storage: config.storage || {
      getItem: (name: string) => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem(name)
        }
        return null
      },
      setItem: (name: string, value: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(name, value)
        }
      },
      removeItem: (name: string) => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(name)
        }
      }
    }
  }
}

export function createSessionPersistConfig(config: PersistConfig): PersistConfig {
  return {
    ...config,
    name: `session_${config.name}`,
    storage: {
      getItem: (name: string) => {
        if (typeof window !== 'undefined') {
          return sessionStorage.getItem(name)
        }
        return null
      },
      setItem: (name: string, value: string) => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(name, value)
        }
      },
      removeItem: (name: string) => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(name)
        }
      }
    }
  }
}