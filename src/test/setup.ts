/**
 * Test Setup - Global test configuration for Bun Test
 * This file is run before each test file
 */

import { expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { TextEncoder, TextDecoder } from 'util';

// Set up global text encoder/decoder for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock localStorage for client-side tests
const localStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
};

global.localStorage = localStorageMock as any;

// Mock window object for client-side tests
(global as any).window = {
  localStorage: localStorageMock,
  document: {
    createElement: () => ({
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
      },
    }),
    documentElement: {
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
      },
    },
  },
  matchMedia: (query: string) => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
  URL: {
    createObjectURL: () => 'mock-url',
    revokeObjectURL: () => {},
  },
};

// Mock console for tests (optional - reduces noise)
global.console = {
  ...console,
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.BUN_ENV = 'test';

// Test database setup
export const TEST_DATABASE_PATH = './test-data/test.db';

// Test data fixtures
export const TEST_DATA = {
  users: [
    {
      id: 'test-user-1',
      name: 'Test User 1',
      email: 'test1@example.com',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'test-user-2',
      name: 'Test User 2',
      email: 'test2@example.com',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ],
  tasks: [
    {
      id: 'task-1',
      name: 'Test Task 1',
      description: 'This is a test task',
      userId: 'test-user-1',
      listId: 'list-1',
      status: 'todo',
      priority: 'Medium',
      date: new Date('2024-01-15'),
      deadline: new Date('2024-01-20'),
      estimate: 60,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'task-2',
      name: 'Test Task 2',
      description: 'Another test task',
      userId: 'test-user-1',
      listId: 'list-1',
      status: 'in-progress',
      priority: 'High',
      date: new Date('2024-01-10'),
      deadline: new Date('2024-01-25'),
      estimate: 120,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-10'),
    },
    {
      id: 'task-3',
      name: 'Test Task 3',
      description: 'Completed test task',
      userId: 'test-user-1',
      listId: 'list-2',
      status: 'done',
      priority: 'Low',
      date: new Date('2024-01-05'),
      deadline: new Date('2024-01-15'),
      estimate: 30,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    },
  ],
  lists: [
    {
      id: 'list-1',
      name: 'Work List',
      description: 'Work-related tasks',
      userId: 'test-user-1',
      color: '#3b82f6',
      icon: 'briefcase',
      taskCount: 2,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'list-2',
      name: 'Personal List',
      description: 'Personal tasks',
      userId: 'test-user-1',
      color: '#10b981',
      icon: 'user',
      taskCount: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ],
  labels: [
    {
      id: 'label-1',
      name: 'Urgent',
      color: '#ef4444',
      userId: 'test-user-1',
      taskCount: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'label-2',
      name: 'Important',
      color: '#f59e0b',
      userId: 'test-user-1',
      taskCount: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ],
};

// Utility functions for tests
export function createTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createTestDate(offsetDays: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock file system for testing file uploads
export const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

// Cleanup function to run after each test
export function cleanupTestEnvironment() {
  // Reset global state
  Object.keys(localStorageMock).forEach(key => {
    if (key !== 'getItem') {
      delete (localStorageMock as any)[key];
    }
  });
  
  // Reset any test databases
  // This would be implemented based on actual database cleanup needs
}

// Extend expect with custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveBeenCalledWithProps(received, expectedProps) {
    const callCount = received.mock.calls.length;
    if (callCount === 0) {
      return {
        message: () => `Function was never called, expected to be called with props: ${JSON.stringify(expectedProps)}`,
        pass: false,
      };
    }

    const lastCall = received.mock.calls[callCount - 1];
    const calledWithProps = lastCall[0];

    const pass = this.equals(calledWithProps, expectedProps);
    if (pass) {
      return {
        message: () => `Expected function not to be called with props: ${JSON.stringify(expectedProps)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected function to be called with props: ${JSON.stringify(expectedProps)}, but was called with: ${JSON.stringify(calledWithProps)}`,
        pass: false,
      };
    }
  },
});

// Global test lifecycle hooks
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Set up test database
  // await setupTestDatabase();
  
  console.log('✅ Test environment setup complete');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test database
  // await cleanupTestDatabase();
  
  console.log('✅ Test environment cleanup complete');
});

beforeEach(() => {
  // Reset mocks and state before each test
  cleanupTestEnvironment();
});

afterEach(() => {
  // Cleanup after each test
  // Any test-specific cleanup can go here
});

// Export types for test files
export type { TestData } from './types';