/**
 * TaskStore Selectors and Computed Values
 * Provides memoized selectors for efficient state access and derived data
 */

// TaskStore Selectors - Simple selectors without memoization
// Note: createSelector is not available in zustand 5.x, so using basic selectors

import type { TaskStoreState, TaskStoreSelectors } from '../types/store';
import type { AppTask, TaskStatus, Priority, TaskGroupBy, ListId, TaskId } from '../../types/tasks';
import type { DateRange } from '../../types/utils';

// Base selector creators
export const createTaskSelectors = (get: () => TaskStoreState): TaskStoreSelectors => {
  // =================== BASIC SELECTORS ===================

  const getTasks = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks;
  };

  const getCurrentTask = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.currentTask;
  };

  const getSelectedTasks = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks.filter(task => storeState.selectedTaskIds.includes(task.id));
  };

  const getSelectedTaskIds = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.selectedTaskIds;
  };

  const getFilteredTasks = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks.filter(task => {
      // Search filter
      if (storeState.filters.search) {
        const searchLower = storeState.filters.search.toLowerCase();
        const matchesSearch = 
          task.name.toLowerCase().includes(searchLower) ||
          (task.description && task.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (storeState.filters.status.length > 0 && !storeState.filters.status.includes(task.status)) {
        return false;
      }

      // Hide completed tasks if not showing them
      if (!storeState.view.showCompleted && task.status === 'done') {
        return false;
      }

      // Priority filter
      if (storeState.filters.priority.length > 0 && !storeState.filters.priority.includes(task.priority)) {
        return false;
      }

      // List filter
      if (storeState.filters.listIds.length > 0 && !storeState.filters.listIds.includes(task.listId)) {
        return false;
      }

      // Label filter
      if (storeState.filters.labels.length > 0) {
        const hasMatchingLabel = task.labels?.some(label => 
          storeState.filters.labels.includes(label.id)
        );
        if (!hasMatchingLabel) return false;
      }

      // Overdue filter
      if (storeState.filters.overdue) {
        const now = new Date();
        const isOverdue = task.deadline && 
          new Date(task.deadline) < now && 
          task.status !== 'done';
        if (!isOverdue) return false;
      }

      // Has deadline filter
      if (storeState.filters.hasDeadline) {
        if (!task.deadline) return false;
      }

      // Date range filter
      if (storeState.filters.dateRange) {
        const taskDate = task.date || task.deadline;
        if (taskDate) {
          const taskDateTime = new Date(taskDate);
          if (storeState.filters.dateRange.from && taskDateTime < storeState.filters.dateRange.from) {
            return false;
          }
          if (storeState.filters.dateRange.to && taskDateTime > storeState.filters.dateRange.to) {
            return false;
          }
        } else {
          return false;
        }
      }

      return true;
    });
  };

  const getCompletedTasks = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks.filter(task => task.status === 'done');
  };

  const getOverdueTasks = (state?: TaskStoreState) => {
    const storeState = state || get();
    const now = new Date();
    return storeState.tasks.filter(task => 
      task.deadline && 
      new Date(task.deadline) < now && 
      task.status !== 'done'
    );
  };

  const getTodaysTasks = (state?: TaskStoreState) => {
    const storeState = state || get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return storeState.tasks.filter(task => {
      if (!task.date) return false;
      const taskDate = new Date(task.date);
      return taskDate >= today && taskDate < tomorrow;
    });
  };

  // Curried selectors for parameterized queries
  const getTasksByList = (listId: ListId) => (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks.filter(task => task.listId === listId);
  };

  const getTasksByStatus = (status: TaskStatus) => (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks.filter(task => task.status === status);
  };

  const getTasksByPriority = (priority: Priority) => (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks.filter(task => task.priority === priority);
  };

  // =================== COMPUTED SELECTORS ===================

  const getTaskCount = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks.length;
  };

  const getCompletedTaskCount = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.tasks.filter(task => task.status === 'done').length;
  };

  const getOverdueTaskCount = (state?: TaskStoreState) => {
    const storeState = state || get();
    const now = new Date();
    return storeState.tasks.filter(task => 
      task.deadline && 
      new Date(task.deadline) < now && 
      task.status !== 'done'
    ).length;
  };

  const getFilterCount = (state?: TaskStoreState) => {
    const storeState = state || get();
    const filters = storeState.filters;
    let count = 0;
    if (filters.search) count++;
    if (filters.status.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.listIds.length > 0) count++;
    if (filters.labels.length > 0) count++;
    if (filters.overdue) count++;
    if (filters.hasDeadline) count++;
    if (filters.dateRange) count++;
    return count;
  };

  const getHasActiveFilters = (state?: TaskStoreState) => {
    const storeState = state || get();
    return getFilterCount(storeState) > 0;
  };

  // =================== VIEW SELECTORS ===================

  const getGroupedTasks = (state?: TaskStoreState) => {
    const storeState = state || get();
    const tasks = getFilteredTasks(storeState);
    const groupBy = storeState.view.groupBy;

    if (!groupBy) return { all: tasks };

    const grouped: Record<string, AppTask[]> = {};
    
    tasks.forEach(task => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'status':
          groupKey = task.status;
          break;
        case 'priority':
          groupKey = task.priority;
          break;
        case 'list':
          groupKey = task.listId;
          break;
        case 'date':
          if (task.date) {
            const date = new Date(task.date);
            groupKey = date.toDateString();
          } else {
            groupKey = 'No Date';
          }
          break;
        case 'deadline':
          if (task.deadline) {
            const deadline = new Date(task.deadline);
            groupKey = deadline.toDateString();
          } else {
            groupKey = 'No Deadline';
          }
          break;
        default:
          groupKey = 'all';
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(task);
    });

    return grouped;
  };

  const getSortedTasks = (state?: TaskStoreState) => {
    const storeState = state || get();
    const tasks = getFilteredTasks(storeState);
    
    // Default sort: by list, then by position, then by creation date
    return [...tasks].sort((a, b) => {
      // First sort by list
      if (a.listId !== b.listId) {
        return a.listId.localeCompare(b.listId);
      }
      
      // Then by position (if available)
      if (a.position !== b.position) {
        return (a.position || 0) - (b.position || 0);
      }
      
      // Finally by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  // =================== STATE SELECTORS ===================

  const getIsLoading = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.loading === 'loading';
  };

  const getIsCreating = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.loading === 'creating';
  };

  const getIsUpdating = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.loading === 'updating';
  };

  const getIsDeleting = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.loading === 'deleting';
  };

  const getError = (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.error;
  };

  // =================== BATCH OPERATION SELECTORS ===================

  const getActiveBatchOperations = (state?: TaskStoreState) => {
    const storeState = state || get();
    return Object.keys(storeState.batchOperations || {}).filter(id => 
      storeState.batchOperations[id].status === 'processing' || 
      storeState.batchOperations[id].status === 'pending'
    );
  };

  const getBatchOperationProgress = (operationId: string) => (state?: TaskStoreState) => {
    const storeState = state || get();
    return storeState.batchOperations[operationId]?.progress || 0;
  };

  return {
    // Basic selectors
    getTasks,
    getCurrentTask,
    getSelectedTasks,
    getSelectedTaskIds,
    
    // Filtered selectors
    getFilteredTasks,
    getCompletedTasks,
    getOverdueTasks,
    getTodaysTasks,
    getTasksByList,
    getTasksByStatus,
    getTasksByPriority,
    
    // Computed selectors
    getTaskCount,
    getCompletedTaskCount,
    getOverdueTaskCount,
    getFilterCount,
    getHasActiveFilters,
    
    // View selectors
    getGroupedTasks,
    getSortedTasks,
    
    // State selectors
    getIsLoading,
    getIsCreating,
    getIsUpdating,
    getIsDeleting,
    getError,
    
    // Batch operation selectors
    getActiveBatchOperations,
    getBatchOperationProgress,
  };
};
