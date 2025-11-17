'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  Search, 
  X, 
  Plus, 
  Bell,
  Settings,
  User,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchToggle: () => void;
  searchOpen: boolean;
}

export function Header({ onMenuClick, onSearchToggle, searchOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications] = useState(3); // Mock notification count
  
  const { 
    theme, 
    setTheme, 
    sidebarCollapsed, 
    currentView,
    user 
  } = useAppStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleThemeChange = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-4 w-4" />;
      case 'dark': return <Moon className="h-4 w-4" />;
      case 'system': return <Laptop className="h-4 w-4" />;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'today': return 'Today';
      case 'next7': return 'Next 7 Days';
      case 'upcoming': return 'Upcoming';
      case 'all': return 'All Tasks';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="hidden md:flex"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page title and breadcrumbs */}
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold">{getViewTitle()}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search tasks, lists, and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6"
                onClick={onSearchToggle}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : null}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Quick Add Button */}
          <Button
            variant="default"
            size="sm"
            className="gap-2 hidden sm:flex"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>

          {/* Mobile Quick Add */}
          <Button
            variant="default"
            size="icon"
            className="sm:hidden"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Search Button (Mobile) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchToggle}
            className="md:hidden"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Search Button (Desktop - when search is closed) */}
          {!searchOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchToggle}
              className="hidden md:flex"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {notifications}
              </Badge>
            )}
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeChange}
            title={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
          >
            {getThemeIcon()}
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="md:hidden border-t px-4 py-2">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search tasks, lists, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6"
              onClick={onSearchToggle}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </header>
  );
}