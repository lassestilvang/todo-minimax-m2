/**
 * List Reorder API Route Handler
 *
 * Handles reordering of list items (tasks within lists)
 * POST /api/lists/[id]/reorder - Reorder tasks within a list
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
import { idParamSchema } from "../../../_lib/validation";
import type { ApiContext } from "../../../_lib/types";

// Apply middleware stack
const handler = withErrorHandling(
  withRateLimit(
    withAuth(async (req: NextRequest, context: ApiContext) => {
      const { id } = await getListId(req);

      if (req.method === "POST") {
        return handleReorderList(req, context, id);
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

export { handler as POST };

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract and validate list ID from request
 */
async function getListId(req: NextRequest): Promise<{ id: string }> {
  const segments = req.nextUrl.pathname.split("/");
  const listId = segments[segments.length - 2]; // Get parent directory

  const validation = idParamSchema.safeParse({ id: listId });
  if (!validation.success) {
    const validationError = validation.error.issues[0];
    const error = createValidationError(
      validationError.path.join("."),
      validationError.message,
      validationError.input,
      "INVALID_LIST_ID"
    );

    throw new Error(JSON.stringify(error));
  }

  return { id: validation.data.id };
}

// =============================================================================
// POST /api/lists/[id]/reorder - Reorder tasks within a list
// =============================================================================

async function handleReorderList(
  req: NextRequest,
  context: ApiContext,
  listId: string
): Promise<NextResponse> {
  try {
    // Verify list exists and belongs to user
    const lists = await dbAPI.getUserListsWithCounts(context.userId);
    const list = lists.find((l) => l.id === listId);

    if (!list) {
      const error = createNotFoundError("List", listId);
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

    // Parse and validate request body
    const body = await req.json();

    // Validate request structure
    if (!body.taskIds || !Array.isArray(body.taskIds)) {
      const error = createValidationError(
        "taskIds",
        "taskIds must be an array of task IDs",
        body.taskIds,
        "INVALID_TASK_IDS"
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

    const taskIds = body.taskIds;

    // Validate task IDs
    if (taskIds.length === 0) {
      const error = createValidationError(
        "taskIds",
        "At least one task ID is required",
        taskIds,
        "EMPTY_TASK_IDS"
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

    // Validate each task ID
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      if (typeof taskId !== "string" || !taskId.trim()) {
        const error = createValidationError(
          `taskIds[${i}]`,
          "Task ID must be a non-empty string",
          taskId,
          "INVALID_TASK_ID"
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
    }

    // Get current tasks in the list to verify they exist and belong to user
    const currentTasks = await dbAPI.getUserTasks(context.userId, { listId });
    const currentTaskIds = currentTasks.map((t) => t.id);

    // Check if all provided task IDs exist in this list
    const missingTasks = taskIds.filter(
      (id: string) => !currentTaskIds.includes(id)
    );
    if (missingTasks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `The following tasks do not exist in this list: ${missingTasks.join(
              ", "
            )}`,
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Check if we're trying to reorder all tasks or a subset
    const reorderAll = taskIds.length === currentTasks.length;
    let reorderedTasks = [];

    if (reorderAll) {
      // Reordering all tasks - update positions for all
      for (let i = 0; i < taskIds.length; i++) {
        const taskId = taskIds[i];
        try {
          await dbAPI.updateTask(taskId, { position: i }, context.userId);
          const updatedTask = await dbAPI.getTaskWithDetails(taskId);
          if (updatedTask) {
            reorderedTasks.push(updatedTask);
          }
        } catch (error) {
          console.error(`[List Reorder] Error updating task ${taskId}:`, error);
          // Continue with other tasks even if one fails
        }
      }
    } else {
      // Reordering a subset - need to handle positions carefully
      // Get current positions of all tasks in the list
      const allTasksWithPositions = currentTasks
        .filter((t) => !taskIds.includes(t.id)) // Tasks not being reordered
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      let currentPosition = 0;
      const finalOrder: any[] = [];

      // Add tasks in the new order
      for (const taskId of taskIds) {
        try {
          await dbAPI.updateTask(
            taskId,
            { position: currentPosition },
            context.userId
          );
          const updatedTask = await dbAPI.getTaskWithDetails(taskId);
          if (updatedTask) {
            finalOrder.push(updatedTask);
          }
          currentPosition++;
        } catch (error) {
          console.error(`[List Reorder] Error updating task ${taskId}:`, error);
        }
      }

      // Add remaining tasks with updated positions
      for (const task of allTasksWithPositions) {
        try {
          await dbAPI.updateTask(
            task.id,
            { position: currentPosition },
            context.userId
          );
          const updatedTask = await dbAPI.getTaskWithDetails(task.id);
          if (updatedTask) {
            finalOrder.push(updatedTask);
          }
          currentPosition++;
        } catch (error) {
          console.error(
            `[List Reorder] Error updating task ${task.id}:`,
            error
          );
        }
      }

      reorderedTasks = finalOrder;
    }

    // Invalidate cache
    // await invalidateCacheByTag(`list:${listId}:tasks`);
    // await invalidateCacheByTag(`user:${context.userId}:tasks`);

    // Return success response
    return createSuccessResponse(
      {
        listId,
        reorderedCount: reorderedTasks.length,
        tasks: reorderedTasks,
      },
      {
        action: "reordered",
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("[List Reorder API] Error reordering list:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to reorder list",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
