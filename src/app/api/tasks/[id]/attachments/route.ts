/**
 * Task Attachments API Route Handler
 *
 * Handles attachment operations for individual tasks
 * GET /api/tasks/[id]/attachments - Get attachments for a task
 * POST /api/tasks/[id]/attachments - Upload new attachment
 */

import { NextRequest, NextResponse } from "next/server";
import { dbAPI } from "../../../../../lib/db/api";
import {
  withAuth,
  withRateLimit,
  withErrorHandling,
} from "../../../_lib/middleware";
import {
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
} from "../../../_lib/utils";
import { fileUploadSchema, idParamSchema } from "../../../_lib/validation";
import type { ApiContext } from "../../../_lib/types";

// Apply middleware stack
const handler = withErrorHandling(
  withRateLimit(
    withAuth(async (req: NextRequest, context: ApiContext) => {
      const { id: taskId } = await getTaskId(req);

      if (req.method === "GET") {
        return handleGetAttachments(req, context, taskId);
      } else if (req.method === "POST") {
        return handleUploadAttachment(req, context, taskId);
      } else {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: `Method ${req.method} not allowed`,
              statusCode: 405,
            },
          },
          { status: 405 }
        );
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
  const segments = req.nextUrl.pathname.split("/");
  const taskId = segments[segments.length - 3]; // tasks/[id]/attachments

  const validation = idParamSchema.safeParse({ id: taskId });
  if (!validation.success) {
    const validationError = validation.error.issues[0];
    const error = createValidationError(
      validationError.path.join("."),
      validationError.message,
      validationError.input,
      "INVALID_TASK_ID"
    );

    throw new Error(JSON.stringify(error));
  }

  return { id: validation.data.id };
}

// =============================================================================
// GET /api/tasks/[id]/attachments - Get attachments for a task
// =============================================================================

async function handleGetAttachments(
  req: NextRequest,
  context: ApiContext,
  taskId: string
): Promise<NextResponse> {
  try {
    // Verify task exists and belongs to user
    const task = await dbAPI.getTaskWithDetails(taskId);
    if (!task) {
      const error = createNotFoundError("Task", taskId);
      return NextResponse.json(
        {
          success: false,
          error: {
            ...error,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    if (task.userId !== context.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied to this task",
            statusCode: 403,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Get attachments
    const attachments = await dbAPI.getAttachments(taskId);

    // Calculate total size and categorize by type
    const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);
    const attachmentsByType = categorizeAttachments(attachments);

    return createSuccessResponse(
      {
        attachments,
        summary: {
          total: attachments.length,
          totalSize,
          totalSizeFormatted: formatFileSize(totalSize),
          byType: attachmentsByType,
        },
      },
      {
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("[Task Attachments API] Error fetching attachments:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch attachments",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/tasks/[id]/attachments - Upload new attachment
// =============================================================================

async function handleUploadAttachment(
  req: NextRequest,
  context: ApiContext,
  taskId: string
): Promise<NextResponse> {
  try {
    // Verify task exists and belongs to user
    const task = await dbAPI.getTaskWithDetails(taskId);
    if (!task) {
      const error = createNotFoundError("Task", taskId);
      return NextResponse.json(
        {
          success: false,
          error: {
            ...error,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    if (task.userId !== context.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied to this task",
            statusCode: 403,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Handle file upload
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "No file provided",
            field: "file",
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error || "Invalid file",
            field: "file",
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const filePath = `uploads/attachments/${fileName}`;

    // In a real implementation, you would:
    // 1. Save the file to cloud storage (AWS S3, Google Cloud Storage, etc.)
    // 2. Get the public URL
    // For now, we'll simulate the upload process

    // Create attachment record
    const attachment = await dbAPI.createAttachment({
      taskId,
      filename: fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: filePath,
    });

    return createSuccessResponse(
      {
        attachment,
        uploadInfo: {
          message: "File uploaded successfully",
          url: `/api/files/${attachment.id}/download`, // In real implementation, this would be the actual download URL
        },
      },
      {
        action: "uploaded",
        timestamp: new Date().toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("[Task Attachments API] Error uploading attachment:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to upload attachment",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Categorize attachments by file type
 */
function categorizeAttachments(attachments: any[]) {
  const categories = {
    images: 0,
    documents: 0,
    videos: 0,
    audio: 0,
    archives: 0,
    other: 0,
  };

  attachments.forEach((att) => {
    const mimeType = att.mimeType.toLowerCase();

    if (mimeType.startsWith("image/")) {
      categories.images++;
    } else if (mimeType.startsWith("video/")) {
      categories.videos++;
    } else if (mimeType.startsWith("audio/")) {
      categories.audio++;
    } else if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("text/")
    ) {
      categories.documents++;
    } else if (
      mimeType.includes("zip") ||
      mimeType.includes("rar") ||
      mimeType.includes("tar")
    ) {
      categories.archives++;
    } else {
      categories.other++;
    }
  });

  return categories;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Validate uploaded file
 */
async function validateFile(
  file: File
): Promise<{ valid: boolean; error?: string }> {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: "File size exceeds 10MB limit" };
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4",
    "video/webm",
    "audio/mp3",
    "audio/wav",
    "application/zip",
    "application/x-rar-compressed",
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "File type not allowed" };
  }

  // Check filename
  if (file.name.length > 255) {
    return { valid: false, error: "Filename too long" };
  }

  // Check for malicious filename patterns
  const maliciousPatterns = /[\/\\\*\?\:\|\"<>\x00-\x1f]/;
  if (maliciousPatterns.test(file.name)) {
    return { valid: false, error: "Invalid filename characters" };
  }

  return { valid: true };
}

/**
 * Delete attachment (utility function for future use)
 */
async function deleteAttachment(
  attachmentId: string,
  userId: string
): Promise<void> {
  // In a real implementation, you would:
  // 1. Verify the attachment belongs to a task owned by the user
  // 2. Delete the file from storage
  // 3. Delete the database record

  await dbAPI.deleteAttachment(attachmentId);
}
