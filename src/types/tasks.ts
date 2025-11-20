/**
 * Task-Related Types for Daily Task Planner Application
 * 
 * This module defines comprehensive TypeScript interfaces for task-related functionality,
 * extending database types with application-specific properties for UI, state management,
 * and business logic.
 */

import type { 
  Task, 
  Subtask, 
  Reminder, 
  Attachment, 
  TaskLabel,
  Priority,
  TaskStatus,
  TaskWithDetails,
  RecurringPattern
} from '../lib/db/types';
import type {
  TaskId,
  ListId,
  LabelId,
  UserId,
  SubtaskId,
  ReminderId,
  DateRange,
  TimeTracking,
  ViewType,
  SortField,
  LoadingState,
  ApiError,
  ComponentState,
  NotificationConfig,
  Option,
  Some,
  None,
  Result
} from './utils';

// =============================================================================
// TASK UI STATE TYPES
// =============================================================================

/**
 * Extended task interface with UI-specific properties
 */
export interface AppTask extends Omit<Task, 'id' | 'userId' | 'listId'> {
  id: TaskId;
  userId: UserId;
  listId: ListId;
  // UI State Properties
  isSelected: boolean;
  isExpanded: boolean;
  isDragging: boolean;
  isHovered: boolean;
  showSubtasks: boolean;
  showDetails: boolean;
  editMode: boolean;
  sortIndex: number;
  
  // Application Properties
  customFields?: Record<string, any>;
  tags?: string[];
  notifications?: NotificationConfig[];
  attachments?: TaskAttachment[];
  
  // Computed Properties
  isOverdue: boolean;
  isDueToday: boolean;
  isDueThisWeek: boolean;
  timeRemaining?: string;
  completionPercentage: number;
  estimatedDuration?: string;
  // Application Properties
  dueDate?: Date; // Alias for deadline for UI compatibility
  reminders?: any[]; // Reminder array
  subtasks?: any[]; // Subtask array
  
  // Computed Properties
  isOverdue: boolean;
  isDueToday: boolean;
  isDueThisWeek: boolean;
  timeRemaining?: string;
  completionPercentage: number;
  estimatedDuration?: string;
  actualDuration?: string;
  customFields?: Record<string, any>;
  dueDate?: Date; // Alias for deadline for UI compatibility
  reminders?: any[]; // Reminder array
  
  // Computed Properties
  isOverdue: boolean;
  isDueToday: boolean;
  isDueThisWeek: boolean;
  timeRemaining?: string;
  completionPercentage: number;
  estimatedDuration?: string;
  actualDuration?: string;
  tags?: string[];
  notifications?: NotificationConfig[];
  attachments?: TaskAttachment[];
  dueDate?: Date; // Alias for deadline for UI compatibility
  
  // Computed Properties
  isOverdue: boolean;
  isDueToday: boolean;
  isDueThisWeek: boolean;
  timeRemaining?: string;
  completionPercentage: number;
  estimatedDuration?: string;
  actualDuration?: string;
  actualDuration?: string;
}

/**
 * Task attachment with UI context
 */
export interface TaskAttachment extends Attachment {
  isUploading?: boolean;
  uploadProgress?: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
}

/**
 * Task state management interface
 */
export interface TaskState {
  // Data
  tasks: AppTask[];
  selectedTaskIds: TaskId[];
  currentTask: AppTask | null;
  
  // UI State
  loading: LoadingState;
  error: ApiError | null;
  view: TaskView;
  filters: TaskFilters;
  sorting: TaskSort;
  layout: TaskLayout;
  
  // Interaction State
  isCreating: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  isDragging: boolean;
  
  // Pagination
  pagination: TaskPagination;
}

/**
 * Task view configuration
 */
export interface TaskView {
  type: ViewType;
  groupBy?: TaskGroupBy;
  showCompleted: boolean;
  showOverdue: boolean;
  showArchived: boolean;
  compactMode: boolean;
  showSubtasks: boolean;
}

/**
 * Task grouping options
 */
export type TaskGroupBy = 
  | 'none' 
  | 'list' 
  | 'priority' 
  | 'status' 
  | 'dueDate' 
  | 'createdDate' 
  | 'labels';

/**
 * Task filters interface
 */
export interface TaskFilters extends Record<string, any> {
  search?: string;
  listIds?: ListId[];
  labelIds?: LabelId[];
  status?: TaskStatus[];
  priority?: Priority[];
  assigneeIds?: UserId[];
  dateRange?: DateRange;
  dueAfter?: Date;
  dueBefore?: Date;
  hasDeadline?: boolean;
  isOverdue?: boolean;
  isRecurring?: boolean;
  hasSubtasks?: boolean;
  hasAttachments?: boolean;
  tags?: string[];
  customFieldFilters?: Record<string, any>;
}

/**
 * Task sorting configuration
 */
export interface TaskSort {
  field: SortField;
  direction: 'asc' | 'desc';
  secondary?: {
    field: SortField;
    direction: 'asc' | 'desc';
  };
}

/**
 * Task layout and display options
 */
export interface TaskLayout {
  viewType: 'list' | 'grid' | 'kanban' | 'timeline';
  density: 'compact' | 'comfortable' | 'spacious';
  showAvatars: boolean;
  showProgress: boolean;
  showDueDates: boolean;
  showPriorities: boolean;
  showLabels: boolean;
  showDescriptions: boolean;
}

/**
 * Task pagination
 */
export interface TaskPagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =============================================================================
// TASK COMPONENT PROPS
// =============================================================================

/**
 * Task card component props
 */
export interface TaskCardProps {
  task: AppTask;
  layout?: TaskLayout;
  showChecklist?: boolean;
  showAttachments?: boolean;
  showReminders?: boolean;
  compact?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  onSelect?: (taskId: TaskId, selected: boolean) => void;
  onEdit?: (task: AppTask) => void;
  onDelete?: (taskId: TaskId) => void;
  onStatusChange?: (taskId: TaskId, status: TaskStatus) => void;
  onPriorityChange?: (taskId: TaskId, priority: Priority) => void;
  onMove?: (taskId: TaskId, listId: ListId) => void;
  onDragStart?: (task: AppTask) => void;
  onDragEnd?: (task: AppTask) => void;
  onClick?: (task: AppTask) => void;
}

/**
 * Task item component props (for list view)
 */
export interface TaskItemProps extends Omit<TaskCardProps, 'layout' | 'compact'> {
  index: number;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  indent?: number;
  showCheckbox?: boolean;
  showMenu?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

/**
 * Task details component props
 */
export interface TaskDetailsProps {
  task: AppTask;
  isEditing: boolean;
  onSave?: (task: Partial<AppTask>) => void;
  onCancel?: () => void;
  onDelete?: (taskId: TaskId) => void;
  onDuplicate?: (taskId: TaskId) => void;
  onAddSubtask?: (taskId: TaskId, name: string) => void;
  onAddReminder?: (taskId: TaskId, remindAt: Date) => void;
  onUploadAttachment?: (taskId: TaskId, file: File) => void;
  onUpdateLabels?: (taskId: TaskId, labelIds: LabelId[]) => void;
}

/**
 * Task form component props
 */
export interface TaskFormProps {
  initialData?: Partial<AppTask>;
  listId?: ListId;
  parentTaskId?: TaskId;
  onSubmit?: (taskData: CreateTaskData) => void;
  onCancel?: () => void;
  onSaveAsTemplate?: (name: string) => void;
  autoSave?: boolean;
  validation?: TaskFormValidation;
}

/**
 * Task checklist component props
 */
export interface TaskChecklistProps {
  taskId: TaskId;
  subtasks: Subtask[];
  onToggleSubtask?: (subtaskId: SubtaskId, completed: boolean) => void;
  onAddSubtask?: (taskId: TaskId, name: string) => void;
  onEditSubtask?: (subtaskId: SubtaskId, name: string) => void;
  onDeleteSubtask?: (subtaskId: SubtaskId) => void;
  onReorderSubtasks?: (subtaskIds: SubtaskId[]) => void;
  readOnly?: boolean;
}

/**
 * Task attachments component props
 */
export interface TaskAttachmentsProps {
  taskId: TaskId;
  attachments: TaskAttachment[];
  onUpload?: (taskId: TaskId, files: FileList) => void;
  onDownload?: (attachment: TaskAttachment) => void;
  onDelete?: (attachment: TaskAttachment) => void;
  onPreview?: (attachment: TaskAttachment) => void;
  readOnly?: boolean;
}

/**
 * Task reminder component props
 */
export interface TaskRemindersProps {
  taskId: TaskId;
  reminders: Reminder[];
  onAddReminder?: (taskId: TaskId, remindAt: Date, method: 'push' | 'email' | 'sms') => void;
  onEditReminder?: (reminderId: ReminderId, remindAt: Date) => void;
  onDeleteReminder?: (reminderId: ReminderId) => void;
  onMarkSent?: (reminderId: ReminderId) => void;
  readOnly?: boolean;
}

// =============================================================================
// TASK BUSINESS LOGIC TYPES
// =============================================================================

/**
 * Task creation data structure
 */
export interface CreateTaskData {
  name: string;
  description?: string;
  listId: ListId;
  parentTaskId?: TaskId;
  priority?: Priority;
  date?: Date;
  deadline?: Date;
  estimate?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  labels?: LabelId[];
  subtasks?: Omit<CreateSubtaskData, 'taskId'>[];
  reminders?: Omit<CreateReminderData, 'taskId'>[];
  customFields?: Record<string, any>;
  tags?: string[];
}

/**
 * Task update data structure
 */
export type UpdateTaskData = Partial<CreateTaskData> & {
  id: TaskId;
  status?: TaskStatus;
  actualTime?: string;
  position?: number;
  isCompleted?: boolean;
  completedAt?: Date;
};

/**
 * Subtask creation data
 */
export interface CreateSubtaskData {
  name: string;
  taskId: TaskId;
  position?: number;
}

/**
 * Reminder creation data
 */
export interface CreateReminderData {
  taskId: TaskId;
  remindAt: Date;
  method?: 'push' | 'email' | 'sms';
}

/**
 * Task operations for batch processing
 */
export type TaskOperation = 
  | 'create'
  | 'update' 
  | 'delete'
  | 'duplicate'
  | 'move'
  | 'status_change'
  | 'priority_change'
  | 'archive'
  | 'restore';

/**
 * Task batch operation result
 */
export interface TaskBatchResult {
  successful: TaskId[];
  failed: Array<{
    id: TaskId;
    error: ApiError;
    operation: TaskOperation;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// =============================================================================
// TASK VALIDATION TYPES
// =============================================================================

/**
 * Task validation rules
 */
export interface TaskValidationRules {
  name: {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
  description?: {
    maxLength?: number;
  };
  estimate?: {
    pattern?: RegExp; // HH:mm format
  };
  deadline?: {
    afterCreated?: boolean;
    beforeEndDate?: Date;
  };
  listId: {
    required: boolean;
  };
}

/**
 * Task validation result
 */
export interface TaskValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

/**
 * Task form validation state
 */
export interface TaskFormValidation {
  isValid: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  validating: boolean;
}

// =============================================================================
// TASK CONTEXT AND HOOKS
// =============================================================================

/**
 * Task context interface
 */
export interface TaskContextValue {
  // State
  state: TaskState;
  
  // Actions
  loadTasks: (params?: TaskQueryParams) => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<Result<AppTask, ApiError>>;
  updateTask: (data: UpdateTaskData) => Promise<Result<AppTask, ApiError>>;
  deleteTask: (taskId: TaskId) => Promise<Result<void, ApiError>>;
  duplicateTask: (taskId: TaskId) => Promise<Result<AppTask, ApiError>>;
  
  // Selection
  selectTask: (taskId: TaskId) => void;
  selectMultipleTasks: (taskIds: TaskId[]) => void;
  deselectTask: (taskId: TaskId) => void;
  clearSelection: () => void;
  toggleTaskSelection: (taskId: TaskId) => void;
  selectAllVisible: () => void;
  
  // UI Actions
  setView: (view: TaskView) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  clearFilters: () => void;
  setSorting: (sort: TaskSort) => void;
  setLayout: (layout: TaskLayout) => void;
  
  // Utility
  getTaskById: (taskId: TaskId) => Option<AppTask>;
  getTasksByListId: (listId: ListId) => AppTask[];
  getTasksByStatus: (status: TaskStatus) => AppTask[];
  getOverdueTasks: () => AppTask[];
  getTodaysTasks: () => AppTask[];
}

/**
 * Task hooks return types
 */
export interface UseTasksReturn {
  tasks: AppTask[];
  loading: boolean;
  error: ApiError | null;
  selectedTasks: AppTask[];
  taskCount: number;
  createTask: (data: CreateTaskData) => Promise<Result<AppTask, ApiError>>;
  updateTask: (data: UpdateTaskData) => Promise<Result<AppTask, ApiError>>;
  deleteTask: (taskId: TaskId) => Promise<Result<void, ApiError>>;
  duplicateTask: (taskId: TaskId) => Promise<Result<AppTask, ApiError>>;
  refetch: () => Promise<void>;
}

export interface UseTaskFiltersReturn {
  filters: TaskFilters;
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  clearFilter: (key: keyof TaskFilters) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  filteredTasks: AppTask[];
}

/**
 * Query parameters for task operations
 */
export interface TaskQueryParams {
  listId?: ListId;
  labelId?: LabelId;
  status?: TaskStatus[];
  priority?: Priority[];
  dateRange?: DateRange;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: SortField;
  sortDirection?: 'asc' | 'desc';
}

// =============================================================================
// TASK TEMPLATES AND QUICK ACTIONS
// =============================================================================

/**
 * Task template for quick creation
 */
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  listId: ListId;
  priority: Priority;
  labels: LabelId[];
  subtasks: Omit<CreateSubtaskData, 'taskId'>[];
  reminderTemplate?: {
    timing: number; // minutes before
    method: 'push' | 'email' | 'sms';
  };
  customFields: Record<string, any>;
  createdAt: Date;
  usageCount: number;
}

/**
 * Quick action for tasks
 */
export interface TaskQuickAction {
  id: string;
  label: string;
  icon: string;
  action: (tasks: TaskId[]) => void | Promise<void>;
  requiresSelection: boolean;
  isVisible?: (tasks: TaskId[]) => boolean;
}

// =============================================================================
// TASK METRICS AND ANALYTICS
// =============================================================================

/**
 * Task completion metrics
 */
export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  completionRate: number; // 0-100
  averageCompletionTime: number; // in hours
  tasksByPriority: Record<Priority, number>;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByList: Array<{
    listId: ListId;
    listName: string;
    taskCount: number;
    completionRate: number;
  }>;
  productivityScore: number; // 0-100
}

/**
 * Task time tracking data
 */
export interface TaskTimeTracking {
  taskId: TaskId;
  totalEstimatedTime: string; // HH:mm
  totalActualTime: string; // HH:mm
  timeVariance: number; // percentage
  timeEntries: Array<{
    startTime: Date;
    endTime?: Date;
    duration?: string;
    description?: string;
  }>;
}

/**
 * Task productivity insights
 */
export interface TaskProductivityInsights {
  mostProductiveHour: number; // 0-23
  mostProductiveDay: number; // 0-6
  averageTasksPerDay: number;
  peakProductivityPeriod: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  completionTrends: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
  recommendations: string[];
}