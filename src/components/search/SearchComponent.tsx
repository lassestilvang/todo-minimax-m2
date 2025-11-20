"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TaskCard } from "../tasks";
import { ListCard } from "../lists";
import { AppTask } from "@/types/tasks";
import { AppList } from "@/types/lists";
import { SearchFilters } from "@/types/api";
import {
  Search,
  Filter,
  X,
  Clock,
  Calendar,
  Flag,
  CheckCircle2,
  Circle,
  List,
  Archive,
  ArrowRight,
} from "lucide-react";
import { useTasks } from "@/store/hooks";
import { useLists } from "@/store/hooks";
import React from "react";

interface SearchResult {
  type: "task" | "list";
  item: AppTask | AppList;
  score: number;
  matches: string[];
}

interface SearchComponentProps {
  onTaskSelect?: (task: AppTask) => void;
  onListSelect?: (list: AppList) => void;
  onClose?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export function SearchComponent({
  onTaskSelect,
  onListSelect,
  onClose,
  className,
  autoFocus = true,
}: SearchComponentProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: "all",
    status: undefined,
    priority: undefined,
    dueDateFrom: undefined,
    dueDateTo: undefined,
    completed: undefined,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { tasks } = useTasks();
  const { lists } = useLists();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, tasks, lists]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);

    try {
      // Mock search implementation (would normally call API)
      const searchResults = performLocalSearch(searchQuery, filters);
      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const performLocalSearch = (
    searchQuery: string,
    searchFilters: SearchFilters
  ): SearchResult[] => {
    const results: SearchResult[] = [];
    const queryLower = searchQuery.toLowerCase();

    // Search Tasks
    if (searchFilters.type === "all" || searchFilters.type === "tasks") {
      const taskResults = tasks
        .filter((task: AppTask) => {
          // Text search
          const nameMatch = task.name.toLowerCase().includes(queryLower);
          const descMatch = task.description
            ?.toLowerCase()
            .includes(queryLower);

          if (!nameMatch && !descMatch) return false;

          // Apply filters
          if (searchFilters.status && task.status !== searchFilters.status)
            return false;
          if (
            searchFilters.priority &&
            task.priority !== searchFilters.priority
          )
            return false;
          if (searchFilters.completed !== undefined) {
            const isCompleted = task.status === "done";
            if (searchFilters.completed !== isCompleted) return false;
          }

          // Due date filters
          if (searchFilters.dueDateFrom && task.dueDate) {
            const taskDate = new Date(task.dueDate);
            const fromDate = new Date(searchFilters.dueDateFrom);
            if (taskDate < fromDate) return false;
          }

          if (searchFilters.dueDateTo && task.dueDate) {
            const taskDate = new Date(task.dueDate);
            const toDate = new Date(searchFilters.dueDateTo);
            if (taskDate > toDate) return false;
          }

          return true;
        })
        .map((task: AppTask) => {
          // Calculate relevance score
          let score = 0;
          const matches: string[] = [];

          if (task.name.toLowerCase() === queryLower) {
            score += 100;
            matches.push("Exact name match");
          } else if (task.name.toLowerCase().includes(queryLower)) {
            score += 80;
            matches.push("Name contains query");
          }

          if (task.description?.toLowerCase() === queryLower) {
            score += 60;
            matches.push("Exact description match");
          } else if (task.description?.toLowerCase().includes(queryLower)) {
            score += 40;
            matches.push("Description contains query");
          }

          // Boost score for priority and due date relevance
          if (task.priority === "High") score += 20;
          if (task.dueDate) {
            const daysUntilDue = Math.ceil(
              (new Date(task.dueDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );
            if (daysUntilDue <= 7) score += 10;
          }

          return { type: "task" as const, item: task, score, matches };
        });

      results.push(...taskResults);
    }

    // Search Lists
    if (searchFilters.type === "all" || searchFilters.type === "lists") {
      const listResults = lists
        .filter((list: AppList) => {
          const nameMatch = list.name.toLowerCase().includes(queryLower);
          const descMatch = list.description
            ?.toLowerCase()
            .includes(queryLower);
          const emojiMatch = list.emoji?.toLowerCase().includes(queryLower);

          if (!nameMatch && !descMatch && !emojiMatch) return false;
          return true;
        })
        .map((list: AppList) => {
          let score = 0;
          const matches: string[] = [];

          if (list.name.toLowerCase() === queryLower) {
            score += 100;
            matches.push("Exact name match");
          } else if (list.name.toLowerCase().includes(queryLower)) {
            score += 80;
            matches.push("Name contains query");
          }

          if (list.description?.toLowerCase() === queryLower) {
            score += 60;
            matches.push("Exact description match");
          } else if (list.description?.toLowerCase().includes(queryLower)) {
            score += 40;
            matches.push("Description contains query");
          }

          if (list.isFavorite) score += 20;

          return { type: "list" as const, item: list, score, matches };
        });

      results.push(...listResults);
    }

    // Sort by relevance score
    return results.sort((a, b) => b.score - a.score);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  };

  const clearFilters = () => {
    setFilters({
      type: "all",
      status: undefined,
      priority: undefined,
      dueDateFrom: undefined,
      dueDateTo: undefined,
      completed: undefined,
    });
  };

  const hasActiveFilters =
    filters.status ||
    filters.priority ||
    filters.completed !== undefined ||
    filters.dueDateFrom ||
    filters.dueDateTo;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tasks and lists..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setQuery(e.target.value)
          }
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => setQuery("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {
                [
                  filters.status && "Status",
                  filters.priority && "Priority",
                  filters.completed !== undefined && "Completion",
                  filters.dueDateFrom && "Date From",
                  filters.dueDateTo && "Date To",
                ].filter(Boolean).length
              }
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Search in
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value as any })
                }
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="all">Tasks and Lists</option>
                <option value="tasks">Tasks only</option>
                <option value="lists">Lists only</option>
              </select>
            </div>

            {/* Task Status */}
            {(filters.type === "all" || filters.type === "tasks") && (
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select
                  value={filters.status || ""}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFilters({
                      ...filters,
                      status: e.target.value || undefined,
                    })
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}

            {/* Task Priority */}
            {(filters.type === "all" || filters.type === "tasks") && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Priority
                </label>
                <select
                  value={filters.priority || ""}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFilters({ ...filters, priority: e.target.value as any })
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">All priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="None">None</option>
                </select>
              </div>
            )}
          </div>

          {/* Due Date Filters */}
          {(filters.type === "all" || filters.type === "tasks") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Due after
                </label>
                <Input
                  type="date"
                  value={filters.dueDateFrom || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({
                      ...filters,
                      dueDateFrom: e.target.value || undefined,
                    })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Due before
                </label>
                <Input
                  type="date"
                  value={filters.dueDateTo || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({
                      ...filters,
                      dueDateTo: e.target.value || undefined,
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Results */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Searching...</p>
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-8">
          <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No results found for "{query}"
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="mt-2"
          >
            Clear filters
          </Button>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-6">
          {/* Task Results */}
          {results.some((r) => r.type === "task") && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tasks ({results.filter((r) => r.type === "task").length})
              </h3>
              <div className="space-y-2">
                {results
                  .filter((r) => r.type === "task")
                  .map((result) => (
                    <div
                      key={result.item.id}
                      className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                      onClick={() => onTaskSelect?.(result.item as AppTask)}
                    >
                      <TaskCard
                        task={result.item as AppTask}
                        compact={true}
                        showActions={false}
                      />
                      {result.matches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.matches.map((match, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {match}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* List Results */}
          {results.some((r) => r.type === "list") && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <List className="h-4 w-4" />
                Lists ({results.filter((r) => r.type === "list").length})
              </h3>
              <div className="space-y-2">
                {results
                  .filter((r) => r.type === "list")
                  .map((result) => (
                    <div
                      key={result.item.id}
                      className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                      onClick={() => onListSelect?.(result.item as AppList)}
                    >
                      <ListCard
                        list={result.item as AppList}
                        compact={true}
                        showTaskCounts={false}
                      />
                      {result.matches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.matches.map((match, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {match}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Search Summary */}
          <div className="text-center text-xs text-muted-foreground border-t pt-2">
            Found {results.length} result{results.length !== 1 ? "s" : ""} for "
            {query}" in {(Date.now() / 1000).toFixed(2)}s
          </div>
        </div>
      )}

      {/* Empty State */}
      {!query && (
        <div className="text-center py-8">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            Search your tasks and lists
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Find tasks by name, description, priority, or due date
          </p>
          <div className="flex justify-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">High priority tasks</Badge>
            <Badge variant="outline">Due today</Badge>
            <Badge variant="outline">Completed items</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
