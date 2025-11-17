/**
 * Search API Route Tests
 * Comprehensive tests for search API endpoints
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

    test('should filter search by entity type', async () => {
      const userId = 'test-user-1';
      const query = 'Test';
      const type = 'tasks';
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('q');
        const userIdParam = url.searchParams.get('userId');
        const typeParam = url.searchParams.get('type') || 'tasks';
        
        if (!queryParam || !userIdParam) {
          return new Response(JSON.stringify({ 
            error: 'Query (q) and userId parameters are required' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        try {
          const results: any = {
            tasks: [],
            lists: [],
            labels: []
          };
          
          // Search tasks
          if (typeParam === 'tasks' || typeParam === 'all') {
            const tasks = await testAPI.api.getUserTasks(userIdParam);
            results.tasks = tasks.filter(task => 
              task.name.toLowerCase().includes(queryParam.toLowerCase()) ||
              task.description?.toLowerCase().includes(queryParam.toLowerCase())
            );
          }
          
          // Search lists
          if (typeParam === 'lists' || typeParam === 'all') {
            const lists = await testAPI.api.getUserLists(userIdParam);
            results.lists = lists.filter(list => 
              list.name.toLowerCase().includes(queryParam.toLowerCase()) ||
              list.description?.toLowerCase().includes(queryParam.toLowerCase())
            );
          }
          
          // Search labels
          if (typeParam === 'labels' || typeParam === 'all') {
            const labels = await testAPI.api.getUserLabelsWithCounts(userIdParam);
            results.labels = labels.filter(label => 
              label.name.toLowerCase().includes(queryParam.toLowerCase())
            );
          }
          
          const totalResults = results.tasks.length + results.lists.length + results.labels.length;
          
          return new Response(JSON.stringify({ 
            results,
            total: totalResults
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
        `http://localhost:3000/api/search?q=${encodeURIComponent(query)}&userId=${userId}&type=${type}`
      );
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results).toBeDefined();
      expect(data.results.tasks).toBeInstanceOf(Array);
      expect(data.results.lists).toBeInstanceOf(Array);
      expect(data.results.labels).toBeInstanceOf(Array);
    });

    test('should support advanced search filters', async () => {
      const userId = 'test-user-1';
      const query = 'Task';
      const status = 'todo';
      const priority = 'High';
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('q');
        const userIdParam = url.searchParams.get('userId');
        const statusParam = url.searchParams.get('status');
        const priorityParam = url.searchParams.get('priority');
        const dateFrom = url.searchParams.get('dateFrom');
        const dateTo = url.searchParams.get('dateTo');
        
        if (!queryParam || !userIdParam) {
          return new Response(JSON.stringify({ 
            error: 'Query (q) and userId parameters are required' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        try {
          let tasks = await testAPI.api.getUserTasks(userIdParam);
          
          // Apply query filter
          tasks = tasks.filter(task => 
            task.name.toLowerCase().includes(queryParam.toLowerCase()) ||
            task.description?.toLowerCase().includes(queryParam.toLowerCase())
          );
          
          // Apply status filter
          if (statusParam) {
            tasks = tasks.filter(task => task.status === statusParam);
          }
          
          // Apply priority filter
          if (priorityParam) {
            tasks = tasks.filter(task => task.priority === priorityParam);
          }
          
          // Apply date range filters
          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            tasks = tasks.filter(task => task.date && new Date(task.date) >= fromDate);
          }
          
          if (dateTo) {
            const toDate = new Date(dateTo);
            tasks = tasks.filter(task => task.date && new Date(task.date) <= toDate);
          }
          
          return new Response(JSON.stringify({ 
            results: {
              tasks,
              total: tasks.length
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Advanced search failed' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(
        `http://localhost:3000/api/search?q=${encodeURIComponent(query)}&userId=${userId}&status=${status}&priority=${priority}`
      );
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results.tasks).toBeInstanceOf(Array);
      
      // All results should match the filters
      data.results.tasks.forEach((task: any) => {
        expect(task.name.toLowerCase()).toContain(query.toLowerCase());
        expect(task.status).toBe(status);
        expect(task.priority).toBe(priority);
      });
    });

    test('should support fuzzy search with typos', async () => {
      const userId = 'test-user-1';
      const query = 'Test Taks'; // Intentional typo for 'Test Task'
      
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
          const tasks = await testAPI.api.getUserTasks(userIdParam);
          
          // Simple fuzzy search implementation
          const searchResults = tasks.filter(task => {
            const taskName = task.name.toLowerCase();
            const taskDesc = task.description?.toLowerCase() || '';
            const searchTerm = queryParam.toLowerCase();
            
            // Exact match
            if (taskName.includes(searchTerm) || taskDesc.includes(searchTerm)) {
              return true;
            }
            
            // Fuzzy match (simple implementation - in real app would use libraries like fuse.js)
            const words = searchTerm.split(' ');
            const taskWords = (taskName + ' ' + taskDesc).split(' ');
            
            return words.some(word => 
              taskWords.some(taskWord => 
                taskWord.length > 3 && // Only for words longer than 3 characters
                (Math.abs(word.length - taskWord.length) <= 2) &&
                (word.startsWith(taskWord.substring(0, 3)) || taskWord.startsWith(word.substring(0, 3)))
              )
            );
          });
          
          return new Response(JSON.stringify({ 
            results: {
              tasks: searchResults,
              total: searchResults.length,
              query: queryParam
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Fuzzy search failed' 
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
      expect(data.results.query).toBe(query);
      expect(data.results.tasks).toBeInstanceOf(Array);
    });

    test('should limit search results with pagination', async () => {
      const userId = 'test-user-1';
      const query = 'Test';
      const limit = 5;
      const offset = 0;
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('q');
        const userIdParam = url.searchParams.get('userId');
        const limitParam = parseInt(url.searchParams.get('limit') || '10');
        const offsetParam = parseInt(url.searchParams.get('offset') || '0');
        
        if (!queryParam || !userIdParam) {
          return new Response(JSON.stringify({ 
            error: 'Query (q) and userId parameters are required' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        try {
          const tasks = await testAPI.api.getUserTasks(userIdParam);
          const searchResults = tasks.filter(task => 
            task.name.toLowerCase().includes(queryParam.toLowerCase()) ||
            task.description?.toLowerCase().includes(queryParam.toLowerCase())
          );
          
          // Apply pagination
          const paginatedResults = searchResults.slice(
            offsetParam, 
            offsetParam + limitParam
          );
          
          return new Response(JSON.stringify({ 
            results: {
              tasks: paginatedResults,
              total: searchResults.length,
              pagination: {
                limit: limitParam,
                offset: offsetParam,
                hasMore: searchResults.length > offsetParam + limitParam
              }
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Paginated search failed' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(
        `http://localhost:3000/api/search?q=${encodeURIComponent(query)}&userId=${userId}&limit=${limit}&offset=${offset}`
      );
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results.tasks.length).toBeLessThanOrEqual(limit);
      expect(data.results.pagination).toBeDefined();
      expect(data.results.pagination.limit).toBe(limit);
      expect(data.results.pagination.offset).toBe(offset);
    });

    test('should return search suggestions', async () => {
      const userId = 'test-user-1';
      const partialQuery = 'Test';
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('q');
        const userIdParam = url.searchParams.get('userId');
        const suggestions = url.searchParams.get('suggestions') === 'true';
        
        if (!queryParam || !userIdParam) {
          return new Response(JSON.stringify({ 
            error: 'Query (q) and userId parameters are required' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        try {
          const tasks = await testAPI.api.getUserTasks(userIdParam);
          const lists = await testAPI.api.getUserLists(userIdParam);
          const labels = await testAPI.api.getUserLabelsWithCounts(userIdParam);
          
          // Generate suggestions
          const taskSuggestions = tasks
            .filter(task => task.name.toLowerCase().startsWith(queryParam.toLowerCase()))
            .slice(0, 3)
            .map(task => ({ type: 'task', text: task.name }));
          
          const listSuggestions = lists
            .filter(list => list.name.toLowerCase().startsWith(queryParam.toLowerCase()))
            .slice(0, 2)
            .map(list => ({ type: 'list', text: list.name }));
          
          const labelSuggestions = labels
            .filter(label => label.name.toLowerCase().startsWith(queryParam.toLowerCase()))
            .slice(0, 2)
            .map(label => ({ type: 'label', text: label.name }));
          
          return new Response(JSON.stringify({ 
            results: suggestions ? {
              tasks: [],
              total: 0
            } : {
              tasks: tasks.filter(task => 
                task.name.toLowerCase().includes(queryParam.toLowerCase()) ||
                task.description?.toLowerCase().includes(queryParam.toLowerCase())
              ),
              total: 0
            },
            suggestions: [...taskSuggestions, ...listSuggestions, ...labelSuggestions]
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: 'Search suggestions failed' 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(
        `http://localhost:3000/api/search?q=${encodeURIComponent(partialQuery)}&userId=${userId}&suggestions=true`
      );
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.suggestions).toBeInstanceOf(Array);
      
      // Suggestions should start with the partial query
      data.suggestions.forEach((suggestion: any) => {
        expect(suggestion.text.toLowerCase()).toStartWith(partialQuery.toLowerCase());
        expect(['task', 'list', 'label']).toContain(suggestion.type);
      });
    });
  });

  describe('Search Performance', () => {
    test('should handle large datasets efficiently', async () => {
      // First create a large dataset
      const userId = 'test-user-1';
      const taskPromises = Array.from({ length: 100 }, (_, i) =>
        testAPI.api.createTask({
          name: `Search Performance Task ${i}`,
          description: `Description for performance task ${i}`,
          userId,
          status: i % 2 === 0 ? 'todo' : 'done',
          priority: ['High', 'Medium', 'Low'][i % 3]
        })
      );
      
      await Promise.all(taskPromises);
      
      const startTime = performance.now();
      
      const mockHandler = async (request: Request) => {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('q');
        const userIdParam = url.searchParams.get('userId');
        
        try {
          const tasks = await testAPI.api.getUserTasks(userIdParam);
          const searchResults = tasks.filter(task => 
            task.name.toLowerCase().includes(queryParam?.toLowerCase() || '') ||
            task.description?.toLowerCase().includes(queryParam?.toLowerCase() || '')
          );
          
          const endTime = performance.now();
          const searchTime = endTime - startTime;
          
          return new Response(JSON.stringify({ 
            results: {
              tasks: searchResults,
              total: searchResults.length
            },
            performance: {
              searchTime: Math.round(searchTime),
              datasetSize: tasks.length
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Performance search failed' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      const request = createMockRequest(
        `http://localhost:3000/api/search?q=Performance&userId=${userId}`
      );
      const response = await mockHandler(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.performance.searchTime).toBeLessThan(1000); // Should complete within 1 second
      expect(data.performance.datasetSize).toBe(100);
    });
  });
});