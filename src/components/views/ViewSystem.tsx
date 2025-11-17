'use client';

import { useMemo } from 'react';
import { TaskList } from '../tasks';
import { AppTask } from '@/types/tasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  List,
  Plus,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useTasks } from '@/store/hooks';

interface ViewSystemProps {
  view: 'today' | 'next7' | 'upcoming' | 'all';
  onCreateTask?: () => void;
  onEditTask?: (task: AppTask) => void;
  className?: string;
}

export function ViewSystem({ view, onCreateTask, onEditTask, className }: ViewSystemProps) {
  const { tasks, updateTask, deleteTask, duplicateTask } = useTasks();

  // Filter tasks based on view type
  const { filteredTasks, viewTitle, viewSubtitle, statistics } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    let filtered: AppTask[] = [];
    let title = '';
    let subtitle = '';
    let stats = { total: 0, completed: 0, overdue: 0, today: 0 };

    switch (view) {
      case 'today':
        // Tasks due today or overdue
        filtered = tasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate.toDateString() === today.toDateString();
        });
        title = 'Today';
        subtitle = `Tasks scheduled for ${today.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })}`;
        stats = {
          total: filtered.length,
          completed: filtered.filter(t => t.status === 'completed').length,
          overdue: filtered.filter(t => t.status !== 'completed' && new Date(t.dueDate!) < today).length,
          today: filtered.filter(t => t.status !== 'completed').length,
        };
        break;

      case 'next7':
        // Tasks due in the next 7 days (including today)
        filtered = tasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate >= today && taskDate <= nextWeek;
        }).sort((a, b) => {
          // Sort by due date
          if (!a.dueDate || !b.dueDate) return 0;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        title = 'Next 7 Days';
        subtitle = `Tasks due between ${today.toLocaleDateString()} and ${nextWeek.toLocaleDateString()}`;
        stats = {
          total: filtered.length,
          completed: filtered.filter(t => t.status === 'completed').length,
          overdue: filtered.filter(t => t.status !== 'completed' && new Date(t.dueDate!) < now).length,
          today: filtered.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString()).length,
        };
        break;

      case 'upcoming':
        // All future tasks (not completed)
        filtered = tasks.filter(task => {
          if (task.status === 'completed' || task.status === 'archived') return false;
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate > now;
        }).sort((a, b) => {
          // Sort by due date
          if (!a.dueDate || !b.dueDate) return 0;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        title = 'Upcoming';
        subtitle = 'All future tasks scheduled';
        stats = {
          total: filtered.length,
          completed: 0, // No completed tasks in upcoming view
          overdue: filtered.filter(t => new Date(t.dueDate!) < now).length, // Just in case
          today: filtered.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString()).length,
        };
        break;

      case 'all':
      default:
        // All tasks except archived
        filtered = tasks.filter(task => task.status !== 'archived');
        title = 'All Tasks';
        subtitle = 'Complete task overview';
        stats = {
          total: filtered.length,
          completed: filtered.filter(t => t.status === 'completed').length,
          overdue: filtered.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length,
          today: filtered.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString()).length,
        };
        break;
    }

    return {
      filteredTasks: filtered,
      viewTitle: title,
      viewSubtitle: subtitle,
      statistics: stats
    };
  }, [tasks, view]);

  const handleTaskComplete = async (taskId: string) => {
    try {
      const task = filteredTasks.find(t => t.id === taskId);
      if (task) {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
        await updateTask({ id: taskId, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const getViewIcon = () => {
    switch (view) {
      case 'today': return <Calendar className="h-5 w-5" />;
      case 'next7': return <Clock className="h-5 w-5" />;
      case 'upcoming': return <TrendingUp className="h-5 w-5" />;
      case 'all': return <List className="h-5 w-5" />;
    }
  };

  const getCompletionRate = () => {
    if (statistics.total === 0) return 0;
    return Math.round((statistics.completed / statistics.total) * 100);
  };

  return (
    <div className={className}>
      {/* View Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {getViewIcon()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{viewTitle}</h1>
            <p className="text-muted-foreground">{viewSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onCreateTask} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{statistics.total}</p>
              </div>
              <List className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.today}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{statistics.overdue}</p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <TaskList
        tasks={filteredTasks}
        title=""
        subtitle=""
        onTaskComplete={handleTaskComplete}
        onTaskEdit={onEditTask}
        onTaskDelete={deleteTask}
        onTaskDuplicate={duplicateTask}
        emptyMessage={
          view === 'today' 
            ? "No tasks due today. Great job staying on top of things!"
            : view === 'upcoming'
            ? "No upcoming tasks. Schedule some future tasks to get started."
            : view === 'next7'
            ? "No tasks in the next 7 days. You're all caught up!"
            : "No tasks found. Create your first task to get started!"
        }
      />

      {/* Quick Actions */}
      {filteredTasks.length === 0 && (
        <div className="mt-8 text-center">
          <Button onClick={onCreateTask} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Task
          </Button>
        </div>
      )}
    </div>
  );
}