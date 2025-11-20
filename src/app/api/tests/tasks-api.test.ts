/**
 * Tasks API Route Tests
 * Comprehensive tests for tasks API endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { createTestDatabaseAPI } from '../../../lib/db/api';
import { TestDatabaseManager, TestDataFixtures, DatabaseTestHelpers } from '../../../lib/db/test-utils';
import { DatabaseAPI } from '../../../lib/db/api';

// Mock Next.js API route context
function createMockRequest(url: string, options: RequestInit = {}) {
  return new Request(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body,
  });
}

describe('Tasks API Routes', () => {
  let api: DatabaseAPI;
  let testDB: TestDatabaseManager;

  beforeAll(async () => {
    // Set up test database
    testDB = new TestDatabaseManager({
      path: './test-data/api-test.db',
      verbose: false
    });
    
    const dbManager = testDB.getDatabase();
    api = new DatabaseAPI(dbManager);
    
    await testDB.initialize();
    await api.runMigrations();
  });

  afterAll(async () => {
    await testDB.cleanup();
  });

  beforeEach(async () => {
    // Insert test data before each test
    const testData = TestDataFixtures.createTestDataset();
    const dbManager = testDB.getDatabase();
    const helpers = new DatabaseTestHelpers(dbManager);
    await helpers.insertTestData(testData);
  });

  afterEach(async () => {
    // Clean up after each test
    await testDB.clean();
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
        
        const tasks = await api.getUserTasks(queryUserId);
        
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

          const createdTask = await api.createTask({
            name: data.name,
            description: data.description || '',
            userId: data.userId,
            listId: data.listId,
            status: data.status || 'todo',
            priority: data.priority || 'Medium',
            date: data.date ? new Date(data.date) : undefined,
            position: 0,
            isRecurring: false
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
  });
});
