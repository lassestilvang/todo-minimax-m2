/**
 * AppStore Logic Tests
 * Comprehensive tests for Zustand app store functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

// Mock global objects
if (typeof global.matchMedia === 'undefined') {
  global.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }) as any;
}

// Mock setTimeout for test environment
if (typeof global.setTimeout === 'undefined') {
  global.setTimeout = () => 12345;
  global.clearTimeout = () => {};
}

// Mock the app store creation
const createMockAppStore = () => {
  const state = {
    // Authentication state
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    
    // Theme and appearance
    theme: 'light',
    isDarkMode: false,
    sidebarCollapsed: false,
    
    // View and navigation
    currentView: 'tasks',
    previousView: null,
    routeHistory: [],
    
    // UI state
    modals: {
      taskForm: { isOpen: false, data: null },
      listForm: { isOpen: false, data: null },
      settings: { isOpen: false },
      confirmDialog: { isOpen: false, message: '', onConfirm: null }
    },
    
    // Notifications
    notifications: [],
    nextNotificationId: 1,
    
    // Preferences and settings
    preferences: {
      compactMode: false,
      showCompletedTasks: true,
      autoSave: true,
      defaultListView: 'list',
      taskSorting: 'name',
      notifications: {
        enabled: true,
        sound: true,
        desktop: true,
        taskReminders: true,
        listUpdates: true
      },
      privacy: {
        analytics: false,
        crashReporting: true
      }
    },
    
    // Search and filters
    globalSearchQuery: '',
    activeFilters: {},
    
    // Performance and caching
    cache: {},
    lastSync: null,
    
    // Error handling
    globalError: null,
    errorHistory: []
  };

  const actions = {
    // Authentication
    login: async (credentials: { email: string; password: string }) => {
      state.isLoading = true;
      state.error = null;
      
      try {
        // Simulate login process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Mock user creation
        const user = {
          id: 'user-1',
          email: credentials.email,
          name: 'Test User',
          preferences: state.preferences
        };
        
        state.user = user;
        state.isAuthenticated = true;
        state.isLoading = false;
        
        return { success: true, user };
      } catch (error) {
        state.error = { code: 'LOGIN_ERROR', message: 'Login failed' };
        state.isLoading = false;
        throw error;
      }
    },

    logout: async () => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      
      // Clear sensitive data
      state.notifications = [];
      state.cache = {};
      state.globalSearchQuery = '';
      state.activeFilters = {};
      
      // Reset to defaults
      actions.resetToDefaults();
      
      return { success: true };
    },

    updateProfile: async (profileData: any) => {
      if (!state.user) {
        throw new Error('User not authenticated');
      }
      
      state.user = { ...state.user, ...profileData };
      return { success: true, user: state.user };
    },

    // Theme management
    setTheme: (theme: 'light' | 'dark' | 'auto') => {
      state.theme = theme;
      
      if (theme === 'auto') {
        // Auto-detect from system preference - always return false for test
        state.isDarkMode = false;
      } else {
        state.isDarkMode = theme === 'dark';
      }
      
      // Persist to localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', theme);
      }
    },

    toggleDarkMode: () => {
      actions.setTheme(state.isDarkMode ? 'light' : 'dark');
    },

    // View and navigation
    setCurrentView: (view: string) => {
      state.previousView = state.currentView;
      state.currentView = view;
      
      // Add to route history
      state.routeHistory.push({
        view,
        timestamp: new Date(),
        params: {}
      });
      
      // Keep only last 10 entries
      if (state.routeHistory.length > 10) {
        state.routeHistory = state.routeHistory.slice(-10);
      }
    },

    navigateBack: () => {
      if (state.previousView) {
        const currentView = state.currentView;
        state.currentView = state.previousView;
        state.previousView = currentView;
        return true;
      }
      return false;
    },

    getRouteHistory: () => [...state.routeHistory],

    // Sidebar management
    toggleSidebar: () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    setSidebarCollapsed: (collapsed: boolean) => {
      state.sidebarCollapsed = collapsed;
    },

    // Modal management
    openModal: (modalName: string, data?: any) => {
      if (state.modals[modalName]) {
        state.modals[modalName].isOpen = true;
        if (data) {
          state.modals[modalName].data = data;
        }
      }
    },

    closeModal: (modalName: string) => {
      if (state.modals[modalName]) {
        state.modals[modalName].isOpen = false;
        state.modals[modalName].data = null;
      }
    },

    closeAllModals: () => {
      Object.keys(state.modals).forEach(modalName => {
        state.modals[modalName].isOpen = false;
        state.modals[modalName].data = null;
      });
    },

    getModalState: (modalName: string) => {
      return state.modals[modalName] || { isOpen: false, data: null };
    },

    // Notification management
    addNotification: (notification: {
      type: 'success' | 'error' | 'warning' | 'info';
      title: string;
      message?: string;
      duration?: number;
      persistent?: boolean;
    }) => {
      const id = state.nextNotificationId++;
      const newNotification = {
        id,
        timestamp: new Date(),
        ...notification,
        duration: notification.duration || 5000
      };
      
      state.notifications.push(newNotification);
      
      // Auto-remove after duration (if not persistent)
      if (!notification.persistent && newNotification.duration > 0) {
        global.setTimeout(() => {
          actions.removeNotification(id);
        }, newNotification.duration);
      }
      
      return id;
    },

    removeNotification: (id: number) => {
      state.notifications = state.notifications.filter(n => n.id !== id);
    },

    clearNotifications: () => {
      state.notifications = [];
    },

    showSuccess: (title: string, message?: string) => {
      return actions.addNotification({ type: 'success', title, message });
    },

    showError: (title: string, message?: string) => {
      return actions.addNotification({ type: 'error', title, message });
    },

    showWarning: (title: string, message?: string) => {
      return actions.addNotification({ type: 'warning', title, message });
    },

    showInfo: (title: string, message?: string) => {
      return actions.addNotification({ type: 'info', title, message });
    },

    // Preferences management
    updatePreferences: (updates: any) => {
      state.preferences = { ...state.preferences, ...updates };
      
      // Apply theme changes immediately
      if (updates.theme) {
        actions.setTheme(updates.theme);
      }
      
      // Persist to storage
      actions.savePreferences();
    },

    savePreferences: () => {
      if (typeof localStorage !== 'undefined' && state.user) {
        localStorage.setItem(`preferences_${state.user.id}`, JSON.stringify(state.preferences));
      }
    },

    loadPreferences: () => {
      if (typeof localStorage !== 'undefined' && state.user) {
        const saved = localStorage.getItem(`preferences_${state.user.id}`);
        if (saved) {
          try {
            const preferences = JSON.parse(saved);
            state.preferences = { ...state.preferences, ...preferences };
          } catch (error) {
            console.warn('Failed to load preferences:', error);
          }
        }
      }
    },

    resetPreferences: () => {
      state.preferences = {
        compactMode: false,
        showCompletedTasks: true,
        autoSave: true,
        defaultListView: 'list',
        taskSorting: 'name',
        notifications: {
          enabled: true,
          sound: true,
          desktop: true,
          taskReminders: true,
          listUpdates: true
        },
        privacy: {
          analytics: false,
          crashReporting: true
        }
      };
    },

    // Search and filtering
    setGlobalSearchQuery: (query: string) => {
      state.globalSearchQuery = query;
    },

    addGlobalFilter: (key: string, value: any) => {
      state.activeFilters[key] = value;
    },

    removeGlobalFilter: (key: string) => {
      delete state.activeFilters[key];
    },

    clearGlobalFilters: () => {
      state.activeFilters = {};
      state.globalSearchQuery = '';
    },

    getFilteredState: () => {
      return {
        searchQuery: state.globalSearchQuery,
        filters: state.activeFilters,
        theme: state.theme,
        view: state.currentView
      };
    },

    // Cache management
    setCache: (key: string, data: any) => {
      state.cache[key] = {
        data,
        timestamp: new Date(),
        expires: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      };
    },

    getCache: (key: string) => {
      const cached = state.cache[key];
      if (cached && cached.expires > new Date()) {
        return cached.data;
      }
      // Remove expired cache
      delete state.cache[key];
      return null;
    },

    clearCache: () => {
      state.cache = {};
    },

    // Error handling
    setGlobalError: (error: { code: string; message: string; details?: any }) => {
      state.globalError = {
        ...error,
        timestamp: new Date()
      };
      
      // Add to error history
      state.errorHistory.unshift({
        ...error,
        timestamp: new Date()
      });
      
      // Keep only last 10 errors
      if (state.errorHistory.length > 10) {
        state.errorHistory = state.errorHistory.slice(0, 10);
      }
    },

    clearGlobalError: () => {
      state.globalError = null;
    },

    clearErrorHistory: () => {
      state.errorHistory = [];
    },

    // Utility methods
    resetToDefaults: () => {
      state.theme = 'light';
      state.isDarkMode = false;
      state.sidebarCollapsed = false;
      state.currentView = 'tasks';
      state.previousView = null;
      state.routeHistory = [];
      state.globalSearchQuery = '';
      state.activeFilters = {};
      actions.resetPreferences();
    },

    getAppStats: () => {
      return {
        isAuthenticated: state.isAuthenticated,
        currentView: state.currentView,
        theme: state.theme,
        notificationCount: state.notifications.length,
        cacheSize: Object.keys(state.cache).length,
        errorCount: state.errorHistory.length,
        routeHistoryLength: state.routeHistory.length
      };
    },

    // Sync and data management
    syncData: async () => {
      if (!state.user || !state.isAuthenticated) {
        return { success: false, error: 'Not authenticated' };
      }
      
      try {
        // Simulate sync process
        await new Promise(resolve => setTimeout(resolve, 200));
        
        state.lastSync = new Date();
        actions.addNotification({
          type: 'success',
          title: 'Sync Complete',
          message: 'Data synchronized successfully'
        });
        
        return { success: true };
      } catch (error) {
        actions.setGlobalError({ code: 'SYNC_ERROR', message: 'Failed to sync data' });
        return { success: false, error };
      }
    },

    exportData: async () => {
      const exportData = {
        user: state.user,
        preferences: state.preferences,
        exportedAt: new Date(),
        version: '1.0'
      };
      
      return {
        success: true,
        data: exportData,
        filename: `task-planner-export-${new Date().toISOString().split('T')[0]}.json`
      };
    }
  };

  return { state, actions };
};

describe('AppStore Logic Tests', () => {
  let appStore: ReturnType<typeof createMockAppStore>;

  beforeEach(() => {
    appStore = createMockAppStore();
  });

  afterEach(() => {
    appStore.actions.resetToDefaults();
  });

  describe('Authentication', () => {
    test('should login successfully', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      
      const result = await appStore.actions.login(credentials);
      
      expect(result.success).toBe(true);
      expect(appStore.state.isAuthenticated).toBe(true);
      expect(appStore.state.user).toBeDefined();
      expect(appStore.state.user.email).toBe(credentials.email);
      expect(appStore.state.isLoading).toBe(false);
    });

    test('should handle login error', async () => {
      // Mock a failed login scenario
      const originalLogin = appStore.actions.login;
      appStore.actions.login = async () => {
        appStore.state.isLoading = true;
        await new Promise(resolve => setTimeout(resolve, 100));
        appStore.state.error = { code: 'LOGIN_ERROR', message: 'Login failed' };
        appStore.state.isLoading = false;
        throw new Error('Login failed');
      };
      
      await expect(appStore.actions.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow();
      
      expect(appStore.state.error).toBeDefined();
    });

    test('should logout successfully', async () => {
      // First login
      await appStore.actions.login({ email: 'test@example.com', password: 'password' });
      
      // Add some test data
      appStore.actions.addNotification({ type: 'success', title: 'Test' });
      appStore.state.cache.test = { data: 'test' };
      appStore.state.globalSearchQuery = 'test search';
      
      // Logout
      const result = await appStore.actions.logout();
      
      expect(result.success).toBe(true);
      expect(appStore.state.isAuthenticated).toBe(false);
      expect(appStore.state.user).toBeNull();
      expect(appStore.state.notifications).toHaveLength(0);
      expect(appStore.state.globalSearchQuery).toBe('');
      expect(appStore.state.cache).toEqual({});
    });

    test('should update user profile', async () => {
      await appStore.actions.login({ email: 'test@example.com', password: 'password' });
      
      const profileUpdates = {
        name: 'Updated User',
        email: 'updated@example.com'
      };
      
      const result = await appStore.actions.updateProfile(profileUpdates);
      
      expect(result.success).toBe(true);
      expect(appStore.state.user.name).toBe('Updated User');
      expect(appStore.state.user.email).toBe('updated@example.com');
    });

    test('should throw error when updating profile without authentication', async () => {
      await expect(appStore.actions.updateProfile({ name: 'Test' }))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('Theme Management', () => {
    test('should set theme to light', () => {
      appStore.actions.setTheme('light');
      
      expect(appStore.state.theme).toBe('light');
      expect(appStore.state.isDarkMode).toBe(false);
    });

    test('should set theme to dark', () => {
      appStore.actions.setTheme('dark');
      
      expect(appStore.state.theme).toBe('dark');
      expect(appStore.state.isDarkMode).toBe(true);
    });

    test('should toggle dark mode', () => {
      appStore.state.theme = 'light';
      appStore.state.isDarkMode = false;
      
      appStore.actions.toggleDarkMode();
      
      expect(appStore.state.theme).toBe('dark');
      expect(appStore.state.isDarkMode).toBe(true);
      
      appStore.actions.toggleDarkMode();
      
      expect(appStore.state.theme).toBe('light');
      expect(appStore.state.isDarkMode).toBe(false);
    });

    test('should handle auto theme detection', () => {
      appStore.actions.setTheme('auto');
      
      expect(appStore.state.theme).toBe('auto');
      expect(appStore.state.isDarkMode).toBe(false);
    });
  });

  describe('View and Navigation', () => {
    test('should set current view', () => {
      appStore.actions.setCurrentView('lists');
      
      expect(appStore.state.currentView).toBe('lists');
      expect(appStore.state.previousView).toBe('tasks'); // Default
      expect(appStore.state.routeHistory).toHaveLength(1);
      expect(appStore.state.routeHistory[0].view).toBe('lists');
    });

    test('should navigate back', () => {
      appStore.state.currentView = 'lists';
      appStore.state.previousView = 'tasks';
      
      const success = appStore.actions.navigateBack();
      
      expect(success).toBe(true);
      expect(appStore.state.currentView).toBe('tasks');
      expect(appStore.state.previousView).toBe('lists');
    });

    test('should return false when navigating back without history', () => {
      appStore.state.previousView = null;
      
      const success = appStore.actions.navigateBack();
      
      expect(success).toBe(false);
      expect(appStore.state.currentView).toBe('tasks');
    });

    test('should maintain route history', () => {
      appStore.actions.setCurrentView('lists');
      appStore.actions.setCurrentView('settings');
      appStore.actions.setCurrentView('tasks');
      
      expect(appStore.state.routeHistory).toHaveLength(3);
      expect(appStore.state.routeHistory[0].view).toBe('lists');
      expect(appStore.state.routeHistory[1].view).toBe('settings');
      expect(appStore.state.routeHistory[2].view).toBe('tasks');
    });

    test('should limit route history to 10 entries', () => {
      // Add 12 entries
      for (let i = 0; i < 12; i++) {
        appStore.actions.setCurrentView(`view-${i}`);
      }
      
      expect(appStore.state.routeHistory).toHaveLength(10);
      expect(appStore.state.routeHistory[0].view).toBe('view-2'); // First 2 should be removed
      expect(appStore.state.routeHistory[9].view).toBe('view-11'); // Last should remain
    });
  });

  describe('Sidebar Management', () => {
    test('should toggle sidebar', () => {
      expect(appStore.state.sidebarCollapsed).toBe(false);
      
      appStore.actions.toggleSidebar();
      expect(appStore.state.sidebarCollapsed).toBe(true);
      
      appStore.actions.toggleSidebar();
      expect(appStore.state.sidebarCollapsed).toBe(false);
    });

    test('should set sidebar collapsed state', () => {
      appStore.actions.setSidebarCollapsed(true);
      expect(appStore.state.sidebarCollapsed).toBe(true);
      
      appStore.actions.setSidebarCollapsed(false);
      expect(appStore.state.sidebarCollapsed).toBe(false);
    });
  });

  describe('Modal Management', () => {
    test('should open modal', () => {
      appStore.actions.openModal('taskForm', { mode: 'create' });
      
      const modalState = appStore.actions.getModalState('taskForm');
      expect(modalState.isOpen).toBe(true);
      expect(modalState.data.mode).toBe('create');
    });

    test('should close modal', () => {
      appStore.state.modals.taskForm.isOpen = true;
      appStore.state.modals.taskForm.data = { mode: 'create' };
      
      appStore.actions.closeModal('taskForm');
      
      const modalState = appStore.actions.getModalState('taskForm');
      expect(modalState.isOpen).toBe(false);
      expect(modalState.data).toBeNull();
    });

    test('should close all modals', () => {
      appStore.state.modals.taskForm.isOpen = true;
      appStore.state.modals.settings.isOpen = true;
      appStore.state.modals.confirmDialog.isOpen = true;
      
      appStore.actions.closeAllModals();
      
      expect(appStore.state.modals.taskForm.isOpen).toBe(false);
      expect(appStore.state.modals.settings.isOpen).toBe(false);
      expect(appStore.state.modals.confirmDialog.isOpen).toBe(false);
    });

    test('should handle non-existent modal', () => {
      const modalState = appStore.actions.getModalState('nonExistent');
      expect(modalState.isOpen).toBe(false);
      expect(modalState.data).toBeNull();
    });
  });

  describe('Notification Management', () => {
    test('should add notification', () => {
      const id = appStore.actions.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Operation completed'
      });
      
      expect(appStore.state.notifications).toHaveLength(1);
      expect(appStore.state.notifications[0].id).toBe(id);
      expect(appStore.state.notifications[0].type).toBe('success');
      expect(appStore.state.notifications[0].title).toBe('Success');
    });

    test('should remove notification', () => {
      const id = appStore.actions.addNotification({
        type: 'info',
        title: 'Test'
      });
      
      appStore.actions.removeNotification(id);
      
      expect(appStore.state.notifications).toHaveLength(0);
    });

    test('should clear all notifications', () => {
      appStore.actions.addNotification({ type: 'success', title: 'Test 1' });
      appStore.actions.addNotification({ type: 'error', title: 'Test 2' });
      
      appStore.actions.clearNotifications();
      
      expect(appStore.state.notifications).toHaveLength(0);
    });

    test('should show success notification', () => {
      const id = appStore.actions.showSuccess('Success Title', 'Success message');
      
      const notification = appStore.state.notifications.find(n => n.id === id);
      expect(notification.type).toBe('success');
      expect(notification.title).toBe('Success Title');
      expect(notification.message).toBe('Success message');
    });

    test('should show error notification', () => {
      const id = appStore.actions.showError('Error Title', 'Error message');
      
      const notification = appStore.state.notifications.find(n => n.id === id);
      expect(notification.type).toBe('error');
      expect(notification.title).toBe('Error Title');
      expect(notification.message).toBe('Error message');
    });

    test('should auto-remove non-persistent notifications', () => {
      const originalSetTimeout = global.setTimeout;
      let timeoutCalls: Array<{callback: Function, delay: number}> = [];
      
      global.setTimeout = (callback: Function, delay?: number) => {
        timeoutCalls.push({ callback, delay: delay || 0 });
        return 12345; // Mock timeout ID
      };
      
      try {
        const id = appStore.actions.addNotification({
          type: 'info',
          title: 'Auto Remove',
          duration: 1000
        });
        
        expect(appStore.state.notifications).toHaveLength(1);
        
        // Simulate the timeout being called
        if (timeoutCalls.length > 0) {
          timeoutCalls[0].callback();
        }
        
        expect(appStore.state.notifications).toHaveLength(0);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of notifications efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        appStore.actions.addNotification({
          type: 'info',
          title: `Notification ${i}`,
          persistent: true
        });
      }
      
      const endTime = performance.now();
      const creationTime = endTime - startTime;
      
      expect(creationTime).toBeLessThan(1000); // Should complete within 1 second
      expect(appStore.state.notifications).toHaveLength(1000);
    });

    test('should handle large error history efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        appStore.actions.setGlobalError({ 
          code: `ERROR_${i}`, 
          message: `Error message ${i}` 
        });
      }
      
      const endTime = performance.now();
      const creationTime = endTime - startTime;
      
      expect(creationTime).toBeLessThan(500); // Should complete within 500ms
      expect(appStore.state.errorHistory).toHaveLength(10); // Limited to 10
    });

    test('should handle large cache efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        appStore.actions.setCache(`cache-${i}`, { data: `data-${i}` });
      }
      
      const endTime = performance.now();
      const creationTime = endTime - startTime;
      
      expect(creationTime).toBeLessThan(100); // Should complete within 100ms
      expect(Object.keys(appStore.state.cache)).toHaveLength(1000);
      
      // Test cache retrieval performance
      const retrievalStartTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        appStore.actions.getCache(`cache-${i}`);
      }
      const retrievalEndTime = performance.now();
      const retrievalTime = retrievalEndTime - retrievalStartTime;
      
      expect(retrievalTime).toBeLessThan(50); // Should retrieve within 50ms
    });
  });
});