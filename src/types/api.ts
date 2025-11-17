/**
 * API and Response Types for Daily Task Planner Application
 * 
 * This module defines types for API interactions, request/response structures,
 * and error handling patterns used throughout the application layer.
 */

import type { 
  Task, 
  List, 
  Label, 
  User, 
  Subtask, 
  Reminder, 
  Attachment, 
  TaskHistory,
  TaskWithDetails,
  ListWithTaskCount,
  LabelWithTaskCount,
  DatabaseError
} from '../lib/db/types';
import type {
  TaskId,
  ListId,
  LabelId,
  UserId,
  SubtaskId,
  ReminderId,
  ApiResponse,
  ApiError,
  PaginationParams,
  DateRange,
  ViewType,
  SortConfig,
  LoadingState,
  ComponentState,
  NotificationConfig,
  TimeTracking,
  TimePeriod
} from './utils';

// =============================================================================
// REQUEST TYPES
// =============================================================================

/**
 * Generic API request interface
 */
export interface ApiRequest<T = any> {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: T;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * Authentication request types
 */
export interface AuthRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

// =============================================================================
// TASK API TYPES
// =============================================================================

/**
 * Task creation request payload
 */
export interface CreateTaskRequest {
  name: string;
  description?: string;
  listId: ListId;
  priority?: 'High' | 'Medium' | 'Low' | 'None';
  date?: Date;
  deadline?: Date;
  estimate?: string;
  isRecurring?: boolean;
  recurringPattern?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
    endDate?: Date;
    maxOccurrences?: number;
  };
  parentTaskId?: TaskId;
  labels?: LabelId[];
  subtasks?: Omit<CreateSubtaskRequest, 'taskId'>[];
  reminders?: Omit<CreateReminderRequest, 'taskId'>[];
}

/**
 * Task update request payload
 */
export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: TaskId;
  status?: 'todo' | 'in_progress' | 'done' | 'archived';
  actualTime?: string;
  position?: number;
}

/**
 * Task filtering and search parameters
 */
export interface TaskQueryParams extends PaginationParams {
  listId?: ListId;
  labelId?: LabelId;
  status?: Task['status'];
  priority?: Task['priority'];
  dateRange?: DateRange;
  dueAfter?: Date;
  dueBefore?: Date;
  isOverdue?: boolean;
  hasDeadline?: boolean;
  isRecurring?: boolean;
  search?: string;
  assigneeId?: UserId;
  parentTaskId?: TaskId | null;
}

/**
 * Task batch operations
 */
export interface BatchTaskOperation {
  taskIds: TaskId[];
  operation: 'update' | 'delete' | 'move' | 'status_change';
  data?: Partial<UpdateTaskRequest>;
}

export interface BatchTaskResponse {
  successCount: number;
  failedCount: number;
  failedTasks: Array<{
    taskId: TaskId;
    error: ApiError;
  }>;
}

// =============================================================================
// LIST API TYPES
// =============================================================================

/**
 * List creation request payload
 */
export interface CreateListRequest {
  name: string;
  color: string;
  emoji: string;
  isDefault?: boolean;
}

/**
 * List update request payload
 */
export interface UpdateListRequest extends Partial<CreateListRequest> {
  id: ListId;
}

/**
 * List query parameters
 */
export interface ListQueryParams extends PaginationParams {
  includeTaskCount?: boolean;
  isDefault?: boolean;
  color?: string;
  search?: string;
}

// =============================================================================
// LABEL API TYPES
// =============================================================================

/**
 * Label creation request payload
 */
export interface CreateLabelRequest {
  name: string;
  icon: string;
  color: string;
}

/**
 * Label update request payload
 */
export interface UpdateLabelRequest extends Partial<CreateLabelRequest> {
  id: LabelId;
}

/**
 * Label query parameters
 */
export interface LabelQueryParams extends PaginationParams {
  includeTaskCount?: boolean;
  color?: string;
  search?: string;
}

/**
 * Task-Label relationship operations
 */
export interface UpdateTaskLabelsRequest {
  taskId: TaskId;
  labelIds: LabelId[];
}

// =============================================================================
// SUBTASK API TYPES
// =============================================================================

/**
 * Subtask creation request payload
 */
export interface CreateSubtaskRequest {
  name: string;
  taskId: TaskId;
  position?: number;
}

/**
 * Subtask update request payload
 */
export interface UpdateSubtaskRequest extends Partial<CreateSubtaskRequest> {
  id: SubtaskId;
  isCompleted?: boolean;
}

// =============================================================================
// REMINDER API TYPES
// =============================================================================

/**
 * Reminder creation request payload
 */
export interface CreateReminderRequest {
  taskId: TaskId;
  remindAt: Date;
  method?: 'push' | 'email' | 'sms';
}

/**
 * Reminder update request payload
 */
export interface UpdateReminderRequest extends Partial<CreateReminderRequest> {
  id: ReminderId;
  isSent?: boolean;
}

// =============================================================================
// ATTACHMENT API TYPES
// =============================================================================

/**
 * File upload request
 */
export interface FileUploadRequest {
  file: File;
  taskId: TaskId;
  description?: string;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  attachment: Attachment;
  uploadUrl?: string;
  progress?: number;
}

// =============================================================================
// USER AND PROFILE API TYPES
// =============================================================================

/**
 * User profile update request
 */
export interface UpdateUserRequest {
  name?: string;
  avatar?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    timezone?: string;
    dateFormat?: string;
  };
}

/**
 * Password change request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMetadata;
};

/**
 * Task-specific response types
 */
export type TaskListResponse = ApiResponse<{
  tasks: TaskWithDetails[];
  total: number;
  page: number;
  pageSize: number;
}>;

export type TaskResponse = ApiResponse<{
  task: TaskWithDetails;
}>;

export type TaskBatchResponse = ApiResponse<BatchTaskResponse>;

/**
 * List-specific response types
 */
export type ListListResponse = ApiResponse<{
  lists: ListWithTaskCount[];
  total: number;
}>;

export type ListResponse = ApiResponse<{
  list: ListWithTaskCount;
}>;

/**
 * Label-specific response types
 */
export type LabelListResponse = ApiResponse<{
  labels: LabelWithTaskCount[];
  total: number;
}>;

export type LabelResponse = ApiResponse<{
  label: LabelWithTaskCount;
}>;

/**
 * User and authentication response types
 */
export type AuthResponse = ApiResponse<{
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}>;

export type UserResponse = ApiResponse<{
  user: User;
}>;

/**
 * Statistics and analytics response types
 */
export type DashboardStatsResponse = ApiResponse<{
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  tasksByStatus: Record<Task['status'], number>;
  tasksByPriority: Record<Task['priority'], number>;
  listsByTaskCount: Array<ListWithTaskCount>;
  recentActivity: TaskHistory[];
}>;

// =============================================================================
// WEBSOCKET AND REAL-TIME TYPES
// =============================================================================

/**
 * WebSocket message types for real-time updates
 */
export type WebSocketMessageType = 
  | 'task_created'
  | 'task_updated' 
  | 'task_deleted'
  | 'task_status_changed'
  | 'list_updated'
  | 'label_updated'
  | 'user_online'
  | 'user_offline'
  | 'notification'
  | 'ping'
  | 'pong';

/**
 * WebSocket message structure
 */
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
  userId: UserId;
  roomId?: string; // For room-based updates (e.g., shared lists)
}

/**
 * Real-time task update message
 */
export interface TaskUpdateMessage {
  task: TaskWithDetails;
  changes?: Record<string, any>;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
}

/**
 * Real-time notification message
 */
export interface NotificationMessage {
  id: string;
  type: 'reminder' | 'deadline' | 'overdue' | 'assignment';
  title: string;
  message: string;
  taskId?: TaskId;
  listId?: ListId;
  timestamp: string;
  isRead: boolean;
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * API error with detailed information
 */
export interface DetailedApiError extends ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  validationErrors?: ValidationError[];
  correlationId?: string;
  retryAfter?: number; // For rate limiting
}

/**
 * Error response structure
 */
export type ErrorResponse = {
  success: false;
  error: DetailedApiError;
};

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: string;
  retryAfter?: number;
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk operation request
 */
export interface BulkOperationRequest<T = any> {
  operation: 'create' | 'update' | 'delete' | 'move' | 'status_change';
  entityType: 'task' | 'list' | 'label';
  entities: Array<T & { id?: string }>;
  options?: {
    continueOnError?: boolean;
    validateBeforeExecute?: boolean;
  };
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T = any> {
  success: boolean;
  results: {
    successful: T[];
    failed: Array<{
      entity: T;
      error: DetailedApiError;
    }>;
  };
  summary: {
    total: number;
    successful: number;
    failed: number;
    executionTime: number;
  };
}

// =============================================================================
// EXPORT AND BACKUP TYPES
// =============================================================================

/**
 * Data export request
 */
export interface ExportRequest {
  format: 'json' | 'csv' | 'pdf';
  entities: Array<'tasks' | 'lists' | 'labels' | 'subtasks' | 'reminders'>;
  filters?: {
    dateRange?: DateRange;
    listIds?: ListId[];
    status?: Task['status'][];
  };
  options?: {
    includeAttachments?: boolean;
    includeHistory?: boolean;
    compress?: boolean;
  };
}

/**
 * Export job response
 */
export interface ExportJobResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  fileSize?: number;
  format: string;
}

// =============================================================================
// SEARCH AND FILTERS
// =============================================================================

/**
 * Advanced search request
 */
export interface SearchRequest {
  query: string;
  filters?: {
    entityTypes?: Array<'task' | 'list' | 'label'>;
    dateRange?: DateRange;
    status?: Task['status'][];
    priority?: Task['priority'][];
    listIds?: ListId[];
    labelIds?: LabelId[];
  };
  sort?: SortConfig[];
  pagination?: PaginationParams;
  highlight?: boolean;
  fuzzy?: boolean;
}

/**
 * Search result interface
 */
export interface SearchResult<T = any> {
  entity: T;
  score: number;
  highlights?: Record<string, string[]>;
  snippet?: string;
}

// =============================================================================
// PAGINATION AND SORTING
// =============================================================================

/**
 * Cursor-based pagination for large datasets
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated response with cursor information
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
    pageSize: number;
  };
  meta?: Record<string, any>;
}