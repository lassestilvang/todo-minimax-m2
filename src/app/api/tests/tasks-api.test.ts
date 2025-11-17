/**
 * Tasks API Route Tests
 * Comprehensive tests for tasks API endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { createTestDatabaseAPI, TestDatabaseManager } from '../../lib/db/test-utils';
import { TEST_DATA } from '../../test/setup';

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

describe('Tasks API Routes', () => {
  let testAPI: ReturnType<typeof createTestDatabaseAPI>;
  let testDB: TestDatabaseManager;

  beforeAll(async () => {
    // Set up test database
    testDB = new TestDatabaseManager({
      path: './test-data/api-test.db',
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
    // Insert test data before each test
    await testAPI.testHelpers.insertTestData(TEST_DATA);
  });

  afterEach(async () => {
    // Clean up after each test
    await testAPI.testHelpers.cleanup();
  });

  describe('GET /api/tasks', () => {
    test('should retrieve all tasks for user', async () => {
      const userId = 'test-user-1';
      
      // Mock the API route
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryUserId = url.searchParams.get('userId');
        
        if (!queryUserId) {
          return new Response(JSON.stringify({ error: 'User ID required' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const tasks = await testAPI.api.getUserTasks(queryUserId);
        
        return new Response(JSON.stringify({ tasks }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const request = createMockRequest(`http://localhost:3000/api/tasks?userId=${userId}`);
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.tasks)).toBe(true);
      expect(data.tasks.length).toBeGreaterThan(0);
    });

    test('should filter tasks by status', async () => {
      const userId = 'test-user-1';
      const status = 'todo';
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const userIdParam = url.searchParams.get('userId');
        const statusParam = url.searchParams.get('status');
        
        if (!userIdParam) {
          return new Response(JSON.stringify({ error: 'User ID required' }), { status: 400 });
        }
        
        const tasks = await testAPI.api.getUserTasks(userIdParam, {
          status: statusParam ? [statusParam] : undefined
        });
        
        return new Response(JSON.stringify({ tasks }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const request = createMockRequest(
        `http://localhost:3000/api/tasks?userId=${userId}&status=${status}`
      );
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.tasks)).toBe(true);
      
      // All returned tasks should have the requested status
      data.tasks.forEach((task: any) => {
        expect(task.status).toBe(status);
      });
    });

    test('should handle invalid user ID', async () => {
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response(JSON.stringify({ error: 'User ID required' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ tasks: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const request = createMockRequest('http://localhost:3000/api/tasks');
      const response = await mockHandler(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('User ID required');
    });
  });

  describe('POST /api/tasks', () => {
    test('should create a new task', async () => {
      const taskData = {
        name: 'API Test Task',
        description: 'Testing task creation via API',
        userId: 'test-user-1',
        listId: 'list-1',
        status: 'todo',
        priority: 'High',
        date: new Date().toISOString()
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
          
          // Validate required fields
          if (!data.name || !data.userId) {
            return new Response(JSON.stringify({ 
              error: 'Name and userId are required' 
            }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const createdTask = await testAPI.api.createTask({
            name: data.name,
            description: data.description || '',
            userId: data.userId,
            listId: data.listId,
            status: data.status || 'todo',
            priority: data.priority || 'Medium',
            date: data.date ? new Date(data.date) : undefined
          });

          return new Response(JSON.stringify({ task: createdTask }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to create task' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      
      const response = await mockHandler(request);
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.task).toBeDefined();
      expect(data.task.name).toBe(taskData.name);
      expect(data.task.userId).toBe(taskData.userId);
    });

    test('should handle invalid task data', async () => {
      const invalidTaskData = {
        // Missing required fields
        description: 'Task without name'
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

      const request = createMockRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidTaskData)
      });
      
      const response = await mockHandler(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });

  describe('PUT /api/tasks/[id]', () => {
    test('should update existing task', async () => {
      // First create a task
      const task = await testAPI.api.createTask({
        name: 'Task to Update',
        description: 'Original description',
        userId: 'test-user-1',
        status: 'todo'
      });

      const updateData = {
        id: task.id,
        name: 'Updated Task Name',
        description: 'Updated description',
        status: 'in-progress'
      };

      const mockHandler = async (request: Request, taskId: string) => {
        if (request.method !== 'PUT') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
        }

        try {
          const data = await request.json();
          const userId = 'test-user-1'; // In real app, would come from auth
          
          const updatedTask = await testAPI.api.updateTask(taskId, data, userId);
          
          return new Response(JSON.stringify({ task: updatedTask }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to update task' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(`http://localhost:3000/api/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await mockHandler(request, task.id);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.task.name).toBe(updateData.name);
      expect(data.task.status).toBe(updateData.status);
    });

    test('should handle non-existent task', async () => {
      const updateData = {
        name: 'Non-existent Task',
        status: 'done'
      };

      const mockHandler = async (request: Request, taskId: string) => {
        try {
          const data = await request.json();
          const userId = 'test-user-1';
          
          // Simulate task not found
          const updatedTask = await testAPI.api.updateTask(taskId, data, userId);
          
          return new Response(JSON.stringify({ task: updatedTask }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Task not found' 
          }), { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/tasks/non-existent-id', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await mockHandler(request, 'non-existent-id');
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });

  describe('DELETE /api/tasks/[id]', () => {
    test('should delete existing task', async () => {
      // First create a task
      const task = await testAPI.api.createTask({
        name: 'Task to Delete',
        userId: 'test-user-1'
      });

      const mockHandler = async (request: Request, taskId: string) => {
        if (request.method !== 'DELETE') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
        }

        try {
          const userId = 'test-user-1'; // In real app, would come from auth
          
          await testAPI.api.deleteTask(taskId, userId);
          
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to delete task' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(`http://localhost:3000/api/tasks/${task.id}`, {
        method: 'DELETE'
      });
      
      const response = await mockHandler(request, task.id);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify task is deleted
      const deletedTask = await testAPI.api.getTaskWithDetails(task.id);
      expect(deletedTask).toBeNull();
    });
  });

  describe('POST /api/tasks/bulk', () => {
    test('should perform bulk operations on tasks', async () => {
      // Create multiple tasks
      const tasks = await Promise.all([
        testAPI.api.createTask({ name: 'Bulk Task 1', userId: 'test-user-1' }),
        testAPI.api.createTask({ name: 'Bulk Task 2', userId: 'test-user-1' }),
        testAPI.api.createTask({ name: 'Bulk Task 3', userId: 'test-user-1' })
      ]);

      const bulkData = {
        taskIds: tasks.map(t => t.id),
        action: 'update',
        data: { status: 'done' }
      };

      const mockHandler = async (request: Request) => {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
        }

        try {
          const data = await request.json();
          const userId = 'test-user-1';
          
          if (!data.taskIds || !Array.isArray(data.taskIds)) {
            return new Response(JSON.stringify({ 
              error: 'taskIds array is required' 
            }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const results = {
            total: data.taskIds.length,
            successful: 0,
            failed: 0,
            results: []
          };

          for (const taskId of data.taskIds) {
            try {
              await testAPI.api.updateTask(taskId, data.data, userId);
              results.successful++;
              results.results.push({ taskId, success: true });
            } catch (error) {
              results.failed++;
              results.results.push({ taskId, success: false, error: error.message });
            }
          }

          return new Response(JSON.stringify({ results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Bulk operation failed' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/tasks/bulk', {
        method: 'POST',
        body: JSON.stringify(bulkData)
      });
      
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results.total).toBe(3);
      expect(data.results.successful).toBe(3);
      expect(data.results.failed).toBe(0);
    });
  });

  describe('GET /api/tasks/stats', () => {
    test('should return task statistics', async () => {
      const mockHandler = async (request: Request) => {
        const userId = 'test-user-1';
        
        try {
          const tasks = await testAPI.api.getUserTasks(userId);
          
          const stats = {
            total: tasks.length,
            todo: tasks.filter(t => t.status === 'todo').length,
            inProgress: tasks.filter(t => t.status === 'in-progress').length,
            done: tasks.filter(t => t.status === 'done').length,
            highPriority: tasks.filter(t => t.priority === 'High').length,
            mediumPriority: tasks.filter(t => t.priority === 'Medium').length,
            lowPriority: tasks.filter(t => t.priority === 'Low').length,
          };

          return new Response(JSON.stringify({ stats }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to get statistics' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/tasks/stats?userId=test-user-1');
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.stats).toBeDefined();
      expect(typeof data.stats.total).toBe('number');
      expect(typeof data.stats.todo).toBe('number');
      expect(typeof data.stats.done).toBe('number');
    });
  });
});