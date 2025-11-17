/**
 * Label API Route Handler
 * 
 * Handles label CRUD operations with pagination, filtering, and sorting
 * GET /api/labels - Get labels with filtering and pagination
 * POST /api/labels - Create new label
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAPI } from '../../../lib/db/api';
import { 
  withAuth, 
  withRateLimit, 
  withCache, 
  withErrorHandling 
} from '../_lib/middleware';
import { 
  createSuccessResponse, 
  createPaginatedResponse,
  createValidationError,
  createNotFoundError 
} from '../_lib/utils';
import { 
  labelQuerySchema, 
  createLabelSchema 
} from '../_lib/validation';
import type { ApiContext } from '../_lib/types';

// Apply middleware stack
const handler = withErrorHandling(
  withRateLimit(
    withCache(
      withAuth(async (req: NextRequest, context: ApiContext) => {
        if (req.method === 'GET') {
          return handleGetLabels(req, context);
        } else if (req.method === 'POST') {
          return handleCreateLabel(req, context);
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
  )
);

export { handler as GET, handler as POST };

// =============================================================================
// GET /api/labels - Retrieve labels with filtering and pagination
// =============================================================================

async function handleGetLabels(req: NextRequest, context: ApiContext): Promise<NextResponse> {
  try {
    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validation = labelQuerySchema.safeParse(queryParams);
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

    const params = validation.data;
    const { page, pageSize, sortBy, sortDirection, search, includeTaskCount, color } = params;

    // Get labels from database with task counts
    const labelsWithCounts = await dbAPI.getUserLabelsWithCounts(context.userId);

    // Apply filters
    let filteredLabels = labelsWithCounts;

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLabels = filteredLabels.filter(label =>
        label.name.toLowerCase().includes(searchLower) ||
        label.icon.toLowerCase().includes(searchLower)
      );
    }

    // Filter by color
    if (color) {
      filteredLabels = filteredLabels.filter(label => label.color === color);
    }

    // Sort labels
    if (sortBy) {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      filteredLabels.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'taskCount':
            aValue = a.taskCount || 0;
            bValue = b.taskCount || 0;
            break;
          case 'created':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'updated':
            aValue = new Date(a.updatedAt);
            bValue = new Date(b.updatedAt);
            break;
          default:
            aValue = a[sortBy as keyof typeof a];
            bValue = b[sortBy as keyof typeof b];
        }
        
        if (aValue < bValue) return -1 * direction;
        if (aValue > bValue) return 1 * direction;
        return 0;
      });
    } else {
      // Default sort: by name
      filteredLabels.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Calculate usage statistics for each label
    const labelsWithStats = filteredLabels.map(label => ({
      ...label,
      usagePercentage: label.taskCount > 0 
        ? Math.round((label.taskCount / labelsWithCounts.reduce((sum, l) => sum + l.taskCount, 0)) * 100)
        : 0,
      isPopular: (label.taskCount || 0) > 5,
      recentlyUsed: calculateRecentlyUsed(label)
    }));

    // Apply pagination
    const total = labelsWithStats.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLabels = labelsWithStats.slice(startIndex, endIndex);

    // Return paginated response
    return createPaginatedResponse(paginatedLabels, {
      page,
      pageSize,
      total
    }, {
      query: search || '',
      filters: {
        includeTaskCount,
        color
      },
      totalFiltered: total
    });

  } catch (error) {
    console.error('[Labels API] Error fetching labels:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch labels',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// =============================================================================
// POST /api/labels - Create new label
// =============================================================================

async function handleCreateLabel(req: NextRequest, context: ApiContext): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validation = createLabelSchema.safeParse(body);

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

    const labelData = validation.data;

    // Check if user already has a label with the same name
    const existingLabels = await dbAPI.getUserLabelsWithCounts(context.userId);
    const duplicateName = existingLabels.find(label => 
      label.name.toLowerCase() === labelData.name.toLowerCase()
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

    // Check for duplicate icon/color combinations
    const duplicateCombo = existingLabels.find(label => 
      label.icon === labelData.icon && label.color === labelData.color
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

    // Create label data for database
    const createData = {
      name: labelData.name,
      color: labelData.color,
      icon: labelData.icon,
      userId: context.userId
    };

    // Create label
    const newLabel = await dbAPI.createLabel(createData);

    // Get the complete label with task count
    const completeLabels = await dbAPI.getUserLabelsWithCounts(context.userId);
    const completeLabel = completeLabels.find(label => label.id === newLabel.id);

    // Invalidate cache
    // await invalidateCacheByTag(`user:${context.userId}:labels`);

    // Return success response
    return createSuccessResponse({
      label: completeLabel
    }, {
      action: 'created',
      timestamp: new Date().toISOString()
    }, 201);

  } catch (error) {
    console.error('[Labels API] Error creating label:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create label',
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
 * Calculate if label has been used recently
 */
function calculateRecentlyUsed(label: any): boolean {
  // This would typically look at recent task usage
  // For now, we'll consider any label with recent task count as recently used
  return (label.taskCount || 0) > 0;
}

/**
 * Get label color palette suggestions
 */
export function getColorPaletteSuggestions(): string[] {
  return [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#686DE0', '#4834D4', '#30336B', '#130F40', '#6C5CE7',
    '#A29BFE', '#FD79A8', '#FDCB6E', '#E17055', '#00B894'
  ];
}

/**
 * Get popular icon suggestions
 */
export function getIconSuggestions(): string[] {
  return [
    '🏷️', '📌', '⭐', '❤️', '🔥', '⚡', '🎯', '💎', '🌟', '🎨',
    '🔧', '💻', '📱', '📧', '💰', '🏠', '🚗', '✈️', '🌍', '📚',
    '🎵', '🎬', '🎮', '⚽', '🏃', '🍕', '☕', '🌈', '🌙', '☀️',
    '🛠️', '🔍', '📈', '🎉', '⚖️', '🔒', '💡', '🎭', '🎪', '🎳'
  ];
}