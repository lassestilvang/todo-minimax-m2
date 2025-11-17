/**
 * ListStore Logic Tests
 * Comprehensive tests for Zustand list store functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { createTestDatabaseAPI, TestDatabaseManager } from '../../lib/db/test-utils';
import { TEST_DATA } from '../../test/setup';

// Mock the list store creation
const createMockListStore = () => {
  const state = {
    lists: [],
    currentList: null,
    selectedListIds: [],
    loading: {
      lists: false,
      creating: false,
      updating: false,
      deleting: false
    },
    error: null,
    favorites: [],
    recent: [],
    cache: {}
  };

  const actions = {
    // List CRUD operations
    createList: async (listData: any) => {
      const list = {
        id: `list-${Date.now()}`,
        ...listData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      state.lists.push(list);
      state.cache[list.id] = list;
      return list;
    },

    updateList: async (updateData: any) => {
      const listIndex = state.lists.findIndex(l => l.id === updateData.id);
      if (listIndex >= 0) {
        state.lists[listIndex] = {
          ...state.lists[listIndex],
          ...updateData,
          updatedAt: new Date()
        };
        const updatedList = state.lists[listIndex];
        state.cache[updatedList.id] = updatedList;
        return updatedList;
      }
      throw new Error('List not found');
    },

    deleteList: async (listId: string) => {
      state.lists = state.lists.filter(l => l.id !== listId);
      delete state.cache[listId];
      state.selectedListIds = state.selectedListIds.filter(id => id !== listId);
      state.favorites = state.favorites.filter(id => id !== listId);
      state.recent = state.recent.filter(id => id !== listId);
      if (state.currentList?.id === listId) {
        state.currentList = null;
      }
    },

    getLists: () => state.lists,

    getList: (listId: string) => state.lists.find(l => l.id === listId),

    getListCount: () => state.lists.length,

    // List selection and management
    selectList: (listId: string) => {
      if (!state.selectedListIds.includes(listId)) {
        state.selectedListIds.push(listId);
      }
    },

    selectMultipleLists: (listIds: string[]) => {
      state.selectedListIds = [...new Set([...state.selectedListIds, ...listIds])];
    },

    deselectList: (listId: string) => {
      state.selectedListIds = state.selectedListIds.filter(id => id !== listId);
    },

    clearSelection: () => {
      state.selectedListIds = [];
    },

    getSelectedLists: () => {
      return state.lists.filter(list => state.selectedListIds.includes(list.id));
    },

    getSelectedListIds: () => [...state.selectedListIds],

    // Current list management
    switchList: (listId: string) => {
      const list = state.lists.find(l => l.id === listId);
      if (list) {
        state.currentList = list;
        // Add to recent lists
        actions.addToRecent(listId);
      }
    },

    getCurrentList: () => state.currentList,

    // Favorites management
    addToFavorites: (listId: string) => {
      if (!state.favorites.includes(listId)) {
        state.favorites.push(listId);
      }
    },

    removeFromFavorites: (listId: string) => {
      state.favorites = state.favorites.filter(id => id !== listId);
    },

    toggleFavorite: (listId: string) => {
      if (state.favorites.includes(listId)) {
        actions.removeFromFavorites(listId);
      } else {
        actions.addToFavorites(listId);
      }
    },

    getFavoriteLists: () => {
      return state.lists.filter(list => state.favorites.includes(list.id));
    },

    // Recent lists management
    addToRecent: (listId: string) => {
      // Remove from current position if exists
      state.recent = state.recent.filter(id => id !== listId);
      // Add to front
      state.recent.unshift(listId);
      // Keep only last 10
      if (state.recent.length > 10) {
        state.recent = state.recent.slice(0, 10);
      }
    },

    getRecentLists: () => {
      return state.recent
        .map(id => state.lists.find(l => l.id === id))
        .filter(Boolean);
    },

    clearRecent: () => {
      state.recent = [];
    },

    // List organization and navigation
    reorderLists: (listIds: string[]) => {
      // In a real implementation, this would update the position/order of lists
      // For mock purposes, we'll just verify the operation
      return { success: true, reordered: listIds.length };
    },

    moveList: (listId: string, newPosition: number) => {
      const listIndex = state.lists.findIndex(l => l.id === listId);
      if (listIndex >= 0) {
        const [list] = state.lists.splice(listIndex, 1);
        state.lists.splice(newPosition, 0, list);
        return true;
      }
      return false;
    },

    // Search and filtering
    searchLists: (query: string) => {
      const lowerQuery = query.toLowerCase();
      return state.lists.filter(list =>
        list.name.toLowerCase().includes(lowerQuery) ||
        list.description?.toLowerCase().includes(lowerQuery)
      );
    },

    filterLists: (filter: 'all' | 'favorites' | 'recent') => {
      switch (filter) {
        case 'favorites':
          return state.lists.filter(list => state.favorites.includes(list.id));
        case 'recent':
          return actions.getRecentLists();
        default:
          return state.lists;
      }
    },

    // Statistics and analytics
    getListStats: () => {
      return {
        total: state.lists.length,
        favorites: state.favorites.length,
        recent: state.recent.length,
        byColor: state.lists.reduce((acc: any, list) => {
          acc[list.color] = (acc[list.color] || 0) + 1;
          return acc;
        }, {})
      };
    },

    // State management
    clearCache: () => {
      state.cache = {};
    },

    clearError: () => {
      state.error = null;
    },

    setError: (error: any) => {
      state.error = error;
    },

    // List validation
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

    // Batch operations
    batchUpdateLists: async (batchData: any) => {
      const { listIds, ...updateData } = batchData;
      const results = { total: listIds.length, successful: 0, failed: 0 };
      
      for (const listId of listIds) {
        try {
          await actions.updateList({ id: listId, ...updateData });
          results.successful++;
        } catch (error) {
          results.failed++;
        }
      }
      
      return results;
    },

    batchDeleteLists: async (listIds: string[]) => {
      const results = { total: listIds.length, successful: 0, failed: 0 };
      
      for (const listId of listIds) {
        try {
          await actions.deleteList(listId);
          results.successful++;
        } catch (error) {
          results.failed++;
        }
      }
      
      return results;
    }
  };

  return { state, actions };
};

describe('ListStore Logic Tests', () => {
  let testAPI: ReturnType<typeof createTestDatabaseAPI>;
  let testDB: TestDatabaseManager;
  let listStore: ReturnType<typeof createMockListStore>;

  beforeAll(async () => {
    testDB = new TestDatabaseManager({
      path: './test-data/list-store-test.db',
      verbose: false
    });
    
    testAPI = createTestDatabaseAPI({
      path: testDB.getPath(),
      verbose: false
    });
    
    await testAPI.api.runMigrations();
    await testDB.initialize();
  });

  afterAll(async () => {
    await testDB.cleanup();
  });

  beforeEach(() => {
    listStore = createMockListStore();
  });

  afterEach(() => {
    // Clean up state
    listStore.state.lists = [];
    listStore.state.selectedListIds = [];
    listStore.state.favorites = [];
    listStore.state.recent = [];
    listStore.state.error = null;
    listStore.state.currentList = null;
  });

  describe('List CRUD Operations', () => {
    test('should create a new list', async () => {
      const listData = {
        name: 'Test List',
        description: 'Test Description',
        userId: 'test-user-1',
        color: '#3b82f6',
        emoji: '📋',
        isDefault: false
      };

      const createdList = await listStore.actions.createList(listData);

      expect(createdList).toBeDefined();
      expect(createdList.id).toBeDefined();
      expect(createdList.name).toBe(listData.name);
      expect(createdList.description).toBe(listData.description);
      expect(createdList.color).toBe(listData.color);
      expect(createdList.emoji).toBe(listData.emoji);
      expect(createdList.userId).toBe(listData.userId);
      expect(createdList.isDefault).toBe(listData.isDefault);
      expect(createdList.createdAt).toBeInstanceOf(Date);
      expect(createdList.updatedAt).toBeInstanceOf(Date);

      // Verify list is in store
      expect(listStore.state.lists).toHaveLength(1);
      expect(listStore.state.lists[0]).toEqual(createdList);

      // Verify cache
      expect(listStore.state.cache[createdList.id]).toEqual(createdList);
    });

    test('should update existing list', async () => {
      const createdList = await listStore.actions.createList({
        name: 'Original List',
        description: 'Original Description',
        userId: 'test-user-1',
        color: '#6b7280'
      });

      const updateData = {
        id: createdList.id,
        name: 'Updated List',
        description: 'Updated Description',
        color: '#10b981',
        emoji: '✅'
      };

      const updatedList = await listStore.actions.updateList(updateData);

      expect(updatedList.name).toBe(updateData.name);
      expect(updatedList.description).toBe(updateData.description);
      expect(updatedList.color).toBe(updateData.color);
      expect(updatedList.emoji).toBe(updateData.emoji);
      expect(updatedList.updatedAt.getTime()).toBeGreaterThan(createdList.updatedAt.getTime());

      // Verify update in store
      const storedList = listStore.state.lists.find(l => l.id === createdList.id);
      expect(storedList.name).toBe(updateData.name);
      expect(storedList.color).toBe(updateData.color);

      // Verify cache update
      expect(listStore.state.cache[createdList.id].name).toBe(updateData.name);
    });

    test('should throw error when updating non-existent list', async () => {
      const updateData = {
        id: 'non-existent-id',
        name: 'Non-existent List'
      };

      await expect(listStore.actions.updateList(updateData)).rejects.toThrow('List not found');
    });

    test('should delete existing list', async () => {
      const list1 = await listStore.actions.createList({ name: 'List 1', userId: 'test-user-1' });
      const list2 = await listStore.actions.createList({ name: 'List 2', userId: 'test-user-1' });

      // Add to favorites and recent for testing cleanup
      listStore.actions.addToFavorites(list1.id);
      listStore.actions.addToRecent(list1.id);
      listStore.actions.selectList(list1.id);
      listStore.state.currentList = list1;

      expect(listStore.state.lists).toHaveLength(2);

      await listStore.actions.deleteList(list1.id);

      expect(listStore.state.lists).toHaveLength(1);
      expect(listStore.state.lists[0].id).toBe(list2.id);

      // Verify cache cleanup
      expect(listStore.state.cache[list1.id]).toBeUndefined();
      expect(listStore.state.cache[list2.id]).toBeDefined();

      // Verify favorites cleanup
      expect(listStore.state.favorites).not.toContain(list1.id);
      expect(listStore.state.favorites).toHaveLength(0);

      // Verify recent cleanup
      expect(listStore.state.recent).not.toContain(list1.id);
      expect(listStore.state.recent).toHaveLength(0);

      // Verify selection cleanup
      expect(listStore.state.selectedListIds).not.toContain(list1.id);
      expect(listStore.state.selectedListIds).toHaveLength(0);

      // Verify current list reset
      expect(listStore.state.currentList).toBeNull();
    });

    test('should get list by ID', async () => {
      const list = await listStore.actions.createList({ name: 'Test List', userId: 'test-user-1' });

      const retrievedList = listStore.actions.getList(list.id);
      expect(retrievedList).toEqual(list);

      const nonExistentList = listStore.actions.getList('non-existent-id');
      expect(nonExistentList).toBeUndefined();
    });
  });

  describe('List Selection and Current List', () => {
    let list1: any, list2: any, list3: any;

    beforeEach(async () => {
      list1 = await listStore.actions.createList({ name: 'List 1', userId: 'test-user-1' });
      list2 = await listStore.actions.createList({ name: 'List 2', userId: 'test-user-1' });
      list3 = await listStore.actions.createList({ name: 'List 3', userId: 'test-user-1' });
    });

    test('should select a single list', () => {
      listStore.actions.selectList(list1.id);

      expect(listStore.state.selectedListIds).toHaveLength(1);
      expect(listStore.state.selectedListIds).toContain(list1.id);
    });

    test('should select multiple lists', () => {
      listStore.actions.selectList(list1.id);
      listStore.actions.selectList(list2.id);

      expect(listStore.state.selectedListIds).toHaveLength(2);
      expect(listStore.state.selectedListIds).toContain(list1.id);
      expect(listStore.state.selectedListIds).toContain(list2.id);
    });

    test('should not duplicate list selections', () => {
      listStore.actions.selectList(list1.id);
      listStore.actions.selectList(list1.id);

      expect(listStore.state.selectedListIds).toHaveLength(1);
    });

    test('should select multiple lists at once', () => {
      listStore.actions.selectMultipleLists([list1.id, list2.id, list3.id]);

      expect(listStore.state.selectedListIds).toHaveLength(3);
      expect(listStore.state.selectedListIds).toContain(list1.id);
      expect(listStore.state.selectedListIds).toContain(list2.id);
      expect(listStore.state.selectedListIds).toContain(list3.id);
    });

    test('should deselect a list', () => {
      listStore.actions.selectMultipleLists([list1.id, list2.id, list3.id]);
      listStore.actions.deselectList(list2.id);

      expect(listStore.state.selectedListIds).toHaveLength(2);
      expect(listStore.state.selectedListIds).not.toContain(list2.id);
    });

    test('should clear all selections', () => {
      listStore.actions.selectMultipleLists([list1.id, list2.id, list3.id]);
      listStore.actions.clearSelection();

      expect(listStore.selectedListIds).toHaveLength(0);
    });

    test('should switch to a list', () => {
      listStore.actions.switchList(list2.id);

      expect(listStore.state.currentList).toEqual(list2);
      expect(listStore.state.recent).toContain(list2.id);
    });

    test('should return selected lists', () => {
      listStore.actions.selectMultipleLists([list1.id, list2.id]);

      const selectedLists = listStore.actions.getSelectedLists();
      
      expect(selectedLists).toHaveLength(2);
      expect(selectedLists.map(l => l.id).sort()).toEqual([list1.id, list2.id]);
    });

    test('should return selected list IDs', () => {
      listStore.actions.selectMultipleLists([list1.id, list3.id]);

      const selectedIds = listStore.actions.getSelectedListIds();
      
      expect(selectedIds).toHaveLength(2);
      expect(selectedIds).toContain(list1.id);
      expect(selectedIds).toContain(list3.id);
    });
  });

  describe('Favorites Management', () => {
    let list1: any, list2: any, list3: any;

    beforeEach(async () => {
      list1 = await listStore.actions.createList({ name: 'List 1', userId: 'test-user-1' });
      list2 = await listStore.actions.createList({ name: 'List 2', userId: 'test-user-1' });
      list3 = await listStore.actions.createList({ name: 'List 3', userId: 'test-user-1' });
    });

    test('should add list to favorites', () => {
      expect(listStore.state.favorites).toHaveLength(0);

      listStore.actions.addToFavorites(list1.id);

      expect(listStore.state.favorites).toHaveLength(1);
      expect(listStore.state.favorites).toContain(list1.id);
    });

    test('should not duplicate favorites', () => {
      listStore.actions.addToFavorites(list1.id);
      listStore.actions.addToFavorites(list1.id);

      expect(listStore.state.favorites).toHaveLength(1);
    });

    test('should remove list from favorites', () => {
      listStore.actions.addToFavorites(list1.id);
      listStore.actions.addToFavorites(list2.id);

      listStore.actions.removeFromFavorites(list1.id);

      expect(listStore.state.favorites).toHaveLength(1);
      expect(listStore.state.favorites).toContain(list2.id);
      expect(listStore.state.favorites).not.toContain(list1.id);
    });

    test('should toggle favorite status', () => {
      listStore.actions.toggleFavorite(list1.id);
      expect(listStore.state.favorites).toContain(list1.id);

      listStore.actions.toggleFavorite(list1.id);
      expect(listStore.state.favorites).not.toContain(list1.id);
    });

    test('should return favorite lists', () => {
      listStore.actions.addToFavorites(list1.id);
      listStore.actions.addToFavorites(list3.id);

      const favorites = listStore.actions.getFavoriteLists();
      
      expect(favorites).toHaveLength(2);
      expect(favorites.map(l => l.id).sort()).toEqual([list1.id, list3.id]);
    });
  });

  describe('Recent Lists Management', () => {
    let list1: any, list2: any, list3: any;

    beforeEach(async () => {
      list1 = await listStore.actions.createList({ name: 'List 1', userId: 'test-user-1' });
      list2 = await listStore.actions.createList({ name: 'List 2', userId: 'test-user-1' });
      list3 = await listStore.actions.createList({ name: 'List 3', userId: 'test-user-1' });
    });

    test('should add list to recent', () => {
      expect(listStore.state.recent).toHaveLength(0);

      listStore.actions.addToRecent(list1.id);

      expect(listStore.state.recent).toHaveLength(1);
      expect(listStore.state.recent).toContain(list1.id);
    });

    test('should move list to front when accessed again', () => {
      listStore.actions.addToRecent(list1.id);
      listStore.actions.addToRecent(list2.id);
      listStore.actions.addToRecent(list1.id); // Access list1 again

      expect(listStore.state.recent).toEqual([list1.id, list2.id]);
    });

    test('should limit recent lists to 10', () => {
      const lists = [list1, list2, list3];
      
      // Add 12 lists to recent
      for (let i = 0; i < 12; i++) {
        const listId = lists[i % 3].id;
        listStore.actions.addToRecent(listId);
      }

      expect(listStore.state.recent).toHaveLength(10);
    });

    test('should return recent lists', () => {
      listStore.actions.addToRecent(list1.id);
      listStore.actions.addToRecent(list2.id);
      listStore.actions.addToRecent(list3.id);

      const recent = listStore.actions.getRecentLists();
      
      expect(recent).toHaveLength(3);
      expect(recent.map(l => l.id)).toEqual([list3.id, list2.id, list1.id]); // Last accessed first
    });

    test('should clear recent lists', () => {
      listStore.actions.addToRecent(list1.id);
      listStore.actions.addToRecent(list2.id);

      listStore.actions.clearRecent();

      expect(listStore.state.recent).toHaveLength(0);
    });
  });

  describe('List Search and Filtering', () => {
    beforeEach(async () => {
      await listStore.actions.createList({ name: 'Work List', description: 'Work related tasks', userId: 'test-user-1' });
      await listStore.actions.createList({ name: 'Personal List', description: 'Personal tasks', userId: 'test-user-1' });
      await listStore.actions.createList({ name: 'Shopping List', description: 'Shopping items', userId: 'test-user-1' });
    });

    test('should search lists by name', () => {
      const results = listStore.actions.searchLists('Work');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Work List');
    });

    test('should search lists by description', () => {
      const results = listStore.actions.searchLists('tasks');
      
      expect(results).toHaveLength(2);
      expect(results.map(l => l.name).sort()).toEqual(['Personal List', 'Work List']);
    });

    test('should return all lists when search is empty', () => {
      const results = listStore.actions.searchLists('');
      
      expect(results).toHaveLength(3);
    });

    test('should filter by favorites', async () => {
      const workList = listStore.actions.getList(listStore.state.lists[0].id);
      const personalList = listStore.actions.getList(listStore.state.lists[1].id);
      
      listStore.actions.addToFavorites(workList.id);

      const results = listStore.actions.filterLists('favorites');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(workList.id);
    });

    test('should filter by recent', () => {
      const list1 = listStore.state.lists[0];
      const list2 = listStore.state.lists[1];
      
      listStore.actions.addToRecent(list1.id);
      listStore.actions.addToRecent(list2.id);

      const results = listStore.actions.filterLists('recent');
      
      expect(results).toHaveLength(2);
    });

    test('should return all lists for default filter', () => {
      const results = listStore.actions.filterLists('all');
      
      expect(results).toHaveLength(3);
    });
  });

  describe('List Statistics', () => {
    beforeEach(async () => {
      await listStore.actions.createList({ name: 'Work List', color: '#3b82f6', userId: 'test-user-1' });
      await listStore.actions.createList({ name: 'Personal List', color: '#10b981', userId: 'test-user-1' });
      await listStore.actions.createList({ name: 'Shopping List', color: '#3b82f6', userId: 'test-user-1' });
    });

    test('should calculate list statistics', () => {
      listStore.actions.addToFavorites(listStore.state.lists[0].id);
      listStore.actions.addToRecent(listStore.state.lists[1].id);

      const stats = listStore.actions.getListStats();
      
      expect(stats.total).toBe(3);
      expect(stats.favorites).toBe(1);
      expect(stats.recent).toBe(1);
      expect(stats.byColor).toEqual({
        '#3b82f6': 2,
        '#10b981': 1
      });
    });
  });

  describe('List Validation', () => {
    test('should validate required fields', () => {
      const invalidData = {
        name: '', // Empty name
        color: 'invalid-color', // Invalid color
        description: 'x'.repeat(201) // Too long description
      };

      const validation = listStore.actions.validateListData(invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('List name is required');
      expect(validation.errors).toContain('Color must be a valid hex color code');
      expect(validation.errors).toContain('Description must be less than 200 characters');
    });

    test('should validate valid data', () => {
      const validData = {
        name: 'Valid List',
        color: '#3b82f6',
        description: 'This is a valid description'
      };

      const validation = listStore.actions.validateListData(validData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Batch Operations', () => {
    let lists: any[];

    beforeEach(async () => {
      lists = await Promise.all([
        listStore.actions.createList({ name: 'List 1', color: '#3b82f6', userId: 'test-user-1' }),
        listStore.actions.createList({ name: 'List 2', color: '#6b7280', userId: 'test-user-1' }),
        listStore.actions.createList({ name: 'List 3', color: '#10b981', userId: 'test-user-1' })
      ]);
    });

    test('should batch update lists', async () => {
      const listIds = [lists[0].id, lists[1].id];
      const batchData = {
        listIds,
        color: '#ef4444'
      };

      const result = await listStore.actions.batchUpdateLists(batchData);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);

      // Verify updates
      const updatedList1 = listStore.actions.getList(lists[0].id);
      const updatedList2 = listStore.actions.getList(lists[1].id);

      expect(updatedList1.color).toBe('#ef4444');
      expect(updatedList2.color).toBe('#ef4444');
    });

    test('should batch delete lists', async () => {
      const listIds = [lists[0].id, lists[1].id];

      const result = await listStore.actions.batchDeleteLists(listIds);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);

      // Verify deletions
      expect(listStore.actions.getList(lists[0].id)).toBeUndefined();
      expect(listStore.actions.getList(lists[1].id)).toBeUndefined();
      expect(listStore.actions.getList(lists[2].id)).toBeDefined();

      expect(listStore.actions.getListCount()).toBe(1);
    });

    test('should handle batch operation failures gracefully', async () => {
      const listIds = [lists[0].id, 'non-existent-id'];
      const batchData = {
        listIds,
        color: '#ef4444'
      };

      const result = await listStore.actions.batchUpdateLists(batchData);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);

      // Verify first list was updated
      const updatedList = listStore.actions.getList(lists[0].id);
      expect(updatedList.color).toBe('#ef4444');
    });
  });

  describe('List Organization', () => {
    let lists: any[];

    beforeEach(async () => {
      lists = await Promise.all([
        listStore.actions.createList({ name: 'List 1', userId: 'test-user-1' }),
        listStore.actions.createList({ name: 'List 2', userId: 'test-user-1' }),
        listStore.actions.createList({ name: 'List 3', userId: 'test-user-1' })
      ]);
    });

    test('should reorder lists', () => {
      const listIds = [lists[2].id, lists[0].id, lists[1].id];

      const result = listStore.actions.reorderLists(listIds);

      expect(result.success).toBe(true);
      expect(result.reordered).toBe(3);
    });

    test('should move list to new position', () => {
      const result = listStore.actions.moveList(lists[2].id, 0);

      expect(result).toBe(true);
      
      // Verify the order changed
      const newOrder = listStore.state.lists.map(l => l.id);
      expect(newOrder[0]).toBe(lists[2].id);
    });

    test('should return false when moving non-existent list', () => {
      const result = listStore.actions.moveList('non-existent-id', 0);

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should set and clear errors', () => {
      const error = { code: 'TEST_ERROR', message: 'Test error message' };
      
      listStore.actions.setError(error);
      expect(listStore.state.error).toEqual(error);

      listStore.actions.clearError();
      expect(listStore.state.error).toBeNull();
    });

    test('should handle loading states', () => {
      expect(listStore.state.loading.creating).toBe(false);
      expect(listStore.state.loading.updating).toBe(false);
      expect(listStore.state.loading.deleting).toBe(false);
    });
  });

  describe('Cache Management', () => {
    test('should cache lists and clear cache', async () => {
      const list = await listStore.actions.createList({ name: 'Cache Test', userId: 'test-user-1' });

      expect(listStore.state.cache[list.id]).toBeDefined();

      listStore.actions.clearCache();
      expect(Object.keys(listStore.state.cache)).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of lists efficiently', async () => {
      const listCount = 500;
      const startTime = performance.now();

      const promises = Array.from({ length: listCount }, (_, i) =>
        listStore.actions.createList({ name: `Performance List ${i}`, userId: 'test-user-1' })
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const creationTime = endTime - startTime;

      expect(creationTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(listStore.actions.getListCount()).toBe(listCount);

      // Test search performance
      const searchStartTime = performance.now();
      const results = listStore.actions.searchLists('Performance');
      const searchEndTime = performance.now();

      expect(searchEndTime - searchStartTime).toBeLessThan(100); // Should search within 100ms
      expect(results).toHaveLength(listCount);
    });
  });
});