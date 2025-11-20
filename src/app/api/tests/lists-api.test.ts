/**
 * Lists API Route Tests
 * Comprehensive tests for lists API endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { createTestDatabaseAPI, TestDatabaseManager, TestDataFixtures } from '../../../lib/db/test-utils';

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
    
    await testDB.initialize();
    await testAPI.api.runMigrations();
  });

  afterAll(async () => {
    await testDB.cleanup();
  });

  beforeEach(async () => {
    const testData = TestDataFixtures.createTestDataset();
    const helpers = testAPI.helpers();
    await helpers.insertTestData(testData);
  });

  afterEach(async () => {
    await testDB.clean();
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
  });
});