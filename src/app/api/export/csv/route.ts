import { NextRequest, NextResponse } from "next/server";
import { createDatabaseAPI } from "@/lib/db/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/csv - Export tasks as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId");
    const status = searchParams.get("status");
    const includeCompleted = searchParams.get("includeCompleted") === "true";
    
    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();
    
    // Build filters
    const taskFilters: any = {};
    
    if (status) {
      taskFilters.status = status;
    }
    
    if (!includeCompleted) {
      taskFilters.completed = false;
    }
    
    if (listId) {
      taskFilters.listId = listId;
    }
    
    // Get tasks
    const tasks = await dbAPI.getUserTasks("default-user", taskFilters);
    
    // Get lists for reference
    const lists = await dbAPI.getUserLists("default-user");
    const listMap = new Map(lists.map((l) => [l.id, l.name]));
    
    // Create CSV content
    const csvHeaders = [
      "ID", 
      "Name",
      "Description",
          "Status",
      "Priority",
      "Due Date",
      "Estimate",
      "Actual Time",
      "List",
      "Created At",
      "Updated At",
    ];

    const csvRows = tasks.map((task) => [
      task.id,
      `"${task.name.replace(/"/g, '""')}"`, // Escape quotes
      task.description ? `"${task.description.replace(/"/g, '""')}"` : "",
          task.status,
      task.priority,
      task.deadline ? new Date(task.deadline).toLocaleDateString() : "",
      task.estimate || "",
      task.actualTime || "",
          listMap.get(task.listId) || "Inbox",
      new Date(task.createdAt).toLocaleDateString(),
      new Date(task.updatedAt).toLocaleDateString(),
    ]);

    const csvContent = [
      csvHeaders.join(","),
          ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    const response = new NextResponse(csvContent, {
          headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tasks-export-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });

        return response;
  } catch (error) {
    console.error("Error exporting CSV:", error);
    const errorResponse = {
      success: false,
      error: {
        code: "CSV_EXPORT_ERROR",
        message: error instanceof Error ? error.message : "CSV export failed",
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
