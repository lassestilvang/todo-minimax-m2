'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from './TaskCard';
import { AppTask } from '@/types/tasks';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Circle, 
  Clock,
  Flag,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List
} from 'lucide-react';

interface TaskListProps {
  tasks: AppTask[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  onTaskSelect?: (taskId: string, selected: boolean) => void;
  onTaskEdit?: (task: AppTask) => void;
  onTaskComplete?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskDuplicate?: (taskId: string) => void;
  className?: string;
  compact?: boolean;
  showActions?: boolean;
  loading?: boolean;
}

type SortOption = 'name' | 'dueDate' | 'priority' | 'createdAt' | 'status';
type GroupBy = 'none' | 'status' | 'priority' | 'dueDate';

export function TaskList({
  tasks,
  title = "Tasks",
  subtitle,
  emptyMessage = "No tasks found",
  onTaskSelect,
  onTaskEdit,
  onTaskComplete,
  onTaskDelete,
  onTaskDuplicate,
  className,
  compact = false,
  showActions = true,
  loading = false
}: TaskListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [showCompleted, setShowCompleted] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Filter and sort tasks
  const filteredTasks = tasks.filter(task => {
    if (!showCompleted && task.status === 'completed') return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) comparison = 0;
        else if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
        comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'createdAt':
      default:
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Group tasks if needed
  const groupedTasks = groupBy === 'none' 
    ? [{ group: null, tasks: sortedTasks }]
    : Object.entries(
        sortedTasks.reduce((groups, task) => {
          let groupKey: string;
          switch (groupBy) {
            case 'status':
              groupKey = task.status;
              break;
            case 'priority':
              groupKey = task.priority;
              break;
            case 'dueDate':
              if (!task.dueDate) groupKey = 'No due date';
              else {
                const today = new Date();
                const taskDate = new Date(task.dueDate);
                const isToday = taskDate.toDateString() === today.toDateString();
                const isOverdue = taskDate < today && task.status !== 'completed';
                if (isOverdue) groupKey = 'Overdue';
                else if (isToday) groupKey = 'Today';
                else if (taskDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) groupKey = 'This week';
                else groupKey = 'Later';
              }
              break;
            default:
              groupKey = 'All';
          }
          
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(task);
          return groups;
        }, {} as Record<string, AppTask[]>)
      ).map(([group, tasks]) => ({ group, tasks }));

  const getGroupIcon = (group: string | null, groupBy: GroupBy) => {
    if (!group) return null;
    
    switch (groupBy) {
      case 'status':
        return group === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4" />;
      case 'priority':
        return <Flag className="h-4 w-4" />;
      case 'dueDate':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getGroupTitle = (group: string | null, groupBy: GroupBy) => {
    if (!group) return title;
    
    switch (groupBy) {
      case 'status':
        return group.charAt(0).toUpperCase() + group.slice(1);
      case 'priority':
        return group.charAt(0).toUpperCase() + group.slice(1) + ' Priority';
      case 'dueDate':
        return group;
      default:
        return group;
    }
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sortedTasks.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="text-muted-foreground">
          <Circle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">{emptyMessage}</p>
          <p className="text-sm">Get started by creating your first task</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>

          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="none">No grouping</option>
            <option value="status">Group by status</option>
            <option value="priority">Group by priority</option>
            <option value="dueDate">Group by due date</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="createdAt">Sort by date</option>
            <option value="name">Sort by name</option>
            <option value="priority">Sort by priority</option>
            <option value="dueDate">Sort by due date</option>
            <option value="status">Sort by status</option>
          </select>

          {/* Sort Order */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>

          {/* Show Completed Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className={!showCompleted && 'opacity-50'}
          >
            <Filter className="h-4 w-4 mr-2" />
            Completed
          </Button>
        </div>
      </div>

      {/* Task Groups */}
      <div className="space-y-6">
        {groupedTasks.map(({ group, tasks: groupTasks }) => (
          <div key={group || 'default'} className="space-y-3">
            {/* Group Header */}
            {groupBy !== 'none' && group && (
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {getGroupIcon(group, groupBy)}
                <span>{getGroupTitle(group, groupBy)}</span>
                <Badge variant="outline" className="ml-auto">
                  {groupTasks.length}
                </Badge>
              </div>
            )}

            {/* Tasks */}
            <div className={cn(
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            )}>
              {groupTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onSelect={onTaskSelect}
                  onEdit={onTaskEdit}
                  onComplete={onTaskComplete}
                  onDelete={onTaskDelete}
                  onDuplicate={onTaskDuplicate}
                  compact={compact}
                  showActions={showActions}
                  className={viewMode === 'grid' ? 'h-fit' : ''}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="text-center text-sm text-muted-foreground border-t pt-4">
        {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''} • {sortedTasks.filter(t => t.status === 'completed').length} completed
      </div>
    </div>
  );
}