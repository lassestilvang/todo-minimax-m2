/**
 * AppStore - Global application state management
 * Handles user authentication, theme, preferences, and global UI state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { 
  AppStore as IAppStore,
  AppState,
  AppActions 
} from '../types/store';
import type { 
  User,
  Theme,
  ViewType,
  ApiError,
  AppConfig
} from '../../types/utils';
import type { NotificationState, ModalState } from '../types/store';

/**
 * Default application preferences
 */
const DEFAULT_PREFERENCES = {
  theme: 'system' as const,
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '24h' as const,
  weekStart: 'monday' as const,
  
  // UI preferences
  sidebarCollapsed: false,
  defaultView: 'dashboard' as ViewType,
  compactMode: false,
  showCompletedTasks: true,
  showSubtasks: true,
  showDescriptions: true,
  showDueDates: true,
  showPriorities: true,
  showLabels: true,
  
  // Notification preferences
  notifications: {
    email: true,
    push: true,
    desktop: true,
    sound: true,
    taskReminders: true,
    deadlineAlerts: true,
    overdueAlerts: true,
    weeklyDigest: false,
    achievementNotifications: true
  },
  
  // Privacy preferences
  privacy: {
    profileVisibility: 'private' as const,
    showEmail: false,
    showActivity: true,
    shareAnalytics: false,
    allowDataCollection: true
  },
  
  // Performance preferences
  performance: {
    enableAnimations: true,
    enableTransitions: true,
    reducedMotion: false,
    highContrast: false,
    cacheSize: 'medium' as const,
    autoRefreshInterval: 30000,
    lazyLoading: true
  }
};

/**
 * Create AppStore with global state management
 */
export const createAppStore = (config?: {
  errorHandling?: boolean;
  persistence?: boolean;
  devtools?: boolean;
}) => {
  const {
    errorHandling = true,
    persistence = true,
    devtools = process.env.NODE_ENV === 'development'
  } = config || {};

  // Initial state
  const initialState: AppState = {
    // Core app data
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    
    // UI state
    theme: 'light',
    sidebarCollapsed: false,
    currentView: 'dashboard',
    notifications: {
      notifications: [],
      unreadCount: 0,
      maxNotifications: 50,
      position: 'top-right',
      showProgress: true,
      pauseOnHover: true,
      autoClose: true,
      defaultDuration: 5000
    },
    modals: {
      modals: [],
      activeModalId: null,
      modalStack: [],
      isAnyModalOpen: false,
      closeOnOverlayClick: true,
      closeOnEsc: true,
      trapFocus: true,
      restoreFocus: true
    },
    
    // Preferences and settings
    preferences: DEFAULT_PREFERENCES,
    config: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
      wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      features: {
        realTimeSync: true,
        offlineMode: true,
        notifications: true,
        darkMode: true,
        analytics: false
      }
    },
    
    // Loading states
    loading: {
      user: false,
      tasks: false,
      lists: false,
      labels: false,
      general: false
    }
  };

  // Build store configuration
  let storeConfig = (set: any, get: any, api: any): AppState & AppActions => {
    const state = initialState;

    return {
      ...state,

      // =================== AUTHENTICATION ===================
      login: async (credentials: { email: string; password: string }) => {
        set((state: AppState) => {
          state.loading.general = true;
          state.error = null;
        }, false, 'login');

        try {
          // Simulate API call - replace with actual authentication
          const user: User = {
            id: 'user_123',
            name: 'John Doe',
            email: credentials.email,
            avatar: null,
            preferences: DEFAULT_PREFERENCES,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state: AppState) => {
            state.user = user;
            state.isAuthenticated = true;
            state.loading.general = false;
            state.error = null;
          }, false, 'login_success');

        } catch (error) {
          set((state: AppState) => {
            state.error = error as ApiError;
            state.loading.general = false;
            state.isAuthenticated = false;
          }, false, 'login_error');
          throw error;
        }
      },

      logout: async () => {
        set((state: AppState) => {
          state.loading.general = true;
        }, false, 'logout');

        try {
          // Simulate API call - replace with actual logout
          await Promise.resolve();

          set((state: AppState) => {
            state.user = null;
            state.isAuthenticated = false;
            state.loading.general = false;
            state.error = null;
            
            // Clear sensitive data
            state.notifications.notifications = [];
            state.modals.modals = [];
            state.modals.activeModalId = null;
            state.modals.modalStack = [];
          }, false, 'logout_success');

        } catch (error) {
          set((state: AppState) => {
            state.error = error as ApiError;
            state.loading.general = false;
          }, false, 'logout_error');
          throw error;
        }
      },

      refreshToken: async () => {
        set((state: AppState) => {
          state.loading.general = true;
        }, false, 'refreshToken');

        try {
          const user = get().user;

          set((state: AppState) => {
            if (user) {
              state.user = user;
            }
            state.loading.general = false;
          }, false, 'refreshToken_success');

        } catch (error) {
          set((state: AppState) => {
            state.error = error as ApiError;
            state.loading.general = false;
            // Force logout on token refresh failure
            state.isAuthenticated = false;
            state.user = null;
          }, false, 'refreshToken_error');
          throw error;
        }
      },

      register: async (userData: { name: string; email: string; password: string }) => {
        set((state: AppState) => {
          state.loading.general = true;
          state.error = null;
        }, false, 'register');

        try {
          const user: User = {
            id: `user_${Date.now()}`,
            name: userData.name,
            email: userData.email,
            avatar: null,
            preferences: DEFAULT_PREFERENCES,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state: AppState) => {
            state.user = user;
            state.isAuthenticated = true;
            state.loading.general = false;
            state.error = null;
          }, false, 'register_success');

        } catch (error) {
          set((state: AppState) => {
            state.error = error as ApiError;
            state.loading.general = false;
          }, false, 'register_error');
          throw error;
        }
      },

      // =================== USER MANAGEMENT ===================
      loadUser: async () => {
        set((state: AppState) => {
          state.loading.user = true;
          state.error = null;
        }, false, 'loadUser');

        try {
          const user: User = {
            id: 'user_123',
            name: 'John Doe',
            email: 'john@example.com',
            avatar: null,
            preferences: DEFAULT_PREFERENCES,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          set((state: AppState) => {
            state.user = user;
            state.isAuthenticated = true;
            state.loading.user = false;
            state.error = null;
          }, false, 'loadUser_success');

        } catch (error) {
          set((state: AppState) => {
            state.error = error as ApiError;
            state.loading.user = false;
            state.isAuthenticated = false;
          }, false, 'loadUser_error');
          throw error;
        }
      },

      updateUser: async (userData: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) {
          throw new Error('No user logged in');
        }

        set((state: AppState) => {
          state.loading.user = true;
          state.error = null;
        }, false, 'updateUser');

        try {
          const updatedUser: User = {
            ...currentUser,
            ...userData,
            updatedAt: new Date()
          };

          set((state: AppState) => {
            state.user = updatedUser;
            state.loading.user = false;
            state.error = null;
          }, false, 'updateUser_success');

        } catch (error) {
          set((state: AppState) => {
            state.error = error as ApiError;
            state.loading.user = false;
          }, false, 'updateUser_error');
          throw error;
        }
      },

      updatePreferences: (preferences: Partial<typeof initialState.preferences>) => {
        set((state: AppState) => {
          state.preferences = {
            ...state.preferences,
            ...preferences,
            // Deep merge nested objects
            notifications: preferences.notifications ? {
              ...state.preferences.notifications,
              ...preferences.notifications
            } : state.preferences.notifications,
            privacy: preferences.privacy ? {
              ...state.preferences.privacy,
              ...preferences.privacy
            } : state.preferences.privacy,
            performance: preferences.performance ? {
              ...state.preferences.performance,
              ...preferences.performance
            } : state.preferences.performance
          });
          
          // Apply theme change immediately
          if (preferences.theme) {
            state.theme = preferences.theme === 'system' 
              ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
              : preferences.theme;
          }
        }, false, 'updatePreferences');
      },

      // =================== UI MANAGEMENT ===================
      setTheme: (theme: Theme) => {
        set((state: AppState) => {
          state.theme = theme;
          state.preferences.theme = theme;
        }, false, 'setTheme');

        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = document.documentElement;
          if (theme === 'dark') {
            root.classList.add('dark');
          } else if (theme === 'light') {
            root.classList.remove('dark');
          } else {
            // System theme
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', isDark);
          }
        }
      },

      toggleSidebar: () => {
        set((state: AppState) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
          state.preferences.sidebarCollapsed = state.sidebarCollapsed;
        }, false, 'toggleSidebar');
      },

      setCurrentView: (view: ViewType) => {
        set((state: AppState) => {
          state.currentView = view;
          state.preferences.defaultView = view;
        }, false, 'setCurrentView');
      },

      // =================== NOTIFICATION MANAGEMENT ===================
      showNotification: (notification) => {
        const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        set((state: AppState) => {
          const newNotification = {
            id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            isRead: false,
            isVisible: true,
            isDismissible: notification.isDismissible !== false,
            isPersistent: notification.isPersistent || false,
            actionLabel: notification.actionLabel,
            actionHandler: notification.actionHandler,
            createdAt: new Date(),
            expiresAt: notification.duration ? 
              new Date(Date.now() + notification.duration) : 
              undefined
          };

          // Add to notifications
          state.notifications.notifications.unshift(newNotification);
          state.notifications.unreadCount += 1;

          // Limit number of notifications
          if (state.notifications.notifications.length > state.notifications.maxNotifications) {
            const removed = state.notifications.notifications.splice(state.notifications.maxNotifications);
            // Adjust unread count for removed notifications
            state.notifications.unreadCount -= removed.filter(n => !n.isRead).length;
          }

          // Auto-remove if not persistent and has duration
          if (!newNotification.isPersistent && notification.duration) {
            setTimeout(() => {
              get().hideNotification(id);
            }, notification.duration);
          }
        }, false, 'showNotification');

        return id;
      },

      hideNotification: (id: string) => {
        set((state: AppState) => {
          const notification = state.notifications.notifications.find(n => n.id === id);
          if (notification) {
            notification.isVisible = false;
            notification.dismissedAt = new Date();
            if (!notification.isRead) {
              state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
            }
          }
        }, false, 'hideNotification');
      },

      // =================== MODAL MANAGEMENT ===================
      showModal: (modal) => {
        const id = modal.id || `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        set((state: AppState) => {
          const newModal = {
            id,
            type: modal.type,
            title: modal.title,
            description: modal.description,
            content: modal.content,
            size: modal.size || 'md',
            position: modal.position || 'center',
            isOpen: true,
            isClosable: modal.isClosable !== false,
            isDraggable: modal.isDraggable || false,
            isResizable: modal.isResizable || false,
            props: modal.props || {},
            onOpen: modal.onOpen,
            onClose: modal.onClose,
            onConfirm: modal.onConfirm,
            onCancel: modal.onCancel,
            createdAt: new Date()
          };

          state.modals.modals.push(newModal);
          state.modals.activeModalId = id;
          state.modals.modalStack.push(id);
          state.modals.isAnyModalOpen = true;

          // Call onOpen callback
          if (modal.onOpen) {
            setTimeout(() => modal.onOpen(), 0);
          }
        }, false, 'showModal');

        return id;
      },

      hideModal: (id: string) => {
        set((state: AppState) => {
          const modal = state.modals.modals.find(m => m.id === id);
          if (modal) {
            modal.isOpen = false;
            
            // Remove from stack
            state.modals.modalStack = state.modals.modalStack.filter(modalId => modalId !== id);
            
            // Update active modal
            if (state.modals.activeModalId === id) {
              state.modals.activeModalId = state.modals.modalStack[state.modals.modalStack.length - 1] || null;
            }
            
            state.modals.isAnyModalOpen = state.modals.modalStack.length > 0;

            // Call onClose callback
            if (modal.onClose) {
              setTimeout(() => modal.onClose(), 0);
            }
          }
        }, false, 'hideModal');
      },

      // =================== CONFIGURATION MANAGEMENT ===================
      updateConfig: (config: Partial<AppConfig>) => {
        set((state: AppState) => {
          state.config = {
            ...state.config,
            ...config
          };
        }, false, 'updateConfig');
      },

      resetConfig: () => {
        set((state: AppState) => {
          state.config = initialState.config;
        }, false, 'resetConfig');
      },

      // =================== GENERAL STATE MANAGEMENT ===================
      setLoading: (key: keyof AppState['loading'], loading: boolean) => {
        set((state: AppState) => {
          (state.loading as any)[key] = loading;
        }, false, 'setLoading');
      },

      setError: (error: ApiError | null) => {
        set((state: AppState) => {
          state.error = error;
        }, false, 'setError');
      },

      clearError: () => {
        set((state: AppState) => {
          state.error = null;
        }, false, 'clearError');
      }
    };
  };

  // Build store with middleware
  let store = create<AppState & AppActions>()(
    subscribeWithSelector(),
    immer,
    ...(persistence ? [persist(storeConfig, {
      name: 'app-store',
      partialize: (state) => ({
        // Only persist user preferences and UI state
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        currentView: state.currentView,
        preferences: state.preferences,
        user: state.user, // Persist user data
        isAuthenticated: state.isAuthenticated
      }),
      version: 1
    })] : [storeConfig])
  );

  return store;
};

// Export the store instance
export const useAppStore = createAppStore();