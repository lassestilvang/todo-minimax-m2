/**
 * TaskStore - Simplified Zustand store for task management
 */

import { create } from 'zustand';
import type { 
  TaskStoreState,
  TaskStoreActions,
  TaskStoreSelectors 
} from '../types/store';
import type { 
  AppTask, 
  TaskQueryParams,
  CreateTaskData,
  UpdateTaskData,
  TaskBatchResult,
  TaskGroupBy,
  TaskView 
} from '../../types/tasks';
import type { 
  TaskId, 
  ListId, 
  LabelId, 
  Priority, 
  TaskStatus, 
  DateRange,
  ApiError 
} from '../../types/utils';

/**
 * Create a simple task store
 */
export const createTaskStore = (config?: {
  userId?: string;
}) => {
  const {
    userId = 'default'
  } = config || {};

  // Initial state
  const initialState: TaskStoreState = {
    // Core task data
    tasks: [],
    currentTask: null,
    selectedTaskIds: [],
    
    // Loading and error states
    loading: {
      tasks: false,
      creating: false,
      updating: false,
      deleting: false,
      batch: false
    },
    error: null,
    
    // Cache and optimization
    lastFetched: null,
    isInitialized: false,
    cache: {},
    
    // Batch operations
    batchOperations: {},
    
    // Filters and view
    filters: {
      search: '',
      listIds: [],
      status: [],
      priority: [],
      labels: [],
      overdue: false,
      hasDeadline: false
    },
    view: {
      type: 'list' as const,
      groupBy: undefined,
      showCompleted: true,
      compactMode: false
    },
    
    // Optimistic updates
    optimisticUpdates: {},
    
    // Action history
    actionHistory: [],
    historyIndex: -1
  };

  return create<TaskStoreState & TaskStoreActions & TaskStoreSelectors>((set, get) => ({
    ...initialState,

    // =================== DATA LOADING ===================
    loadTasks: async (params?: TaskQueryParams) => {
      set((state) => {
        state.loading.tasks = true;
        state.error = null;
      });

      try {
        // TODO: Implement actual database calls
        // For now, just set empty state
        set((state) => {
          state.tasks = [];
          state.cache = {};
          state.lastFetched = new Date();
          state.isInitialized = true;
          state.loading.tasks = false;
        });

      } catch (error) {
        set((state) => {
          state.error = error as ApiError;
          state.loading.tasks = false;
        });
        throw error;
      }
    },

    loadTaskById: async (taskId: TaskId): Promise<AppTask | null> => {
      const cached = get().cache[taskId];
      if (cached) {
        return cached;
      }
      return null;
    },

    refreshTasks: async () => {
      await get().loadTasks();
    },

    // =================== CRUD OPERATIONS ===================
    createTask: async (data: CreateTaskData): Promise<AppTask> => {
      try {
        const newTask: AppTask = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...data,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: data.status || 'todo',
          priority: data.priority || 'None'
        };

        set((state) => {
          state.tasks.unshift(newTask);
          state.cache[newTask.id] = newTask;
        });

        return newTask;

      } catch (error) {
        set((state) => {
          state.error = error as ApiError;
        });
        throw error;
      }
    },

    updateTask: async (updates: UpdateTaskData): Promise<AppTask> => {
      if (!updates.id) {
        throw new Error('Task ID is required for updates');
      }

      const taskId = updates.id;
      const existingTask = get().cache[taskId];
      if (!existingTask) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      const updatedTask: AppTask = {
        ...existingTask,
        ...updates,
        updatedAt: new Date()
      };

      set((state) => {
        const index = state.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
          state.tasks[index] = updatedTask;
        }
        state.cache[taskId] = updatedTask;
      });

      return updatedTask;
    },

    deleteTask: async (taskId: TaskId): Promise<void> => {
      const existingTask = get().cache[taskId];
      if (!existingTask) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      set((state) => {
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        delete state.cache[taskId];
        state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== taskId);
      });
    },

    duplicateTask: async (taskId: TaskId): Promise<AppTask> => {
      const originalTask = get().cache[taskId];
      if (!originalTask) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      const duplicateData: CreateTaskData = {
        name: `${originalTask.name} (Copy)`,
        description: originalTask.description,
        date: originalTask.date,
        deadline: originalTask.deadline,
        estimate: originalTask.estimate,
        priority: originalTask.priority,
        listId: originalTask.listId,
        status: 'todo'
      };

      return await get().createTask(duplicateData);
    },

    // =================== SELECTION ===================
    selectTask: (taskId: TaskId) => {
      set((state) => {
        if (!state.selectedTaskIds.includes(taskId)) {
          state.selectedTaskIds.push(taskId);
        }
      });
    },

    selectMultipleTasks: (taskIds: TaskId[]) => {
      set((state) => {
        state.selectedTaskIds = [...new Set([...state.selectedTaskIds, ...taskIds])];
      });
    },

    deselectTask: (taskId: TaskId) => {
      set((state) => {
        state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== taskId);
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selectedTaskIds = [];
      });
    },

    selectAllVisible: () => {
      set((state) => {
        const filteredTasks = get().getFilteredTasks();
        state.selectedTaskIds = filteredTasks.map(t => t.id);
      });
    },

    selectCompletedTasks: () => {
      set((state) => {
        const completedTasks = state.tasks.filter(t => t.status === 'done');
        state.selectedTaskIds = completedTasks.map(t => t.id);
      });
    },

    selectOverdueTasks: () => {
      set((state) => {
        const now = new Date();
        const overdueTasks = state.tasks.filter(t => 
          t.deadline && new Date(t.deadline) < now && t.status !== 'done'
        );
        state.selectedTaskIds = overdueTasks.map(t => t.id);
      });
    },

    // =================== FILTERS AND SEARCH ===================
    setSearchQuery: (query: string) => {
      set((state) => {
        state.filters.search = query;
      });
    },

    setFilter: (key, value) => {
      set((state) => {
        (state.filters as any)[key] = value;
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filters = initialState.filters;
      });
    },

    setDateRange: (range: DateRange) => {
      set((state) => {
        state.filters.dateRange = range;
      });
    },

    addListFilter: (listId: ListId) => {
      set((state) => {
        if (!state.filters.listIds.includes(listId)) {
          state.filters.listIds.push(listId);
        }
      });
    },

    removeListFilter: (listId: ListId) => {
      set((state) => {
        state.filters.listIds = state.filters.listIds.filter(id => id !== listId);
      });
    },

    addStatusFilter: (status: TaskStatus) => {
      set((state) => {
        if (!state.filters.status.includes(status)) {
          state.filters.status.push(status);
        }
      });
    },

    removeStatusFilter: (status: TaskStatus) => {
      set((state) => {
        state.filters.status = state.filters.status.filter(s => s !== status);
      });
    },

    addPriorityFilter: (priority: Priority) => {
      set((state) => {
        if (!state.filters.priority.includes(priority)) {
          state.filters.priority.push(priority);
        }
      });
    },

    removePriorityFilter: (priority: Priority) => {
      set((state) => {
        state.filters.priority = state.filters.priority.filter(p => p !== priority);
      });
    },

    addLabelFilter: (labelId: LabelId) => {
      set((state) => {
        if (!state.filters.labels.includes(labelId)) {
          state.filters.labels.push(labelId);
        }
      });
    },

    removeLabelFilter: (labelId: LabelId) => {
      set((state) => {
        state.filters.labels = state.filters.labels.filter(id => id !== labelId);
      });
    },

    // =================== VIEW CONFIGURATION ===================
    setViewType: (type: TaskView['type']) => {
      set((state) => {
        state.view.type = type;
      });
    },

    setGroupBy: (groupBy: TaskGroupBy | undefined) => {
      set((state) => {
        state.view.groupBy = groupBy;
      });
    },

    toggleCompletedTasks: () => {
      set((state) => {
        state.view.showCompleted = !state.view.showCompleted;
      });
    },

    toggleCompactMode: () => {
      set((state) => {
        state.view.compactMode = !state.view.compactMode;
      });
    },

    // =================== STATE MANAGEMENT ===================
    setCurrentTask: (task: AppTask | null) => {
      set((state) => {
        state.currentTask = task;
      });
    },

    updateTaskInCache: (task: AppTask) => {
      set((state) => {
        state.cache[task.id] = task;
        const index = state.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          state.tasks[index] = task;
        }
      });
    },

    removeTaskFromCache: (taskId: TaskId) => {
      set((state) => {
        delete state.cache[taskId];
        state.tasks = state.tasks.filter(t => t.id !== taskId);
      });
    },

    clearCache: () => {
      set((state) => {
        state.cache = {};
        state.tasks = [];
      });
    },

    // =================== BATCH OPERATIONS ===================
    batchUpdateTasks: async (data: Partial<UpdateTaskData> & { taskIds: TaskId[] }): Promise<TaskBatchResult> => {
      const { taskIds, ...updates } = data;
      const results: TaskBatchResult['results'] = [];

      for (const taskId of taskIds) {
        try {
          const updatedTask = await get().updateTask({ id: taskId, ...updates });
          results.push({ taskId, success: true, data: updatedTask });
        } catch (error) {
          results.push({ taskId, success: false, error: error as ApiError });
        }
      }

      const result: TaskBatchResult = {
        total: taskIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

      return result;
    },

    batchDeleteTasks: async (taskIds: TaskId[]): Promise<TaskBatchResult> => {
      const results: TaskBatchResult['results'] = [];

      for (const taskId of taskIds) {
        try {
          await get().deleteTask(taskId);
          results.push({ taskId, success: true });
        } catch (error) {
          results.push({ taskId, success: false, error: error as ApiError });
        }
      }

      const result: TaskBatchResult = {
        total: taskIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

      return result;
    },

    batchMoveTasks: async (taskIds: TaskId[], listId: ListId): Promise<TaskBatchResult> => {
      return get().batchUpdateTasks({ taskIds, listId });
    },

    // =================== BATCH OPERATION MANAGEMENT ===================
    startBatchOperation: (type, data) => {
      const operationId = `batch_${Date.now()}`;
      set((state) => {
        state.batchOperations[operationId] = {
          type,
          data,
          status: 'pending',
          progress: 0
        };
      });
      return operationId;
    },

    updateBatchOperation: (operationId, updates) => {
      set((state) => {
        if (state.batchOperations[operationId]) {
          state.batchOperations[operationId] = {
            ...state.batchOperations[operationId],
            ...updates
          };
        }
      });
    },

    completeBatchOperation: (operationId, result) => {
      set((state) => {
        if (state.batchOperations[operationId]) {
          state.batchOperations[operationId].status = 'completed';
          if (result) {
            state.batchOperations[operationId].result = result;
          }
        }
      });
    },

    cancelBatchOperation: (operationId) => {
      set((state) => {
        delete state.batchOperations[operationId];
      });
    },

    // =================== SELECTORS ===================
    getFilteredTasks: () => {
      const state = get();
      let filteredTasks = state.tasks;

      // Apply search filter
      if (state.filters.search) {
        const query = state.filters.search.toLowerCase();
        filteredTasks = filteredTasks.filter(task => 
          task.name.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query))
        );
      }

      // Apply status filter
      if (state.filters.status.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
          state.filters.status.includes(task.status)
        );
      }

      // Apply priority filter
      if (state.filters.priority.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
          state.filters.priority.includes(task.priority)
        );
      }

      // Apply list filter
      if (state.filters.listIds.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
          task.listId && state.filters.listIds.includes(task.listId)
        );
      }

      return filteredTasks;
    },

    getTaskStats: () => {
      const state = get();
      const tasks = state.tasks;
      const now = new Date();

      return {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => 
          t.deadline && new Date(t.deadline) < now && t.status !== 'done'
        ).length,
        dueToday: tasks.filter(t => {
          if (!t.deadline) return false;
          const deadline = new Date(t.deadline);
          return deadline.toDateString() === now.toDateString();
        }).length,
        completionRate: tasks.length > 0 ? 
          (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 0
      };
    },

    canUndo: () => {
      const state = get();
      return state.historyIndex > 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyIndex < state.actionHistory.length - 1;
    }
  }));
};

// Export the store instance
export const useTaskStore = createTaskStore();