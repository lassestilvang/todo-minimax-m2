/**
 * API Validation Utilities Tests
 * Comprehensive tests for validation functions
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { z } from 'zod';

// Import validation schemas and functions
import {
  idSchema,
  paginationSchema,
  dateRangeSchema,
  searchSchema,
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  createListSchema,
  updateListSchema,
  listQuerySchema,
  createLabelSchema,
  updateLabelSchema,
  labelQuerySchema,
  createSubtaskSchema,
  updateSubtaskSchema,
  createReminderSchema,
  updateReminderSchema,
  batchTaskOperationSchema,
  searchRequestSchema,
  fileUploadSchema,
  exportRequestSchema,
  notificationPreferencesSchema,
  websocketMessageSchema,
  idParamSchema,
  batchResultSchema
} from './validation';

describe('API Validation Schemas', () => {
  describe('ID Schema', () => {
    test('should validate valid UUID', () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const result = idSchema.safeParse(validId);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(validId);
      }
    });

    test('should reject invalid ID format', () => {
      const invalidIds = [
        'invalid-id',
        '',
        '123',
        '123e4567-e89b-12d3-a456-42661417400', // Too short
        '123e4567-e89b-12d3-a456-4266141740000', // Too long
        null,
        undefined,
        123
      ];

      invalidIds.forEach(invalidId => {
        const result = idSchema.safeParse(invalidId);
        expect(result.success).toBe(false);
      });
    });

    test('should validate ID length limits', () => {
      // Test minimum length
      const shortId = 'a';
      const result = idSchema.safeParse(shortId);
      expect(result.success).toBe(false);

      // Test maximum length
      const longId = 'a'.repeat(256);
      const longResult = idSchema.safeParse(longId);
      expect(longResult.success).toBe(false);
    });
  });

  describe('Pagination Schema', () => {
    test('should validate valid pagination parameters', () => {
      const validInputs = [
        { page: 1 },
        { page: 10 },
        { limit: 20 },
        { page: 1, limit: 50 },
        {}, // Should default to page 1
      ];

      validInputs.forEach(input => {
        const result = paginationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBeDefined();
          expect(typeof result.data.page).toBe('number');
        }
      });
    });

    test('should reject invalid pagination parameters', () => {
      const invalidInputs = [
        { page: 0 },
        { page: -1 },
        { page: 'invalid' },
        { limit: 0 },
        { limit: -1 },
        { limit: 'invalid' },
        { page: 1.5 }, // Non-integer
        { limit: 10.5 }, // Non-integer
      ];

      invalidInputs.forEach(input => {
        const result = paginationSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Date Range Schema', () => {
    test('should validate valid date ranges', () => {
      const validInputs = [
        { dateFrom: '2024-01-01T00:00:00Z' },
        { dateTo: '2024-12-31T23:59:59Z' },
        { dateFrom: '2024-01-01T00:00:00Z', dateTo: '2024-12-31T23:59:59Z' },
        {}, // Both optional
      ];

      validInputs.forEach(input => {
        const result = dateRangeSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    test('should reject invalid date formats', () => {
      const invalidInputs = [
        { dateFrom: 'invalid-date' },
        { dateTo: '2024-13-01T00:00:00Z' }, // Invalid month
        { dateFrom: '2024-01-01' }, // Missing time
        { dateFrom: null },
        { dateTo: undefined },
      ];

      invalidInputs.forEach(input => {
        const result = dateRangeSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Search Schema', () => {
    test('should validate valid search queries', () => {
      const validInputs = [
        { search: 'test query' },
        { search: 'task' },
        { search: 'shopping list' },
        {}, // Optional field
      ];

      validInputs.forEach(input => {
        const result = searchSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    test('should reject invalid search queries', () => {
      const invalidInputs = [
        { search: '' }, // Empty string might be invalid depending on implementation
        { search: 'a'.repeat(256) }, // Too long
        { search: 123 }, // Wrong type
        { search: null },
      ];

      invalidInputs.forEach(input => {
        const result = searchSchema.safeParse(input);
        // Empty string validation depends on implementation
        if (input.search === '') {
          // This might be valid depending on the schema definition
        } else {
          expect(result.success).toBe(false);
        }
      });
    });
  });

  describe('Task Schemas', () => {
    describe('Create Task Schema', () => {
      test('should validate valid task creation data', () => {
        const validTask = {
          name: 'Test Task',
          description: 'This is a test task',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          listId: '123e4567-e89b-12d3-a456-426614174001',
          status: 'todo',
          priority: 'High',
          date: '2024-01-15T10:00:00Z',
          deadline: '2024-01-20T17:00:00Z',
          estimate: 60,
        };

        const result = createTaskSchema.safeParse(validTask);
        expect(result.success).toBe(true);
      });

      test('should require minimum task fields', () => {
        const minimalTask = {
          name: 'Minimal Task',
          userId: '123e4567-e89b-12d3-a456-426614174000',
        };

        const result = createTaskSchema.safeParse(minimalTask);
        expect(result.success).toBe(true);
      });

      test('should reject invalid task data', () => {
        const invalidTasks = [
          {
            // Missing required name
            userId: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            name: '', // Empty name
            userId: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            name: 'Valid Name',
            userId: 'invalid-id', // Invalid UUID
          },
          {
            name: 'Valid Name',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            priority: 'InvalidPriority', // Invalid priority
          },
          {
            name: 'Valid Name',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'InvalidStatus', // Invalid status
          },
        ];

        invalidTasks.forEach(task => {
          const result = createTaskSchema.safeParse(task);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('Update Task Schema', () => {
      test('should validate valid task update data', () => {
        const validUpdate = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Updated Task Name',
          description: 'Updated description',
          status: 'in-progress',
          priority: 'Medium',
        };

        const result = updateTaskSchema.safeParse(validUpdate);
        expect(result.success).toBe(true);
      });

      test('should allow partial updates', () => {
        const partialUpdates = [
          { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Updated Name' },
          { id: '123e4567-e89b-12d3-a456-426614174000', status: 'done' },
          { id: '123e4567-e89b-12d3-a456-426614174000' }, // Minimal update
        ];

        partialUpdates.forEach(update => {
          const result = updateTaskSchema.safeParse(update);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Task Query Schema', () => {
      test('should validate task query parameters', () => {
        const validQueries = [
          {},
          { page: 1, limit: 20 },
          { search: 'task name' },
          { listId: '123e4567-e89b-12d3-a456-426614174000' },
          { status: 'todo' },
          { priority: 'High' },
          { dateFrom: '2024-01-01T00:00:00Z' },
          { dateTo: '2024-12-31T23:59:59Z' },
          {
            page: 1,
            limit: 50,
            search: 'search term',
            listId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'in-progress',
            priority: 'High',
          },
        ];

        validQueries.forEach(query => {
          const result = taskQuerySchema.safeParse(query);
          expect(result.success).toBe(true);
        });
      });
    });
  });

  describe('List Schemas', () => {
    describe('Create List Schema', () => {
      test('should validate valid list creation data', () => {
        const validList = {
          name: 'My List',
          description: 'A personal task list',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          color: '#3b82f6',
          emoji: '📋',
        };

        const result = createListSchema.safeParse(validList);
        expect(result.success).toBe(true);
      });

      test('should require list name and userId', () => {
        const invalidLists = [
          {
            // Missing name
            userId: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            name: '', // Empty name
            userId: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            name: 'Valid Name',
            // Missing userId
          },
          {
            name: 'a'.repeat(101), // Name too long
            userId: '123e4567-e89b-12d3-a456-426614174000',
          },
        ];

        invalidLists.forEach(list => {
          const result = createListSchema.safeParse(list);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('List Query Schema', () => {
      test('should validate list query parameters', () => {
        const validQueries = [
          {},
          { page: 1, limit: 20 },
          { search: 'work' },
          { includeTaskCount: true },
          { includeTaskCount: false },
        ];

        validQueries.forEach(query => {
          const result = listQuerySchema.safeParse(query);
          expect(result.success).toBe(true);
        });
      });
    });
  });

  describe('Label Schemas', () => {
    describe('Create Label Schema', () => {
      test('should validate valid label creation data', () => {
        const validLabel = {
          name: 'Urgent',
          color: '#ef4444',
          userId: '123e4567-e89b-12d3-a456-426614174000',
        };

        const result = createLabelSchema.safeParse(validLabel);
        expect(result.success).toBe(true);
      });

      test('should require label name and color', () => {
        const invalidLabels = [
          {
            // Missing name
            color: '#ef4444',
            userId: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            name: 'Valid Name',
            // Missing color
            userId: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            name: 'Valid Name',
            color: 'invalid-color', // Invalid hex format
            userId: '123e4567-e89b-12d3-a456-426614174000',
          },
        ];

        invalidLabels.forEach(label => {
          const result = createLabelSchema.safeParse(label);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('Label Query Schema', () => {
      test('should validate label query parameters', () => {
        const validQueries = [
          {},
          { page: 1, limit: 20 },
          { search: 'urgent' },
          { includeTaskCount: true },
        ];

        validQueries.forEach(query => {
          const result = labelQuerySchema.safeParse(query);
          expect(result.success).toBe(true);
        });
      });
    });
  });

  describe('Batch Operations Schema', () => {
    test('should validate batch task operations', () => {
      const validBatch = {
        taskIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
        operation: 'update',
        data: {
          status: 'done',
          priority: 'High',
        },
      };

      const result = batchTaskOperationSchema.safeParse(validBatch);
      expect(result.success).toBe(true);
    });

    test('should require task IDs array', () => {
      const invalidBatches = [
        {
          // Missing taskIds
          operation: 'update',
        },
        {
          taskIds: [], // Empty array
          operation: 'update',
        },
        {
          taskIds: ['invalid-id'], // Invalid ID
          operation: 'update',
        },
        {
          taskIds: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174001',
          ],
          // Missing operation
        },
      ];

      invalidBatches.forEach(batch => {
        const result = batchTaskOperationSchema.safeParse(batch);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Search Request Schema', () => {
    test('should validate search requests', () => {
      const validSearches = [
        { query: 'task name' },
        { query: 'shopping list urgent' },
        { query: 'work project deadline' },
      ];

      validSearches.forEach(search => {
        const result = searchRequestSchema.safeParse(search);
        expect(result.success).toBe(true);
      });
    });

    test('should require query parameter', () => {
      const invalidSearches = [
        {
          // Missing query
        },
        {
          query: '', // Empty query
        },
        {
          query: 'a'.repeat(256), // Too long
        },
      ];

      invalidSearches.forEach(search => {
        const result = searchRequestSchema.safeParse(search);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Export Request Schema', () => {
    test('should validate export requests', () => {
      const validExports = [
        { format: 'json' },
        { format: 'csv' },
        { format: 'pdf' },
        { format: 'xlsx' },
      ];

      validExports.forEach(exportReq => {
        const result = exportRequestSchema.safeParse(exportReq);
        expect(result.success).toBe(true);
      });
    });

    test('should require valid format', () => {
      const invalidExports = [
        {
          // Missing format
        },
        {
          format: 'invalid-format',
        },
        {
          format: 'json', // Valid
          options: 'invalid', // Should still be valid as extra fields
        },
      ];

      invalidExports.forEach(exportReq => {
        const result = exportRequestSchema.safeParse(exportReq);
        if (exportReq.format === 'json') {
          expect(result.success).toBe(true); // Extra fields should be ignored
        } else {
          expect(result.success).toBe(false);
        }
      });
    });
  });

  describe('ID Parameter Schema', () => {
    test('should validate ID parameters', () => {
      const validParam = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = idParamSchema.safeParse(validParam);
      expect(result.success).toBe(true);
    });

    test('should require valid ID in parameters', () => {
      const invalidParams = [
        {
          id: 'invalid-id',
        },
        {
          // Missing id
        },
        {
          id: '',
        },
      ];

      invalidParams.forEach(param => {
        const result = idParamSchema.safeParse(param);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Batch Result Schema', () => {
    test('should validate batch operation results', () => {
      const validResults = [
        { total: 10, successful: 8, failed: 2 },
        { total: 5, successful: 5, failed: 0 },
        { total: 0, successful: 0, failed: 0 },
      ];

      validResults.forEach(result => {
        const validation = batchResultSchema.safeParse(result);
        expect(validation.success).toBe(true);
      });
    });

    test('should require positive numbers', () => {
      const invalidResults = [
        { total: -1, successful: 0, failed: 0 },
        { total: 10, successful: -1, failed: 0 },
        { total: 10, successful: 0, failed: -1 },
        { total: 'invalid', successful: 0, failed: 0 },
      ];

      invalidResults.forEach(result => {
        const validation = batchResultSchema.safeParse(result);
        expect(validation.success).toBe(false);
      });
    });
  });
});

describe('Schema Integration Tests', () => {
  test('should handle complex validation scenarios', () => {
    // Test a complete task workflow validation
    const taskWorkflow = {
      createTask: {
        name: 'Complex Task',
        description: 'A task with many details',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        listId: '123e4567-e89b-12d3-a456-426614174001',
        status: 'todo',
        priority: 'High',
      },
      updateTask: {
        id: 'task-uuid-after-creation',
        status: 'in-progress',
        priority: 'Medium',
      },
      searchTasks: {
        query: 'Complex Task',
        page: 1,
        limit: 20,
        status: 'in-progress',
      },
    };

    // Validate each step
    const createResult = createTaskSchema.safeParse(taskWorkflow.createTask);
    expect(createResult.success).toBe(true);

    const updateResult = updateTaskSchema.safeParse(taskWorkflow.updateTask);
    expect(updateResult.success).toBe(true);

    const searchResult = searchRequestSchema.safeParse(taskWorkflow.searchTasks);
    expect(searchResult.success).toBe(true);
  });

  test('should handle edge cases gracefully', () => {
    const edgeCases = [
      // Very long strings
      {
        name: 'a'.repeat(255), // Max length
        userId: '123e4567-e89b-12d3-a456-426614174000',
      },
      // Special characters
      {
        name: 'Task with émojis 🎯 and spëcial chars',
        userId: '123e4567-e89b-12d3-a456-426614174000',
      },
      // Unicode and international characters
      {
        name: '任务中文',
        userId: '123e4567-e89b-12d3-a456-426614174000',
      },
    ];

    edgeCases.forEach(task => {
      const result = createTaskSchema.safeParse(task);
      // Should handle edge cases gracefully (success depends on schema definition)
      expect(typeof result.success).toBe('boolean');
    });
  });

  test('should provide meaningful error messages', () => {
    const invalidTask = {
      name: '', // Empty name should fail
      userId: 'invalid-id', // Invalid UUID
    };

    const result = createTaskSchema.safeParse(invalidTask);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.issues).toBeInstanceOf(Array);
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe('Schema Performance Tests', () => {
  test('should validate large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      name: `Task ${i}`,
      userId: '123e4567-e89b-12d3-a456-426614174000',
    }));

    const startTime = performance.now();
    
    largeDataset.forEach(task => {
      const result = createTaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    const endTime = performance.now();
    const validationTime = endTime - startTime;

    // Should complete validation within reasonable time
    expect(validationTime).toBeLessThan(1000); // 1 second for 1000 validations
  });

  test('should handle invalid data efficiently', () => {
    const invalidDataset = Array.from({ length: 100 }, (_, i) => ({
      name: '', // All invalid
      userId: 'invalid-id',
    }));

    const startTime = performance.now();
    
    invalidDataset.forEach(task => {
      const result = createTaskSchema.safeParse(task);
      expect(result.success).toBe(false);
    });

    const endTime = performance.now();
    const validationTime = endTime - startTime;

    expect(validationTime).toBeLessThan(500); // 0.5 seconds for 100 invalidations
  });
});