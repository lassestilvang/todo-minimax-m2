import { NextRequest, NextResponse } from "next/server";
import { createDatabaseAPI } from "@/lib/db/api";
import { UpdateTaskData } from "@/types/tasks";
import { TaskId, ListId, Priority } from "@/types/utils";
import { z } from "zod";

// Validation schemas
const updateTaskSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority: z.enum(["None", "Low", "Medium", "High"]).optional(),
  status: z.enum(["todo", "in_progress", "done", "archived"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimate: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  actualTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.any().optional(),
  listId: z.string().nullable().optional(),
  position: z.number().nonnegative().optional(),
});

/**
 * GET /api/tasks/[id] - Get specific task with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_TASK_ID",
            message: "Task ID is required",
          },
        },
        { status: 400 }
      );
    }

    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();

    // Get task with full details
    const task = await dbAPI.getTaskWithDetails(taskId);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task not found",
          },
        },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      data: task,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching task:", error);

    const errorResponse = {
      success: false,
      error: {
        code: "TASK_FETCH_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch task",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * PUT /api/tasks/[id] - Update task
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_TASK_ID",
            message: "Task ID is required",
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsedData = updateTaskSchema.parse(body);

    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();

    // Prepare update data
    const updateData: UpdateTaskData = {
      id: taskId as TaskId,
      name: parsedData.name,
      description: parsedData.description,
      priority: parsedData.priority,
      status: parsedData.status,
      estimate: parsedData.estimate ?? undefined,
      actualTime: parsedData.actualTime ?? undefined,
      isRecurring: parsedData.isRecurring,
      recurringPattern: parsedData.recurringPattern,
      listId: parsedData.listId ? (parsedData.listId as ListId) : undefined,
      position: parsedData.position,
    };

    // Update task
    const updatedTask = await dbAPI.updateTask(
      updateData.id,
      updateData,
      "default-user"
    );

    if (!updatedTask) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task not found or update failed",
          },
        },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      data: updatedTask,
      message: "Task updated successfully",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating task:", error);

    const errorResponse = {
      success: false,
      error: {
        code: "TASK_UPDATE_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to update task",
      },
    };

    return NextResponse.json(errorResponse, { status: 400 });
  }
}

/**
 * DELETE /api/tasks/[id] - Delete task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_TASK_ID",
            message: "Task ID is required",
          },
        },
        { status: 400 }
      );
    }

    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();

    // Delete task (this will also handle related data like subtasks, reminders, etc.)
    await dbAPI.deleteTask(taskId, "default-user");

    const response = {
      success: true,
      message: "Task deleted successfully",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error deleting task:", error);

    const errorResponse = {
      success: false,
      error: {
        code: "TASK_DELETE_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete task",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
