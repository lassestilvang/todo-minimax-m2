/**
 * Test Utilities - Common utilities for testing
 */

import { expect } from 'bun:test';

// Async testing utilities
export async function waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) return;
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

// DOM testing utilities
export function createMockElement(tag = 'div', props = {}) {
  const element = {
    tagName: tag.toUpperCase(),
    attributes: {},
    children: [],
    textContent: '',
    className: '',
    style: {},
    dataset: {},
    ...props,
  };
  
  // Add event listener functionality
  element.addEventListener = () => {};
  element.removeEventListener = () => {};
  element.dispatchEvent = () => true;
  
  // Add classList functionality
  element.classList = {
    add: (cls: string) => {
      if (!element.className.includes(cls)) {
        element.className = element.className ? `${element.className} ${cls}` : cls;
      }
    },
    remove: (cls: string) => {
      element.className = element.className.replace(new RegExp(`\\b${cls}\\b`, 'g'), '').trim();
    },
    toggle: (cls: string) => {
      if (element.className.includes(cls)) {
        element.classList.remove(cls);
      } else {
        element.classList.add(cls);
      }
    },
    contains: (cls: string) => element.className.includes(cls),
  };
  
  // Add querySelector functionality
  element.querySelector = () => null;
  element.querySelectorAll = () => [];
  
  return element as any;
}

// Mock React components
export function createMockReactComponent(name: string, props = {}) {
  return {
    displayName: name,
    props,
    type: 'function',
    $$typeof: Symbol.for('react.element'),
  };
}

// Mock hooks
export function createMockHook(name: string, returnValue: any) {
  return {
    hookName: name,
    implementation: () => returnValue,
  };
}

// Mock store utilities
export function createMockStore(initialState = {}) {
  let state = { ...initialState };
  const listeners: Function[] = [];
  
  return {
    getState: () => state,
    setState: (newState: any) => {
      state = { ...state, ...newState };
      listeners.forEach(listener => listener());
    },
    subscribe: (listener: Function) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
    reset: () => {
      state = { ...initialState };
    },
  };
}

// Mock API utilities
export function createMockApiResponse(data: any, status = 200, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Map(Object.entries(headers)),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

export function createMockApiError(message: string, status = 500) {
  return {
    status,
    message,
    name: 'ApiError',
    ok: false,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
  };
}

// Database testing utilities
export function createMockDatabase() {
  const tables: Record<string, any[]> = {};
  
  return {
    query: (sql: string, params: any[] = []) => {
      // Simple mock implementation
      const tableName = sql.match(/FROM\s+(\w+)/i)?.[1];
      if (tableName && tables[tableName]) {
        return tables[tableName];
      }
      return [];
    },
    insert: (table: string, data: any) => {
      if (!tables[table]) tables[table] = [];
      const record = { id: Date.now().toString(), ...data };
      tables[table].push(record);
      return record;
    },
    update: (table: string, id: string, data: any) => {
      const tableData = tables[table] || [];
      const index = tableData.findIndex(record => record.id === id);
      if (index > -1) {
        tableData[index] = { ...tableData[index], ...data };
        return tableData[index];
      }
      return null;
    },
    delete: (table: string, id: string) => {
      const tableData = tables[table] || [];
      const index = tableData.findIndex(record => record.id === id);
      if (index > -1) {
        tableData.splice(index, 1);
        return true;
      }
      return false;
    },
    clear: (table: string) => {
      tables[table] = [];
    },
    getTable: (table: string) => tables[table] || [],
  };
}

// Assertion utilities
export function assertString(value: any, fieldName: string = 'value') {
  expect(typeof value).toBe('string');
  expect(value).not.toBe('');
}

export function assertNumber(value: any, fieldName: string = 'value') {
  expect(typeof value).toBe('number');
  expect(Number.isFinite(value)).toBe(true);
}

export function assertDate(value: any, fieldName: string = 'value') {
  expect(value).toBeInstanceOf(Date);
}

export function assertObject(value: any, fieldName: string = 'value') {
  expect(value).toBeInstanceOf(Object);
  expect(value).not.toBeNull();
}

export function assertArray(value: any, fieldName: string = 'value') {
  expect(Array.isArray(value)).toBe(true);
}

// Performance testing utilities
export function measurePerformance(fn: Function, iterations = 1): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return end - start;
}

// Mock timers
export function createMockTimers() {
  const timers: { [key: number]: NodeJS.Timeout } = {};
  let timerId = 0;
  
  global.setTimeout = (callback: Function, delay?: number) => {
    const id = ++timerId;
    timers[id] = setTimeout(callback, delay);
    return id;
  };
  
  global.clearTimeout = (id: number) => {
    if (timers[id]) {
      clearTimeout(timers[id]);
      delete timers[id];
    }
  };
  
  return {
    clearAll: () => {
      Object.keys(timers).forEach(id => clearTimeout(timers[parseInt(id)]));
      Object.keys(timers).forEach(id => delete timers[parseInt(id)]);
    },
  };
}

// File system utilities
export function createMockFileSystem() {
  const files: { [path: string]: string } = {};
  const directories: { [path: string]: boolean } = {};
  
  return {
    readFile: (path: string) => {
      return files[path] || null;
    },
    writeFile: (path: string, content: string) => {
      files[path] = content;
    },
    deleteFile: (path: string) => {
      delete files[path];
    },
    exists: (path: string) => {
      return files[path] !== undefined || directories[path] !== undefined;
    },
    isFile: (path: string) => {
      return files[path] !== undefined;
    },
    isDirectory: (path: string) => {
      return directories[path] === true;
    },
    createDirectory: (path: string) => {
      directories[path] = true;
    },
    listFiles: (directory: string) => {
      return Object.keys(files).filter(path => path.startsWith(directory));
    },
    clear: () => {
      Object.keys(files).forEach(path => delete files[path]);
      Object.keys(directories).forEach(path => delete directories[path]);
    },
  };
}

// Validation utilities
export function validateRequiredFields(obj: any, fields: string[]) {
  fields.forEach(field => {
    expect(obj).toHaveProperty(field);
    expect(obj[field]).not.toBeNull();
    expect(obj[field]).not.toBeUndefined();
  });
}

export function validateOptionalFields(obj: any, fields: string[], defaults: any = {}) {
  fields.forEach(field => {
    if (obj[field] === undefined || obj[field] === null) {
      expect(obj[field]).toBe(defaults[field]);
    }
  });
}

// Export all utilities
export const testUtils = {
  waitFor,
  createMockElement,
  createMockReactComponent,
  createMockHook,
  createMockStore,
  createMockApiResponse,
  createMockApiError,
  createMockDatabase,
  createMockTimers,
  createMockFileSystem,
  assertString,
  assertNumber,
  assertDate,
  assertObject,
  assertArray,
  measurePerformance,
  validateRequiredFields,
  validateOptionalFields,
};

export default testUtils;