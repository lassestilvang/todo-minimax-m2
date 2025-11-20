/**
 * Task Reminders API Route Handler
 *
 * Handles reminder operations for individual tasks
 * GET /api/tasks/[id]/reminders - Get reminders for a task
 * POST /api/tasks/[id]/reminders - Create new reminder
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
import { createReminderSchema, idParamSchema } from "../../../_lib/validation";
import type { ApiContext } from "../../../_lib/types";

// Apply middleware stack
const handler = withErrorHandling(
  withRateLimit(
    withAuth(async (req: NextRequest, context: ApiContext) => {
      const { id: taskId } = await getTaskId(req);

      if (req.method === "GET") {
        return handleGetReminders(req, context, taskId);
      } else if (req.method === "POST") {
        return handleCreateReminder(req, context, taskId);
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
  const taskId = segments[segments.length - 3]; // tasks/[id]/reminders

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
// GET /api/tasks/[id]/reminders - Get reminders for a task
// =============================================================================

async function handleGetReminders(
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

    // Get reminders
    const reminders = await dbAPI.getReminders(taskId);
    const now = new Date();

    // Categorize reminders
    const categorizedReminders = {
      pending: reminders.filter((r) => !r.isSent && new Date(r.remindAt) > now),
      sent: reminders.filter((r) => r.isSent),
      overdue: reminders.filter(
        (r) => !r.isSent && new Date(r.remindAt) <= now
      ),
    };

    return createSuccessResponse(
      {
        reminders,
        categories: {
          pending: categorizedReminders.pending.length,
          sent: categorizedReminders.sent.length,
          overdue: categorizedReminders.overdue.length,
        },
        total: reminders.length,
      },
      {
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("[Task Reminders API] Error fetching reminders:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch reminders",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/tasks/[id]/reminders - Create new reminder
// =============================================================================

async function handleCreateReminder(
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

    // Parse and validate request body
    const body = await req.json();
    const validation = createReminderSchema.safeParse({ ...body, taskId });

    if (!validation.success) {
      const validationError = validation.error.issues[0];
      const error = createValidationError(
        validationError.path.join("."),
        validationError.message,
        validationError.input,
        "VALIDATION_ERROR"
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            ...error,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const { remindAt, method } = validation.data;

    // Validate reminder time is in the future
    const reminderDate = new Date(remindAt);
    const now = new Date();

    if (reminderDate <= now) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Reminder time must be in the future",
            field: "remindAt",
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicate reminders
    const existingReminders = await dbAPI.getReminders(taskId);
    const duplicateReminder = existingReminders.find(
      (r) =>
        new Date(r.remindAt).getTime() === reminderDate.getTime() &&
        r.method === method
    );

    if (duplicateReminder) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A reminder with the same time and method already exists",
            field: "remindAt",
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Create reminder
    const newReminder = await dbAPI.createReminder({
      taskId,
      remindAt: reminderDate,
      method,
      isSent: false,
    });

    return createSuccessResponse(
      {
        reminder: newReminder,
      },
      {
        action: "created",
        timestamp: new Date().toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("[Task Reminders API] Error creating reminder:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create reminder",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
