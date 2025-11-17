/**
 * Error Handling Middleware for Zustand Stores
 * Provides retry logic, error handling, and logging
 */

import type { StateCreator } from 'zustand'

interface ErrorHandlingOptions {
  retryAttempts?: number
  retryDelay?: number
  logErrors?: boolean
  onError?: (error: Error, storeName: string) => void
}

export function createRetryHandler(options: {
  retryAttempts?: number
  retryDelay?: number
  onError?: (error: Error, storeName: string) => void
}) {
  const {
    retryAttempts = 3,
    retryDelay = 1000,
    onError
  } = options

  return async function <T>(
    operation: () => Promise<T>,
    operationName: string,
    storeName: string
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (onError) {
          onError(lastError, storeName)
        }

        if (attempt === retryAttempts) {
          console.error(`[${storeName}] ${operationName} failed after ${retryAttempts} attempts:`, lastError)
          throw lastError
        }

        console.warn(`[${storeName}] ${operationName} failed (attempt ${attempt}/${retryAttempts}), retrying in ${retryDelay}ms`)
        
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }

    throw lastError!
  }
}

export function withErrorHandling<T extends object>(
  storeName: string,
  storeCreator: StateCreator<T>,
  options: ErrorHandlingOptions = {}
): StateCreator<T> {
  const {
    retryAttempts = 3,
    retryDelay = 1000,
    logErrors = true
  } = options

  const retryHandler = createRetryHandler({
    retryAttempts,
    retryDelay,
    onError: (error, operation) => {
      if (logErrors) {
        console.error(`[${storeName}] Error in ${operation}:`, error)
      }
    }
  })

  return (set, get, api) => {
    const originalStore = storeCreator(set, get, api)

    return new Proxy(originalStore, {
      get(target, prop) {
        const value = target[prop as keyof T]

        if (typeof value === 'function') {
          return async (...args: any[]) => {
            try {
              return await (value as any).apply(target, args)
            } catch (error) {
              if (logErrors) {
                console.error(`[${storeName}] Error calling ${String(prop)}:`, error)
              }
              throw error
            }
          }
        }

        return value
      }
    })
  }
}