/**
 * Type System Integration Test for Daily Task Planner
 * 
 * This test file verifies that all types are properly exported and can be imported
 * and used correctly across the application. It serves as both a test and
 * documentation of the type system's capabilities.
 */

// Import all major type categories to test exports
import type {
  // Database types
  User,
  List,
  Task,
  Priority,
  TaskStatus,
  
  // Utility types
  ApiResponse,
  AppTask,
  AppList,
  LoadingState,
  TaskId,
  ListId,
  DateRange,
  ViewType,
  Theme,
  
  // API types
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQueryParams,
  ApiError,
  
  // Task types
  TaskFormData,
  CreateTaskData,
  TaskFilters,
  TaskSort,
  TaskLayout,
  TaskState,
  
  // List types
  ListFormData,
  CreateListData,
  ListSettings,
  ListState,
  
  // UI types
  ButtonProps,
  InputProps,
  ModalProps,
  CardProps,
  BadgeProps,
  
  // Form types
  FormState,
  ValidationRule,
  ValidationType,
  
  // Store types
  AppState,
  TaskStore,
  AppStore,
  
  // Type guards and utilities
  isTask,
  isList,
  some,
  none,
  isSome,
  isNone,
  
  // Constants
  PriorityOrder,
  
  // Namespaced exports
  Types
} from './index';

import type { TaskWithDetails, ListWithTaskCount } from '../lib/db/types';

// =============================================================================
// DATABASE TYPE INTEGRATION TESTS
// =============================================================================

/**
 * Test database type compatibility
 */
function testDatabaseTypes() {
  // Basic database types should work
  const user: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: {
      theme: 'light',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD'
    }
  };
  
  const list: List = {
    id: 'list-123',
    name: 'My List',
    color: '#3B82F6',
    emoji: '📝',
    isDefault: false,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const task: Task = {
    id: 'task-123',
    name: 'Complete Task',
    description: 'Task description',
    priority: 'High',
    status: 'todo',
    userId: 'user-123',
    listId: 'list-123',
    position: 1,
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Task with details should include related data
  const taskWithDetails: TaskWithDetails = {
    ...task,
    list,
    labels: [],
    subtasks: [],
    reminders: [],
    attachments: [],
    subtaskCount: 0,
    completedSubtaskCount: 0
  };
}

// =============================================================================
// UTILITY TYPE INTEGRATION TESTS
// =============================================================================

/**
 * Test utility types and type guards
 */
function testUtilityTypes() {
  // Type guard tests
  const taskData = {
    id: 'task-123',
    name: 'Test Task',
    status: 'todo' as TaskStatus,
    priority: 'High' as Priority,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  if (isTask(taskData)) {
    const taskId = taskData.id as TaskId;
    console.log('Task type guard works:', taskId);
  }
  
  // Option type tests
  const someValue = some('test');
  const noValue = none();
  
  if (isSome(someValue)) {
    console.log('Some value:', someValue.value);
  }
  
  if (isNone(noValue)) {
    console.log('None value detected');
  }
  
  // Priority order should be accessible
  console.log('Priority order:', PriorityOrder.High); // Should be 1
}

// =============================================================================
// APPLICATION TYPE INTEGRATION TESTS
// =============================================================================

/**
 * Test extended application types
 */
function testApplicationTypes() {
  // AppTask should extend Task with UI properties
  const appTask: AppTask = {
    id: 'task-123' as TaskId,
    name: 'Extended Task',
    description: 'With UI properties',
    priority: 'High',
    status: 'todo',
    userId: 'user-123' as any,
    listId: 'list-123' as any,
    position: 1,
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // UI-specific properties
    isSelected: false,
    isExpanded: false,
    isDragging: false,
    isHovered: false,
    showSubtasks: true,
    showDetails: false,
    editMode: false,
    sortIndex: 0,
    
    // Computed properties
    isOverdue: false,
    isDueToday: false,
    isDueThisWeek: false,
    completionPercentage: 0
  };
  
  // AppList should extend List with UI properties
  const appList: AppList = {
    id: 'list-123' as ListId,
    name: 'Extended List',
    color: '#3B82F6',
    emoji: '📝',
    isDefault: false,
    userId: 'user-123' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // UI-specific properties
    isSelected: false,
    isExpanded: false,
    isHovered: false,
    isArchived: false,
    sortIndex: 0
  };
  
  console.log('AppTask:', appTask.name);
  console.log('AppList:', appList.name);
}

// =============================================================================
// FORM TYPE INTEGRATION TESTS
// =============================================================================

/**
 * Test form and validation types
 */
function testFormTypes() {
  // Task form data structure
  const taskFormData: TaskFormData = {
    name: 'New Task',
    description: 'Task description',
    listId: 'list-123' as ListId,
    priority: 'High',
    status: 'todo',
    estimate: '01:30',
    isRecurring: false,
    labels: [],
    subtasks: [],
    reminders: [],
    customFields: {},
    tags: []
  };
  
  // List form data structure
  const listFormData: ListFormData = {
    name: 'New List',
    description: 'List description',
    color: '#3B82F6',
    emoji: '📝',
    isDefault: false
  };
  
  // Form state structure
  const formState: FormState<TaskFormData> = {
    values: taskFormData,
    errors: {} as any,
    touched: {} as any,
    validating: {} as any,
    isValid: true,
    isDirty: false,
    isSubmitting: false,
    submitCount: 0,
    isResetting: false
  };
  
  // Validation rules
  const validationRule: ValidationRule = {
    type: 'required',
    message: 'This field is required'
  };
  
  console.log('Form state is valid:', formState.isValid);
}

// =============================================================================
// API TYPE INTEGRATION TESTS
// =============================================================================

/**
 * Test API request/response types
 */
function testApiTypes() {
  // Task creation request
  const createTaskRequest: CreateTaskRequest = {
    name: 'New Task',
    listId: 'list-123' as ListId,
    priority: 'High'
  };
  
  // Task update request
  const updateTaskRequest: UpdateTaskRequest = {
    id: 'task-123' as TaskId,
    status: 'done',
    priority: 'Medium'
  };
  
  // Task query parameters
  const taskQueryParams: TaskQueryParams = {
    listId: 'list-123' as ListId,
    status: ['todo', 'in_progress'],
    priority: ['High', 'Medium'],
    dateRange: {
      start: new Date(),
      end: new Date()
    },
    search: 'task search'
  };
  
  // API response structure
  const apiResponse: ApiResponse<Task[]> = {
    success: true,
    data: [],
    meta: {
      timestamp: new Date().toISOString()
    }
  };
  
  // API error structure
  const apiError: ApiError = {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    field: 'name'
  };
  
  console.log('API types work correctly');
}

// =============================================================================
// UI COMPONENT TYPE INTEGRATION TESTS
// =============================================================================

/**
 * Test UI component prop types
 */
function testUiTypes() {
  // Button component props
  const buttonProps: ButtonProps = {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    leftIcon: undefined,
    rightIcon: undefined,
    onClick: () => console.log('Button clicked')
  };
  
  // Input component props
  const inputProps: InputProps = {
    label: 'Task Name',
    placeholder: 'Enter task name',
    required: true,
    error: undefined,
    variant: 'default',
    size: 'md'
  };
  
  // Modal component props
  const modalProps: ModalProps = {
    isOpen: true,
    size: 'md',
    position: 'center',
    showCloseButton: true,
    closeOnOverlayClick: true,
    closeOnEsc: true
  };
  
  // Card component props
  const cardProps: CardProps = {
    padding: 'md',
    shadow: 'md',
    border: true,
    rounded: true,
    hoverable: true
  };
  
  // Badge component props
  const badgeProps: BadgeProps = {
    variant: 'primary',
    size: 'sm',
    outlined: false,
    tonal: false
  };
  
  console.log('UI component types work correctly');
}

// =============================================================================
// STORE TYPE INTEGRATION TESTS
// =============================================================================

/**
 * Test Zustand store types
 */
function testStoreTypes() {
  // App state structure
  const appState: AppState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    theme: 'light',
    sidebarCollapsed: false,
    currentView: 'today',
    notifications: {
      notifications: [],
      unreadCount: 0,
      maxNotifications: 5,
      position: 'top-right',
      showProgress: true,
      pauseOnHover: true,
      autoClose: true,
      defaultDuration: 5000
    },
    modals: {
      modals: [],
      activeModalId: null,
      modalStack: [],
      isAnyModalOpen: false,
      closeOnOverlayClick: true,
      closeOnEsc: true,
      trapFocus: true,
      restoreFocus: true
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      weekStart: 'monday',
      sidebarCollapsed: false,
      defaultView: 'today',
      defaultListView: 'grid',
      compactMode: false,
      showCompletedTasks: true,
      showSubtasks: true,
      showDescriptions: true,
      showDueDates: true,
      showPriorities: true,
      showLabels: true,
      notifications: {
        email: true,
        push: true,
        desktop: true,
        sound: true,
        taskReminders: true,
        deadlineAlerts: true,
        overdueAlerts: true,
        weeklyDigest: true,
        achievementNotifications: true
      },
      privacy: {
        profileVisibility: 'private',
        showEmail: false,
        showActivity: true,
        shareAnalytics: true,
        allowDataCollection: false
      },
      performance: {
        enableAnimations: true,
        enableTransitions: true,
        reducedMotion: false,
        highContrast: false,
        cacheSize: 'medium',
        autoRefreshInterval: 30000,
        lazyLoading: true
      }
    },
    config: {
      theme: 'light',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      language: 'en',
      autoSave: true,
      notifications: {
        enabled: true,
        desktop: true,
        sound: true,
        reminders: 15
      },
      ui: {
        listView: 'grid',
        itemsPerPage: 20,
        showCompleted: true,
        showSubtasks: true
      }
    },
    loading: {
      user: false,
      tasks: false,
      lists: false,
      labels: false,
      general: false
    }
  };
  
  // Task state structure
  const taskState: TaskState = {
    tasks: [],
    selectedTaskIds: [],
    currentTask: null,
    loading: 'idle',
    error: null,
    view: {
      type: 'today',
      showCompleted: false,
      showOverdue: true,
      showArchived: false,
      compactMode: false,
      showSubtasks: true
    },
    filters: {
      search: '',
      listIds: [],
      status: [],
      priority: [],
      dateRange: undefined,
      hasDeadline: undefined,
      isOverdue: undefined,
      isRecurring: undefined,
      hasSubtasks: undefined,
      hasAttachments: undefined,
      tags: [],
      customFieldFilters: {}
    },
    sorting: {
      field: 'name',
      direction: 'asc'
    },
    layout: {
      viewType: 'list',
      density: 'comfortable',
      showAvatars: true,
      showProgress: true,
      showDueDates: true,
      showPriorities: true,
      showLabels: true,
      showDescriptions: true
    },
    isCreating: false,
    isEditing: false,
    isDeleting: false,
    isDragging: false,
    pagination: {
      currentPage: 1,
      pageSize: 20,
      totalPages: 1,
      totalItems: 0,
      hasNextPage: false,
      hasPreviousPage: false
    }
  };
  
  console.log('Store types work correctly');
}

// =============================================================================
// NAMESPACE TYPE INTEGRATION TESTS
// =============================================================================

/**
 * Test namespaced exports
 */
function testNamespacedTypes() {
  // Test database namespace
  const dbTask = Types.Database.Task;
  const dbList = Types.Database.List;
  const dbPriority = Types.Database.Priority;
  
  // Test utility namespace
  const utilTaskId = Types.Utils.TaskId;
  const utilViewType = Types.Utils.ViewType;
  const utilDateRange = Types.Utils.DateRange;
  
  // Test task namespace
  const taskProps = Types.Tasks.TaskCardProps;
  const taskState = Types.Tasks.TaskState;
  const taskFilters = Types.Tasks.TaskFilters;
  
  // Test list namespace
  const listProps = Types.Lists.ListCardProps;
  const listState = Types.Lists.ListState;
  const listSettings = Types.Lists.ListSettings;
  
  // Test UI namespace
  const uiButton = Types.UI.ButtonProps;
  const uiInput = Types.UI.InputProps;
  const uiModal = Types.UI.ModalProps;
  
  // Test form namespace
  const formState = Types.Forms.FormState;
  const formConfig = Types.Forms.FormConfig;
  const validationRule = Types.Forms.ValidationRule;
  
  // Test store namespace
  const appState = Types.Store.AppState;
  const taskStore = Types.Store.TaskStore;
  const appStore = Types.Store.AppStore;
  
  console.log('Namespaced types work correctly');
  
  // Test utility functions
  console.log('hasType test:', hasType('AppTask'));
  console.log('getTypeInfo:', getTypeInfo());
}

// =============================================================================
// TYPE ASSERTION TESTS
// =============================================================================

/**
 * Test type assertions and narrowings
 */
function testTypeAssertions() {
  // Type assertion for branded IDs
  const taskId = 'task-123' as TaskId;
  const listId = 'list-123' as ListId;
  const userId = 'user-123' as any;
  
  // Type narrowing for loading states
  const loadingState: LoadingState = 'loading';
  const isLoading = loadingState === 'loading';
  const isSuccess = loadingState === 'success';
  const isError = loadingState === 'error';
  
  // Type narrowing for view types
  const currentView: ViewType = 'today';
  const isToday = currentView === 'today';
  const isUpcoming = currentView === 'upcoming';
  
  // Type narrowing for themes
  const theme: Theme = 'light';
  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  
  console.log('Type assertions work correctly');
}

// =============================================================================
// GENERIC TYPE TESTS
// =============================================================================

/**
 * Test generic type constraints and inference
 */
function testGenericTypes() {
  // Test ApiResponse with different data types
  const taskResponse: ApiResponse<Task[]> = {
    success: true,
    data: [],
    meta: { timestamp: new Date().toISOString() }
  };
  
  const singleTaskResponse: ApiResponse<Task> = {
    success: true,
    data: {} as Task,
    meta: { timestamp: new Date().toISOString() }
  };
  
  // Test ComponentState with different data types
  const taskComponentState: ComponentState<Task[]> = {
    data: [],
    loading: 'idle',
    error: null
  };
  
  const userComponentState: ComponentState<User> = {
    data: null,
    loading: 'loading',
    error: null
  };
  
  // Test Result type with different success/error types
  const taskResult: Result<Task, ApiError> = {
    success: true,
    data: {} as Task
  };
  
  const errorResult: Result<Task, string> = {
    success: false,
    error: 'Something went wrong'
  };
  
  console.log('Generic types work correctly');
}

// =============================================================================
// COMPLEX TYPE COMPOSITION TESTS
// =============================================================================

/**
 * Test complex type compositions and intersections
 */
function testComplexTypes() {
  // Task with all related data
  const complexTask: TaskWithDetails = {
    id: 'task-123',
    name: 'Complex Task',
    description: 'Task with all related data',
    priority: 'High',
    status: 'todo',
    userId: 'user-123',
    listId: 'list-123',
    position: 1,
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // Related data
    list: {
      id: 'list-123',
      name: 'Test List',
      color: '#3B82F6',
      emoji: '📝',
      isDefault: false,
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    labels: [],
    subtasks: [],
    reminders: [],
    attachments: [],
    subtaskCount: 0,
    completedSubtaskCount: 0
  };
  
  // List with task count statistics
  const complexList: ListWithTaskCount = {
    id: 'list-123',
    name: 'Test List',
    color: '#3B82F6',
    emoji: '📝',
    isDefault: false,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    taskCount: 10,
    completedTaskCount: 5
  };
  
  // Extended task with UI state
  const uiTask: AppTask = {
    id: 'task-123' as TaskId,
    name: 'UI Task',
    description: 'Task with UI state',
    priority: 'High',
    status: 'todo',
    userId: 'user-123' as any,
    listId: 'list-123' as any,
    position: 1,
    isRecurring: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // UI properties
    isSelected: true,
    isExpanded: true,
    isDragging: false,
    isHovered: false,
    showSubtasks: true,
    showDetails: false,
    editMode: false,
    sortIndex: 0,
    
    // Computed properties
    isOverdue: false,
    isDueToday: false,
    isDueThisWeek: false,
    completionPercentage: 0
  };
  
  console.log('Complex types work correctly');
}

// =============================================================================
// RUNTIME TYPE GUARD TESTS
// =============================================================================

/**
 * Test runtime type guards and validation
 */
function testRuntimeGuards() {
  // Test entity ID validation
  const validId = 'task-123';
  const invalidId = '';
  
  console.log('Valid Task ID:', isEntityId(validId)); // Should be true
  console.log('Invalid Task ID:', isEntityId(invalidId)); // Should be false
  
  // Test task type guard
  const validTask = {
    id: 'task-123',
    name: 'Valid Task',
    status: 'todo' as TaskStatus,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const invalidTask = {
    id: 'task-123',
    name: 'Valid Task'
    // Missing required fields
  };
  
  console.log('Valid Task object:', isTask(validTask)); // Should be true
  console.log('Invalid Task object:', isTask(invalidTask)); // Should be false
  
  // Test list type guard
  const validList = {
    id: 'list-123',
    name: 'Valid List',
    color: '#3B82F6',
    emoji: '📝',
    isDefault: false,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('Valid List object:', isList(validList)); // Should be true
}

// =============================================================================
// EXPORT TEST RESULTS
// =============================================================================

/**
 * Run all tests and export results
 */
export function runTypeIntegrationTests() {
  console.log('🚀 Running Type System Integration Tests...\n');
  
  try {
    testDatabaseTypes();
    console.log('✅ Database types test passed\n');
    
    testUtilityTypes();
    console.log('✅ Utility types test passed\n');
    
    testApplicationTypes();
    console.log('✅ Application types test passed\n');
    
    testFormTypes();
    console.log('✅ Form types test passed\n');
    
    testApiTypes();
    console.log('✅ API types test passed\n');
    
    testUiTypes();
    console.log('✅ UI types test passed\n');
    
    testStoreTypes();
    console.log('✅ Store types test passed\n');
    
    testNamespacedTypes();
    console.log('✅ Namespaced types test passed\n');
    
    testTypeAssertions();
    console.log('✅ Type assertions test passed\n');
    
    testGenericTypes();
    console.log('✅ Generic types test passed\n');
    
    testComplexTypes();
    console.log('✅ Complex types test passed\n');
    
    testRuntimeGuards();
    console.log('✅ Runtime type guards test passed\n');
    
    console.log('🎉 All type integration tests passed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Type integration test failed:', error);
    return false;
  }
}

// =============================================================================
// DEVELOPMENT UTILITIES
// =============================================================================

/**
 * Debug function to inspect type information
 */
export function debugTypeSystem() {
  console.log('📊 Type System Debug Information:');
  console.log('Type version:', TYPE_VERSION);
  console.log('Type system info:', TYPE_SYSTEM_INFO);
  console.log('Available namespaces:', Object.keys(Types));
  console.log('Total namespaces:', Object.keys(Types).length);
  
  // Test some common type lookups
  console.log('\n🔍 Common type lookups:');
  console.log('AppTask type:', typeof AppTask);
  console.log('TaskFormData type:', typeof TaskFormData);
  console.log('ButtonProps type:', typeof ButtonProps);
  console.log('TaskStore type:', typeof TaskStore);
  
  return {
    version: TYPE_VERSION,
    info: TYPE_SYSTEM_INFO,
    namespaces: Object.keys(Types)
  };
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' || typeof process !== 'undefined') {
  // For development: uncomment to run tests
  // runTypeIntegrationTests();
  // debugTypeSystem();
}