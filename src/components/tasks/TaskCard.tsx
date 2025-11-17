'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar,
  Clock,
  Flag,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Archive,
  Paperclip,
  Bell,
  AlertCircle
} from 'lucide-react';
import { AppTask } from '@/types/tasks';
import { useTasks } from '@/store/hooks';

interface TaskCardProps {
  task: AppTask;
  onSelect?: (taskId: string, selected: boolean) => void;
  onEdit?: (task: AppTask) => void;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) void;
  onDuplicate?: (taskId: string) void;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

export function TaskCard({
  task,
  onSelect,
  onEdit,
  onComplete,
  onDelete,
  onDuplicate,
  className,
  showActions = true,
  compact = false
}: TaskCardProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const { updateTask } = useTasks();

  const handleComplete = async () => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await updateTask({
        id: task.id,
        status: newStatus
      });
      onComplete?.(task.id);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    return <Flag className={cn('h-3 w-3', {
      'text-red-500': priority === 'high',
      'text-yellow-500': priority === 'medium',
      'text-green-500': priority === 'low',
      'text-gray-500': priority === 'none',
    })} />;
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  const handleActionClick = (action: string) => {
    switch (action) {
      case 'edit':
        onEdit?.(task);
        break;
      case 'delete':
        onDelete?.(task.id);
        break;
      case 'duplicate':
        onDuplicate?.(task.id);
        break;
      case 'archive':
        updateTask({ id: task.id, status: 'archived' });
        break;
    }
    setShowActionsMenu(false);
  };

  return (
    <Card className={cn(
      'group hover:shadow-md transition-all duration-200',
      isOverdue && 'border-red-200 dark:border-red-800',
      task.status === 'completed' && 'opacity-75',
      className
    )}>
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={handleComplete}
            className="mt-1"
          />

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            {/* Task Title and Actions */}
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn(
                'font-medium text-sm leading-tight',
                task.status === 'completed' && 'line-through text-muted-foreground',
                isOverdue && 'text-red-600 dark:text-red-400'
              )}>
                {task.name}
              </h3>
              
              {showActions && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>

                  {/* Actions Menu */}
                  {showActionsMenu && (
                    <div className="absolute right-0 top-6 z-10 bg-background border rounded-md shadow-lg py-1 min-w-[120px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-7"
                        onClick={() => handleActionClick('edit')}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-7"
                        onClick={() => handleActionClick('duplicate')}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-7"
                        onClick={() => handleActionClick('archive')}
                      >
                        <Archive className="h-3 w-3 mr-2" />
                        Archive
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-7 text-red-600"
                        onClick={() => handleActionClick('delete')}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Task Description */}
            {task.description && !compact && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Task Metadata */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Priority */}
              <Badge
                variant={getPriorityColor(task.priority)}
                className="text-xs px-1.5 py-0.5"
              >
                <span className="flex items-center gap-1">
                  {getPriorityIcon(task.priority)}
                  {task.priority !== 'none' && task.priority}
                </span>
              </Badge>

              {/* Due Date */}
              {task.dueDate && (
                <Badge
                  variant={isOverdue ? "destructive" : "outline"}
                  className={cn(
                    "text-xs px-1.5 py-0.5 flex items-center gap-1",
                    isOverdue && "animate-pulse"
                  )}
                >
                  {isOverdue && <AlertCircle className="h-3 w-3" />}
                  <Calendar className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </Badge>
              )}

              {/* Estimate */}
              {task.estimate && !compact && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {task.estimate}
                </Badge>
              )}

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {task.attachments.length}
                </Badge>
              )}

              {/* Reminders */}
              {task.reminders && task.reminders.length > 0 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 flex items-center gap-1">
                  <Bell className="h-3 w-3" />
                  {task.reminders.length}
                </Badge>
              )}
            </div>

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && !compact && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">
                  Subtasks ({task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length})
                </div>
                <div className="flex gap-1 flex-wrap">
                  {task.subtasks.slice(0, 3).map((subtask) => (
                    <Badge
                      key={subtask.id}
                      variant={subtask.status === 'completed' ? "success" : "outline"}
                      className="text-xs px-1.5 py-0.5"
                    >
                      {subtask.name}
                    </Badge>
                  ))}
                  {task.subtasks.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      +{task.subtasks.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}