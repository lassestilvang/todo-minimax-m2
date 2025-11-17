import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseAPI } from '@/lib/db/api';
import { z } from 'zod';

// Validation schemas
const bulkTaskOperationSchema = z.object({
  operation: z.enum(['update', 'delete', 'move', 'duplicate']),
  taskIds: z.array(z.string()).min(1),
  data: z.object({
    // For update operation
    status: z.enum(['todo', 'in-progress', 'completed', 'archived']).optional(),
    priority: z.enum(['none', 'low', 'medium', 'high']).optional(),
    listId: z.string().optional(),
    
    // For move operation
    newListId: z.string().optional(),
    newPosition: z.number().optional(),
    
    // Common fields
    dueDate: z.string().datetime().nullable().optional(),
  }).optional(),
});

/**
 * POST /api/tasks/bulk - Bulk operations on multiple tasks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedData = bulkTaskOperationSchema.parse(body);
    
    const { operation, taskIds, data } = parsedData;
    
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    let results: any = {};
    
    switch (operation) {
      case 'update':
        if (!data) {
          throw new Error('Update data is required for update operation');
        }
        
        const updateResults = [];
        for (const taskId of taskIds) {
          try {
            const updateData = {
              id: taskId,
              status: data.status,
              priority: data.priority,
              listId: data.listId,
              dueDate: data.dueDate !== undefined ? 
                (data.dueDate ? new Date(data.dueDate) : undefined) : 
                undefined,
            };
            
            const updatedTask = await dbAPI.updateTask(updateData);
            updateResults.push({
              taskId,
              success: !!updatedTask,
              data: updatedTask,
            });
          } catch (error) {
            updateResults.push({
              taskId,
              success: false,
              error: error instanceof Error ? error.message : 'Update failed',
            });
          }
        }
        
        results = {
          operation: 'update',
          totalTasks: taskIds.length,
          successful: updateResults.filter(r => r.success).length,
          failed: updateResults.filter(r => !r.success).length,
          results: updateResults,
        };
        break;
        
      case 'delete':
        const deleteResults = [];
        for (const taskId of taskIds) {
          try {
            const deleted = await dbAPI.deleteTask(taskId);
            deleteResults.push({
              taskId,
              success: !!deleted,
            });
          } catch (error) {
            deleteResults.push({
              taskId,
              success: false,
              error: error instanceof Error ? error.message : 'Delete failed',
            });
          }
        }
        
        results = {
          operation: 'delete',
          totalTasks: taskIds.length,
          successful: deleteResults.filter(r => r.success).length,
          failed: deleteResults.filter(r => !r.success).length,
          results: deleteResults,
        };
        break;
        
      case 'move':
        if (!data?.newListId) {
          throw new Error('newListId is required for move operation');
        }
        
        const moveResults = [];
        for (const taskId of taskIds) {
          try {
            const updateData = {
              id: taskId,
              listId: data.newListId,
              position: data.newPosition,
            };
            
            const movedTask = await dbAPI.updateTask(updateData);
            moveResults.push({
              taskId,
              success: !!movedTask,
              data: movedTask,
            });
          } catch (error) {
            moveResults.push({
              taskId,
              success: false,
              error: error instanceof Error ? error.message : 'Move failed',
            });
          }
        }
        
        results = {
          operation: 'move',
          totalTasks: taskIds.length,
          successful: moveResults.filter(r => r.success).length,
          failed: moveResults.filter(r => !r.success).length,
          results: moveResults,
          newListId: data.newListId,
        };
        break;
        
      case 'duplicate':
        const duplicateResults = [];
        for (const taskId of taskIds) {
          try {
            // Get original task
            const originalTask = await dbAPI.getTaskWithDetails(taskId);
            if (!originalTask) {
              throw new Error('Original task not found');
            }
            
            // Create duplicate
            const duplicateData = {
              name: `${originalTask.name} (Copy)`,
              description: originalTask.description,
              priority: originalTask.priority,
              status: 'todo', // Always start duplicated tasks as todo
              dueDate: originalTask.dueDate,
              estimate: originalTask.estimate,
              actualTime: originalTask.actualTime,
              isRecurring: originalTask.isRecurring,
              recurringPattern: originalTask.recurringPattern,
              userId: originalTask.userId,
              listId: originalTask.listId,
              parentTaskId: originalTask.parentTaskId,
              position: originalTask.position + 1,
            };
            
            const duplicatedTask = await dbAPI.createTask(duplicateData);
            duplicateResults.push({
              originalTaskId: taskId,
              success: !!duplicatedTask,
              data: duplicatedTask,
            });
          } catch (error) {
            duplicateResults.push({
              originalTaskId: taskId,
              success: false,
              error: error instanceof Error ? error.message : 'Duplicate failed',
            });
          }
        }
        
        results = {
          operation: 'duplicate',
          totalTasks: taskIds.length,
          successful: duplicateResults.filter(r => r.success).length,
          failed: duplicateResults.filter(r => !r.success).length,
          results: duplicateResults,
        };
        break;
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    
    const response = {
      success: true,
      data: results,
      message: `Bulk ${operation} operation completed`,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error performing bulk task operation:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'BULK_TASK_OPERATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to perform bulk operation',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 400 });
  }
}