/**
 * AppStore - Simplified Zustand store for app-wide state management
 */

import { create } from 'zustand';
import type { 
  AppStoreState,
  AppStoreActions,
  AppStoreSelectors 
} from '../types/store';
import type { Theme } from '../components/theme-provider';

/**
 * Create a simple app store
 */
export const createAppStore = (config?: {
  userId?: string;
}) => {
  const {
    userId = 'default'
  } = config || {};

  // Initial state
  const initialState: AppStoreState = {
    // User and authentication
    user: null,
    isAuthenticated: false,
    
    // App state
    theme: 'system',
    sidebarCollapsed: false,
    currentView: 'dashboard',
    
    // UI state
    searchOpen: false,
    modalOpen: false,
    modalType: null,
    modalData: null,
    
    // Notifications
    notifications: [],
    
    // Preferences
    preferences: {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        desktop: true
      }
    },
    
    // Loading and error states
    loading: {
      user: false,
      app: false
    },
    error: null
  };

  return create<AppStoreState & AppStoreActions & AppStoreSelectors>((set, get) => ({
    ...initialState,

    // =================== USER MANAGEMENT ===================
    setUser: (user) => {
      set((state) => {
        state.user = user;
        state.isAuthenticated = !!user;
      });
    },

    login: async (credentials) => {
      set((state) => {
        state.loading.user = true;
        state.error = null;
      });

      try {
        // TODO: Implement actual authentication
        const user = {
          id: 'user_123',
          name: 'Demo User',
          email: credentials.email
        };

        set((state) => {
          state.user = user;
          state.isAuthenticated = true;
          state.loading.user = false;
        });

        return user;
      } catch (error) {
        set((state) => {
          state.error = error as any;
          state.loading.user = false;
        });
        throw error;
      }
    },

    logout: async () => {
      set((state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading.user = false;
        state.error = null;
      });
    },
    loadUser: async () => {
      set((state) => {
        state.loading.user = true;
        state.error = null;
      });

      try {
        // TODO: Implement actual user loading from API
        // For now, simulate loading
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const user = {
          id: 'user_123',
          name: 'Demo User',
          email: 'demo@example.com'
        };

        set((state) => {
          state.user = user;
          state.isAuthenticated = true;
          state.loading.user = false;
        });

        return user;
      } catch (error) {
        set((state) => {
          state.error = error as any;
          state.loading.user = false;
        });
        throw error;
      }
    },

    // =================== THEME MANAGEMENT ===================
    setTheme: (theme: Theme) => {
      set((state) => {
        state.theme = theme;
        state.preferences.theme = theme;
      });
    },

    toggleTheme: () => {
      const currentTheme = get().theme;
      const newTheme = currentTheme === 'light' ? 'dark' : 
                      currentTheme === 'dark' ? 'system' : 'light';
      get().setTheme(newTheme);
    },

    // =================== LAYOUT MANAGEMENT ===================
    setSidebarCollapsed: (collapsed) => {
      set((state) => {
        state.sidebarCollapsed = collapsed;
      });
    },

    toggleSidebar: () => {
      set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
      });
    },

    setCurrentView: (view) => {
      set((state) => {
        state.currentView = view;
      });
    },

    // =================== SEARCH MANAGEMENT ===================
    setSearchOpen: (open) => {
      set((state) => {
        state.searchOpen = open;
      });
    },

    toggleSearch: () => {
      set((state) => {
        state.searchOpen = !state.searchOpen;
      });
    },

    // =================== MODAL MANAGEMENT ===================
    setModalOpen: (open, type = null, data = null) => {
      set((state) => {
        state.modalOpen = open;
        state.modalType = open ? type : null;
        state.modalData = open ? data : null;
      });
    },

    showModal: (type, data = null) => {
      get().setModalOpen(true, type, data);
    },

    hideModal: () => {
      get().setModalOpen(false);
    },

    toggleModal: (type = null, data = null) => {
      const state = get();
      if (state.modalOpen && (!type || state.modalType === type)) {
        state.hideModal();
      } else {
        state.showModal(type, data);
      }
    },

    // =================== NOTIFICATIONS ===================
    showNotification: (notification) => {
      const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNotification = {
        id,
        type: 'info' as const,
        title: '',
        message: '',
        duration: 5000,
        ...notification
      };

      set((state) => {
        state.notifications.push(newNotification);
      });

      // Auto-dismiss after duration
      if (newNotification.duration > 0) {
        setTimeout(() => {
          get().hideNotification(id);
        }, newNotification.duration);
      }

      return id;
    },

    hideNotification: (id) => {
      set((state) => {
        state.notifications = state.notifications.filter(n => n.id !== id);
      });
    },

    clearNotifications: () => {
      set((state) => {
        state.notifications = [];
      });
    },

    // =================== PREFERENCES ===================
    updatePreferences: (preferences) => {
      set((state) => {
        state.preferences = {
          ...state.preferences,
          ...preferences
        };
      });
    },

    // =================== LOADING AND ERROR ===================
    setLoading: (key, loading) => {
      set((state) => {
        if (key in state.loading) {
          (state.loading as any)[key] = loading;
        }
      });
    },

    setError: (error) => {
      set((state) => {
        state.error = error;
      });
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    // =================== SELECTORS ===================
    getNotificationCount: () => {
      return get().notifications.length;
    },

    hasUnreadNotifications: () => {
      return get().notifications.length > 0;
    },

    isDarkMode: () => {
      const state = get();
      if (state.theme === 'system') {
        return typeof window !== 'undefined' && 
               window.matchMedia && 
               window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return state.theme === 'dark';
    }
  }));
};

// Export the store instance
export const useAppStore = createAppStore();