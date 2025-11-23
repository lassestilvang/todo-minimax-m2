/**
 * ListStore - Simplified Zustand store for list management
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  ListStoreState,
  ListStoreActions,
  ListStoreSelectors
} from '../types/store';
import type { 
  AppList, 
  CreateListData,
  UpdateListData,
  ListBatchResult
} from '../../types/lists';
import type { 
  ListId,
  ApiError 
} from '../../types/utils';

/**
 * Create a simple list store
 */
export const createListStore = (config?: {
  userId?: string;
}) => {
  const {
    userId = 'default'
  } = config || {};

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
    
    // Batch operations
    batchOperations: {},
    
    // Favorites and recent lists
    favorites: [],
    recent: [],
    
    // Filters and view
    filters: {
      search: '',
      sortBy: 'name',
      sortOrder: 'asc'
    },
    view: {
      type: 'grid' as const,
      compactMode: false
    }
  };

  return create<ListStoreState & ListStoreActions & ListStoreSelectors>(
    immer((set, get) => ({
    ...initialState,

    // =================== DATA LOADING ===================
    loadLists: async () => {
      set((state) => {
        state.loading.lists = true;
        state.error = null;
      });

      try {
        // TODO: Implement actual database calls
        // For now, just set empty state
        set((state) => {
          state.lists = [];
          state.cache = {};
          state.lastFetched = new Date();
          state.isInitialized = true;
          state.loading.lists = false;
        });

      } catch (error) {
        set((state) => {
          state.error = error as ApiError;
          state.loading.lists = false;
        });
        throw error;
      }
    },

    loadListById: async (listId: ListId): Promise<AppList | null> => {
      const cached = get().cache[listId];
      if (cached) {
        return cached;
      }
      return null;
    },

    refreshLists: async () => {
      await get().loadLists();
    },

    // =================== CRUD OPERATIONS ===================
    createList: async (data: CreateListData): Promise<AppList> => {
      try {
        const newList: AppList = {
          id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...data,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          taskCount: 0
        };

        set((state) => {
          state.lists.unshift(newList);
          state.cache[newList.id] = newList;
        });

        return newList;

      } catch (error) {
        set((state) => {
          state.error = error as ApiError;
        });
        throw error;
      }
    },

    updateList: async (updates: UpdateListData): Promise<AppList> => {
      if (!updates.id) {
        throw new Error('List ID is required for updates');
      }

      const listId = updates.id;
      const existingList = get().cache[listId];
      if (!existingList) {
        throw new Error(`List with ID ${listId} not found`);
      }

      const updatedList: AppList = {
        ...existingList,
        ...updates,
        updatedAt: new Date()
      };

      set((state) => {
        const index = state.lists.findIndex(l => l.id === listId);
        if (index !== -1) {
          state.lists[index] = updatedList;
        }
        state.cache[listId] = updatedList;
      });

      return updatedList;
    },

    deleteList: async (listId: ListId): Promise<void> => {
      const existingList = get().cache[listId];
      if (!existingList) {
        throw new Error(`List with ID ${listId} not found`);
      }

      set((state) => {
        state.lists = state.lists.filter(l => l.id !== listId);
        delete state.cache[listId];
        state.selectedListIds = state.selectedListIds.filter(id => id !== listId);
        state.favorites = state.favorites.filter(id => id !== listId);
        state.recent = state.recent.filter(id => id !== listId);
        if (state.currentList?.id === listId) {
          state.currentList = null;
        }
      });
    },

    duplicateList: async (listId: ListId): Promise<AppList> => {
      const originalList = get().cache[listId];
      if (!originalList) {
        throw new Error(`List with ID ${listId} not found`);
      }

      const duplicateData: CreateListData = {
        name: `${originalList.name} (Copy)`,
        description: originalList.description,
        color: originalList.color,
        icon: originalList.icon
      };

      return await get().createList(duplicateData);
    },

    // =================== LIST MANAGEMENT ===================
    getLists: () => get().lists,

    getList: (listId: ListId) => {
      return get().cache[listId] || get().lists.find(l => l.id === listId);
    },

    getListCount: () => get().lists.length,

    // =================== FAVORITES MANAGEMENT ===================
    addToFavorites: (listId: ListId) => {
      set((state) => {
        if (!state.favorites.includes(listId)) {
          state.favorites.push(listId);
        }
      });
    },

    removeFromFavorites: (listId: ListId) => {
      set((state) => {
        state.favorites = state.favorites.filter(id => id !== listId);
      });
    },

    toggleFavorite: (listId: ListId) => {
      const state = get();
      if (state.favorites.includes(listId)) {
        get().removeFromFavorites(listId);
      } else {
        get().addToFavorites(listId);
      }
    },

    getFavoriteLists: () => {
      const state = get();
      return state.lists.filter(list => state.favorites.includes(list.id));
    },

    // =================== RECENT LISTS MANAGEMENT ===================
    addToRecent: (listId: ListId) => {
      set((state) => {
        // Remove from current position if exists
        state.recent = state.recent.filter(id => id !== listId);
        // Add to front
        state.recent.unshift(listId);
        // Keep only last 10
        if (state.recent.length > 10) {
          state.recent = state.recent.slice(0, 10);
        }
      });
    },

    getRecentLists: () => {
      const state = get();
      return state.recent
        .map(id => state.lists.find(l => l.id === id))
        .filter(Boolean);
    },

    clearRecent: () => {
      set((state) => {
        state.recent = [];
      });
    },

    // =================== SELECTION ===================
    selectList: (listId: ListId) => {
      set((state) => {
        if (!state.selectedListIds.includes(listId)) {
          state.selectedListIds.push(listId);
        }
      });
    },

    selectMultipleLists: (listIds: ListId[]) => {
      set((state) => {
        state.selectedListIds = [...new Set([...state.selectedListIds, ...listIds])];
      });
    },

    deselectList: (listId: ListId) => {
      set((state) => {
        state.selectedListIds = state.selectedListIds.filter(id => id !== listId);
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selectedListIds = [];
      });
    },

    selectAll: () => {
      set((state) => {
        state.selectedListIds = state.lists.map(l => l.id);
      });
    },

    getSelectedLists: () => {
      const state = get();
      return state.lists.filter(list => state.selectedListIds.includes(list.id));
    },

    getSelectedListIds: () => [...get().selectedListIds],

    // =================== CURRENT LIST MANAGEMENT ===================
    switchList: (listId: ListId) => {
      const list = get().cache[listId] || get().lists.find(l => l.id === listId);
      if (list) {
        set((state) => {
          state.currentList = list;
        });
        // Add to recent lists
        get().addToRecent(listId);
      }
    },

    getCurrentList: () => get().currentList,

    // =================== FILTERS AND SEARCH ===================
    setSearchQuery: (query: string) => {
      set((state) => {
        state.filters.search = query;
      });
    },

    setSortBy: (sortBy: string) => {
      set((state) => {
        state.filters.sortBy = sortBy;
      });
    },

    setSortOrder: (sortOrder: 'asc' | 'desc') => {
      set((state) => {
        state.filters.sortOrder = sortOrder;
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filters = initialState.filters;
      });
    },

    // =================== VIEW CONFIGURATION ===================
    setViewType: (type: 'grid' | 'list') => {
      set((state) => {
        state.view.type = type;
      });
    },

    toggleCompactMode: () => {
      set((state) => {
        state.view.compactMode = !state.view.compactMode;
      });
    },

    // =================== STATE MANAGEMENT ===================
    setCurrentList: (list: AppList | null) => {
      set((state) => {
        state.currentList = list;
      });
    },

    updateListInCache: (list: AppList) => {
      set((state) => {
        state.cache[list.id] = list;
        const index = state.lists.findIndex(l => l.id === list.id);
        if (index !== -1) {
          state.lists[index] = list;
        }
      });
    },

    removeListFromCache: (listId: ListId) => {
      set((state) => {
        delete state.cache[listId];
        state.lists = state.lists.filter(l => l.id !== listId);
      });
    },

    clearCache: () => {
      set((state) => {
        state.cache = {};
        state.lists = [];
      });
    },

    // =================== BATCH OPERATIONS ===================
    batchUpdateLists: async (data: Partial<UpdateListData> & { listIds: ListId[] }): Promise<ListBatchResult> => {
      const { listIds, ...updates } = data;
      const results: ListBatchResult['results'] = [];

      for (const listId of listIds) {
        try {
          const updatedList = await get().updateList({ id: listId, ...updates });
          results.push({ listId, success: true, data: updatedList });
        } catch (error) {
          results.push({ listId, success: false, error: error as ApiError });
        }
      }

      const result: ListBatchResult = {
        total: listIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

      return result;
    },

    batchDeleteLists: async (listIds: ListId[]): Promise<ListBatchResult> => {
      const results: ListBatchResult['results'] = [];

      for (const listId of listIds) {
        try {
          await get().deleteList(listId);
          results.push({ listId, success: true });
        } catch (error) {
          results.push({ listId, success: false, error: error as ApiError });
        }
      }

      const result: ListBatchResult = {
        total: listIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

      return result;
    },

    // =================== BATCH OPERATION MANAGEMENT ===================
    startBatchOperation: (type, data) => {
      const operationId = `batch_${Date.now()}`;
      set((state) => {
        state.batchOperations[operationId] = {
          type,
          data,
          status: 'pending',
          progress: 0
        };
      });
      return operationId;
    },

    updateBatchOperation: (operationId, updates) => {
      set((state) => {
        if (state.batchOperations[operationId]) {
          state.batchOperations[operationId] = {
            ...state.batchOperations[operationId],
            ...updates
          };
        }
      });
    },

    completeBatchOperation: (operationId, result) => {
      set((state) => {
        if (state.batchOperations[operationId]) {
          state.batchOperations[operationId].status = 'completed';
          if (result) {
            state.batchOperations[operationId].result = result;
          }
        }
      });
    },

    cancelBatchOperation: (operationId) => {
      set((state) => {
        delete state.batchOperations[operationId];
      });
    },

    // =================== LIST ORGANIZATION ===================
    reorderLists: (listIds: ListId[]) => {
      // In a real implementation, this would update the position/order of lists
      // For mock purposes, we'll just verify the operation
      return { success: true, reordered: listIds.length };
    },

    moveList: (listId: ListId, newPosition: number) => {
      set((state) => {
        const listIndex = state.lists.findIndex(l => l.id === listId);
        if (listIndex >= 0) {
          const [list] = state.lists.splice(listIndex, 1);
          state.lists.splice(newPosition, 0, list);
          return true;
        }
        return false;
      });
      return false;
    },

    // =================== SEARCH AND FILTERING ===================
    searchLists: (query: string) => {
      const state = get();
      const lowerQuery = query.toLowerCase();
      return state.lists.filter(list =>
        list.name.toLowerCase().includes(lowerQuery) ||
        (list.description && list.description.toLowerCase().includes(lowerQuery))
      );
    },

    filterLists: (filter: 'all' | 'favorites' | 'recent') => {
      const state = get();
      switch (filter) {
        case 'favorites':
          return state.lists.filter(list => state.favorites.includes(list.id));
        case 'recent':
          return get().getRecentLists();
        default:
          return state.lists;
      }
    },

    // =================== LIST VALIDATION ===================
    validateListData: (listData: any) => {
      const errors: string[] = [];
      
      if (!listData.name || listData.name.trim() === '') {
        errors.push('List name is required');
      }
      
      if (listData.name && listData.name.length > 50) {
        errors.push('List name must be less than 50 characters');
      }
      
      if (listData.color && !/^#[0-9A-F]{6}$/i.test(listData.color)) {
        errors.push('Color must be a valid hex color code');
      }
      
      if (listData.description && listData.description.length > 200) {
        errors.push('Description must be less than 200 characters');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },

    // =================== ERROR HANDLING ===================
    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    setError: (error: ApiError) => {
      set((state) => {
        state.error = error;
      });
    },

    // =================== SELECTORS ===================
    getFilteredLists: () => {
      const state = get();
      let filteredLists = state.lists;

      // Apply search filter
      if (state.filters.search) {
        const query = state.filters.search.toLowerCase();
        filteredLists = filteredLists.filter(list => 
          list.name.toLowerCase().includes(query) ||
          (list.description && list.description.toLowerCase().includes(query))
        );
      }

      // Apply sorting
      filteredLists = filteredLists.sort((a, b) => {
        const aVal = a[state.filters.sortBy as keyof AppList] || '';
        const bVal = b[state.filters.sortBy as keyof AppList] || '';
        const comparison = aVal > bVal ? 1 : -1;
        return state.filters.sortOrder === 'desc' ? -comparison : comparison;
      });

      return filteredLists;
    },

    getListStats: () => {
      const state = get();
      const lists = state.lists;

      return {
        total: lists.length,
        favorites: state.favorites.length,
        recent: state.recent.length,
        withTasks: lists.filter(l => l.taskCount > 0).length,
        recentlyModified: lists.filter(l => {
          const dayAgo = new Date();
          dayAgo.setDate(dayAgo.getDate() - 1);
          return new Date(l.updatedAt) > dayAgo;
        }).length,
        byColor: lists.reduce((acc: Record<string, number>, list) => {
          acc[list.color] = (acc[list.color] || 0) + 1;
          return acc;
        }, {})
      };
    }
  }))
  );
};

// Export the store instance
export const useListStore = createListStore();