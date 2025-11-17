/**
 * Individual Label API Route Handler
 * 
 * Handles operations on individual labels
 * GET /api/labels/[id] - Get specific label
 * PUT /api/labels/[id] - Update label
 * DELETE /api/labels/[id] - Delete label
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAPI } from '../../../../lib/db/api';
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
  updateLabelSchema,
  idParamSchema 
} from '../../../_lib/validation';
import type { ApiContext } from '../../../_lib/types';

// Apply middleware stack
const handler = withErrorHandling(
  withRateLimit(
    withAuth(async (req: NextRequest, context: ApiContext) => {
      const { id } = await getLabelId(req);
      
      if (req.method === 'GET') {
        return handleGetLabel(req, context, id);
      } else if (req.method === 'PUT') {
        return handleUpdateLabel(req, context, id);
      } else if (req.method === 'DELETE') {
        return handleDeleteLabel(req, context, id);
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

export { handler as GET, handler as PUT, handler as DELETE };

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract and validate label ID from request
 */
async function getLabelId(req: NextRequest): Promise<{ id: string }> {
  const segments = req.nextUrl.pathname.split('/');
  const labelId = segments[segments.length - 1];
  
  const validation = idParamSchema.safeParse({ id: labelId });
  if (!validation.success) {
    const validationError = validation.error.errors[0];
    const error = createValidationError(
      validationError.path.join('.'),
      validationError.message,
      validationError.input,
      'INVALID_LABEL_ID'
    );
    
    throw new Error(JSON.stringify(error));
  }

  return { id: validation.data.id };
}

// =============================================================================
// GET /api/labels/[id] - Get specific label with usage statistics
// =============================================================================

async function handleGetLabel(req: NextRequest, context: ApiContext, labelId: string): Promise<NextResponse> {
  try {
    // Get label with task counts
    const labels = await dbAPI.getUserLabelsWithCounts(context.userId);
    const label = labels.find(l => l.id === labelId);
    
    if (!label) {
      const error = createNotFoundError('Label', labelId);
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    // Verify label belongs to user
    if (label.userId !== context.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this label',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      }, { status: 403 });
    }

    // Get usage statistics
    const usageStats = await getLabelUsageStats(labelId, context.userId);

    // Calculate additional statistics
    const totalLabels = labels.length;
    const totalTasks = labels.reduce((sum, l) => sum + (l.taskCount || 0), 0);
    
    const stats = {
      ...label,
      usagePercentage: totalTasks > 0 ? Math.round((label.taskCount / totalTasks) * 100) : 0,
      rankByUsage: labels
        .sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0))
        .findIndex(l => l.id === labelId) + 1,
      ...usageStats
    };

    // Return label details
    return createSuccessResponse({
      label: stats
    }, {
      action: 'retrieved',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Label API] Error fetching label:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch label',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// =============================================================================
// PUT /api/labels/[id] - Update label
// =============================================================================

async function handleUpdateLabel(req: NextRequest, context: ApiContext, labelId: string): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validation = updateLabelSchema.safeParse(body);

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

    const updateData = validation.data;

    // Verify label exists and belongs to user
    const labels = await dbAPI.getUserLabelsWithCounts(context.userId);
    const existingLabel = labels.find(l => l.id === labelId);
    
    if (!existingLabel) {
      const error = createNotFoundError('Label', labelId);
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingLabel.name) {
      const duplicateName = labels.find(label => 
        label.id !== labelId && 
        label.name.toLowerCase() === updateData.name!.toLowerCase()
      );

      if (duplicateName) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A label with this name already exists',
            field: 'name',
            statusCode: 400,
            timestamp: new Date().toISOString()
          }
        }, { status: 400 });
      }
    }

    // Check for duplicate icon/color combinations if being updated
    if ((updateData.icon !== undefined || updateData.color !== undefined)) {
      const newIcon = updateData.icon || existingLabel.icon;
      const newColor = updateData.color || existingLabel.color;
      
      const duplicateCombo = labels.find(label => 
        label.id !== labelId && 
        label.icon === newIcon && 
        label.color === newColor
      );

      if (duplicateCombo) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A label with this icon and color combination already exists',
            statusCode: 400,
            timestamp: new Date().toISOString()
          }
        }, { status: 400 });
      }
    }

    // Prepare update data
    const dbUpdateData: any = {};
    
    if (updateData.name !== undefined) dbUpdateData.name = updateData.name;
    if (updateData.color !== undefined) dbUpdateData.color = updateData.color;
    if (updateData.icon !== undefined) dbUpdateData.icon = updateData.icon;

    // Update label in database
    const updatedLabel = await dbAPI.updateLabel(labelId, dbUpdateData, context.userId);

    // Get the updated label with task counts
    const updatedLabels = await dbAPI.getUserLabelsWithCounts(context.userId);
    const completeLabel = updatedLabels.find(l => l.id === labelId);

    // Invalidate cache
    // await invalidateCacheByTag(`user:${context.userId}:labels`);
    // await invalidateCacheByTag(`label:${labelId}`);

    // Return success response
    return createSuccessResponse({
      label: completeLabel
    }, {
      action: 'updated',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Label API] Error updating label:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update label',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// =============================================================================
// DELETE /api/labels/[id] - Delete label
// =============================================================================

async function handleDeleteLabel(req: NextRequest, context: ApiContext, labelId: string): Promise<NextResponse> {
  try {
    // Verify label exists and belongs to user
    const labels = await dbAPI.getUserLabelsWithCounts(context.userId);
    const existingLabel = labels.find(l => l.id === labelId);
    
    if (!existingLabel) {
      const error = createNotFoundError('Label', labelId);
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    // Check if label is being used
    if (existingLabel.taskCount > 0) {
      const url = new URL(req.url);
      const forceDelete = url.searchParams.get('force') === 'true';
      
      if (!forceDelete) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Label is used by ${existingLabel.taskCount} tasks. Use ?force=true to remove from all tasks and delete.`,
            statusCode: 400,
            timestamp: new Date().toISOString()
          }
        }, { status: 400 });
      }

      // Remove label from all tasks that use it
      const tasks = await dbAPI.getUserTasks(context.userId, {});
      const tasksWithLabel = tasks.filter(task => 
        task.labels && task.labels.some((label: any) => label.id === labelId)
      );

      for (const task of tasksWithLabel) {
        await dbAPI.removeLabelFromTask(task.id, labelId);
      }
    }

    // Delete the label
    await dbAPI.deleteLabel(labelId, context.userId);

    // Invalidate cache
    // await invalidateCacheByTag(`user:${context.userId}:labels`);
    // await invalidateCacheByTag(`label:${labelId}`);
    // await invalidateCacheByTag(`user:${context.userId}:tasks`);

    // Return success response
    return createSuccessResponse({
      message: 'Label deleted successfully',
      deletedLabelId: labelId,
      removedFromTasks: existingLabel.taskCount
    }, {
      action: 'deleted',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Label API] Error deleting label:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete label',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get detailed usage statistics for a label
 */
async function getLabelUsageStats(labelId: string, userId: string) {
  try {
    // Get all tasks with this label
    const tasks = await dbAPI.getUserTasks(userId, {});
    const tasksWithLabel = tasks.filter(task => 
      task.labels && task.labels.some((label: any) => label.id === labelId)
    );

    // Calculate usage by status
    const usageByStatus = tasksWithLabel.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate usage by priority
    const usageByPriority = tasksWithLabel.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate usage by list
    const usageByList = tasksWithLabel.reduce((acc, task) => {
      const listId = task.listId;
      if (!acc[listId]) {
        acc[listId] = {
          listId,
          listName: task.list?.name || 'Unknown List',
          count: 0
        };
      }
      acc[listId].count++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate recent usage (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    const recentlyUsed = tasksWithLabel.filter(task => 
      new Date(task.updatedAt) > sevenDaysAgo
    ).length;

    return {
      totalTasks: tasksWithLabel.length,
      usageByStatus,
      usageByPriority,
      usageByList: Object.values(usageByList),
      recentlyUsed,
      firstUsed: tasksWithLabel.length > 0 
        ? tasksWithLabel.reduce((oldest, task) => 
            oldest < new Date(task.createdAt) ? oldest : new Date(task.createdAt)
          )
        : null,
      lastUsed: tasksWithLabel.length > 0 
        ? tasksWithLabel.reduce((newest, task) => 
            newest > new Date(task.updatedAt) ? newest : new Date(task.updatedAt)
          )
        : null
    };
  } catch (error) {
    console.error('[Label API] Error calculating usage stats:', error);
    return {
      totalTasks: 0,
      usageByStatus: {},
      usageByPriority: {},
      usageByList: [],
      recentlyUsed: 0,
      firstUsed: null,
      lastUsed: null
    };
  }
}