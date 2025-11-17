/**
 * AppStore Logic Tests
 * Comprehensive tests for Zustand app store functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { createTestDatabaseAPI, TestDatabaseManager } from '../../lib/db/test-utils';
import { TEST_DATA } from '../../test/setup';

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
        // Auto-detect from system preference
        state.isDarkMode = window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
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
        setTimeout(() => {
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
  let testAPI: ReturnType<typeof createTestDatabaseAPI>;
  let testDB: TestDatabaseManager;
  let appStore: ReturnType<typeof createMockAppStore>;

  beforeAll(async () => {
    testDB = new TestDatabaseManager({
      path: './test-data/app-store-test.db',
      verbose: false
    });
    
    testAPI = createTestDatabaseAPI({
      path: testDB.getPath(),
      verbose: false
    });
    
    await testAPI.api.runMigrations();
    await testDB.initialize();
  });

  afterAll(async () => {
    await testDB.cleanup();
  });

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
      actions.setTheme('light');
      
      expect(appStore.state.theme).toBe('light');
      expect(appStore.state.isDarkMode).toBe(false);
    });

    test('should set theme to dark', () => {
      actions.setTheme('dark');
      
      expect(appStore.state.theme).toBe('dark');
      expect(appStore.state.isDarkMode).toBe(true);
    });

    test('should toggle dark mode', () => {
      appStore.state.theme = 'light';
      appStore.state.isDarkMode = false;
      
      actions.toggleDarkMode();
      
      expect(appStore.state.theme).toBe('dark');
      expect(appStore.state.isDarkMode).toBe(true);
      
      actions.toggleDarkMode();
      
      expect(appStore.state.theme).toBe('light');
      expect(appStore.state.isDarkMode).toBe(false);
    });

    test('should handle auto theme detection', () => {
      // Mock matchMedia for auto theme
      global.matchMedia = (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }) as any;
      
      actions.setTheme('auto');
      
      expect(appStore.state.theme).toBe('auto');
      expect(appStore.state.isDarkMode).toBe(false); // Default for mock
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
      jest.useFakeTimers();
      
      const id = appStore.actions.addNotification({
        type: 'info',
        title: 'Auto Remove',
        duration: 1000
      });
      
      expect(appStore.state.notifications).toHaveLength(1);
      
      jest.advanceTimersByTime(1001);
      
      expect(appStore.state.notifications).toHaveLength(0);
      
      jest.useRealTimers();
    });
  });

  describe('Preferences Management', () => {
    test('should update preferences', () => {
      const updates = {
        compactMode: true,
        showCompletedTasks: false,
        theme: 'dark'
      };
      
      appStore.actions.updatePreferences(updates);
      
      expect(appStore.state.preferences.compactMode).toBe(true);
      expect(appStore.state.preferences.showCompletedTasks).toBe(false);
      expect(appStore.state.theme).toBe('dark');
    });

    test('should reset preferences', () => {
      // First modify preferences
      appStore.actions.updatePreferences({
        compactMode: true,
        notifications: { enabled: false }
      });
      
      // Then reset
      appStore.actions.resetPreferences();
      
      expect(appStore.state.preferences.compactMode).toBe(false);
      expect(appStore.state.preferences.showCompletedTasks).toBe(true);
      expect(appStore.state.preferences.notifications.enabled).toBe(true);
    });

    test('should save and load preferences', () => {
      // Mock localStorage
      global.localStorage = {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      } as any;
      
      appStore.state.user = { id: 'test-user' };
      appStore.actions.updatePreferences({ compactMode: true });
      
      appStore.actions.savePreferences();
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'preferences_test-user',
        expect.any(String)
      );
      
      appStore.actions.loadPreferences();
      expect(localStorage.getItem).toHaveBeenCalledWith('preferences_test-user');
    });
  });

  describe('Search and Filtering', () => {
    test('should set global search query', () => {
      appStore.actions.setGlobalSearchQuery('test search');
      
      expect(appStore.state.globalSearchQuery).toBe('test search');
    });

    test('should add global filter', () => {
      appStore.actions.addGlobalFilter('status', 'done');
      appStore.actions.addGlobalFilter('priority', 'high');
      
      expect(appStore.state.activeFilters.status).toBe('done');
      expect(appStore.state.activeFilters.priority).toBe('high');
    });

    test('should remove global filter', () => {
      appStore.actions.addGlobalFilter('status', 'done');
      appStore.actions.removeGlobalFilter('status');
      
      expect(appStore.state.activeFilters.status).toBeUndefined();
    });

    test('should clear all global filters', () => {
      appStore.actions.setGlobalSearchQuery('test');
      appStore.actions.addGlobalFilter('status', 'done');
      
      appStore.actions.clearGlobalFilters();
      
      expect(appStore.state.globalSearchQuery).toBe('');
      expect(appStore.state.activeFilters).toEqual({});
    });

    test('should get filtered state', () => {
      appStore.actions.setGlobalSearchQuery('search');
      appStore.actions.addGlobalFilter('status', 'done');
      appStore.state.theme = 'dark';
      appStore.state.currentView = 'lists';
      
      const filteredState = appStore.actions.getFilteredState();
      
      expect(filteredState.searchQuery).toBe('search');
      expect(filteredState.filters.status).toBe('done');
      expect(filteredState.theme).toBe('dark');
      expect(filteredState.view).toBe('lists');
    });
  });

  describe('Cache Management', () => {
    test('should set cache', () => {
      const data = { test: 'data' };
      appStore.actions.setCache('test-key', data);
      
      expect(appStore.state.cache['test-key']).toBeDefined();
      expect(appStore.state.cache['test-key'].data).toEqual(data);
      expect(appStore.state.cache['test-key'].timestamp).toBeInstanceOf(Date);
    });

    test('should get cache', () => {
      const data = { test: 'data' };
      appStore.actions.setCache('test-key', data);
      
      const retrieved = appStore.actions.getCache('test-key');
      expect(retrieved).toEqual(data);
    });

    test('should return null for expired cache', () => {
      const data = { test: 'data' };
      appStore.actions.setCache('test-key', data);
      
      // Manually expire the cache
      appStore.state.cache['test-key'].expires = new Date(Date.now() - 1000);
      
      const retrieved = appStore.actions.getCache('test-key');
      expect(retrieved).toBeNull();
      expect(appStore.state.cache['test-key']).toBeUndefined();
    });

    test('should clear all cache', () => {
      appStore.actions.setCache('key1', { data: 'data1' });
      appStore.actions.setCache('key2', { data: 'data2' });
      
      appStore.actions.clearCache();
      
      expect(appStore.state.cache).toEqual({});
    });
  });

  describe('Error Handling', () => {
    test('should set global error', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: { field: 'test' }
      };
      
      appStore.actions.setGlobalError(error);
      
      expect(appStore.state.globalError.code).toBe('TEST_ERROR');
      expect(appStore.state.globalError.message).toBe('Test error message');
      expect(appStore.state.globalError.details.field).toBe('test');
      expect(appStore.state.globalError.timestamp).toBeInstanceOf(Date);
    });

    test('should maintain error history', () => {
      appStore.actions.setGlobalError({ code: 'ERROR_1', message: 'Error 1' });
      appStore.actions.setGlobalError({ code: 'ERROR_2', message: 'Error 2' });
      
      expect(appStore.state.errorHistory).toHaveLength(2);
      expect(appStore.state.errorHistory[0].code).toBe('ERROR_2');
      expect(appStore.state.errorHistory[1].code).toBe('ERROR_1');
    });

    test('should limit error history to 10 entries', () => {
      // Add 12 errors
      for (let i = 0; i < 12; i++) {
        appStore.actions.setGlobalError({ code: `ERROR_${i}`, message: `Error ${i}` });
      }
      
      expect(appStore.state.errorHistory).toHaveLength(10);
    });

    test('should clear global error', () => {
      appStore.actions.setGlobalError({ code: 'TEST', message: 'Test' });
      expect(appStore.state.globalError).toBeDefined();
      
      appStore.actions.clearGlobalError();
      expect(appStore.state.globalError).toBeNull();
    });

    test('should clear error history', () => {
      appStore.actions.setGlobalError({ code: 'TEST', message: 'Test' });
      expect(appStore.state.errorHistory).toHaveLength(1);
      
      appStore.actions.clearErrorHistory();
      expect(appStore.state.errorHistory).toHaveLength(0);
    });
  });

  describe('Utility Methods', () => {
    test('should get app statistics', () => {
      const stats = appStore.actions.getAppStats();
      
      expect(stats).toHaveProperty('isAuthenticated');
      expect(stats).toHaveProperty('currentView');
      expect(stats).toHaveProperty('theme');
      expect(stats).toHaveProperty('notificationCount');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('routeHistoryLength');
    });

    test('should reset to defaults', () => {
      // Modify some state
      appStore.state.theme = 'dark';
      appStore.state.sidebarCollapsed = true;
      appStore.state.currentView = 'lists';
      appStore.state.globalSearchQuery = 'test';
      appStore.actions.addNotification({ type: 'success', title: 'Test' });
      
      appStore.actions.resetToDefaults();
      
      expect(appStore.state.theme).toBe('light');
      expect(appStore.state.sidebarCollapsed).toBe(false);
      expect(appStore.state.currentView).toBe('tasks');
      expect(appStore.state.globalSearchQuery).toBe('');
      expect(appStore.state.notifications).toHaveLength(0);
    });
  });

  describe('Sync and Data Management', () => {
    test('should sync data successfully', async () => {
      await appStore.actions.login({ email: 'test@example.com', password: 'password' });
      
      const result = await appStore.actions.syncData();
      
      expect(result.success).toBe(true);
      expect(appStore.state.lastSync).toBeInstanceOf(Date);
    });

    test('should fail sync when not authenticated', async () => {
      const result = await appStore.actions.syncData();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    test('should export data', async () => {
      await appStore.actions.login({ email: 'test@example.com', password: 'password' });
      
      const result = await appStore.actions.exportData();
      
      expect(result.success).toBe(true);
      expect(result.data.user).toBeDefined();
      expect(result.data.preferences).toBeDefined();
      expect(result.data.exportedAt).toBeInstanceOf(Date);
      expect(result.filename).toMatch(/task-planner-export-\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of notifications efficiently', () => {
      const startTime = performance.now();
      
      const notificationPromises = Array.from({ length: 1000 }, (_, i) =>
        appStore.actions.addNotification({
          type: 'info',
          title: `Notification ${i}`,
          persistent: true
        })
      );
      
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
      
      const cachePromises = Array.from({ length: 1000 }, (_, i) =>
        appStore.actions.setCache(`cache-${i}`, { data: `data-${i}` })
      );
      
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