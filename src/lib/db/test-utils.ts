// Test Database Utilities and Fixtures for Daily Task Planner
// Provides testing utilities, fixtures, and mock data for database testing

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { DatabaseManager } from './index';
import { 
  User, 
  List, 
  Task, 
  Label, 
  Subtask, 
  Reminder, 
  Attachment,
  TaskHistory,
  Priority,
  TaskStatus 
} from './types';

export interface TestDatabaseConfig {
  path?: string;
  timeout?: number;
  verbose?: boolean;
}

export class TestDatabaseManager {
  private db: DatabaseManager;
  private isTestDb: boolean;
  private dbPath: string;

  constructor(config: TestDatabaseConfig = {}) {
    this.dbPath = config.path || this.generateTestDbPath();
    this.isTestDb = true;
    
    this.db = DatabaseManager.getInstance({
      path: this.dbPath,
      timeout: config.timeout || 5000,
      verbose: config.verbose || false,
    });
  }

  /**
   * Generate unique test database path
   */
  private generateTestDbPath(): string {
    const testDir = path.join(process.cwd(), 'test-data');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    return path.join(testDir, `test_tasks_${timestamp}_${randomId}.db`);
  }

  /**
   * Initialize test database
   */
  public async initialize(): Promise<void> {
    await this.db.initialize();
  }

  /**
   * Get database manager instance
   */
  public getDatabase(): DatabaseManager {
    return this.db;
  }

  /**
   * Clean test database
   */
  public async clean(): Promise<void> {
    // Clear all data but keep schema
    const tables = [
      'task_history', 'attachments', 'reminders', 'subtasks', 
      'task_labels', 'tasks', 'labels', 'lists', 'users'
    ];
    
    for (const table of tables) {
      try {
        this.db.run(`DELETE FROM ${table}`);
      } catch (error) {
        console.warn(`Failed to clean ${table}:`, error);
      }
    }
  }

  /**
   * Drop test database file
   */
  public async drop(): Promise<void> {
    this.db.close();
    
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }
  }

  /**
   * Get test database path
   */
  public getPath(): string {
    return this.dbPath;
  }

  /**
   * Get database statistics for testing
   */
  public async getStats() {
    return await this.db.getDatabaseStats();
  }
}

export class TestDataFixtures {
  /**
   * Create a test user
   */
  public static createUser(overrides: Partial<User> = {}): User {
    const user: User = {
      id: overrides.id || uuidv4(),
      name: overrides.name || 'Test User',
      email: overrides.email || 'test@example.com',
      avatar: overrides.avatar || 'https://example.com/avatar.jpg',
      preferences: overrides.preferences || {
        theme: 'light',
        timezone: 'UTC',
        dateFormat: 'MM/dd/yyyy',
      },
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
    return user;
  }

  /**
   * Create a test list
   */
  public static createList(overrides: Partial<List> = {}): List {
    const list: List = {
      id: overrides.id || uuidv4(),
      name: overrides.name || 'Test List',
      color: overrides.color || '#3B82F6',
      emoji: overrides.emoji || '📋',
      isDefault: overrides.isDefault || false,
      userId: overrides.userId || uuidv4(),
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
    return list;
  }

  /**
   * Create a test label
   */
  public static createLabel(overrides: Partial<Label> = {}): Label {
    const label: Label = {
      id: overrides.id || uuidv4(),
      name: overrides.name || 'Test Label',
      icon: overrides.icon || '🏷️',
      color: overrides.color || '#6B7280',
      userId: overrides.userId || uuidv4(),
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
    return label;
  }

  /**
   * Create a test task
   */
  public static createTask(overrides: Partial<Task> = {}): Task {
    const task: Task = {
      id: overrides.id || uuidv4(),
      name: overrides.name || 'Test Task',
      description: overrides.description || 'This is a test task',
      date: overrides.date,
      deadline: overrides.deadline,
      estimate: overrides.estimate || '01:00',
      actualTime: overrides.actualTime,
      priority: overrides.priority || 'Medium',
      status: overrides.status || 'todo',
      userId: overrides.userId || uuidv4(),
      listId: overrides.listId || uuidv4(),
      parentTaskId: overrides.parentTaskId,
      position: overrides.position || 0,
      isRecurring: overrides.isRecurring || false,
      recurringPattern: overrides.recurringPattern,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
    return task;
  }

  /**
   * Create a test subtask
   */
  public static createSubtask(overrides: Partial<Subtask> = {}): Subtask {
    const subtask: Subtask = {
      id: overrides.id || uuidv4(),
      name: overrides.name || 'Test Subtask',
      isCompleted: overrides.isCompleted || false,
      taskId: overrides.taskId || uuidv4(),
      position: overrides.position || 0,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
    return subtask;
  }

  /**
   * Create a test reminder
   */
  public static createReminder(overrides: Partial<Reminder> = {}): Reminder {
    const reminder: Reminder = {
      id: overrides.id || uuidv4(),
      taskId: overrides.taskId || uuidv4(),
      remindAt: overrides.remindAt || new Date(Date.now() + 3600000), // 1 hour from now
      isSent: overrides.isSent || false,
      method: overrides.method || 'push',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
    };
    return reminder;
  }

  /**
   * Create a test attachment
   */
  public static createAttachment(overrides: Partial<Attachment> = {}): Attachment {
    const attachment: Attachment = {
      id: overrides.id || uuidv4(),
      taskId: overrides.taskId || uuidv4(),
      filename: overrides.filename || 'test-file.pdf',
      originalName: overrides.originalName || 'Test File.pdf',
      mimeType: overrides.mimeType || 'application/pdf',
      size: overrides.size || 1024,
      path: overrides.path || '/uploads/test-file.pdf',
      uploadedAt: overrides.uploadedAt || new Date(),
    };
    return attachment;
  }

  /**
   * Create a test task history entry
   */
  public static createTaskHistory(overrides: Partial<TaskHistory> = {}): TaskHistory {
    const history: TaskHistory = {
      id: overrides.id || uuidv4(),
      taskId: overrides.taskId || uuidv4(),
      action: overrides.action || 'created',
      changedBy: overrides.changedBy || uuidv4(),
      changes: overrides.changes || { field: 'name', oldValue: null, newValue: 'Test Task' },
      description: overrides.description || 'Task created',
      createdAt: overrides.createdAt || new Date(),
    };
    return history;
  }

  /**
   * Create comprehensive test data set
   */
  public static createTestDataset(): {
    users: User[];
    lists: List[];
    labels: Label[];
    tasks: Task[];
    subtasks: Subtask[];
    reminders: Reminder[];
    attachments: Attachment[];
    taskHistory: TaskHistory[];
  } {
    const user1 = this.createUser({ name: 'John Doe', email: 'john@example.com' });
    const user2 = this.createUser({ name: 'Jane Smith', email: 'jane@example.com' });
    
    const list1 = this.createList({ userId: user1.id, name: 'Personal', emoji: '🏠' });
    const list2 = this.createList({ userId: user1.id, name: 'Work', emoji: '💼' });
    const list3 = this.createList({ userId: user2.id, name: 'Study', emoji: '📚' });
    
    const label1 = this.createLabel({ userId: user1.id, name: 'Urgent', color: '#EF4444' });
    const label2 = this.createLabel({ userId: user1.id, name: 'Bug', color: '#F59E0B' });
    const label3 = this.createLabel({ userId: user2.id, name: 'Assignment', color: '#10B981' });
    
    const task1 = this.createTask({
      userId: user1.id,
      listId: list1.id,
      name: 'Buy groceries',
      description: 'Get milk, bread, and vegetables',
      priority: 'Medium',
      date: new Date(),
    });
    
    const task2 = this.createTask({
      userId: user1.id,
      listId: list2.id,
      name: 'Fix login bug',
      description: 'User cannot login with correct credentials',
      priority: 'High',
      status: 'in_progress',
    });
    
    const task3 = this.createTask({
      userId: user2.id,
      listId: list3.id,
      name: 'Complete math assignment',
      description: 'Chapter 5 exercises 1-20',
      priority: 'High',
      deadline: new Date(Date.now() + 86400000), // Tomorrow
    });
    
    const subtask1 = this.createSubtask({ taskId: task1.id, name: 'Buy milk' });
    const subtask2 = this.createSubtask({ taskId: task1.id, name: 'Buy bread' });
    const subtask3 = this.createSubtask({ taskId: task1.id, name: 'Buy vegetables' });
    
    const reminder1 = this.createReminder({ taskId: task1.id, remindAt: new Date(Date.now() + 1800000) }); // 30 mins
    const reminder2 = this.createReminder({ taskId: task3.id, remindAt: new Date(Date.now() + 7200000) }); // 2 hours
    
    const attachment1 = this.createAttachment({
      taskId: task2.id,
      filename: 'bug-report.pdf',
      originalName: 'Bug Report.pdf',
      size: 2048,
    });
    
    const history1 = this.createTaskHistory({
      taskId: task1.id,
      action: 'created',
      changedBy: user1.id,
      changes: { field: 'name', newValue: 'Buy groceries' },
      description: 'Task created',
    });
    
    const history2 = this.createTaskHistory({
      taskId: task2.id,
      action: 'status_changed',
      changedBy: user1.id,
      changes: { field: 'status', oldValue: 'todo', newValue: 'in_progress' },
      description: 'Task status changed to in progress',
    });

    return {
      users: [user1, user2],
      lists: [list1, list2, list3],
      labels: [label1, label2, label3],
      tasks: [task1, task2, task3],
      subtasks: [subtask1, subtask2, subtask3],
      reminders: [reminder1, reminder2],
      attachments: [attachment1],
      taskHistory: [history1, history2],
    };
  }

  /**
   * Create sample recurring pattern
   */
  public static createRecurringPattern(overrides: any = {}) {
    return {
      type: overrides.type || 'weekly',
      interval: overrides.interval || 1,
      daysOfWeek: overrides.daysOfWeek || [1, 3, 5], // Mon, Wed, Fri
      endDate: overrides.endDate,
      maxOccurrences: overrides.maxOccurrences,
    };
  }

  /**
   * Generate random test data
   */
  public static generateRandomData(count: number = 10) {
    const data: any = {
      users: [],
      lists: [],
      labels: [],
      tasks: [],
      subtasks: [],
      reminders: [],
      attachments: [],
      taskHistory: [],
    };

    // Generate users
    for (let i = 0; i < Math.ceil(count / 10); i++) {
      data.users.push(this.createUser({
        name: `Test User ${i + 1}`,
        email: `user${i + 1}@test.com`,
      }));
    }

    // Generate lists
    const listNames = ['Personal', 'Work', 'Study', 'Shopping', 'Health', 'Finance'];
    for (let i = 0; i < count; i++) {
      data.lists.push(this.createList({
        userId: data.users[Math.floor(Math.random() * data.users.length)].id,
        name: listNames[Math.floor(Math.random() * listNames.length)] + ` ${i + 1}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }));
    }

    // Generate labels
    const labelNames = ['Urgent', 'Important', 'Bug', 'Feature', 'Documentation'];
    for (let i = 0; i < count; i++) {
      data.labels.push(this.createLabel({
        userId: data.users[Math.floor(Math.random() * data.users.length)].id,
        name: labelNames[Math.floor(Math.random() * labelNames.length)] + ` ${i + 1}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }));
    }

    // Generate tasks
    const taskNames = ['Task', 'Bug', 'Feature', 'Improvement', 'Documentation'];
    for (let i = 0; i < count; i++) {
      data.tasks.push(this.createTask({
        userId: data.users[Math.floor(Math.random() * data.users.length)].id,
        listId: data.lists[Math.floor(Math.random() * data.lists.length)].id,
        name: `${taskNames[Math.floor(Math.random() * taskNames.length)]} ${i + 1}`,
        description: `Description for task ${i + 1}`,
        priority: ['High', 'Medium', 'Low', 'None'][Math.floor(Math.random() * 4)] as Priority,
        status: ['todo', 'in_progress', 'done', 'archived'][Math.floor(Math.random() * 4)] as TaskStatus,
      }));
    }

    // Generate subtasks
    for (let i = 0; i < count * 2; i++) {
      data.subtasks.push(this.createSubtask({
        taskId: data.tasks[Math.floor(Math.random() * data.tasks.length)].id,
        name: `Subtask ${i + 1}`,
      }));
    }

    // Generate reminders
    for (let i = 0; i < count; i++) {
      data.reminders.push(this.createReminder({
        taskId: data.tasks[Math.floor(Math.random() * data.tasks.length)].id,
        remindAt: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Next 7 days
      }));
    }

    // Generate attachments
    for (let i = 0; i < Math.floor(count / 2); i++) {
      data.attachments.push(this.createAttachment({
        taskId: data.tasks[Math.floor(Math.random() * data.tasks.length)].id,
        filename: `file${i + 1}.pdf`,
        originalName: `File ${i + 1}.pdf`,
        size: Math.floor(Math.random() * 10000) + 1000, // 1KB - 10KB
      }));
    }

    // Generate task history
    for (let i = 0; i < count; i++) {
      data.taskHistory.push(this.createTaskHistory({
        taskId: data.tasks[Math.floor(Math.random() * data.tasks.length)].id,
        changedBy: data.users[Math.floor(Math.random() * data.users.length)].id,
      }));
    }

    return data;
  }
}

export class DatabaseTestHelpers {
  private db: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager;
  }

  /**
   * Insert test data into database
   */
  public async insertTestData(dataset: ReturnType<typeof TestDataFixtures.createTestDataset>): Promise<void> {
    // Insert users
    for (const user of dataset.users) {
      this.db.run(
        'INSERT INTO users (id, name, email, avatar, preferences, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          user.id, user.name, user.email, user.avatar, 
          JSON.stringify(user.preferences), user.createdAt, user.updatedAt
        ]
      );
    }

    // Insert lists
    for (const list of dataset.lists) {
      this.db.run(
        'INSERT INTO lists (id, name, color, emoji, is_default, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          list.id, list.name, list.color, list.emoji, 
          list.isDefault ? 1 : 0, list.userId, list.createdAt, list.updatedAt
        ]
      );
    }

    // Insert labels
    for (const label of dataset.labels) {
      this.db.run(
        'INSERT INTO labels (id, name, icon, color, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [label.id, label.name, label.icon, label.color, label.userId, label.createdAt, label.updatedAt]
      );
    }

    // Insert tasks
    for (const task of dataset.tasks) {
      this.db.run(
        `INSERT INTO tasks (
          id, name, description, date, deadline, estimate, actual_time, 
          priority, status, user_id, list_id, parent_task_id, position, 
          is_recurring, recurring_pattern, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id, task.name, task.description, task.date, task.deadline, 
          task.estimate, task.actualTime, task.priority, task.status, 
          task.userId, task.listId, task.parentTaskId, task.position,
          task.isRecurring ? 1 : 0, task.recurringPattern ? JSON.stringify(task.recurringPattern) : null,
          task.createdAt, task.updatedAt
        ]
      );
    }

    // Insert task-label relationships
    for (const label of dataset.labels) {
      for (const task of dataset.tasks.slice(0, 2)) { // Attach first 2 tasks to each label
        this.db.run(
          'INSERT INTO task_labels (task_id, label_id, created_at) VALUES (?, ?, ?)',
          [task.id, label.id, new Date()]
        );
      }
    }

    // Insert subtasks
    for (const subtask of dataset.subtasks) {
      this.db.run(
        'INSERT INTO subtasks (id, name, is_completed, task_id, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          subtask.id, subtask.name, subtask.isCompleted ? 1 : 0, 
          subtask.taskId, subtask.position, subtask.createdAt, subtask.updatedAt
        ]
      );
    }

    // Insert reminders
    for (const reminder of dataset.reminders) {
      this.db.run(
        'INSERT INTO reminders (id, task_id, remind_at, is_sent, method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          reminder.id, reminder.taskId, reminder.remindAt, 
          reminder.isSent ? 1 : 0, reminder.method, reminder.createdAt, reminder.updatedAt
        ]
      );
    }

    // Insert attachments
    for (const attachment of dataset.attachments) {
      this.db.run(
        'INSERT INTO attachments (id, task_id, filename, original_name, mime_type, size, path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          attachment.id, attachment.taskId, attachment.filename, attachment.originalName,
          attachment.mimeType, attachment.size, attachment.path, attachment.uploadedAt
        ]
      );
    }

    // Insert task history
    for (const history of dataset.taskHistory) {
      this.db.run(
        'INSERT INTO task_history (id, task_id, action, changed_by, changes, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          history.id, history.taskId, history.action, history.changedBy,
          JSON.stringify(history.changes), history.description, history.createdAt
        ]
      );
    }
  }

  /**
   * Verify test data in database
   */
  public async verifyTestData(dataset: ReturnType<typeof TestDataFixtures.createTestDataset>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check users
    const userCount = this.db.get('SELECT COUNT(*) as count FROM users') as { count: number };
    if (userCount.count !== dataset.users.length) {
      errors.push(`Expected ${dataset.users.length} users, found ${userCount.count}`);
    }

    // Check lists
    const listCount = this.db.get('SELECT COUNT(*) as count FROM lists') as { count: number };
    if (listCount.count !== dataset.lists.length) {
      errors.push(`Expected ${dataset.lists.length} lists, found ${listCount.count}`);
    }

    // Check tasks
    const taskCount = this.db.get('SELECT COUNT(*) as count FROM tasks') as { count: number };
    if (taskCount.count !== dataset.tasks.length) {
      errors.push(`Expected ${dataset.tasks.length} tasks, found ${taskCount.count}`);
    }

    // Check subtasks
    const subtaskCount = this.db.get('SELECT COUNT(*) as count FROM subtasks') as { count: number };
    if (subtaskCount.count !== dataset.subtasks.length) {
      errors.push(`Expected ${dataset.subtasks.length} subtasks, found ${subtaskCount.count}`);
    }

    // Check reminders
    const reminderCount = this.db.get('SELECT COUNT(*) as count FROM reminders') as { count: number };
    if (reminderCount.count !== dataset.reminders.length) {
      errors.push(`Expected ${dataset.reminders.length} reminders, found ${reminderCount.count}`);
    }

    // Check attachments
    const attachmentCount = this.db.get('SELECT COUNT(*) as count FROM attachments') as { count: number };
    if (attachmentCount.count !== dataset.attachments.length) {
      errors.push(`Expected ${dataset.attachments.length} attachments, found ${attachmentCount.count}`);
    }

    // Check task history
    const historyCount = this.db.get('SELECT COUNT(*) as count FROM task_history') as { count: number };
    if (historyCount.count !== dataset.taskHistory.length) {
      errors.push(`Expected ${dataset.taskHistory.length} history entries, found ${historyCount.count}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Performance test - insert large dataset
   */
  public async performanceTest(recordCount: number = 1000): Promise<{
    duration: number;
    recordsPerSecond: number;
  }> {
    const startTime = Date.now();
    const randomData = TestDataFixtures.generateRandomData(recordCount);
    
    await this.insertTestData(randomData);
    
    const duration = Date.now() - startTime;
    const recordsPerSecond = (recordCount / duration) * 1000;

    return {
      duration,
      recordsPerSecond: Math.round(recordsPerSecond),
    };
  }

  /**
   * Database integrity test
   */
  public async integrityTest(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check for orphaned tasks
    const orphanedTasks = this.db.query(`
      SELECT COUNT(*) as count FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      WHERE l.id IS NULL
    `) as { count: number }[];

    if (orphanedTasks[0]?.count > 0) {
      issues.push(`Found ${orphanedTasks[0].count} orphaned tasks`);
    }

    // Check for orphaned subtasks
    const orphanedSubtasks = this.db.query(`
      SELECT COUNT(*) as count FROM subtasks s
      LEFT JOIN tasks t ON s.task_id = t.id
      WHERE t.id IS NULL
    `) as { count: number }[];

    if (orphanedSubtasks[0]?.count > 0) {
      issues.push(`Found ${orphanedSubtasks[0].count} orphaned subtasks`);
    }

    // Check for orphaned reminders
    const orphanedReminders = this.db.query(`
      SELECT COUNT(*) as count FROM reminders r
      LEFT JOIN tasks t ON r.task_id = t.id
      WHERE t.id IS NULL
    `) as { count: number }[];

    if (orphanedReminders[0]?.count > 0) {
      issues.push(`Found ${orphanedReminders[0].count} orphaned reminders`);
    }

    // Check for orphaned attachments
    const orphanedAttachments = this.db.query(`
      SELECT COUNT(*) as count FROM attachments a
      LEFT JOIN tasks t ON a.task_id = t.id
      WHERE t.id IS NULL
    `) as { count: number }[];

    if (orphanedAttachments[0]?.count > 0) {
      issues.push(`Found ${orphanedAttachments[0].count} orphaned attachments`);
    }

    // Check for invalid task statuses
    const invalidStatuses = this.db.query(`
      SELECT COUNT(*) as count FROM tasks
      WHERE status NOT IN ('todo', 'in_progress', 'done', 'archived')
    `) as { count: number }[];

    if (invalidStatuses[0]?.count > 0) {
      issues.push(`Found ${invalidStatuses[0].count} tasks with invalid status`);
    }

    // Check for invalid priorities
    const invalidPriorities = this.db.query(`
      SELECT COUNT(*) as count FROM tasks
      WHERE priority NOT IN ('High', 'Medium', 'Low', 'None')
    `) as { count: number }[];

    if (invalidPriorities[0]?.count > 0) {
      issues.push(`Found ${invalidPriorities[0].count} tasks with invalid priority`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
