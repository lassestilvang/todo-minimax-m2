/**
 * Utility Types and Helpers for Daily Task Planner Application
 *
 * This module provides foundational utility types that are used across the application.
 * These types extend and enhance the database types with application-specific functionality.
 */

import type {
  Task,
  List,
  Label,
  User,
  Priority,
  TaskStatus,
  BaseEntity,
  TaskWithDetails,
  ListWithTaskCount,
  RecurringPattern,
} from "../lib/db/types";

// =============================================================================
// CORE UTILITY TYPES
// =============================================================================

/**
 * Generic type for API responses with status, data, and error handling
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMetadata;
}

/**
 * Metadata for API responses including pagination, totals, etc.
 */
export interface ResponseMetadata {
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  timestamp: string;
  requestId?: string;
  version?: string;
}

/**
 * Application-specific error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string; // For validation errors
  timestamp?: string;
}

/**
 * Loading state types for components
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * Generic state interface for components
 */
export interface ComponentState<T = any> {
  data: T | null;
  loading: LoadingState;
  error: ApiError | null;
}

/**
 * Generic pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// =============================================================================
// ID AND REFERENCE TYPES
// =============================================================================

/**
 * Type-safe ID wrapper to distinguish between different entity IDs
 */
export type EntityId = string & { readonly brand: unique symbol };

/**
 * Utility type for creating branded IDs
 */
export type Brand<K, T extends string> = K & { readonly brand: T };

/**
 * Specific branded ID types for better type safety
 */
export type TaskId = Brand<string, "TaskId">;
export type ListId = Brand<string, "ListId">;
export type LabelId = Brand<string, "LabelId">;
export type UserId = Brand<string, "UserId">;
export type SubtaskId = Brand<string, "SubtaskId">;
export type ReminderId = Brand<string, "ReminderId">;

/**
 * Type guard for checking if a value is a valid EntityId
 */
export function isEntityId(value: any): value is EntityId {
  return typeof value === "string" && value.length > 0;
}

// =============================================================================
// DATE AND TIME UTILITIES
// =============================================================================

/**
 * Date range interface for filtering and grouping
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Time estimation and tracking types
 */
export interface TimeTracking {
  estimated: string; // HH:mm format
  actual?: string; // HH:mm format
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Period types for recurring tasks and views
 */
export type TimePeriod =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

export interface TimePeriodConfig {
  period: TimePeriod;
  dateRange: DateRange;
  label: string;
}

// =============================================================================
// FILTERING AND SEARCH UTILITIES
// =============================================================================

/**
 * Generic filter interface for list operations
 */
export interface BaseFilter {
  search?: string;
  dateRange?: DateRange;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

/**
 * Sort configuration for list operations
 */
export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Advanced filtering with multiple criteria
 */
export interface AdvancedFilter<T = any> extends BaseFilter {
  criteria?: Partial<T>;
  excludeIds?: string[];
  includeIds?: string[];
  tags?: string[];
  customFields?: Record<string, any>;
}

// =============================================================================
// TYPE GUARDS AND HELPERS
// =============================================================================

/**
 * Type guard for checking if a value is a Task
 */
export function isTask(value: any): value is Task {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    ["todo", "in_progress", "done", "archived"].includes(value.status)
  );
}

/**
 * Type guard for checking if a value is a List
 */
export function isList(value: any): value is List {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

/**
 * Type guard for checking if a value is a Label
 */
export function isLabel(value: any): value is Label {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

// =============================================================================
// GENERIC RESULT AND OPTION TYPES
// =============================================================================

/**
 * Result type for operations that can succeed or fail
 */
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Option type for nullable values with type safety
 */
export type Option<T> = Some<T> | None;

export interface Some<T> {
  readonly type: "some";
  readonly value: T;
}

export interface None {
  readonly type: "none";
}

/**
 * Helper to create Some<T>
 */
export function some<T>(value: T): Some<T> {
  return { type: "some", value };
}

/**
 * Helper to create None
 */
export function none(): None {
  return { type: "none" };
}

/**
 * Type guard for Option<T>
 */
export function isSome<T>(option: Option<T>): option is Some<T> {
  return option.type === "some";
}

export function isNone<T>(option: Option<T>): option is None {
  return option.type === "none";
}

// =============================================================================
// UNIONS AND CONSTRAINTS
// =============================================================================

/**
 * Strict union types for application-specific values
 */
export type ViewType =
  | "today"
  | "next7"
  | "upcoming"
  | "all"
  | "completed"
  | "archived";

export type ListViewType = "grid" | "list" | "kanban";

export type NotificationType =
  | "reminder"
  | "deadline"
  | "overdue"
  | "recurring"
  | "assignment";

export type Theme = "light" | "dark" | "system";

export type SortField =
  | "name"
  | "dueDate"
  | "priority"
  | "status"
  | "created"
  | "updated"
  | "list";

/**
 * Priority ordering for consistent sorting and filtering
 */
export const PriorityOrder: Record<Priority, number> = {
  High: 1,
  Medium: 2,
  Low: 3,
  None: 4,
};

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Application configuration interface
 */
export interface AppConfig {
  theme: Theme;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  language: string;
  autoSave: boolean;
  notifications: {
    enabled: boolean;
    desktop: boolean;
    sound: boolean;
    reminders: number; // minutes before task
  };
  ui: {
    listView: ListViewType;
    itemsPerPage: number;
    showCompleted: boolean;
    showSubtasks: boolean;
  };
}

// =============================================================================
// EVENT AND CALLBACK TYPES
// =============================================================================

/**
 * Generic event handler type
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * CRUD operation types for entities
 */
export type CrudOperation = "create" | "read" | "update" | "delete";

export interface EntityEvent<T = any> {
  entity: T;
  operation: CrudOperation;
  timestamp: Date;
  userId: string;
}

// =============================================================================
// EXTENSION TYPES FOR DATABASE ENTITIES
// =============================================================================

/**
 * Extended task with application-specific properties
 */
export interface AppTask extends Omit<Task, "id" | "userId" | "listId"> {
  id: TaskId;
  userId: UserId;
  listId: ListId;
  // Additional application-specific properties
  isSelected?: boolean;
  isExpanded?: boolean;
  sortIndex?: number;
  customFields?: Record<string, any>;
  notifications?: NotificationConfig[];
}

/**
 * Extended list with application-specific properties
 */
export interface AppList extends Omit<List, "id" | "userId"> {
  id: ListId;
  userId: UserId;
  // Additional application-specific properties
  isSelected?: boolean;
  isExpanded?: boolean;
  sortIndex?: number;
  defaultView?: ViewType;
  customSettings?: ListSettings;
}

/**
 * List-specific settings and preferences
 */
export interface ListSettings {
  defaultView: ListViewType;
  sortBy: SortField;
  sortDirection: "asc" | "desc";
  autoRefresh: boolean;
  showCompleted: boolean;
  showSubtasks: boolean;
  groupBy?: "priority" | "status" | "dueDate" | "none";
}

/**
 * Notification configuration for tasks
 */
export interface NotificationConfig {
  type: NotificationType;
  enabled: boolean;
  timing?: {
    minutes?: number;
    hours?: number;
    days?: number;
  };
  sound?: boolean;
  vibration?: boolean;
}

// =============================================================================
// SERIALIZATION AND PERSISTENCE
// =============================================================================

/**
 * Type for serializing data for storage or transmission
 */
export interface Serializable<T = any> {
  toJSON(): T;
  fromJSON(json: T): this;
}

/**
 * Type for objects that can be persisted to local storage
 */
export interface Persistable<T = any> {
  serialize(): string;
  deserialize(data: string): void;
}

/**
 * Local storage keys and structure
 */
export interface LocalStorageSchema {
  "app:config": AppConfig;
  "app:theme": Theme;
  "app:last-view": ViewType;
  "app:filters": Record<string, any>;
  "ui:sidebar-collapsed": boolean;
  "ui:list-layout": ListViewType;
}

// Re-export types from database for convenience
export type {
  Priority,
  TaskStatus,
  BaseEntity,
  TaskWithDetails,
  ListWithTaskCount,
  RecurringPattern,
} from "../lib/db/types";
