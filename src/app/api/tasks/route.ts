import { NextRequest, NextResponse } from "next/server";
import { createDatabaseAPI } from "@/lib/db/api";
import { CreateTaskData, TaskFilters } from "@/types/tasks";
import type { TaskStatus, Priority } from "@/types/utils";
import { z } from "zod";

// Validation schemas
const createTaskSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(["None", "Low", "Medium", "High"]).default("None"),
  status: z.enum(["todo", "in_progress", "done", "archived"]).default("todo"),
  deadline: z.string().datetime().optional(),
  estimate: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  actualTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.any().optional(),
  listId: z.string().optional(),
  parentTaskId: z.string().optional(),
  position: z.number().nonnegative().default(0),
});

const taskFiltersSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  listId: z.string().optional(),
  dueDate: z.string().optional(),
  completed: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * GET /api/tasks - Get tasks with filtering, pagination, sorting
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = Object.fromEntries(searchParams.entries());

    // Validate and parse filters
    const parsedFilters = taskFiltersSchema.parse(filters);

    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();

    // Convert filters to database format
    const dbFilters = {
      search: parsedFilters.search,
      status: parsedFilters.status as TaskStatus | undefined,
      priority: parsedFilters.priority as Priority | undefined,
      listId: parsedFilters.listId,
      dateFrom: parsedFilters.dueDate
        ? new Date(parsedFilters.dueDate)
        : undefined,
      dateTo: parsedFilters.dueDate
        ? new Date(parsedFilters.dueDate)
        : undefined,
    };

    // Get tasks with pagination
    const tasks = await dbAPI.getUserTasks("default-user", dbFilters);

    // Apply sorting
    const sortedTasks = tasks.sort((a, b) => {
      const { sortBy = "createdAt", sortOrder = "desc" } = parsedFilters;
      const multiplier = sortOrder === "asc" ? 1 : -1;

      switch (sortBy) {
        case "name":
          return multiplier * a.name.localeCompare(b.name);
        case "dueDate":
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return multiplier * (a.deadline.getTime() - b.deadline.getTime());
        case "priority":
          const priorityOrder = { High: 3, Medium: 2, Low: 1, None: 0 };
          return (
            multiplier * (priorityOrder[b.priority] - priorityOrder[a.priority])
          );
        case "createdAt":
        default:
          return multiplier * (a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    // Apply pagination
    const startIndex = (parsedFilters.page - 1) * parsedFilters.limit;
    const endIndex = startIndex + parsedFilters.limit;
    const paginatedTasks = sortedTasks.slice(startIndex, endIndex);

    const response = {
      success: true,
      data: paginatedTasks,
      pagination: {
        page: parsedFilters.page,
        limit: parsedFilters.limit,
        total: tasks.length,
        pages: Math.ceil(tasks.length / parsedFilters.limit),
        hasNext: endIndex < tasks.length,
        hasPrev: parsedFilters.page > 1,
      },
      filters: parsedFilters,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching tasks:", error);

    const errorResponse = {
      success: false,
      error: {
        code: "TASKS_FETCH_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch tasks",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST /api/tasks - Create new task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedData = createTaskSchema.parse(body);

    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();

    // Create task
    const newTask = await dbAPI.createTask({
      name: parsedData.name,
      description: parsedData.description,
      priority: parsedData.priority,
      status: parsedData.status,
      deadline: parsedData.deadline ? new Date(parsedData.deadline) : undefined,
      estimate: parsedData.estimate,
      actualTime: parsedData.actualTime,
      isRecurring: parsedData.isRecurring,
      recurringPattern: parsedData.recurringPattern,
      userId: "default-user",
      listId: parsedData.listId || "default-list",
      parentTaskId: parsedData.parentTaskId,
      position: parsedData.position,
    });

    const response = {
      success: true,
      data: newTask,
      message: "Task created successfully",
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);

    const errorResponse = {
      success: false,
      error: {
        code: "TASK_CREATE_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to create task",
      },
    };

    return NextResponse.json(errorResponse, { status: 400 });
  }
}
