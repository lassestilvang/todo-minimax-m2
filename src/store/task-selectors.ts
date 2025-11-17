/**
 * TaskStore Selectors and Computed Values
 * Provides memoized selectors for efficient state access and derived data
 */

import { createSelector } from 'zustand';
import type { TaskStoreState, TaskStoreSelectors } from '../types/store';
import type { AppTask, TaskStatus, Priority, TaskGroupBy, ListId, TaskId } from '../../types/tasks';
import type { DateRange } from '../../types/utils';

// Base selector creators
export const createTaskSelectors = (get: () => TaskStoreState): TaskStoreSelectors => {
  // =================== BASIC SELECTORS ===================

  const getTasks = createSelector(
    (state: TaskStoreState) => state.tasks,
    (tasks) => tasks
  );

  const getCurrentTask = createSelector(
    (state: TaskStoreState) => state.currentTask,
    (currentTask) => currentTask
  );

  const getSelectedTasks = createSelector(
    (state: TaskStoreState) => state.tasks,
    (state: TaskStoreState) => state.selectedTaskIds,
    (tasks, selectedIds) => tasks.filter(task => selectedIds.includes(task.id))
  );

  const getSelectedTaskIds = createSelector(
    (state: TaskStoreState) => state.selectedTaskIds,
    (selectedIds) => selectedIds
  );

  // =================== FILTERED SELECTORS ===================

  const getFilteredTasks = createSelector(
    (state: TaskStoreState) => state.tasks,
    (state: TaskStoreState) => state.filters,
    (state: TaskStoreState) => state.view.showCompleted,
    (tasks, filters, showCompleted) => {
      return tasks.filter(task => {
        // Search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesSearch = 
            task.name.toLowerCase().includes(searchLower) ||
            (task.description && task.description.toLowerCase().includes(searchLower));
          if (!matchesSearch) return false;
        }

        // Status filter
        if (filters.status.length > 0 && !filters.status.includes(task.status)) {
          return false;
        }

        // Hide completed tasks if not showing them
        if (!showCompleted && task.status === 'done') {
          return false;
        }

        // Priority filter
        if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
          return false;
        }

        // List filter
        if (filters.listIds.length > 0 && !filters.listIds.includes(task.listId)) {
          return false;
        }

        // Label filter
        if (filters.labels.length > 0) {
          const hasMatchingLabel = task.labels?.some(label => 
            filters.labels.includes(label.id)
          );
          if (!hasMatchingLabel) return false;
        }

        // Overdue filter
        if (filters.overdue) {
          const now = new Date();
          const isOverdue = task.deadline && 
            new Date(task.deadline) < now && 
            task.status !== 'done';
          if (!isOverdue) return false;
        }

        // Has deadline filter
        if (filters.hasDeadline && !task.deadline) {
          return false;
        }

        // Date range filter
        if (filters.dateRange) {
          const taskDate = task.date || task.deadline;
          if (taskDate) {
            const taskDateTime = new Date(taskDate);
            if (filters.dateRange.from && taskDateTime < filters.dateRange.from) {
              return false;
            }
            if (filters.dateRange.to && taskDateTime > filters.dateRange.to) {
              return false;
            }
          } else if (filters.dateRange.from || filters.dateRange.to) {
            return false; // Task has no date but filter is applied
          }
        }

        return true;
      });
    }
  );

  const getCompletedTasks = createSelector(
    getTasks,
    (tasks) => tasks.filter(task => task.status === 'done')
  );

  const getOverdueTasks = createSelector(
    getTasks,
    (tasks) => {
      const now = new Date();
      return tasks.filter(task => 
        task.deadline && 
        new Date(task.deadline) < now && 
        task.status !== 'done'
      );
    }
  );

  const getTodaysTasks = createSelector(
    getTasks,
    (tasks) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return tasks.filter(task => {
        if (!task.date) return false;
        const taskDate = new Date(task.date);
        return taskDate >= today && taskDate < tomorrow;
      });
    }
  );

  // Curried selectors for parameterized queries
  const getTasksByList = (listId: ListId) => createSelector(
    getTasks,
    (tasks) => tasks.filter(task => task.listId === listId)
  );

  const getTasksByStatus = (status: TaskStatus) => createSelector(
    getTasks,
    (tasks) => tasks.filter(task => task.status === status)
  );

  const getTasksByPriority = (priority: Priority) => createSelector(
    getTasks,
    (tasks) => tasks.filter(task => task.priority === priority)
  );

  // =================== COMPUTED SELECTORS ===================

  const getTaskCount = createSelector(
    getTasks,
    (tasks) => tasks.length
  );

  const getCompletedTaskCount = createSelector(
    getTasks,
    (tasks) => tasks.filter(task => task.status === 'done').length
  );

  const getOverdueTaskCount = createSelector(
    getTasks,
    (tasks) => {
      const now = new Date();
      return tasks.filter(task => 
        task.deadline && 
        new Date(task.deadline) < now && 
        task.status !== 'done'
      ).length;
    }
  );

  const getFilterCount = createSelector(
    (state: TaskStoreState) => state.filters,
    (filters) => {
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
    }
  );

  const getHasActiveFilters = createSelector(
    (state: TaskStoreState) => state.filters,
    (filters) => {
      return !!(
        filters.search ||
        filters.status.length > 0 ||
        filters.priority.length > 0 ||
        filters.listIds.length > 0 ||
        filters.labels.length > 0 ||
        filters.overdue ||
        filters.hasDeadline ||
        filters.dateRange
      );
    }
  );

  // =================== VIEW SELECTORS ===================

  const getGroupedTasks = createSelector(
    getFilteredTasks,
    (state: TaskStoreState) => state.view.groupBy,
    (tasks, groupBy) => {
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

      // Sort groups by name, but put 'No Date' and 'No Deadline' at the end
      const sortedGroups: Record<string, AppTask[]> = {};
      const groupKeys = Object.keys(grouped).sort((a, b) => {
        if (a.includes('No ') && b.includes('No ')) return a.localeCompare(b);
        if (a.includes('No ')) return 1;
        if (b.includes('No ')) return -1;
        return a.localeCompare(b);
      });

      groupKeys.forEach(key => {
        sortedGroups[key] = grouped[key].sort((a, b) => {
          // Sort tasks within each group
          if (groupBy === 'priority') {
            const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2, 'None': 3 };
            return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
          }
          if (groupBy === 'status') {
            const statusOrder = { 'todo': 0, 'in_progress': 1, 'done': 2, 'archived': 3 };
            return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          }
          return a.name.localeCompare(b.name);
        });
      });

      return sortedGroups;
    }
  );

  const getSortedTasks = createSelector(
    getFilteredTasks,
    (tasks) => {
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
    }
  );

  // =================== STATE SELECTORS ===================

  const getIsLoading = createSelector(
    (state: TaskStoreState) => state.loading,
    (loading) => loading.tasks || loading.creating || loading.updating || loading.deleting || loading.batch
  );

  const getIsCreating = createSelector(
    (state: TaskStoreState) => state.loading.creating,
    (isCreating) => isCreating
  );

  const getIsUpdating = createSelector(
    (state: TaskStoreState) => state.loading.updating,
    (isUpdating) => isUpdating
  );

  const getIsDeleting = createSelector(
    (state: TaskStoreState) => state.loading.deleting,
    (isDeleting) => isDeleting
  );

  const getError = createSelector(
    (state: TaskStoreState) => state.error,
    (error) => error
  );

  // =================== BATCH OPERATION SELECTORS ===================

  const getActiveBatchOperations = createSelector(
    (state: TaskStoreState) => state.batchOperations,
    (batchOperations) => 
      Object.keys(batchOperations).filter(id => 
        batchOperations[id].status === 'processing' || 
        batchOperations[id].status === 'pending'
      )
  );

  const getBatchOperationProgress = (operationId: string) => createSelector(
    (state: TaskStoreState) => state.batchOperations[operationId],
    (operation) => operation?.progress || 0
  );

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
    getBatchOperationProgress
  };
};