/**
 * Zustand Store Types for Daily Task Planner Application
 * 
 * This module defines comprehensive TypeScript interfaces for Zustand store management,
 * including state types, action creators, selectors, and middleware configuration.
 */

import type { 
  Task, 
  List, 
  Label, 
  User,
  Subtask,
  Reminder,
  Attachment,
  Priority,
  TaskStatus
} from '../lib/db/types';
import type {
  TaskId,
  ListId,
  LabelId,
  UserId,
  DateRange,
  ViewType,
  ListViewType,
  Theme,
  LoadingState,
  ApiError,
  ComponentState,
  AppConfig,
  NotificationConfig,
  SortConfig,
  TimePeriod,
  TaskGroupBy
} from './utils';
import type {
  AppTask,
  TaskState,
  TaskFilters,
  TaskSort,
  TaskLayout,
  TaskView,
  CreateTaskData,
  UpdateTaskData,
  TaskBatchResult,
  TaskQueryParams,
  TaskContextValue
} from './tasks';
import type {
  AppList,
  ListState,
  ListFilters,
  ListLayout,
  ListGlobalView,
  CreateListData,
  UpdateListData,
  ListBatchResult,
  ListQueryParams,
  ListContextValue
} from './lists';
import type {
  TaskFormData,
  ListFormData,
  TaskFormState,
  ListFormState,
  UserFormData,
  LabelFormData,
  FormState
} from './forms';

// =============================================================================
// STORE BASE TYPES
// =============================================================================

/**
 * Generic store action type
 */
export type StoreAction<T = any> = T extends (...args: infer A) => infer R 
  ? (...args: A) => R 
  : never;

/**
 * Store selector type
 */
export type StoreSelector<T, R = any> = (state: T) => R;

/**
 * Store subscriber type
 */
export type StoreSubscriber<T> = (state: T, prevState: T) => void | void;

/**
 * Store middleware type
 */
export type StoreMiddleware<T> = (config: any) => (set: any, get: any, api: any) => T;

/**
 * Store persist configuration
 */
export interface StorePersistConfig<T> {
  name: string;
  partialize?: (state: T) => Partial<T>;
  version?: number;
  migrate?: (persistedState: any, version: number) => Partial<T>;
  skipHydration?: boolean;
  storage?: {
    getItem: (name: string) => string | null;
    setItem: (name: string, value: string) => void;
    removeItem: (name: string) => void;
  };
  // For localStorage
  key?: string;
  // For sessionStorage
  serialize?: boolean;
  // For custom storage
  throttleTime?: number;
}

// =============================================================================
// APP STORE TYPES
// =============================================================================

/**
 * Global application state
 */
export interface AppState {
  // Core app data
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | null;
  
  // UI state
  theme: Theme;
  sidebarCollapsed: boolean;
  currentView: ViewType;
  notifications: NotificationState;
  modals: ModalState;
  
  // Preferences and settings
  preferences: AppPreferences;
  config: AppConfig;
  
  // Loading states
  loading: {
    user: boolean;
    tasks: boolean;
    lists: boolean;
    labels: boolean;
    general: boolean;
  };
}

/**
 * App action creators
 */
export interface AppActions {
  // Authentication
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  register: (userData: { name: string; email: string; password: string }) => Promise<void>;
  
  // User
  loadUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<AppPreferences>) => void;
  
  // UI
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setCurrentView: (view: ViewType) => void;
  showNotification: (notification: ShowNotificationPayload) => void;
  hideNotification: (id: string) => void;
  showModal: (modal: ShowModalPayload) => void;
  hideModal: (id: string) => void;
  
  // Configuration
  updateConfig: (config: Partial<AppConfig>) => void;
  resetConfig: () => void;
  
  // General
  setLoading: (key: keyof AppState['loading'], loading: boolean) => void;
  setError: (error: ApiError | null) => void;
  clearError: () => void;
}

/**
 * App store combined type
 */
export interface AppStore extends AppState, AppActions {}

// =============================================================================
// TASK STORE TYPES
// =============================================================================

/**
 * Task store state
 */
export interface TaskStoreState extends TaskState {
  // Additional Zustand-specific properties
  lastFetched: Date | null;
  isInitialized: boolean;
  cache: Record<TaskId, AppTask>;
  batchOperations: {
    [operationId: string]: {
      type: 'create' | 'update' | 'delete' | 'bulk';
      data: any;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      result?: TaskBatchResult;
    };
  };
  filters: {
    search: string;
    dateRange?: DateRange;
    listIds: ListId[];
    status: TaskStatus[];
    priority: Priority[];
    labels: LabelId[];
    overdue: boolean;
    hasDeadline: boolean;
  };
  view: {
    type: TaskView['type'];
    groupBy?: TaskGroupBy;
    showCompleted: boolean;
    compactMode: boolean;
  };
}

/**
 * Task store actions
 */
export interface TaskStoreActions {
  // Data loading
  loadTasks: (params?: TaskQueryParams) => Promise<void>;
  loadTaskById: (taskId: TaskId) => Promise<AppTask | null>;
  refreshTasks: () => Promise<void>;
  
  // CRUD operations
  createTask: (data: CreateTaskData) => Promise<AppTask>;
  updateTask: (data: UpdateTaskData) => Promise<AppTask>;
  deleteTask: (taskId: TaskId) => Promise<void>;
  duplicateTask: (taskId: TaskId) => Promise<AppTask>;
  
  // Batch operations
  batchUpdateTasks: (data: Partial<UpdateTaskData> & { taskIds: TaskId[] }) => Promise<TaskBatchResult>;
  batchDeleteTasks: (taskIds: TaskId[]) => Promise<TaskBatchResult>;
  batchMoveTasks: (taskIds: TaskId[], listId: ListId) => Promise<TaskBatchResult>;
  
  // Selection
  selectTask: (taskId: TaskId) => void;
  selectMultipleTasks: (taskIds: TaskId[]) => void;
  deselectTask: (taskId: TaskId) => void;
  clearSelection: () => void;
  selectAllVisible: () => void;
  selectCompletedTasks: () => void;
  selectOverdueTasks: () => void;
  
  // Filters and search
  setSearchQuery: (query: string) => void;
  setFilter: <K extends keyof TaskStoreState['filters']>(key: K, value: TaskStoreState['filters'][K]) => void;
  clearFilters: () => void;
  setDateRange: (range: DateRange) => void;
  addListFilter: (listId: ListId) => void;
  removeListFilter: (listId: ListId) => void;
  addStatusFilter: (status: TaskStatus) => void;
  removeStatusFilter: (status: TaskStatus) => void;
  addPriorityFilter: (priority: Priority) => void;
  removePriorityFilter: (priority: Priority) => void;
  addLabelFilter: (labelId: LabelId) => void;
  removeLabelFilter: (labelId: LabelId) => void;
  
  // View configuration
  setViewType: (type: TaskView['type']) => void;
  setGroupBy: (groupBy: TaskGroupBy | undefined) => void;
  toggleCompletedTasks: () => void;
  toggleCompactMode: () => void;
  
  // State management
  setCurrentTask: (task: AppTask | null) => void;
  updateTaskInCache: (task: AppTask) => void;
  removeTaskFromCache: (taskId: TaskId) => void;
  clearCache: () => void;
  
  // UI actions
  startBatchOperation: (type: TaskStoreState['batchOperations'][string]['type'], data: any) => string;
  updateBatchOperation: (operationId: string, updates: Partial<TaskStoreState['batchOperations'][string]>) => void;
  completeBatchOperation: (operationId: string, result?: TaskBatchResult) => void;
  cancelBatchOperation: (operationId: string) => void;
}

/**
 * Task store selectors
 */
export interface TaskStoreSelectors {
  // Basic selectors
  getTasks: StoreSelector<TaskStoreState, AppTask[]>;
  getCurrentTask: StoreSelector<TaskStoreState, AppTask | null>;
  getSelectedTasks: StoreSelector<TaskStoreState, AppTask[]>;
  getSelectedTaskIds: StoreSelector<TaskStoreState, TaskId[]>;
  
  // Filtered selectors
  getFilteredTasks: StoreSelector<TaskStoreState, AppTask[]>;
  getCompletedTasks: StoreSelector<TaskStoreState, AppTask[]>;
  getOverdueTasks: StoreSelector<TaskStoreState, AppTask[]>;
  getTodaysTasks: StoreSelector<TaskStoreState, AppTask[]>;
  getTasksByList: StoreSelector<ListId, StoreSelector<TaskStoreState, AppTask[]>>;
  getTasksByStatus: StoreSelector<TaskStatus, StoreSelector<TaskStoreState, AppTask[]>>;
  getTasksByPriority: StoreSelector<Priority, StoreSelector<TaskStoreState, AppTask[]>>;
  
  // Computed selectors
  getTaskCount: StoreSelector<TaskStoreState, number>;
  getCompletedTaskCount: StoreSelector<TaskStoreState, number>;
  getOverdueTaskCount: StoreSelector<TaskStoreState, number>;
  getFilterCount: StoreSelector<TaskStoreState, number>;
  getHasActiveFilters: StoreSelector<TaskStoreState, boolean>;
  
  // View selectors
  getGroupedTasks: StoreSelector<TaskStoreState, Record<string, AppTask[]>>;
  getSortedTasks: StoreSelector<TaskStoreState, AppTask[]>;
  
  // State selectors
  getIsLoading: StoreSelector<TaskStoreState, boolean>;
  getIsCreating: StoreSelector<TaskStoreState, boolean>;
  getIsUpdating: StoreSelector<TaskStoreState, boolean>;
  getIsDeleting: StoreSelector<TaskStoreState, boolean>;
  getError: StoreSelector<TaskStoreState, ApiError | null>;
  
  // Batch operation selectors
  getActiveBatchOperations: StoreSelector<TaskStoreState, string[]>;
  getBatchOperationProgress: StoreSelector<string, StoreSelector<TaskStoreState, number>>;
}

/**
 * Task store combined type
 */
export interface TaskStore extends TaskStoreState, TaskStoreActions, TaskStoreSelectors {}

// =============================================================================
// LIST STORE TYPES
// =============================================================================

/**
 * List store state
 */
export interface ListStoreState extends ListState {
  // Additional Zustand-specific properties
  lastFetched: Date | null;
  isInitialized: boolean;
  cache: Record<ListId, AppList>;
  favoriteLists: ListId[];
  recentLists: Array<{ listId: ListId; accessedAt: Date }>;
  currentView: ListGlobalView;
}

/**
 * List store actions
 */
export interface ListStoreActions {
  // Data loading
  loadLists: (params?: ListQueryParams) => Promise<void>;
  loadListById: (listId: ListId) => Promise<AppList | null>;
  refreshLists: () => Promise<void>;
  
  // CRUD operations
  createList: (data: CreateListData) => Promise<AppList>;
  updateList: (data: UpdateListData) => Promise<AppList>;
  deleteList: (listId: ListId) => Promise<void>;
  duplicateList: (listId: ListId) => Promise<AppList>;
  
  // Selection
  selectList: (listId: ListId) => void;
  selectMultipleLists: (listIds: ListId[]) => void;
  deselectList: (listId: ListId) => void;
  clearSelection: () => void;
  
  // Current list
  setCurrentList: (list: AppList | null) => void;
  switchList: (listId: ListId) => void;
  goBack: () => void;
  goForward: () => void;
  
  // Favorites
  addToFavorites: (listId: ListId) => void;
  removeFromFavorites: (listId: ListId) => void;
  toggleFavorite: (listId: ListId) => void;
  
  // Recent access
  addToRecent: (listId: ListId) => void;
  clearRecent: () => void;
  
  // Search and filtering
  setSearchQuery: (query: string) => void;
  setGlobalView: (view: ListGlobalView) => void;
  toggleSidebar: () => void;
  resizeSidebar: (width: number) => void;
  
  // State management
  updateListInCache: (list: AppList) => void;
  removeListFromCache: (listId: ListId) => void;
  clearCache: () => void;
}

/**
 * List store selectors
 */
export interface ListStoreSelectors {
  // Basic selectors
  getLists: StoreSelector<ListStoreState, AppList[]>;
  getCurrentList: StoreSelector<ListStoreState, AppList | null>;
  getSelectedLists: StoreSelector<ListStoreState, AppList[]>;
  getSelectedListIds: StoreSelector<ListStoreState, ListId[]>;
  
  // Filtered selectors
  getFavoriteLists: StoreSelector<ListStoreState, AppList[]>;
  getRecentLists: StoreSelector<ListStoreState, Array<{ list: AppList; accessedAt: Date }>>;
  getSharedLists: StoreSelector<ListStoreState, AppList[]>;
  getArchivedLists: StoreSelector<ListStoreState, AppList[]>;
  getSearchResults: StoreSelector<ListStoreState, AppList[]>;
  
  // Computed selectors
  getListCount: StoreSelector<ListStoreState, number>;
  getFavoriteCount: StoreSelector<ListStoreState, number>;
  getRecentCount: StoreSelector<ListStoreState, number>;
  getHasSelection: StoreSelector<ListStoreState, boolean>;
  
  // View selectors
  getVisibleLists: StoreSelector<ListStoreState, AppList[]>;
  getSortedLists: StoreSelector<ListStoreState, AppList[]>;
  
  // State selectors
  getIsLoading: StoreSelector<ListStoreState, boolean>;
  getIsCreating: StoreSelector<ListStoreState, boolean>;
  getIsUpdating: StoreSelector<ListStoreState, boolean>;
  getIsDeleting: StoreSelector<ListStoreState, boolean>;
  getError: StoreSelector<ListStoreState, ApiError | null>;
}

/**
 * List store combined type
 */
export interface ListStore extends ListStoreState, ListStoreActions, ListStoreSelectors {}

// =============================================================================
// LABEL STORE TYPES
// =============================================================================

/**
 * Label store state
 */
export interface LabelStoreState {
  labels: Label[];
  currentLabel: Label | null;
  selectedLabelIds: LabelId[];
  loading: LoadingState;
  error: ApiError | null;
  lastFetched: Date | null;
  isInitialized: boolean;
  cache: Record<LabelId, Label>;
  colorUsage: Record<string, number>;
  iconUsage: Record<string, number>;
  searchQuery: string;
}

/**
 * Label store actions
 */
export interface LabelStoreActions {
  // Data loading
  loadLabels: () => Promise<void>;
  loadLabelById: (labelId: LabelId) => Promise<Label | null>;
  refreshLabels: () => Promise<void>;
  
  // CRUD operations
  createLabel: (data: CreateLabelData) => Promise<Label>;
  updateLabel: (data: UpdateLabelData) => Promise<Label>;
  deleteLabel: (labelId: LabelId) => Promise<void>;
  duplicateLabel: (labelId: LabelId) => Promise<Label>;
  
  // Selection
  selectLabel: (labelId: LabelId) => void;
  selectMultipleLabels: (labelIds: LabelId[]) => void;
  deselectLabel: (labelId: LabelId) => void;
  clearSelection: () => void;
  
  // Current label
  setCurrentLabel: (label: Label | null) => void;
  
  // Search and filtering
  setSearchQuery: (query: string) => void;
  getLabelsByColor: (color: string) => Label[];
  getMostUsedLabels: (limit?: number) => Label[];
  getRecentlyUsedLabels: (limit?: number) => Label[];
  
  // State management
  updateLabelInCache: (label: Label) => void;
  removeLabelFromCache: (labelId: LabelId) => void;
  clearCache: () => void;
  updateColorUsage: (color: string, increment?: boolean) => void;
  updateIconUsage: (icon: string, increment?: boolean) => void;
}

/**
 * Label store selectors
 */
export interface LabelStoreSelectors {
  // Basic selectors
  getLabels: StoreSelector<LabelStoreState, Label[]>;
  getCurrentLabel: StoreSelector<LabelStoreState, Label | null>;
  getSelectedLabels: StoreSelector<LabelStoreState, Label[]>;
  getSelectedLabelIds: StoreSelector<LabelStoreState, LabelId[]>;
  
  // Filtered selectors
  getSearchResults: StoreSelector<LabelStoreState, Label[]>;
  getLabelsByColor: StoreSelector<string, StoreSelector<LabelStoreState, Label[]>>;
  getMostUsedLabels: StoreSelector<number, StoreSelector<LabelStoreState, Label[]>>;
  getRecentlyUsedLabels: StoreSelector<number, StoreSelector<LabelStoreState, Label[]>>;
  
  // Computed selectors
  getLabelCount: StoreSelector<LabelStoreState, number>;
  getSelectedCount: StoreSelector<LabelStoreState, number>;
  getHasSelection: StoreSelector<LabelStoreState, boolean>;
  getColorPalette: StoreSelector<LabelStoreState, string[]>;
  getIconLibrary: StoreSelector<LabelStoreState, string[]>;
  
  // State selectors
  getIsLoading: StoreSelector<LabelStoreState, boolean>;
  getIsCreating: StoreSelector<LabelStoreState, boolean>;
  getIsUpdating: StoreSelector<LabelStoreState, boolean>;
  getIsDeleting: StoreSelector<LabelStoreState, boolean>;
  getError: StoreSelector<LabelStoreState, ApiError | null>;
}

/**
 * Label store combined type
 */
export interface LabelStore extends LabelStoreState, LabelStoreActions, LabelStoreSelectors {}

// =============================================================================
// FORM STORE TYPES
// =============================================================================

/**
 * Form store state
 */
export interface FormStoreState {
  // Task forms
  taskForms: Record<string, TaskFormState>;
  currentTaskFormId: string | null;
  
  // List forms
  listForms: Record<string, ListFormState>;
  currentListFormId: string | null;
  
  // User forms
  userForm: FormState<UserFormData> | null;
  passwordForm: FormState<PasswordChangeFormData> | null;
  
  // Label forms
  labelForms: Record<string, FormState<LabelFormData>>;
  currentLabelFormId: string | null;
  
  // General forms
  generalForms: Record<string, FormState<Record<string, any>>>;
  currentGeneralFormId: string | null;
  
  // Auto-save state
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  lastSaved: Date | null;
  pendingSaves: Set<string>;
}

/**
 * Form store actions
 */
export interface FormStoreActions {
  // Task form management
  createTaskForm: (id: string, initialData?: Partial<TaskFormData>, config?: TaskFormConfig) => void;
  updateTaskForm: (id: string, data: Partial<TaskFormData>) => void;
  deleteTaskForm: (id: string) => void;
  setCurrentTaskForm: (id: string | null) => void;
  
  // List form management
  createListForm: (id: string, initialData?: Partial<ListFormData>, config?: ListFormConfig) => void;
  updateListForm: (id: string, data: Partial<ListFormData>) => void;
  deleteListForm: (id: string) => void;
  setCurrentListForm: (id: string | null) => void;
  
  // User form management
  initUserForm: (initialData: UserFormData) => void;
  updateUserForm: (data: Partial<UserFormData>) => void;
  clearUserForm: () => void;
  
  // Label form management
  createLabelForm: (id: string, initialData?: Partial<LabelFormData>, config?: LabelFormConfig) => void;
  updateLabelForm: (id: string, data: Partial<LabelFormData>) => void;
  deleteLabelForm: (id: string) => void;
  setCurrentLabelForm: (id: string | null) => void;
  
  // Auto-save management
  enableAutoSave: (interval: number) => void;
  disableAutoSave: () => void;
  saveForm: (formId: string, formType: 'task' | 'list' | 'label' | 'user') => Promise<void>;
  scheduleSave: (formId: string) => void;
  clearPendingSave: (formId: string) => void;
  
  // General form management
  createGeneralForm: (id: string, initialData: Record<string, any>) => void;
  updateGeneralForm: (id: string, data: Record<string, any>) => void;
  deleteGeneralForm: (id: string) => void;
  setCurrentGeneralForm: (id: string | null) => void;
}

/**
 * Form store selectors
 */
export interface FormStoreSelectors {
  // Task form selectors
  getTaskForm: StoreSelector<string, StoreSelector<FormStoreState, TaskFormState | undefined>>;
  getCurrentTaskForm: StoreSelector<FormStoreState, TaskFormState | null>;
  getAllTaskForms: StoreSelector<FormStoreState, Record<string, TaskFormState>>;
  
  // List form selectors
  getListForm: StoreSelector<string, StoreSelector<FormStoreState, ListFormState | undefined>>;
  getCurrentListForm: StoreSelector<FormStoreState, ListFormState | null>;
  getAllListForms: StoreSelector<FormStoreState, Record<string, ListFormState>>;
  
  // User form selectors
  getUserForm: StoreSelector<FormStoreState, FormState<UserFormData> | null>;
  getPasswordForm: StoreSelector<FormStoreState, FormState<PasswordChangeFormData> | null>;
  
  // Label form selectors
  getLabelForm: StoreSelector<string, StoreSelector<FormStoreState, FormState<LabelFormData> | undefined>>;
  getCurrentLabelForm: StoreSelector<FormStoreState, FormState<LabelFormData> | null>;
  getAllLabelForms: StoreSelector<FormStoreState, Record<string, FormState<LabelFormData>>>;
  
  // General form selectors
  getGeneralForm: StoreSelector<string, StoreSelector<FormStoreState, FormState<Record<string, any>> | undefined>>;
  getCurrentGeneralForm: StoreSelector<FormStoreState, FormState<Record<string, any>> | null>;
  getAllGeneralForms: StoreSelector<FormStoreState, Record<string, FormState<Record<string, any>>>>;
  
  // Auto-save selectors
  getAutoSaveEnabled: StoreSelector<FormStoreState, boolean>;
  getAutoSaveInterval: StoreSelector<FormStoreState, number>;
  getPendingSaves: StoreSelector<FormStoreState, Set<string>>;
  getHasPendingSaves: StoreSelector<FormStoreState, boolean>;
}

/**
 * Form store combined type
 */
export interface FormStore extends FormStoreState, FormStoreActions, FormStoreSelectors {}

// =============================================================================
// NOTIFICATION STORE TYPES
// =============================================================================

/**
 * Notification state
 */
export interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  maxNotifications: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  showProgress: boolean;
  pauseOnHover: boolean;
  autoClose: boolean;
  defaultDuration: number;
}

/**
 * App notification interface
 */
export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'reminder';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isVisible: boolean;
  isDismissible: boolean;
  isPersistent: boolean;
  actionLabel?: string;
  actionHandler?: () => void;
  createdAt: Date;
  expiresAt?: Date;
  readAt?: Date;
  dismissedAt?: Date;
}

/**
 * Show notification payload
 */
export interface ShowNotificationPayload {
  type: AppNotification['type'];
  title: string;
  message: string;
  duration?: number;
  isDismissible?: boolean;
  isPersistent?: boolean;
  actionLabel?: string;
  actionHandler?: () => void;
  data?: Record<string, any>;
}

/**
 * Notification store actions
 */
export interface NotificationStoreActions {
  // Notification management
  showNotification: (notification: ShowNotificationPayload) => string;
  hideNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  clearByType: (type: AppNotification['type']) => void;
  clearExpired: () => void;
  
  // Configuration
  setPosition: (position: NotificationState['position']) => void;
  setMaxNotifications: (max: number) => void;
  setAutoClose: (enabled: boolean, duration?: number) => void;
  setShowProgress: (show: boolean) => void;
  setPauseOnHover: (pause: boolean) => void;
}

/**
 * Notification store selectors
 */
export interface NotificationStoreSelectors {
  getNotifications: StoreSelector<NotificationState, AppNotification[]>;
  getUnreadNotifications: StoreSelector<NotificationState, AppNotification[]>;
  getVisibleNotifications: StoreSelector<NotificationState, AppNotification[]>;
  getNotificationById: StoreSelector<string, StoreSelector<NotificationState, AppNotification | undefined>>;
  getUnreadCount: StoreSelector<NotificationState, number>;
  getHasNotifications: StoreSelector<NotificationState, boolean>;
  getHasUnread: StoreSelector<NotificationState, boolean>;
  getConfig: StoreSelector<NotificationState, Pick<NotificationState, 'position' | 'maxNotifications' | 'showProgress' | 'pauseOnHover' | 'autoClose' | 'defaultDuration'>>;
}

/**
 * Notification store combined type
 */
export interface NotificationStore extends NotificationState, NotificationStoreActions, NotificationStoreSelectors {}

// =============================================================================
// MODAL STORE TYPES
// =============================================================================

/**
 * Modal state
 */
export interface ModalState {
  modals: AppModal[];
  activeModalId: string | null;
  modalStack: string[];
  isAnyModalOpen: boolean;
  closeOnOverlayClick: boolean;
  closeOnEsc: boolean;
  trapFocus: boolean;
  restoreFocus: boolean;
}

/**
 * App modal interface
 */
export interface AppModal {
  id: string;
  type: 'dialog' | 'drawer' | 'bottom-sheet' | 'popover';
  title?: string;
  description?: string;
  content: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  isOpen: boolean;
  isClosable: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
  props?: Record<string, any>;
  onOpen?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  createdAt: Date;
}

/**
 * Show modal payload
 */
export interface ShowModalPayload {
  id?: string;
  type: AppModal['type'];
  title?: string;
  description?: string;
  content: React.ReactNode;
  size?: AppModal['size'];
  position?: AppModal['position'];
  isClosable?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
  props?: Record<string, any>;
  onOpen?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Modal store actions
 */
export interface ModalStoreActions {
  // Modal management
  showModal: (modal: ShowModalPayload) => string;
  hideModal: (id: string) => void;
  closeModal: (id: string) => void;
  closeActiveModal: () => void;
  closeAllModals: () => void;
  
  // Stack management
  pushModal: (modal: ShowModalPayload) => string;
  popModal: () => string | null;
  clearModalStack: () => void;
  
  // Configuration
  setCloseOnOverlayClick: (close: boolean) => void;
  setCloseOnEsc: (close: boolean) => void;
  setTrapFocus: (trap: boolean) => void;
  setRestoreFocus: (restore: boolean) => void;
}

/**
 * Modal store selectors
 */
export interface ModalStoreSelectors {
  getModals: StoreSelector<ModalState, AppModal[]>;
  getActiveModal: StoreSelector<ModalState, AppModal | null>;
  getActiveModalId: StoreSelector<ModalState, string | null>;
  getModalById: StoreSelector<string, StoreSelector<ModalState, AppModal | undefined>>;
  getModalStack: StoreSelector<ModalState, string[]>;
  getIsAnyModalOpen: StoreSelector<ModalState, boolean>;
  getConfig: StoreSelector<ModalState, Pick<ModalState, 'closeOnOverlayClick' | 'closeOnEsc' | 'trapFocus' | 'restoreFocus'>>;
}

/**
 * Modal store combined type
 */
export interface ModalStore extends ModalState, ModalStoreActions, ModalStoreSelectors {}

// =============================================================================
// PREFERENCES AND USER CONFIG TYPES
// =============================================================================

/**
 * User preferences
 */
export interface AppPreferences {
  theme: Theme;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStart: 'sunday' | 'monday';
  
  // UI preferences
  sidebarCollapsed: boolean;
  defaultView: ViewType;
  defaultListView: ListViewType;
  compactMode: boolean;
  showCompletedTasks: boolean;
  showSubtasks: boolean;
  showDescriptions: boolean;
  showDueDates: boolean;
  showPriorities: boolean;
  showLabels: boolean;
  
  // Notification preferences
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    sound: boolean;
    taskReminders: boolean;
    deadlineAlerts: boolean;
    overdueAlerts: boolean;
    weeklyDigest: boolean;
    achievementNotifications: boolean;
  };
  
  // Privacy preferences
  privacy: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    showActivity: boolean;
    shareAnalytics: boolean;
    allowDataCollection: boolean;
  };
  
  // Performance preferences
  performance: {
    enableAnimations: boolean;
    enableTransitions: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
    cacheSize: 'small' | 'medium' | 'large';
    autoRefreshInterval: number;
    lazyLoading: boolean;
  };
}

// =============================================================================
// STORE MIDDLEWARE TYPES
// =============================================================================

/**
 * DevTools middleware configuration
 */
export interface DevToolsConfig {
  name?: string;
  enabled?: boolean;
  actionSanitizer?: (action: any) => any;
  stateSanitizer?: (state: any) => any;
  trace?: boolean;
  traceLimit?: number;
}

/**
 * Immer middleware configuration
 */
export interface ImmerConfig {
  enabled?: boolean;
  autoFreeze?: boolean;
}

/**
 * Persist middleware configuration
 */
export interface PersistConfig {
  name: string;
  version?: number;
  migrate?: (persistedState: any, version: number) => any;
  partialize?: (state: any) => any;
  skipHydration?: boolean;
  storage?: {
    getItem: (name: string) => string | null;
    setItem: (name: string, value: string) => void;
    removeItem: (name: string) => void;
  };
  throttleTime?: number;
}

// =============================================================================
// STORE INITIALIZATION TYPES
// =============================================================================

/**
 * Store initialization config
 */
export interface StoreInitConfig {
  persist?: boolean;
  devtools?: boolean;
  immer?: boolean;
  subscribeWithSelector?: boolean;
  createdAt?: Date;
  version?: string;
}

/**
 * Store provider props
 */
export interface StoreProviderProps {
  children: React.ReactNode;
  config?: StoreInitConfig;
  stores?: {
    app?: Partial<AppStore>;
    tasks?: Partial<TaskStore>;
    lists?: Partial<ListStore>;
    labels?: Partial<LabelStore>;
    forms?: Partial<FormStore>;
    notifications?: Partial<NotificationStore>;
    modals?: Partial<ModalStore>;
  };
}

// =============================================================================
// EXPORT INTERFACES FOR FORM CONFIG
// =============================================================================

/**
 * Task form configuration for store
 */
export interface TaskFormConfig {
  initialValues: Partial<TaskFormData>;
  autoSave?: boolean;
  validation?: TaskFormValidationRules;
}

/**
 * List form configuration for store
 */
export interface ListFormConfig {
  initialValues: Partial<ListFormData>;
  autoSave?: boolean;
  validation?: ListFormValidationRules;
}

/**
 * Label form configuration for store
 */
export interface LabelFormConfig {
  initialValues: Partial<LabelFormData>;
  autoSave?: boolean;
  validation?: LabelFormValidationRules;
}

/**
 * Password change form data
 */
export interface PasswordChangeFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Create label data
 */
export interface CreateLabelData {
  name: string;
  icon: string;
  color: string;
  description?: string;
}

/**
 * Update label data
 */
export interface UpdateLabelData extends Partial<CreateLabelData> {
  id: LabelId;
}

/**
 * Label form validation rules
 */
export interface LabelFormValidationRules {
  name: ValidationRule[];
  icon: ValidationRule[];
  color: ValidationRule[];
  description?: ValidationRule[];
}

/**
 * Validation rule
 */
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  custom?: (value: any, formData?: Record<string, any>) => boolean | string;
}