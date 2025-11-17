/**
 * Error Handling Middleware for Zustand Stores
 * Provides comprehensive error handling, logging, and recovery mechanisms
 */

import { StateCreator } from 'zustand';
import type { ApiError } from '../../types/utils';

export interface ErrorHandlingConfig {
  retryAttempts?: number;
  retryDelay?: number;
  showToast?: boolean;
  logErrors?: boolean;
  onError?: (error: ApiError, storeName: string) => void;
}

/**
 * Create error handling middleware
 */
export function withErrorHandling<T extends Record<string, any>>(
  storeName: string,
  config: StateCreator<T>,
  errorConfig: ErrorHandlingConfig = {}
): StateCreator<T> {
  const {
    retryAttempts = 3,
    retryDelay = 1000,
    showToast = true,
    logErrors = true,
    onError
  } = errorConfig;

  return (set, get, api) => {
    const store = config(set, get, api);

    // Enhanced set function with error handling
    const originalSet = set;
    const enhancedSet = ((update: any, replace?: boolean, action?: string) => {
      try {
        originalSet(update, replace, action);
      } catch (error) {
        const apiError: ApiError = {
          code: 'SET_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update store',
          details: error instanceof Error ? error.stack : undefined,
          timestamp: new Date(),
          store: storeName,
          action
        };

        if (logErrors) {
          console.error(`[${storeName}] Store set error:`, apiError);
        }

        if (onError) {
          onError(apiError, storeName);
        }

        // Re-throw to maintain error propagation
        throw error;
      }
    }) as typeof set;

    // Wrap all store methods to handle async errors
    const wrappedStore = new Proxy(store, {
      get(target, prop) {
        const value = target[prop];
        
        if (typeof value === 'function') {
          return async (...args: any[]) => {
            try {
              // Add retry logic for async operations
              let lastError: Error | null = null;
              
              for (let attempt = 0; attempt <= retryAttempts; attempt++) {
                try {
                  const result = await value.apply(target, args);
                  return result;
                } catch (error) {
                  lastError = error instanceof Error ? error : new Error(String(error));
                  
                  if (attempt < retryAttempts) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
                    continue;
                  }
                  
                  // All retries failed
                  const apiError: ApiError = {
                    code: 'OPERATION_ERROR',
                    message: lastError.message,
                    details: lastError.stack,
                    timestamp: new Date(),
                    store: storeName,
                    action: String(prop),
                    attempt: attempt + 1
                  };

                  if (logErrors) {
                    console.error(`[${storeName}] Operation failed after ${attempt + 1} attempts:`, apiError);
                  }

                  if (onError) {
                    onError(apiError, storeName);
                  }

                  throw apiError;
                }
              }
            } catch (error) {
              const apiError: ApiError = {
                code: 'UNHANDLED_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                details: error instanceof Error ? error.stack : undefined,
                timestamp: new Date(),
                store: storeName,
                action: String(prop)
              };

              if (logErrors) {
                console.error(`[${storeName}] Unhandled error in ${String(prop)}:`, apiError);
              }

              if (onError) {
                onError(apiError, storeName);
              }

              throw apiError;
            }
          };
        }
        
        return value;
      }
    });

    return wrappedStore as T;
  };
}

/**
 * Create retry helper function
 */
export function createRetryHandler(config: ErrorHandlingConfig = {}) {
  const {
    retryAttempts = 3,
    retryDelay = 1000,
    onError
  } = config;

  return async function<T>(
    operation: () => Promise<T>,
    operationName: string,
    storeName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }

        const apiError: ApiError = {
          code: 'RETRY_EXHAUSTED',
          message: `Operation '${operationName}' failed after ${attempt + 1} attempts`,
          details: lastError.stack,
          timestamp: new Date(),
          store: storeName,
          action: operationName,
          attempt: attempt + 1
        };

        if (onError) {
          onError(apiError, storeName);
        }

        throw apiError;
      }
    }

    throw lastError;
  };
}

/**
 * Create error recovery helper
 */
export function createErrorRecovery(storeName: string, onError?: (error: ApiError, storeName: string) => void) {
  return {
    handleError: (error: unknown, context: string, action?: string) => {
      const apiError: ApiError = {
        code: 'RECOVERY_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        store: storeName,
        action: action || context,
        context
      };

      if (onError) {
        onError(apiError, storeName);
      }

      return apiError;
    },

    createFallback: <T>(fallbackValue: T, error: unknown) => {
      console.warn(`[${storeName}] Using fallback value due to error:`, error);
      return fallbackValue;
    },

    logAndContinue: (error: unknown, message: string) => {
      console.warn(`[${storeName}] ${message}:`, error);
      // Continue execution without throwing
    }
  };
}