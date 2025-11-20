"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ListCard } from "./ListCard";
import { AppList } from "@/types/lists";
import { useLists } from "@/store/hooks";
import {
  Grid,
  List,
  SortAsc,
  SortDesc,
  Filter,
  Plus,
  Star,
  Archive,
  Inbox,
} from "lucide-react";

interface ListGridProps {
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  onListSelect?: (list: AppList) => void;
  onListEdit?: (list: AppList) => void;
  onListDelete?: (listId: string) => void;
  onCreateList?: () => void;
  className?: string;
  compact?: boolean;
  showCreateButton?: boolean;
  selectedListId?: string;
}

type SortOption =
  | "name"
  | "createdAt"
  | "updatedAt"
  | "taskCount"
  | "favorites";
type FilterOption = "all" | "favorites" | "recent" | "shared";

export function ListGrid({
  title = "Lists",
  subtitle,
  emptyMessage = "No lists found",
  onListSelect,
  onListEdit,
  onListDelete,
  onCreateList,
  className,
  compact = false,
  showCreateButton = true,
  selectedListId,
}: ListGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListEmoji, setNewListEmoji] = useState("📋");
  const [newListColor, setNewListColor] = useState("#3B82F6");

  const { lists, createList } = useLists();

  // Available emojis for list icons
  const emojiOptions = [
    "📋",
    "📁",
    "📝",
    "📚",
    "🎯",
    "🏠",
    "💼",
    "🎨",
    "🔧",
    "💻",
    "📞",
    "📧",
    "🛒",
    "🎉",
    "🌟",
    "🔥",
    "💡",
    "⚡",
    "🚀",
    "📊",
  ];

  // Available colors for lists
  const colorOptions = [
    "#3B82F6",
    "#EF4444",
    "#F59E0B",
    "#10B981",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#6366F1",
  ];

  // Filter and sort lists
  const filteredAndSortedLists = lists
    .filter((list: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !list.name.toLowerCase().includes(query) &&
          !list.description?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Category filter
      switch (filterBy) {
        case "favorites":
          return list.isFavorite;
        case "recent":
          // Mock recent lists (could be based on last access time)
          return true; // For now, show all as recent
        case "shared":
          return list.isShared;
        case "all":
        default:
          return true;
      }
    })
    .sort((a: any, b: any) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'favorites':
          comparison = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
          break;
        case 'taskCount':
          // Mock task count - would need to calculate from tasks
          comparison = 0;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      await createList({
        name: newListName.trim(),
        emoji: newListEmoji,
        color: newListColor,
      });

      // Reset form
      setNewListName("");
      setNewListEmoji("📋");
      setNewListColor("#3B82F6");
      setShowCreateDialog(false);
      onCreateList?.();
    } catch (error) {
      console.error("Failed to create list:", error);
    }
  };

  const handleListSelect = (list: AppList) => {
    onListSelect?.(list);
  };

  const handleListEdit = (list: AppList) => {
    onListEdit?.(list);
  };

  const handleListDelete = (listId: string) => {
    onListDelete?.(listId);
  };

  if (lists.length === 0 && !showCreateDialog) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">{emptyMessage}</p>
          <p className="text-sm mb-4">
            Create your first list to get started organizing your tasks
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {showCreateButton && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create List
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">List Name</label>
                  <Input
                    placeholder="Enter list name..."
                    value={newListName}
                    onChange={(e: any) => setNewListName(e.target.value)}
                    onKeyPress={(e: any) => e.key === "Enter" && handleCreateList()}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Icon</label>
                  <div className="grid grid-cols-10 gap-2">
                    {emojiOptions.map((emoji) => (
                      <Button
                        key={emoji}
                        variant={newListEmoji === emoji ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setNewListEmoji(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map((color) => (
                      <Button
                        key={color}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-2"
                        style={{
                          backgroundColor: color,
                          borderColor: newListColor === color ? "#000" : color,
                        }}
                        onClick={() => setNewListColor(color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateList}
                    disabled={!newListName.trim()}
                  >
                    Create List
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <Input
          placeholder="Search lists..."
          value={searchQuery}
          onChange={(e: any) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />

        {/* Filter */}
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as FilterOption)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">All lists</option>
          <option value="favorites">Favorites</option>
          <option value="recent">Recent</option>
          <option value="shared">Shared</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="name">Sort by name</option>
          <option value="createdAt">Sort by created</option>
          <option value="updatedAt">Sort by updated</option>
          <option value="favorites">Sort by favorites</option>
        </select>

        {/* Sort Order */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
        </Button>

        {/* View Mode */}
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="rounded-r-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lists Grid */}
      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        )}
      >
        {filteredAndSortedLists.map((list: any) => (
          <ListCard
            key={list.id}
            list={list}
            onSelect={handleListSelect}
            onEdit={handleListEdit}
            onDelete={handleListDelete}
            compact={compact}
            selected={selectedListId === list.id}
            showTaskCounts={true}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedLists.length === 0 && lists.length > 0 && (
        <div className="text-center py-8">
          <div className="text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No lists match your current filters</p>
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery("");
                setFilterBy("all");
              }}
              className="mt-2"
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}

      {/* Summary */}
      {filteredAndSortedLists.length > 0 && (
        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          {filteredAndSortedLists.length} list
          {filteredAndSortedLists.length !== 1 ? "s" : ""} •{" "}
          {filteredAndSortedLists.filter((l: any) => l.isFavorite).length} favorite
          {filteredAndSortedLists.filter((l: any) => l.isFavorite).length !== 1
            ? "s"
            : ""}
        </div>
      )}
    </div>
  );
}
