'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MoreVertical,
  Edit,
  Trash2,
  Star,
  StarOff,
  CheckCircle2,
  Circle,
  Plus,
  Users
} from 'lucide-react';
import { AppList } from '@/types/lists';
import { useLists } from '@/store/hooks';
import { useTasks } from '@/store/hooks';

interface ListCardProps {
  list: AppList;
  onSelect?: (list: AppList) => void;
  onEdit?: (list: AppList) => void;
  onDelete?: (listId: string) void;
  onToggleFavorite?: (listId: string, isFavorite: boolean) => void;
  className?: string;
  compact?: boolean;
  selected?: boolean;
  showTaskCounts?: boolean;
}

export function ListCard({
  list,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  className,
  compact = false,
  selected = false,
  showTaskCounts = true
}: ListCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  
  const { updateList, deleteList } = useLists();
  const { tasks } = useTasks();

  // Get task counts for this list
  const listTasks = tasks.filter(task => task.listId === list.id);
  const completedTasks = listTasks.filter(task => task.status === 'completed');
  const pendingTasks = listTasks.filter(task => task.status === 'todo');
  const inProgressTasks = listTasks.filter(task => task.status === 'in-progress');

  const handleToggleFavorite = async () => {
    try {
      await updateList({ id: list.id, isFavorite: !list.isFavorite });
      onToggleFavorite?.(list.id, !list.isFavorite);
    } catch (error) {
      console.error('Failed to update favorite status:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
      try {
        await deleteList(list.id);
        onDelete?.(list.id);
      } catch (error) {
        console.error('Failed to delete list:', error);
      }
    }
  };

  const handleEdit = async () => {
    if (editing) {
      if (editName.trim() && editName !== list.name) {
        try {
          await updateList({ id: list.id, name: editName.trim() });
          onEdit?.({ ...list, name: editName.trim() });
        } catch (error) {
          console.error('Failed to update list name:', error);
          setEditName(list.name); // Reset on error
        }
      }
      setEditing(false);
    } else {
      setEditing(true);
      setEditName(list.name);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEdit();
    } else if (e.key === 'Escape') {
      setEditName(list.name);
      setEditing(false);
    }
  };

  const getListIcon = () => {
    return list.emoji || '📋';
  };

  const getProgressPercentage = () => {
    if (listTasks.length === 0) return 0;
    return Math.round((completedTasks.length / listTasks.length) * 100);
  };

  return (
    <Card 
      className={cn(
        'group hover:shadow-md transition-all duration-200 cursor-pointer',
        selected && 'ring-2 ring-primary',
        list.isFavorite && 'border-yellow-200 dark:border-yellow-800',
        className
      )}
      onClick={() => !editing && onSelect?.(list)}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start justify-between gap-2">
          {/* List Icon and Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div 
              className="text-xl flex-shrink-0 mt-0.5"
              style={{ color: list.color }}
            >
              {getListIcon()}
            </div>

            {/* List Details */}
            <div className="flex-1 min-w-0">
              {/* Name */}
              {editing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleEdit}
                  onKeyDown={handleKeyPress}
                  className="text-sm font-medium h-7"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm truncate">{list.name}</h3>
                  {list.isFavorite && (
                    <Star className="h-3 w-3 fill-current text-yellow-500 flex-shrink-0" />
                  )}
                  {list.isShared && (
                    <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              )}

              {/* Description */}
              {list.description && !compact && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {list.description}
                </p>
              )}

              {/* Progress and Stats */}
              {showTaskCounts && listTasks.length > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  {/* Progress Bar */}
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>

                  {/* Task Counts */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {pendingTasks.length > 0 && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {pendingTasks.length} todo
                      </Badge>
                    )}
                    {inProgressTasks.length > 0 && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {inProgressTasks.length} active
                      </Badge>
                    )}
                    {completedTasks.length > 0 && (
                      <Badge variant="success" className="text-xs px-1 py-0">
                        {completedTasks.length} done
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Task Count Badge */}
              {showTaskCounts && listTasks.length > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {listTasks.length} task{listTasks.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
                showActions && 'opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>

            {/* Actions Menu */}
            {showActions && (
              <div className="absolute right-0 top-6 z-10 bg-background border rounded-md shadow-lg py-1 min-w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                    setShowActions(false);
                  }}
                >
                  <Edit className="h-3 w-3 mr-2" />
                  Rename
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite();
                    setShowActions(false);
                  }}
                >
                  {list.isFavorite ? (
                    <>
                      <StarOff className="h-3 w-3 mr-2" />
                      Remove from favorites
                    </>
                  ) : (
                    <>
                      <Star className="h-3 w-3 mr-2" />
                      Add to favorites
                    </>
                  )}
                </Button>
                
                {list.name !== 'Inbox' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-7 text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                      setShowActions(false);
                    }}
                    disabled={listTasks.length > 0}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                    {listTasks.length > 0 && ` (${listTasks.length} tasks)`}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {showTaskCounts && listTasks.length === 0 && (
          <div className="mt-3 pt-3 border-t border-dashed">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Circle className="h-3 w-3" />
              <span>No tasks yet</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}