/**
 * Task Subtasks API Route Handler
 * 
 * Handles subtask operations for individual tasks
 * GET /api/tasks/[id]/subtasks - Get subtasks for a task
 * POST /api/tasks/[id]/subtasks - Create new subtask
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAPI } from '../../../../../lib/db/api';
import { 
  withAuth, 
  withRateLimit, 
  withErrorHandling 
} from '../../../_lib/middleware';
import { 
  createSuccessResponse,
  createValidationError,
  createNotFoundError 
} from '../../../_lib/utils';
import { 
  createSubtaskSchema,
  idParamSchema 
} from '../../../_lib/validation';
import type { ApiContext } from '../../../_lib/types';

// Apply middleware stack
const handler = withErrorHandling(
  withRateLimit(
    withAuth(async (req: NextRequest, context: ApiContext) => {
      const { id: taskId } = await getTaskId(req);
      
      if (req.method === 'GET') {
        return handleGetSubtasks(req, context, taskId);
      } else if (req.method === 'POST') {
        return handleCreateSubtask(req, context, taskId);
      } else {
        return NextResponse.json({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed`,
            statusCode: 405
          }
        }, { status: 405 });
      }
    })
  )
);

export { handler as GET, handler as POST };

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract and validate task ID from request
 */
async function getTaskId(req: NextRequest): Promise<{ id: string }> {
  const segments = req.nextUrl.pathname.split('/');
  const taskId = segments[segments.length - 3]; // tasks/[id]/subtasks
  
  const validation = idParamSchema.safeParse({ id: taskId });
  if (!validation.success) {
    const validationError = validation.error.errors[0];
    const error = createValidationError(
      validationError.path.join('.'),
      validationError.message,
      validationError.input,
      'INVALID_TASK_ID'
    );
    
    throw new Error(JSON.stringify(error));
  }

  return { id: validation.data.id };
}

// =============================================================================
// GET /api/tasks/[id]/subtasks - Get subtasks for a task
// =============================================================================

async function handleGetSubtasks(req: NextRequest, context: ApiContext, taskId: string): Promise<NextResponse> {
  try {
    // Verify task exists and belongs to user
    const task = await dbAPI.getTaskWithDetails(taskId);
    if (!task) {
      const error = createNotFoundError('Task', taskId);
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    if (task.userId !== context.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this task',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      }, { status: 403 });
    }

    // Get subtasks
    const subtasks = await dbAPI.getSubtasks(taskId);

    return createSuccessResponse({
      subtasks,
      total: subtasks.length,
      completed: subtasks.filter(st => st.isCompleted).length,
      pending: subtasks.filter(st => !st.isCompleted).length
    }, {
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Task Subtasks API] Error fetching subtasks:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch subtasks',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// =============================================================================
// POST /api/tasks/[id]/subtasks - Create new subtask
// =============================================================================

async function handleCreateSubtask(req: NextRequest, context: ApiContext, taskId: string): Promise<NextResponse> {
  try {
    // Verify task exists and belongs to user
    const task = await dbAPI.getTaskWithDetails(taskId);
    if (!task) {
      const error = createNotFoundError('Task', taskId);
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    if (task.userId !== context.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this task',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = createSubtaskSchema.safeParse({ ...body, taskId });

    if (!validation.success) {
      const validationError = validation.error.errors[0];
      const error = createValidationError(
        validationError.path.join('.'),
        validationError.message,
        validationError.input,
        'VALIDATION_ERROR'
      );
      
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const { name, position } = validation.data;

    // Get current subtasks to determine next position
    const existingSubtasks = await dbAPI.getSubtasks(taskId);
    const nextPosition = position || existingSubtasks.length;

    // Create subtask
    const newSubtask = await dbAPI.createSubtask({
      name,
      taskId,
      position: nextPosition
    });

    return createSuccessResponse({
      subtask: newSubtask
    }, {
      action: 'created',
      timestamp: new Date().toISOString()
    }, 201);

  } catch (error) {
    console.error('[Task Subtasks API] Error creating subtask:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create subtask',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}