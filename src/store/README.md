# Zustand Store System - Comprehensive State Management

This document provides comprehensive documentation for the Zustand-based state management system implemented for the Daily Task Planner application.

## Overview

The system consists of six main stores that work together to provide a complete state management solution:

- **TaskStore**: Task CRUD operations, filtering, and batch processing
- **ListStore**: List management with favorites and navigation
- **AppStore**: Global application state and user management
- **FormStore**: Multi-form state management with auto-save
- **NotificationStore**: In-app notification system
- **ModalStore**: Modal and dialog management

## Quick Start

### Basic Setup

```typescript
import { initializeStores, useTasks, useLists, useApp } from '@/store';

// Initialize all stores
const stores = initializeStores({
  userId: 'your-user-id',
  enableDevtools: process.env.NODE_ENV === 'development',
  enablePersistence: true,
  enableErrorHandling: true
});

// Or use individual stores
import { useTaskStore } from '@/store/task-store';
const taskStore = useTaskStore();
```

### React Hook Usage

```typescript
import React from 'react';
import { useTasks, useLists, useApp, useNotifications } from '@/store';

function MyComponent() {
  // Task operations
  const { 
    tasks, 
    createTask, 
    updateTask, 
    filteredTasks,
    isLoading 
  } = useTasks();

  // List operations
  const { 
    lists, 
    currentList, 
    createList 
  } = useLists();

  // App state
  const { 
    user, 
    theme, 
    setTheme 
  } = useApp();

  // Notifications
  const { success, error } = useNotifications();

  const handleCreateTask = async () => {
    try {
      const task = await createTask({
        name: 'New Task',
        description: 'Task description',
        priority: 'High',
        status: 'todo',
        listId: 'list-id'
      });
      success('Success', 'Task created successfully!');
    } catch (err) {
      error('Error', 'Failed to create task');
    }
  };

  return (
    <div>
      <h1>Hello {user?.name}</h1>
      <button onClick={handleCreateTask}>Create Task</button>
      <div>Tasks: {tasks.length}</div>
    </div>
  );
}
```

## Detailed Store Documentation

### TaskStore

The TaskStore handles all task-related operations with optimistic updates and batch processing.

#### State

```typescript
interface TaskStoreState {
  tasks: AppTask[];
  currentTask: AppTask | null;
  selectedTaskIds: TaskId[];
  loading: {
    tasks: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    batch: boolean;
  };
  error: ApiError | null;
  filters: TaskFilters;
  view: TaskView;
  cache: Record<TaskId, AppTask>;
  batchOperations: Record<string, BatchOperation>;
}
```

#### Actions

```typescript
// Data loading
loadTasks(params?: TaskQueryParams): Promise<void>;
loadTaskById(taskId: TaskId): Promise<AppTask | null>;
refreshTasks(): Promise<void>;

// CRUD operations
createTask(data: CreateTaskData): Promise<AppTask>;
updateTask(data: UpdateTaskData): Promise<AppTask>;
deleteTask(taskId: TaskId): Promise<void>;
duplicateTask(taskId: TaskId): Promise<AppTask>;

// Batch operations
batchUpdateTasks(data: Partial<UpdateTaskData> & { taskIds: TaskId[] }): Promise<TaskBatchResult>;
batchDeleteTasks(taskIds: TaskId[]): Promise<TaskBatchResult>;
batchMoveTasks(taskIds: TaskId[], listId: ListId): Promise<TaskBatchResult>;

// Selection
selectTask(taskId: TaskId): void;
selectMultipleTasks(taskIds: TaskId[]): void;
clearSelection(): void;

// Filtering
setSearchQuery(query: string): void;
setFilter(key: keyof TaskFilters, value: any): void;
clearFilters(): void;
addListFilter(listId: ListId): void;
addStatusFilter(status: TaskStatus): void;
addPriorityFilter(priority: Priority): void;

// View
setViewType(type: TaskView['type']): void;
setGroupBy(groupBy: TaskGroupBy | undefined): void;
toggleCompletedTasks(): void;
toggleCompactMode(): void;
```

#### Usage Examples

```typescript
import { useTasks } from '@/store';

function TaskList() {
  const { 
    tasks,
    filteredTasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    selectTask,
    setSearchQuery,
    addStatusFilter,
    getCompletedTasks,
    getOverdueTasks
  } = useTasks();

  // Create new task
  const handleCreateTask = async () => {
    const task = await createTask({
      name: 'My New Task',
      description: 'Task description',
      priority: 'High',
      status: 'todo',
      listId: 'default-list'
    });
  };

  // Update task
  const handleUpdateTask = async (taskId: string) => {
    await updateTask({
      id: taskId,
      status: 'done',
      priority: 'Medium'
    });
  };

  // Search and filter
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterStatus = (status: TaskStatus) => {
    addStatusFilter(status);
  };

  return (
    <div>
      {/* Search */}
      <input 
        type="text" 
        placeholder="Search tasks..."
        onChange={(e) => handleSearch(e.target.value)}
      />
      
      {/* Filter buttons */}
      <button onClick={() => handleFilterStatus('todo')}>Todo</button>
      <button onClick={() => handleFilterStatus('in_progress')}>In Progress</button>
      <button onClick={() => handleFilterStatus('done')}>Done</button>
      
      {/* Task list */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        filteredTasks.map(task => (
          <div key={task.id} onClick={() => selectTask(task.id)}>
            <h3>{task.name}</h3>
            <p>{task.description}</p>
            <span>Priority: {task.priority}</span>
            <span>Status: {task.status}</span>
            <button onClick={() => handleUpdateTask(task.id)}>
              Mark Done
            </button>
          </div>
        ))
      )}
    </div>
  );
}
```

### ListStore

The ListStore manages user lists with navigation, favorites, and recent access features.

#### State

```typescript
interface ListStoreState {
  lists: AppList[];
  currentList: AppList | null;
  selectedListIds: ListId[];
  favoriteLists: ListId[];
  recentLists: Array<{ listId: ListId; accessedAt: Date }>;
  currentView: ListGlobalView;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  loading: {
    lists: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    batch: boolean;
  };
  error: ApiError | null;
}
```

#### Actions

```typescript
// Data loading
loadLists(params?: ListQueryParams): Promise<void>;
loadListById(listId: ListId): Promise<AppList | null>;
refreshLists(): Promise<void>;

// CRUD operations
createList(data: CreateListData): Promise<AppList>;
updateList(data: UpdateListData): Promise<AppList>;
deleteList(listId: ListId): Promise<void>;
duplicateList(listId: ListId): Promise<AppList>;

// Navigation
setCurrentList(list: AppList | null): void;
switchList(listId: ListId): void;
goBack(): void;
goForward(): void;

// Favorites
addToFavorites(listId: ListId): void;
removeFromFavorites(listId: ListId): void;
toggleFavorite(listId: ListId): void;

// Recent access
addToRecent(listId: ListId): void;
clearRecent(): void;

// View
setGlobalView(view: ListGlobalView): void;
toggleSidebar(): void;
resizeSidebar(width: number): void;
```

#### Usage Examples

```typescript
import { useLists } from '@/store';

function ListSidebar() {
  const {
    lists,
    currentList,
    favoriteLists,
    recentLists,
    createList,
    switchList,
    addToFavorites,
    toggleSidebar,
    getFavoriteLists,
    getRecentLists
  } = useLists();

  const handleSwitchList = (listId: string) => {
    switchList(listId);
  };

  const handleCreateList = async () => {
    const newList = await createList({
      name: 'New List',
      color: '#3B82F6',
      emoji: '📋',
      isDefault: false
    });
  };

  const favoriteListsData = getFavoriteLists();
  const recentListsData = getRecentLists();

  return (
    <div className="sidebar">
      {/* Sidebar toggle */}
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
      
      {/* Create list */}
      <button onClick={handleCreateList}>+ New List</button>
      
      {/* Favorites */}
      <h3>Favorites</h3>
      {favoriteListsData.map(list => (
        <div
          key={list.id}
          className={currentList?.id === list.id ? 'active' : ''}
          onClick={() => handleSwitchList(list.id)}
        >
          <span>{list.emoji}</span>
          <span>{list.name}</span>
        </div>
      ))}
      
      {/* All lists */}
      <h3>All Lists</h3>
      {lists.map(list => (
        <div
          key={list.id}
          className={currentList?.id === list.id ? 'active' : ''}
          onClick={() => handleSwitchList(list.id)}
        >
          <span>{list.emoji}</span>
          <span>{list.name}</span>
          <span>{list.taskCount}</span>
          <button onClick={() => addToFavorites(list.id)}>
            ★
          </button>
        </div>
      ))}
      
      {/* Recent */}
      <h3>Recent</h3>
      {recentListsData.map(({ list, accessedAt }) => (
        <div
          key={list.id}
          onClick={() => handleSwitchList(list.id)}
        >
          <span>{list.emoji}</span>
          <span>{list.name}</span>
          <small>{accessedAt.toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
}
```

### AppStore

The AppStore manages global application state including user authentication, theme, and preferences.

#### State

```typescript
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | null;
  theme: Theme;
  sidebarCollapsed: boolean;
  currentView: ViewType;
  notifications: NotificationState;
  modals: ModalState;
  preferences: AppPreferences;
  config: AppConfig;
  loading: {
    user: boolean;
    tasks: boolean;
    lists: boolean;
    labels: boolean;
    general: boolean;
  };
}
```

#### Actions

```typescript
// Authentication
login(credentials: { email: string; password: string }): Promise<void>;
logout(): Promise<void>;
refreshToken(): Promise<void>;
register(userData: { name: string; email: string; password: string }): Promise<void>;

// User management
loadUser(): Promise<void>;
updateUser(userData: Partial<User>): Promise<void>;
updatePreferences(preferences: Partial<AppPreferences>): void;

// UI management
setTheme(theme: Theme): void;
toggleSidebar(): void;
setCurrentView(view: ViewType): void;

// Notifications and modals
showNotification(notification: ShowNotificationPayload): void;
hideNotification(id: string): void;
showModal(modal: ShowModalPayload): void;
hideModal(id: string): void;

// Configuration
updateConfig(config: Partial<AppConfig>): void;
resetConfig(): void;

// General state management
setLoading(key: keyof AppState['loading'], loading: boolean): void;
setError(error: ApiError | null): void;
clearError(): void;
```

#### Usage Examples

```typescript
import { useApp } from '@/store';

function AppHeader() {
  const {
    user,
    isAuthenticated,
    theme,
    currentView,
    login,
    logout,
    setTheme,
    setCurrentView,
    showNotification,
    showModal
  } = useApp();

  const handleLogin = async () => {
    try {
      await login({
        email: 'user@example.com',
        password: 'password'
      });
      showNotification({
        type: 'success',
        title: 'Welcome!',
        message: 'You have been logged in successfully'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Login Failed',
        message: 'Invalid credentials'
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    showNotification({
      type: 'info',
      title: 'Goodbye',
      message: 'You have been logged out'
    });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  return (
    <header>
      <div className="user-info">
        {isAuthenticated ? (
          <>
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <button onClick={handleLogin}>Login</button>
        )}
      </div>
      
      <div className="theme-switcher">
        <button onClick={() => handleThemeChange('light')}>Light</button>
        <button onClick={() => handleThemeChange('dark')}>Dark</button>
        <button onClick={() => handleThemeChange('system')}>System</button>
      </div>
      
      <nav className="view-navigation">
        <button 
          className={currentView === 'dashboard' ? 'active' : ''}
          onClick={() => handleViewChange('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={currentView === 'tasks' ? 'active' : ''}
          onClick={() => handleViewChange('tasks')}
        >
          Tasks
        </button>
        <button 
          className={currentView === 'lists' ? 'active' : ''}
          onClick={() => handleViewChange('lists')}
        >
          Lists
        </button>
      </nav>
    </header>
  );
}
```

### FormStore

The FormStore manages multiple forms with auto-save, validation, and state persistence.

#### State

```typescript
interface FormStoreState {
  taskForms: Record<string, TaskFormState>;
  currentTaskFormId: string | null;
  listForms: Record<string, ListFormState>;
  currentListFormId: string | null;
  userForm: FormState<UserFormData> | null;
  passwordForm: FormState<PasswordChangeFormData> | null;
  labelForms: Record<string, FormState<LabelFormData>>;
  currentLabelFormId: string | null;
  generalForms: Record<string, FormState<Record<string, any>>>;
  currentGeneralFormId: string | null;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  lastSaved: Date | null;
  pendingSaves: Set<string>;
}
```

#### Actions

```typescript
// Task form management
createTaskForm(id: string, initialData?: Partial<TaskFormData>, config?: TaskFormConfig): string;
updateTaskForm(id: string, data: Partial<TaskFormData>): void;
deleteTaskForm(id: string): void;
setCurrentTaskForm(id: string | null): void;
validateTaskForm(id: string): void;

// List form management
createListForm(id: string, initialData?: Partial<ListFormData>, config?: ListFormConfig): string;
updateListForm(id: string, data: Partial<ListFormData>): void;
deleteListForm(id: string): void;
setCurrentListForm(id: string | null): void;
validateListForm(id: string): void;

// User form management
initUserForm(initialData: UserFormData): void;
updateUserForm(data: Partial<UserFormData>): void;
clearUserForm(): void;

// Label form management
createLabelForm(id: string, initialData?: Partial<LabelFormData>, config?: LabelFormConfig): string;
updateLabelForm(id: string, data: Partial<LabelFormData>): void;
deleteLabelForm(id: string): void;
setCurrentLabelForm(id: string | null): void;
validateLabelForm(id: string): void;

// Auto-save management
enableAutoSave(interval: number): void;
disableAutoSave(): void;
saveForm(formId: string, formType: 'task' | 'list' | 'label' | 'user'): Promise<void>;
scheduleSave(formId: string, formType: 'task' | 'list' | 'label' | 'user'): void;
clearPendingSave(formId: string): void;

// General form management
createGeneralForm(id: string, initialData: Record<string, any>): void;
updateGeneralForm(id: string, data: Record<string, any>): void;
deleteGeneralForm(id: string): void;
setCurrentGeneralForm(id: string | null): void;

// Utility methods
getFormData(formId: string, formType: 'task' | 'list' | 'label' | 'user'): any;
getFormState(formId: string, formType: 'task' | 'list' | 'label' | 'user'): any;
clearAllForms(): void;
```

#### Usage Examples

```typescript
import { useForms } from '@/store';

function TaskForm() {
  const {
    createTaskForm,
    updateTaskForm,
    deleteTaskForm,
    getFormData,
    getFormState,
    validateTaskForm,
    saveForm,
    autoSaveEnabled
  } = useForms();

  const formId = 'task-form-1';

  // Initialize form
  React.useEffect(() => {
    createTaskForm(formId, {
      name: '',
      description: '',
      priority: 'Medium',
      status: 'todo',
      listId: ''
    }, {
      autoSave: true,
      validation: {
        name: [{ type: 'required', message: 'Name is required' }],
        listId: [{ type: 'required', message: 'List is required' }]
      }
    });

    return () => {
      deleteTaskForm(formId);
    };
  }, []);

  const formData = getFormData(formId, 'task');
  const formState = getFormState(formId, 'task');

  const handleInputChange = (field: string, value: any) => {
    updateTaskForm(formId, { [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    validateTaskForm(formId);
    
    if (formState?.isValid) {
      try {
        await saveForm(formId, 'task');
        // Handle successful save
      } catch (error) {
        // Handle save error
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label>Name</label>
        <input
          type="text"
          value={formData?.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={formState?.errors?.name ? 'error' : ''}
        />
        {formState?.errors?.name && (
          <span className="error-message">{formState.errors.name}</span>
        )}
      </div>

      <div className="form-field">
        <label>Description</label>
        <textarea
          value={formData?.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
        />
      </div>

      <div className="form-field">
        <label>Priority</label>
        <select
          value={formData?.priority || 'Medium'}
          onChange={(e) => handleInputChange('priority', e.target.value)}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div className="form-field">
        <label>Status</label>
        <select
          value={formData?.status || 'todo'}
          onChange={(e) => handleInputChange('status', e.target.value)}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="form-status">
        {formState?.isDirty && (
          <span className="dirty-indicator">Unsaved changes</span>
        )}
        {formState?.isValid && (
          <span className="valid-indicator">✓ Valid</span>
        )}
        {autoSaveEnabled && (
          <span className="autosave-indicator">Auto-saving enabled</span>
        )}
      </div>

      <button type="submit" disabled={!formState?.isValid}>
        Save Task
      </button>
    </form>
  );
}
```

### NotificationStore

The NotificationStore provides a comprehensive notification system with different types and management features.

#### Actions

```typescript
// Notification management
showNotification(payload: ShowNotificationPayload): string;
hideNotification(id: string): void;
markAsRead(id: string): void;
markAllAsRead(): void;
clearNotification(id: string): void;
clearAll(): void;
clearByType(type: AppNotification['type']): void;
clearExpired(): void;

// Convenience methods
success(title: string, message: string, options?: Partial<ShowNotificationPayload>): string;
error(title: string, message: string, options?: Partial<ShowNotificationPayload>): string;
warning(title: string, message: string, options?: Partial<ShowNotificationPayload>): string;
info(title: string, message: string, options?: Partial<ShowNotificationPayload>): string;
reminder(title: string, message: string, options?: Partial<ShowNotificationPayload>): string;

// Configuration
setPosition(position: NotificationState['position']): void;
setMaxNotifications(max: number): void;
setAutoClose(enabled: boolean, duration?: number): void;
setShowProgress(show: boolean): void;
setPauseOnHover(pause: boolean): void;

// Utility methods
getNotificationById(id: string): AppNotification | undefined;
getUnreadNotifications(): AppNotification[];
getVisibleNotifications(): AppNotification[];
hasNotifications(): boolean;
hasUnread(): boolean;
getNotificationStats(): NotificationStats;
```

#### Usage Examples

```typescript
import { useNotifications } from '@/store';

function NotificationDemo() {
  const {
    notifications,
    unreadCount,
    success,
    error,
    warning,
    info,
    showNotification,
    markAsRead,
    clearAll,
    setPosition,
    getNotificationStats
  } = useNotifications();

  const handleSuccess = () => {
    success('Success!', 'Operation completed successfully');
  };

  const handleError = () => {
    error('Error!', 'Something went wrong', {
      duration: 10000, // 10 seconds
      actionLabel: 'Retry',
      actionHandler: () => console.log('Retrying...')
    });
  };

  const handleCustom = () => {
    showNotification({
      type: 'info',
      title: 'Custom Notification',
      message: 'This is a custom notification with extra data',
      data: { extra: 'information' },
      isPersistent: true,
      isDismissible: false
    });
  };

  const stats = getNotificationStats();

  return (
    <div className="notification-demo">
      <div className="notification-controls">
        <button onClick={handleSuccess}>Show Success</button>
        <button onClick={handleError}>Show Error</button>
        <button onClick={handleCustom}>Show Custom</button>
        <button onClick={clearAll}>Clear All</button>
      </div>

      <div className="notification-stats">
        <p>Total: {stats.total}</p>
        <p>Unread: {stats.unread}</p>
        <p>Today: {stats.today}</p>
        <p>By Type: {JSON.stringify(stats.byType)}</p>
      </div>

      <div className="notification-list">
        <h3>Recent Notifications</h3>
        {notifications.slice(0, 5).map(notification => (
          <div
            key={notification.id}
            className={`notification-item ${notification.type} ${!notification.isRead ? 'unread' : ''}`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="notification-header">
              <span className="notification-type">{notification.type}</span>
              <span className="notification-time">
                {notification.createdAt.toLocaleTimeString()}
              </span>
            </div>
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
        ))}
      </div>

      <div className="notification-settings">
        <h4>Settings</h4>
        <label>
          Position:
          <select onChange={(e) => setPosition(e.target.value as any)}>
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
        </label>
      </div>
    </div>
  );
}
```

### ModalStore

The ModalStore manages modal dialogs with focus management, accessibility features, and convenience methods.

#### Actions

```typescript
// Modal management
showModal(payload: ShowModalPayload): string;
hideModal(id: string): void;
closeModal(id: string): void;
closeActiveModal(): void;
closeAllModals(): void;

// Stack management
pushModal(payload: ShowModalPayload): string;
popModal(): string | null;
clearModalStack(): void;

// Modal data management
updateModalData(id: string, data: Partial<AppModal['props']>): void;
getModalById(id: string): AppModal | undefined;
getActiveModal(): AppModal | undefined;

// Configuration
setCloseOnOverlayClick(close: boolean): void;
setCloseOnEsc(close: boolean): void;
setTrapFocus(trap: boolean): void;
setRestoreFocus(restore: boolean): void;

// Convenience methods
confirm(payload: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}): string;

alert(payload: {
  title: string;
  message: string;
  onClose?: () => void;
}): string;

prompt(payload: {
  title: string;
  message: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}): string;

showDrawer(payload: Omit<ShowModalPayload, 'type'>): string;
showBottomSheet(payload: Omit<ShowModalPayload, 'type'>): string;

// Utility methods
getModalStack(): string[];
getModalCount(): number;
isModalOpen(id: string): boolean;
hasModals(): boolean;
getModalStats(): ModalStats;
```

#### Usage Examples

```typescript
import { useModals } from '@/store';

function ModalDemo() {
  const {
    modals,
    activeModalId,
    isAnyModalOpen,
    showModal,
    hideModal,
    confirm,
    alert,
    prompt,
    showDrawer,
    getActiveModal
  } = useModals();

  const handleShowModal = () => {
    showModal({
      type: 'dialog',
      title: 'Custom Modal',
      content: (
        <div>
          <p>This is a custom modal content.</p>
          <button onClick={() => hideModal(activeModalId!)}>
            Close
          </button>
        </div>
      ),
      size: 'md',
      onConfirm: () => {
        console.log('Confirmed!');
        hideModal(activeModalId!);
      },
      onCancel: () => {
        console.log('Cancelled!');
        hideModal(activeModalId!);
      }
    });
  };

  const handleConfirm = () => {
    confirm({
      title: 'Confirm Action',
      message: 'Are you sure you want to delete this item?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        console.log('Item deleted!');
      },
      onCancel: () => {
        console.log('Deletion cancelled.');
      }
    });
  };

  const handleAlert = () => {
    alert({
      title: 'Alert',
      message: 'This is an important message.',
      onClose: () => {
        console.log('Alert closed.');
      }
    });
  };

  const handlePrompt = () => {
    prompt({
      title: 'Enter Your Name',
      message: 'Please enter your name:',
      defaultValue: '',
      onSubmit: (value: string) => {
        console.log('Submitted name:', value);
      },
      onCancel: () => {
        console.log('Prompt cancelled.');
      }
    });
  };

  const handleShowDrawer = () => {
    showDrawer({
      title: 'Settings',
      content: (
        <div>
          <h3>Application Settings</h3>
          <p>Drawer content goes here...</p>
        </div>
      ),
      position: 'right',
      size: 'lg'
    });
  };

  const activeModal = getActiveModal();

  return (
    <div className="modal-demo">
      <div className="modal-controls">
        <button onClick={handleShowModal}>Show Custom Modal</button>
        <button onClick={handleConfirm}>Show Confirm</button>
        <button onClick={handleAlert}>Show Alert</button>
        <button onClick={handlePrompt}>Show Prompt</button>
        <button onClick={handleShowDrawer}>Show Drawer</button>
      </div>

      <div className="modal-status">
        <p>Active Modal ID: {activeModalId || 'None'}</p>
        <p>Any Modal Open: {isAnyModalOpen ? 'Yes' : 'No'}</p>
        <p>Total Modals: {modals.length}</p>
      </div>

      {/* Modal rendering would be handled by your UI library */}
      {modals.map(modal => (
        <div
          key={modal.id}
          className={`modal modal-${modal.type} ${modal.isOpen ? 'open' : 'closed'}`}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modal.title}</h2>
              {modal.isClosable && (
                <button onClick={() => hideModal(modal.id)}>×</button>
              )}
            </div>
            <div className="modal-body">
              {modal.content}
            </div>
            <div className="modal-footer">
              {modal.onCancel && (
                <button onClick={() => hideModal(modal.id)}>
                  Cancel
                </button>
              )}
              {modal.onConfirm && (
                <button onClick={modal.onConfirm}>
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Performance Optimization

### Selective Re-rendering

The stores use Zustand's selective subscription to prevent unnecessary re-renders:

```typescript
import { useTasks } from '@/store';

// This only re-renders when tasks change
const { tasks } = useTasks({
  selector: (state) => state.getTasks(),
  equalityFn: shallow
});

// This only re-renders when filteredTasks change
const { filteredTasks } = useTasks({
  selector: (state) => state.getFilteredTasks()
});
```

### Memoized Selectors

All selectors are memoized using `createSelector` for optimal performance:

```typescript
const getFilteredTasks = createSelector(
  (state: TaskStoreState) => state.tasks,
  (state: TaskStoreState) => state.filters,
  (tasks, filters) => {
    // Expensive filtering logic
    return tasks.filter(task => /* filtering logic */);
  }
);
```

### Batch Operations

Use batch operations for better performance with multiple items:

```typescript
// Instead of this:
for (const taskId of taskIds) {
  await updateTask({ id: taskId, status: 'done' });
}

// Use this:
await batchUpdateTasks({
  taskIds,
  status: 'done'
});
```

## Error Handling

### Automatic Retry

All async operations include automatic retry with exponential backoff:

```typescript
const retryHandler = createRetryHandler({
  retryAttempts: 3,
  retryDelay: 1000,
  onError: (error, storeName) => {
    console.error(`[${storeName}] Error:`, error);
  }
});
```

### Optimistic Updates with Rollback

Changes are applied optimistically and rolled back on failure:

```typescript
// Optimistically update
set(state => {
  state.tasks.unshift(optimisticTask);
  state.loading.creating = true;
}, false, 'createTask_optimistic');

try {
  // Real API call
  const realTask = await createTaskAPI(data);
  
  // Replace with real data
  set(state => {
    // Replace optimistic update
  }, false, 'createTask_success');
} catch (error) {
  // Rollback optimistic update
  set(state => {
    // Remove optimistic data
  }, false, 'createTask_rollback');
  
  throw error;
}
```

## Persistence

### LocalStorage Integration

User preferences and UI state are persisted to LocalStorage:

```typescript
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
```

### Selective Persistence

Use selective persistence to avoid storing sensitive or large data:

```typescript
// Only persist UI preferences, not form data
middleware.push(persist(
  storeConfig,
  createPersistConfig({
    name: 'form-store',
    partialize: (state) => ({
      autoSaveEnabled: state.autoSaveEnabled,
      autoSaveInterval: state.autoSaveInterval
    }),
    version: 1
  })
));
```

## Development and Debugging

### DevTools Integration

Enable Redux DevTools for debugging:

```typescript
const taskStore = createTaskStore({
  userId: 'user-id',
  devtools: process.env.NODE_ENV === 'development'
});
```

### Debug Utilities

Use built-in debug utilities:

```typescript
import { debugStores } from '@/store';

// Log current state
debugStores.logState();

// Export state for debugging
const state = debugStores.exportState();

// Reset specific store
debugStores.resetStore('task');
```

### Testing

The system includes comprehensive integration tests:

```typescript
import { describe, test, expect } from 'vitest';
import { createTaskStore } from '@/store';

describe('TaskStore', () => {
  test('should create and manage tasks', async () => {
    const store = createTaskStore({ userId: 'test-user' });
    
    const task = await store.createTask({
      name: 'Test Task',
      description: 'Test Description',
      priority: 'High',
      status: 'todo',
      listId: 'test-list'
    });
    
    expect(task.name).toBe('Test Task');
    expect(store.getTaskCount()).toBe(1);
  });
});
```

## Best Practices

### 1. Use Custom Hooks

Always use the custom hooks instead of directly accessing stores:

```typescript
// ✅ Good
const { tasks, createTask } = useTasks();

// ❌ Avoid
const taskStore = useTaskStore();
const tasks = taskStore.getState().tasks;
```

### 2. Selective Subscriptions

Subscribe only to the data you need:

```typescript
// ✅ Good - only subscribes to tasks
const { tasks } = useTasks({
  selector: (state) => state.getTasks()
});

// ❌ Avoid - subscribes to everything
const { tasks, loading, error, filters } = useTasks();
```

### 3. Handle Loading States

Always handle loading and error states:

```typescript
function MyComponent() {
  const { tasks, isLoading, error, createTask } = useTasks();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </div>
  );
}
```

### 4. Use Batch Operations

For multiple operations, use batch methods:

```typescript
// ✅ Good
await batchUpdateTasks({ taskIds, status: 'done' });

// ❌ Avoid
for (const id of taskIds) {
  await updateTask({ id, status: 'done' });
}
```

### 5. Error Boundaries

Wrap store operations in try-catch blocks:

```typescript
const handleCreateTask = async () => {
  try {
    const task = await createTask(taskData);
    success('Success', 'Task created!');
  } catch (error) {
    error('Error', 'Failed to create task');
  }
};
```

## Advanced Features

### Real-time Updates

The system is designed to work with real-time updates:

```typescript
// WebSocket integration (pseudo-code)
const handleRealTimeUpdate = (update) => {
  if (update.type === 'task_updated') {
    taskStore.updateTaskInCache(update.task);
  }
};
```

### Offline Support

The stores handle offline scenarios:

```typescript
// Operations are queued when offline
const handleOfflineOperation = async () => {
  try {
    await createTask(taskData);
  } catch (error) {
    // Queue for later when online
    queueOperation('create_task', taskData);
  }
};
```

### Analytics Integration

Track store operations for analytics:

```typescript
// Track store actions
const trackAction = (action: string, data: any) => {
  analytics.track(`store_${action}`, data);
};

// Use in store actions
const createTask = async (data) => {
  trackAction('create_task_started', data);
  // ... operation
  trackAction('create_task_completed', { taskId: result.id });
};
```

## Conclusion

This Zustand-based state management system provides:

- ✅ **Type Safety**: Full TypeScript integration
- ✅ **Performance**: Optimized selectors and selective subscriptions
- ✅ **Developer Experience**: DevTools integration and debugging utilities
- ✅ **Scalability**: Modular design with clear separation of concerns
- ✅ **Reliability**: Error handling, retry logic, and optimistic updates
- ✅ **Flexibility**: Configurable middleware and persistence
- ✅ **Testing**: Comprehensive test suite and utilities

The system is production-ready and provides excellent performance and developer experience for the Daily Task Planner application.