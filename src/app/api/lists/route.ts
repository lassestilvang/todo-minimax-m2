import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseAPI } from '@/lib/db/api';
import { CreateListData } from '@/types/lists';
import { z } from 'zod';

// Validation schemas
const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  emoji: z.string().optional(),
  isFavorite: z.boolean().default(false),
});

const listFiltersSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(50).default(20),
  search: z.string().optional(),
  isFavorite: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * GET /api/lists - Get user lists with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = Object.fromEntries(searchParams.entries());
    
    // Validate and parse filters
    const parsedFilters = listFiltersSchema.parse(filters);
    
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    // Get user lists
    const lists = await dbAPI.getUserLists('default-user');
    
    // Apply filters
    let filteredLists = lists;
    
    if (parsedFilters.search) {
      const searchTerm = parsedFilters.search.toLowerCase();
      filteredLists = lists.filter(list =>
        list.name.toLowerCase().includes(searchTerm) ||
        (list.description && list.description.toLowerCase().includes(searchTerm))
      );
    }
    
    if (parsedFilters.isFavorite !== undefined) {
      filteredLists = lists.filter(list => list.isFavorite === parsedFilters.isFavorite);
    }
    
    // Apply sorting
    const sortedLists = filteredLists.sort((a, b) => {
      const { sortBy = 'name', sortOrder = 'asc' } = parsedFilters;
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      
      switch (sortBy) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'createdAt':
          return multiplier * (a.createdAt.getTime() - b.createdAt.getTime());
        case 'position':
          return multiplier * (a.position - b.position);
        case 'updatedAt':
          return multiplier * (a.updatedAt.getTime() - b.updatedAt.getTime());
        default:
          return multiplier * a.name.localeCompare(b.name);
      }
    });
    
    // Apply pagination
    const startIndex = (parsedFilters.page - 1) * parsedFilters.limit;
    const endIndex = startIndex + parsedFilters.limit;
    const paginatedLists = sortedLists.slice(startIndex, endIndex);
    
    // Get task counts for each list
    const listsWithCounts = await Promise.all(
      paginatedLists.map(async (list) => {
        const listTasks = await dbAPI.getTasksByList(list.id);
        return {
          ...list,
          taskCount: listTasks.length,
          completedTasks: listTasks.filter(t => t.status === 'completed').length,
          pendingTasks: listTasks.filter(t => t.status === 'todo').length,
          inProgressTasks: listTasks.filter(t => t.status === 'in-progress').length,
        };
      })
    );
    
    const response = {
      success: true,
      data: listsWithCounts,
      pagination: {
        page: parsedFilters.page,
        limit: parsedFilters.limit,
        total: filteredLists.length,
        pages: Math.ceil(filteredLists.length / parsedFilters.limit),
        hasNext: endIndex < filteredLists.length,
        hasPrev: parsedFilters.page > 1,
      },
      filters: parsedFilters,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching lists:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'LISTS_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch lists',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/lists - Create new list
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedData = createListSchema.parse(body);
    
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    // Get current lists to determine next position
    const existingLists = await dbAPI.getUserLists('default-user');
    const nextPosition = existingLists.length > 0 ? 
      Math.max(...existingLists.map(l => l.position || 0)) + 1 : 0;
    
    // Create list
    const newList = await dbAPI.createList({
      name: parsedData.name,
      description: parsedData.description,
      color: parsedData.color,
      emoji: parsedData.emoji,
      isFavorite: parsedData.isFavorite,
      userId: 'default-user',
      position: nextPosition,
    });
    
    const response = {
      success: true,
      data: newList,
      message: 'List created successfully',
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating list:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'LIST_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create list',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 400 });
  }
}