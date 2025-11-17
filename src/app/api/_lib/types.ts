/**
 * API Types and Utilities for Daily Task Planner
 * 
 * Shared types and utilities used across all API routes
 */

import type { NextRequest } from 'next/server';
import type { 
  ApiResponse, 
  ApiError, 
  TaskId, 
  ListId, 
  LabelId, 
  UserId 
} from '../../../types/utils';
import type {
  TaskWithDetails,
  ListWithTaskCount,
  LabelWithTaskCount
} from '../../../lib/db/types';

// =============================================================================
// API CONTEXT AND REQUEST TYPES
// =============================================================================

/**
 * API request context with authentication and utilities
 */
export interface ApiContext {
  req: NextRequest;
  userId: string;
  isAuthenticated: boolean;
  timestamp: string;
  requestId: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  meta?: Record<string, any>;
}

/**
 * Standard API response wrapper
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
};

/**
 * API route handler function signature
 */
export type ApiHandler<T = any, P = any> = (
  context: ApiContext,
  params: P
) => Promise<ApiResponse<T>>;

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// =============================================================================
// FILTER AND QUERY TYPES
// =============================================================================

/**
 * Base filter interface for API queries
 */
export interface BaseFilter {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// =============================================================================
// BATCH OPERATION TYPES
// =============================================================================

/**
 * Batch operation request
 */
export interface BatchOperationRequest<T = any> {
  operation: 'create' | 'update' | 'delete' | 'move' | 'status_change';
  entities: Array<T & { id?: string }>;
  options?: {
    continueOnError?: boolean;
    validateBeforeExecute?: boolean;
    maxConcurrency?: number;
  };
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T = any> {
  results: {
    successful: T[];
    failed: Array<{
      entity: T;
      error: ApiError;
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
// EXPORT AND FILE TYPES
// =============================================================================

/**
 * Export request
 */
export interface ExportRequest {
  format: 'json' | 'csv' | 'pdf' | 'xlsx';
  entities: Array<'tasks' | 'lists' | 'labels' | 'subtasks' | 'reminders'>;
  filters?: Record<string, any>;
  options?: {
    includeAttachments?: boolean;
    includeHistory?: boolean;
    includeMetadata?: boolean;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

/**
 * Export job
 */
export interface ExportJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

// =============================================================================
// REAL-TIME TYPES
// =============================================================================

/**
 * WebSocket message types
 */
export type RealtimeMessageType = 
  | 'task_created'
  | 'task_updated' 
  | 'task_deleted'
  | 'task_status_changed'
  | 'list_updated'
  | 'label_updated'
  | 'notification'
  | 'user_presence';

/**
 * Real-time message
 */
export interface RealtimeMessage<T = any> {
  type: RealtimeMessageType;
  payload: T;
  timestamp: string;
  userId: UserId;
  roomId?: string;
}

/**
 * Task update message
 */
export interface TaskUpdateMessage {
  task: TaskWithDetails;
  changes?: Record<string, any>;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  userId: UserId;
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

/**
 * Search request
 */
export interface SearchRequest {
  query: string;
  filters?: {
    entityTypes?: Array<'task' | 'list' | 'label'>;
    dateRange?: {
      start: string;
      end: string;
    };
    status?: string[];
    priority?: string[];
    listIds?: ListId[];
    labelIds?: LabelId[];
  };
  sort?: SortConfig[];
  pagination?: PaginationParams;
  highlight?: boolean;
  fuzzy?: boolean;
  limit?: number;
}

/**
 * Search result
 */
export interface SearchResult<T = any> {
  entity: T;
  score: number;
  highlights?: Record<string, string[]>;
  snippet?: string;
  matchType: 'exact' | 'fuzzy' | 'partial';
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Detailed API error
 */
export interface DetailedApiError extends ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  validationErrors?: Array<{
    field: string;
    message: string;
    code: string;
    value?: any;
  }>;
  correlationId?: string;
  retryAfter?: number;
  suggestions?: string[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  expected?: any;
}

// =============================================================================
// RATE LIMITING TYPES
// =============================================================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: string;
  retryAfter?: number;
}

// =============================================================================
// FILE UPLOAD TYPES
// =============================================================================

/**
 * File upload options
 */
export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  generateThumbnail?: boolean;
  compress?: boolean;
  quality?: number;
}

/**
 * Uploaded file information
 */
export interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  taskId?: TaskId;
}

// =============================================================================
// USER AND PERMISSION TYPES
// =============================================================================

/**
 * User context for API requests
 */
export interface UserContext {
  id: UserId;
  email?: string;
  name?: string;
  role?: 'admin' | 'user' | 'guest';
  permissions?: string[];
  preferences?: Record<string, any>;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  required?: string[];
  granted?: string[];
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

/**
 * Analytics data
 */
export interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  listsByTaskCount: Array<{
    id: ListId;
    name: string;
    taskCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    entityId: string;
    entityType: string;
  }>;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

/**
 * Notification types
 */
export type NotificationType = 'reminder' | 'deadline' | 'overdue' | 'assignment' | 'system';

/**
 * Notification message
 */
export interface NotificationMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  taskId?: TaskId;
  listId?: ListId;
  userId: UserId;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  reminders: boolean;
  deadlines: boolean;
  overdue: boolean;
  assignments: boolean;
  system: boolean;
}