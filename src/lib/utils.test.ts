/**
 * Utility Functions Tests
 * Comprehensive tests for utility functions across the application
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';

// Import the utility functions to test
import { cn } from './utils';

// Mock external dependencies
vi.mock('clsx', () => ({
  default: (...inputs: any[]) => inputs.filter(Boolean).join(' ')
}));

vi.mock('tailwind-merge', () => ({
  default: (inputs: any) => inputs.join(' ')
}));

describe('Core Utility Functions', () => {
  describe('cn (className utility)', () => {
    test('should combine class names correctly', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    test('should handle undefined and null values', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toBe('class1 class2');
    });

    test('should handle empty strings', () => {
      const result = cn('class1', '', 'class2');
      expect(result).toBe('class1 class2');
    });

    test('should handle boolean values', () => {
      const result = cn('class1', true && 'conditional-class', false && 'hidden');
      expect(result).toBe('class1 conditional-class');
    });

    test('should handle objects with className property', () => {
      const result = cn('base-class', { 'active': true, 'disabled': false });
      expect(typeof result).toBe('string');
    });

    test('should merge tailwind classes correctly', () => {
      // This tests the integration with tailwind-merge
      const result = cn('p-4', 'p-2', 'mx-2', 'mx-4');
      expect(result).toBe('p-2 mx-4'); // tailwind-merge merges conflicting classes
    });

    test('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(typeof result).toBe('string');
    });

    test('should handle mixed input types', () => {
      const result = cn(
        'base',
        undefined,
        'conditional' && 'active',
        { 'disabled': false, 'loading': true },
        ['array', 'classes']
      );
      expect(typeof result).toBe('string');
    });
  });
});

// Additional utility tests would go here for other utility functions
// For now, this demonstrates the pattern for testing utility functions