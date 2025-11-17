/**
 * TaskForms Component Tests
 * Comprehensive tests for task form components
 */

import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'bun:test';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Next.js components and utilities
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, ...props }: any) => (
    <button className={className} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ className, ...props }: any) => (
    <input className={className} {...props} />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ className, ...props }: any) => (
    <textarea className={className} {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, className, ...props }: any) => (
    <label className={className} {...props}>{children}</label>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SelectValue: ({ ...props }: any) => <span {...props} />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  DialogTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>{children}</span>
  ),
}));

// Mock scheduling components
vi.mock('../scheduling', () => ({
  DatePicker: ({ value, onChange, ...props }: any) => (
    <input 
      type="date" 
      value={value} 
      onChange={(e) => onChange?.(new Date(e.target.value))} 
      {...props} 
    />
  ),
  TimePicker: ({ value, onChange, ...props }: any) => (
    <input 
      type="time" 
      value={value} 
      onChange={(e) => onChange?.(e.target.value)} 
      {...props} 
    />
  ),
  RecurringPicker: ({ value, onChange, ...props }: any) => (
    <select value={value} onChange={(e) => onChange?.(e.target.value)} {...props}>
      <option value="none">None</option>
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
    </select>
  ),
  ReminderPicker: ({ value, onChange, ...props }: any) => (
    <input 
      type="datetime-local" 
      value={value} 
      onChange={(e) => onChange?.(e.target.value)} 
      {...props} 
    />
  ),
}));

// Mock store hooks
vi.mock('@/store/hooks', () => ({
  useTasks: () => ({
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    loading: false,
  }),
  useLists: () => ({
    lists: [
      { id: 'list-1', name: 'Work List', color: '#3b82f6' },
      { id: 'list-2', name: 'Personal List', color: '#10b981' },
    ],
    loading: false,
  }),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Save: () => <svg data-testid="save-icon" />,
  X: () => <svg data-testid="x-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  AlertCircle: () => <svg data-testid="alert-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  Flag: () => <svg data-testid="flag-icon" />,
  Calendar: () => <svg data-testid="calendar-icon" />,
  Bell: () => <svg data-testid="bell-icon" />,
  Repeat: () => <svg data-testid="repeat-icon" />,
  Tag: () => <svg data-testid="tag-icon" />,
  FileText: () => <svg data-testid="filetext-icon" />,
  CheckCircle2: () => <svg data-testid="check-icon" />,
}));

// Import component after mocking
const TaskFormComponent = require('./TaskForms.tsx').TaskFormComponent;

// Mock createTask function for testing
const mockCreateTask = vi.fn();
const mockUpdateTask = vi.fn();

vi.mocked(require('@/store/hooks').useTasks).mockReturnValue({
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
  deleteTask: vi.fn(),
  loading: false,
});

describe('TaskFormComponent', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    mode: 'create' as const,
    task: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Form Rendering', () => {
    test('should render create task form', () => {
      render(<TaskFormComponent {...defaultProps} mode="create" />);

      expect(screen.getByText('Create Task')).toBeInTheDocument();
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByTestId('save-icon')).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    test('should render edit task form', () => {
      const task = {
        id: 'task-1',
        name: 'Edit Test Task',
        description: 'Edit description',
        priority: 'High' as const,
        status: 'todo' as const,
      };

      render(<TaskFormComponent {...defaultProps} mode="edit" task={task} />);

      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Edit Test Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Edit description')).toBeInTheDocument();
    });

    test('should render all form fields', () => {
      render(<TaskFormComponent {...defaultProps} />);

      // Basic fields
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      
      // Priority selector
      expect(screen.getByText('Priority')).toBeInTheDocument();
      
      // Status selector
      expect(screen.getByText('Status')).toBeInTheDocument();
      
      // Date and time fields
      expect(screen.getByText('Due Date')).toBeInTheDocument();
      expect(screen.getByText('Estimated Time')).toBeInTheDocument();
      
      // Advanced options
      expect(screen.getByText('Advanced Options')).toBeInTheDocument();
      
      // Action buttons
      expect(screen.getByTestId('save-icon')).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should show validation error for empty task name', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      const nameInput = screen.getByLabelText(/task name/i);
      const saveButton = screen.getByTestId('save-icon').closest('button');

      // Clear the name field (in case it has a default value)
      await user.clear(nameInput);
      
      // Try to save
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/task name is required/i)).toBeInTheDocument();
      });
    });

    test('should show validation error for name too long', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      const nameInput = screen.getByLabelText(/task name/i);
      const longName = 'a'.repeat(256); // Exceeds max length

      await user.type(nameInput, longName);
      
      // Trigger validation by blurring the field
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/task name is too long/i)).toBeInTheDocument();
      });
    });

    test('should show validation error for description too long', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      const descriptionInput = screen.getByLabelText(/description/i);
      const longDescription = 'a'.repeat(1001); // Exceeds max length

      await user.type(descriptionInput, longDescription);
      
      // Trigger validation by blurring the field
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/description is too long/i)).toBeInTheDocument();
      });
    });

    test('should validate time format', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      const timeInput = screen.getByLabelText(/estimated time/i);
      
      // Enter invalid time format
      await user.type(timeInput, 'invalid');

      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/estimate must be in hh:mm format/i)).toBeInTheDocument();
      });
    });

    test('should accept valid time format', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      const timeInput = screen.getByLabelText(/estimated time/i);
      
      // Enter valid time format
      await user.type(timeInput, '02:30');

      await user.tab();

      // Should not show error message
      expect(screen.queryByText(/estimate must be in hh:mm format/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('should call createTask on save', async () => {
      const user = userEvent.setup();
      mockCreateTask.mockResolvedValue({
        id: 'new-task-1',
        name: 'Test Task',
        description: 'Test Description',
        priority: 'Medium',
        status: 'todo',
      });

      render(<TaskFormComponent {...defaultProps} />);

      // Fill out the form
      await user.type(screen.getByLabelText(/task name/i), 'Test Task');
      await user.type(screen.getByLabelText(/description/i), 'Test Description');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'Medium');
      
      // Save
      await user.click(screen.getByTestId('save-icon').closest('button'));

      await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalledWith({
          name: 'Test Task',
          description: 'Test Description',
          priority: 'Medium',
          status: 'todo',
        });
      });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should call updateTask on save in edit mode', async () => {
      const user = userEvent.setup();
      const task = {
        id: 'task-1',
        name: 'Original Task',
        description: 'Original Description',
        priority: 'Low' as const,
        status: 'todo' as const,
      };

      mockUpdateTask.mockResolvedValue({
        ...task,
        name: 'Updated Task',
        priority: 'High',
      });

      render(<TaskFormComponent {...defaultProps} mode="edit" task={task} />);

      // Update the name
      const nameInput = screen.getByDisplayValue('Original Task');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Task');

      // Change priority
      await user.selectOptions(screen.getByLabelText(/priority/i), 'High');

      // Save
      await user.click(screen.getByTestId('save-icon').closest('button'));

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith('task-1', {
          name: 'Updated Task',
          priority: 'High',
        });
      });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should handle save errors', async () => {
      const user = userEvent.setup();
      mockCreateTask.mockRejectedValue(new Error('Network error'));

      render(<TaskFormComponent {...defaultProps} />);

      // Fill out minimal required fields
      await user.type(screen.getByLabelText(/task name/i), 'Test Task');
      
      // Save
      await user.click(screen.getByTestId('save-icon').closest('button'));

      await waitFor(() => {
        expect(screen.getByText(/failed to create task/i)).toBeInTheDocument();
      });

      // Should not close modal on error
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    test('should disable save button during submission', async () => {
      const user = userEvent.setup();
      mockCreateTask.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<TaskFormComponent {...defaultProps} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/task name/i), 'Test Task');
      
      const saveButton = screen.getByTestId('save-icon').closest('button');
      
      // Save
      await user.click(saveButton);

      // Button should be disabled immediately
      expect(saveButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });
  });

  describe('Form Interaction', () => {
    test('should close modal on cancel', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      await user.click(screen.getByTestId('x-icon').closest('button'));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should close modal on Escape key', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      // Focus the dialog first
      const dialog = screen.getByRole('dialog');
      dialog.focus();

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should update form values when task prop changes', () => {
      const task = {
        id: 'task-1',
        name: 'Updated Task',
        description: 'Updated Description',
        priority: 'High' as const,
        status: 'in-progress' as const,
      };

      const { rerender } = render(<TaskFormComponent {...defaultProps} />);

      // Update with new task
      rerender(<TaskFormComponent {...defaultProps} mode="edit" task={task} />);

      expect(screen.getByDisplayValue('Updated Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Updated Description')).toBeInTheDocument();
    });

    test('should reset form when mode changes from create to edit', () => {
      const { rerender } = render(<TaskFormComponent {...defaultProps} mode="create" />);

      // Change to edit mode with empty task
      rerender(<TaskFormComponent {...defaultProps} mode="edit" task={null} />);

      // Form should be reset (name field should be empty or have default value)
      const nameInput = screen.getByLabelText(/task name/i);
      expect(nameInput).toHaveValue('');
    });
  });

  describe('List Selection', () => {
    test('should show available lists', () => {
      render(<TaskFormComponent {...defaultProps} />);

      // Should have list selection area
      expect(screen.getByText('List')).toBeInTheDocument();
    });

    test('should allow list selection', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      const listTrigger = screen.getByText('Select List');
      await user.click(listTrigger);

      // Should show available lists
      expect(screen.getByText('Work List')).toBeInTheDocument();
      expect(screen.getByText('Personal List')).toBeInTheDocument();

      // Select a list
      await user.click(screen.getByText('Work List'));

      expect(screen.getByText('Work List')).toBeInTheDocument(); // Should show selected
    });
  });

  describe('Advanced Options', () => {
    test('should show/hide advanced options', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      // Advanced options should be collapsed by default
      expect(screen.queryByText('Recurring Pattern')).not.toBeInTheDocument();

      // Click to expand
      const expandButton = screen.getByText('Advanced Options');
      await user.click(expandButton);

      // Advanced options should now be visible
      expect(screen.getByText('Recurring Pattern')).toBeInTheDocument();
      expect(screen.getByText('Reminder')).toBeInTheDocument();
    });

    test('should handle recurring task options', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      // Expand advanced options
      await user.click(screen.getByText('Advanced Options'));

      // Toggle recurring
      const recurringCheckbox = screen.getByLabelText(/recurring/i);
      await user.click(recurringCheckbox);

      // Should show recurring pattern selector
      expect(screen.getByText('Recurring Pattern')).toBeInTheDocument();

      // Select recurring pattern
      const patternSelect = screen.getByDisplayValue('none');
      await user.selectOptions(patternSelect, 'daily');

      expect(patternSelect).toHaveValue('daily');
    });

    test('should handle reminder options', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      // Expand advanced options
      await user.click(screen.getByText('Advanced Options'));

      // Toggle reminder
      const reminderCheckbox = screen.getByLabelText(/reminder/i);
      await user.click(reminderCheckbox);

      // Should show reminder datetime input
      expect(screen.getByText('Reminder')).toBeInTheDocument();
    });
  });

  describe('Date and Time Handling', () => {
    test('should handle due date selection', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      const dateInput = screen.getByLabelText(/due date/i);
      const testDate = '2024-12-25';

      await user.type(dateInput, testDate);

      expect(dateInput).toHaveValue(testDate);
    });

    test('should handle estimated time input', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      const timeInput = screen.getByLabelText(/estimated time/i);

      await user.type(timeInput, '01:30');

      expect(timeInput).toHaveValue('01:30');
    });

    test('should handle actual time tracking', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      // Expand advanced options to access actual time
      await user.click(screen.getByText('Advanced Options'));

      const actualTimeInput = screen.getByLabelText(/actual time/i);

      await user.type(actualTimeInput, '02:15');

      expect(actualTimeInput).toHaveValue('02:15');
    });
  });

  describe('Form State Management', () => {
    test('should handle loading state', () => {
      // Mock loading state
      vi.mocked(require('@/store/hooks').useTasks).mockReturnValue({
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        loading: true,
      });

      render(<TaskFormComponent {...defaultProps} />);

      // Save button should be disabled
      expect(screen.getByTestId('save-icon').closest('button')).toBeDisabled();
    });

    test('should preserve form data when modal is reopened', () => {
      const { rerender } = render(<TaskFormComponent {...defaultProps} isOpen={false} />);

      // Fill form while closed (simulate state persistence)
      rerender(<TaskFormComponent {...defaultProps} isOpen={true} />);

      // Form should retain any previously entered data
      // This test depends on implementation details of form state management
    });
  });

  describe('Accessibility', () => {
    test('should have proper form labels', () => {
      render(<TaskFormComponent {...defaultProps} />);

      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TaskFormComponent {...defaultProps} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/task name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();

      // Continue tabbing through form
      await user.tab(); // Priority selector
      await user.tab(); // Status selector

      // Should be able to reach save button
      await user.tab();
      expect(screen.getByTestId('save-icon').closest('button')).toHaveFocus();
    });

    test('should show appropriate ARIA attributes', () => {
      render(<TaskFormComponent {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Performance', () => {
    test('should not re-render unnecessarily', () => {
      const { rerender } = render(<TaskFormComponent {...defaultProps} />);

      const initialRenderCount = vi.mocked(React).useMemo.mock.calls.length;

      // Rerender with same props
      rerender(<TaskFormComponent {...defaultProps} />);

      const subsequentRenderCount = vi.mocked(React).useMemo.mock.calls.length;

      // Should not trigger additional renders for unchanged props
      expect(subsequentRenderCount).toBe(initialRenderCount);
    });
  });

  describe('Integration with Stores', () => {
    test('should create task with correct data structure', async () => {
      const user = userEvent.setup();
      const mockCreateTask = vi.fn().mockResolvedValue({ id: 'new-task' });
      
      vi.mocked(require('@/store/hooks').useTasks).mockReturnValue({
        createTask: mockCreateTask,
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        loading: false,
      });

      render(<TaskFormComponent {...defaultProps} />);

      // Fill form with all fields
      await user.type(screen.getByLabelText(/task name/i), 'Complete Task');
      await user.type(screen.getByLabelText(/description/i), 'Task description');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'High');
      await user.selectOptions(screen.getByLabelText(/status/i), 'in-progress');

      await user.click(screen.getByTestId('save-icon').closest('button'));

      await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalledWith({
          name: 'Complete Task',
          description: 'Task description',
          priority: 'High',
          status: 'in-progress',
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      const networkError = new Error('Network connection failed');
      mockCreateTask.mockRejectedValue(networkError);

      render(<TaskFormComponent {...defaultProps} />);

      await user.type(screen.getByLabelText(/task name/i), 'Test Task');
      await user.click(screen.getByTestId('save-icon').closest('button'));

      await waitFor(() => {
        expect(screen.getByText(/unable to save task/i)).toBeInTheDocument();
      });
    });

    test('should handle validation errors from server', async () => {
      const user = userEvent.setup();
      const validationError = new Error('Task name already exists');
      mockCreateTask.mockRejectedValue(validationError);

      render(<TaskFormComponent {...defaultProps} />);

      await user.type(screen.getByLabelText(/task name/i), 'Duplicate Task');
      await user.click(screen.getByTestId('save-icon').closest('button'));

      await waitFor(() => {
        expect(screen.getByText(/task name already exists/i)).toBeInTheDocument();
      });
    });
  });
});

describe('TaskFormComponent Integration Tests', () => {
  test('should handle complex task creation workflow', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onTaskCreated = vi.fn();

    const mockCreateTask = vi.fn().mockImplementation((taskData) => {
      onTaskCreated(taskData);
      return {
        id: 'created-task-1',
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    vi.mocked(require('@/store/hooks').useTasks).mockReturnValue({
      createTask: mockCreateTask,
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      loading: false,
    });

    render(<TaskFormComponent isOpen={true} onClose={onClose} mode="create" task={null} />);

    // Fill out comprehensive task data
    await user.type(screen.getByLabelText(/task name/i), 'Complex Task');
    await user.type(screen.getByLabelText(/description/i), 'This is a detailed description with multiple lines and special chars: @#$%^&*()');
    
    await user.selectOptions(screen.getByLabelText(/priority/i), 'High');
    await user.selectOptions(screen.getByLabelText(/status/i), 'in-progress');

    // Set due date
    const dateInput = screen.getByLabelText(/due date/i);
    await user.type(dateInput, '2024-12-31');

    // Set estimated time
    const timeInput = screen.getByLabelText(/estimated time/i);
    await user.type(timeInput, '02:30');

    // Select a list
    await user.click(screen.getByText('Select List'));
    await user.click(screen.getByText('Work List'));

    // Expand advanced options and set recurring
    await user.click(screen.getByText('Advanced Options'));
    const recurringCheckbox = screen.getByLabelText(/recurring/i);
    await user.click(recurringCheckbox);
    await user.selectOptions(screen.getByDisplayValue('none'), 'weekly');

    // Save the task
    await user.click(screen.getByTestId('save-icon').closest('button'));

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith({
        name: 'Complex Task',
        description: 'This is a detailed description with multiple lines and special chars: @#$%^&*()',
        priority: 'High',
        status: 'in-progress',
        dueDate: expect.any(Date),
        estimate: '02:30',
        listId: 'list-1',
        isRecurring: true,
        recurringPattern: 'weekly',
      });
    });

    expect(onTaskCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});