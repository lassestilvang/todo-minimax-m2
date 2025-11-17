/**
 * Zustand Store Index and Exports
 * Centralized exports for all stores, hooks, middleware, and utilities
 */

// =================== STORE INSTANCES ===================

export { useTaskStore, createTaskStore } from './task-store';
export { useListStore, createListStore } from './list-store';
export { useAppStore, createAppStore } from './app-store';
export { useFormStore, createFormStore } from './form-store';
export { useNotificationStore, createNotificationStore } from './notification-store';
export { useModalStore, createModalStore } from './modal-store';

// =================== CUSTOM HOOKS ===================

export {
  // Task hooks
  useTasks,
  useTasksList,
  useTaskDetails,
  useTaskFilters,
  useTaskSelection,
  useTaskBatch,
  
  // List hooks
  useLists,
  
  // App hooks
  useApp,
  
  // Form hooks
  useForms,
  
  // Notification hooks
  useNotifications,
  
  // Modal hooks
  useModals,
  
  // Composed hooks
  useTaskWithList,
  useCurrentUserTasks,
  useFormValidation
} from './hooks';

// =================== MIDDLEWARE ===================

export {
  withErrorHandling,
  createRetryHandler,
  createErrorRecovery
} from './middleware/error-handler';

export {
  withPersistence,
  withSelectivePersistence,
  withConditionalPersistence,
  createPersistConfig,
  localStorage,
  sessionStorage,
  inMemoryStorage
} from './middleware/persistence';

// =================== SELECTORS ===================

export {
  createTaskSelectors
} from './task-selectors';

// =================== UTILITY FUNCTIONS ===================

/**
 * Create a store manager for unified store operations
 */
export class StoreManager {
  private stores: Map<string, any> = new Map();

  registerStore<T>(name: string, store: T) {
    this.stores.set(name, store);
    return this;
  }

  getStore<T>(name: string): T | undefined {
    return this.stores.get(name);
  }

  async rehydrateAll() {
    const promises = Array.from(this.stores.values()).map(store => {
      if (store.rehydrate) {
        return store.rehydrate();
      }
    });
    await Promise.all(promises);
  }

  clearAllPersistedData() {
    this.stores.forEach(store => {
      if (store.clearPersistedData) {
        store.clearPersistedData();
      }
    });
  }
}

/**
 * Global store manager instance
 */
export const storeManager = new StoreManager();

/**
 * Initialize all stores with default configuration
 */
export const initializeStores = (config?: {
  userId?: string;
  enableDevtools?: boolean;
  enablePersistence?: boolean;
  enableErrorHandling?: boolean;
}) => {
  const {
    userId = 'default',
    enableDevtools = process.env.NODE_ENV === 'development',
    enablePersistence = true,
    enableErrorHandling = true
  } = config || {};

  // Create stores
  const taskStore = createTaskStore({
    userId,
    errorHandling: enableErrorHandling,
    persistence: enablePersistence,
    devtools: enableDevtools
  });

  const listStore = createListStore({
    userId,
    errorHandling: enableErrorHandling,
    persistence: enablePersistence,
    devtools: enableDevtools
  });

  const appStore = createAppStore({
    errorHandling: enableErrorHandling,
    persistence: enablePersistence,
    devtools: enableDevtools
  });

  const formStore = createFormStore({
    errorHandling: enableErrorHandling,
    persistence: enablePersistence,
    devtools: enableDevtools
  });

  const notificationStore = createNotificationStore({
    errorHandling: enableErrorHandling,
    persistence: enablePersistence,
    devtools: enableDevtools
  });

  const modalStore = createModalStore({
    errorHandling: enableErrorHandling,
    persistence: enablePersistence,
    devtools: enableDevtools
  });

  // Register stores
  storeManager
    .registerStore('task', taskStore)
    .registerStore('list', listStore)
    .registerStore('app', appStore)
    .registerStore('form', formStore)
    .registerStore('notification', notificationStore)
    .registerStore('modal', modalStore);

  return {
    taskStore,
    listStore,
    appStore,
    formStore,
    notificationStore,
    modalStore
  };
};

/**
 * Reset all stores to initial state
 */
export const resetAllStores = () => {
  storeManager.stores.forEach(store => {
    if (store.clearAll) {
      store.clearAll();
    }
  });
};

/**
 * Get store statistics
 */
export const getStoreStats = () => {
  const stats: Record<string, any> = {};
  
  storeManager.stores.forEach((store, name) => {
    if (name === 'task' && store.getTaskCount) {
      stats[name] = {
        taskCount: store.getTaskCount(),
        completedTaskCount: store.getCompletedTaskCount(),
        overdueTaskCount: store.getOverdueTaskCount(),
        selectedCount: store.getSelectedTaskIds().length
      };
    } else if (name === 'list' && store.getListCount) {
      stats[name] = {
        listCount: store.getListCount(),
        favoriteCount: store.getFavoriteCount(),
        recentCount: store.getRecentCount()
      };
    } else if (name === 'app') {
      stats[name] = {
        isAuthenticated: store.isAuthenticated,
        currentView: store.currentView,
        theme: store.theme,
        loading: store.loading
      };
    } else if (name === 'notification') {
      stats[name] = {
        total: store.notifications.length,
        unread: store.unreadCount,
        visible: store.getVisibleNotifications().length
      };
    } else if (name === 'modal') {
      stats[name] = {
        total: store.modals.length,
        open: store.getModalCount(),
        stackDepth: store.modalStack.length,
        isAnyOpen: store.isAnyModalOpen
      };
    }
  });

  return stats;
};

/**
 * Clean up resources
 */
export const cleanupStores = () => {
  storeManager.stores.forEach(store => {
    // Clear any pending operations
    if (store.clearPendingSaves) {
      store.clearPendingSaves();
    }
    
    // Clear timeouts
    if (store.cancelBatchOperations) {
      const activeOperations = store.getActiveBatchOperations();
      activeOperations.forEach(id => {
        store.cancelBatchOperation(id);
      });
    }
  });
  
  storeManager.stores.clear();
};

/**
 * Store provider component for React applications
 */
import React, { createContext, useContext, useEffect } from 'react';
import { initializeStores, cleanupStores } from './index';

interface StoreContextValue {
  taskStore: any;
  listStore: any;
  appStore: any;
  formStore: any;
  notificationStore: any;
  modalStore: any;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{
  children: React.ReactNode;
  config?: Parameters<typeof initializeStores>[0];
}> = ({ children, config }) => {
  const stores = initializeStores(config);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cleanupStores();
    };
  }, []);

  return (
    <StoreContext.Provider value={stores}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStoreContext = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
};

/**
 * Debug utilities for development
 */
export const debugStores = {
  // Log current state of all stores
  logState: () => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Debug utilities are only available in development mode');
      return;
    }
    
    console.group('🔍 Store Debug State');
    const stats = getStoreStats();
    console.log('Statistics:', stats);
    console.log('Manager:', storeManager);
    console.groupEnd();
  },

  // Export store state for debugging
  exportState: () => {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }
    
    const state: Record<string, any> = {};
    storeManager.stores.forEach((store, name) => {
      try {
        state[name] = store.getState ? store.getState() : {};
      } catch (error) {
        state[name] = { error: error.message };
      }
    });
    
    return state;
  },

  // Reset specific store
  resetStore: (name: string) => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    
    const store = storeManager.getStore(name);
    if (store && store.clearAll) {
      store.clearAll();
      console.log(`✅ Reset store: ${name}`);
    } else {
      console.warn(`❌ Store not found or no clearAll method: ${name}`);
    }
  }
};

// =================== TYPE EXPORTS ===================

// Re-export all types for convenience
export type {
  AppStore,
  TaskStore,
  ListStore,
  LabelStore,
  FormStore,
  NotificationStore,
  ModalStore,
  AppState,
  TaskStoreState,
  ListStoreState,
  LabelStoreState,
  FormStoreState,
  NotificationState,
  ModalState,
  AppActions,
  TaskStoreActions,
  ListStoreActions,
  LabelStoreActions,
  FormStoreActions,
  NotificationStoreActions,
  ModalStoreActions,
  TaskStoreSelectors,
  ListStoreSelectors,
  LabelStoreSelectors,
  FormStoreSelectors,
  NotificationStoreSelectors,
  ModalStoreSelectors
} from './types/store';

// =================== DEFAULT EXPORTS ===================

// Default initialized stores for easy access
export const stores = initializeStores();

export default {
  // Stores
  taskStore: stores.taskStore,
  listStore: stores.listStore,
  appStore: stores.appStore,
  formStore: stores.formStore,
  notificationStore: stores.notificationStore,
  modalStore: stores.modalStore,
  
  // Hooks
  useTasks,
  useLists,
  useApp,
  useForms,
  useNotifications,
  useModals,
  
  // Utilities
  initializeStores,
  resetAllStores,
  getStoreStats,
  cleanupStores,
  storeManager,
  StoreProvider,
  useStoreContext,
  debugStores,
  
  // Middleware
  withErrorHandling,
  withPersistence,
  createPersistConfig,
  localStorage,
  sessionStorage,
  inMemoryStorage
};