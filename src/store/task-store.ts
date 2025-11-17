/**
 * TaskStore - Zustand store for comprehensive task management
 * Handles task CRUD operations, filtering, sorting, batch operations, and optimistic updates
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { 
  TaskStore as ITaskStore,
  TaskStoreState,
  TaskStoreActions,
  TaskStoreSelectors 
} from '../types/store';
import type { 
  AppTask, 
  TaskWithDetails,
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
import { withErrorHandling, createRetryHandler } from '../middleware/error-handling';
import { createPersistConfig } from '../middleware/persistence';
import { dbAPI } from '../../lib/db/api';

// Optimistic update interface
interface OptimisticUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete' | 'bulk';
  data: T;
  originalData?: T;
  timestamp: Date;
  timeoutId?: NodeJS.Timeout;
}

// Action history for undo/redo
interface ActionHistoryEntry {
  id: string;
  type: 'create' | 'update' | 'delete' | 'bulk';
  entityType: 'task';
  data: any;
  timestamp: Date;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Create TaskStore with comprehensive functionality
 */
export const createTaskStore = (config?: {
  userId?: string;
  errorHandling?: boolean;
  persistence?: boolean;
  devtools?: boolean;
}) => {
  const {
    userId = 'default',
    errorHandling = true,
    persistence = true,
    devtools = process.env.NODE_ENV === 'development'
  } = config || {};

  const retryHandler = createRetryHandler({
    retryAttempts: 3,
    retryDelay: 1000,
    onError: (error, storeName) => {
      console.error(`[${storeName}] Error:`, error);
    }
  });

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

  // Build store configuration
  let storeConfig = (set: any, get: any, api: any): TaskStoreState & TaskStoreActions => {
    const state = initialState;

    return {
      ...state,

      // =================== DATA LOADING ===================
      loadTasks: async (params?: TaskQueryParams) => {
        set((state: TaskStoreState) => {
          state.loading.tasks = true;
          state.error = null;
        }, false, 'loadTasks');

        try {
          const result = await retryHandler(async () => {
            return await dbAPI.getUserTasks(userId, params || {});
          }, 'loadTasks', 'TaskStore');

          set((state: TaskStoreState) => {
            state.tasks = result;
            state.cache = result.reduce((acc, task) => {
              acc[task.id] = task;
              return acc;
            }, {} as Record<TaskId, AppTask>);
            state.lastFetched = new Date();
            state.isInitialized = true;
            state.loading.tasks = false;
          }, false, 'loadTasks_success');

        } catch (error) {
          set((state: TaskStoreState) => {
            state.error = error as ApiError;
            state.loading.tasks = false;
          }, false, 'loadTasks_error');
          throw error;
        }
      },

      loadTaskById: async (taskId: TaskId): Promise<AppTask | null> => {
        const cached = get().cache[taskId];
        if (cached) {
          return cached;
        }

        try {
          const task = await retryHandler(async () => {
            return await dbAPI.getTaskWithDetails(taskId);
          }, 'loadTaskById', 'TaskStore');

          if (task) {
            set((state: TaskStoreState) => {
              state.cache[taskId] = task;
              state.tasks = state.tasks.some(t => t.id === taskId) 
                ? state.tasks.map(t => t.id === taskId ? task : t)
                : [...state.tasks, task];
            }, false, 'loadTaskById_success');
          }

          return task;
        } catch (error) {
          set((state: TaskStoreState) => {
            state.error = error as ApiError;
          }, false, 'loadTaskById_error');
          throw error;
        }
      },

      refreshTasks: async () => {
        await get().loadTasks();
      },

      // =================== CRUD OPERATIONS ===================
      createTask: async (data: CreateTaskData): Promise<AppTask> => {
        const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Optimistic update
        const optimisticTask: AppTask = {
          id: optimisticId,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId,
          status: data.status || 'todo',
          priority: data.priority || 'None'
        };

        set((state: TaskStoreState) => {
          state.tasks.unshift(optimisticTask);
          state.cache[optimisticId] = optimisticTask;
          state.optimisticUpdates[optimisticId] = {
            id: optimisticId,
            type: 'create',
            data: optimisticTask,
            timestamp: new Date()
          };
          state.loading.creating = true;
        }, false, 'createTask_optimistic');

        try {
          const realTask = await retryHandler(async () => {
            return await dbAPI.createTask({
              ...data,
              userId
            });
          }, 'createTask', 'TaskStore');

          // Replace optimistic update with real data
          set((state: TaskStoreState) => {
            const index = state.tasks.findIndex(t => t.id === optimisticId);
            if (index !== -1) {
              state.tasks[index] = realTask;
            }
            state.cache[optimisticId] = realTask;
            state.cache[realTask.id] = realTask;
            delete state.optimisticUpdates[optimisticId];
            state.loading.creating = false;

            // Add to action history
            state.actionHistory.push({
              id: `action_${Date.now()}`,
              type: 'create',
              entityType: 'task',
              data: realTask,
              timestamp: new Date(),
              canUndo: true,
              canRedo: false
            });
            state.historyIndex = state.actionHistory.length - 1;
          }, false, 'createTask_success');

          return realTask;

        } catch (error) {
          // Rollback optimistic update
          set((state: TaskStoreState) => {
            state.tasks = state.tasks.filter(t => t.id !== optimisticId);
            delete state.cache[optimisticId];
            delete state.optimisticUpdates[optimisticId];
            state.loading.creating = false;
            state.error = error as ApiError;
          }, false, 'createTask_rollback');

          throw error;
        }
      },

      updateTask: async (updates: UpdateTaskData): Promise<AppTask> => {
        if (!updates.id) {
          throw new Error('Task ID is required for updates');
        }

        const taskId = updates.id;
        const originalTask = get().cache[taskId];
        if (!originalTask) {
          throw new Error(`Task with ID ${taskId} not found`);
        }

        // Optimistic update
        const updatedTask: AppTask = {
          ...originalTask,
          ...updates,
          updatedAt: new Date()
        };

        set((state: TaskStoreState) => {
          const index = state.tasks.findIndex(t => t.id === taskId);
          if (index !== -1) {
            state.tasks[index] = updatedTask;
          }
          state.cache[taskId] = updatedTask;
          state.optimisticUpdates[taskId] = {
            id: taskId,
            type: 'update',
            data: updatedTask,
            originalData: originalTask,
            timestamp: new Date()
          };
          state.loading.updating = true;
        }, false, 'updateTask_optimistic');

        try {
          const realTask = await retryHandler(async () => {
            return await dbAPI.updateTask(taskId, updates, userId);
          }, 'updateTask', 'TaskStore');

          // Replace with real data
          set((state: TaskStoreState) => {
            const index = state.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
              state.tasks[index] = realTask;
            }
            state.cache[taskId] = realTask;
            delete state.optimisticUpdates[taskId];
            state.loading.updating = false;

            // Add to action history
            state.actionHistory.push({
              id: `action_${Date.now()}`,
              type: 'update',
              entityType: 'task',
              data: { id: taskId, changes: updates, originalData: originalTask },
              timestamp: new Date(),
              canUndo: true,
              canRedo: false
            });
            state.historyIndex = state.actionHistory.length - 1;
          }, false, 'updateTask_success');

          return realTask;

        } catch (error) {
          // Rollback optimistic update
          set((state: TaskStoreState) => {
            const index = state.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
              state.tasks[index] = originalTask;
            }
            state.cache[taskId] = originalTask;
            delete state.optimisticUpdates[taskId];
            state.loading.updating = false;
            state.error = error as ApiError;
          }, false, 'updateTask_rollback');

          throw error;
        }
      },

      deleteTask: async (taskId: TaskId): Promise<void> => {
        const originalTask = get().cache[taskId];
        if (!originalTask) {
          throw new Error(`Task with ID ${taskId} not found`);
        }

        // Optimistic update - remove task
        set((state: TaskStoreState) => {
          state.tasks = state.tasks.filter(t => t.id !== taskId);
          delete state.cache[taskId];
          state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== taskId);
          state.optimisticUpdates[taskId] = {
            id: taskId,
            type: 'delete',
            data: { id: taskId },
            originalData: originalTask,
            timestamp: new Date()
          };
          state.loading.deleting = true;
        }, false, 'deleteTask_optimistic');

        try {
          await retryHandler(async () => {
            return await dbAPI.deleteTask(taskId, userId);
          }, 'deleteTask', 'TaskStore');

          // Complete deletion
          set((state: TaskStoreState) => {
            delete state.optimisticUpdates[taskId];
            state.loading.deleting = false;

            // Add to action history
            state.actionHistory.push({
              id: `action_${Date.now()}`,
              type: 'delete',
              entityType: 'task',
              data: originalTask,
              timestamp: new Date(),
              canUndo: true,
              canRedo: false
            });
            state.historyIndex = state.actionHistory.length - 1;
          }, false, 'deleteTask_success');

        } catch (error) {
          // Rollback optimistic update
          set((state: TaskStoreState) => {
            state.tasks.push(originalTask);
            state.cache[taskId] = originalTask;
            delete state.optimisticUpdates[taskId];
            state.loading.deleting = false;
            state.error = error as ApiError;
          }, false, 'deleteTask_rollback');

          throw error;
        }
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

      // =================== BATCH OPERATIONS ===================
      batchUpdateTasks: async (data: Partial<UpdateTaskData> & { taskIds: TaskId[] }): Promise<TaskBatchResult> => {
        const { taskIds, ...updates } = data;
        const operationId = `batch_${Date.now()}`;
        
        // Optimistic batch update
        const originalTasks = taskIds.map(id => get().cache[id]).filter(Boolean);
        
        set((state: TaskStoreState) => {
          state.batchOperations[operationId] = {
            type: 'bulk',
            data: { taskIds, updates },
            status: 'processing',
            progress: 0
          };
          state.loading.batch = true;
        }, false, 'batchUpdateTasks_start');

        try {
          let completed = 0;
          const results: TaskBatchResult['results'] = [];

          // Process in batches to avoid overwhelming the system
          const batchSize = 10;
          for (let i = 0; i < taskIds.length; i += batchSize) {
            const batch = taskIds.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (taskId) => {
              try {
                const updatedTask = await get().updateTask({ id: taskId, ...updates });
                results.push({ taskId, success: true, data: updatedTask });
              } catch (error) {
                results.push({ taskId, success: false, error: error as ApiError });
              } finally {
                completed++;
                set((state: TaskStoreState) => {
                  if (state.batchOperations[operationId]) {
                    state.batchOperations[operationId].progress = (completed / taskIds.length) * 100;
                  }
                }, false, 'batchUpdateTasks_progress');
              }
            }));
          }

          const result: TaskBatchResult = {
            total: taskIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
          };

          set((state: TaskStoreState) => {
            if (state.batchOperations[operationId]) {
              state.batchOperations[operationId].status = 'completed';
              state.batchOperations[operationId].result = result;
            }
            state.loading.batch = false;
          }, false, 'batchUpdateTasks_success');

          return result;

        } catch (error) {
          set((state: TaskStoreState) => {
            if (state.batchOperations[operationId]) {
              state.batchOperations[operationId].status = 'failed';
            }
            state.loading.batch = false;
            state.error = error as ApiError;
          }, false, 'batchUpdateTasks_error');
          
          throw error;
        }
      },

      batchDeleteTasks: async (taskIds: TaskId[]): Promise<TaskBatchResult> => {
        const operationId = `batch_delete_${Date.now()}`;
        
        set((state: TaskStoreState) => {
          state.batchOperations[operationId] = {
            type: 'bulk',
            data: { taskIds },
            status: 'processing',
            progress: 0
          };
          state.loading.batch = true;
        }, false, 'batchDeleteTasks_start');

        try {
          let completed = 0;
          const results: TaskBatchResult['results'] = [];

          const batchSize = 10;
          for (let i = 0; i < taskIds.length; i += batchSize) {
            const batch = taskIds.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (taskId) => {
              try {
                await get().deleteTask(taskId);
                results.push({ taskId, success: true });
              } catch (error) {
                results.push({ taskId, success: false, error: error as ApiError });
              } finally {
                completed++;
                set((state: TaskStoreState) => {
                  if (state.batchOperations[operationId]) {
                    state.batchOperations[operationId].progress = (completed / taskIds.length) * 100;
                  }
                }, false, 'batchDeleteTasks_progress');
              }
            }));
          }

          const result: TaskBatchResult = {
            total: taskIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
          };

          set((state: TaskStoreState) => {
            if (state.batchOperations[operationId]) {
              state.batchOperations[operationId].status = 'completed';
              state.batchOperations[operationId].result = result;
            }
            state.loading.batch = false;
          }, false, 'batchDeleteTasks_success');

          return result;

        } catch (error) {
          set((state: TaskStoreState) => {
            if (state.batchOperations[operationId]) {
              state.batchOperations[operationId].status = 'failed';
            }
            state.loading.batch = false;
            state.error = error as ApiError;
          }, false, 'batchDeleteTasks_error');
          
          throw error;
        }
      },

      batchMoveTasks: async (taskIds: TaskId[], listId: ListId): Promise<TaskBatchResult> => {
        return get().batchUpdateTasks({ taskIds, listId });
      },

      // =================== SELECTION ===================
      selectTask: (taskId: TaskId) => {
        set((state: TaskStoreState) => {
          if (!state.selectedTaskIds.includes(taskId)) {
            state.selectedTaskIds.push(taskId);
          }
        }, false, 'selectTask');
      },

      selectMultipleTasks: (taskIds: TaskId[]) => {
        set((state: TaskStoreState) => {
          state.selectedTaskIds = [...new Set([...state.selectedTaskIds, ...taskIds])];
        }, false, 'selectMultipleTasks');
      },

      deselectTask: (taskId: TaskId) => {
        set((state: TaskStoreState) => {
          state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== taskId);
        }, false, 'deselectTask');
      },

      clearSelection: () => {
        set((state: TaskStoreState) => {
          state.selectedTaskIds = [];
        }, false, 'clearSelection');
      },

      selectAllVisible: () => {
        set((state: TaskStoreState) => {
          const filteredTasks = get().getFilteredTasks();
          state.selectedTaskIds = filteredTasks.map(t => t.id);
        }, false, 'selectAllVisible');
      },

      selectCompletedTasks: () => {
        set((state: TaskStoreState) => {
          const completedTasks = state.tasks.filter(t => t.status === 'done');
          state.selectedTaskIds = completedTasks.map(t => t.id);
        }, false, 'selectCompletedTasks');
      },

      selectOverdueTasks: () => {
        set((state: TaskStoreState) => {
          const now = new Date();
          const overdueTasks = state.tasks.filter(t => 
            t.deadline && new Date(t.deadline) < now && t.status !== 'done'
          );
          state.selectedTaskIds = overdueTasks.map(t => t.id);
        }, false, 'selectOverdueTasks');
      },

      // =================== FILTERS AND SEARCH ===================
      setSearchQuery: (query: string) => {
        set((state: TaskStoreState) => {
          state.filters.search = query;
        }, false, 'setSearchQuery');
      },

      setFilter: (key, value) => {
        set((state: TaskStoreState) => {
          (state.filters as any)[key] = value;
        }, false, 'setFilter');
      },

      clearFilters: () => {
        set((state: TaskStoreState) => {
          state.filters = initialState.filters;
        }, false, 'clearFilters');
      },

      setDateRange: (range: DateRange) => {
        set((state: TaskStoreState) => {
          state.filters.dateRange = range;
        }, false, 'setDateRange');
      },

      addListFilter: (listId: ListId) => {
        set((state: TaskStoreState) => {
          if (!state.filters.listIds.includes(listId)) {
            state.filters.listIds.push(listId);
          }
        }, false, 'addListFilter');
      },

      removeListFilter: (listId: ListId) => {
        set((state: TaskStoreState) => {
          state.filters.listIds = state.filters.listIds.filter(id => id !== listId);
        }, false, 'removeListFilter');
      },

      addStatusFilter: (status: TaskStatus) => {
        set((state: TaskStoreState) => {
          if (!state.filters.status.includes(status)) {
            state.filters.status.push(status);
          }
        }, false, 'addStatusFilter');
      },

      removeStatusFilter: (status: TaskStatus) => {
        set((state: TaskStoreState) => {
          state.filters.status = state.filters.status.filter(s => s !== status);
        }, false, 'removeStatusFilter');
      },

      addPriorityFilter: (priority: Priority) => {
        set((state: TaskStoreState) => {
          if (!state.filters.priority.includes(priority)) {
            state.filters.priority.push(priority);
          }
        }, false, 'addPriorityFilter');
      },

      removePriorityFilter: (priority: Priority) => {
        set((state: TaskStoreState) => {
          state.filters.priority = state.filters.priority.filter(p => p !== priority);
        }, false, 'removePriorityFilter');
      },

      addLabelFilter: (labelId: LabelId) => {
        set((state: TaskStoreState) => {
          if (!state.filters.labels.includes(labelId)) {
            state.filters.labels.push(labelId);
          }
        }, false, 'addLabelFilter');
      },

      removeLabelFilter: (labelId: LabelId) => {
        set((state: TaskStoreState) => {
          state.filters.labels = state.filters.labels.filter(id => id !== labelId);
        }, false, 'removeLabelFilter');
      },

      // =================== VIEW CONFIGURATION ===================
      setViewType: (type: TaskView['type']) => {
        set((state: TaskStoreState) => {
          state.view.type = type;
        }, false, 'setViewType');
      },

      setGroupBy: (groupBy: TaskGroupBy | undefined) => {
        set((state: TaskStoreState) => {
          state.view.groupBy = groupBy;
        }, false, 'setGroupBy');
      },

      toggleCompletedTasks: () => {
        set((state: TaskStoreState) => {
          state.view.showCompleted = !state.view.showCompleted;
        }, false, 'toggleCompletedTasks');
      },

      toggleCompactMode: () => {
        set((state: TaskStoreState) => {
          state.view.compactMode = !state.view.compactMode;
        }, false, 'toggleCompactMode');
      },

      // =================== STATE MANAGEMENT ===================
      setCurrentTask: (task: AppTask | null) => {
        set((state: TaskStoreState) => {
          state.currentTask = task;
        }, false, 'setCurrentTask');
      },

      updateTaskInCache: (task: AppTask) => {
        set((state: TaskStoreState) => {
          state.cache[task.id] = task;
          const index = state.tasks.findIndex(t => t.id === task.id);
          if (index !== -1) {
            state.tasks[index] = task;
          }
        }, false, 'updateTaskInCache');
      },

      removeTaskFromCache: (taskId: TaskId) => {
        set((state: TaskStoreState) => {
          delete state.cache[taskId];
          state.tasks = state.tasks.filter(t => t.id !== taskId);
        }, false, 'removeTaskFromCache');
      },

      clearCache: () => {
        set((state: TaskStoreState) => {
          state.cache = {};
          state.tasks = [];
        }, false, 'clearCache');
      },

      // =================== BATCH OPERATION MANAGEMENT ===================
      startBatchOperation: (type, data) => {
        const operationId = `batch_${Date.now()}`;
        set((state: TaskStoreState) => {
          state.batchOperations[operationId] = {
            type,
            data,
            status: 'pending',
            progress: 0
          };
        }, false, 'startBatchOperation');
        return operationId;
      },

      updateBatchOperation: (operationId, updates) => {
        set((state: TaskStoreState) => {
          if (state.batchOperations[operationId]) {
            state.batchOperations[operationId] = {
              ...state.batchOperations[operationId],
              ...updates
            };
          }
        }, false, 'updateBatchOperation');
      },

      completeBatchOperation: (operationId, result) => {
        set((state: TaskStoreState) => {
          if (state.batchOperations[operationId]) {
            state.batchOperations[operationId].status = 'completed';
            if (result) {
              state.batchOperations[operationId].result = result;
            }
          }
        }, false, 'completeBatchOperation');
      },

      cancelBatchOperation: (operationId) => {
        set((state: TaskStoreState) => {
          delete state.batchOperations[operationId];
        }, false, 'cancelBatchOperation');
      }
    };
  };

  // Apply middleware
  if (errorHandling) {
    storeConfig = withErrorHandling('TaskStore', storeConfig, {
      retryAttempts: 3,
      logErrors: true
    });
  }

  let middleware = [subscribeWithSelector(), immer];

  if (persistence) {
    middleware.push(persist(
      storeConfig,
      createPersistConfig({
        name: 'task-store',
        partialize: (state) => ({
          // Only persist essential state
          view: state.view,
          filters: state.filters,
          selectedTaskIds: state.selectedTaskIds,
          currentTask: state.currentTask
        }),
        version: 1
      })
    ));
  } else {
    storeConfig = storeConfig as StateCreator<TaskStoreState & TaskStoreActions>;
  }

  return create<TaskStoreState & TaskStoreActions & TaskStoreSelectors>()(...middleware)(storeConfig);
};

// Export the store instance
export const useTaskStore = createTaskStore();