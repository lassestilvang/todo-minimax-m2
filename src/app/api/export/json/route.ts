import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseAPI } from '@/lib/db/api';

/**
 * GET /api/export/json - Export all user data as JSON
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    const listId = searchParams.get('listId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    // Build filters based on query parameters
    const taskFilters: any = {};
    
    if (!includeCompleted) {
      taskFilters.status = 'todo';
    }
    
    if (listId) {
      taskFilters.listId = listId;
    }
    
    if (dateFrom || dateTo) {
      taskFilters.dateRange = {
        from: dateFrom ? new Date(dateFrom) : undefined,
        to: dateTo ? new Date(dateTo) : undefined,
      };
    }
    
    // Export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      userId: 'default-user',
      lists: await dbAPI.getUserLists('default-user'),
      tasks: await dbAPI.getUserTasks('default-user', taskFilters),
      labels: await dbAPI.getUserLabels('default-user'),
      statistics: {
        totalLists: (await dbAPI.getUserLists('default-user')).length,
        totalTasks: (await dbAPI.getUserTasks('default-user', taskFilters)).length,
        completedTasks: (await dbAPI.getUserTasks('default-user', { ...taskFilters, status: 'completed' })).length,
        pendingTasks: (await dbAPI.getUserTasks('default-user', { ...taskFilters, status: 'todo' })).length,
      },
      metadata: {
        includeCompleted,
        listId,
        dateRange: {
          from: dateFrom,
          to: dateTo,
        },
      },
    };
    
    const response = new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="task-planner-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
    
    return response;
  } catch (error) {
    console.error('Error exporting data:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: error instanceof Error ? error.message : 'Export failed',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}