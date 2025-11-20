"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import { TaskList } from "../tasks";
import { AppTask } from "@/types/tasks";
import { TaskId } from "@/types/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useViewTransition } from "@/hooks/use-view-transition";
import {
  Calendar,
  Clock,
  TrendingUp,
  List,
  Plus,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { useTaskStore } from "@/store/task-store";
import { shallow } from "zustand/shallow";

interface ViewSystemProps {
  view: "today" | "next7" | "upcoming" | "all";
  onCreateTask?: () => void;
  onEditTask?: (task: AppTask) => void;
  className?: string;
}

export function ViewSystem({
  view,
  onCreateTask,
  onEditTask,
  className,
}: ViewSystemProps) {
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const duplicateTask = useTaskStore((state) => state.duplicateTask);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  const {
    supportsViewTransition,
    withViewTransition,
    getTransitionNames,
    applyTransitionStyles,
  } = useViewTransition();

  // Filter tasks based on view type
  const { filteredTasks, viewTitle, viewSubtitle, statistics } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    let filtered: AppTask[] = [];
    let title = "";
    let subtitle = "";
    let stats = { total: 0, completed: 0, overdue: 0, today: 0 };

    switch (view) {
      case "today":
        // Tasks due today or overdue
        filtered = tasks.filter((task: AppTask) => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate.toDateString() === today.toDateString();
        });
        title = "Today";
        subtitle = `Tasks scheduled for ${today.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}`;
        stats = {
          total: filtered.length,
          completed: filtered.filter((t: AppTask) => t.status === "done")
            .length,
          overdue: filtered.filter(
            (t: AppTask) => t.status !== "done" && new Date(t.dueDate!) < today
          ).length,
          today: filtered.filter((t: AppTask) => t.status !== "done").length,
        };
        break;

      case "next7":
        // Tasks due in the next 7 days (including today)
        filtered = tasks
          .filter((task: AppTask) => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate >= today && taskDate <= nextWeek;
          })
          .sort((a: AppTask, b: AppTask) => {
            // Sort by due date
            if (!a.dueDate || !b.dueDate) return 0;
            return (
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            );
          });
        title = "Next 7 Days";
        subtitle = `Tasks due between ${today.toLocaleDateString()} and ${nextWeek.toLocaleDateString()}`;
        stats = {
          total: filtered.length,
          completed: filtered.filter((t: AppTask) => t.status === "done")
            .length,
          overdue: filtered.filter(
            (t: AppTask) => t.status !== "done" && new Date(t.dueDate!) < now
          ).length,
          today: filtered.filter(
            (t: AppTask) =>
              t.dueDate &&
              new Date(t.dueDate).toDateString() === today.toDateString()
          ).length,
        };
        break;

      case "upcoming":
        // All future tasks (not completed)
        filtered = tasks
          .filter((task: AppTask) => {
            if (task.status === "done" || task.status === "archived")
              return false;
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate > now;
          })
          .sort((a: AppTask, b: AppTask) => {
            // Sort by due date
            if (!a.dueDate || !b.dueDate) return 0;
            return (
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            );
          });
        title = "Upcoming";
        subtitle = "All future tasks scheduled";
        stats = {
          total: filtered.length,
          completed: 0, // No completed tasks in upcoming view
          overdue: filtered.filter((t: AppTask) => new Date(t.dueDate!) < now)
            .length, // Just in case
          today: filtered.filter(
            (t: AppTask) =>
              t.dueDate &&
              new Date(t.dueDate).toDateString() === today.toDateString()
          ).length,
        };
        break;

      case "all":
      default:
        // All tasks except archived
        filtered = tasks.filter((task: AppTask) => task.status !== "archived");
        title = "All Tasks";
        subtitle = "Complete task overview";
        stats = {
          total: filtered.length,
          completed: filtered.filter((t: AppTask) => t.status === "done")
            .length,
          overdue: filtered.filter(
            (t: AppTask) =>
              t.status !== "done" && t.dueDate && new Date(t.dueDate) < now
          ).length,
          today: filtered.filter(
            (t: AppTask) =>
              t.dueDate &&
              new Date(t.dueDate).toDateString() === today.toDateString()
          ).length,
        };
        break;
    }

    return {
      filteredTasks: filtered,
      viewTitle: title,
      viewSubtitle: subtitle,
      statistics: stats,
    };
  }, [tasks, view]);

  const handleTaskComplete = async (taskId: TaskId) => {
    try {
      const task = filteredTasks.find((t) => t.id === taskId);
      if (task) {
        const newStatus = task.status === "done" ? "todo" : "done";
        const performUpdate = async () => {
          await updateTask({ id: taskId, status: newStatus });
        };

        if (supportsViewTransition) {
          await withViewTransition(performUpdate);
        } else {
          await performUpdate();
        }
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const getViewIcon = () => {
    switch (view) {
      case "today":
        return <Calendar className="h-5 w-5" />;
      case "next7":
        return <Clock className="h-5 w-5" />;
      case "upcoming":
        return <TrendingUp className="h-5 w-5" />;
      case "all":
        return <List className="h-5 w-5" />;
    }
  };

  const getCompletionRate = () => {
    if (statistics.total === 0) return 0;
    return Math.round((statistics.completed / statistics.total) * 100);
  };

  const handleCreateTaskWithTransition = useCallback(() => {
    if (isTransitioning || !onCreateTask) return;

    setIsTransitioning(true);

    const performCreate = () => {
      onCreateTask();

      // Clean up transition after delay
      setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
    };

    if (supportsViewTransition) {
      withViewTransition(async () => performCreate());
    } else {
      performCreate();
    }
  }, [
    onCreateTask,
    isTransitioning,
    supportsViewTransition,
    withViewTransition,
  ]);

  return (
    <div
      className={`content-${view} view-${view}-transition ${
        isTransitioning ? "opacity-90" : "opacity-100"
      } ${className}`}
      ref={viewRef}
      suppressHydrationWarning
    >
      {/* View Header */}
      <div className="flex items-center justify-between mb-6 view-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">{getViewIcon()}</div>
          <div>
            <h1 className="text-2xl font-bold">{viewTitle}</h1>
            <p className="text-muted-foreground">{viewSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleCreateTaskWithTransition}
            className="gap-2 view-modal-transition"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="view-content">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Tasks
                </p>
                <p className="text-2xl font-bold">{statistics.total}</p>
              </div>
              <List className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="view-content">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Completed
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.completed}
                  {statistics.total > 0 && (
                    <span className="text-sm text-muted-foreground ml-1">
                      ({getCompletionRate()}%)
                    </span>
                  )}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="view-content">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Due Today
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {statistics.today}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="view-content">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {statistics.overdue}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div className="view-content">
        <TaskList
          tasks={filteredTasks}
          title=""
          subtitle=""
          onTaskComplete={handleTaskComplete}
          onTaskEdit={onEditTask}
          onTaskDelete={deleteTask}
          onTaskDuplicate={duplicateTask}
          emptyMessage={
            view === "today"
              ? "No tasks due today. Great job staying on top of things!"
              : view === "upcoming"
              ? "No upcoming tasks. Schedule some future tasks to get started."
              : view === "next7"
              ? "No tasks in the next 7 days. You're all caught up!"
              : "No tasks found. Create your first task to get started!"
          }
        />
      </div>

      {/* Quick Actions */}
      {filteredTasks.length === 0 && (
        <div className="mt-8 text-center">
          <Button
            onClick={handleCreateTaskWithTransition}
            className="gap-2 view-modal-transition"
          >
            <Plus className="h-4 w-4" />
            Create Your First Task
          </Button>
        </div>
      )}
    </div>
  );
}
