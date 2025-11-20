import { NextRequest, NextResponse } from "next/server";
import { createDatabaseAPI } from "@/lib/db/api";
import { z } from "zod";

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(["all", "tasks", "lists"]).default("all"),
  limit: z.coerce.number().positive().max(100).default(20),
  offset: z.coerce.number().nonnegative().default(0),
  filters: z
    .object({
      status: z.string().optional(),
      priority: z.string().optional(),
      listId: z.string().optional(),
      dueDateFrom: z.string().optional(),
      dueDateTo: z.string().optional(),
      completed: z.coerce.boolean().optional(),
      hasLabels: z.coerce.boolean().optional(),
      labelIds: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * POST /api/search - Search tasks and lists with fuzzy matching
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedData = searchSchema.parse(body);

    const { query, type, limit, offset, filters } = parsedData;

    const dbAPI = createDatabaseAPI();
    await dbAPI.getDatabase().initialize();

    let results: any = {
      tasks: [],
      lists: [],
      total: 0,
    };

    // Normalize search query
    const normalizedQuery = query.toLowerCase().trim();

    // Search tasks
    if (type === "all" || type === "tasks") {
      const tasks = await dbAPI.getUserTasks("default-user");
      const matchingTasks = tasks.filter((task) => {
        // Text matching in name, description, and other fields
        const nameMatch = task.name.toLowerCase().includes(normalizedQuery);
        const descMatch = task.description
          ?.toLowerCase()
          .includes(normalizedQuery);

        // Fuzzy matching for better results
        const fuzzyNameMatch = fuzzyMatch(
          normalizedQuery,
          task.name.toLowerCase()
        );
        const fuzzyDescMatch = task.description
          ? fuzzyMatch(normalizedQuery, task.description.toLowerCase())
          : false;

        // Apply filters
        if (filters) {
          if (filters.status && task.status !== filters.status) return false;
          if (filters.priority && task.priority !== filters.priority)
            return false;
          if (filters.listId && task.listId !== filters.listId) return false;
          if (
            filters.completed !== undefined &&
            (task.status === "done") !== filters.completed
          )
            return false;

          // Due date filters
          if (filters.dueDateFrom && task.deadline) {
            const taskDate = new Date(task.deadline);
            const fromDate = new Date(filters.dueDateFrom);
            if (taskDate < fromDate) return false;
          }

          if (filters.dueDateTo && task.deadline) {
            const taskDate = new Date(task.deadline);
            const toDate = new Date(filters.dueDateTo);
            if (taskDate > toDate) return false;
          }
        }

        return nameMatch || descMatch || fuzzyNameMatch || fuzzyDescMatch;
      });

      // Sort by relevance (exact matches first, then fuzzy matches)
      const sortedTasks = matchingTasks.sort((a, b) => {
        const aExact =
          a.name.toLowerCase() === normalizedQuery ||
          a.description?.toLowerCase() === normalizedQuery;
        const bExact =
          b.name.toLowerCase() === normalizedQuery ||
          b.description?.toLowerCase() === normalizedQuery;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then sort by task priority and due date
        const priorityOrder = { High: 3, Medium: 2, Low: 1, None: 0 };
        const priorityDiff =
          priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Finally by deadline
        if (a.deadline && b.deadline) {
          return (
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          );
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;

        return 0;
      });

      results.tasks = sortedTasks.slice(offset, offset + limit);
    }

    // Search lists
    if (type === "all" || type === "lists") {
      const lists = await dbAPI.getUserLists("default-user");
      const matchingLists = lists.filter((list) => {
        const nameMatch = list.name.toLowerCase().includes(normalizedQuery);
        const descMatch = list.description
          ?.toLowerCase()
          .includes(normalizedQuery);
        const emojiMatch = list.emoji?.toLowerCase().includes(normalizedQuery);

        const fuzzyNameMatch = fuzzyMatch(
          normalizedQuery,
          list.name.toLowerCase()
        );
        const fuzzyDescMatch = list.description
          ? fuzzyMatch(normalizedQuery, list.description.toLowerCase())
          : false;

        return (
          nameMatch ||
          descMatch ||
          emojiMatch ||
          fuzzyNameMatch ||
          fuzzyDescMatch
        );
      });

      // Sort by exact matches first, then by favorites, then by name
      const sortedLists = matchingLists.sort((a, b) => {
        const aExact = a.name.toLowerCase() === normalizedQuery;
        const bExact = b.name.toLowerCase() === normalizedQuery;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        return a.name.localeCompare(b.name);
      });

      results.lists = sortedLists.slice(offset, offset + limit);
    }

    // Calculate total results
    results.total = results.tasks.length + results.lists.length;

    const response = {
      success: true,
      data: {
        query,
        results,
        metadata: {
          totalTasks: results.tasks.length,
          totalLists: results.lists.length,
          totalResults: results.total,
          hasMore: results.total > offset + limit,
          searchTime: Date.now(),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error performing search:", error);

    const errorResponse = {
      success: false,
      error: {
        code: "SEARCH_ERROR",
        message: error instanceof Error ? error.message : "Search failed",
      },
    };

    return NextResponse.json(errorResponse, { status: 400 });
  }
}

/**
 * Fuzzy matching algorithm (Levenshtein distance-based)
 */
function fuzzyMatch(query: string, text: string): boolean {
  if (query.length === 0) return true;
  if (text.length === 0) return false;

  // Direct substring match
  if (text.includes(query)) return true;

  // Fuzzy matching with Levenshtein distance
  const maxDistance = Math.floor(query.length * 0.3); // Allow up to 30% typos

  for (let i = 0; i <= text.length - query.length; i++) {
    const substring = text.substring(i, i + query.length);
    const distance = levenshteinDistance(query, substring);

    if (distance <= maxDistance) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
