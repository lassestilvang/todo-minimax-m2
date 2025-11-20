/**
 * Labels API Route Tests
 * Comprehensive tests for labels API endpoints
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

describe('Labels API Routes', () => {
  let testAPI: ReturnType<typeof createTestDatabaseAPI>;
  let testDB: TestDatabaseManager;

  beforeAll(async () => {
    testDB = new TestDatabaseManager({
      path: './test-data/labels-api-test.db',
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

  describe('GET /api/labels', () => {
    test('should retrieve all labels for user', async () => {
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
        
        const labels = await testAPI.api.getUserLabelsWithCounts(queryUserId);
        
        return new Response(JSON.stringify({ labels }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const request = createMockRequest(`http://localhost:3000/api/labels?userId=${userId}`);
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.labels)).toBe(true);
      
      // Verify labels have task counts
      data.labels.forEach((label: any) => {
        expect(label).toHaveProperty('taskCount');
        expect(typeof label.taskCount).toBe('number');
      });
    });
  });

  describe('POST /api/labels', () => {
    test('should create a new label', async () => {
      const labelData = {
        name: 'API Test Label',
        color: '#ef4444',
        userId: 'test-user-1'
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

          const createdLabel = await testAPI.api.createLabel({
            name: data.name,
            color: data.color || '#6b7280',
            userId: data.userId
          });

          return new Response(JSON.stringify({ label: createdLabel }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Failed to create label' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest('http://localhost:3000/api/labels', {
        method: 'POST',
        body: JSON.stringify(labelData)
      });
      
      const response = await mockHandler(request);
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.label).toBeDefined();
      expect(data.label.name).toBe(labelData.name);
      expect(data.label.color).toBe(labelData.color);
    });
  });
});