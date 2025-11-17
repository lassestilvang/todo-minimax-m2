/**
 * NotificationStore - Comprehensive notification management
 * Handles in-app notifications, toast messages, and notification preferences
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { 
  NotificationStore as INotificationStore,
  NotificationState,
  NotificationStoreActions,
  NotificationStoreSelectors,
  ShowNotificationPayload,
  AppNotification
} from '../types/store';
import type { ApiError } from '../../types/utils';
import { withErrorHandling } from '../middleware/error-handling';
import { createPersistConfig } from '../middleware/persistence';

/**
 * Notification configuration defaults
 */
const DEFAULT_CONFIG = {
  position: 'top-right' as const,
  maxNotifications: 50,
  showProgress: true,
  pauseOnHover: true,
  autoClose: true,
  defaultDuration: 5000
};

/**
 * Toast notification interface for UI framework integration
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  isDismissible?: boolean;
  actionLabel?: string;
  actionHandler?: () => void;
  data?: Record<string, any>;
}

/**
 * Create NotificationStore with comprehensive notification management
 */
export const createNotificationStore = (config?: {
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
  const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    maxNotifications: DEFAULT_CONFIG.maxNotifications,
    position: DEFAULT_CONFIG.position,
    showProgress: DEFAULT_CONFIG.showProgress,
    pauseOnHover: DEFAULT_CONFIG.pauseOnHover,
    autoClose: DEFAULT_CONFIG.autoClose,
    defaultDuration: DEFAULT_CONFIG.defaultDuration
  };

  // Build store configuration
  let storeConfig = (set: any, get: any, api: any): NotificationState & NotificationStoreActions => {
    const state = initialState;

    return {
      ...state,

      // =================== NOTIFICATION MANAGEMENT ===================
      showNotification: (payload: ShowNotificationPayload): string => {
        const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();

        const notification: AppNotification = {
          id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data,
          isRead: false,
          isVisible: true,
          isDismissible: payload.isDismissible !== false,
          isPersistent: payload.isPersistent || false,
          actionLabel: payload.actionLabel,
          actionHandler: payload.actionHandler,
          createdAt: now,
          expiresAt: payload.duration ? 
            new Date(now.getTime() + payload.duration) : 
            (payload.isPersistent ? undefined : new Date(now.getTime() + state.defaultDuration))
        };

        set((state: NotificationState) => {
          // Add notification to the beginning
          state.notifications.unshift(notification);
          
          // Increment unread count
          state.unreadCount += 1;

          // Limit maximum notifications
          if (state.notifications.length > state.maxNotifications) {
            const removed = state.notifications.splice(state.maxNotifications);
            // Adjust unread count for removed notifications
            state.unreadCount -= removed.filter(n => !n.isRead).length;
          }

          // Auto-remove non-persistent notifications
          if (!notification.isPersistent && notification.expiresAt) {
            const timeUntilExpiration = notification.expiresAt.getTime() - Date.now();
            setTimeout(() => {
              get().hideNotification(id);
            }, Math.max(0, timeUntilExpiration));
          }
        }, false, 'showNotification');

        return id;
      },

      hideNotification: (id: string) => {
        set((state: NotificationState) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.isVisible = false;
            notification.dismissedAt = new Date();
            
            // Mark as read when dismissed
            if (!notification.isRead) {
              notification.isRead = true;
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          }
        }, false, 'hideNotification');
      },

      markAsRead: (id: string) => {
        set((state: NotificationState) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && !notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date();
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }, false, 'markAsRead');
      },

      markAllAsRead: () => {
        set((state: NotificationState) => {
          state.notifications.forEach(notification => {
            if (!notification.isRead) {
              notification.isRead = true;
              notification.readAt = new Date();
            }
          });
          state.unreadCount = 0;
        }, false, 'markAllAsRead');
      },

      clearNotification: (id: string) => {
        set((state: NotificationState) => {
          const notificationIndex = state.notifications.findIndex(n => n.id === id);
          if (notificationIndex !== -1) {
            const notification = state.notifications[notificationIndex];
            if (!notification.isRead) {
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
            state.notifications.splice(notificationIndex, 1);
          }
        }, false, 'clearNotification');
      },

      clearAll: () => {
        set((state: NotificationState) => {
          state.notifications = [];
          state.unreadCount = 0;
        }, false, 'clearAll');
      },

      clearByType: (type: AppNotification['type']) => {
        set((state: NotificationState) => {
          const filteredNotifications = state.notifications.filter(n => n.type !== type);
          const removedCount = state.notifications.length - filteredNotifications.length;
          const removedUnreadCount = state.notifications
            .filter(n => n.type === type && !n.isRead)
            .length;
            
          state.notifications = filteredNotifications;
          state.unreadCount = Math.max(0, state.unreadCount - removedUnreadCount);
        }, false, 'clearByType');
      },

      clearExpired: () => {
        const now = new Date();
        set((state: NotificationState) => {
          const activeNotifications = state.notifications.filter(n => {
            if (n.isPersistent) return true;
            if (n.expiresAt && n.expiresAt <= now) {
              // Adjust unread count for expired notifications
              if (!n.isRead) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
              return false;
            }
            return true;
          });
          
          state.notifications = activeNotifications;
        }, false, 'clearExpired');
      },

      // =================== CONVENIENCE METHODS ===================
      success: (title: string, message: string, options?: Partial<ShowNotificationPayload>) => {
        return get().showNotification({
          type: 'success',
          title,
          message,
          ...options
        });
      },

      error: (title: string, message: string, options?: Partial<ShowNotificationPayload>) => {
        return get().showNotification({
          type: 'error',
          title,
          message,
          ...options
        });
      },

      warning: (title: string, message: string, options?: Partial<ShowNotificationPayload>) => {
        return get().showNotification({
          type: 'warning',
          title,
          message,
          ...options
        });
      },

      info: (title: string, message: string, options?: Partial<ShowNotificationPayload>) => {
        return get().showNotification({
          type: 'info',
          title,
          message,
          ...options
        });
      },

      reminder: (title: string, message: string, options?: Partial<ShowNotificationPayload>) => {
        return get().showNotification({
          type: 'reminder',
          title,
          message,
          ...options
        });
      },

      // =================== CONFIGURATION ===================
      setPosition: (position: NotificationState['position']) => {
        set((state: NotificationState) => {
          state.position = position;
        }, false, 'setPosition');
      },

      setMaxNotifications: (max: number) => {
        set((state: NotificationState) => {
          state.maxNotifications = Math.max(1, max);
          
          // Trim notifications if needed
          if (state.notifications.length > state.maxNotifications) {
            const removed = state.notifications.splice(state.maxNotifications);
            const removedUnreadCount = removed.filter(n => !n.isRead).length;
            state.unreadCount = Math.max(0, state.unreadCount - removedUnreadCount);
          }
        }, false, 'setMaxNotifications');
      },

      setAutoClose: (enabled: boolean, duration?: number) => {
        set((state: NotificationState) => {
          state.autoClose = enabled;
          if (duration !== undefined) {
            state.defaultDuration = Math.max(1000, duration);
          }
        }, false, 'setAutoClose');
      },

      setShowProgress: (show: boolean) => {
        set((state: NotificationState) => {
          state.showProgress = show;
        }, false, 'setShowProgress');
      },

      setPauseOnHover: (pause: boolean) => {
        set((state: NotificationState) => {
          state.pauseOnHover = pause;
        }, false, 'setPauseOnHover');
      },

      // =================== BULK OPERATIONS ===================
      clearOlderThan: (date: Date) => {
        set((state: NotificationState) => {
          const recentNotifications = state.notifications.filter(n => n.createdAt > date);
          const removedCount = state.notifications.length - recentNotifications.length;
          const removedUnreadCount = state.notifications
            .filter(n => n.createdAt <= date && !n.isRead)
            .length;
            
          state.notifications = recentNotifications;
          state.unreadCount = Math.max(0, state.unreadCount - removedUnreadCount);
        }, false, 'clearOlderThan');
      },

      keepUnreadOnly: () => {
        set((state: NotificationState) => {
          state.notifications = state.notifications.filter(n => !n.isRead);
          // unreadCount remains the same since we're keeping all unread
        }, false, 'keepUnreadOnly');
      },

      archiveAll: () => {
        set((state: NotificationState) => {
          // Mark all as read but keep them
          state.notifications.forEach(notification => {
            if (!notification.isRead) {
              notification.isRead = true;
              notification.readAt = new Date();
            }
          });
          state.unreadCount = 0;
        }, false, 'archiveAll');
      },

      // =================== UTILITY METHODS ===================
      getNotificationById: (id: string): AppNotification | undefined => {
        return get().notifications.find(n => n.id === id);
      },

      getUnreadNotifications: (): AppNotification[] => {
        return get().notifications.filter(n => !n.isRead);
      },

      getVisibleNotifications: (): AppNotification[] => {
        return get().notifications.filter(n => n.isVisible);
      },

      hasNotifications: (): boolean => {
        return get().notifications.length > 0;
      },

      hasUnread: (): boolean => {
        return get().unreadCount > 0;
      },

      getNotificationStats: () => {
        const state = get();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return {
          total: state.notifications.length,
          unread: state.unreadCount,
          today: state.notifications.filter(n => n.createdAt >= today).length,
          thisWeek: state.notifications.filter(n => n.createdAt >= thisWeek).length,
          byType: {
            success: state.notifications.filter(n => n.type === 'success').length,
            error: state.notifications.filter(n => n.type === 'error').length,
            warning: state.notifications.filter(n => n.type === 'warning').length,
            info: state.notifications.filter(n => n.type === 'info').length,
            reminder: state.notifications.filter(n => n.type === 'reminder').length
          }
        };
      }
    };
  };

  // Apply middleware
  if (errorHandling) {
    storeConfig = withErrorHandling('NotificationStore', storeConfig, {
      retryAttempts: 1,
      logErrors: false // Don't log notification errors to avoid spam
    });
  }

  let middleware = [subscribeWithSelector(), immer];

  if (persistence) {
    middleware.push(persist(
      storeConfig,
      createPersistConfig({
        name: 'notification-store',
        partialize: (state) => ({
          // Only persist configuration, not notification content
          position: state.position,
          maxNotifications: state.maxNotifications,
          showProgress: state.showProgress,
          pauseOnHover: state.pauseOnHover,
          autoClose: state.autoClose,
          defaultDuration: state.defaultDuration
        }),
        version: 1
      })
    ));
  } else {
    storeConfig = storeConfig as StateCreator<NotificationState & NotificationStoreActions>;
  }

  return create<NotificationState & NotificationStoreActions & NotificationStoreSelectors>()(...middleware)(storeConfig);
};

// Export the store instance
export const useNotificationStore = createNotificationStore();