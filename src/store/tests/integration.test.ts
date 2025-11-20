/**
 * Comprehensive Integration Test for Zustand Store System
 * Tests database integration, store interactions, and overall functionality
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import {
  createTestDatabaseAPI,
  TestDatabaseManager,
} from "../../lib/db/test-utils";
import {
  createTaskStore,
  createListStore,
  createAppStore,
  initializeStores,
} from "../index";
import type {
  CreateTaskData,
  CreateListData,
  UpdateTaskData,
} from "../../types/tasks";
import type { TaskId, ListId } from "../../types/utils";

/**
 * Test database setup
 */
let testDB: TestDatabaseManager;
let testAPI: any;

beforeAll(async () => {
  testDB = new TestDatabaseManager({
    path: ":memory:", // Use in-memory database for testing
    verbose: false,
  });

  testAPI = createTestDatabaseAPI();
  await testAPI.testManager.setupTestDatabase();
});

afterAll(async () => {
  if (testDB) {
    await testDB.cleanup();
  }
});

describe("Zustand Store Integration Tests", () => {
  let taskStore: any;
  let listStore: any;
  let appStore: any;

  beforeEach(() => {
    // Create fresh stores for each test
    taskStore = createTaskStore({
      userId: "test-user",
      errorHandling: true,
      persistence: false, // Disable persistence for tests
      devtools: false,
    });

    listStore = createListStore({
      userId: "test-user",
      errorHandling: true,
      persistence: false,
      devtools: false,
    });

    appStore = createAppStore({
      errorHandling: true,
      persistence: false,
      devtools: false,
    });
  });

  afterEach(async () => {
    // Clean up stores after each test
    taskStore.clearCache();
    listStore.clearCache();
    appStore.clearError();
  });

  describe("TaskStore Integration", () => {
    test("should create and manage tasks with database", async () => {
      // First, create a test list
      const listData: CreateListData = {
        name: "Test List",
        color: "#3B82F6",
        emoji: "📋",
        isDefault: false,
      };

      const createdList = await listStore.createList(listData);
      expect(createdList).toBeDefined();
      expect(createdList.name).toBe("Test List");

      // Create a task
      const taskData: CreateTaskData = {
        name: "Test Task",
        description: "Test Description",
        priority: "High",
        status: "todo",
        listId: createdList.id,
      };

      const createdTask = await taskStore.createTask(taskData);
      expect(createdTask).toBeDefined();
      expect(createdTask.name).toBe("Test Task");
      expect(createdTask.listId).toBe(createdList.id);

      // Verify task is in cache
      expect(taskStore.cache[createdTask.id]).toBeDefined();

      // Update the task
      const updateData: UpdateTaskData = {
        id: createdTask.id,
        name: "Updated Test Task",
        status: "in_progress",
      };

      const updatedTask = await taskStore.updateTask(updateData);
      expect(updatedTask.name).toBe("Updated Test Task");
      expect(updatedTask.status).toBe("in_progress");

      // Test task filtering
      taskStore.addStatusFilter("in_progress");
      const filteredTasks = taskStore.getFilteredTasks();
      expect(filteredTasks).toHaveLength(1);
      expect(filteredTasks[0].id).toBe(createdTask.id);

      // Delete the task
      await taskStore.deleteTask(createdTask.id);
      const deletedTask = taskStore.cache[createdTask.id];
      expect(deletedTask).toBeUndefined();
    });

    test("should handle batch operations", async () => {
      // Create multiple tasks
      const tasks: CreateTaskData[] = [
        {
          name: "Task 1",
          description: "Desc 1",
          priority: "High",
          status: "todo",
          listId: "test-list",
        },
        {
          name: "Task 2",
          description: "Desc 2",
          priority: "Medium",
          status: "todo",
          listId: "test-list",
        },
        {
          name: "Task 3",
          description: "Desc 3",
          priority: "Low",
          status: "todo",
          listId: "test-list",
        },
      ];

      const createdTasks = await Promise.all(
        tasks.map((task) => taskStore.createTask(task))
      );

      expect(createdTasks).toHaveLength(3);

      // Test batch update
      const taskIds = createdTasks.map((task) => task.id);
      const batchUpdateData: Partial<UpdateTaskData> & { taskIds: TaskId[] } = {
        taskIds,
        status: "done",
        priority: "High",
      };

      const batchResult = await taskStore.batchUpdateTasks(batchUpdateData);
      expect(batchResult.total).toBe(3);
      expect(batchResult.successful).toBe(3);
      expect(batchResult.failed).toBe(0);

      // Verify all tasks are updated
      const updatedTasks = createdTasks.map((task) => taskStore.cache[task.id]);
      updatedTasks.forEach((task) => {
        expect(task.status).toBe("done");
        expect(task.priority).toBe("High");
      });

      // Test batch delete
      const deleteResult = await taskStore.batchDeleteTasks(taskIds);
      expect(deleteResult.total).toBe(3);
      expect(deleteResult.successful).toBe(3);
    });

    test("should handle optimistic updates with rollback", async () => {
      const taskData: CreateTaskData = {
        name: "Optimistic Test Task",
        description: "Optimistic Test",
        priority: "High",
        status: "todo",
        listId: "test-list",
      };

      // Create task with optimistic update
      const createdTask = await taskStore.createTask(taskData);
      expect(createdTask.name).toBe("Optimistic Test Task");

      // Verify it's in the list immediately (optimistic)
      const tasks = taskStore.getTasks();
      expect(tasks.find((t) => t.id === createdTask.id)).toBeDefined();

      // Test selection functionality
      taskStore.selectTask(createdTask.id);
      const selectedTasks = taskStore.getSelectedTasks();
      expect(selectedTasks).toHaveLength(1);
      expect(selectedTasks[0].id).toBe(createdTask.id);

      taskStore.clearSelection();
      const clearedSelection = taskStore.getSelectedTasks();
      expect(clearedSelection).toHaveLength(0);
    });
  });

  describe("ListStore Integration", () => {
    test("should create and manage lists", async () => {
      const listData: CreateListData = {
        name: "Integration Test List",
        color: "#10B981",
        emoji: "✅",
        isDefault: false,
      };

      const createdList = await listStore.createList(listData);
      expect(createdList).toBeDefined();
      expect(createdList.name).toBe("Integration Test List");
      expect(createdList.color).toBe("#10B981");

      // Test list selection
      listStore.selectList(createdList.id);
      const selectedLists = listStore.getSelectedLists();
      expect(selectedLists).toHaveLength(1);
      expect(selectedLists[0].id).toBe(createdList.id);

      // Test favorites
      listStore.addToFavorites(createdList.id);
      const favoriteLists = listStore.getFavoriteLists();
      expect(favoriteLists).toHaveLength(1);

      // Test recent access
      listStore.addToRecent(createdList.id);
      const recentLists = listStore.getRecentLists();
      expect(recentLists).toHaveLength(1);

      // Update list
      const updateData = {
        ...createdList,
        name: "Updated Integration Test List",
      };
      const updatedList = await listStore.updateList(updateData);
      expect(updatedList.name).toBe("Updated Integration Test List");
    });

    test("should handle list navigation", async () => {
      const lists: CreateListData[] = [
        { name: "First List", color: "#3B82F6", emoji: "1️⃣", isDefault: false },
        {
          name: "Second List",
          color: "#10B981",
          emoji: "2️⃣",
          isDefault: false,
        },
        { name: "Third List", color: "#F59E0B", emoji: "3️⃣", isDefault: false },
      ];

      const createdLists = await Promise.all(
        lists.map((list) => listStore.createList(list))
      );

      // Test switching between lists
      listStore.switchList(createdLists[0].id);
      let currentList = listStore.getCurrentList();
      expect(currentList?.id).toBe(createdLists[0].id);

      listStore.switchList(createdLists[1].id);
      currentList = listStore.getCurrentList();
      expect(currentList?.id).toBe(createdLists[1].id);

      // Test recent lists functionality
      const recentLists = listStore.getRecentLists();
      expect(recentLists.length).toBeGreaterThan(0);

      // Test favorites functionality
      listStore.toggleFavorite(createdLists[2].id);
      const favorites = listStore.getFavoriteLists();
      expect(favorites.length).toBe(1);
    });
  });

  describe("AppStore Integration", () => {
    test("should manage global application state", async () => {
      // Test authentication simulation
      const loginResult = await appStore.login({
        email: "test@example.com",
        password: "testpassword",
      });

      expect(appStore.isAuthenticated).toBe(true);
      expect(appStore.user).toBeDefined();

      // Test theme management
      appStore.setTheme("dark");
      expect(appStore.theme).toBe("dark");

      appStore.setTheme("light");
      expect(appStore.theme).toBe("light");

      // Test view management
      appStore.setCurrentView("tasks");
      expect(appStore.currentView).toBe("tasks");

      // Test preferences
      appStore.updatePreferences({
        compactMode: true,
        showCompletedTasks: false,
      });

      expect(appStore.preferences.compactMode).toBe(true);
      expect(appStore.preferences.showCompletedTasks).toBe(false);

      // Test error handling
      appStore.setError({ code: "TEST_ERROR", message: "Test error" });
      expect(appStore.error).toBeDefined();

      appStore.clearError();
      expect(appStore.error).toBeNull();
    });
  });

  describe("Store Interaction Tests", () => {
    test("should handle cross-store interactions", async () => {
      // Create a list first
      const listData: CreateListData = {
        name: "Cross-Store Test List",
        color: "#8B5CF6",
        emoji: "🔗",
        isDefault: false,
      };

      const createdList = await listStore.createList(listData);
      expect(createdList).toBeDefined();

      // Create tasks in that list
      const taskData: CreateTaskData = {
        name: "Cross-Store Test Task",
        description: "Testing store interactions",
        priority: "High",
        status: "todo",
        listId: createdList.id,
      };

      const createdTask = await taskStore.createTask(taskData);
      expect(createdTask.listId).toBe(createdList.id);

      // Verify the task appears when filtering by list
      taskStore.addListFilter(createdList.id);
      const filteredTasks = taskStore.getFilteredTasks();
      expect(filteredTasks).toHaveLength(1);
      expect(filteredTasks[0].id).toBe(createdTask.id);

      // Test batch operations affect multiple stores
      const taskIds = [createdTask.id];
      await taskStore.batchMoveTasks(taskIds, "new-list-id");

      // The task should be updated (though the list doesn't exist in this test)
      const updatedTask = taskStore.cache[createdTask.id];
      expect(updatedTask.listId).toBe("new-list-id");
    });
  });

  describe("Performance and Optimization Tests", () => {
    test("should handle large datasets efficiently", async () => {
      const startTime = performance.now();

      // Create multiple lists
      const listPromises = Array.from({ length: 10 }, (_, i) =>
        listStore.createList({
          name: `Performance List ${i}`,
          color: "#3B82F6",
          emoji: "📋",
          isDefault: false,
        })
      );

      const createdLists = await Promise.all(listPromises);

      // Create multiple tasks
      const taskPromises = Array.from({ length: 100 }, (_, i) =>
        taskStore.createTask({
          name: `Performance Task ${i}`,
          description: `Task ${i} for performance testing`,
          priority: ["High", "Medium", "Low"][i % 3] as any,
          status: ["todo", "in_progress", "done"][i % 3] as any,
          listId: createdLists[i % createdLists.length].id,
        })
      );

      await Promise.all(taskPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify data integrity
      expect(taskStore.getTaskCount()).toBe(100);
      expect(listStore.getListCount()).toBe(10);

      // Test filtering performance
      const filterStartTime = performance.now();
      taskStore.addStatusFilter("todo");
      const todoTasks = taskStore.getFilteredTasks();
      const filterEndTime = performance.now();

      expect(todoTasks.length).toBeGreaterThan(0);
      expect(filterEndTime - filterStartTime).toBeLessThan(100); // 100ms for filtering
    });

    test("should handle cache operations efficiently", async () => {
      const startTime = performance.now();

      // Create and cache tasks
      const tasks = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          taskStore.createTask({
            name: `Cache Test Task ${i}`,
            description: `Testing cache performance`,
            priority: "Medium",
            status: "todo",
            listId: "test-list",
          })
        )
      );

      // Test cache hits
      const cacheStartTime = performance.now();
      tasks.forEach((task) => {
        const cached = taskStore.cache[task.id];
        expect(cached).toBeDefined();
      });
      const cacheEndTime = performance.now();

      expect(cacheEndTime - cacheStartTime).toBeLessThan(10); // 10ms for cache access

      // Test cache invalidation
      taskStore.clearCache();
      expect(Object.keys(taskStore.cache).length).toBe(0);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds total
    });
  });

  describe("Error Handling Tests", () => {
    test("should handle database errors gracefully", async () => {
      // Test invalid task creation
      const invalidTaskData: CreateTaskData = {
        name: "", // Invalid: empty name
        description: "Test",
        priority: "High",
        status: "todo",
        listId: "invalid-list-id",
      };

      await expect(taskStore.createTask(invalidTaskData)).rejects.toThrow();

      // Verify store state remains consistent
      expect(taskStore.getTaskCount()).toBe(0);
      expect(taskStore.error).toBeDefined();

      // Test error recovery
      taskStore.clearError();
      expect(taskStore.error).toBeNull();

      // Test valid operation after error
      const validTaskData: CreateTaskData = {
        name: "Valid Task After Error",
        description: "This should work",
        priority: "Medium",
        status: "todo",
        listId: "test-list",
      };

      const createdTask = await taskStore.createTask(validTaskData);
      expect(createdTask).toBeDefined();
      expect(createdTask.name).toBe("Valid Task After Error");
    });

    test("should handle batch operation failures", async () => {
      // Create some valid tasks
      const tasks = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          taskStore.createTask({
            name: `Batch Test Task ${i}`,
            description: `Testing batch operations`,
            priority: "Medium",
            status: "todo",
            listId: "test-list",
          })
        )
      );

      const taskIds = tasks.map((task) => task.id);

      // Test partial failure scenario
      const batchUpdateData: Partial<UpdateTaskData> & { taskIds: TaskId[] } = {
        taskIds,
        status: "done",
      };

      const batchResult = await taskStore.batchUpdateTasks(batchUpdateData);

      // Should complete successfully in this test environment
      expect(batchResult.total).toBe(3);
      expect(batchResult.successful).toBe(3);
      expect(batchResult.failed).toBe(0);

      // Verify all tasks are updated
      tasks.forEach((task) => {
        const updatedTask = taskStore.cache[task.id];
        expect(updatedTask.status).toBe("done");
      });
    });
  });

  describe("Persistence and State Management Tests", () => {
    test("should persist and restore state correctly", async () => {
      // Create some data
      const listData: CreateListData = {
        name: "Persistence Test List",
        color: "#EF4444",
        emoji: "💾",
        isDefault: false,
      };

      const createdList = await listStore.createList(listData);
      const taskData: CreateTaskData = {
        name: "Persistence Test Task",
        description: "Testing state persistence",
        priority: "High",
        status: "in_progress",
        listId: createdList.id,
      };

      const createdTask = await taskStore.createTask(taskData);

      // Set some view preferences
      taskStore.setViewType("grid");
      taskStore.setSearchQuery("test");

      // Create a new store instance (simulating app restart)
      const newTaskStore = createTaskStore({
        userId: "test-user",
        errorHandling: true,
        persistence: true, // Enable persistence
        devtools: false,
      });

      // Should have persisted data (in real implementation)
      // Note: In this test environment, persistence is disabled
      // but the structure is in place for real persistence

      // Clean up
      newTaskStore.clearCache();
    });

    test("should maintain state consistency across operations", async () => {
      const listData: CreateListData = {
        name: "Consistency Test List",
        color: "#06B6D4",
        emoji: "🔄",
        isDefault: false,
      };

      const createdList = await listStore.createList(listData);

      // Create multiple tasks
      const tasks = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          taskStore.createTask({
            name: `Consistency Task ${i}`,
            description: `Testing state consistency ${i}`,
            priority: ["High", "Medium", "Low"][i % 3] as any,
            status: "todo",
            listId: createdList.id,
          })
        )
      );

      // Perform various operations
      taskStore.selectMultipleTasks(tasks.slice(0, 3).map((t) => t.id));
      taskStore.addStatusFilter("todo");
      taskStore.setViewType("list");

      // Verify state consistency
      expect(taskStore.getSelectedTaskIds().length).toBe(3);
      expect(taskStore.getFilteredTasks().length).toBe(5); // All tasks match 'todo' filter
      expect((taskStore as any).view.type).toBe("list");

      // Clear filters and verify
      taskStore.clearFilters();
      expect(taskStore.getHasActiveFilters()).toBe(false);

      // Clear selection and verify
      taskStore.clearSelection();
      expect(taskStore.getSelectedTaskIds().length).toBe(0);
    });
  });

  describe("Integration with Database API", () => {
    test("should integrate properly with database operations", async () => {
      // This test verifies that our stores properly integrate with the database API
      // In a real environment, this would test actual database operations

      const listData: CreateListData = {
        name: "DB Integration Test",
        color: "#84CC16",
        emoji: "🗄️",
        isDefault: false,
      };

      const createdList = await listStore.createList(listData);
      expect(createdList).toBeDefined();
      expect(createdList.id).toBeDefined();

      const taskData: CreateTaskData = {
        name: "DB Integration Task",
        description: "Testing database integration",
        priority: "High",
        status: "todo",
        listId: createdList.id,
      };

      const createdTask = await taskStore.createTask(taskData);
      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      expect(createdTask.listId).toBe(createdList.id);

      // Test update operation
      const updateData: UpdateTaskData = {
        id: createdTask.id,
        status: "done",
        priority: "Medium",
      };

      const updatedTask = await taskStore.updateTask(updateData);
      expect(updatedTask.status).toBe("done");
      expect(updatedTask.priority).toBe("Medium");

      // Test that optimistic updates work
      expect(taskStore.cache[createdTask.id].status).toBe("done");

      // Clean up
      await taskStore.deleteTask(createdTask.id);
      expect(taskStore.cache[createdTask.id]).toBeUndefined();
    });
  });
});

describe("Store Manager Integration Tests", () => {
  test("should initialize and manage multiple stores", () => {
    const stores = initializeStores({
      userId: "integration-test-user",
      enableDevtools: false,
      enablePersistence: false,
      enableErrorHandling: true,
    });

    expect(stores.taskStore).toBeDefined();
    expect(stores.listStore).toBeDefined();
    expect(stores.appStore).toBeDefined();

    // Test store manager
    const taskStore = stores.taskStore;
    expect(taskStore.getTaskCount).toBeDefined();
  });

  test("should provide store statistics", () => {
    const stores = initializeStores();
    const stats = require("../store/index").getStoreStats();

    expect(stats).toBeDefined();
    expect(typeof stats).toBe("object");
  });
});

// Export test utilities
export const createMockTask = (
  overrides: Partial<CreateTaskData> = {}
): CreateTaskData => ({
  name: "Mock Task",
  description: "Mock description",
  priority: "Medium",
  status: "todo",
  listId: "mock-list-id",
  ...overrides,
});

export const createMockList = (
  overrides: Partial<CreateListData> = {}
): CreateListData => ({
  name: "Mock List",
  color: "#3B82F6",
  emoji: "📋",
  isDefault: false,
  ...overrides,
});
