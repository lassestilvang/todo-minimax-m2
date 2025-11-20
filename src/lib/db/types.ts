// Database Types and Interfaces for Daily Task Planner

export type Priority = 'High' | 'Medium' | 'Low' | 'None';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Table
export interface User extends BaseEntity {
  name: string;
  email: string;
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    timezone: string;
    dateFormat: string;
  };
}

// List Table
export interface List extends BaseEntity {
  name: string;
  color: string;
  emoji: string;
  isDefault: boolean;
  isFavorite: boolean;
  description?: string;
  position: number;
  userId: string;
}

// Label Table
export interface Label extends BaseEntity {
  name: string;
  icon: string;
  color: string;
  userId: string;
}

// Task-Label Relationship
export interface TaskLabel {
  taskId: string;
  labelId: string;
}

// Task Table
export interface Task extends BaseEntity {
  name: string;
  description?: string;
  date?: Date;
  deadline?: Date;
  estimate?: string; // HH:mm format
  actualTime?: string; // HH:mm format
  priority: Priority;
  status: TaskStatus;
  userId: string;
  listId: string;
  parentTaskId?: string; // For hierarchical tasks
  position: number;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number; // Every N days/weeks/months
  daysOfWeek?: number[]; // 0-6 for weekly (0=Sunday)
  dayOfMonth?: number; // 1-31 for monthly
  monthOfYear?: number; // 1-12 for yearly
  endDate?: Date;
  maxOccurrences?: number;
}

// Subtask Table
export interface Subtask extends BaseEntity {
  name: string;
  isCompleted: boolean;
  taskId: string;
  position: number;
}

// Reminder Table
export interface Reminder extends BaseEntity {
  taskId: string;
  remindAt: Date;
  isSent: boolean;
  method: 'push' | 'email' | 'sms';
}

// Task History Table (for change logging)
export interface TaskHistory extends BaseEntity {
  taskId: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'completed' | 'uncompleted';
  changedBy: string;
  changes: Record<string, any>; // JSON object with old and new values
  description?: string;
}

// Attachment Table
export interface Attachment extends BaseEntity {
  taskId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

// Database Stats
export interface DatabaseStats {
  totalUsers: number;
  totalLists: number;
  totalTasks: number;
  totalLabels: number;
  totalSubtasks: number;
  totalReminders: number;
  totalAttachments: number;
  totalHistoryEntries: number;
}

// Database Query Results
export interface TaskWithDetails extends Task {
  list?: List;
  labels?: Label[];
  subtasks?: Subtask[];
  reminders?: Reminder[];
  attachments?: Attachment[];
  subtaskCount?: number;
  completedSubtaskCount?: number;
}

export interface ListWithTaskCount extends List {
  taskCount: number;
  completedTaskCount: number;
}

export interface LabelWithTaskCount extends Label {
  taskCount: number;
}

// Database Error Types
export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// Database Operations Types
export interface DatabaseOperation<T = any> {
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
}

export interface Transaction {
  execute: <T>(operation: DatabaseOperation<T>) => Promise<T>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

// Query Builder Types
export interface QueryBuilder {
  select: (columns: string[]) => QueryBuilder;
  from: (table: string) => QueryBuilder;
  where: (conditions: Record<string, any>) => QueryBuilder;
  whereIn: (column: string, values: any[]) => QueryBuilder;
  orderBy: (column: string, direction?: 'ASC' | 'DESC') => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  offset: (count: number) => QueryBuilder;
  join: (table: string, condition: string) => QueryBuilder;
  build: () => { sql: string; params: any[] };
}

// Database Configuration
export interface DatabaseConfig {
  path: string;
  timeout: number;
  verbose: boolean;
  WAL: boolean; // Write-Ahead Logging
  foreignKeys: boolean;
  backupEnabled: boolean;
  backupInterval: number; // in milliseconds
}
