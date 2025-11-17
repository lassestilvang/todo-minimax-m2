/**
 * ListStore - Zustand store for comprehensive list management
 * Handles list CRUD operations, filtering, sorting, batch operations, and navigation
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { 
  ListStore as IListStore,
  ListStoreState,
  ListStoreActions,
  ListStoreSelectors 
} from '../types/store';
import type { 
  AppList, 
  ListWithTaskCount,
  ListQueryParams,
  CreateListData,
  UpdateListData,
  ListBatchResult,
  ListGlobalView 
} from '../../types/lists';
import type { 
  ListId, 
  ApiError 
} from '../../types/utils';
import { withErrorHandling, createRetryHandler } from '../middleware/error-handling';
import { createPersistConfig } from '../middleware/persistence';
import { dbAPI } from '../../lib/db/api';

/**
 * Create ListStore with comprehensive functionality
 */
export const createListStore = (config?: {
  userId?: string;
  errorHandling?: boolean;
  persistence?: boolean;
  devtools?: boolean;
}) => {
  const {
    userId = 'default',
    errorHandling = true,
    persistence = true,
    devtools = process.env.NODE_ENV === 'development'
  } = config || {};

  const retryHandler = createRetryHandler({
    retryAttempts: 3,
    retryDelay: 1000,
    onError: (error, storeName) => {
      console.error(`[${storeName}] Error:`, error);
    }
  });

  // Initial state
  const initialState: ListStoreState = {
    // Core list data
    lists: [],
    currentList: null,
    selectedListIds: [],
    
    // Loading and error states
    loading: {
      lists: false,
      creating: false,
      updating: false,
      deleting: false,
      batch: false
    },
    error: null,
    
    // Cache and optimization
    lastFetched: null,
    isInitialized: false,
    cache: {},
    
    // List management
    favoriteLists: [],
    recentLists: [],
    currentView: 'grid' as ListGlobalView
  };

  // Build store configuration
  let storeConfig = (set: any, get: any, api: any): ListStoreState & ListStoreActions => {
    const state = initialState;

    return {
      ...state,

      // =================== DATA LOADING ===================
      loadLists: async (params?: ListQueryParams) => {
        set((state: ListStoreState) => {
          state.loading.lists = true;
          state.error = null;
        }, false, 'loadLists');

        try {
          const result = await retryHandler(async () => {
            return await dbAPI.getUserListsWithCounts(userId);
          }, 'loadLists', 'ListStore');

          set((state: ListStoreState) => {
            state.lists = result;
            state.cache = result.reduce((acc, list) => {
              acc[list.id] = list;
              return acc;
            }, {} as Record<ListId, AppList>);
            state.lastFetched = new Date();
            state.isInitialized = true;
            state.loading.lists = false;
          }, false, 'loadLists_success');

        } catch (error) {
          set((state: ListStoreState) => {
            state.error = error as ApiError;
            state.loading.lists = false;
          }, false, 'loadLists_error');
          throw error;
        }
      },

      loadListById: async (listId: ListId): Promise<AppList | null> => {
        const cached = get().cache[listId];
        if (cached) {
          // Update recent access
          get().addToRecent(listId);
          return cached;
        }

        try {
          const list = await retryHandler(async () => {
            return await dbAPI.getList(listId);
          }, 'loadListById', 'ListStore');

          if (list) {
            const appList: AppList = {
              ...list,
              isDefault: list.isDefault || false,
              userId: list.userId || userId
            };

            set((state: ListStoreState) => {
              state.cache[listId] = appList;
              state.lists = state.lists.some(l => l.id === listId) 
                ? state.lists.map(l => l.id === listId ? appList : l)
                : [...state.lists, appList];
            }, false, 'loadListById_success');

            // Update recent access
            get().addToRecent(listId);
          }

          return list;
        } catch (error) {
          set((state: ListStoreState) => {
            state.error = error as ApiError;
          }, false, 'loadListById_error');
          throw error;
        }
      },

      refreshLists: async () => {
        await get().loadLists();
      },

      // =================== CRUD OPERATIONS ===================
      createList: async (data: CreateListData): Promise<AppList> => {
        const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Optimistic update
        const optimisticList: AppList = {
          id: optimisticId,
          ...data,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId,
          taskCount: 0,
          completedTaskCount: 0
        };

        set((state: ListStoreState) => {
          state.lists.unshift(optimisticList);
          state.cache[optimisticId] = optimisticList;
          state.loading.creating = true;
        }, false, 'createList_optimistic');

        try {
          const realList = await retryHandler(async () => {
            return await dbAPI.createList({
              ...data,
              userId
            });
          }, 'createList', 'ListStore');

          const appList: AppList = {
            ...realList,
            isDefault: realList.isDefault || false,
            taskCount: 0,
            completedTaskCount: 0
          };

          // Replace optimistic update with real data
          set((state: ListStoreState) => {
            const index = state.lists.findIndex(l => l.id === optimisticId);
            if (index !== -1) {
              state.lists[index] = appList;
            }
            state.cache[optimisticId] = appList;
            state.cache[realList.id] = appList;
            state.loading.creating = false;

            // Add to action history for potential undo
            state.actionHistory = state.actionHistory.slice(0, state.historyIndex + 1);
            state.actionHistory.push({
              id: `action_${Date.now()}`,
              type: 'create',
              entityType: 'list',
              data: appList,
              timestamp: new Date(),
              canUndo: true,
              canRedo: false
            });
            state.historyIndex = state.actionHistory.length - 1;
          }, false, 'createList_success');

          return appList;

        } catch (error) {
          // Rollback optimistic update
          set((state: ListStoreState) => {
            state.lists = state.lists.filter(l => l.id !== optimisticId);
            delete state.cache[optimisticId];
            state.loading.creating = false;
            state.error = error as ApiError;
          }, false, 'createList_rollback');

          throw error;
        }
      },

      updateList: async (updates: UpdateListData): Promise<AppList> => {
        if (!updates.id) {
          throw new Error('List ID is required for updates');
        }

        const listId = updates.id;
        const originalList = get().cache[listId];
        if (!originalList) {
          throw new Error(`List with ID ${listId} not found`);
        }

        // Optimistic update
        const updatedList: AppList = {
          ...originalList,
          ...updates,
          updatedAt: new Date()
        };

        set((state: ListStoreState) => {
          const index = state.lists.findIndex(l => l.id === listId);
          if (index !== -1) {
            state.lists[index] = updatedList;
          }
          state.cache[listId] = updatedList;
          state.loading.updating = true;
        }, false, 'updateList_optimistic');

        try {
          const realList = await retryHandler(async () => {
            return await dbAPI.updateList(listId, updates, userId);
          }, 'updateList', 'ListStore');

          const appList: AppList = {
            ...realList,
            isDefault: realList.isDefault || false,
            taskCount: originalList.taskCount,
            completedTaskCount: originalList.completedTaskCount
          };

          // Replace with real data
          set((state: ListStoreState) => {
            const index = state.lists.findIndex(l => l.id === listId);
            if (index !== -1) {
              state.lists[index] = appList;
            }
            state.cache[listId] = appList;
            state.loading.updating = false;

            // Add to action history
            state.actionHistory = state.actionHistory.slice(0, state.historyIndex + 1);
            state.actionHistory.push({
              id: `action_${Date.now()}`,
              type: 'update',
              entityType: 'list',
              data: { id: listId, changes: updates, originalData: originalList },
              timestamp: new Date(),
              canUndo: true,
              canRedo: false
            });
            state.historyIndex = state.actionHistory.length - 1;
          }, false, 'updateList_success');

          return appList;

        } catch (error) {
          // Rollback optimistic update
          set((state: ListStoreState) => {
            const index = state.lists.findIndex(l => l.id === listId);
            if (index !== -1) {
              state.lists[index] = originalList;
            }
            state.cache[listId] = originalList;
            state.loading.updating = false;
            state.error = error as ApiError;
          }, false, 'updateList_rollback');

          throw error;
        }
      },

      deleteList: async (listId: ListId): Promise<void> => {
        const originalList = get().cache[listId];
        if (!originalList) {
          throw new Error(`List with ID ${listId} not found`);
        }

        // Prevent deletion of default lists
        if (originalList.isDefault) {
          throw new Error('Cannot delete default list');
        }

        // Optimistic update - remove list
        set((state: ListStoreState) => {
          state.lists = state.lists.filter(l => l.id !== listId);
          delete state.cache[listId];
          state.selectedListIds = state.selectedListIds.filter(id => id !== listId);
          state.favoriteLists = state.favoriteLists.filter(id => id !== listId);
          state.recentLists = state.recentLists.filter(entry => entry.listId !== listId);
          
          // If this was the current list, clear it
          if (state.currentList?.id === listId) {
            state.currentList = null;
          }
        }, false, 'deleteList_optimistic');

        try {
          await retryHandler(async () => {
            return await dbAPI.deleteList(listId, userId);
          }, 'deleteList', 'ListStore');

          // Complete deletion
          set((state: ListStoreState) => {
            // Add to action history
            state.actionHistory = state.actionHistory.slice(0, state.historyIndex + 1);
            state.actionHistory.push({
              id: `action_${Date.now()}`,
              type: 'delete',
              entityType: 'list',
              data: originalList,
              timestamp: new Date(),
              canUndo: true,
              canRedo: false
            });
            state.historyIndex = state.actionHistory.length - 1;
          }, false, 'deleteList_success');

        } catch (error) {
          // Rollback optimistic update
          set((state: ListStoreState) => {
            state.lists.push(originalList);
            state.cache[listId] = originalList;
            state.error = error as ApiError;
          }, false, 'deleteList_rollback');

          throw error;
        }
      },

      duplicateList: async (listId: ListId): Promise<AppList> => {
        const originalList = get().cache[listId];
        if (!originalList) {
          throw new Error(`List with ID ${listId} not found`);
        }

        const duplicateData: CreateListData = {
          name: `${originalList.name} (Copy)`,
          color: originalList.color,
          emoji: originalList.emoji,
          isDefault: false
        };

        return await get().createList(duplicateData);
      },

      // =================== SELECTION ===================
      selectList: (listId: ListId) => {
        set((state: ListStoreState) => {
          if (!state.selectedListIds.includes(listId)) {
            state.selectedListIds.push(listId);
          }
        }, false, 'selectList');
      },

      selectMultipleLists: (listIds: ListId[]) => {
        set((state: ListStoreState) => {
          state.selectedListIds = [...new Set([...state.selectedListIds, ...listIds])];
        }, false, 'selectMultipleLists');
      },

      deselectList: (listId: ListId) => {
        set((state: ListStoreState) => {
          state.selectedListIds = state.selectedListIds.filter(id => id !== listId);
        }, false, 'deselectList');
      },

      clearSelection: () => {
        set((state: ListStoreState) => {
          state.selectedListIds = [];
        }, false, 'clearSelection');
      },

      // =================== CURRENT LIST NAVIGATION ===================
      setCurrentList: (list: AppList | null) => {
        set((state: ListStoreState) => {
          state.currentList = list;
          if (list) {
            get().addToRecent(list.id);
          }
        }, false, 'setCurrentList');
      },

      switchList: (listId: ListId) => {
        const list = get().cache[listId];
        if (list) {
          get().setCurrentList(list);
        } else {
          // Load list if not cached
          get().loadListById(listId).then(loadedList => {
            if (loadedList) {
              get().setCurrentList(loadedList);
            }
          });
        }
      },

      goBack: () => {
        const state = get();
        const navigationHistory = state.navigationHistory || [];
        const currentIndex = state.navigationIndex || -1;
        
        if (currentIndex > 0) {
          const previousListId = navigationHistory[currentIndex - 1];
          const previousList = state.cache[previousListId];
          if (previousList) {
            set((state: ListStoreState) => {
              state.currentList = previousList;
              state.navigationIndex = currentIndex - 1;
            }, false, 'goBack');
          }
        }
      },

      goForward: () => {
        const state = get();
        const navigationHistory = state.navigationHistory || [];
        const currentIndex = state.navigationIndex || -1;
        
        if (currentIndex < navigationHistory.length - 1) {
          const nextListId = navigationHistory[currentIndex + 1];
          const nextList = state.cache[nextListId];
          if (nextList) {
            set((state: ListStoreState) => {
              state.currentList = nextList;
              state.navigationIndex = currentIndex + 1;
            }, false, 'goForward');
          }
        }
      },

      // =================== FAVORITES MANAGEMENT ===================
      addToFavorites: (listId: ListId) => {
        set((state: ListStoreState) => {
          if (!state.favoriteLists.includes(listId)) {
            state.favoriteLists.push(listId);
          }
        }, false, 'addToFavorites');
      },

      removeFromFavorites: (listId: ListId) => {
        set((state: ListStoreState) => {
          state.favoriteLists = state.favoriteLists.filter(id => id !== listId);
        }, false, 'removeFromFavorites');
      },

      toggleFavorite: (listId: ListId) => {
        const state = get();
        if (state.favoriteLists.includes(listId)) {
          get().removeFromFavorites(listId);
        } else {
          get().addToFavorites(listId);
        }
      },

      // =================== RECENT ACCESS MANAGEMENT ===================
      addToRecent: (listId: ListId) => {
        const now = new Date();
        set((state: ListStoreState) => {
          // Remove if already exists
          state.recentLists = state.recentLists.filter(entry => entry.listId !== listId);
          
          // Add to beginning
          state.recentLists.unshift({ listId, accessedAt: now });
          
          // Keep only last 10 recent items
          state.recentLists = state.recentLists.slice(0, 10);
        }, false, 'addToRecent');
      },

      clearRecent: () => {
        set((state: ListStoreState) => {
          state.recentLists = [];
        }, false, 'clearRecent');
      },

      // =================== SEARCH AND FILTERING ===================
      setSearchQuery: (query: string) => {
        set((state: ListStoreState) => {
          state.searchQuery = query;
        }, false, 'setSearchQuery');
      },

      setGlobalView: (view: ListGlobalView) => {
        set((state: ListStoreState) => {
          state.currentView = view;
        }, false, 'setGlobalView');
      },

      toggleSidebar: () => {
        set((state: ListStoreState) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        }, false, 'toggleSidebar');
      },

      resizeSidebar: (width: number) => {
        set((state: ListStoreState) => {
          state.sidebarWidth = Math.max(200, Math.min(500, width));
        }, false, 'resizeSidebar');
      },

      // =================== STATE MANAGEMENT ===================
      updateListInCache: (list: AppList) => {
        set((state: ListStoreState) => {
          state.cache[list.id] = list;
          const index = state.lists.findIndex(l => l.id === list.id);
          if (index !== -1) {
            state.lists[index] = list;
          }
        }, false, 'updateListInCache');
      },

      removeListFromCache: (listId: ListId) => {
        set((state: ListStoreState) => {
          delete state.cache[listId];
          state.lists = state.lists.filter(l => l.id !== listId);
        }, false, 'removeListFromCache');
      },

      clearCache: () => {
        set((state: ListStoreState) => {
          state.cache = {};
          state.lists = [];
        }, false, 'clearCache');
      },

      // =================== UNDO/REDO FUNCTIONALITY ===================
      undo: () => {
        const state = get();
        const currentAction = state.actionHistory[state.historyIndex];
        
        if (currentAction && currentAction.canUndo) {
          // Implement undo logic based on action type
          switch (currentAction.type) {
            case 'create':
              // Restore deleted list
              if (currentAction.data) {
                get().deleteList(currentAction.data.id);
              }
              break;
            case 'delete':
              // Restore deleted list
              if (currentAction.data) {
                get().createList({
                  name: currentAction.data.name,
                  color: currentAction.data.color,
                  emoji: currentAction.data.emoji,
                  isDefault: currentAction.data.isDefault
                });
              }
              break;
            case 'update':
              // Revert changes
              if (currentAction.data?.originalData) {
                get().updateList(currentAction.data.originalData);
              }
              break;
          }
          
          set((state: ListStoreState) => {
            if (state.historyIndex > 0) {
              state.historyIndex--;
            }
            // Update undo/redo flags
            state.actionHistory = state.actionHistory.map((action, index) => ({
              ...action,
              canUndo: index < state.historyIndex,
              canRedo: index >= state.historyIndex
            }));
          }, false, 'undo');
        }
      },

      redo: () => {
        const state = get();
        const nextAction = state.actionHistory[state.historyIndex + 1];
        
        if (nextAction && nextAction.canRedo) {
          // Implement redo logic based on action type
          switch (nextAction.type) {
            case 'create':
              // Re-create the list
              if (nextAction.data) {
                get().createList({
                  name: nextAction.data.name,
                  color: nextAction.data.color,
                  emoji: nextAction.data.emoji,
                  isDefault: nextAction.data.isDefault
                });
              }
              break;
            case 'delete':
              // Re-delete the list
              if (nextAction.data) {
                get().deleteList(nextAction.data.id);
              }
              break;
            case 'update':
              // Re-apply changes
              if (nextAction.data?.changes) {
                get().updateList(nextAction.data.changes);
              }
              break;
          }
          
          set((state: ListStoreState) => {
            if (state.historyIndex < state.actionHistory.length - 1) {
              state.historyIndex++;
            }
            // Update undo/redo flags
            state.actionHistory = state.actionHistory.map((action, index) => ({
              ...action,
              canUndo: index <= state.historyIndex,
              canRedo: index > state.historyIndex
            }));
          }, false, 'redo');
        }
      },

      clearHistory: () => {
        set((state: ListStoreState) => {
          state.actionHistory = [];
          state.historyIndex = -1;
        }, false, 'clearHistory');
      }
    };
  };

  // Apply middleware
  if (errorHandling) {
    storeConfig = withErrorHandling('ListStore', storeConfig, {
      retryAttempts: 3,
      logErrors: true
    });
  }

  let middleware = [subscribeWithSelector(), immer];

  if (persistence) {
    middleware.push(persist(
      storeConfig,
      createPersistConfig({
        name: 'list-store',
        partialize: (state) => ({
          // Only persist essential state
          currentView: state.currentView,
          selectedListIds: state.selectedListIds,
          currentList: state.currentList,
          favoriteLists: state.favoriteLists,
          recentLists: state.recentLists,
          sidebarCollapsed: state.sidebarCollapsed,
          sidebarWidth: state.sidebarWidth
        }),
        version: 1
      })
    ));
  } else {
    storeConfig = storeConfig as StateCreator<ListStoreState & ListStoreActions>;
  }

  return create<ListStoreState & ListStoreActions>()(...middleware)(storeConfig);
};

// Export the store instance
export const useListStore = createListStore();