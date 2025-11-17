import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseAPI } from '@/lib/db/api';
import { UpdateListData } from '@/types/lists';
import { z } from 'zod';

// Validation schemas
const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  emoji: z.string().optional(),
  isFavorite: z.boolean().optional(),
});

/**
 * GET /api/lists/[id] - Get list with tasks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    
    if (!listId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_LIST_ID',
            message: 'List ID is required',
          },
        },
        { status: 400 }
      );
    }
    
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    // Get list
    const list = await dbAPI.getList(listId);
    
    if (!list) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIST_NOT_FOUND',
            message: 'List not found',
          },
        },
        { status: 404 }
      );
    }
    
    // Get tasks for this list
    const tasks = await dbAPI.getTasksByList(listId);
    
    // Group tasks by status
    const tasksByStatus = {
      todo: tasks.filter(t => t.status === 'todo'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      completed: tasks.filter(t => t.status === 'completed'),
      archived: tasks.filter(t => t.status === 'archived'),
    };
    
    const response = {
      success: true,
      data: {
        ...list,
        tasks,
        tasksByStatus,
        taskCounts: {
          total: tasks.length,
          todo: tasksByStatus.todo.length,
          'in-progress': tasksByStatus['in-progress'].length,
          completed: tasksByStatus.completed.length,
          archived: tasksByStatus.archived.length,
        },
      },
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching list:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'LIST_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch list',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/lists/[id] - Update list
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    
    if (!listId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_LIST_ID',
            message: 'List ID is required',
          },
        },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const parsedData = updateListSchema.parse(body);
    
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    // Prepare update data
    const updateData: UpdateListData = {
      id: listId,
      ...parsedData,
    };
    
    // Update list
    const updatedList = await dbAPI.updateList(updateData);
    
    if (!updatedList) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIST_NOT_FOUND',
            message: 'List not found or update failed',
          },
        },
        { status: 404 }
      );
    }
    
    const response = {
      success: true,
      data: updatedList,
      message: 'List updated successfully',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating list:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'LIST_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update list',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 400 });
  }
}

/**
 * DELETE /api/lists/[id] - Delete list
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    
    if (!listId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_LIST_ID',
            message: 'List ID is required',
          },
        },
        { status: 400 }
      );
    }
    
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    // Check if this is the default Inbox list (should not be deletable)
    const list = await dbAPI.getList(listId);
    if (!list) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIST_NOT_FOUND',
            message: 'List not found',
          },
        },
        { status: 404 }
      );
    }
    
    if (list.name === 'Inbox') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANNOT_DELETE_INBOX',
            message: 'The default Inbox list cannot be deleted',
          },
        },
        { status: 400 }
      );
    }
    
    // Check if list has tasks
    const tasks = await dbAPI.getTasksByList(listId);
    if (tasks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIST_HAS_TASKS',
            message: `Cannot delete list with ${tasks.length} tasks. Please move or delete tasks first.`,
          },
        },
        { status: 400 }
      );
    }
    
    // Delete list
    const deleted = await dbAPI.deleteList(listId);
    
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIST_DELETE_ERROR',
            message: 'Failed to delete list',
          },
        },
        { status: 500 }
      );
    }
    
    const response = {
      success: true,
      message: 'List deleted successfully',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting list:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'LIST_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete list',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 400 });
  }
}