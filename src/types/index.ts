/**
 * Main Type Exports for Daily Task Planner Application
 * 
 * This module serves as the central export point for all TypeScript interfaces
 * and types defined across the application. It provides organized exports for
 * different aspects of the application layer.
 * 
 * Usage:
 * ```typescript
 * import { Task, List, AppTask, TaskFilters } from '@/types';
 * // or
 * import { AppTask, TaskFormData } from '@/types/tasks';
 * import { AppList, ListSettings } from '@/types/lists';
 * ```
 */

// =============================================================================
// DATABASE TYPE RE-EXPORTS
// =============================================================================

// Re-export database types for convenience
export type {
  User,
  List,
  Label,
  Task,
  Subtask,
  Reminder,
  Attachment,
  TaskHistory,
  TaskLabel,
  TaskWithDetails,
  ListWithTaskCount,
  LabelWithTaskCount,
  RecurringPattern,
  Priority,
  TaskStatus,
  BaseEntity,
  DatabaseError,
  ValidationError,
  NotFoundError,
  DatabaseStats,
  DatabaseConfig,
  DatabaseOperation,
  Transaction,
  QueryBuilder
} from '../lib/db/types';

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Core utility types
export type {
  ApiResponse,
  ApiError,
  ResponseMetadata,
  LoadingState,
  ComponentState,
  PaginationParams,
  EntityId,
  Brand,
  TaskId,
  ListId,
  LabelId,
  UserId,
  SubtaskId,
  ReminderId,
  DateRange,
  TimeTracking,
  TimePeriod,
  TimePeriodConfig,
  BaseFilter,
  SortConfig,
  AdvancedFilter,
  Result,
  Option,
  Some,
  None,
  ViewType,
  ListViewType,
  NotificationType,
  Theme,
  SortField,
  PriorityOrder,
  AppConfig,
  EventHandler,
  CrudOperation,
  EntityEvent,
  AppTask,
  AppList,
  ListSettings,
  NotificationConfig,
  Serializable,
  Persistable,
  LocalStorageSchema
} from './utils';

export {
  some,
  none,
  isSome,
  isNone,
  isEntityId,
  isTask,
  isList,
  isLabel
} from './utils';

// =============================================================================
// API AND RESPONSE TYPES
// =============================================================================

export type {
  ApiRequest,
  AuthRequest,
  RefreshTokenRequest,
  LogoutRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQueryParams,
  BatchTaskOperation,
  BatchTaskResponse,
  CreateListRequest,
  UpdateListRequest,
  ListQueryParams,
  CreateLabelRequest,
  UpdateLabelRequest,
  LabelQueryParams,
  UpdateTaskLabelsRequest,
  CreateSubtaskRequest,
  UpdateSubtaskRequest,
  CreateReminderRequest,
  UpdateReminderRequest,
  FileUploadRequest,
  FileUploadResponse,
  UpdateUserRequest,
  ChangePasswordRequest,
  TaskListResponse,
  TaskResponse,
  TaskBatchResponse,
  ListListResponse,
  ListResponse,
  LabelListResponse,
  LabelResponse,
  AuthResponse,
  UserResponse,
  DashboardStatsResponse,
  WebSocketMessageType,
  WebSocketMessage,
  TaskUpdateMessage,
  NotificationMessage,
  ValidationError,
  DetailedApiError,
  ErrorResponse,
  RateLimitInfo,
  BulkOperationRequest,
  BulkOperationResponse,
  ExportRequest,
  ExportJobResponse,
  SearchRequest,
  SearchResult,
  CursorPaginationParams,
  PaginatedResponse
} from './api';

// =============================================================================
// TASK TYPES
// =============================================================================

export type {
  TaskCardProps,
  TaskItemProps,
  TaskDetailsProps,
  TaskFormProps,
  TaskChecklistProps,
  TaskAttachmentsProps,
  TaskRemindersProps,
  TaskState,
  TaskView,
  TaskGroupBy,
  TaskFilters,
  TaskSort,
  TaskLayout,
  TaskPagination,
  CreateTaskData,
  UpdateTaskData,
  CreateSubtaskData,
  CreateReminderData,
  TaskOperation,
  TaskBatchResult,
  TaskValidationRules,
  TaskValidationResult,
  TaskFormValidation,
  TaskContextValue,
  UseTasksReturn,
  UseTaskFiltersReturn,
  TaskQueryParams,
  TaskTemplate,
  TaskQuickAction,
  TaskMetrics,
  TaskTimeTracking,
  TaskProductivityInsights
} from './tasks';

// =============================================================================
// LIST TYPES
// =============================================================================

export type {
  ListCardProps,
  ListItemProps,
  ListGridProps,
  ListSidebarProps,
  ListDetailsProps,
  ListSettingsProps,
  ListSharingProps,
  ListStatsProps,
  ListState,
  ListGlobalView,
  ListLayout,
  ListFilters,
  ListPagination,
  ListBreadcrumb,
  ListHistoryEntry,
  ListSettings,
  ListFilterPreset,
  ListNotificationSettings,
  ListPermissions,
  ListStatistics,
  ListViewState,
  CreateListData,
  UpdateListData,
  ListOperation,
  ListBatchResult,
  ListImportData,
  ListExportConfig,
  ListValidationRules,
  ListValidationResult,
  ListFormValidation,
  ListContextValue,
  UseListsReturn,
  UseCurrentListReturn,
  ListQueryParams,
  ListCollection,
  ListWidget,
  ListTemplate,
  ListAnalytics,
  ListComparison
} from './lists';

// =============================================================================
// UI AND COMPONENT TYPES
// =============================================================================

export type {
  BaseComponentProps,
  InteractiveProps,
  HoverFocusProps,
  ButtonProps,
  IconButtonProps,
  ToggleButtonProps,
  DropdownButtonProps,
  ButtonVariant,
  ButtonSize,
  InputProps,
  TextareaProps,
  SelectProps,
  SelectOption,
  CheckboxProps,
  RadioProps,
  SwitchProps,
  InputSize,
  InputVariant,
  ModalProps,
  DialogProps,
  DrawerProps,
  PopoverProps,
  ModalSize,
  ModalPosition,
  PopoverPlacement,
  FlexProps,
  GridProps,
  StackProps,
  ContainerProps,
  SidebarProps,
  NavigationItemProps,
  BreadcrumbProps,
  LayoutDirection,
  Spacing,
  CardProps,
  CardHeaderProps,
  CardContentProps,
  CardFooterProps,
  BadgeProps,
  TagProps,
  BadgeVariant,
  BadgeSize,
  AvatarProps,
  AvatarVariant,
  AvatarSize,
  ProgressProps,
  SpinnerProps,
  SkeletonProps,
  ProgressVariant,
  ProgressSize,
  TooltipProps,
  HelpTooltipProps,
  TabProps,
  TabsProps,
  AccordionItemProps,
  AccordionProps,
  ThemeConfig,
  CSSCustomProperties,
  AnimationConfig,
  TransitionProps,
  AnimationTiming,
  AnimationDirection,
  AnimationFillMode,
  ComponentRegistryEntry,
  ComponentLibrary,
  AccessibilityState,
  ARIARole,
  FocusManager
} from './ui';

// =============================================================================
// FORM AND VALIDATION TYPES
// =============================================================================

export type {
  FormField,
  ValidationRule,
  ValidationType,
  FormState,
  FormConfig,
  TaskFormData,
  SubtaskFormData,
  ReminderFormData,
  TaskFormValidationRules,
  TaskFormState,
  TaskFormConfig,
  TaskTemplateData,
  ListFormData,
  ListSettingsFormData,
  ListFilterPresetFormData,
  ListNotificationSettingsFormData,
  ListFormValidationRules,
  ListFormState,
  ListImportFormData,
  ListExportFormData,
  UserFormData,
  UserPreferencesFormData,
  PasswordChangeFormData,
  UserValidationRules,
  LabelFormData,
  LabelValidationRules,
  SearchFormData,
  SearchFiltersFormData,
  SearchSortingFormData,
  SearchOptionsFormData,
  FormValidationError,
  FieldValidationResult,
  ValidationSummary,
  FormSubmissionResult,
  FormSubmissionConfig,
  FormHookOptions,
  UseFormReturn,
  FormContextValue,
  DynamicFieldConfig,
  DynamicFieldType,
  DynamicFormConfig,
  TaskFormZodSchema,
  ListFormYupSchema,
  FormPersistenceConfig,
  AutoSaveConfig,
  FormTemplate
} from './forms';

// =============================================================================
// ZUSTAND STORE TYPES
// =============================================================================

export type {
  StoreAction,
  StoreSelector,
  StoreSubscriber,
  StoreMiddleware,
  StorePersistConfig,
  AppState,
  AppActions,
  AppStore,
  TaskStoreState,
  TaskStoreActions,
  TaskStoreSelectors,
  TaskStore,
  ListStoreState,
  ListStoreActions,
  ListStoreSelectors,
  ListStore,
  LabelStoreState,
  LabelStoreActions,
  LabelStoreSelectors,
  LabelStore,
  FormStoreState,
  FormStoreActions,
  FormStoreSelectors,
  FormStore,
  NotificationState,
  AppNotification,
  ShowNotificationPayload,
  NotificationStoreActions,
  NotificationStoreSelectors,
  NotificationStore,
  ModalState,
  AppModal,
  ShowModalPayload,
  ModalStoreActions,
  ModalStoreSelectors,
  ModalStore,
  AppPreferences,
  DevToolsConfig,
  ImmerConfig,
  PersistConfig,
  StoreInitConfig,
  StoreProviderProps,
  TaskFormConfig,
  ListFormConfig,
  LabelFormConfig,
  PasswordChangeFormData,
  CreateLabelData,
  UpdateLabelData,
  LabelFormValidationRules,
  ValidationRule
} from './store';

// =============================================================================
// TYPE GUARD AND UTILITY FUNCTIONS
// =============================================================================

// Re-export utility functions
export {
  // From utils
  some,
  none,
  isSome,
  isNone,
  isEntityId,
  isTask,
  isList,
  isLabel
} from './utils';

// =============================================================================
// CONSTANTS AND ENUMS
// =============================================================================

// Re-export constants that might be useful externally
export { PriorityOrder } from './utils';

// =============================================================================
// VERSION INFORMATION
// =============================================================================

/**
 * Version information for the type system
 */
export const TYPE_VERSION = '1.0.0';

/**
 * Type system metadata
 */
export interface TypeSystemInfo {
  version: string;
  modules: string[];
  lastUpdated: string;
  totalTypes: number;
}

// Type system information for development
export const TYPE_SYSTEM_INFO: TypeSystemInfo = {
  version: TYPE_VERSION,
  modules: [
    'utils',
    'api', 
    'tasks',
    'lists',
    'ui',
    'forms',
    'store'
  ],
  lastUpdated: new Date().toISOString(),
  totalTypes: 500 + // Approximate count for development
    Object.keys(await import('./utils')).length +
    Object.keys(await import('./api')).length +
    Object.keys(await import('./tasks')).length +
    Object.keys(await import('./lists')).length +
    Object.keys(await import('./ui')).length +
    Object.keys(await import('./forms')).length +
    Object.keys(await import('./store')).length
};

// =============================================================================
// EXPORT ALL TYPES AS NAMESPACES (OPTIONAL)
// =============================================================================

/**
 * Namespace export for all types organized by module
 */
export const Types = {
  /**
   * Database types from the database layer
   */
  Database: {
    User,
    List,
    Label,
    Task,
    Subtask,
    Reminder,
    Attachment,
    TaskHistory,
    TaskLabel,
    TaskWithDetails,
    ListWithTaskCount,
    LabelWithTaskCount,
    RecurringPattern,
    Priority,
    TaskStatus,
    BaseEntity,
    DatabaseError,
    ValidationError,
    NotFoundError,
    DatabaseStats,
    DatabaseConfig,
    DatabaseOperation,
    Transaction,
    QueryBuilder
  },

  /**
   * Utility types for common patterns
   */
  Utils: {
    ApiResponse,
    ApiError,
    ResponseMetadata,
    LoadingState,
    ComponentState,
    PaginationParams,
    EntityId,
    Brand,
    TaskId,
    ListId,
    LabelId,
    UserId,
    SubtaskId,
    ReminderId,
    DateRange,
    TimeTracking,
    TimePeriod,
    TimePeriodConfig,
    BaseFilter,
    SortConfig,
    AdvancedFilter,
    Result,
    Option,
    Some,
    None,
    ViewType,
    ListViewType,
    NotificationType,
    Theme,
    SortField,
    PriorityOrder,
    AppConfig,
    EventHandler,
    CrudOperation,
    EntityEvent,
    AppTask,
    AppList,
    ListSettings,
    NotificationConfig,
    Serializable,
    Persistable,
    LocalStorageSchema
  },

  /**
   * API and network-related types
   */
  API: {
    ApiRequest,
    AuthRequest,
    RefreshTokenRequest,
    LogoutRequest,
    CreateTaskRequest,
    UpdateTaskRequest,
    TaskQueryParams,
    BatchTaskOperation,
    BatchTaskResponse,
    CreateListRequest,
    UpdateListRequest,
    ListQueryParams,
    CreateLabelRequest,
    UpdateLabelRequest,
    LabelQueryParams,
    UpdateTaskLabelsRequest,
    CreateSubtaskRequest,
    UpdateSubtaskRequest,
    CreateReminderRequest,
    UpdateReminderRequest,
    FileUploadRequest,
    FileUploadResponse,
    UpdateUserRequest,
    ChangePasswordRequest,
    TaskListResponse,
    TaskResponse,
    TaskBatchResponse,
    ListListResponse,
    ListResponse,
    LabelListResponse,
    LabelResponse,
    AuthResponse,
    UserResponse,
    DashboardStatsResponse,
    WebSocketMessageType,
    WebSocketMessage,
    TaskUpdateMessage,
    NotificationMessage,
    ValidationError,
    DetailedApiError,
    ErrorResponse,
    RateLimitInfo,
    BulkOperationRequest,
    BulkOperationResponse,
    ExportRequest,
    ExportJobResponse,
    SearchRequest,
    SearchResult,
    CursorPaginationParams,
    PaginatedResponse
  },

  /**
   * Task-related types
   */
  Tasks: {
    TaskCardProps,
    TaskItemProps,
    TaskDetailsProps,
    TaskFormProps,
    TaskChecklistProps,
    TaskAttachmentsProps,
    TaskRemindersProps,
    TaskState,
    TaskView,
    TaskGroupBy,
    TaskFilters,
    TaskSort,
    TaskLayout,
    TaskPagination,
    CreateTaskData,
    UpdateTaskData,
    CreateSubtaskData,
    CreateReminderData,
    TaskOperation,
    TaskBatchResult,
    TaskValidationRules,
    TaskValidationResult,
    TaskFormValidation,
    TaskContextValue,
    UseTasksReturn,
    UseTaskFiltersReturn,
    TaskQueryParams,
    TaskTemplate,
    TaskQuickAction,
    TaskMetrics,
    TaskTimeTracking,
    TaskProductivityInsights
  },

  /**
   * List-related types
   */
  Lists: {
    ListCardProps,
    ListItemProps,
    ListGridProps,
    ListSidebarProps,
    ListDetailsProps,
    ListSettingsProps,
    ListSharingProps,
    ListStatsProps,
    ListState,
    ListGlobalView,
    ListLayout,
    ListFilters,
    ListPagination,
    ListBreadcrumb,
    ListHistoryEntry,
    ListSettings,
    ListFilterPreset,
    ListNotificationSettings,
    ListPermissions,
    ListStatistics,
    ListViewState,
    CreateListData,
    UpdateListData,
    ListOperation,
    ListBatchResult,
    ListImportData,
    ListExportConfig,
    ListValidationRules,
    ListValidationResult,
    ListFormValidation,
    ListContextValue,
    UseListsReturn,
    UseCurrentListReturn,
    ListQueryParams,
    ListCollection,
    ListWidget,
    ListTemplate,
    ListAnalytics,
    ListComparison
  },

  /**
   * UI and component types
   */
  UI: {
    BaseComponentProps,
    InteractiveProps,
    HoverFocusProps,
    ButtonProps,
    IconButtonProps,
    ToggleButtonProps,
    DropdownButtonProps,
    ButtonVariant,
    ButtonSize,
    InputProps,
    TextareaProps,
    SelectProps,
    SelectOption,
    CheckboxProps,
    RadioProps,
    SwitchProps,
    InputSize,
    InputVariant,
    ModalProps,
    DialogProps,
    DrawerProps,
    PopoverProps,
    ModalSize,
    ModalPosition,
    PopoverPlacement,
    FlexProps,
    GridProps,
    StackProps,
    ContainerProps,
    SidebarProps,
    NavigationItemProps,
    BreadcrumbProps,
    LayoutDirection,
    Spacing,
    CardProps,
    CardHeaderProps,
    CardContentProps,
    CardFooterProps,
    BadgeProps,
    TagProps,
    BadgeVariant,
    BadgeSize,
    AvatarProps,
    AvatarVariant,
    AvatarSize,
    ProgressProps,
    SpinnerProps,
    SkeletonProps,
    ProgressVariant,
    ProgressSize,
    TooltipProps,
    HelpTooltipProps,
    TabProps,
    TabsProps,
    AccordionItemProps,
    AccordionProps,
    ThemeConfig,
    CSSCustomProperties,
    AnimationConfig,
    TransitionProps,
    AnimationTiming,
    AnimationDirection,
    AnimationFillMode,
    ComponentRegistryEntry,
    ComponentLibrary,
    AccessibilityState,
    ARIARole,
    FocusManager
  },

  /**
   * Form and validation types
   */
  Forms: {
    FormField,
    ValidationRule,
    ValidationType,
    FormState,
    FormConfig,
    TaskFormData,
    SubtaskFormData,
    ReminderFormData,
    TaskFormValidationRules,
    TaskFormState,
    TaskFormConfig,
    TaskTemplateData,
    ListFormData,
    ListSettingsFormData,
    ListFilterPresetFormData,
    ListNotificationSettingsFormData,
    ListFormValidationRules,
    ListFormState,
    ListImportFormData,
    ListExportFormData,
    UserFormData,
    UserPreferencesFormData,
    PasswordChangeFormData,
    UserValidationRules,
    LabelFormData,
    LabelValidationRules,
    SearchFormData,
    SearchFiltersFormData,
    SearchSortingFormData,
    SearchOptionsFormData,
    FormValidationError,
    FieldValidationResult,
    ValidationSummary,
    FormSubmissionResult,
    FormSubmissionConfig,
    FormHookOptions,
    UseFormReturn,
    FormContextValue,
    DynamicFieldConfig,
    DynamicFieldType,
    DynamicFormConfig,
    TaskFormZodSchema,
    ListFormYupSchema,
    FormPersistenceConfig,
    AutoSaveConfig,
    FormTemplate
  },

  /**
   * Zustand store types
   */
  Store: {
    StoreAction,
    StoreSelector,
    StoreSubscriber,
    StoreMiddleware,
    StorePersistConfig,
    AppState,
    AppActions,
    AppStore,
    TaskStoreState,
    TaskStoreActions,
    TaskStoreSelectors,
    TaskStore,
    ListStoreState,
    ListStoreActions,
    ListStoreSelectors,
    ListStore,
    LabelStoreState,
    LabelStoreActions,
    LabelStoreSelectors,
    LabelStore,
    FormStoreState,
    FormStoreActions,
    FormStoreSelectors,
    FormStore,
    NotificationState,
    AppNotification,
    ShowNotificationPayload,
    NotificationStoreActions,
    NotificationStoreSelectors,
    NotificationStore,
    ModalState,
    AppModal,
    ShowModalPayload,
    ModalStoreActions,
    ModalStoreSelectors,
    ModalStore,
    AppPreferences,
    DevToolsConfig,
    ImmerConfig,
    PersistConfig,
    StoreInitConfig,
    StoreProviderProps,
    TaskFormConfig,
    ListFormConfig,
    LabelFormConfig,
    PasswordChangeFormData,
    CreateLabelData,
    UpdateLabelData,
    LabelFormValidationRules,
    ValidationRule
  }
} as const;

/**
 * Utility function to get all types from a specific module
 */
export function getTypesByModule(moduleName: keyof typeof Types): any {
  return Types[moduleName];
}

/**
 * Utility function to check if a type exists in our type system
 */
export function hasType(typeName: string): boolean {
  const allTypes = Object.values(Types).flatMap(namespace => 
    Object.keys(namespace)
  );
  return allTypes.includes(typeName);
}

/**
 * Utility function to get type information for development
 */
export function getTypeInfo(): TypeSystemInfo {
  return TYPE_SYSTEM_INFO;
}