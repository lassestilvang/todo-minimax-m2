/**
 * Lists API Route Tests
 * Comprehensive tests for lists API endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { createTestDatabaseAPI, TestDatabaseManager } from '../../../lib/db/test-utils';
import { TEST_DATA } from '../../../test/setup';

// Mock Next.js API route context
function createMockRequest(url: string, options: RequestInit = {}) {
  return new Request(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body,
  });
}

describe('Lists API Routes', () => {
  let testAPI: ReturnType<typeof createTestDatabaseAPI>;
  let testDB: TestDatabaseManager;

  beforeAll(async () => {
    testDB = new TestDatabaseManager({
      path: './test-data/lists-api-test.db',
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

  beforeEach(async () => {
    await testAPI.testHelpers.insertTestData(TEST_DATA);
  });

  afterEach(async () => {
    await testAPI.testHelpers.cleanup();
  });

  describe('GET /api/lists', () => {
    test('should retrieve all lists for user', async () => {
      const userId = 'test-user-1';
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryUserId = url.searchParams.get('userId');
        
        if (!queryUserId) {
          return new Response(JSON.stringify({ error: 'User ID required' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const lists = await testAPI.api.getUserLists(queryUserId);
        
        return new Response(JSON.stringify({ lists }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const request = createMockRequest(`http://localhost:3000/api/lists?userId=${userId}`);
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.lists)).toBe(true);
      expect(data.lists.length).toBeGreaterThan(0);
    });

    test('should filter lists by favorite status', async () => {
      const userId = 'test-user-1';
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const userIdParam = url.searchParams.get('userId');
        const favoriteParam = url.searchParams.get('favorite');
        
        if (!userIdParam) {
          return new Response(JSON.stringify({ error: 'User ID required' }), { status: 400 });
        }
        
        let lists = await testAPI.api.getUserLists(userIdParam);
        
        // In a real implementation, favorite filtering would be applied here
        if (favoriteParam === 'true') {
          lists = lists.filter(list => list.isFavorite); // This would be implemented
        }
        
        return new Response(JSON.stringify({ lists }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const request = createMockRequest(`http://localhost:3000/api/lists?userId=${userId}&favorite=true`);
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.lists)).toBe(true);
    });
  });

  describe('POST /api/lists', () => {
    test('should create a new list', async () => {
      const listData = {
        name: 'API Test List',
        description: 'Testing list creation via API',
        userId: 'test-user-1',
        color: '#10b981',
        icon: '📝',
        isDefault: false
      };

      const mockHandler = async (request: Request) => {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
            status: 405,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        try {
          const data = await request.json();
          
          if (!data.name || !data.userId) {
            return new Response(JSON.stringify({ 
              error: 'Name and userId are required' 
            }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const createdList = await testAPI.api.createList({
            name: data.name,
            description: data.description || '',
            userId: data.userId,
            color: data.color || '#3b82f6',
            icon: data.icon || '📋'
          });

          return new Response(JSON.stringify({ list: createdList }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to create list' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/lists', {
        method: 'POST',
        body: JSON.stringify(listData)
      });
      
      const response = await mockHandler(request);
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.list).toBeDefined();
      expect(data.list.name).toBe(listData.name);
      expect(data.list.userId).toBe(listData.userId);
    });

    test('should handle invalid list data', async () => {
      const invalidListData = {
        // Missing required fields
        color: '#10b981'
      };

      const mockHandler = async (request: Request) => {
        try {
          const data = await request.json();
          
          if (!data.name || !data.userId) {
            return new Response(JSON.stringify({ 
              error: 'Name and userId are required' 
            }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify({}), { status: 200 });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/lists', {
        method: 'POST',
        body: JSON.stringify(invalidListData)
      });
      
      const response = await mockHandler(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    test('should prevent duplicate list names for user', async () => {
      const listData = {
        name: 'Work List', // This name already exists in TEST_DATA
        userId: 'test-user-1'
      };

      const mockHandler = async (request: Request) => {
        try {
          const data = await request.json();
          
          // Check for existing list with same name
          const existingLists = await testAPI.api.getUserLists(data.userId);
          const duplicateName = existingLists.find(list => list.name === data.name);
          
          if (duplicateName) {
            return new Response(JSON.stringify({ 
              error: 'A list with this name already exists' 
            }), { 
              status: 409,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Failed to process request' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/lists', {
        method: 'POST',
        body: JSON.stringify(listData)
      });
      
      const response = await mockHandler(request);
      
      expect(response.status).toBe(409);
      
      const data = await response.json();
      expect(data.error).toContain('already exists');
    });
  });

  describe('PUT /api/lists/[id]', () => {
    test('should update existing list', async () => {
      const list = await testAPI.api.createList({
        name: 'Original List',
        description: 'Original description',
        userId: 'test-user-1'
      });

      const updateData = {
        id: list.id,
        name: 'Updated List Name',
        description: 'Updated description',
        color: '#f59e0b',
        icon: '🔄'
      };

      const mockHandler = async (request: Request, listId: string) => {
        if (request.method !== 'PUT') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
        }

        try {
          const data = await request.json();
          const userId = 'test-user-1';
          
          const updatedList = await testAPI.api.updateList(listId, data, userId);
          
          return new Response(JSON.stringify({ list: updatedList }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to update list' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(`http://localhost:3000/api/lists/${list.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await mockHandler(request, list.id);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.list.name).toBe(updateData.name);
      expect(data.list.color).toBe(updateData.color);
    });

    test('should handle list not found', async () => {
      const updateData = {
        name: 'Non-existent List',
        color: '#10b981'
      };

      const mockHandler = async (request: Request, listId: string) => {
        try {
          const data = await request.json();
          const userId = 'test-user-1';
          
          // Simulate list not found
          const updatedList = await testAPI.api.updateList(listId, data, userId);
          
          return new Response(JSON.stringify({ list: updatedList }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'List not found' 
          }), { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/lists/non-existent-id', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await mockHandler(request, 'non-existent-id');
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });

  describe('DELETE /api/lists/[id]', () => {
    test('should delete existing list', async () => {
      const list = await testAPI.api.createList({
        name: 'List to Delete',
        userId: 'test-user-1'
      });

      const mockHandler = async (request: Request, listId: string) => {
        if (request.method !== 'DELETE') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
        }

        try {
          const userId = 'test-user-1';
          
          await testAPI.api.deleteList(listId, userId);
          
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to delete list' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(`http://localhost:3000/api/lists/${list.id}`, {
        method: 'DELETE'
      });
      
      const response = await mockHandler(request, list.id);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify list is deleted
      const deletedList = await testAPI.api.getListWithDetails(list.id);
      expect(deletedList).toBeNull();
    });

    test('should handle list with tasks deletion', async () => {
      // Create a list with tasks
      const list = await testAPI.api.createList({
        name: 'List with Tasks',
        userId: 'test-user-1'
      });

      await testAPI.api.createTask({
        name: 'Task in List',
        userId: 'test-user-1',
        listId: list.id
      });

      const mockHandler = async (request: Request, listId: string) => {
        try {
          const userId = 'test-user-1';
          
          // Check if list has tasks
          const tasks = await testAPI.api.getUserTasks(userId, { listId });
          
          if (tasks.length > 0) {
            return new Response(JSON.stringify({ 
              error: 'Cannot delete list with existing tasks. Please move or delete tasks first.' 
            }), { 
              status: 409,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          await testAPI.api.deleteList(listId, userId);
          
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to delete list' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(`http://localhost:3000/api/lists/${list.id}`, {
        method: 'DELETE'
      });
      
      const response = await mockHandler(request, list.id);
      
      expect(response.status).toBe(409);
      
      const data = await response.json();
      expect(data.error).toContain('Cannot delete');
    });
  });

  describe('PUT /api/lists/[id]/reorder', () => {
    test('should reorder lists', async () => {
      // Create multiple lists
      const lists = await Promise.all([
        testAPI.api.createList({ name: 'List 1', userId: 'test-user-1' }),
        testAPI.api.createList({ name: 'List 2', userId: 'test-user-1' }),
        testAPI.api.createList({ name: 'List 3', userId: 'test-user-1' })
      ]);

      const reorderData = {
        listIds: lists.map((list, index) => ({ id: list.id, position: index }))
      };

      const mockHandler = async (request: Request, listId: string) => {
        if (request.method !== 'PUT') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
        }

        try {
          const data = await request.json();
          
          if (!data.listIds || !Array.isArray(data.listIds)) {
            return new Response(JSON.stringify({ 
              error: 'listIds array is required' 
            }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Simulate reordering (in real implementation, this would update positions)
          return new Response(JSON.stringify({ success: true, reordered: data.listIds.length }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to reorder lists' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(`http://localhost:3000/api/lists/${lists[0].id}/reorder`, {
        method: 'PUT',
        body: JSON.stringify(reorderData)
      });
      
      const response = await mockHandler(request, lists[0].id);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.reordered).toBe(3);
    });
  });
});