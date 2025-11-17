/**
 * API Validation Schemas using Zod
 * 
 * Comprehensive validation schemas for all API endpoints
 */

import { z } from 'zod';
import type { 
  TaskId, 
  ListId, 
  LabelId, 
  UserId,
  Priority,
  TaskStatus
} from '../../../types/utils';

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/**
 * Base ID schema
 */
export const idSchema = z.string().uuid().min(1).max(255);

/**
 * Base pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * Base date range schema
 */
export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional()
});

/**
 * Base search schema
 */
export const searchSchema = z.object({
  search: z.string().max(255).optional()
});

// =============================================================================
// USER SCHEMAS
// =============================================================================

/**
 * User creation schema
 */
export const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128)
});

/**
 * User update schema
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      inApp: z.boolean().optional()
    }).optional()
  }).optional()
});

// =============================================================================
// LIST SCHEMAS
// =============================================================================

/**
 * List creation schema
 */
export const createListSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format'),
  emoji: z.string().min(1).max(10),
  isDefault: z.boolean().optional().default(false),
  description: z.string().max(500).optional()
});

/**
 * List update schema
 */
export const updateListSchema = createListSchema.partial().extend({
  id: idSchema
});

/**
 * List query parameters schema
 */
export const listQuerySchema = paginationSchema.merge(searchSchema).extend({
  includeTaskCount: z.coerce.boolean().optional().default(true),
  isDefault: z.coerce.boolean().optional(),
  color: z.string().optional()
});

// =============================================================================
// LABEL SCHEMAS
// =============================================================================

/**
 * Label creation schema
 */
export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format'),
  icon: z.string().min(1).max(50)
});

/**
 * Label update schema
 */
export const updateLabelSchema = createLabelSchema.partial().extend({
  id: idSchema
});

/**
 * Label query parameters schema
 */
export const labelQuerySchema = paginationSchema.merge(searchSchema).extend({
  includeTaskCount: z.coerce.boolean().optional().default(true),
  color: z.string().optional()
});

// =============================================================================
// TASK SCHEMAS
// =============================================================================

/**
 * Recurring pattern schema
 */
export const recurringPatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
  interval: z.number().int().min(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
  endDate: z.string().datetime().optional(),
  maxOccurrences: z.number().int().min(1).optional()
}).refine((data) => {
  // Custom validation based on type
  switch (data.type) {
    case 'weekly':
      return data.daysOfWeek && data.daysOfWeek.length > 0;
    case 'monthly':
      return data.dayOfMonth && data.dayOfMonth >= 1 && data.dayOfMonth <= 31;
    case 'yearly':
      return data.monthOfYear && data.monthOfYear >= 1 && data.monthOfYear <= 12;
    default:
      return true;
  }
}, {
  message: 'Invalid recurring pattern configuration',
  path: ['recurringPattern']
});

/**
 * Task creation schema
 */
export const createTaskSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  listId: idSchema,
  parentTaskId: idSchema.optional(),
  priority: z.enum(['High', 'Medium', 'Low', 'None']).optional().default('None'),
  status: z.enum(['todo', 'in_progress', 'done', 'archived']).optional().default('todo'),
  date: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  estimate: z.string().regex(/^\d{1,2}:\d{2}$/, 'Estimate must be in HH:mm format').optional(),
  actualTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'Actual time must be in HH:mm format').optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: recurringPatternSchema.optional(),
  position: z.number().int().min(0).optional(),
  labels: z.array(idSchema).optional().default([]),
  subtasks: z.array(z.object({
    name: z.string().min(1).max(255),
    position: z.number().int().min(0).optional()
  })).optional().default([]),
  reminders: z.array(z.object({
    remindAt: z.string().datetime(),
    method: z.enum(['push', 'email', 'sms']).optional().default('push')
  })).optional().default([]),
  tags: z.array(z.string().min(1).max(50)).optional().default([])
});

/**
 * Task update schema
 */
export const updateTaskSchema = createTaskSchema.partial().extend({
  id: idSchema,
  isCompleted: z.boolean().optional(),
  completedAt: z.string().datetime().optional()
}).refine((data) => {
  // If isCompleted is true, completedAt should be provided
  if (data.isCompleted === true && !data.completedAt) {
    return false;
  }
  return true;
}, {
  message: 'completedAt is required when isCompleted is true',
  path: ['completedAt']
});

/**
 * Task query parameters schema
 */
export const taskQuerySchema = paginationSchema.merge(searchSchema).extend({
  listId: idSchema.optional(),
  labelId: idSchema.optional(),
  status: z.array(z.enum(['todo', 'in_progress', 'done', 'archived'])).optional(),
  priority: z.array(z.enum(['High', 'Medium', 'Low', 'None'])).optional(),
  assigneeId: idSchema.optional(),
  parentTaskId: idSchema.optional().nullable(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  dueBefore: z.string().datetime().optional(),
  isOverdue: z.coerce.boolean().optional(),
  hasDeadline: z.coerce.boolean().optional(),
  isRecurring: z.coerce.boolean().optional(),
  hasSubtasks: z.coerce.boolean().optional(),
  hasAttachments: z.coerce.boolean().optional(),
  tags: z.array(z.string()).optional()
});

// =============================================================================
// SUBTASK SCHEMAS
// =============================================================================

/**
 * Subtask creation schema
 */
export const createSubtaskSchema = z.object({
  name: z.string().min(1).max(255),
  taskId: idSchema,
  position: z.number().int().min(0).optional()
});

/**
 * Subtask update schema
 */
export const updateSubtaskSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(255).optional(),
  isCompleted: z.boolean().optional(),
  position: z.number().int().min(0).optional()
});

// =============================================================================
// REMINDER SCHEMAS
// =============================================================================

/**
 * Reminder creation schema
 */
export const createReminderSchema = z.object({
  taskId: idSchema,
  remindAt: z.string().datetime(),
  method: z.enum(['push', 'email', 'sms']).optional().default('push')
});

/**
 * Reminder update schema
 */
export const updateReminderSchema = z.object({
  id: idSchema,
  remindAt: z.string().datetime().optional(),
  method: z.enum(['push', 'email', 'sms']).optional(),
  isSent: z.boolean().optional()
});

// =============================================================================
// BATCH OPERATION SCHEMAS
// =============================================================================

/**
 * Batch task operation schema
 */
export const batchTaskOperationSchema = z.object({
  taskIds: z.array(idSchema).min(1),
  operation: z.enum(['update', 'delete', 'move', 'status_change']),
  data: z.object({
    listId: idSchema.optional(),
    status: z.enum(['todo', 'in_progress', 'done', 'archived']).optional(),
    priority: z.enum(['High', 'Medium', 'Low', 'None']).optional(),
    assigneeId: idSchema.optional(),
    dueDate: z.string().datetime().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  options: z.object({
    continueOnError: z.boolean().optional().default(true),
    validateBeforeExecute: z.boolean().optional().default(true),
    maxConcurrency: z.number().int().min(1).max(50).optional().default(10)
  }).optional()
});

// =============================================================================
// SEARCH SCHEMAS
// =============================================================================

/**
 * Search request schema
 */
export const searchRequestSchema = z.object({
  query: z.string().min(1).max(255),
  filters: z.object({
    entityTypes: z.array(z.enum(['task', 'list', 'label'])).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    listIds: z.array(idSchema).optional(),
    labelIds: z.array(idSchema).optional()
  }).optional(),
  sort: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  })).optional(),
  pagination: paginationSchema.optional(),
  highlight: z.boolean().optional().default(true),
  fuzzy: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(1000).optional().default(100)
});

// =============================================================================
// FILE UPLOAD SCHEMAS
// =============================================================================

/**
 * File upload schema
 */
export const fileUploadSchema = z.object({
  taskId: idSchema.optional(),
  description: z.string().max(500).optional(),
  generateThumbnail: z.boolean().optional().default(false),
  compress: z.boolean().optional().default(false),
  quality: z.number().int().min(1).max(100).optional().default(80)
});

// =============================================================================
// EXPORT SCHEMAS
// =============================================================================

/**
 * Export request schema
 */
export const exportRequestSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf', 'xlsx']),
  entities: z.array(z.enum(['tasks', 'lists', 'labels', 'subtasks', 'reminders'])).min(1),
  filters: z.record(z.any()).optional(),
  options: z.object({
    includeAttachments: z.boolean().optional().default(true),
    includeHistory: z.boolean().optional().default(false),
    includeMetadata: z.boolean().optional().default(true),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional()
  }).optional()
});

// =============================================================================
// NOTIFICATION SCHEMAS
// =============================================================================

/**
 * Notification preferences schema
 */
export const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  reminders: z.boolean().optional(),
  deadlines: z.boolean().optional(),
  overdue: z.boolean().optional(),
  assignments: z.boolean().optional(),
  system: z.boolean().optional()
});

// =============================================================================
// REAL-TIME SCHEMAS
// =============================================================================

/**
 * WebSocket message schema
 */
export const websocketMessageSchema = z.object({
  type: z.enum([
    'task_created',
    'task_updated',
    'task_deleted',
    'task_status_changed',
    'list_updated',
    'label_updated',
    'notification',
    'user_presence'
  ]),
  payload: z.record(z.any()),
  timestamp: z.string().datetime(),
  userId: idSchema,
  roomId: z.string().optional()
});

// =============================================================================
// UTILITY SCHEMAS
// =============================================================================

/**
 * Generic ID parameter schema
 */
export const idParamSchema = z.object({
  id: idSchema
});

/**
 * Bulk operation result schema
 */
export const batchResultSchema = z.object({
  total: z.number().int().min(0),
  successful: z.number().int().min(0),
  failed: z.number().int().min(0),
  results: z.array(z.object({
    id: z.string(),
    success: z.boolean(),
    data: z.any().optional(),
    error: z.object({
      code: z.string(),
      message: z.string()
    }).optional()
  }))
});

// =============================================================================
// EXPORT ALL SCHEMAS
// =============================================================================

export const schemas = {
  // Base
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
  search: searchSchema,
  
  // User
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  
  // List
  createList: createListSchema,
  updateList: updateListSchema,
  listQuery: listQuerySchema,
  
  // Label
  createLabel: createLabelSchema,
  updateLabel: updateLabelSchema,
  labelQuery: labelQuerySchema,
  
  // Task
  createTask: createTaskSchema,
  updateTask: updateTaskSchema,
  taskQuery: taskQuerySchema,
  recurringPattern: recurringPatternSchema,
  
  // Subtask
  createSubtask: createSubtaskSchema,
  updateSubtask: updateSubtaskSchema,
  
  // Reminder
  createReminder: createReminderSchema,
  updateReminder: updateReminderSchema,
  
  // Batch
  batchTaskOperation: batchTaskOperationSchema,
  
  // Search
  searchRequest: searchRequestSchema,
  
  // File
  fileUpload: fileUploadSchema,
  
  // Export
  exportRequest: exportRequestSchema,
  
  // Notification
  notificationPreferences: notificationPreferencesSchema,
  
  // Real-time
  websocketMessage: websocketMessageSchema,
  
  // Utility
  idParam: idParamSchema,
  batchResult: batchResultSchema
} as const;

// Export type helpers for each schema
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateListInput = z.infer<typeof createListSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type SearchRequestInput = z.infer<typeof searchRequestSchema>;
export type BatchTaskOperationInput = z.infer<typeof batchTaskOperationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;