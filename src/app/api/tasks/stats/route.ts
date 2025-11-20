import { NextRequest, NextResponse } from "next/server";
import { createDatabaseAPI } from "@/lib/db/api";
import type { TaskWithDetails } from "@/lib/db/types";

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/stats - Get task statistics and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();

    // Get basic task counts
    const allTasks = await dbAPI.getUserTasks("default-user");

    // Calculate various statistics
    const stats = {
      total: allTasks.length,
      byStatus: {
        todo: allTasks.filter((t) => t.status === "todo").length,
        in_progress: allTasks.filter((t) => t.status === "in_progress").length,
        done: allTasks.filter((t) => t.status === "done").length,
        archived: allTasks.filter((t) => t.status === "archived").length,
      },
      byPriority: {
        None: allTasks.filter((t) => t.priority === "None").length,
        Low: allTasks.filter((t) => t.priority === "Low").length,
        Medium: allTasks.filter((t) => t.priority === "Medium").length,
        High: allTasks.filter((t) => t.priority === "High").length,
      },
      dueToday: allTasks.filter((t) => {
        if (!t.deadline) return false;
        const today = new Date();
        const taskDate = new Date(t.deadline);
        return taskDate.toDateString() === today.toDateString();
      }).length,
      overdue: allTasks.filter((t) => {
        if (!t.deadline) return false;
        const now = new Date();
        const taskDate = new Date(t.deadline);
        return taskDate < now && t.status !== "done";
      }).length,
      recurring: allTasks.filter((t) => t.isRecurring).length,
      withSubtasks: allTasks.filter((t) => t.subtasks && t.subtasks.length > 0)
        .length,
      averageEstimate: calculateAverageTime(allTasks.filter((t) => t.estimate)),
      averageActualTime: calculateAverageTime(
        allTasks.filter((t) => t.actualTime)
      ),
      completionRate: calculateCompletionRate(allTasks),
      productivity: calculateProductivity(allTasks),
    };

    // Get lists statistics
    const lists = await dbAPI.getUserLists("default-user");
    const listsWithTaskCounts = await Promise.all(
      lists.map(async (list) => {
        const listTasks = await dbAPI.getUserTasks("default-user", {
          listId: list.id,
        });
        return {
          ...list,
          taskCount: listTasks.length,
          completedTasks: listTasks.filter(
            (t: TaskWithDetails) => t.status === "done"
          ).length,
          pendingTasks: listTasks.filter(
            (t: TaskWithDetails) => t.status === "todo"
          ).length,
        };
      })
    );

    const response = {
      success: true,
      data: {
        tasks: stats,
        lists: listsWithTaskCounts,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching task statistics:", error);

    const errorResponse = {
      success: false,
      error: {
        code: "TASK_STATS_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch task statistics",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Helper functions
function calculateAverageTime(tasks: any[]): string {
  if (tasks.length === 0) return "00:00";

  let totalMinutes = 0;
  for (const task of tasks) {
    const [hours, minutes] = task.split(":").map(Number);
    totalMinutes += hours * 60 + minutes;
  }

  const avgMinutes = Math.round(totalMinutes / tasks.length);
  const hours = Math.floor(avgMinutes / 60);
  const mins = avgMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

function calculateCompletionRate(tasks: any[]): number {
  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completedTasks / tasks.length) * 100);
}

function calculateProductivity(tasks: any[]): {
  score: number;
  trend: "up" | "down" | "stable";
  factors: string[];
} {
  const recentTasks = tasks.filter((t) => {
    const taskDate = new Date(t.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return taskDate >= weekAgo;
  });

  const completionRate = calculateCompletionRate(recentTasks);
  const onTimeCompletion = recentTasks.filter((t) => {
    if (!t.dueDate || t.status !== "completed") return false;
    const completedDate = new Date(t.updatedAt);
    return completedDate <= new Date(t.dueDate);
  }).length;

  const onTimeRate =
    recentTasks.length > 0
      ? Math.round((onTimeCompletion / recentTasks.length) * 100)
      : 0;

  const score = Math.round((completionRate + onTimeRate) / 2);

  let trend: "up" | "down" | "stable" = "stable";
  const factors: string[] = [];

  if (score >= 80) {
    factors.push("High completion rate", "On-time delivery");
  } else if (score >= 60) {
    factors.push("Moderate performance");
  } else {
    factors.push("Needs improvement");
  }

  if (completionRate >= 70) {
    factors.push("Good task completion");
  } else {
    factors.push("Low completion rate");
  }

  if (onTimeRate >= 70) {
    factors.push("Meeting deadlines");
  } else {
    factors.push("Missing deadlines");
  }

  return { score, trend, factors };
}
