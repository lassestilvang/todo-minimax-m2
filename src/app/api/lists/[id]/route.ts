import { NextRequest, NextResponse } from "next/server";
import { createDatabaseAPI } from "@/lib/db/api";

// GET /api/lists/[id] - Get specific list with tasks
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    const context = { userId: "default-user" }; // Mock context for now

    if (!listId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_LIST_ID",
            message: "List ID is required",
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
            code: "LIST_NOT_FOUND",
            message: "List not found",
          },
        },
        { status: 404 }
      );
    }

    // Get tasks for this list
    const tasks = await dbAPI.getUserTasks(context.userId, { listId });

    // Group tasks by status
    const tasksByStatus = {
      todo: tasks.filter((t) => t.status === "todo"),
      "in-progress": tasks.filter((t) => t.status === "in_progress"),
      done: tasks.filter((t) => t.status === "done"),
      archived: tasks.filter((t) => t.status === "archived"),
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
          "in-progress": tasksByStatus["in-progress"].length,
          done: tasksByStatus.done.length,
          archived: tasksByStatus.archived.length,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching list:", error);

    const errorResponse = {
      success: false,
      error: {
        code: "LIST_FETCH_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch list",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
