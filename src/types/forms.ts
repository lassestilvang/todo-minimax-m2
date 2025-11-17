/**
 * Form and Validation Types for Daily Task Planner Application
 * 
 * This module defines comprehensive TypeScript interfaces for form handling,
 * validation schemas, error types, and form state management patterns.
 */

import type {
  Task,
  List,
  Label,
  User,
  Priority,
  TaskStatus,
  RecurringPattern
} from '../lib/db/types';
import type {
  TaskId,
  ListId,
  LabelId,
  UserId,
  DateRange,
  LoadingState,
  ApiError,
  Option,
  Result
} from './utils';
import type {
  CreateTaskData,
  UpdateTaskData,
  CreateListData,
  UpdateListData,
  TaskFormValidation,
  ListFormValidation
} from './tasks';
import type {
  TaskValidationRules,
  ListValidationRules
} from './tasks';

// =============================================================================
// FORM BASE TYPES
// =============================================================================

/**
 * Generic form field interface
 */
export interface FormField<T = any> {
  name: string;
  value: T;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  touched?: boolean;
  validating?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  rules?: ValidationRule[];
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message: string;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, formData?: Record<string, any>) => boolean | string;
}

/**
 * Validation types
 */
export type ValidationType = 
  | 'required'
  | 'email'
  | 'url'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'custom'
  | 'match'
  | 'unique'
  | 'date'
  | 'future'
  | 'past';

/**
 * Form state interface
 */
export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Record<keyof T, string[]>;
  touched: Record<keyof T, boolean>;
  validating: Record<keyof T, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;
  isResetting: boolean;
}

/**
 * Form configuration
 */
export interface FormConfig<T = Record<string, any>> {
  initialValues: T;
  validate?: (values: T) => Record<keyof T, string[]>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  reValidateOnChange?: boolean;
  clearErrorOnChange?: boolean;
  resetOnSubmit?: boolean;
  touchOnBlur?: boolean;
  validateDebounceMs?: number;
  submitDebounceMs?: number;
}

// =============================================================================
// TASK FORM TYPES
// =============================================================================

/**
 * Task form data structure
 */
export interface TaskFormData {
  name: string;
  description: string;
  listId: ListId;
  parentTaskId?: TaskId;
  priority: Priority;
  status: TaskStatus;
  date?: Date;
  deadline?: Date;
  estimate: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  labels: LabelId[];
  subtasks: SubtaskFormData[];
  reminders: ReminderFormData[];
  customFields: Record<string, any>;
  tags: string[];
}

/**
 * Subtask form data
 */
export interface SubtaskFormData {
  id?: string;
  name: string;
  isCompleted: boolean;
  position?: number;
}

/**
 * Reminder form data
 */
export interface ReminderFormData {
  id?: string;
  remindAt: Date;
  method: 'push' | 'email' | 'sms';
  isSent: boolean;
}

/**
 * Extended task validation rules
 */
export interface TaskFormValidationRules extends TaskValidationRules {
  name: TaskValidationRules['name'] & {
    unique?: (name: string, formData: TaskFormData) => Promise<boolean>;
  };
  date?: {
    required?: boolean;
    beforeDeadline?: boolean;
    inFuture?: boolean;
  };
  deadline?: {
    required?: boolean;
    afterDate?: boolean;
    inFuture?: boolean;
  };
  estimate?: {
    format?: RegExp;
    maxHours?: number;
  };
  recurringPattern?: {
    type: ValidationRule[];
    interval: ValidationRule[];
    endDate?: ValidationRule[];
  };
  labels: {
    maxCount?: number;
    allowedLabels?: LabelId[];
  };
  subtasks: {
    maxCount?: number;
    requiredNames?: boolean;
  };
}

/**
 * Task form state
 */
export interface TaskFormState extends FormState<TaskFormData> {
  quickAdd: boolean;
  isTemplate: boolean;
  templateName?: string;
  saveAsTemplate: boolean;
  autoSave: boolean;
  lastSaved?: Date;
}

/**
 * Task form configuration
 */
export interface TaskFormConfig extends FormConfig<TaskFormData> {
  validationRules?: TaskFormValidationRules;
  validationSchema?: any; // Zod, Yup, or custom schema
  autoSave?: boolean;
  autoSaveInterval?: number;
  saveAsTemplate?: boolean;
  templates?: TaskTemplateData[];
  defaultValues?: Partial<TaskFormData>;
  onAutoSave?: (values: TaskFormData) => void;
  onSaveTemplate?: (name: string, values: TaskFormData) => void;
  onLoadTemplate?: (templateId: string) => Promise<TaskFormData>;
}

/**
 * Task template data
 */
export interface TaskTemplateData {
  id: string;
  name: string;
  description?: string;
  data: Partial<TaskFormData>;
  category?: string;
  tags?: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// LIST FORM TYPES
// =============================================================================

/**
 * List form data structure
 */
export interface ListFormData {
  name: string;
  description: string;
  color: string;
  emoji: string;
  isDefault: boolean;
  settings?: ListSettingsFormData;
}

/**
 * List settings form data
 */
export interface ListSettingsFormData {
  defaultView: 'grid' | 'list' | 'kanban';
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  autoRefresh: boolean;
  showCompleted: boolean;
  showSubtasks: boolean;
  showDescriptions: boolean;
  showDueDates: boolean;
  showPriorities: boolean;
  showLabels: boolean;
  showProgress: boolean;
  compactMode: boolean;
  groupBy?: string;
  filterPresets: ListFilterPresetFormData[];
  notificationSettings: ListNotificationSettingsFormData;
}

/**
 * List filter preset form data
 */
export interface ListFilterPresetFormData {
  id?: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

/**
 * List notification settings form data
 */
export interface ListNotificationSettingsFormData {
  newTasks: boolean;
  taskReminders: boolean;
  deadlineAlerts: boolean;
  statusChanges: boolean;
  overdueAlerts: boolean;
  completionCelebrations: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
}

/**
 * Extended list validation rules
 */
export interface ListFormValidationRules extends ListValidationRules {
  name: ListValidationRules['name'] & {
    unique?: (name: string, formData?: ListFormData) => Promise<boolean>;
  };
  description?: {
    maxLength?: number;
  };
  color: {
    required: boolean;
    pattern?: RegExp;
    allowedValues?: string[];
  };
  emoji: {
    required: boolean;
    maxLength?: number;
    allowedValues?: string[];
  };
  settings?: {
    sortBy?: {
      allowedValues?: string[];
    };
    defaultView?: {
      allowedValues?: Array<'grid' | 'list' | 'kanban'>;
    };
    groupBy?: {
      allowedValues?: string[];
    };
  };
}

/**
 * List form state
 */
export interface ListFormState extends FormState<ListFormData> {
  isImporting: boolean;
  importData?: ListImportFormData;
  isExporting: boolean;
  exportConfig?: ListExportFormData;
  saveAsTemplate: boolean;
  templateName?: string;
}

/**
 * List import form data
 */
export interface ListImportFormData {
  file?: File;
  format: 'json' | 'csv';
  mergeStrategy: 'replace' | 'merge' | 'append';
  includeTasks: boolean;
  includeSettings: boolean;
  validateOnly: boolean;
}

/**
 * List export form data
 */
export interface ListExportFormData {
  format: 'json' | 'csv' | 'pdf';
  includeTasks: boolean;
  includeSettings: boolean;
  includeStatistics: boolean;
  dateRange?: DateRange;
  taskFilter?: Record<string, any>;
}

// =============================================================================
// USER FORM TYPES
// =============================================================================

/**
 * User profile form data
 */
export interface UserFormData {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  timezone: string;
  language: string;
  preferences: UserPreferencesFormData;
}

/**
 * User preferences form data
 */
export interface UserPreferencesFormData {
  theme: 'light' | 'dark' | 'system';
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStart: 'sunday' | 'monday';
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    sound: boolean;
    taskReminders: boolean;
    deadlineAlerts: boolean;
    overdueAlerts: boolean;
    weeklyDigest: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    showActivity: boolean;
    shareAnalytics: boolean;
  };
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
 * User validation rules
 */
export interface UserValidationRules {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  email: {
    required: boolean;
    pattern: RegExp;
    unique?: (email: string) => Promise<boolean>;
  };
  bio?: {
    maxLength: number;
  };
  website?: {
    pattern: RegExp;
  };
  timezone: {
    required: boolean;
    allowedValues?: string[];
  };
  language: {
    required: boolean;
    allowedValues?: string[];
  };
}

// =============================================================================
// LABEL FORM TYPES
// =============================================================================

/**
 * Label form data structure
 */
export interface LabelFormData {
  name: string;
  icon: string;
  color: string;
  description?: string;
}

/**
 * Label validation rules
 */
export interface LabelValidationRules {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
    unique?: (name: string) => Promise<boolean>;
  };
  icon: {
    required: boolean;
    maxLength: number;
    allowedValues?: string[];
  };
  color: {
    required: boolean;
    pattern: RegExp;
    allowedValues?: string[];
  };
  description?: {
    maxLength: number;
  };
}

// =============================================================================
// SEARCH AND FILTER FORMS
// =============================================================================

/**
 * Advanced search form data
 */
export interface SearchFormData {
  query: string;
  entityTypes: Array<'task' | 'list' | 'label'>;
  filters: SearchFiltersFormData;
  sorting: SearchSortingFormData;
  options: SearchOptionsFormData;
}

/**
 * Search filters form data
 */
export interface SearchFiltersFormData {
  dateRange?: DateRange;
  status?: TaskStatus[];
  priority?: Priority[];
  listIds?: ListId[];
  labelIds?: LabelId[];
  assigneeIds?: UserId[];
  hasDeadline?: boolean;
  isOverdue?: boolean;
  hasAttachments?: boolean;
  tags?: string[];
  customFieldFilters?: Record<string, any>;
}

/**
 * Search sorting form data
 */
export interface SearchSortingFormData {
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  secondarySortBy?: string;
  secondarySortDirection?: 'asc' | 'desc';
}

/**
 * Search options form data
 */
export interface SearchOptionsFormData {
  highlight: boolean;
  fuzzy: boolean;
  includeArchived: boolean;
  limit: number;
  page: number;
}

// =============================================================================
// VALIDATION ERROR TYPES
// =============================================================================

/**
 * Form validation error structure
 */
export interface FormValidationError {
  field: string;
  message: string;
  type: ValidationType;
  value?: any;
  rule?: ValidationRule;
}

/**
 * Field validation result
 */
export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  value?: any;
  touched?: boolean;
}

/**
 * Form validation summary
 */
export interface ValidationSummary {
  isValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  errors: FormValidationError[];
  warnings: FormValidationError[];
  fields: Record<string, FieldValidationResult>;
  firstError?: FormValidationError;
  firstWarning?: FormValidationError;
}

// =============================================================================
// FORM SUBMISSION TYPES
// =============================================================================

/**
 * Form submission result
 */
export interface FormSubmissionResult<T = any> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  serverErrors?: ApiError[];
  validationErrors?: FormValidationError[];
  redirectUrl?: string;
  message?: string;
}

/**
 * Form submission config
 */
export interface FormSubmissionConfig<T = Record<string, any>> {
  endpoint?: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  mode?: RequestMode;
  redirect?: 'follow' | 'error' | 'manual';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onBeforeSubmit?: (values: T) => T | Promise<T>;
  onAfterSubmit?: (result: FormSubmissionResult) => void;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  onValidationError?: (errors: Record<string, string[]>) => void;
}

// =============================================================================
// FORM HOOKS AND CONTEXT
// =============================================================================

/**
 * Form hook options
 */
export interface FormHookOptions<T = Record<string, any>> extends FormConfig<T> {
  submissionConfig?: FormSubmissionConfig<T>;
  onSubmit?: (values: T) => Promise<FormSubmissionResult>;
  onReset?: (values: T) => void;
  onValuesChange?: (values: T, prevValues: T) => void;
  onBlur?: (fieldName: keyof T) => void;
  onFocus?: (fieldName: keyof T) => void;
}

/**
 * Form hook return type
 */
export interface UseFormReturn<T = Record<string, any>> {
  // State
  values: T;
  errors: Record<keyof T, string[]>;
  touched: Record<keyof T, boolean>;
  validating: Record<keyof T, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  isResetting: boolean;
  submitCount: number;
  
  // Field handlers
  getFieldProps: (name: keyof T) => {
    name: string;
    value: any;
    onChange: React.ChangeEventHandler;
    onBlur: React.FocusEventHandler;
    onFocus: React.FocusEventHandler;
    error?: string;
    touched?: boolean;
    validating?: boolean;
  };
  getFieldError: (name: keyof T) => string[] | undefined;
  getFieldTouched: (name: keyof T) => boolean;
  getFieldValidating: (name: keyof T) => boolean;
  
  // Value handlers
  setFieldValue: (name: keyof T, value: any) => void;
  setFieldTouched: (name: keyof T, touched?: boolean) => void;
  setFieldError: (name: keyof T, error?: string | string[]) => void;
  setValues: (values: Partial<T>) => void;
  
  // Validation
  validateField: (name: keyof T) => Promise<boolean>;
  validateFields: (names?: (keyof T)[]) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  resetValidation: (names?: (keyof T)[]) => void;
  
  // Submission
  submit: React.FormEventHandler;
  handleSubmit: React.FormEventHandler;
  reset: () => void;
  resetWithValues: (values: T) => void;
  
  // Utility
  registerField: (name: keyof T) => void;
  unregisterField: (name: keyof T) => void;
  getFormValues: () => T;
  isFieldValid: (name: keyof T) => boolean;
  isFieldTouched: (name: keyof T) => boolean;
}

// =============================================================================
// FORM CONTEXT AND PROVIDER
// =============================================================================

/**
 * Form context value
 */
export interface FormContextValue<T = Record<string, any>> extends UseFormReturn<T> {
  // Configuration
  config: FormConfig<T>;
  submissionConfig?: FormSubmissionConfig<T>;
  
  // Provider methods
  register: (name: string, validation?: ValidationRule[]) => void;
  unregister: (name: string) => void;
  validate: () => Promise<ValidationSummary>;
  submitForm: () => Promise<FormSubmissionResult>;
  resetForm: (values?: T) => void;
  
  // Event handlers
  onSubmit: React.FormEventHandler;
  onReset: React.FormEventHandler;
  onChange: React.ChangeEventHandler;
  onBlur: React.FocusEventHandler;
  onFocus: React.FocusEventHandler;
  
  // Batch operations
  setMultipleFields: (updates: Partial<T>) => void;
  setMultipleErrors: (errors: Record<keyof T, string | string[]>) => void;
  setMultipleTouched: (touched: Record<keyof T, boolean>) => void;
  
  // Utils
  getFieldProps: (name: keyof T) => any;
  getErrorMessage: (errors: string[]) => string;
  mergeErrors: (errors: Record<keyof T, string[]>) => Record<keyof T, string[]>;
}

// =============================================================================
// DYNAMIC FORM TYPES
// =============================================================================

/**
 * Dynamic field configuration
 */
export interface DynamicFieldConfig {
  name: string;
  type: DynamicFieldType;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  defaultValue?: any;
  validation?: ValidationRule[];
  props?: Record<string, any>;
  visible?: (formData: Record<string, any>) => boolean;
  dependsOn?: string[];
}

/**
 * Dynamic field types
 */
export type DynamicFieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'url'
  | 'password'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'date'
  | 'time'
  | 'datetime'
  | 'color'
  | 'file'
  | 'tags'
  | 'array'
  | 'object'
  | 'custom';

/**
 * Dynamic form configuration
 */
export interface DynamicFormConfig {
  fields: DynamicFieldConfig[];
  layout?: 'vertical' | 'horizontal' | 'inline';
  spacing?: number;
  columns?: number;
  showLabels?: boolean;
  showRequired?: boolean;
  showErrorMessage?: boolean;
  showHelperText?: boolean;
  validationOnChange?: boolean;
  validationOnBlur?: boolean;
}

// =============================================================================
// FORM VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for task form
 */
export interface TaskFormZodSchema {
  name: {
    required: string;
    minLength: (min: number) => string;
    maxLength: (max: number) => string;
    pattern: (regex: RegExp, message: string) => any;
  };
  description?: {
    maxLength: (max: number) => string;
  };
  listId: {
    required: string;
  };
  priority: {
    oneOf: (values: Priority[], message: string) => any;
  };
  date?: {
    custom: (fn: (date: Date) => boolean, message: string) => any;
  };
  deadline?: {
    custom: (fn: (date: Date) => boolean, message: string) => any;
  };
  estimate?: {
    pattern: (regex: RegExp, message: string) => any;
  };
}

/**
 * Yup schema for list form
 */
export interface ListFormYupSchema {
  name: {
    required: string;
    min: (min: number) => string;
    max: (max: number) => string;
    test: (name: string, message: string, fn: (value: any) => boolean) => any;
  };
  color: {
    required: string;
    matches: (regex: RegExp, message: string) => any;
  };
  emoji: {
    required: string;
    max: (max: number) => string;
  };
}

// =============================================================================
// FORM STORAGE AND PERSISTENCE
// =============================================================================

/**
 * Form data persistence config
 */
export interface FormPersistenceConfig {
  storage: 'localStorage' | 'sessionStorage' | 'indexedDB';
  key: string;
  version?: string;
  ttl?: number;
  encrypt?: boolean;
  compress?: boolean;
  excludeFields?: string[];
  includeFields?: string[];
  debounceMs?: number;
}

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // milliseconds
  debounceMs: number;
  storage?: FormPersistenceConfig['storage'];
  validateBeforeSave?: boolean;
  onSave?: (values: Record<string, any>) => void;
  onLoad?: (values: Record<string, any>) => void;
  onError?: (error: any) => void;
}

/**
 * Form template interface
 */
export interface FormTemplate<T = Record<string, any>> {
  id: string;
  name: string;
  description?: string;
  category?: string;
  data: T;
  validationRules?: ValidationRule[];
  tags?: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
  authorId?: UserId;
}