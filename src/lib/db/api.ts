// Database API Layer for Daily Task Planner
// Type-safe query builders and database operations

import { 
  ValidationError,
  NotFoundError,
  DatabaseError 
} from './types';
import { DatabaseManager } from './index';
import { 
  QueryBuilder,
  DataValidator,
  HealthChecker,
  MigrationManager
} from './utils';
import { 
  TestDatabaseManager,
  TestDataFixtures,
  DatabaseTestHelpers 
} from './test-utils';
import type {
  User,
  List,
  Task,
  Label,
  Subtask,
  Reminder,
  Attachment,
  TaskHistory,
  TaskWithDetails,
  ListWithTaskCount,
  LabelWithTaskCount,
  Priority,
  TaskStatus
} from './types';

export class DatabaseAPI {
  private db: DatabaseManager;
  private healthChecker: HealthChecker;
  private migrationManager: MigrationManager;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager;
    this.healthChecker = new HealthChecker(dbManager);
    this.migrationManager = new MigrationManager(dbManager);
  }

  // =================== TASK OPERATIONS ===================

  /**
   * Create a new task
   */
  public async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const validation = DataValidator.validateTask(taskData);
    if (!validation.isValid) {
      throw new ValidationError(`Task validation failed: ${validation.errors.join(', ')}`);
    }

    const task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert task
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
        task.isRecurring ? 1 : 0,
        task.recurringPattern ? JSON.stringify(task.recurringPattern) : null,
        task.createdAt, task.updatedAt
      ]
    );

    // Log task creation
    await this.logTaskHistory(task.id, 'created', task.userId, {
      field: 'all',
      newValue: task.name,
    }, `Task created: ${task.name}`);

    return task;
  }

  /**
   * Get task by ID with all related data
   */
  public async getTaskWithDetails(taskId: string): Promise<TaskWithDetails | null> {
    const task = this.db.get<Task>(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    if (!task) {
      return null;
    }

    // Get related data
    const [list, labels, subtasks, reminders, attachments] = await Promise.all([
      this.getList(task.listId),
      this.getTaskLabels(taskId),
      this.getSubtasks(taskId),
      this.getReminders(taskId),
      this.getAttachments(taskId),
    ]);

    return {
      ...task,
      list: list || undefined,
      labels,
      subtasks,
      reminders,
      attachments,
      subtaskCount: subtasks.length,
      completedSubtaskCount: subtasks.filter(st => st.isCompleted).length,
    };
  }

  /**
   * Get all tasks for a user
   */
  public async getUserTasks(
    userId: string,
    filters: {
      listId?: string;
      status?: TaskStatus;
      priority?: Priority;
      labelIds?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    } = {}
  ): Promise<TaskWithDetails[]> {
    const queryBuilder = new QueryBuilder()
      .select([
        't.*',
        'l.name as list_name',
        'l.color as list_color',
        'l.emoji as list_emoji'
      ])
      .from('tasks t')
      .join('lists l', 't.list_id = l.id')
      .where({ 't.user_id': userId });

    // Apply filters
    if (filters.listId) {
      queryBuilder.where({ 't.list_id': filters.listId });
    }

    if (filters.status) {
      queryBuilder.where({ 't.status': filters.status });
    }

    if (filters.priority) {
      queryBuilder.where({ 't.priority': filters.priority });
    }

    if (filters.dateFrom) {
      queryBuilder.where({ 't.date >=': filters.dateFrom });
    }

    if (filters.dateTo) {
      queryBuilder.where({ 't.date <=': filters.dateTo });
    }

    if (filters.search) {
      queryBuilder.where({ 't.name LIKE': `%${filters.search}%` });
    }

    // Order by position and creation date
    queryBuilder.orderBy('t.list_id').orderBy('t.position').orderBy('t.created_at', 'DESC');

    const { sql, params } = queryBuilder.build();
    const tasks = this.db.query<any>(sql, params);

    // Get labels for each task
    const tasksWithDetails = await Promise.all(
      tasks.map(async (task: any) => {
        const [labels, subtasks, reminders, attachments] = await Promise.all([
          this.getTaskLabels(task.id),
          this.getSubtasks(task.id),
          this.getReminders(task.id),
          this.getAttachments(task.id),
        ]);

        return {
          ...task,
          list: {
            id: task.list_id,
            name: task.list_name,
            color: task.list_color,
            emoji: task.list_emoji,
            isDefault: false,
            userId: task.user_id,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as List,
          labels,
          subtasks,
          reminders,
          attachments,
          subtaskCount: subtasks.length,
          completedSubtaskCount: subtasks.filter(st => st.isCompleted).length,
        } as TaskWithDetails;
      })
    );

    // Filter by labels if specified
    if (filters.labelIds && filters.labelIds.length > 0) {
      return tasksWithDetails.filter(task =>
        task.labels?.some((label: Label) => filters.labelIds!.includes(label.id))
      );
    }

    return tasksWithDetails;
  }

  /**
   * Update task
   */
  public async updateTask(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>,
    changedBy: string
  ): Promise<Task> {
    // Get current task for change tracking
    const currentTask = this.db.get<Task>('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!currentTask) {
      throw new NotFoundError(`Task with ID ${taskId} not found`);
    }

    // Validate updates
    if (Object.keys(updates).length > 0) {
      const updatedTask = { ...currentTask, ...updates };
      const validation = DataValidator.validateTask(updatedTask);
      if (!validation.isValid) {
        throw new ValidationError(`Task validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Build update query
    const updateFields = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const dbKey = this.camelToSnakeCase(key);
        
        if (key === 'recurringPattern' && value) {
          return `${dbKey} = ?`;
        }
        
        return `${dbKey} = ?`;
      });

    if (updateFields.length === 0) {
      return currentTask;
    }

    const updateValues = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        if (key === 'recurringPattern' && value) {
          return JSON.stringify(value);
        }
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        return value;
      });

    // Add updated_at timestamp
    updateFields.push('updated_at = ?');
    updateValues.push(new Date());

    const sql = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    updateValues.push(taskId);

    this.db.run(sql, updateValues);

    // Log changes
    for (const [key, newValue] of Object.entries(updates)) {
      if (key !== 'updatedAt' && key !== 'createdAt') {
        const oldValue = (currentTask as any)[key];
        await this.logTaskHistory(taskId, 'updated', changedBy, {
          field: key,
          oldValue,
          newValue,
        }, `Updated ${key}`);
      }
    }

    // Return updated task
    return this.db.get<Task>('SELECT * FROM tasks WHERE id = ?', [taskId])!;
  }

  /**
   * Delete task
   */
  public async deleteTask(taskId: string, changedBy: string): Promise<void> {
    const task = this.db.get<Task>('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      throw new NotFoundError(`Task with ID ${taskId} not found`);
    }

    // The deletion will be logged by the database trigger
    this.db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
  }

  // =================== LIST OPERATIONS ===================

  /**
   * Create a new list
   */
  public async createList(listData: Omit<List, 'id' | 'createdAt' | 'updatedAt'>): Promise<List> {
    const validation = DataValidator.validateList(listData);
    if (!validation.isValid) {
      throw new ValidationError(`List validation failed: ${validation.errors.join(', ')}`);
    }

    const list: List = {
      ...listData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.db.run(
      'INSERT INTO lists (id, name, color, emoji, is_default, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        list.id, list.name, list.color, list.emoji,
        list.isDefault ? 1 : 0, list.userId, list.createdAt, list.updatedAt
      ]
    );

    return list;
  }

  /**
   * Get lists for user with task counts
   */
  public async getUserListsWithCounts(userId: string): Promise<ListWithTaskCount[]> {
    return this.db.query<ListWithTaskCount>(
      `SELECT 
        l.*,
        COUNT(t.id) as taskCount,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completedTaskCount
      FROM lists l
      LEFT JOIN tasks t ON l.id = t.list_id
      WHERE l.user_id = ?
      GROUP BY l.id
      ORDER BY l.is_default DESC, l.name ASC`,
      [userId]
    );
  }

  /**
   * Get list by ID
   */
  public async getList(listId: string): Promise<List | null> {
    return this.db.get<List>('SELECT * FROM lists WHERE id = ?', [listId]) as List | null;
  }

  // =================== LABEL OPERATIONS ===================

  /**
   * Create a new label
   */
  public async createLabel(labelData: Omit<Label, 'id' | 'createdAt' | 'updatedAt'>): Promise<Label> {
    const validation = DataValidator.validateLabel(labelData);
    if (!validation.isValid) {
      throw new ValidationError(`Label validation failed: ${validation.errors.join(', ')}`);
    }

    const label: Label = {
      ...labelData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.db.run(
      'INSERT INTO labels (id, name, icon, color, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [label.id, label.name, label.icon, label.color, label.userId, label.createdAt, label.updatedAt]
    );

    return label;
  }

  /**
   * Get labels for user with task counts
   */
  public async getUserLabelsWithCounts(userId: string): Promise<LabelWithTaskCount[]> {
    return this.db.query<LabelWithTaskCount>(
      `SELECT 
        l.*,
        COUNT(DISTINCT tl.task_id) as taskCount
      FROM labels l
      LEFT JOIN task_labels tl ON l.id = tl.label_id
      WHERE l.user_id = ?
      GROUP BY l.id
      ORDER BY l.name ASC`,
      [userId]
    );
  }

  // =================== TASK-LABEL OPERATIONS ===================

  /**
   * Add label to task
   */
  public async addLabelToTask(taskId: string, labelId: string): Promise<void> {
    this.db.run(
      'INSERT OR IGNORE INTO task_labels (task_id, label_id, created_at) VALUES (?, ?, ?)',
      [taskId, labelId, new Date()]
    );
  }

  /**
   * Remove label from task
   */
  public async removeLabelFromTask(taskId: string, labelId: string): Promise<void> {
    this.db.run('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?', [taskId, labelId]);
  }

  /**
   * Get labels for task
   */
  public async getTaskLabels(taskId: string): Promise<Label[]> {
    return this.db.query<Label>(
      `SELECT l.* FROM labels l
       INNER JOIN task_labels tl ON l.id = tl.label_id
       WHERE tl.task_id = ?
       ORDER BY l.name ASC`,
      [taskId]
    );
  }

  // =================== SUBTASK OPERATIONS ===================

  /**
   * Create subtask
   */
  public async createSubtask(subtaskData: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subtask> {
    const subtask: Subtask = {
      ...subtaskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.db.run(
      'INSERT INTO subtasks (id, name, is_completed, task_id, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        subtask.id, subtask.name, subtask.isCompleted ? 1 : 0,
        subtask.taskId, subtask.position, subtask.createdAt, subtask.updatedAt
      ]
    );

    return subtask;
  }

  /**
   * Get subtasks for task
   */
  public async getSubtasks(taskId: string): Promise<Subtask[]> {
    return this.db.query<Subtask>(
      'SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC',
      [taskId]
    );
  }

  /**
   * Update subtask
   */
  public async updateSubtask(subtaskId: string, updates: Partial<Subtask>): Promise<Subtask> {
    const currentSubtask = this.db.get<Subtask>('SELECT * FROM subtasks WHERE id = ?', [subtaskId]);
    if (!currentSubtask) {
      throw new NotFoundError(`Subtask with ID ${subtaskId} not found`);
    }

    const updateFields = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => `${this.camelToSnakeCase(key)} = ?`);

    if (updateFields.length === 0) {
      return currentSubtask;
    }

    const updateValues = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        if (key === 'isCompleted') {
          return value ? 1 : 0;
        }
        return value;
      });

    updateFields.push('updated_at = ?');
    updateValues.push(new Date());

    const sql = `
      UPDATE subtasks 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    updateValues.push(subtaskId);

    this.db.run(sql, updateValues);

    return this.db.get<Subtask>('SELECT * FROM subtasks WHERE id = ?', [subtaskId])!;
  }

  // =================== REMINDER OPERATIONS ===================

  /**
   * Create reminder
   */
  public async createReminder(reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reminder> {
    const reminder: Reminder = {
      ...reminderData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.db.run(
      'INSERT INTO reminders (id, task_id, remind_at, is_sent, method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        reminder.id, reminder.taskId, reminder.remindAt,
        reminder.isSent ? 1 : 0, reminder.method, reminder.createdAt, reminder.updatedAt
      ]
    );

    return reminder;
  }

  /**
   * Get reminders for task
   */
  public async getReminders(taskId: string): Promise<Reminder[]> {
    return this.db.query<Reminder>(
      'SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at ASC',
      [taskId]
    );
  }

  /**
   * Get pending reminders
   */
  public async getPendingReminders(limit: number = 100): Promise<Reminder[]> {
    return this.db.query<Reminder>(
      `SELECT r.* FROM reminders r
       INNER JOIN tasks t ON r.task_id = t.id
       WHERE r.is_sent = 0 AND r.remind_at <= datetime('now') AND t.status != 'done'
       ORDER BY r.remind_at ASC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Mark reminder as sent
   */
  public async markReminderSent(reminderId: string): Promise<void> {
    this.db.run(
      'UPDATE reminders SET is_sent = 1, updated_at = ? WHERE id = ?',
      [new Date(), reminderId]
    );
  }

  // =================== ATTACHMENT OPERATIONS ===================

  /**
   * Create attachment
   */
  public async createAttachment(attachmentData: Omit<Attachment, 'uploadedAt'>): Promise<Attachment> {
    const attachment: Attachment = {
      ...attachmentData,
      uploadedAt: new Date(),
    };

    this.db.run(
      'INSERT INTO attachments (id, task_id, filename, original_name, mime_type, size, path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        attachment.id, attachment.taskId, attachment.filename, attachment.originalName,
        attachment.mimeType, attachment.size, attachment.path, attachment.uploadedAt
      ]
    );

    return attachment;
  }

  /**
   * Get attachments for task
   */
  public async getAttachments(taskId: string): Promise<Attachment[]> {
    return this.db.query<Attachment>(
      'SELECT * FROM attachments WHERE task_id = ? ORDER BY uploaded_at DESC',
      [taskId]
    );
  }

  /**
   * Delete attachment
   */
  public async deleteAttachment(attachmentId: string): Promise<void> {
    this.db.run('DELETE FROM attachments WHERE id = ?', [attachmentId]);
  }

  // =================== TASK HISTORY OPERATIONS ===================

  /**
   * Log task history
   */
  public async logTaskHistory(
    taskId: string,
    action: TaskHistory['action'],
    changedBy: string,
    changes: Record<string, any>,
    description?: string
  ): Promise<void> {
    const historyId = `history_${taskId}_${Date.now()}`;
    
    this.db.run(
      'INSERT INTO task_history (id, task_id, action, changed_by, changes, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        historyId, taskId, action, changedBy, JSON.stringify(changes),
        description, new Date()
      ]
    );
  }

  /**
   * Get task history
   */
  public async getTaskHistory(taskId: string, limit: number = 50): Promise<TaskHistory[]> {
    return this.db.query<TaskHistory>(
      `SELECT * FROM task_history 
       WHERE task_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [taskId, limit]
    );
  }

  // =================== HEALTH AND MAINTENANCE ===================

  /**
   * Perform health check
   */
  public async healthCheck() {
    return await this.healthChecker.performHealthCheck();
  }

  /**
   * Run migrations
   */
  public async runMigrations() {
    await this.migrationManager.runMigrations();
  }

  /**
   * Optimize database
   */
  public optimize() {
    this.db.optimize();
  }

  /**
   * Create backup
   */
  public async createBackup(backupPath?: string) {
    await this.db.createBackup(backupPath);
  }

  // =================== UTILITY METHODS ===================

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Get database manager instance
   */
  public getDatabase(): DatabaseManager {
    return this.db;
  }

  /**
   * Execute custom query
   */
  public query<T = any>(sql: string, params: any[] = []) {
    return this.db.query<T>(sql, params);
  }

  /**
   * Execute custom statement
   */
  public run(sql: string, params: any[] = []) {
    return this.db.run(sql, params);
  }

  /**
   * Get single row
   */
  public get<T = any>(sql: string, params: any[] = []) {
    return this.db.get<T>(sql, params);
  }
}

// =================== FACTORY FUNCTIONS ===================

/**
 * Create production database API
 */
export function createDatabaseAPI(config?: any): DatabaseAPI {
  const dbManager = DatabaseManager.getInstance(config);
  return new DatabaseAPI(dbManager);
}

/**
 * Create test database API
 */
export function createTestDatabaseAPI(config?: any): { 
  api: DatabaseAPI; 
  testManager: TestDatabaseManager; 
  testHelpers: DatabaseTestHelpers; 
} {
  const testManager = new TestDatabaseManager(config);
  const dbManager = testManager.getDatabase();
  const api = new DatabaseAPI(dbManager);
  const testHelpers = new DatabaseTestHelpers(dbManager);

  return { api, testManager, testHelpers };
}

// Export convenience instances
export const dbAPI = createDatabaseAPI();

// Export test utilities
export { TestDataFixtures } from './test-utils';