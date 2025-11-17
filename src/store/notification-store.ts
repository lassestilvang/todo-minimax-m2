/**
 * NotificationStore - Simplified Zustand store for notification management
 */

import { create } from 'zustand';
import type { 
  NotificationStoreState,
  NotificationStoreActions
} from '../types/store';

/**
 * Create a simple notification store
 */
export const createNotificationStore = () => {
  // Initial state
  const initialState: NotificationStoreState = {
    // Notifications
    notifications: [],
    
    // Settings
    settings: {
      enabled: true,
      sound: true,
      position: 'bottom-right',
      maxNotifications: 5
    }
  };

  return create<NotificationStoreState & NotificationStoreActions>((set, get) => ({
    ...initialState,

    // =================== NOTIFICATION MANAGEMENT ===================
    addNotification: (notification) => {
      const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNotification = {
        id,
        type: 'info' as const,
        title: '',
        message: '',
        duration: 5000,
        persistent: false,
        ...notification
      };

      set((state) => {
        const notifications = [...state.notifications, newNotification];
        // Limit max notifications
        const maxNotifications = state.settings.maxNotifications;
        if (notifications.length > maxNotifications) {
          notifications.splice(0, notifications.length - maxNotifications);
        }
        state.notifications = notifications;
      });

      // Auto-dismiss after duration
      if (newNotification.duration > 0 && !newNotification.persistent) {
        setTimeout(() => {
          get().removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },

    removeNotification: (id) => {
      set((state) => {
        state.notifications = state.notifications.filter(n => n.id !== id);
      });
    },

    clearNotifications: () => {
      set((state) => {
        state.notifications = [];
      });
    },

    clearNotificationsByType: (type) => {
      set((state) => {
        state.notifications = state.notifications.filter(n => n.type !== type);
      });
    },

    // =================== NOTIFICATION ACTIONS ===================
    showSuccess: (title, message, options = {}) => {
      return get().addNotification({
        type: 'success',
        title,
        message,
        ...options
      });
    },

    showError: (title, message, options = {}) => {
      return get().addNotification({
        type: 'error',
        title,
        message,
        duration: 0, // Errors don't auto-dismiss by default
        persistent: true,
        ...options
      });
    },

    showWarning: (title, message, options = {}) => {
      return get().addNotification({
        type: 'warning',
        title,
        message,
        ...options
      });
    },

    showInfo: (title, message, options = {}) => {
      return get().addNotification({
        type: 'info',
        title,
        message,
        ...options
      });
    },

    // =================== SETTINGS ===================
    updateSettings: (settings) => {
      set((state) => {
        state.settings = {
          ...state.settings,
          ...settings
        };
      });
    },

    setEnabled: (enabled) => {
      get().updateSettings({ enabled });
    },

    setSound: (sound) => {
      get().updateSettings({ sound });
    },

    setPosition: (position) => {
      get().updateSettings({ position });
    },

    setMaxNotifications: (maxNotifications) => {
      get().updateSettings({ maxNotifications });
    },

    // =================== SELECTORS ===================
    getNotificationById: (id) => {
      return get().notifications.find(n => n.id === id);
    },

    getNotificationsByType: (type) => {
      return get().notifications.filter(n => n.type === type);
    },

    getNotificationCount: () => {
      return get().notifications.length;
    },

    hasNotifications: () => {
      return get().getNotificationCount() > 0;
    },

    hasErrors: () => {
      return get().getNotificationsByType('error').length > 0;
    }
  }));
};

// Export the store instance
export const useNotificationStore = createNotificationStore();