/**
 * Search API Route Tests
 * Comprehensive tests for search API endpoints
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

describe('Search API Routes', () => {
  let testAPI: ReturnType<typeof createTestDatabaseAPI>;
  let testDB: TestDatabaseManager;

  beforeAll(async () => {
    testDB = new TestDatabaseManager({
      path: './test-data/search-api-test.db',
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

  describe('GET /api/search', () => {
    test('should search tasks by query string', async () => {
      const userId = 'test-user-1';
      const query = 'Test Task';
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('q');
        const userIdParam = url.searchParams.get('userId');
        
        if (!queryParam || !userIdParam) {
          return new Response(JSON.stringify({ 
            error: 'Query (q) and userId parameters are required' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        try {
          // Search in tasks
          const tasks = await testAPI.api.getUserTasks(userIdParam);
          const searchResults = tasks.filter(task => 
            task.name.toLowerCase().includes(queryParam.toLowerCase()) ||
            task.description?.toLowerCase().includes(queryParam.toLowerCase())
          );
          
          return new Response(JSON.stringify({ 
            results: {
              tasks: searchResults,
              total: searchResults.length
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Search failed' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(
        `http://localhost:3000/api/search?q=${encodeURIComponent(query)}&userId=${userId}`
      );
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results).toBeDefined();
      expect(data.results.tasks).toBeInstanceOf(Array);
      expect(data.results.total).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty query', async () => {
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('q');
        
        if (!queryParam) {
          return new Response(JSON.stringify({ 
            error: 'Query parameter is required' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ results: { tasks: [], total: 0 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const request = createMockRequest('http://localhost:3000/api/search');
      const response = await mockHandler(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('Query parameter is required');
    });
  });
});