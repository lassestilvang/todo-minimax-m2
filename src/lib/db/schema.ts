// Database Schema Definition for Daily Task Planner
// SQLite with comprehensive table structure and relationships

import type { DatabaseConfig } from "./types";

// Schema version for migration tracking
export const SCHEMA_VERSION = "1.0.0";

// Database initialization SQL
export const INITIALIZE_DATABASE = `
-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Enable write-ahead logging for better concurrency
PRAGMA journal_mode = WAL;

-- Set synchronous mode for better performance
PRAGMA synchronous = NORMAL;

-- Set cache size (32MB)
PRAGMA cache_size = 32768;

-- Set temp store to memory
PRAGMA temp_store = memory;
`;

// Users table
export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  preferences TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Lists table
export const CREATE_LISTS_TABLE = `
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  emoji TEXT DEFAULT '📋',
  is_default INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name) ON CONFLICT IGNORE
);
`;

// Labels table
export const CREATE_LABELS_TABLE = `
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🏷️',
  color TEXT NOT NULL DEFAULT '#6B7280',
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name) ON CONFLICT IGNORE
);
`;

// Tasks table
export const CREATE_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date DATETIME,
  deadline DATETIME,
  estimate TEXT, -- HH:mm format
  actual_time TEXT, -- HH:mm format
  priority TEXT NOT NULL DEFAULT 'None' CHECK (priority IN ('High', 'Medium', 'Low', 'None')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
  user_id TEXT NOT NULL,
  list_id TEXT NOT NULL,
  parent_task_id TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurring_pattern TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CHECK (position >= 0)
);
`;

// Task-Label relationship table
export const CREATE_TASK_LABELS_TABLE = `
CREATE TABLE IF NOT EXISTS task_labels (
  task_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, label_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);
`;

// Subtasks table
export const CREATE_SUBTASKS_TABLE = `
CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0,
  task_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CHECK (position >= 0)
);
`;

// Reminders table
export const CREATE_REMINDERS_TABLE = `
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  remind_at DATETIME NOT NULL,
  is_sent INTEGER NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'push' CHECK (method IN ('push', 'email', 'sms')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
`;

// Task History table (for change logging)
export const CREATE_TASK_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'completed', 'uncompleted')),
  changed_by TEXT NOT NULL,
  changes TEXT NOT NULL, -- JSON
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);
`;

// Attachments table
export const CREATE_ATTACHMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CHECK (size > 0)
);
`;

// Indexes for performance optimization
export const CREATE_INDEXES = [
  // Task indexes
  `CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_user_list ON tasks(user_id, list_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(list_id, position)`,

  // Subtask indexes
  `CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subtasks_position ON subtasks(task_id, position)`,

  // Reminder indexes
  `CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at)`,
  `CREATE INDEX IF NOT EXISTS idx_reminders_is_sent ON reminders(is_sent)`,

  // Task History indexes
  `CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_task_history_action ON task_history(action)`,

  // Attachment indexes
  `CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_at ON attachments(uploaded_at)`,

  // Label indexes
  `CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id)`,

  // List indexes
  `CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lists_is_default ON lists(is_default)`,
];

// Create all tables
export const CREATE_ALL_TABLES = `
${CREATE_USERS_TABLE}

${CREATE_LISTS_TABLE}

${CREATE_LABELS_TABLE}

${CREATE_TASKS_TABLE}

${CREATE_TASK_LABELS_TABLE}

${CREATE_SUBTASKS_TABLE}

${CREATE_REMINDERS_TABLE}

${CREATE_TASK_HISTORY_TABLE}

${CREATE_ATTACHMENTS_TABLE}
`;

// Create all indexes
export const CREATE_ALL_INDEXES = CREATE_INDEXES.join("\n");

// Complete schema setup
export const COMPLETE_SCHEMA = `
${INITIALIZE_DATABASE}

${CREATE_ALL_TABLES}

${CREATE_ALL_INDEXES}
`;

// Default data insertion
export const INSERT_DEFAULT_DATA = `
-- Insert default "Inbox" list for each user (handled in application logic)
-- Insert default labels if needed (handled in application logic)

-- Create a default user (this should be handled by the application)
-- INSERT OR IGNORE INTO users (id, name, email)
-- VALUES ('default_user', 'Default User', 'default@example.com');
`;

// Database triggers for updated_at timestamp
export const CREATE_TRIGGERS = `
-- Trigger to update updated_at timestamp for users
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Trigger to update updated_at timestamp for lists
CREATE TRIGGER IF NOT EXISTS update_lists_updated_at
  AFTER UPDATE ON lists
  FOR EACH ROW
  BEGIN
    UPDATE lists SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Trigger to update updated_at timestamp for labels
CREATE TRIGGER IF NOT EXISTS update_labels_updated_at
  AFTER UPDATE ON labels
  FOR EACH ROW
  BEGIN
    UPDATE labels SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Trigger to update updated_at timestamp for tasks
CREATE TRIGGER IF NOT EXISTS update_tasks_updated_at
  AFTER UPDATE ON tasks
  FOR EACH ROW
  BEGIN
    UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Trigger to update updated_at timestamp for subtasks
CREATE TRIGGER IF NOT EXISTS update_subtasks_updated_at
  AFTER UPDATE ON subtasks
  FOR EACH ROW
  BEGIN
    UPDATE subtasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Trigger to update updated_at timestamp for reminders
CREATE TRIGGER IF NOT EXISTS update_reminders_updated_at
  AFTER UPDATE ON reminders
  FOR EACH ROW
  BEGIN
    UPDATE reminders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Trigger to log task deletions
CREATE TRIGGER IF NOT EXISTS log_task_deletion
  AFTER DELETE ON tasks
  FOR EACH ROW
  BEGIN
    INSERT INTO task_history (id, task_id, action, changed_by, changes, description)
    VALUES (
      'history_' || OLD.id || '_' || strftime('%Y%m%d%H%M%S', 'now'),
      OLD.id,
      'deleted',
      COALESCE(OLD.user_id, 'system'),
      JSON_OBJECT('task_data', OLD.name),
      'Task deleted'
    );
  END;
`;

// Complete schema with triggers
export const COMPLETE_SCHEMA_WITH_TRIGGERS = `
${COMPLETE_SCHEMA}

${CREATE_TRIGGERS}
`;

// Schema validation queries
export const VALIDATION_QUERIES = {
  checkTablesExist: `
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name IN ('users', 'lists', 'tasks', 'labels', 'subtasks', 'reminders', 'task_history', 'attachments')
    ORDER BY name;
  `,

  checkIndexesExist: `
    SELECT name FROM sqlite_master
    WHERE type='index'
    AND tbl_name IN ('tasks', 'subtasks', 'reminders', 'task_history', 'attachments')
    ORDER BY tbl_name, name;
  `,

  checkTriggersExist: `
    SELECT name FROM sqlite_master
    WHERE type='trigger'
    ORDER BY name;
  `,

  getTableSchema: (tableName: string) => `
    SELECT sql FROM sqlite_master
    WHERE type='table' AND name='${tableName}';
  `,

  getTableCount: (tableName: string) => `
    SELECT COUNT(*) as count FROM ${tableName};
  `,
};

// Migration management
export interface Migration {
  id: string;
  name: string;
  sql: string;
  timestamp: Date;
}

export const MIGRATIONS: Migration[] = [
  {
    id: "001_initial_schema",
    name: "Create initial database schema",
    sql: COMPLETE_SCHEMA_WITH_TRIGGERS,
    timestamp: new Date(),
  },
];

// Database configuration defaults
export const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
  path: "./data/tasks.db",
  timeout: 10000,
  verbose: false,
  WAL: true,
  foreignKeys: true,
  backupEnabled: true,
  backupInterval: 24 * 60 * 60 * 1000, // 24 hours
};

// Export createListSchema for compatibility
export const createListSchema = {
  name: "string",
  color: "string",
  emoji: "string",
  is_default: "boolean",
  user_id: "string",
};

// Export createTaskSchema for compatibility
export const createTaskSchema = {
  title: "string",
  description: "string",
  status: "string",
  priority: "string",
  list_id: "string",
  user_id: "string",
  due_date: "string",
  estimated_duration: "number",
  actual_duration: "number",
  position: "number",
};

// Export createLabelSchema for compatibility
export const createLabelSchema = {
  name: "string",
  color: "string",
  icon: "string",
  user_id: "string",
};

// Utility functions for schema operations
export class SchemaUtils {
  static validateTableName(tableName: string): boolean {
    const validTables = [
      "users",
      "lists",
      "tasks",
      "labels",
      "task_labels",
      "subtasks",
      "reminders",
      "task_history",
      "attachments",
    ];
    return validTables.includes(tableName);
  }

  static sanitizeTableName(tableName: string): string {
    return tableName.replace(/[^a-zA-Z0-9_]/g, "");
  }

  static getTableColumns(tableName: string): string[] {
    const columnsMap: Record<string, string[]> = {
      users: [
        "id",
        "name",
        "email",
        "avatar",
        "preferences",
        "created_at",
        "updated_at",
      ],
      lists: [
        "id",
        "name",
        "color",
        "emoji",
        "is_default",
        "user_id",
        "created_at",
        "updated_at",
      ],
      tasks: [
        "id",
        "name",
        "description",
        "date",
        "deadline",
        "estimate",
        "actual_time",
        "priority",
        "status",
        "user_id",
        "list_id",
        "parent_task_id",
        "position",
        "is_recurring",
        "recurring_pattern",
        "created_at",
        "updated_at",
      ],
      labels: [
        "id",
        "name",
        "icon",
        "color",
        "user_id",
        "created_at",
        "updated_at",
      ],
      task_labels: ["task_id", "label_id", "created_at"],
      subtasks: [
        "id",
        "name",
        "is_completed",
        "task_id",
        "position",
        "created_at",
        "updated_at",
      ],
      reminders: [
        "id",
        "task_id",
        "remind_at",
        "is_sent",
        "method",
        "created_at",
        "updated_at",
      ],
      task_history: [
        "id",
        "task_id",
        "action",
        "changed_by",
        "changes",
        "description",
        "created_at",
      ],
      attachments: [
        "id",
        "task_id",
        "filename",
        "original_name",
        "mime_type",
        "size",
        "path",
        "uploaded_at",
      ],
    };

    return columnsMap[tableName] || [];
  }
}
