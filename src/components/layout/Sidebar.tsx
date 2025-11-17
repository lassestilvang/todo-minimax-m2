'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Star, 
  StarOff,
  MoreVertical,
  Edit,
  Trash2,
  Inbox
} from 'lucide-react';
import { useLists } from '@/store/hooks';
import { CreateListData } from '@/types/lists';

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  const { 
    lists, 
    createList, 
    updateList, 
    deleteList, 
    toggleFavorite 
  } = useLists();

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    try {
      await createList({
        name: newListName.trim(),
        color: '#3B82F6', // Default blue
      });
      setNewListName('');
      setShowCreateList(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  const handleToggleFavorite = async (listId: string, isFavorite: boolean) => {
    try {
      await updateList({ id: listId, isFavorite: !isFavorite });
    } catch (error) {
      console.error('Failed to update favorite status:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (confirm('Are you sure you want to delete this list?')) {
      try {
        await deleteList(listId);
      } catch (error) {
        console.error('Failed to delete list:', error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Inbox List */}
      <div className="p-2">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-2 h-9',
            collapsed && 'px-2'
          )}
        >
          <Inbox className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Inbox</span>
              <Badge variant="secondary" className="text-xs">
                0
              </Badge>
            </>
          )}
        </Button>
      </div>

      {/* Lists Section */}
      <div className="flex-1 overflow-y-auto p-2">
        {!collapsed && (
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Lists
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowCreateList(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Create List Form */}
        {showCreateList && (
          <Card className="p-2 mb-2">
            <input
              type="text"
              placeholder="List name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
              autoFocus
            />
            <div className="flex gap-1 mt-2">
              <Button
                size="sm"
                onClick={handleCreateList}
                disabled={!newListName.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCreateList(false);
                  setNewListName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* List Items */}
        <div className="space-y-1">
          {lists.map((list) => (
            <div
              key={list.id}
              className="group relative flex items-center gap-2"
            >
              <Button
                variant="ghost"
                className={cn(
                  'flex-1 justify-start gap-2 h-8',
                  collapsed && 'px-2'
                )}
                style={{ color: list.color }}
              >
                <span className="text-sm">
                  {list.emoji || '📋'}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">
                      {list.name}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className="text-xs h-5 min-w-[20px]"
                    >
                      0
                    </Badge>
                  </>
                )}
              </Button>

              {/* List Actions */}
              {!collapsed && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleToggleFavorite(list.id, list.isFavorite)}
                  >
                    {list.isFavorite ? (
                      <Star className="h-3 w-3 fill-current" />
                    ) : (
                      <StarOff className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDeleteList(list.id)}
                    disabled={list.name === 'Inbox'}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Collapsed State - Quick Add List Button */}
      {collapsed && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setShowCreateList(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Collapsed List Creation Modal */}
      {collapsed && showCreateList && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="w-80 p-4">
            <h3 className="font-semibold mb-2">Create New List</h3>
            <input
              type="text"
              placeholder="List name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4 outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="flex-1"
              >
                Create
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateList(false);
                  setNewListName('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}