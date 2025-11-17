'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  DatePicker, 
  TimePicker, 
  RecurringPicker, 
  ReminderPicker 
} from '../scheduling';
import { CreateTaskData, UpdateTaskData } from '@/types/tasks';
import { CreateListData } from '@/types/lists';
import { useTasks } from '@/store/hooks';
import { useLists } from '@/store/hooks';
import { 
  Save,
  X,
  Plus,
  AlertCircle,
  Clock,
  Flag,
  Calendar,
  Bell,
  Repeat,
  Tag,
  FileText,
  CheckCircle2
} from 'lucide-react';

// Validation schemas
const taskSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(255, 'Task name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  priority: z.enum(['None', 'Low', 'Medium', 'High']),
  status: z.enum(['todo', 'in_progress', 'done', 'archived']),
  dueDate: z.date().optional(),
  estimate: z.string().regex(/^\d{2}:\d{2}$/, 'Estimate must be in HH:mm format').optional(),
  actualTime: z.string().regex(/^\d{2}:\d{2}$/, 'Actual time must be in HH:mm format').optional(),
  isRecurring: z.boolean(),
  recurringPattern: z.any().optional(),
  listId: z.string().optional(),
  parentTaskId: z.string().optional(),
});

const listSchema = z.object({
  name: z.string().min(1, 'List name is required').max(100, 'List name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code'),
  emoji: z.string().optional(),
  isFavorite: z.boolean(),
});

interface TaskFormProps {
  task?: any; // AppTask for editing
  onSave: (data: CreateTaskData | UpdateTaskData) => Promise<void>;
  onCancel: () => void;
  className?: string;
  listId?: string;
  parentTaskId?: string;
}

interface ListFormProps {
  list?: any; // AppList for editing
  onSave: (data: CreateListData) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function TaskForm({
  task,
  onSave,
  onCancel,
  className,
  listId,
  parentTaskId
}: TaskFormProps) {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    priority: task?.priority || 'None',
    status: task?.status || 'todo',
    dueDate: task?.deadline ? new Date(task.deadline) : undefined,
    estimate: task?.estimate || '',
    actualTime: task?.actualTime || '',
    isRecurring: task?.isRecurring || false,
    recurringPattern: task?.recurringPattern || undefined,
    listId: task?.listId || listId || '',
    parentTaskId: task?.parentTaskId || parentTaskId || '',
    reminders: task?.reminders || [],
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { updateTask } = useTasks();
  const { lists } = useTasks();

  const validateForm = () => {
    try {
      taskSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const saveData = {
        ...formData,
        listId: formData.listId || undefined,
        parentTaskId: formData.parentTaskId || undefined,
        reminders: formData.reminders,
      };
      
      await onSave(saveData);
    } catch (error) {
      console.error('Failed to save task:', error);
      setErrors({ submit: 'Failed to save task. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const priorityOptions = [
    { value: 'None', label: 'No priority', color: 'bg-gray-500' },
    { value: 'Low', label: 'Low priority', color: 'bg-green-500' },
    { value: 'Medium', label: 'Medium priority', color: 'bg-yellow-500' },
    { value: 'High', label: 'High priority', color: 'bg-red-500' },
  ];

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Task Details</h3>
        </div>

        {/* Task Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Task Name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Enter task name..."
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Add a description for this task..."
            rows={3}
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Priority and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Priority
            </Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => handleFieldChange('priority', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', option.color)} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Status
            </Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleFieldChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List Assignment */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            List
          </Label>
          <Select 
            value={formData.listId} 
            onValueChange={(value) => handleFieldChange('listId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a list" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No list</SelectItem>
              {lists.map(list => (
                <SelectItem key={list.id} value={list.id}>
                  <div className="flex items-center gap-2">
                    <span>{list.emoji || '📋'}</span>
                    {list.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Advanced Options
          </span>
          {showAdvanced ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>

        {showAdvanced && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            {/* Due Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="Due Date"
                value={formData.dueDate}
                onChange={(date) => handleFieldChange('dueDate', date)}
                placeholder="No due date"
              />
              <TimePicker
                label="Due Time"
                value={formData.estimate}
                onChange={(time) => handleFieldChange('estimate', time)}
                placeholder="No specific time"
              />
            </div>

            {/* Time Estimates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Time</Label>
                <Input
                  type="text"
                  placeholder="HH:mm"
                  value={formData.estimate}
                  onChange={(e) => handleFieldChange('estimate', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Time</Label>
                <Input
                  type="text"
                  placeholder="HH:mm"
                  value={formData.actualTime}
                  onChange={(e) => handleFieldChange('actualTime', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Recurring Pattern */}
            <RecurringPicker
              label="Recurrence"
              value={formData.recurringPattern}
              onChange={(pattern) => handleFieldChange('recurringPattern', pattern)}
            />

            {/* Reminders */}
            <ReminderPicker
              value={formData.reminders}
              onChange={(reminders) => handleFieldChange('reminders', reminders)}
            />
          </div>
        )}
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="p-3 border border-red-200 bg-red-50 rounded-md">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {errors.submit}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button 
          onClick={handleSave} 
          disabled={saving || !formData.name.trim()}
          className="flex-1"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {task ? 'Update Task' : 'Create Task'}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ListForm({
  list,
  onSave,
  onCancel,
  className
}: ListFormProps) {
  const [formData, setFormData] = useState({
    name: list?.name || '',
    description: list?.description || '',
    color: list?.color || '#3B82F6',
    emoji: list?.emoji || '📋',
    isFavorite: list?.isFavorite || false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  
  const { lists } = useLists();

  const validateForm = () => {
    try {
      listSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save list:', error);
      setErrors({ submit: 'Failed to save list. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const emojiOptions = [
    '📋', '📁', '📝', '📚', '🎯', '🏠', '💼', '🎨', '🔧', '💻',
    '📞', '📧', '🛒', '🎉', '🌟', '🔥', '💡', '⚡', '🚀', '📊',
    '🍕', '☕', '🎮', '🎵', '🏃', '🛌', '💤', '📺', '📱', '💰'
  ];

  const colorOptions = [
    '#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#F43F5E', '#8B5A2B', '#6B7280', '#7C3AED'
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* List Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          List Name *
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="Enter list name..."
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="Add a description for this list..."
          rows={3}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.description}
          </p>
        )}
      </div>

      {/* Icon and Color */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="grid grid-cols-10 gap-2">
            {emojiOptions.map((emoji) => (
              <Button
                key={emoji}
                variant={formData.emoji === emoji ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-lg"
                onClick={() => handleFieldChange('emoji', emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="grid grid-cols-5 gap-2">
            {colorOptions.map((color) => (
              <Button
                key={color}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-2"
                style={{ 
                  backgroundColor: color,
                  borderColor: formData.color === color ? '#000' : color 
                }}
                onClick={() => handleFieldChange('color', color)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Favorite Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isFavorite"
          checked={formData.isFavorite}
          onChange={(e) => handleFieldChange('isFavorite', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="isFavorite" className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          Add to favorites
        </Label>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="p-3 border border-red-200 bg-red-50 rounded-md">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {errors.submit}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button 
          onClick={handleSave} 
          disabled={saving || !formData.name.trim()}
          className="flex-1"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {list ? 'Update List' : 'Create List'}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}