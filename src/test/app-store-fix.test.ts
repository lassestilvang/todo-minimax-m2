/**
 * Test to verify the app-store TypeError fix
 */

import { createAppStore } from '../store/app-store';

describe('App Store Fix Verification', () => {
  let store: any;

  beforeEach(() => {
    store = createAppStore();
  });

  test('should initialize without errors', () => {
    const state = store.getState();
    
    // Check initial state
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading.user).toBe(false);
    expect(state.loading.app).toBe(false);
    expect(state.error).toBeNull();
  });

  test('loadUser should not throw TypeError', async () => {
    // This was the function causing the TypeErrors
    await expect(store.getState().loadUser()).resolves.toBeUndefined();

    const state = store.getState();
    expect(state.user).toBeDefined();
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading.user).toBe(false);
  });

  test('setUser should not throw TypeError', () => {
    const mockUser = { id: 'test', name: 'Test User', email: 'test@example.com' };
    
    expect(() => {
      store.getState().setUser(mockUser);
    }).not.toThrow();
    
    const state = store.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  test('login should not throw TypeError', async () => {
    const credentials = { email: 'test@example.com', password: 'password' };

    await expect(store.getState().login(credentials)).resolves.toBeUndefined();

    const state = store.getState();
    expect(state.user).toBeDefined();
    expect(state.loading.user).toBe(false);
  });

  test('logout should not throw TypeError', async () => {
    expect(() => {
      store.getState().logout();
    }).not.toThrow();
    
    const state = store.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  test('setTheme should not throw TypeError', () => {
    expect(() => {
      store.getState().setTheme('dark');
    }).not.toThrow();
    
    const state = store.getState();
    expect(state.theme).toBe('dark');
    expect(state.preferences.theme).toBe('dark');
  });

  test('setError should not throw TypeError', () => {
    const error = new Error('Test error');
    
    expect(() => {
      store.getState().setError(error);
    }).not.toThrow();
    
    const state = store.getState();
    expect(state.error).toBe(error);
  });
});