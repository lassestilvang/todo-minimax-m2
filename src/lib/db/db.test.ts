/**
 * Database Layer Tests
 * Tests for database operations, schema validation, and data integrity
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import Database from 'better-sqlite3';
import { 
  createTestDatabaseAPI, 
  DatabaseTestHelpers,
  TestDataFixtures 
} from './api';
import { 
  createTaskSchema,
  createListSchema,
  createLabelSchema 
} from './schema';
import { 
  TaskId, 
  ListId, 
  LabelId, 
  ApiError 
} from '../../types/utils';
import { TEST_DATA } from '../../test/setup';

// Test database configuration
const TEST_DB_PATH = './test-data/db-test.db';

describe('Database Layer', () => {
  let testAPI: ReturnType<typeof createTestDatabaseAPI>;
  let dbHelper: DatabaseTestHelpers;

  beforeAll(async () => {
    // Set up test database
    testAPI = createTestDatabaseAPI({
      path: TEST_DB_PATH,
      verbose: false
    });
    
    dbHelper = testAPI.testHelpers;
    
    // Initialize database with schema
    await testAPI.api.runMigrations();
    await testAPI.api.getDatabase().initialize();
  });

  afterAll(async () => {
    // Cleanup test database
    await testAPI.testManager.cleanup();
  });

  describe('Database Schema', () => {
    test('should create tasks table with correct schema', () => {
      const schema = createTaskSchema();
      
      expect(schema.name).toBe('tasks');
      expect(schema.columns).toHaveProperty('id');
      expect(schema.columns).toHaveProperty('name');
      expect(schema.columns).toHaveProperty('user_id');
      expect(schema.columns).toHaveProperty('status');
      expect(schema.columns).toHaveProperty('priority');
      
      // Test column constraints
      expect(schema.columns.id.notNull).toBe(true);
      expect(schema.columns.name.notNull).toBe(true);
      expect(schema.columns.user_id.notNull).toBe(true);
    });

    test('should create lists table with correct schema', () => {
      const schema = createListSchema();
      
      expect(schema.name).toBe('lists');
      expect(schema.columns).toHaveProperty('id');
      expect(schema.columns).toHaveProperty('name');
      expect(schema.columns).toHaveProperty('user_id');
      expect(schema.columns).toHaveProperty('task_count');
      
      expect(schema.columns.id.notNull).toBe(true);
      expect(schema.columns.name.notNull).toBe(true);
      expect(schema.columns.user_id.notNull).toBe(true);
    });

    test('should create labels table with correct schema', () => {
      const schema = createLabelSchema();
      
      expect(schema.name).toBe('labels');
      expect(schema.columns).toHaveProperty('id');
      expect(schema.columns).toHaveProperty('name');
      expect(schema.columns).toHaveProperty('user_id');
      expect(schema.columns).toHaveProperty('color');
      expect(schema.columns).toHaveProperty('task_count');
    });
  });

  describe('Database API - Tasks', () => {
    const testUserId = 'test-user-1';
    const testListId = 'test-list-1';

    test('should create a new task', async () => {
      const taskData = {
        name: 'Test Task Creation',
        description: 'Testing task creation functionality',
        userId: testUserId,
        listId: testListId,
        status: 'todo' as const,
        priority: 'Medium' as const,
        date: new Date(),
        estimate: 60
      };

      const createdTask = await testAPI.api.createTask(taskData);
      
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      expect(createdTask.name).toBe(taskData.name);
      expect(createdTask.description).toBe(taskData.description);
      expect(createdTask.userId).toBe(testUserId);
      expect(createdTask.listId).toBe(testListId);
      expect(createdTask.status).toBe('todo');
      expect(createdTask.priority).toBe('Medium');
      expect(createdTask.createdAt).toBeInstanceOf(Date);
      expect(createdTask.updatedAt).toBeInstanceOf(Date);

      // Verify task exists in database
      const retrievedTask = await testAPI.api.getTaskWithDetails(createdTask.id);
      expect(retrievedTask).toEqual(createdTask);
    });

    test('should retrieve user tasks with filtering', async () => {
      // Create multiple tasks
      const task1 = await testAPI.api.createTask({
        name: 'High Priority Task',
        description: 'Test high priority',
        userId: testUserId,
        status: 'todo',
        priority: 'High'
      });

      const task2 = await testAPI.api.createTask({
        name: 'Medium Priority Task',
        description: 'Test medium priority',
        userId: testUserId,
        status: 'in-progress',
        priority: 'Medium'
      });

      // Test basic retrieval
      const allTasks = await testAPI.api.getUserTasks(testUserId);
      expect(allTasks).toHaveLength(2);
      expect(allTasks.map(t => t.id)).toContain(task1.id);
      expect(allTasks.map(t => t.id)).toContain(task2.id);

      // Test status filtering
      const todoTasks = await testAPI.api.getUserTasks(testUserId, {
        status: ['todo']
      });
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].id).toBe(task1.id);

      // Test priority filtering
      const highPriorityTasks = await testAPI.api.getUserTasks(testUserId, {
        priority: ['High']
      });
      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].id).toBe(task1.id);
    });

    test('should update existing task', async () => {
      // Create task first
      const task = await testAPI.api.createTask({
        name: 'Original Task',
        description: 'Original description',
        userId: testUserId,
        status: 'todo'
      });

      // Update task
      const updateData = {
        id: task.id,
        name: 'Updated Task Name',
        description: 'Updated description',
        status: 'in-progress',
        priority: 'High' as const
      };

      const updatedTask = await testAPI.api.updateTask(task.id, updateData, testUserId);
      
      expect(updatedTask.name).toBe('Updated Task Name');
      expect(updatedTask.description).toBe('Updated description');
      expect(updatedTask.status).toBe('in-progress');
      expect(updatedTask.priority).toBe('High');
      expect(updatedTask.updatedAt.getTime()).toBeGreaterThan(task.updatedAt.getTime());

      // Verify update in database
      const retrievedTask = await testAPI.api.getTaskWithDetails(task.id);
      expect(retrievedTask.name).toBe('Updated Task Name');
      expect(retrievedTask.description).toBe('Updated description');
    });

    test('should delete task', async () => {
      // Create task first
      const task = await testAPI.api.createTask({
        name: 'Task to Delete',
        userId: testUserId
      });

      // Verify task exists
      let retrievedTask = await testAPI.api.getTaskWithDetails(task.id);
      expect(retrievedTask).toBeDefined();

      // Delete task
      await testAPI.api.deleteTask(task.id, testUserId);

      // Verify task is deleted
      retrievedTask = await testAPI.api.getTaskWithDetails(task.id);
      expect(retrievedTask).toBeNull();
    });

    test('should handle task validation errors', async () => {
      // Test with invalid data
      await expect(testAPI.api.createTask({
        name: '', // Empty name should fail
        userId: testUserId
      })).rejects.toThrow();

      await expect(testAPI.api.createTask({
        name: 'Valid Name',
        userId: '', // Empty user ID should fail
      })).rejects.toThrow();
    });
  });

  describe('Database API - Lists', () => {
    const testUserId = 'test-user-1';

    test('should create a new list', async () => {
      const listData = {
        name: 'Test List',
        description: 'Testing list creation',
        userId: testUserId,
        color: '#3b82f6',
        icon: 'briefcase'
      };

      const createdList = await testAPI.api.createList(listData);
      
      expect(createdList).toBeDefined();
      expect(createdList.id).toBeDefined();
      expect(createdList.name).toBe(listData.name);
      expect(createdList.description).toBe(listData.description);
      expect(createdList.userId).toBe(testUserId);
      expect(createdList.color).toBe('#3b82f6');
      expect(createdList.icon).toBe('briefcase');
      expect(createdList.taskCount).toBe(0);

      // Verify list exists in database
      const retrievedList = await testAPI.api.getListWithDetails(createdList.id);
      expect(retrievedList).toEqual(createdList);
    });

    test('should retrieve user lists', async () => {
      // Create multiple lists
      const list1 = await testAPI.api.createList({
        name: 'Work List',
        userId: testUserId
      });

      const list2 = await testAPI.api.createList({
        name: 'Personal List',
        userId: testUserId
      });

      // Retrieve all lists
      const allLists = await testAPI.api.getUserLists(testUserId);
      expect(allLists).toHaveLength(2);
      expect(allLists.map(l => l.id)).toContain(list1.id);
      expect(allLists.map(l => l.id)).toContain(list2.id);
    });

    test('should update existing list', async () => {
      // Create list first
      const list = await testAPI.api.createList({
        name: 'Original List',
        description: 'Original description',
        userId: testUserId
      });

      // Update list
      const updateData = {
        id: list.id,
        name: 'Updated List Name',
        description: 'Updated description',
        color: '#10b981',
        icon: 'user'
      };

      const updatedList = await testAPI.api.updateList(list.id, updateData, testUserId);
      
      expect(updatedList.name).toBe('Updated List Name');
      expect(updatedList.description).toBe('Updated description');
      expect(updatedList.color).toBe('#10b981');
      expect(updatedList.icon).toBe('user');
    });

    test('should delete list', async () => {
      // Create list first
      const list = await testAPI.api.createList({
        name: 'List to Delete',
        userId: testUserId
      });

      // Verify list exists
      let retrievedList = await testAPI.api.getListWithDetails(list.id);
      expect(retrievedList).toBeDefined();

      // Delete list
      await testAPI.api.deleteList(list.id, testUserId);

      // Verify list is deleted
      retrievedList = await testAPI.api.getListWithDetails(list.id);
      expect(retrievedList).toBeNull();
    });
  });

  describe('Database API - Labels', () => {
    const testUserId = 'test-user-1';

    test('should create a new label', async () => {
      const labelData = {
        name: 'Test Label',
        color: '#ef4444',
        userId: testUserId
      };

      const createdLabel = await testAPI.api.createLabel(labelData);
      
      expect(createdLabel).toBeDefined();
      expect(createdLabel.id).toBeDefined();
      expect(createdLabel.name).toBe(labelData.name);
      expect(createdLabel.color).toBe(labelData.color);
      expect(createdLabel.userId).toBe(testUserId);
      expect(createdLabel.taskCount).toBe(0);
    });

    test('should retrieve user labels with counts', async () => {
      // Create labels
      const label1 = await testAPI.api.createLabel({
        name: 'Urgent',
        color: '#ef4444',
        userId: testUserId
      });

      const label2 = await testAPI.api.createLabel({
        name: 'Important',
        color: '#f59e0b',
        userId: testUserId
      });

      // Retrieve labels with counts
      const labels = await testAPI.api.getUserLabelsWithCounts(testUserId);
      expect(labels).toHaveLength(2);
      expect(labels.find(l => l.name === 'Urgent')).toBeDefined();
      expect(labels.find(l => l.name === 'Important')).toBeDefined();
    });

    test('should update existing label', async () => {
      // Create label first
      const label = await testAPI.api.createLabel({
        name: 'Original Label',
        color: '#6b7280',
        userId: testUserId
      });

      // Update label
      const updateData = {
        id: label.id,
        name: 'Updated Label Name',
        color: '#059669'
      };

      const updatedLabel = await testAPI.api.updateLabel(label.id, updateData, testUserId);
      
      expect(updatedLabel.name).toBe('Updated Label Name');
      expect(updatedLabel.color).toBe('#059669');
    });

    test('should delete label', async () => {
      // Create label first
      const label = await testAPI.api.createLabel({
        name: 'Label to Delete',
        color: '#6b7280',
        userId: testUserId
      });

      // Verify label exists
      let retrievedLabel = await testAPI.api.getLabelWithDetails(label.id);
      expect(retrievedLabel).toBeDefined();

      // Delete label
      await testAPI.api.deleteLabel(label.id, testUserId);

      // Verify label is deleted
      retrievedLabel = await testAPI.api.getLabelWithDetails(label.id);
      expect(retrievedLabel).toBeNull();
    });
  });

  describe('Database Integrity', () => {
    test('should maintain referential integrity', async () => {
      const userId = 'test-user-integrity';
      
      // Create a list
      const list = await testAPI.api.createList({
        name: 'Test List',
        userId
      });

      // Create a task associated with the list
      const task = await testAPI.api.createTask({
        name: 'Test Task',
        userId,
        listId: list.id
      });

      // Verify task can be retrieved with list
      const taskWithDetails = await testAPI.api.getTaskWithDetails(task.id);
      expect(taskWithDetails.list).toBeDefined();
      expect(taskWithDetails.list.id).toBe(list.id);

      // When list is deleted, task should handle the deletion appropriately
      await testAPI.api.deleteList(list.id, userId);

      // Task should no longer exist or have null list
      const deletedTask = await testAPI.api.getTaskWithDetails(task.id);
      expect(deletedTask).toBeNull();
    });

    test('should handle concurrent operations', async () => {
      const userId = 'test-user-concurrent';
      const tasks = [];

      // Create multiple tasks concurrently
      for (let i = 0; i < 10; i++) {
        tasks.push(testAPI.api.createTask({
          name: `Concurrent Task ${i}`,
          userId,
          status: 'todo'
        }));
      }

      const createdTasks = await Promise.all(tasks);
      expect(createdTasks).toHaveLength(10);

      // Verify all tasks were created
      const allTasks = await testAPI.api.getUserTasks(userId);
      expect(allTasks).toHaveLength(10);
    });
  });

  describe('Database Performance', () => {
    test('should handle large datasets efficiently', async () => {
      const userId = 'test-user-performance';
      const taskCount = 100;
      
      const startTime = Date.now();

      // Create many tasks
      const tasks = [];
      for (let i = 0; i < taskCount; i++) {
        tasks.push(testAPI.api.createTask({
          name: `Performance Task ${i}`,
          description: `Description for task ${i}`,
          userId,
          status: i % 3 === 0 ? 'done' : 'todo',
          priority: ['Low', 'Medium', 'High'][i % 3]
        }));
      }

      await Promise.all(tasks);
      
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test retrieval performance
      const retrievalStartTime = Date.now();
      const retrievedTasks = await testAPI.api.getUserTasks(userId);
      const retrievalTime = Date.now() - retrievalStartTime;

      expect(retrievedTasks).toHaveLength(taskCount);
      expect(retrievalTime).toBeLessThan(1000); // Should retrieve within 1 second
    });

    test('should handle complex queries efficiently', async () => {
      const userId = 'test-user-complex-queries';
      
      // Create test data
      await testAPI.api.createList({
        name: 'Work List',
        userId
      });

      await testAPI.api.createList({
        name: 'Personal List',
        userId
      });

      // Create tasks with various statuses and priorities
      const tasks = [
        { name: 'Task 1', status: 'todo', priority: 'High' },
        { name: 'Task 2', status: 'in-progress', priority: 'Medium' },
        { name: 'Task 3', status: 'done', priority: 'Low' },
        { name: 'Task 4', status: 'todo', priority: 'High' },
        { name: 'Task 5', status: 'done', priority: 'Medium' },
      ];

      for (const taskData of tasks) {
        await testAPI.api.createTask({
          ...taskData,
          userId
        });
      }

      // Test complex filtering
      const highPriorityTodos = await testAPI.api.getUserTasks(userId, {
        status: ['todo'],
        priority: ['High']
      });

      expect(highPriorityTodos).toHaveLength(2);
      highPriorityTodos.forEach(task => {
        expect(task.status).toBe('todo');
        expect(task.priority).toBe('High');
      });
    });
  });

  describe('Test Database Helpers', () => {
    test('should clean up test data properly', async () => {
      // Insert test data
      await testAPI.testHelpers.insertTestData(TEST_DATA);
      
      // Verify data exists
      const tasks = await testAPI.api.getUserTasks('test-user-1');
      expect(tasks.length).toBeGreaterThan(0);

      // Clean up
      await testAPI.testHelpers.cleanup();

      // Verify data is cleaned up
      const cleanedTasks = await testAPI.api.getUserTasks('test-user-1');
      expect(cleanedTasks).toHaveLength(0);
    });

    test('should handle integrity tests', async () => {
      const integrityResult = await testAPI.testHelpers.integrityTest();
      expect(integrityResult).toBeDefined();
      expect(integrityResult.status).toBe('ok');
    });
  });
});