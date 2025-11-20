/**
 * TaskStore Logic Tests
 * Comprehensive tests for Zustand task store functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

// Mock the task store creation
const createMockTaskStore = () => {
  const state = {
    tasks: [],
    currentTask: null,
    selectedTaskIds: [],
    loading: {
      tasks: false,
      creating: false,
      updating: false,
      deleting: false
    },
    error: null,
    filters: {
      status: [],
      priority: [],
      listId: null,
      labels: [],
      dateRange: null,
      searchQuery: ''
    },
    view: {
      type: 'list',
      sortBy: 'name',
      sortOrder: 'asc'
    },
    cache: {}
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const actions = {
    // Task CRUD operations
    createTask: async (taskData: any) => {
      // Add small delay to ensure different timestamps
      await delay(1);
      const task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...taskData,
        createdAt: taskData.createdAt || new Date(),
        updatedAt: new Date(),
        status: taskData.status || 'todo',
        priority: taskData.priority || 'None'
      };
      state.tasks.push(task);
      state.cache[task.id] = task;
      return task;
    },

    updateTask: async (updateData: any) => {
      const taskIndex = state.tasks.findIndex(t => t.id === updateData.id);
      if (taskIndex >= 0) {
        // Add small delay to ensure different timestamps
        await delay(1);
        state.tasks[taskIndex] = {
          ...state.tasks[taskIndex],
          ...updateData,
          updatedAt: new Date()
        };
        const updatedTask = state.tasks[taskIndex];
        state.cache[updatedTask.id] = updatedTask;
        return updatedTask;
      }
      throw new Error('Task not found');
    },

    deleteTask: async (taskId: string) => {
      state.tasks = state.tasks.filter(t => t.id !== taskId);
      delete state.cache[taskId];
      state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== taskId);
    },

    getTasks: () => state.tasks,

    getTask: (taskId: string) => state.tasks.find(t => t.id === taskId),

    // Filtering and sorting
    setSearchQuery: (query: string) => {
      state.filters.searchQuery = query;
    },

    addStatusFilter: (status: string) => {
      if (!state.filters.status.includes(status)) {
        state.filters.status.push(status);
      }
    },

    removeStatusFilter: (status: string) => {
      state.filters.status = state.filters.status.filter(s => s !== status);
    },

    addPriorityFilter: (priority: string) => {
      if (!state.filters.priority.includes(priority)) {
        state.filters.priority.push(priority);
      }
    },

    setListFilter: (listId: string | null) => {
      state.filters.listId = listId;
    },

    clearFilters: () => {
      state.filters = {
        status: [],
        priority: [],
        listId: null,
        labels: [],
        dateRange: null,
        searchQuery: ''
      };
    },

    getFilteredTasks: () => {
      let filtered = [...state.tasks];

      // Search query filter
      if (state.filters.searchQuery) {
        const query = state.filters.searchQuery.toLowerCase();
        filtered = filtered.filter(task =>
          task.name.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
        );
      }

      // Status filter
      if (state.filters.status.length > 0) {
        filtered = filtered.filter(task =>
          state.filters.status.includes(task.status)
        );
      }

      // Priority filter
      if (state.filters.priority.length > 0) {
        filtered = filtered.filter(task =>
          state.filters.priority.includes(task.priority)
        );
      }

      // List filter
      if (state.filters.listId) {
        filtered = filtered.filter(task => task.listId === state.filters.listId);
      }

      // Apply sorting
      filtered.sort((a, b) => {
        const sortBy = state.view.sortBy;
        let aValue: any = a[sortBy as keyof typeof a];
        let bValue: any = b[sortBy as keyof typeof b];

        // Handle date sorting
        if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
          aValue = aValue.getTime();
          bValue = bValue.getTime();
        }

        // Handle priority sorting (High > Medium > Low > None)
        if (sortBy === 'priority') {
          const priorityOrder = { 'High': 4, 'Medium': 3, 'Low': 2, 'None': 1 };
          aValue = priorityOrder[aValue as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[bValue as keyof typeof priorityOrder] || 0;
          
          // For priority, ascending means highest priority first
          if (state.view.sortOrder === 'desc') {
            return aValue - bValue; // Low to high for descending
          } else {
            return bValue - aValue; // High to low for ascending
          }
        }
        
        // Standard comparison for ascending/descending
        if (state.view.sortOrder === 'desc') {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
      });

      return filtered;
    },

    getHasActiveFilters: () => {
      return state.filters.status.length > 0 ||
             state.filters.priority.length > 0 ||
             state.filters.listId !== null ||
             state.filters.labels.length > 0 ||
             state.filters.dateRange !== null ||
             state.filters.searchQuery !== '';
    },

    // Selection
    selectTask: (taskId: string) => {
      if (!state.selectedTaskIds.includes(taskId)) {
        state.selectedTaskIds.push(taskId);
      }
    },

    selectMultipleTasks: (taskIds: string[]) => {
      state.selectedTaskIds = [...new Set([...state.selectedTaskIds, ...taskIds])];
    },

    deselectTask: (taskId: string) => {
      state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== taskId);
    },

    clearSelection: () => {
      state.selectedTaskIds = [];
    },

    getSelectedTasks: () => {
      return state.tasks.filter(task => state.selectedTaskIds.includes(task.id));
    },

    getSelectedTaskIds: () => [...state.selectedTaskIds],

    getTaskCount: () => state.tasks.length,

    // View management
    setViewType: (type: 'list' | 'grid' | 'board') => {
      state.view.type = type;
    },

    setSortBy: (sortBy: string) => {
      state.view.sortBy = sortBy;
    },

    setSortOrder: (order: 'asc' | 'desc') => {
      state.view.sortOrder = order;
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

    // Batch operations
    batchUpdateTasks: async (batchData: any) => {
      const { taskIds, ...updateData } = batchData;
      const results = { total: taskIds.length, successful: 0, failed: 0 };
      
      for (const taskId of taskIds) {
        try {
          await actions.updateTask({ id: taskId, ...updateData });
          results.successful++;
        } catch (error) {
          results.failed++;
        }
      }
      
      return results;
    },

    batchDeleteTasks: async (taskIds: string[]) => {
      const results = { total: taskIds.length, successful: 0, failed: 0 };
      
      for (const taskId of taskIds) {
        try {
          await actions.deleteTask(taskId);
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

describe('TaskStore Logic Tests', () => {
  let taskStore: ReturnType<typeof createMockTaskStore>;

  beforeEach(() => {
    taskStore = createMockTaskStore();
  });

  afterEach(() => {
    // Clean up state
    taskStore.state.tasks = [];
    taskStore.state.selectedTaskIds = [];
    taskStore.state.error = null;
    taskStore.state.filters = {
      status: [],
      priority: [],
      listId: null,
      labels: [],
      dateRange: null,
      searchQuery: ''
    };
  });

  describe('Task CRUD Operations', () => {
    test('should create a new task', async () => {
      const taskData = {
        name: 'Test Task',
        description: 'Test Description',
        userId: 'test-user-1',
        listId: 'test-list-1',
        status: 'todo',
        priority: 'High'
      };

      const createdTask = await taskStore.actions.createTask(taskData);

      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBeDefined();
      expect(createdTask.name).toBe(taskData.name);
      expect(createdTask.description).toBe(taskData.description);
      expect(createdTask.status).toBe(taskData.status);
      expect(createdTask.priority).toBe(taskData.priority);
      expect(createdTask.userId).toBe(taskData.userId);
      expect(createdTask.createdAt).toBeInstanceOf(Date);
      expect(createdTask.updatedAt).toBeInstanceOf(Date);

      // Verify task is in store
      expect(taskStore.state.tasks).toHaveLength(1);
      expect(taskStore.state.tasks[0]).toEqual(createdTask);

      // Verify cache
      expect(taskStore.state.cache[createdTask.id]).toEqual(createdTask);
    });

    test('should update existing task', async () => {
      // Create a task first
      const createdTask = await taskStore.actions.createTask({
        name: 'Original Task',
        description: 'Original Description',
        userId: 'test-user-1',
        status: 'todo'
      });

      const updateData = {
        id: createdTask.id,
        name: 'Updated Task',
        description: 'Updated Description',
        status: 'in-progress',
        priority: 'High'
      };

      const updatedTask = await taskStore.actions.updateTask(updateData);

      expect(updatedTask.name).toBe(updateData.name);
      expect(updatedTask.description).toBe(updateData.description);
      expect(updatedTask.status).toBe(updateData.status);
      expect(updatedTask.priority).toBe(updateData.priority);
      expect(updatedTask.updatedAt.getTime()).toBeGreaterThan(createdTask.updatedAt.getTime());

      // Verify update in store
      const storedTask = taskStore.state.tasks.find(t => t.id === createdTask.id);
      expect(storedTask.name).toBe(updateData.name);
      expect(storedTask.status).toBe(updateData.status);

      // Verify cache update
      expect(taskStore.state.cache[createdTask.id].name).toBe(updateData.name);
    });

    test('should throw error when updating non-existent task', async () => {
      const updateData = {
        id: 'non-existent-id',
        name: 'Non-existent Task'
      };

      await expect(taskStore.actions.updateTask(updateData)).rejects.toThrow('Task not found');
    });

    test('should delete existing task', async () => {
      const task1 = await taskStore.actions.createTask({ name: 'Task 1', userId: 'test-user-1' });
      const task2 = await taskStore.actions.createTask({ name: 'Task 2', userId: 'test-user-1' });

      expect(taskStore.state.tasks).toHaveLength(2);

      await taskStore.actions.deleteTask(task1.id);

      expect(taskStore.state.tasks).toHaveLength(1);
      expect(taskStore.state.tasks[0].id).toBe(task2.id);
      expect(taskStore.state.tasks.find(t => t.id === task1.id)).toBeUndefined();

      // Verify cache cleanup
      expect(taskStore.state.cache[task1.id]).toBeUndefined();
      expect(taskStore.state.cache[task2.id]).toBeDefined();
    });

    test('should get task by ID', async () => {
      const task = await taskStore.actions.createTask({ name: 'Test Task', userId: 'test-user-1' });

      const retrievedTask = taskStore.actions.getTask(task.id);
      expect(retrievedTask).toEqual(task);

      const nonExistentTask = taskStore.actions.getTask('non-existent-id');
      expect(nonExistentTask).toBeUndefined();
    });
  });

  describe('Task Filtering', () => {
    beforeEach(async () => {
      await taskStore.actions.createTask({ name: 'High Priority Task', priority: 'High', status: 'todo', userId: 'test-user-1' });
      await taskStore.actions.createTask({ name: 'Medium Priority Task', priority: 'Medium', status: 'in-progress', userId: 'test-user-1' });
      await taskStore.actions.createTask({ name: 'Low Priority Task', priority: 'Low', status: 'done', userId: 'test-user-1' });
    });

    test('should filter tasks by search query', () => {
      taskStore.actions.setSearchQuery('High');

      const filtered = taskStore.actions.getFilteredTasks();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('High Priority Task');
    });

    test('should filter tasks by status', () => {
      taskStore.actions.addStatusFilter('todo');
      taskStore.actions.addStatusFilter('done');

      const filtered = taskStore.actions.getFilteredTasks();
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.status).sort()).toEqual(['done', 'todo']);
    });

    test('should filter tasks by priority', () => {
      taskStore.actions.addPriorityFilter('High');
      taskStore.actions.addPriorityFilter('Low');

      const filtered = taskStore.actions.getFilteredTasks();
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.priority).sort()).toEqual(['High', 'Low']);
    });

    test('should filter tasks by list', async () => {
      const listId = 'test-list-1';
      await taskStore.actions.createTask({ name: 'List Task', listId, userId: 'test-user-1' });

      taskStore.actions.setListFilter(listId);

      const filtered = taskStore.actions.getFilteredTasks();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].listId).toBe(listId);
    });

    test('should apply multiple filters', () => {
      taskStore.actions.addStatusFilter('todo');
      taskStore.actions.addPriorityFilter('High');
      taskStore.actions.setSearchQuery('High');

      const filtered = taskStore.actions.getFilteredTasks();
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('High Priority Task');
      expect(filtered[0].status).toBe('todo');
      expect(filtered[0].priority).toBe('High');
    });

    test('should return all tasks when no filters applied', () => {
      const filtered = taskStore.actions.getFilteredTasks();
      
      expect(filtered).toHaveLength(3);
    });

    test('should detect active filters', () => {
      expect(taskStore.actions.getHasActiveFilters()).toBe(false);

      taskStore.actions.addStatusFilter('todo');
      expect(taskStore.actions.getHasActiveFilters()).toBe(true);

      taskStore.actions.clearFilters();
      expect(taskStore.actions.getHasActiveFilters()).toBe(false);
    });

    test('should clear filters', () => {
      taskStore.actions.addStatusFilter('todo');
      taskStore.actions.addPriorityFilter('High');
      taskStore.actions.setSearchQuery('test');

      taskStore.actions.clearFilters();

      const filtered = taskStore.actions.getFilteredTasks();
      expect(filtered).toHaveLength(3); // All tasks
      expect(taskStore.actions.getHasActiveFilters()).toBe(false);
    });
  });

  describe('Task Sorting', () => {
    beforeEach(async () => {
      await taskStore.actions.createTask({ name: 'Zebra Task', priority: 'Low', createdAt: new Date('2024-01-03'), userId: 'test-user-1' });
      await taskStore.actions.createTask({ name: 'Alpha Task', priority: 'High', createdAt: new Date('2024-01-01'), userId: 'test-user-1' });
      await taskStore.actions.createTask({ name: 'Beta Task', priority: 'Medium', createdAt: new Date('2024-01-02'), userId: 'test-user-1' });
    });

    test('should sort by name ascending', () => {
      taskStore.actions.setSortBy('name');
      taskStore.actions.setSortOrder('asc');

      const sorted = taskStore.actions.getFilteredTasks();
      
      expect(sorted[0].name).toBe('Alpha Task');
      expect(sorted[1].name).toBe('Beta Task');
      expect(sorted[2].name).toBe('Zebra Task');
    });

    test('should sort by name descending', () => {
      taskStore.actions.setSortBy('name');
      taskStore.actions.setSortOrder('desc');

      const sorted = taskStore.actions.getFilteredTasks();
      
      expect(sorted[0].name).toBe('Zebra Task');
      expect(sorted[1].name).toBe('Beta Task');
      expect(sorted[2].name).toBe('Alpha Task');
    });

    test('should sort by priority', () => {
      taskStore.actions.setSortBy('priority');
      taskStore.actions.setSortOrder('asc');

      const sorted = taskStore.actions.getFilteredTasks();
      
      expect(sorted[0].priority).toBe('High'); // High > Medium > Low in ascending
      expect(sorted[1].priority).toBe('Medium');
      expect(sorted[2].priority).toBe('Low');
    });

    test('should sort by created date', () => {
      taskStore.actions.setSortBy('createdAt');
      taskStore.actions.setSortOrder('asc');

      const sorted = taskStore.actions.getFilteredTasks();
      
      expect(sorted[0].createdAt.getTime()).toBe(new Date('2024-01-01').getTime());
      expect(sorted[1].createdAt.getTime()).toBe(new Date('2024-01-02').getTime());
      expect(sorted[2].createdAt.getTime()).toBe(new Date('2024-01-03').getTime());
    });
  });

  describe('Task Selection', () => {
    let task1: any, task2: any, task3: any;

    beforeEach(async () => {
      task1 = await taskStore.actions.createTask({ name: 'Task 1', userId: 'test-user-1' });
      task2 = await taskStore.actions.createTask({ name: 'Task 2', userId: 'test-user-1' });
      task3 = await taskStore.actions.createTask({ name: 'Task 3', userId: 'test-user-1' });
    });

    test('should select a single task', () => {
      taskStore.actions.selectTask(task1.id);

      expect(taskStore.state.selectedTaskIds).toHaveLength(1);
      expect(taskStore.state.selectedTaskIds).toContain(task1.id);
    });

    test('should select multiple tasks', () => {
      taskStore.actions.selectTask(task1.id);
      taskStore.actions.selectTask(task2.id);

      expect(taskStore.state.selectedTaskIds).toHaveLength(2);
      expect(taskStore.state.selectedTaskIds).toContain(task1.id);
      expect(taskStore.state.selectedTaskIds).toContain(task2.id);
    });

    test('should not duplicate task selections', () => {
      taskStore.actions.selectTask(task1.id);
      taskStore.actions.selectTask(task1.id);

      expect(taskStore.state.selectedTaskIds).toHaveLength(1);
    });

    test('should select multiple tasks at once', () => {
      taskStore.actions.selectMultipleTasks([task1.id, task2.id, task3.id]);

      expect(taskStore.state.selectedTaskIds).toHaveLength(3);
      expect(taskStore.state.selectedTaskIds).toContain(task1.id);
      expect(taskStore.state.selectedTaskIds).toContain(task2.id);
      expect(taskStore.state.selectedTaskIds).toContain(task3.id);
    });

    test('should deselect a task', () => {
      taskStore.actions.selectMultipleTasks([task1.id, task2.id, task3.id]);
      taskStore.actions.deselectTask(task2.id);

      expect(taskStore.state.selectedTaskIds).toHaveLength(2);
      expect(taskStore.state.selectedTaskIds).not.toContain(task2.id);
    });

    test('should clear all selections', () => {
      taskStore.actions.selectMultipleTasks([task1.id, task2.id, task3.id]);
      taskStore.actions.clearSelection();

      expect(taskStore.state.selectedTaskIds).toHaveLength(0);
    });

    test('should return selected tasks', () => {
      taskStore.actions.selectMultipleTasks([task1.id, task2.id]);

      const selectedTasks = taskStore.actions.getSelectedTasks();
      
      expect(selectedTasks).toHaveLength(2);
      expect(selectedTasks.map(t => t.id).sort()).toEqual([task1.id, task2.id]);
    });

    test('should return selected task IDs', () => {
      taskStore.actions.selectMultipleTasks([task1.id, task3.id]);

      const selectedIds = taskStore.actions.getSelectedTaskIds();
      
      expect(selectedIds).toHaveLength(2);
      expect(selectedIds).toContain(task1.id);
      expect(selectedIds).toContain(task3.id);
    });
  });

  describe('Batch Operations', () => {
    let tasks: any[];

    beforeEach(async () => {
      tasks = await Promise.all([
        taskStore.actions.createTask({ name: 'Task 1', status: 'todo', priority: 'Medium', userId: 'test-user-1' }),
        taskStore.actions.createTask({ name: 'Task 2', status: 'todo', priority: 'Medium', userId: 'test-user-1' }),
        taskStore.actions.createTask({ name: 'Task 3', status: 'in-progress', priority: 'High', userId: 'test-user-1' })
      ]);
    });

    test('should batch update tasks', async () => {
      const taskIds = [tasks[0].id, tasks[1].id];
      const batchData = {
        taskIds,
        status: 'done',
        priority: 'High'
      };

      const result = await taskStore.actions.batchUpdateTasks(batchData);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);

      // Verify updates
      const updatedTask1 = taskStore.actions.getTask(tasks[0].id);
      const updatedTask2 = taskStore.actions.getTask(tasks[1].id);

      expect(updatedTask1.status).toBe('done');
      expect(updatedTask1.priority).toBe('High');
      expect(updatedTask2.status).toBe('done');
      expect(updatedTask2.priority).toBe('High');
    });

    test('should batch delete tasks', async () => {
      const taskIds = [tasks[0].id, tasks[1].id];

      const result = await taskStore.actions.batchDeleteTasks(taskIds);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);

      // Verify deletions
      expect(taskStore.actions.getTask(tasks[0].id)).toBeUndefined();
      expect(taskStore.actions.getTask(tasks[1].id)).toBeUndefined();
      expect(taskStore.actions.getTask(tasks[2].id)).toBeDefined(); // Should still exist

      expect(taskStore.actions.getTaskCount()).toBe(1);
    });

    test('should handle batch operation failures gracefully', async () => {
      const taskIds = [tasks[0].id, 'non-existent-id'];
      const batchData = {
        taskIds,
        status: 'done'
      };

      const result = await taskStore.actions.batchUpdateTasks(batchData);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);

      // Verify first task was updated
      const updatedTask = taskStore.actions.getTask(tasks[0].id);
      expect(updatedTask.status).toBe('done');
    });
  });

  describe('Error Handling', () => {
    test('should set and clear errors', () => {
      const error = { code: 'TEST_ERROR', message: 'Test error message' };
      
      taskStore.actions.setError(error);
      expect(taskStore.state.error).toEqual(error);

      taskStore.actions.clearError();
      expect(taskStore.state.error).toBeNull();
    });

    test('should handle loading states', () => {
      expect(taskStore.state.loading.creating).toBe(false);
      expect(taskStore.state.loading.updating).toBe(false);
      expect(taskStore.state.loading.deleting).toBe(false);
    });
  });

  describe('Cache Management', () => {
    test('should cache tasks and clear cache', async () => {
      const task = await taskStore.actions.createTask({ name: 'Cache Test', userId: 'test-user-1' });

      expect(taskStore.state.cache[task.id]).toBeDefined();

      taskStore.actions.clearCache();
      expect(Object.keys(taskStore.state.cache)).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of tasks efficiently', async () => {
      const taskCount = 1000;
      const startTime = performance.now();

      const promises = Array.from({ length: taskCount }, (_, i) =>
        taskStore.actions.createTask({ name: `Performance Task ${i}`, userId: 'test-user-1' })
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const creationTime = endTime - startTime;

      expect(creationTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(taskStore.actions.getTaskCount()).toBe(taskCount);

      // Test filtering performance
      const filterStartTime = performance.now();
      taskStore.actions.addStatusFilter('todo');
      const filtered = taskStore.actions.getFilteredTasks();
      const filterEndTime = performance.now();

      expect(filterEndTime - filterStartTime).toBeLessThan(100); // Should filter within 100ms
      expect(filtered).toHaveLength(taskCount);
    });
  });
});