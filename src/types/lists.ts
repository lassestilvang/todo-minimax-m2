/**
 * List-Related Types for Daily Task Planner Application
 * 
 * This module defines comprehensive TypeScript interfaces for list-related functionality,
 * extending database types with application-specific properties for UI, state management,
 * and business logic.
 */

import type { 
  List, 
  Task, 
  Priority,
  TaskStatus,
  ListWithTaskCount
} from '../lib/db/types';
import type {
  ListId,
  UserId,
  DateRange,
  ViewType,
  SortField,
  LoadingState,
  ApiError,
  ComponentState,
  Option,
  Result
} from './utils';
import type {
  TaskSort,
  TaskFilters,
  TaskGroupBy,
  ListViewType
} from './utils';

// =============================================================================
// LIST UI STATE TYPES
// =============================================================================

/**
 * Extended list interface with UI-specific properties
 */
export interface AppList extends Omit<List, 'id' | 'userId'> {
  id: ListId;
  userId: UserId;
  
  // UI State Properties
  isSelected: boolean;
  isExpanded: boolean;
  isHovered: boolean;
  isDefault: boolean;
  isArchived: boolean;
  sortIndex: number;
  
  // Application Properties
  customSettings?: ListSettings;
  colorPalette?: string[];
  iconLibrary?: string[];
  permissions?: ListPermissions;
  statistics?: ListStatistics;
  
  // View State
  currentView?: ListViewState;
  lastViewed?: Date;
  pinnedPosition?: number;
}

/**
 * List-specific settings and preferences
 */
export interface ListSettings {
  defaultView: ListViewType;
  sortBy: SortField;
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
  groupBy?: TaskGroupBy;
  filterPresets?: ListFilterPreset[];
  notificationSettings?: ListNotificationSettings;
}

/**
 * List filter preset for quick filtering
 */
export interface ListFilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: TaskFilters;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

/**
 * List notification settings
 */
export interface ListNotificationSettings {
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
 * List permissions and sharing
 */
export interface ListPermissions {
  isShared: boolean;
  ownerId: UserId;
  sharedWith: Array<{
    userId: UserId;
    permission: 'read' | 'write' | 'admin';
    invitedAt: Date;
    acceptedAt?: Date;
    invitedBy: UserId;
  }>;
  publicAccess?: {
    enabled: boolean;
    permission: 'read' | 'write';
    linkId: string;
  };
}

/**
 * List statistics and metrics
 */
export interface ListStatistics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  completionRate: number;
  averageCompletionTime: number; // in hours
  lastActivity: Date;
  mostActiveDay: string;
  peakActivityHour: number;
  favoriteStatus: boolean;
  customFieldsUsage?: Record<string, number>;
}

/**
 * List view state
 */
export interface ListViewState {
  type: ListViewType;
  layout: 'grid' | 'list' | 'kanban' | 'timeline';
  filters: TaskFilters;
  sorting: TaskSort;
  grouping?: TaskGroupBy;
  pagination?: ListPagination;
  zoom: number; // 0.5 to 2.0
  density: 'compact' | 'comfortable' | 'spacious';
  showSidebar: boolean;
  showFilters: boolean;
  showSearch: boolean;
}

/**
 * List state management interface
 */
export interface ListState {
  // Data
  lists: AppList[];
  currentList: AppList | null;
  selectedListIds: ListId[];
  
  // UI State
  loading: LoadingState;
  error: ApiError | null;
  view: ListGlobalView;
  layout: ListLayout;
  
  // Interaction State
  isCreating: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  isDragging: boolean;
  isSharing: boolean;
  
  // Filters and Search
  searchQuery: string;
  filters: ListFilters;
  
  // Navigation
  breadcrumbs: ListBreadcrumb[];
  history: ListHistoryEntry[];
}

/**
 * Global list view configuration
 */
export interface ListGlobalView {
  selectedView: ListViewType;
  showAllLists: boolean;
  showFavorites: boolean;
  showShared: boolean;
  showArchived: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
}

/**
 * List layout configuration
 */
export interface ListLayout {
  viewType: ListViewType;
  density: 'compact' | 'comfortable' | 'spacious';
  showTaskCounts: boolean;
  showProgressBars: boolean;
  showAvatars: boolean;
  showColors: boolean;
  showEmojis: boolean;
  compactCards: boolean;
}

/**
 * List filters interface
 */
export interface ListFilters extends Record<string, any> {
  status?: TaskStatus[];
  priority?: Priority[];
  assigneeIds?: UserId[];
  hasDeadline?: boolean;
  isOverdue?: boolean;
  tags?: string[];
  customFieldFilters?: Record<string, any>;
}

/**
 * List pagination
 */
export interface ListPagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Breadcrumb navigation for lists
 */
export interface ListBreadcrumb {
  id: ListId;
  name: string;
  path: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

/**
 * List history entry
 */
export interface ListHistoryEntry {
  listId: ListId;
  timestamp: Date;
  action: 'viewed' | 'created' | 'updated' | 'deleted' | 'shared' | 'imported';
  details?: Record<string, any>;
}

// =============================================================================
// LIST COMPONENT PROPS
// =============================================================================

/**
 * List card component props
 */
export interface ListCardProps {
  list: AppList;
  compact?: boolean;
  showStats?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  onSelect?: (listId: ListId, selected: boolean) => void;
  onEdit?: (list: AppList) => void;
  onDelete?: (listId: ListId) => void;
  onShare?: (listId: ListId) => void;
  onDuplicate?: (listId: ListId) => void;
  onFavorite?: (listId: ListId) => void;
  onArchive?: (listId: ListId) => void;
  onRestore?: (listId: ListId) => void;
  onMove?: (listId: ListId, position: number) => void;
  onClick?: (list: AppList) => void;
  onDragStart?: (list: AppList) => void;
  onDragEnd?: (list: AppList) => void;
}

/**
 * List item component props (for list view)
 */
export interface ListItemProps extends Omit<ListCardProps, 'compact' | 'showStats'> {
  index: number;
  isDragging?: boolean;
  showMenu?: boolean;
  showTaskCount?: boolean;
  showProgress?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onPin?: (listId: ListId) => void;
  onUnpin?: (listId: ListId) => void;
}

/**
 * List grid component props
 */
export interface ListGridProps {
  lists: AppList[];
  layout: ListLayout;
  columns?: number;
  gap?: number;
  onListSelect?: (listId: ListId) => void;
  onListEdit?: (list: AppList) => void;
  onListDelete?: (listId: ListId) => void;
  onListReorder?: (listIds: ListId[]) => void;
  selection?: ListId[];
  draggable?: boolean;
}

/**
 * List sidebar component props
 */
export interface ListSidebarProps {
  lists: AppList[];
  currentList?: AppList | null;
  selectedLists?: ListId[];
  view: ListGlobalView;
  onListSelect?: (listId: ListId) => void;
  onListCreate?: () => void;
  onListEdit?: (list: AppList) => void;
  onListDelete?: (listId: ListId) => void;
  onViewChange?: (view: ListGlobalView) => void;
  onToggleSidebar?: () => void;
  onListReorder?: (listIds: ListId[]) => void;
  collapsible?: boolean;
}

/**
 * List details component props
 */
export interface ListDetailsProps {
  list: AppList;
  isEditing: boolean;
  onSave?: (listData: UpdateListData) => void;
  onCancel?: () => void;
  onDelete?: (listId: ListId) => void;
  onDuplicate?: (listId: ListId) => void;
  onShare?: (listId: ListId) => void;
  onArchive?: (listId: ListId) => void;
  onExport?: (listId: ListId, format: 'json' | 'csv') => void;
}

/**
 * List settings component props
 */
export interface ListSettingsProps {
  list: AppList;
  settings: ListSettings;
  onSettingsChange?: (settings: ListSettings) => void;
  onReset?: () => void;
  onImportPresets?: (presets: ListFilterPreset[]) => void;
  onExportPresets?: () => void;
  readOnly?: boolean;
}

/**
 * List sharing component props
 */
export interface ListSharingProps {
  list: AppList;
  permissions: ListPermissions;
  onPermissionChange?: (userId: UserId, permission: 'read' | 'write' | 'admin') => void;
  onInviteUser?: (email: string, permission: 'read' | 'write' | 'admin') => void;
  onRemoveUser?: (userId: UserId) => void;
  onGenerateLink?: () => void;
  onRevokeLink?: () => void;
  onRevokeInvitation?: (invitationId: string) => void;
}

/**
 * List statistics component props
 */
export interface ListStatsProps {
  list: AppList;
  statistics: ListStatistics;
  timeRange?: DateRange;
  onTimeRangeChange?: (range: DateRange) => void;
  onRefresh?: () => void;
  showCharts?: boolean;
  showTrends?: boolean;
}

// =============================================================================
// LIST BUSINESS LOGIC TYPES
// =============================================================================

/**
 * List creation data structure
 */
export interface CreateListData {
  name: string;
  color: string;
  emoji: string;
  isDefault?: boolean;
  settings?: Partial<ListSettings>;
  description?: string;
}

/**
 * List update data structure
 */
export type UpdateListData = Partial<CreateListData> & {
  id: ListId;
  statistics?: ListStatistics;
  lastActivity?: Date;
};

/**
 * List operations for batch processing
 */
export type ListOperation = 
  | 'create'
  | 'update' 
  | 'delete'
  | 'duplicate'
  | 'share'
  | 'archive'
  | 'restore'
  | 'reorder'
  | 'favorite'
  | 'export';

/**
 * List batch operation result
 */
export interface ListBatchResult {
  successful: ListId[];
  failed: Array<{
    id: ListId;
    error: ApiError;
    operation: ListOperation;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * List import/export data
 */
export interface ListImportData {
  name: string;
  color: string;
  emoji: string;
  tasks: Array<Omit<Task, 'id' | 'userId' | 'listId' | 'createdAt' | 'updatedAt'>>;
  settings?: Partial<ListSettings>;
  labels?: string[];
}

/**
 * List export configuration
 */
export interface ListExportConfig {
  format: 'json' | 'csv' | 'pdf';
  includeTasks: boolean;
  includeSettings: boolean;
  includeStatistics: boolean;
  dateRange?: DateRange;
  taskFilter?: Partial<TaskFilters>;
}

// =============================================================================
// LIST VALIDATION TYPES
// =============================================================================

/**
 * List validation rules
 */
export interface ListValidationRules {
  name: {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    unique?: boolean;
  };
  color: {
    required: boolean;
    pattern?: RegExp;
  };
  emoji: {
    required: boolean;
    maxLength?: number;
  };
}

/**
 * List validation result
 */
export interface ListValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

/**
 * List form validation state
 */
export interface ListFormValidation {
  isValid: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  validating: boolean;
}

// =============================================================================
// LIST CONTEXT AND HOOKS
// =============================================================================

/**
 * List context interface
 */
export interface ListContextValue {
  // State
  state: ListState;
  
  // Actions
  loadLists: (params?: ListQueryParams) => Promise<void>;
  createList: (data: CreateListData) => Promise<Result<AppList, ApiError>>;
  updateList: (data: UpdateListData) => Promise<Result<AppList, ApiError>>;
  deleteList: (listId: ListId) => Promise<Result<void, ApiError>>;
  duplicateList: (listId: ListId) => Promise<Result<AppList, ApiError>>;
  
  // Selection
  selectList: (listId: ListId) => void;
  selectMultipleLists: (listIds: ListId[]) => void;
  deselectList: (listId: ListId) => void;
  clearSelection: () => void;
  toggleListSelection: (listId: ListId) => void;
  selectAllVisible: () => void;
  
  // UI Actions
  setCurrentList: (list: AppList | null) => void;
  setGlobalView: (view: ListGlobalView) => void;
  setLayout: (layout: ListLayout) => void;
  setFilters: (filters: Partial<ListFilters>) => void;
  clearFilters: () => void;
  
  // Utility
  getListById: (listId: ListId) => Option<AppList>;
  getListsByColor: (color: string) => AppList[];
  getFavoriteLists: () => AppList[];
  getSharedLists: () => AppList[];
  getArchivedLists: () => AppList[];
  searchLists: (query: string) => AppList[];
}

/**
 * List hooks return types
 */
export interface UseListsReturn {
  lists: AppList[];
  loading: boolean;
  error: ApiError | null;
  selectedLists: AppList[];
  listCount: number;
  createList: (data: CreateListData) => Promise<Result<AppList, ApiError>>;
  updateList: (data: UpdateListData) => Promise<Result<AppList, ApiError>>;
  deleteList: (listId: ListId) => Promise<Result<void, ApiError>>;
  duplicateList: (listId: ListId) => Promise<Result<AppList, ApiError>>;
  refetch: () => Promise<void>;
}

export interface UseCurrentListReturn {
  currentList: AppList | null;
  setCurrentList: (list: AppList | null) => void;
  updateCurrentList: (data: Partial<UpdateListData>) => Promise<Result<AppList, ApiError>>;
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
}

/**
 * Query parameters for list operations
 */
export interface ListQueryParams {
  includeTaskCount?: boolean;
  isDefault?: boolean;
  color?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: SortField;
  sortDirection?: 'asc' | 'desc';
  includeStatistics?: boolean;
  includeSettings?: boolean;
  permission?: 'read' | 'write' | 'admin';
}

// =============================================================================
// LIST COLLECTIONS AND WIDGETS
// =============================================================================

/**
 * List collection for organizing related lists
 */
export interface ListCollection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  listIds: ListId[];
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List widget for dashboard
 */
export interface ListWidget {
  id: string;
  type: 'recent' | 'favorites' | 'statistics' | 'activity' | 'custom';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, any>;
  listIds?: ListId[];
  isVisible: boolean;
  refreshInterval?: number; // in minutes
}

/**
 * List template for quick creation
 */
export interface ListTemplate {
  id: string;
  name: string;
  description?: string;
  color: string;
  emoji: string;
  settings: ListSettings;
  defaultTasks: Array<Omit<Task, 'id' | 'userId' | 'listId' | 'createdAt' | 'updatedAt'>>;
  labels?: string[];
  isPublic: boolean;
  createdAt: Date;
  usageCount: number;
  rating: number;
}

// =============================================================================
// LIST ANALYTICS AND INSIGHTS
// =============================================================================

/**
 * List productivity analytics
 */
export interface ListAnalytics {
  listId: ListId;
  timeRange: DateRange;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  productivityScore: number;
  trends: {
    daily: Array<{
      date: string;
      created: number;
      completed: number;
      completionRate: number;
    }>;
    weekly: Array<{
      week: string;
      created: number;
      completed: number;
      completionRate: number;
    }>;
    monthly: Array<{
      month: string;
      created: number;
      completed: number;
      completionRate: number;
    }>;
  };
  insights: string[];
  recommendations: string[];
}

/**
 * List comparison data
 */
export interface ListComparison {
  lists: Array<{
    listId: ListId;
    name: string;
    color: string;
    statistics: ListStatistics;
    analytics: ListAnalytics;
  }>;
  metrics: Array<{
    metric: string;
    values: Array<{
      listId: ListId;
      value: number;
    }>;
  }>;
  insights: string[];
}