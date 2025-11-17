/**
 * Individual File API Route Handler
 * 
 * Handles operations on individual files
 * GET /api/files/[id] - Get file information
 * DELETE /api/files/[id] - Delete file
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
import { idParamSchema } from '../../../_lib/validation';
import type { ApiContext } from '../../../_lib/types';
import fs from 'fs/promises';

// Apply middleware stack
const handler = withErrorHandling(
  withRateLimit(
    withAuth(async (req: NextRequest, context: ApiContext) => {
      const { id } = await getFileId(req);
      
      if (req.method === 'GET') {
        return handleGetFile(req, context, id);
      } else if (req.method === 'DELETE') {
        return handleDeleteFile(req, context, id);
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

export { handler as GET, handler as DELETE };

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract and validate file ID from request
 */
async function getFileId(req: NextRequest): Promise<{ id: string }> {
  const segments = req.nextUrl.pathname.split('/');
  const fileId = segments[segments.length - 1];
  
  const validation = idParamSchema.safeParse({ id: fileId });
  if (!validation.success) {
    const validationError = validation.error.errors[0];
    const error = createValidationError(
      validationError.path.join('.'),
      validationError.message,
      validationError.input,
      'INVALID_FILE_ID'
    );
    
    throw new Error(JSON.stringify(error));
  }

  return { id: validation.data.id };
}

// =============================================================================
// GET /api/files/[id] - Get file information
// =============================================================================

async function handleGetFile(req: NextRequest, context: ApiContext, fileId: string): Promise<NextResponse> {
  try {
    // Get attachment from database
    const attachment = await dbAPI.getAttachment(fileId);
    
    if (!attachment) {
      const error = createNotFoundError('File', fileId);
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    // Check if file belongs to user's tasks
    if (attachment.taskId) {
      const task = await dbAPI.getTaskWithDetails(attachment.taskId);
      if (!task || task.userId !== context.userId) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this file',
            statusCode: 403,
            timestamp: new Date().toISOString()
          }
        }, { status: 403 });
      }
    }

    // Get task information if associated
    let taskInfo = null;
    if (attachment.taskId) {
      const task = await dbAPI.getTaskWithDetails(attachment.taskId);
      if (task && task.userId === context.userId) {
        taskInfo = {
          id: task.id,
          name: task.name,
          listName: task.list?.name
        };
      }
    }

    // Calculate file metadata
    const fileStats = await getFileStats(attachment.path);
    
    const fileInfo = {
      id: attachment.id,
      originalName: attachment.originalName,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      uploadedAt: attachment.uploadedAt,
      taskId: attachment.taskId,
      task: taskInfo,
      downloadUrl: `/api/files/${attachment.id}/download`,
      canPreview: isPreviewable(attachment.mimeType),
      fileType: getFileType(attachment.mimeType),
      lastModified: fileStats?.mtime || attachment.uploadedAt,
      fileExtension: getFileExtension(attachment.originalName)
    };

    return createSuccessResponse({
      file: fileInfo
    }, {
      action: 'retrieved',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[File API] Error fetching file:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch file information',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// =============================================================================
// DELETE /api/files/[id] - Delete file
// =============================================================================

async function handleDeleteFile(req: NextRequest, context: ApiContext, fileId: string): Promise<NextResponse> {
  try {
    // Get attachment from database
    const attachment = await dbAPI.getAttachment(fileId);
    
    if (!attachment) {
      const error = createNotFoundError('File', fileId);
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    // Check if file belongs to user's tasks
    if (attachment.taskId) {
      const task = await dbAPI.getTaskWithDetails(attachment.taskId);
      if (!task || task.userId !== context.userId) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this file',
            statusCode: 403,
            timestamp: new Date().toISOString()
          }
        }, { status: 403 });
      }
    }

    // Delete physical file
    try {
      await fs.unlink(attachment.path);
      console.log(`[File API] Deleted physical file: ${attachment.path}`);
    } catch (fileError) {
      console.error('[File API] Error deleting physical file:', fileError);
      // Continue with database deletion even if physical file deletion fails
    }

    // Delete attachment from database
    await dbAPI.deleteAttachment(fileId);

    // Invalidate cache
    // if (attachment.taskId) await invalidateCacheByTag(`task:${attachment.taskId}:attachments`);

    return createSuccessResponse({
      message: 'File deleted successfully',
      deletedFileId: fileId,
      originalName: attachment.originalName
    }, {
      action: 'deleted',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[File API] Error deleting file:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete file',
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
 * Get file statistics
 */
async function getFileStats(filePath: string) {
  try {
    const stats = await fs.stat(filePath);
    return stats;
  } catch (error) {
    console.error('[File API] Error getting file stats:', error);
    return null;
  }
}

/**
 * Check if file type is previewable
 */
function isPreviewable(mimeType: string): boolean {
  const previewableTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv'
  ];
  return previewableTypes.includes(mimeType);
}

/**
 * Get file type category
 */
function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'other';
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
}