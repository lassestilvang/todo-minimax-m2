import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createDatabaseAPI } from '@/lib/db/api';
import { z } from 'zod';

// Validation schema for file upload
const uploadSchema = z.object({
  taskId: z.string(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
});

/**
 * POST /api/files/upload - Upload file attachment for task
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') as string;
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        },
        { status: 400 }
      );
    }
    
    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_TASK_ID',
            message: 'Task ID is required',
          },
        },
        { status: 400 }
      );
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 10MB limit',
          },
        },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File type not supported',
          },
        },
        { status: 400 }
      );
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = join(uploadsDir, fileName);
    
    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    // Save file metadata to database
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    const attachment = await dbAPI.createAttachment({
      taskId,
      fileName: file.name,
      filePath: `/uploads/${fileName}`,
      fileType: file.type,
      fileSize: file.size,
      userId: 'default-user',
    });
    
    const response = {
      success: true,
      data: attachment,
      message: 'File uploaded successfully',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error uploading file:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'File upload failed',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/files/upload - List available file types and limits
 */
export async function GET() {
  try {
    const allowedTypes = [
      { type: 'image/jpeg', extension: '.jpg,.jpeg', maxSize: '5MB' },
      { type: 'image/png', extension: '.png', maxSize: '5MB' },
      { type: 'image/gif', extension: '.gif', maxSize: '5MB' },
      { type: 'image/webp', extension: '.webp', maxSize: '5MB' },
      { type: 'application/pdf', extension: '.pdf', maxSize: '10MB' },
      { type: 'text/plain', extension: '.txt', maxSize: '1MB' },
      { type: 'text/csv', extension: '.csv', maxSize: '5MB' },
      { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        extension: '.xlsx', 
        maxSize: '10MB' 
      },
      { 
        type: 'application/vnd.ms-excel', 
        extension: '.xls', 
        maxSize: '10MB' 
      },
      { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        extension: '.docx', 
        maxSize: '10MB' 
      },
      { 
        type: 'application/msword', 
        extension: '.doc', 
        maxSize: '10MB' 
      },
    ];
    
    const response = {
      success: true,
      data: {
        allowedTypes,
        maxFileSize: '10MB',
        totalSizeLimit: '100MB per task',
      },
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching upload info:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'UPLOAD_INFO_ERROR',
        message: 'Failed to fetch upload information',
      },
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}