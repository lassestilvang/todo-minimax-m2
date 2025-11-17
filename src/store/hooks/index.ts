/**
 * Custom React Hooks for Zustand Stores
 * Provides type-safe, memoized access to store state and actions
 */

import { useCallback, useMemo, useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import { useTaskStore } from '../task-store';
import { useListStore } from '../list-store';
import { useAppStore } from '../app-store';
import { useFormStore } from '../form-store';
import { useNotificationStore } from '../notification-store';
import { useModalStore } from '../modal-store';
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
  TaskBatchResult
} from '../../types/tasks';
import type { TaskId, ListId, Priority, TaskStatus } from '../../types/utils';

// =================== TASK HOOKS ===================

export const useTasks = (options?: {
  selector?: (state: TaskStoreState & TaskStoreActions) => any;
  equalityFn?: (a: any, b: any) => boolean;
}) => {
  const {
    selector = (state) => state,
    equalityFn = shallow
  } = options || {};

  const store = useTaskStore();

  return useMemo(() => ({
    // State
    tasks: selector(store).getTasks(),
    currentTask: selector(store).getCurrentTask(),
    selectedTasks: selector(store).getSelectedTasks(),
    selectedTaskIds: selector(store).getSelectedTaskIds(),
    filteredTasks: selector(store).getFilteredTasks(),
    completedTasks: selector(store).getCompletedTasks(),
    overdueTasks: selector(store).getOverdueTasks(),
    todaysTasks: selector(store).getTodaysTasks(),
    taskCount: selector(store).getTaskCount(),
    completedTaskCount: selector(store).getCompletedTaskCount(),
    overdueTaskCount: selector(store).getOverdueTaskCount(),
    filterCount: selector(store).getFilterCount(),
    hasActiveFilters: selector(store).getHasActiveFilters(),
    groupedTasks: selector(store).getGroupedTasks(),
    sortedTasks: selector(store).getSortedTasks(),
    isLoading: selector(store).getIsLoading(),
    isCreating: selector(store).getIsCreating(),
    isUpdating: selector(store).getIsUpdating(),
    isDeleting: selector(store).getIsDeleting(),
    error: selector(store).getError(),
    activeBatchOperations: selector(store).getActiveBatchOperations(),

    // Actions
    loadTasks: useCallback((params?: TaskQueryParams) => {
      return selector(store).loadTasks(params);
    }, [selector, store]),

    loadTaskById: useCallback((taskId: TaskId) => {
      return selector(store).loadTaskById(taskId);
    }, [selector, store]),

    refreshTasks: useCallback(() => {
      return selector(store).refreshTasks();
    }, [selector, store]),

    createTask: useCallback((data: CreateTaskData) => {
      return selector(store).createTask(data);
    }, [selector, store]),

    updateTask: useCallback((data: UpdateTaskData) => {
      return selector(store).updateTask(data);
    }, [selector, store]),

    deleteTask: useCallback((taskId: TaskId) => {
      return selector(store).deleteTask(taskId);
    }, [selector, store]),

    duplicateTask: useCallback((taskId: TaskId) => {
      return selector(store).duplicateTask(taskId);
    }, [selector, store]),

    batchUpdateTasks: useCallback((data: Partial<UpdateTaskData> & { taskIds: TaskId[] }) => {
      return selector(store).batchUpdateTasks(data);
    }, [selector, store]),

    batchDeleteTasks: useCallback((taskIds: TaskId[]) => {
      return selector(store).batchDeleteTasks(taskIds);
    }, [selector, store]),

    batchMoveTasks: useCallback((taskIds: TaskId[], listId: ListId) => {
      return selector(store).batchMoveTasks(taskIds, listId);
    }, [selector, store]),

    selectTask: useCallback((taskId: TaskId) => {
      selector(store).selectTask(taskId);
    }, [selector, store]),

    selectMultipleTasks: useCallback((taskIds: TaskId[]) => {
      selector(store).selectMultipleTasks(taskIds);
    }, [selector, store]),

    deselectTask: useCallback((taskId: TaskId) => {
      selector(store).deselectTask(taskId);
    }, [selector, store]),

    clearSelection: useCallback(() => {
      selector(store).clearSelection();
    }, [selector, store]),

    selectAllVisible: useCallback(() => {
      selector(store).selectAllVisible();
    }, [selector, store]),

    selectCompletedTasks: useCallback(() => {
      selector(store).selectCompletedTasks();
    }, [selector, store]),

    selectOverdueTasks: useCallback(() => {
      selector(store).selectOverdueTasks();
    }, [selector, store]),

    setSearchQuery: useCallback((query: string) => {
      selector(store).setSearchQuery(query);
    }, [selector, store]),

    setFilter: useCallback((key: any, value: any) => {
      selector(store).setFilter(key, value);
    }, [selector, store]),

    clearFilters: useCallback(() => {
      selector(store).clearFilters();
    }, [selector, store]),

    setDateRange: useCallback((range: any) => {
      selector(store).setDateRange(range);
    }, [selector, store]),

    addListFilter: useCallback((listId: ListId) => {
      selector(store).addListFilter(listId);
    }, [selector, store]),

    removeListFilter: useCallback((listId: ListId) => {
      selector(store).removeListFilter(listId);
    }, [selector, store]),

    addStatusFilter: useCallback((status: TaskStatus) => {
      selector(store).addStatusFilter(status);
    }, [selector, store]),

    removeStatusFilter: useCallback((status: TaskStatus) => {
      selector(store).removeStatusFilter(status);
    }, [selector, store]),

    addPriorityFilter: useCallback((priority: Priority) => {
      selector(store).addPriorityFilter(priority);
    }, [selector, store]),

    removePriorityFilter: useCallback((priority: Priority) => {
      selector(store).removePriorityFilter(priority);
    }, [selector, store]),

    addLabelFilter: useCallback((labelId: string) => {
      selector(store).addLabelFilter(labelId);
    }, [selector, store]),

    removeLabelFilter: useCallback((labelId: string) => {
      selector(store).removeLabelFilter(labelId);
    }, [selector, store]),

    setViewType: useCallback((type: any) => {
      selector(store).setViewType(type);
    }, [selector, store]),

    setGroupBy: useCallback((groupBy: any) => {
      selector(store).setGroupBy(groupBy);
    }, [selector, store]),

    toggleCompletedTasks: useCallback(() => {
      selector(store).toggleCompletedTasks();
    }, [selector, store]),

    toggleCompactMode: useCallback(() => {
      selector(store).toggleCompactMode();
    }, [selector, store]),

    setCurrentTask: useCallback((task: AppTask | null) => {
      selector(store).setCurrentTask(task);
    }, [selector, store]),

    updateTaskInCache: useCallback((task: AppTask) => {
      selector(store).updateTaskInCache(task);
    }, [selector, store]),

    removeTaskFromCache: useCallback((taskId: TaskId) => {
      selector(store).removeTaskFromCache(taskId);
    }, [selector, store]),

    clearCache: useCallback(() => {
      selector(store).clearCache();
    }, [selector, store]),

    // Parameterized selectors
    getTasksByList: useCallback((listId: ListId) => {
      return selector(store).getTasksByList(listId);
    }, [selector, store]),

    getTasksByStatus: useCallback((status: TaskStatus) => {
      return selector(store).getTasksByStatus(status);
    }, [selector, store]),

    getTasksByPriority: useCallback((priority: Priority) => {
      return selector(store).getTasksByPriority(priority);
    }, [selector, store]),

    getBatchOperationProgress: useCallback((operationId: string) => {
      return selector(store).getBatchOperationProgress(operationId);
    }, [selector, store])
  }), [selector, store, equalityFn]);
};

// Optimized hooks for specific use cases
export const useTasksList = () => {
  return useTasks({
    selector: (state) => ({
      tasks: state.getTasks(),
      filteredTasks: state.getFilteredTasks(),
      isLoading: state.getIsLoading(),
      error: state.getError()
    })
  });
};

export const useTaskDetails = (taskId: TaskId | null) => {
  const store = useTaskStore();

  return useMemo(() => {
    if (!taskId) return null;
    
    const cache = (store as any).getState().cache;
    return cache[taskId] || null;
  }, [store, taskId]);
};

export const useTaskFilters = () => {
  return useTasks({
    selector: (state) => ({
      filters: (state as any).filters,
      view: (state as any).view,
      filterCount: state.getFilterCount(),
      hasActiveFilters: state.getHasActiveFilters()
    })
  });
};

export const useTaskSelection = () => {
  return useTasks({
    selector: (state) => ({
      selectedTasks: state.getSelectedTasks(),
      selectedTaskIds: state.getSelectedTaskIds()
    })
  });
};

export const useTaskBatch = () => {
  return useTasks({
    selector: (state) => ({
      activeBatchOperations: state.getActiveBatchOperations(),
      isLoading: state.getIsLoading()
    })
  });
};

// =================== LIST HOOKS ===================

export const useLists = (options?: {
  selector?: (state: any) => any;
  equalityFn?: (a: any, b: any) => boolean;
}) => {
  const {
    selector = (state) => state,
    equalityFn = shallow
  } = options || {};

  const store = useListStore();

  return useMemo(() => ({
    // State
    lists: selector(store).getLists?.() || [],
    currentList: selector(store).getCurrentList?.() || null,
    selectedLists: selector(store).getSelectedLists?.() || [],
    selectedListIds: selector(store).getSelectedListIds?.() || [],
    favoriteLists: selector(store).getFavoriteLists?.() || [],
    recentLists: selector(store).getRecentLists?.() || [],
    sharedLists: selector(store).getSharedLists?.() || [],
    archivedLists: selector(store).getArchivedLists?.() || [],
    searchResults: selector(store).getSearchResults?.() || [],
    listCount: selector(store).getListCount?.() || 0,
    favoriteCount: selector(store).getFavoriteCount?.() || 0,
    recentCount: selector(store).getRecentCount?.() || 0,
    hasSelection: selector(store).getHasSelection?.() || false,
    visibleLists: selector(store).getVisibleLists?.() || [],
    sortedLists: selector(store).getSortedLists?.() || [],
    isLoading: selector(store).getIsLoading?.() || false,
    isCreating: selector(store).getIsCreating?.() || false,
    isUpdating: selector(store).getIsUpdating?.() || false,
    isDeleting: selector(store).getIsDeleting?.() || false,
    error: selector(store).getError?.() || null,

    // Actions
    loadLists: useCallback((params?: any) => {
      return selector(store).loadLists?.(params);
    }, [selector, store]),

    loadListById: useCallback((listId: ListId) => {
      return selector(store).loadListById?.(listId);
    }, [selector, store]),

    refreshLists: useCallback(() => {
      return selector(store).refreshLists?.();
    }, [selector, store]),

    createList: useCallback((data: any) => {
      return selector(store).createList?.(data);
    }, [selector, store]),

    updateList: useCallback((data: any) => {
      return selector(store).updateList?.(data);
    }, [selector, store]),

    deleteList: useCallback((listId: ListId) => {
      return selector(store).deleteList?.(listId);
    }, [selector, store]),

    duplicateList: useCallback((listId: ListId) => {
      return selector(store).duplicateList?.(listId);
    }, [selector, store]),

    selectList: useCallback((listId: ListId) => {
      selector(store).selectList?.(listId);
    }, [selector, store]),

    selectMultipleLists: useCallback((listIds: ListId[]) => {
      selector(store).selectMultipleLists?.(listIds);
    }, [selector, store]),

    deselectList: useCallback((listId: ListId) => {
      selector(store).deselectList?.(listId);
    }, [selector, store]),

    clearSelection: useCallback(() => {
      selector(store).clearSelection?.();
    }, [selector, store]),

    setCurrentList: useCallback((list: any) => {
      selector(store).setCurrentList?.(list);
    }, [selector, store]),

    switchList: useCallback((listId: ListId) => {
      selector(store).switchList?.(listId);
    }, [selector, store]),

    goBack: useCallback(() => {
      selector(store).goBack?.();
    }, [selector, store]),

    goForward: useCallback(() => {
      selector(store).goForward?.();
    }, [selector, store]),

    addToFavorites: useCallback((listId: ListId) => {
      selector(store).addToFavorites?.(listId);
    }, [selector, store]),

    removeFromFavorites: useCallback((listId: ListId) => {
      selector(store).removeFromFavorites?.(listId);
    }, [selector, store]),

    toggleFavorite: useCallback((listId: ListId) => {
      selector(store).toggleFavorite?.(listId);
    }, [selector, store]),

    addToRecent: useCallback((listId: ListId) => {
      selector(store).addToRecent?.(listId);
    }, [selector, store]),

    clearRecent: useCallback(() => {
      selector(store).clearRecent?.();
    }, [selector, store]),

    setSearchQuery: useCallback((query: string) => {
      selector(store).setSearchQuery?.(query);
    }, [selector, store]),

    setGlobalView: useCallback((view: any) => {
      selector(store).setGlobalView?.(view);
    }, [selector, store]),

    toggleSidebar: useCallback(() => {
      selector(store).toggleSidebar?.();
    }, [selector, store]),

    resizeSidebar: useCallback((width: number) => {
      selector(store).resizeSidebar?.(width);
    }, [selector, store]),

    updateListInCache: useCallback((list: any) => {
      selector(store).updateListInCache?.(list);
    }, [selector, store]),

    removeListFromCache: useCallback((listId: ListId) => {
      selector(store).removeListFromCache?.(listId);
    }, [selector, store]),

    clearCache: useCallback(() => {
      selector(store).clearCache?.();
    }, [selector, store])
  }), [selector, store, equalityFn]);
};

// =================== APP HOOKS ===================

export const useApp = () => {
  const store = useAppStore();

  return useMemo(() => ({
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    theme: store.theme,
    sidebarCollapsed: store.sidebarCollapsed,
    currentView: store.currentView,
    notifications: store.notifications,
    modals: store.modals,
    preferences: store.preferences,
    config: store.config,
    loading: store.loading,

    // Actions
    login: useCallback((credentials: { email: string; password: string }) => {
      return store.login(credentials);
    }, [store]),

    logout: useCallback(() => {
      return store.logout();
    }, [store]),

    refreshToken: useCallback(() => {
      return store.refreshToken();
    }, [store]),

    register: useCallback((userData: { name: string; email: string; password: string }) => {
      return store.register(userData);
    }, [store]),

    loadUser: useCallback(() => {
      return store.loadUser();
    }, [store]),

    updateUser: useCallback((userData: any) => {
      return store.updateUser(userData);
    }, [store]),

    updatePreferences: useCallback((preferences: any) => {
      store.updatePreferences(preferences);
    }, [store]),

    setTheme: useCallback((theme: any) => {
      store.setTheme(theme);
    }, [store]),

    toggleSidebar: useCallback(() => {
      store.toggleSidebar();
    }, [store]),

    setCurrentView: useCallback((view: any) => {
      store.setCurrentView(view);
    }, [store]),

    showNotification: useCallback((notification: any) => {
      return store.showNotification(notification);
    }, [store]),

    hideNotification: useCallback((id: string) => {
      store.hideNotification(id);
    }, [store]),

    showModal: useCallback((modal: any) => {
      return store.showModal(modal);
    }, [store]),

    hideModal: useCallback((id: string) => {
      store.hideModal(id);
    }, [store]),

    updateConfig: useCallback((config: any) => {
      store.updateConfig(config);
    }, [store]),

    resetConfig: useCallback(() => {
      store.resetConfig();
    }, [store]),

    setLoading: useCallback((key: any, loading: boolean) => {
      store.setLoading(key, loading);
    }, [store]),

    setError: useCallback((error: any) => {
      store.setError(error);
    }, [store]),

    clearError: useCallback(() => {
      store.clearError();
    }, [store])
  }), [store]);
};

// =================== FORM HOOKS ===================

export const useForms = () => {
  const store = useFormStore();

  return useMemo(() => ({
    // State
    taskForms: store.taskForms,
    currentTaskFormId: store.currentTaskFormId,
    listForms: store.listForms,
    currentListFormId: store.currentListFormId,
    userForm: store.userForm,
    passwordForm: store.passwordForm,
    labelForms: store.labelForms,
    currentLabelFormId: store.currentLabelFormId,
    generalForms: store.generalForms,
    currentGeneralFormId: store.currentGeneralFormId,
    autoSaveEnabled: store.autoSaveEnabled,
    autoSaveInterval: store.autoSaveInterval,
    lastSaved: store.lastSaved,
    pendingSaves: store.pendingSaves,

    // Actions
    createTaskForm: useCallback((id: string, initialData?: any, config?: any) => {
      return store.createTaskForm(id, initialData, config);
    }, [store]),

    updateTaskForm: useCallback((id: string, data: any) => {
      store.updateTaskForm(id, data);
    }, [store]),

    deleteTaskForm: useCallback((id: string) => {
      store.deleteTaskForm(id);
    }, [store]),

    setCurrentTaskForm: useCallback((id: string | null) => {
      store.setCurrentTaskForm(id);
    }, [store]),

    createListForm: useCallback((id: string, initialData?: any, config?: any) => {
      return store.createListForm(id, initialData, config);
    }, [store]),

    updateListForm: useCallback((id: string, data: any) => {
      store.updateListForm(id, data);
    }, [store]),

    deleteListForm: useCallback((id: string) => {
      store.deleteListForm(id);
    }, [store]),

    setCurrentListForm: useCallback((id: string | null) => {
      store.setCurrentListForm(id);
    }, [store]),

    initUserForm: useCallback((initialData: any) => {
      store.initUserForm(initialData);
    }, [store]),

    updateUserForm: useCallback((data: any) => {
      store.updateUserForm(data);
    }, [store]),

    clearUserForm: useCallback(() => {
      store.clearUserForm();
    }, [store]),

    createLabelForm: useCallback((id: string, initialData?: any, config?: any) => {
      return store.createLabelForm(id, initialData, config);
    }, [store]),

    updateLabelForm: useCallback((id: string, data: any) => {
      store.updateLabelForm(id, data);
    }, [store]),

    deleteLabelForm: useCallback((id: string) => {
      store.deleteLabelForm(id);
    }, [store]),

    setCurrentLabelForm: useCallback((id: string | null) => {
      store.setCurrentLabelForm(id);
    }, [store]),

    enableAutoSave: useCallback((interval: number) => {
      store.enableAutoSave(interval);
    }, [store]),

    disableAutoSave: useCallback(() => {
      store.disableAutoSave();
    }, [store]),

    saveForm: useCallback((formId: string, formType: any) => {
      return store.saveForm(formId, formType);
    }, [store]),

    scheduleSave: useCallback((formId: string, formType: any) => {
      store.scheduleSave(formId, formType);
    }, [store]),

    clearPendingSave: useCallback((formId: string) => {
      store.clearPendingSave(formId);
    }, [store]),

    createGeneralForm: useCallback((id: string, initialData: any) => {
      store.createGeneralForm(id, initialData);
    }, [store]),

    updateGeneralForm: useCallback((id: string, data: any) => {
      store.updateGeneralForm(id, data);
    }, [store]),

    deleteGeneralForm: useCallback((id: string) => {
      store.deleteGeneralForm(id);
    }, [store]),

    setCurrentGeneralForm: useCallback((id: string | null) => {
      store.setCurrentGeneralForm(id);
    }, [store]),

    getFormData: useCallback((formId: string, formType: any) => {
      return store.getFormData(formId, formType);
    }, [store]),

    getFormState: useCallback((formId: string, formType: any) => {
      return store.getFormState(formId, formType);
    }, [store]),

    clearAllForms: useCallback(() => {
      store.clearAllForms();
    }, [store])
  }), [store]);
};

// =================== NOTIFICATION HOOKS ===================

export const useNotifications = () => {
  const store = useNotificationStore();

  return useMemo(() => ({
    // State
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    maxNotifications: store.maxNotifications,
    position: store.position,
    showProgress: store.showProgress,
    pauseOnHover: store.pauseOnHover,
    autoClose: store.autoClose,
    defaultDuration: store.defaultDuration,

    // Actions
    showNotification: useCallback((payload: any) => {
      return store.showNotification(payload);
    }, [store]),

    hideNotification: useCallback((id: string) => {
      store.hideNotification(id);
    }, [store]),

    markAsRead: useCallback((id: string) => {
      store.markAsRead(id);
    }, [store]),

    markAllAsRead: useCallback(() => {
      store.markAllAsRead();
    }, [store]),

    clearNotification: useCallback((id: string) => {
      store.clearNotification(id);
    }, [store]),

    clearAll: useCallback(() => {
      store.clearAll();
    }, [store]),

    clearByType: useCallback((type: any) => {
      store.clearByType(type);
    }, [store]),

    clearExpired: useCallback(() => {
      store.clearExpired();
    }, [store]),

    // Convenience methods
    success: useCallback((title: string, message: string, options?: any) => {
      return store.success(title, message, options);
    }, [store]),

    error: useCallback((title: string, message: string, options?: any) => {
      return store.error(title, message, options);
    }, [store]),

    warning: useCallback((title: string, message: string, options?: any) => {
      return store.warning(title, message, options);
    }, [store]),

    info: useCallback((title: string, message: string, options?: any) => {
      return store.info(title, message, options);
    }, [store]),

    reminder: useCallback((title: string, message: string, options?: any) => {
      return store.reminder(title, message, options);
    }, [store]),

    // Configuration
    setPosition: useCallback((position: any) => {
      store.setPosition(position);
    }, [store]),

    setMaxNotifications: useCallback((max: number) => {
      store.setMaxNotifications(max);
    }, [store]),

    setAutoClose: useCallback((enabled: boolean, duration?: number) => {
      store.setAutoClose(enabled, duration);
    }, [store]),

    setShowProgress: useCallback((show: boolean) => {
      store.setShowProgress(show);
    }, [store]),

    setPauseOnHover: useCallback((pause: boolean) => {
      store.setPauseOnHover(pause);
    }, [store]),

    // Utility methods
    getNotificationById: useCallback((id: string) => {
      return store.getNotificationById(id);
    }, [store]),

    getUnreadNotifications: useCallback(() => {
      return store.getUnreadNotifications();
    }, [store]),

    getVisibleNotifications: useCallback(() => {
      return store.getVisibleNotifications();
    }, [store]),

    hasNotifications: useCallback(() => {
      return store.hasNotifications();
    }, [store]),

    hasUnread: useCallback(() => {
      return store.hasUnread();
    }, [store]),

    getNotificationStats: useCallback(() => {
      return store.getNotificationStats();
    }, [store])
  }), [store]);
};

// =================== MODAL HOOKS ===================

export const useModals = () => {
  const store = useModalStore();

  return useMemo(() => ({
    // State
    modals: store.modals,
    activeModalId: store.activeModalId,
    modalStack: store.modalStack,
    isAnyModalOpen: store.isAnyModalOpen,
    closeOnOverlayClick: store.closeOnOverlayClick,
    closeOnEsc: store.closeOnEsc,
    trapFocus: store.trapFocus,
    restoreFocus: store.restoreFocus,

    // Actions
    showModal: useCallback((payload: any) => {
      return store.showModal(payload);
    }, [store]),

    hideModal: useCallback((id: string) => {
      store.hideModal(id);
    }, [store]),

    closeModal: useCallback((id: string) => {
      store.closeModal(id);
    }, [store]),

    closeActiveModal: useCallback(() => {
      store.closeActiveModal();
    }, [store]),

    closeAllModals: useCallback(() => {
      store.closeAllModals();
    }, [store]),

    pushModal: useCallback((payload: any) => {
      return store.pushModal(payload);
    }, [store]),

    popModal: useCallback(() => {
      return store.popModal();
    }, [store]),

    clearModalStack: useCallback(() => {
      store.clearModalStack();
    }, [store]),

    updateModalData: useCallback((id: string, data: any) => {
      store.updateModalData(id, data);
    }, [store]),

    getModalById: useCallback((id: string) => {
      return store.getModalById(id);
    }, [store]),

    getActiveModal: useCallback(() => {
      return store.getActiveModal();
    }, [store]),

    // Configuration
    setCloseOnOverlayClick: useCallback((close: boolean) => {
      store.setCloseOnOverlayClick(close);
    }, [store]),

    setCloseOnEsc: useCallback((close: boolean) => {
      store.setCloseOnEsc(close);
    }, [store]),

    setTrapFocus: useCallback((trap: boolean) => {
      store.setTrapFocus(trap);
    }, [store]),

    setRestoreFocus: useCallback((restore: boolean) => {
      store.setRestoreFocus(restore);
    }, [store]),

    // Convenience methods
    confirm: useCallback((payload: any) => {
      return store.confirm(payload);
    }, [store]),

    alert: useCallback((payload: any) => {
      return store.alert(payload);
    }, [store]),

    prompt: useCallback((payload: any) => {
      return store.prompt(payload);
    }, [store]),

    showDrawer: useCallback((payload: any) => {
      return store.showDrawer(payload);
    }, [store]),

    showBottomSheet: useCallback((payload: any) => {
      return store.showBottomSheet(payload);
    }, [store]),

    closeModalsByType: useCallback((type: any) => {
      store.closeModalsByType(type);
    }, [store]),

    closeOldestModal: useCallback(() => {
      store.closeOldestModal();
    }, [store]),

    // Utility methods
    getModalStack: useCallback(() => {
      return store.getModalStack();
    }, [store]),

    getModalCount: useCallback(() => {
      return store.getModalCount();
    }, [store]),

    isModalOpen: useCallback((id: string) => {
      return store.isModalOpen(id);
    }, [store]),

    hasModals: useCallback(() => {
      return store.hasModals();
    }, [store]),

    getModalStats: useCallback(() => {
      return store.getModalStats();
    }, [store])
  }), [store]);
};

// =================== COMPOSED HOOKS ===================

export const useTaskWithList = (taskId: TaskId | null) => {
  const task = useTaskDetails(taskId);
  const { lists } = useLists();
  
  return useMemo(() => {
    if (!task) return null;
    
    const list = lists.find(l => l.id === task.listId);
    return {
      ...task,
      list
    };
  }, [task, lists]);
};

export const useCurrentUserTasks = () => {
  const { user } = useApp();
  const { tasks } = useTasks();
  
  return useMemo(() => {
    if (!user) return [];
    return tasks.filter(task => task.userId === user.id);
  }, [tasks, user]);
};

export const useFormValidation = (formId: string, formType: 'task' | 'list' | 'label') => {
  const { getFormState } = useForms();
  
  return useMemo(() => {
    const form = getFormState(formId, formType);
    return {
      isValid: form?.isValid || false,
      errors: form?.errors || {},
      warnings: form?.warnings || {},
      isDirty: form?.isDirty || false,
      touched: form?.touched || {},
      hasErrors: form ? Object.keys(form.errors || {}).length > 0 : false,
      hasWarnings: form ? Object.keys(form.warnings || {}).length > 0 : false
    };
  }, [formId, formType, getFormState]);
};