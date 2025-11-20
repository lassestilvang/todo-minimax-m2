"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  Plus,
  Settings,
  Menu,
  X,
  Calendar,
  Clock,
  Filter,
  Star,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useTasks } from "@/store/hooks";
import { useLists } from "@/store/hooks";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const {
    theme,
    sidebarCollapsed,
    setSidebarCollapsed,
    currentView,
    setCurrentView,
  } = useAppStore();

  const { createTask } = useTasks();
  const { lists } = useLists();

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navigationItems = [
    {
      id: "today",
      name: "Today",
      icon: Calendar,
      view: "today" as const,
    },
    {
      id: "next7",
      name: "Next 7 Days",
      icon: Clock,
      view: "next7" as const,
    },
    {
      id: "upcoming",
      name: "Upcoming",
      icon: Calendar,
      view: "upcoming" as const,
    },
    {
      id: "all",
      name: "All Tasks",
      icon: Filter,
      view: "all" as const,
    },
  ];

  const handleQuickAdd = () => {
    createTask({
      name: "New Task",
      priority: "None",
      listId: lists[0]?.id, // Use first available list or undefined
    });
  };

  return (
    <div className={cn("min-h-screen bg-background", theme)}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0",
          sidebarCollapsed ? "md:w-16" : "md:w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold">Task Planner</h1>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="md:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b">
            <Button
              onClick={handleQuickAdd}
              className="w-full justify-start gap-2"
              variant="default"
            >
              <Plus className="h-4 w-4" />
              {!sidebarCollapsed && "Quick Add Task"}
            </Button>
          </div>

          {/* Views Section */}
          <div className="p-4 border-b">
            {!sidebarCollapsed && (
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Views
              </h3>
            )}
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentView === item.view ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      sidebarCollapsed && "px-2"
                    )}
                    onClick={() => setCurrentView(item.view)}
                  >
                    <Icon className="h-4 w-4" />
                    {!sidebarCollapsed && item.name}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Lists Section */}
          <div className="flex-1 p-4">
            {!sidebarCollapsed && (
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Lists
              </h3>
            )}
            <nav className="space-y-1">
              {lists.map((list: any) => (
                <Button
                  key={list.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2",
                    sidebarCollapsed && "px-2"
                  )}
                  style={{ color: list.color }}
                >
                  <span className="text-sm">{list.emoji || "📋"}</span>
                  {!sidebarCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="truncate">{list.name}</div>
                      {list.isFavorite && (
                        <Star className="h-3 w-3 fill-current" />
                      )}
                    </div>
                  )}
                </Button>
              ))}
            </nav>
          </div>

          {/* Settings */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                sidebarCollapsed && "px-2"
              )}
            >
              <Settings className="h-4 w-4" />
              {!sidebarCollapsed && "Settings"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-200",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        {/* Header */}
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Desktop sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Page title */}
              <div>
                <h1 className="text-lg font-semibold">
                  {navigationItems.find((item) => item.view === currentView)
                    ?.name || "Dashboard"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Theme toggle */}
              <Button variant="ghost" size="icon">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4">{children}</div>
        </main>
      </div>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto p-4 pt-20">
            <div className="max-w-2xl mx-auto">
              <div className="bg-background border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tasks and lists..."
                    className="flex-1 bg-transparent outline-none"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
