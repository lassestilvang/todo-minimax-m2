/**
 * UI and Component Types for Daily Task Planner Application
 * 
 * This module defines comprehensive TypeScript interfaces for UI components,
 * including component props, state management, themes, and interaction patterns.
 */

import type { 
  User,
  Task,
  List,
  Label,
  Subtask,
  Reminder,
  Attachment,
  Priority,
  TaskStatus
} from '../lib/db/types';
import type {
  TaskId,
  ListId,
  LabelId,
  UserId,
  Theme,
  ViewType,
  ListViewType,
  LoadingState,
  ApiError,
  DateRange,
  Option,
  Result
} from './utils';
import type {
  AppTask,
  TaskCardProps,
  TaskItemProps,
  TaskDetailsProps,
  TaskFormProps,
  TaskChecklistProps,
  TaskAttachmentsProps,
  TaskRemindersProps,
  TaskFilters,
  TaskSort,
  TaskLayout
} from './tasks';
import type {
  AppList,
  ListCardProps,
  ListItemProps,
  ListGridProps,
  ListSidebarProps,
  ListDetailsProps,
  ListSettingsProps,
  ListSharingProps,
  ListStatsProps,
  ListFilters,
  ListLayout
} from './lists';

// =============================================================================
// BASE UI COMPONENT PROPS
// =============================================================================

/**
 * Base component props interface
 */
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  'data-testid'?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
}

/**
 * Interactive component props
 */
export interface InteractiveProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  tabIndex?: number;
  onFocus?: React.FocusEventHandler;
  onBlur?: React.FocusEventHandler;
  onKeyDown?: React.KeyboardEventHandler;
  onKeyUp?: React.KeyboardEventHandler;
  onKeyPress?: React.KeyboardEventHandler;
}

/**
 * Hover and focus state props
 */
export interface HoverFocusProps {
  hoverable?: boolean;
  focusable?: boolean;
  hoverColor?: string;
  activeColor?: string;
  focusRingColor?: string;
  focusRingWidth?: number;
  transition?: string;
}

// =============================================================================
// BUTTON AND INTERACTIVE ELEMENT TYPES
// =============================================================================

/**
 * Button variants
 */
export type ButtonVariant = 
  | 'primary'
  | 'secondary' 
  | 'outline'
  | 'ghost'
  | 'link'
  | 'danger'
  | 'success'
  | 'warning';

/**
 * Button sizes
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';

/**
 * Button props interface
 */
export interface ButtonProps extends InteractiveProps, HoverFocusProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
  iconOnly?: boolean;
  rounded?: boolean;
  outlined?: boolean;
  tonal?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
}

/**
 * Icon button props
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon' | 'size'> {
  icon: React.ReactNode;
  size?: ButtonSize;
  label?: string; // For accessibility
}

/**
 * Toggle button props
 */
export interface ToggleButtonProps extends Omit<ButtonProps, 'onClick'> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onToggle?: (pressed: boolean) => void;
}

/**
 * Dropdown button props
 */
export interface DropdownButtonProps extends ButtonProps {
  isOpen?: boolean;
  onToggle?: () => void;
  align?: 'start' | 'center' | 'end';
  offset?: number;
  showArrow?: boolean;
  arrowIcon?: React.ReactNode;
}

// =============================================================================
// INPUT AND FORM COMPONENT TYPES
// =============================================================================

/**
 * Input sizes
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Input variants
 */
export type InputVariant = 'default' | 'filled' | 'outline' | 'ghost';

/**
 * Input props interface
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  variant?: InputVariant;
  size?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  fullWidth?: boolean;
  invalid?: boolean;
}

/**
 * Textarea props interface
 */
export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: InputSize;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  fullWidth?: boolean;
  invalid?: boolean;
}

/**
 * Select props interface
 */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: InputSize;
  placeholder?: string;
  fullWidth?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  loading?: boolean;
  options: SelectOption[];
  renderOption?: (option: SelectOption) => React.ReactNode;
  renderValue?: (option: SelectOption) => React.ReactNode;
  onClear?: () => void;
}

/**
 * Select option interface
 */
export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
  color?: string;
  group?: string;
}

/**
 * Checkbox props interface
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
  size?: InputSize;
  color?: string;
  error?: string;
  onChange?: (checked: boolean) => void;
}

/**
 * Radio props interface
 */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  value: string;
  group?: string;
  color?: string;
  error?: string;
  onChange?: (value: string) => void;
}

/**
 * Switch props interface
 */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: InputSize;
  color?: string;
  onChange?: (checked: boolean) => void;
}

// =============================================================================
// MODAL AND DIALOG TYPES
// =============================================================================

/**
 * Modal size variants
 */
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

/**
 * Modal position variants
 */
export type ModalPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

/**
 * Modal props interface
 */
export interface ModalProps extends BaseComponentProps {
  isOpen?: boolean;
  onClose?: () => void;
  size?: ModalSize;
  position?: ModalPosition;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  overlay?: boolean;
  overlayBlur?: boolean;
  overlayOpacity?: number;
  lockScroll?: boolean;
  trapFocus?: boolean;
  returnFocus?: boolean;
  footer?: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Dialog props interface
 */
export interface DialogProps extends ModalProps {
  type?: 'alert' | 'confirm' | 'prompt' | 'custom';
  intent?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  disableConfirm?: boolean;
}

/**
 * Drawer props interface
 */
export interface DrawerProps extends Omit<ModalProps, 'position'> {
  position?: 'left' | 'right' | 'top' | 'bottom';
  width?: number | string;
  height?: number | string;
  resizable?: boolean;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
}

/**
 * Popover props interface
 */
export interface PopoverProps extends BaseComponentProps {
  isOpen?: boolean;
  onToggle?: () => void;
  placement?: PopoverPlacement;
  trigger?: 'click' | 'hover' | 'focus';
  offset?: number;
  arrow?: boolean;
  portal?: boolean;
  closeOnOutsideClick?: boolean;
  closeOnEsc?: boolean;
  showDelay?: number;
  hideDelay?: number;
}

/**
 * Popover placement variants
 */
export type PopoverPlacement = 
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

// =============================================================================
// LAYOUT AND NAVIGATION TYPES
// =============================================================================

/**
 * Layout direction
 */
export type LayoutDirection = 'horizontal' | 'vertical';

/**
 * Layout spacing
 */
export type Spacing = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Flex layout props
 */
export interface FlexProps extends BaseComponentProps {
  direction?: LayoutDirection;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: Spacing | number;
  flex?: string | number;
}

/**
 * Grid layout props
 */
export interface GridProps extends BaseComponentProps {
  columns?: number;
  rows?: number;
  gap?: Spacing | number;
  columnGap?: Spacing | number;
  rowGap?: Spacing | number;
  templateColumns?: string;
  templateRows?: string;
  templateAreas?: string;
}

/**
 * Stack layout props
 */
export interface StackProps extends FlexProps {
  spacing?: Spacing | number;
  divider?: React.ReactNode;
  direction?: LayoutDirection;
}

/**
 * Container props
 */
export interface ContainerProps extends BaseComponentProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: Spacing | number;
  margin?: Spacing | number;
}

/**
 * Sidebar props interface
 */
export interface SidebarProps extends BaseComponentProps {
  isOpen?: boolean;
  onToggle?: () => void;
  position?: 'left' | 'right';
  width?: number | string;
  collapsible?: boolean;
  collapsed?: boolean;
  overlay?: boolean;
  closeOnOutsideClick?: boolean;
  children?: React.ReactNode;
}

/**
 * Navigation item props
 */
export interface NavigationItemProps {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  active?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: React.MouseEventHandler;
  children?: NavigationItemProps[];
  collapsed?: boolean;
}

/**
 * Breadcrumb props interface
 */
export interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    icon?: React.ReactNode;
    onClick?: React.MouseEventHandler;
  }>;
  separator?: React.ReactNode;
  maxItems?: number;
  itemComponent?: React.ComponentType<any>;
}

// =============================================================================
// CARD AND CONTENT TYPES
// =============================================================================

/**
 * Card props interface
 */
export interface CardProps extends BaseComponentProps, InteractiveProps {
  padding?: Spacing | number;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  borderColor?: string;
  rounded?: boolean;
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: React.MouseEventHandler;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  title?: string;
  subtitle?: string;
  image?: React.ReactNode;
  avatar?: React.ReactNode;
}

/**
 * Card header props
 */
export interface CardHeaderProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  avatar?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * Card content props
 */
export interface CardContentProps extends BaseComponentProps {
  padding?: Spacing | number;
}

/**
 * Card footer props
 */
export interface CardFooterProps extends BaseComponentProps {
  padding?: Spacing | number;
  align?: 'start' | 'center' | 'end' | 'between';
}

// =============================================================================
// BADGE AND TAG TYPES
// =============================================================================

/**
 * Badge variants
 */
export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Badge size
 */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Badge props interface
 */
export interface BadgeProps extends BaseComponentProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  outlined?: boolean;
  tonal?: boolean;
  dot?: boolean;
  pulse?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

/**
 * Tag props interface
 */
export interface TagProps extends Omit<BadgeProps, 'variant' | 'dot' | 'pulse'> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: React.MouseEventHandler;
  clickable?: boolean;
}

// =============================================================================
// AVATAR AND USER TYPES
// =============================================================================

/**
 * Avatar variants
 */
export type AvatarVariant = 'circular' | 'rounded' | 'square';

/**
 * Avatar size
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Avatar props interface
 */
export interface AvatarProps extends BaseComponentProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  color?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  statusPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  onClick?: React.MouseEventHandler;
  clickable?: boolean;
}

// =============================================================================
// PROGRESS AND LOADING TYPES
// =============================================================================

/**
 * Progress variants
 */
export type ProgressVariant = 'linear' | 'circular';

/**
 * Progress size
 */
export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Progress props interface
 */
export interface ProgressProps extends BaseComponentProps {
  value?: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  color?: string;
  trackColor?: string;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside' | 'overlay';
  animated?: boolean;
  indeterminate?: boolean;
}

/**
 * Loading spinner props
 */
export interface SpinnerProps extends BaseComponentProps {
  size?: Spacing | number;
  color?: string;
  thickness?: number;
  speed?: number;
}

/**
 * Skeleton props interface
 */
export interface SkeletonProps extends BaseComponentProps {
  width?: number | string;
  height?: number | string;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
  lines?: number;
  lineHeight?: number;
  borderRadius?: number | string;
}

// =============================================================================
// TOOLTIP AND POPOVER TYPES
// =============================================================================

/**
 * Tooltip props interface
 */
export interface TooltipProps {
  content: React.ReactNode;
  placement?: PopoverPlacement;
  delay?: number;
  disabled?: boolean;
  arrow?: boolean;
  portal?: boolean;
  children: React.ReactElement;
}

/**
 * Help tooltip props
 */
export interface HelpTooltipProps extends Omit<TooltipProps, 'children'> {
  icon?: React.ReactNode;
  iconSize?: Spacing | number;
  children?: React.ReactNode;
}

// =============================================================================
// TABS AND ACCORDION TYPES
// =============================================================================

/**
 * Tab props interface
 */
export interface TabProps {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  count?: number;
  content?: React.ReactNode;
  panelId?: string;
  onClick?: React.MouseEventHandler;
}

/**
 * Tabs props interface
 */
export interface TabsProps {
  tabs: TabProps[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underlined' | 'filled';
  orientation?: 'horizontal' | 'vertical';
  alignment?: 'start' | 'center' | 'end';
  grow?: boolean;
  fullWidth?: boolean;
  content?: React.ReactNode;
}

/**
 * Accordion item props
 */
export interface AccordionItemProps {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  defaultOpen?: boolean;
}

/**
 * Accordion props interface
 */
export interface AccordionProps {
  items: AccordionItemProps[];
  allowMultiple?: boolean;
  allowToggle?: boolean;
  variant?: 'default' | 'bordered' | 'ghost';
  iconPosition?: 'left' | 'right';
  icon?: React.ReactNode;
  expandedIcon?: React.ReactNode;
}

// =============================================================================
// THEME AND STYLING TYPES
// =============================================================================

/**
 * Theme configuration interface
 */
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  borders: {
    radius: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      full: string;
    };
    width: {
      thin: string;
      normal: string;
      thick: string;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

/**
 * CSS custom properties interface
 */
export interface CSSCustomProperties {
  '--color-primary'?: string;
  '--color-secondary'?: string;
  '--color-accent'?: string;
  '--color-background'?: string;
  '--color-surface'?: string;
  '--color-text'?: string;
  '--color-text-secondary'?: string;
  '--color-border'?: string;
  '--color-success'?: string;
  '--color-warning'?: string;
  '--color-danger'?: string;
  '--color-info'?: string;
  '--font-family'?: string;
  '--font-size-xs'?: string;
  '--font-size-sm'?: string;
  '--font-size-md'?: string;
  '--font-size-lg'?: string;
  '--font-size-xl'?: string;
  '--font-size-2xl'?: string;
  '--font-size-3xl'?: string;
  '--font-size-4xl'?: string;
  '--spacing-xs'?: string;
  '--spacing-sm'?: string;
  '--spacing-md'?: string;
  '--spacing-lg'?: string;
  '--spacing-xl'?: string;
  '--spacing-2xl'?: string;
  '--spacing-3xl'?: string;
  '--border-radius-sm'?: string;
  '--border-radius-md'?: string;
  '--border-radius-lg'?: string;
  '--border-radius-xl'?: string;
  '--shadow-sm'?: string;
  '--shadow-md'?: string;
  '--shadow-lg'?: string;
  '--shadow-xl'?: string;
}

// =============================================================================
// ANIMATION AND TRANSITION TYPES
// =============================================================================

/**
 * Animation timing
 */
export type AnimationTiming = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

/**
 * Animation direction
 */
export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';

/**
 * Animation fill mode
 */
export type AnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';

/**
 * Animation configuration
 */
export interface AnimationConfig {
  duration: number;
  timingFunction: AnimationTiming;
  delay?: number;
  iterations?: number | 'infinite';
  direction?: AnimationDirection;
  fillMode?: AnimationFillMode;
  playState?: 'running' | 'paused';
}

/**
 * Transition props
 */
export interface TransitionProps {
  property?: string | string[];
  duration?: number | string;
  timingFunction?: AnimationTiming;
  delay?: number | string;
}

// =============================================================================
// COMPONENT REGISTRY TYPES
// =============================================================================

/**
 * Component registry entry
 */
export interface ComponentRegistryEntry {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  description?: string;
  examples?: Array<{
    name: string;
    props: Record<string, any>;
  }>;
}

/**
 * Component library interface
 */
export interface ComponentLibrary {
  register: (entry: ComponentRegistryEntry) => void;
  unregister: (name: string) => void;
  getComponent: (name: string) => ComponentRegistryEntry | undefined;
  getAllComponents: () => ComponentRegistryEntry[];
  clear: () => void;
}

// =============================================================================
// ACCESSIBILITY TYPES
// =============================================================================

/**
 * Accessibility state interface
 */
export interface AccessibilityState {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusManagement: boolean;
}

/**
 * ARIA role definitions
 */
export type ARIARole = 
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'meter'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem';

/**
 * Focus management interface
 */
export interface FocusManager {
  focusFirst: (container?: HTMLElement) => HTMLElement | null;
  focusLast: (container?: HTMLElement) => HTMLElement | null;
  focusNext: (current?: HTMLElement) => HTMLElement | null;
  focusPrevious: (current?: HTMLElement) => HTMLElement | null;
  focusById: (id: string) => HTMLElement | null;
  trapFocus: (container: HTMLElement) => () => void;
  restoreFocus: (element?: HTMLElement) => void;
}