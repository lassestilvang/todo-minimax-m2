/**
 * AppStore - Simplified Zustand store for app-wide state management
 */

import { create } from "zustand";
import type {
  AppStoreState,
  AppStoreActions,
  AppStoreSelectors,
} from "../types/store";
import type { Theme } from "../types/utils";
import type { User } from "../lib/db/types";

/**
 * Create a simple app store
 */
export const createAppStore = (config?: { userId?: string }) => {
  const { userId = "default" } = config || {};

  // Initial state
  const initialState: AppStoreState = {
    // User and authentication
    user: null,
    isAuthenticated: false,

    // App state
    theme: "system",
    sidebarCollapsed: false,
    currentView: "today",

    // UI state
    searchOpen: false,
    modalOpen: false,
    modalType: null,
    modalData: null,

    // Notifications
    notifications: [],

    // Preferences
    preferences: {
      theme: "system",
      language: "en",
      notifications: {
        email: true,
        push: true,
        desktop: true,
      },
    },

    // Loading and error states
    loading: {
      user: false,
      app: false,
    },
    error: null,
  };

  return create<AppStoreState & AppStoreActions & AppStoreSelectors>(
    (set, get) => ({
      ...initialState,

      // =================== USER MANAGEMENT ===================
      setUser: (user: User | null): void => {
        set((state) => ({
          ...state,
          user,
          isAuthenticated: !!user,
        }));
      },

      login: async (credentials: {
        email: string;
        password: string;
      }): Promise<void> => {
        set((state) => ({
          ...state,
          loading: {
            ...state.loading,
            user: true,
          },
          error: null,
        }));

        try {
          // TODO: Implement actual authentication
          const user: User = {
            id: "user_123",
            name: "Demo User",
            email: credentials.email,
            avatar: "/api/placeholder/48/48",
            preferences: {
              theme: "system",
              timezone: "UTC",
              dateFormat: "yyyy-MM-dd",
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => ({
            ...state,
            user,
            isAuthenticated: true,
            loading: {
              ...state.loading,
              user: false,
            },
          }));
        } catch (error) {
          set((state) => ({
            ...state,
            error: error as any,
            loading: {
              ...state.loading,
              user: false,
            },
          }));
          throw error;
        }
      },

      logout: async (): Promise<void> => {
        set((state) => ({
          ...state,
          user: null,
          isAuthenticated: false,
          loading: {
            ...state.loading,
            user: false,
          },
          error: null,
        }));
      },
      loadUser: async (): Promise<void> => {
        set((state) => ({
          ...state,
          loading: {
            ...state.loading,
            user: true,
          },
          error: null,
        }));

        try {
          // TODO: Implement actual user loading from API
          // For now, simulate loading
          await new Promise((resolve) => setTimeout(resolve, 500));

          const user: User = {
            id: "user_123",
            name: "Demo User",
            email: "demo@example.com",
            avatar: "/api/placeholder/48/48",
            preferences: {
              theme: "system",
              timezone: "UTC",
              dateFormat: "yyyy-MM-dd",
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set((state) => ({
            ...state,
            user,
            isAuthenticated: true,
            loading: {
              ...state.loading,
              user: false,
            },
          }));
        } catch (error) {
          set((state) => ({
            ...state,
            error: error as any,
            loading: {
              ...state.loading,
              user: false,
            },
          }));
          throw error;
        }
      },

      // =================== THEME MANAGEMENT ===================
      setTheme: (theme: Theme): void => {
        set((state) => ({
          ...state,
          theme,
          preferences: {
            ...state.preferences,
            theme,
          },
        }));
      },

      toggleTheme: (): void => {
        const currentTheme = get().theme;
        const newTheme =
          currentTheme === "light"
            ? "dark"
            : currentTheme === "dark"
            ? "system"
            : "light";
        get().setTheme(newTheme);
      },

      // =================== LAYOUT MANAGEMENT ===================
      setSidebarCollapsed: (collapsed: boolean): void => {
        set((state) => ({
          ...state,
          sidebarCollapsed: collapsed,
        }));
      },

      toggleSidebar: (): void => {
        set((state) => ({
          ...state,
          sidebarCollapsed: !state.sidebarCollapsed,
        }));
      },

      setCurrentView: (view: AppStoreState["currentView"]): void => {
        set((state) => ({
          ...state,
          currentView: view,
        }));
      },

      // =================== SEARCH MANAGEMENT ===================
      setSearchOpen: (open: boolean): void => {
        set((state) => ({
          ...state,
          searchOpen: open,
        }));
      },

      toggleSearch: (): void => {
        set((state) => ({
          ...state,
          searchOpen: !state.searchOpen,
        }));
      },

      // =================== MODAL MANAGEMENT ===================
      setModalOpen: (
        open: boolean,
        type: AppStoreState["modalType"] | null,
        data: AppStoreState["modalData"] | null
      ): void => {
        set((state) => ({
          ...state,
          modalOpen: open,
          modalType: open ? type : null,
          modalData: open ? data : null,
        }));
      },

      showModal: (
        type: AppStoreState["modalType"],
        data: AppStoreState["modalData"]
      ): void => {
        get().setModalOpen(true, type, data);
      },

      hideModal: (): void => {
        get().setModalOpen(false, null, null);
      },

      toggleModal: (type: string | null = null, data: any = null) => {
        const state = get();
        if (state.modalOpen && (!type || state.modalType === type)) {
          state.setModalOpen(false, null, null);
        } else {
          state.setModalOpen(true, type, data);
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

        set((state) => ({
          ...state,
          notifications: [...state.notifications, newNotification]
        }));

        // Auto-dismiss after duration
        if (newNotification.duration > 0) {
          setTimeout(() => {
            get().hideNotification(id);
          }, newNotification.duration);
        }

        return id;
      },

      hideNotification: (id: string): void => {
        set((state) => ({
          ...state,
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: (): void => {
        set((state) => ({
          ...state,
          notifications: [],
        }));
      },

      // =================== PREFERENCES ===================
      updatePreferences: (
        preferences: Partial<AppStoreState["preferences"]>
      ): void => {
        set((state) => ({
          ...state,
          preferences: {
            ...state.preferences,
            ...preferences,
          },
        }));
      },

      // =================== LOADING AND ERROR ===================
      setLoading: (
        key: keyof AppStoreState["loading"],
        loading: boolean
      ): void => {
        set((state) => ({
          ...state,
          loading: {
            ...state.loading,
            [key]: loading,
          },
        }));
      },

      setError: (error: any): void => {
        set((state) => ({
          ...state,
          error,
        }));
      },

      clearError: (): void => {
        set((state) => ({
          ...state,
          error: null,
        }));
      },

      // =================== SELECTORS ===================
      getNotificationCount: (): number => {
        return get().notifications.length;
      },

      hasUnreadNotifications: (): boolean => {
        return get().notifications.length > 0;
      },

      isDarkMode: (): boolean => {
        const state = get();
        if (state.theme === "system") {
          return (
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
          );
        }
        return state.theme === "dark";
      },
    })
  );
};

// Export the store instance
export const useAppStore = createAppStore();
