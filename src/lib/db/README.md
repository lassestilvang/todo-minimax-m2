# Daily Task Planner Database

A comprehensive SQLite database implementation for the Daily Task Planner application, featuring complete CRUD operations, data validation, performance optimization, and type-safe queries.

## 🎯 Features

### Database Schema
- **Users** - User management with preferences and settings
- **Lists** - Task organization with colors, emojis, and default list support
- **Tasks** - Comprehensive task management with priorities, status tracking, and scheduling
- **Labels** - Flexible labeling system with icons and colors
- **Subtasks** - Hierarchical task breakdown with completion tracking
- **Reminders** - Multiple reminder support with different notification methods
- **Attachments** - File attachment support for tasks
- **Task History** - Complete change logging for audit trails
- **Recurring Tasks** - Advanced recurrence pattern support

### Core Features
- ✅ **Type-safe operations** with TypeScript interfaces
- ✅ **Data validation** with constraint checking
- ✅ **Performance optimization** with strategic indexes
- ✅ **Foreign key constraints** for data integrity
- ✅ **Transaction support** with ACID compliance
- ✅ **Health monitoring** with comprehensive checks
- ✅ **Migration system** for schema versioning
- ✅ **Backup/restore** functionality
- ✅ **Query builder** for dynamic SQL generation
- ✅ **Error handling** with custom exception types

## 📁 File Structure

```
src/lib/db/
├── README.md           # This documentation
├── types.ts           # TypeScript interfaces and types
├── schema.ts          # Database schema definitions
├── index.ts           # Database connection manager
├── utils.ts           # Utilities, migration, health checks
├── api.ts             # Type-safe database API layer
├── test-utils.ts      # Testing utilities and fixtures
└── test.ts           # Comprehensive test suite
```

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import { createDatabaseAPI } from '@/lib/db/api';

const dbAPI = createDatabaseAPI({
  path: './data/tasks.db',
  verbose: true,
});

// Initialize database
await dbAPI.runMigrations();
await dbAPI.getDatabase().initialize();
```

### 2. Basic Operations

```typescript
// Create a task
const task = await dbAPI.createTask({
  name: 'Complete project documentation',
  description: 'Write comprehensive README and API docs',
  priority: 'High',
  status: 'todo',
  userId: 'user-123',
  listId: 'list-123',
  position: 0,
  isRecurring: false,
});

// Get tasks with filtering
const userTasks = await dbAPI.getUserTasks('user-123', {
  status: 'todo',
  priority: 'High',
  search: 'documentation'
});

// Update task
await dbAPI.updateTask(task.id, {
  status: 'in_progress',
  description: 'Updated description'
}, 'user-123');
```

### 3. Advanced Features

```typescript
// Health check
const health = await dbAPI.healthCheck();
console.log(`Database status: ${health.status}`);

// Create backup
await dbAPI.createBackup('./backup/tasks_backup.db');

// Complex query with joins
const tasksWithDetails = await dbAPI.getUserTasks('user-123', {
  listId: 'work-list',
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31')
});
```

## 📊 Schema Overview

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  preferences TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Tasks Table
```sql
CREATE TABLE tasks (
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
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

#### Supporting Tables
- **lists** - Task organization with colors and emojis
- **labels** - Flexible tagging system with icons
- **task_labels** - Many-to-many relationship for task labeling
- **subtasks** - Hierarchical task breakdown
- **reminders** - Time-based notifications
- **attachments** - File management
- **task_history** - Complete audit trail

## 🔧 API Reference

### DatabaseAPI Class

#### Task Operations
- `createTask(taskData)` - Create a new task
- `getTaskWithDetails(taskId)` - Get task with all related data
- `getUserTasks(userId, filters)` - Get filtered tasks for user
- `updateTask(taskId, updates, changedBy)` - Update task with change logging
- `deleteTask(taskId, changedBy)` - Delete task (logged via trigger)

#### List Operations
- `createList(listData)` - Create a new list
- `getUserListsWithCounts(userId)` - Get lists with task counts
- `getList(listId)` - Get single list

#### Label Operations
- `createLabel(labelData)` - Create a new label
- `getUserLabelsWithCounts(userId)` - Get labels with task counts
- `addLabelToTask(taskId, labelId)` - Add label to task
- `removeLabelFromTask(taskId, labelId)` - Remove label from task

#### Subtask Operations
- `createSubtask(subtaskData)` - Create a new subtask
- `getSubtasks(taskId)` - Get subtasks for task
- `updateSubtask(subtaskId, updates)` - Update subtask

#### Reminder Operations
- `createReminder(reminderData)` - Create a new reminder
- `getReminders(taskId)` - Get reminders for task
- `getPendingReminders(limit)` - Get due reminders
- `markReminderSent(reminderId)` - Mark reminder as sent

#### Attachment Operations
- `createAttachment(attachmentData)` - Create attachment record
- `getAttachments(taskId)` - Get attachments for task
- `deleteAttachment(attachmentId)` - Delete attachment

#### Utility Operations
- `healthCheck()` - Comprehensive database health assessment
- `runMigrations()` - Apply pending schema migrations
- `createBackup(backupPath)` - Create database backup
- `optimize()` - Optimize database performance

## 🧪 Testing

### Run Tests
```bash
# Test the complete database setup
node src/lib/db/simple-test.js

# Run TypeScript test suite (when using ts-node)
npx ts-node src/lib/db/test.ts
```

### Test Coverage
- ✅ Database connection and initialization
- ✅ Schema creation with all constraints
- ✅ CRUD operations for all entities
- ✅ Complex queries with JOINs
- ✅ Data validation and constraints
- ✅ Foreign key relationships
- ✅ Performance optimization
- ✅ Error handling
- ✅ Backup and restore
- ✅ Health monitoring

### Test Database Utilities
```typescript
import { createTestDatabaseAPI, TestDataFixtures } from '@/lib/db/api';

// Create test environment
const { api, testManager, testHelpers } = createTestDatabaseAPI({
  verbose: true
});

await testManager.initialize();

// Use test data fixtures
const testData = TestDataFixtures.createTestDataset();
await testHelpers.insertTestData(testData);

// Verify data integrity
const integrity = await testHelpers.integrityTest();
```

## ⚙️ Configuration

### Database Configuration
```typescript
const dbConfig = {
  path: './data/tasks.db',        // Database file path
  timeout: 10000,                  // Connection timeout (ms)
  verbose: false,                  // Enable verbose logging
  WAL: true,                       // Write-Ahead Logging
  foreignKeys: true,               // Enable foreign key constraints
  backupEnabled: true,             // Automatic backups
  backupInterval: 24 * 60 * 60 * 1000, // Backup interval (ms)
};
```

### Environment Variables
```bash
# Database path
DATABASE_PATH=./data/tasks.db

# Enable debug logging
DEBUG_DB=true

# Backup settings
ENABLE_BACKUP=true
BACKUP_INTERVAL_HOURS=24
```

## 🔒 Data Validation

### Built-in Constraints
- **Priority**: Must be 'High', 'Medium', 'Low', or 'None'
- **Status**: Must be 'todo', 'in_progress', 'done', or 'archived'
- **Time Format**: HH:mm format for estimates and actual times
- **Required Fields**: All primary fields are validated
- **Foreign Keys**: Enforced with CASCADE deletion
- **Unique Constraints**: Prevents duplicate lists per user

### Custom Validation
```typescript
import { DataValidator } from '@/lib/db/utils';

const validation = DataValidator.validateTask(taskData);
if (!validation.isValid) {
  console.error('Validation failed:', validation.errors);
}
```

## 📈 Performance

### Optimization Features
- **Strategic Indexing**: 15+ performance indexes
- **WAL Mode**: Write-Ahead Logging for better concurrency
- **Query Optimization**: Efficient JOINs and filtering
- **Connection Pooling**: Singleton pattern with connection reuse
- **Memory Management**: Optimized cache settings

### Performance Monitoring
```typescript
// Check database performance
const health = await dbAPI.healthCheck();
const performanceCheck = health.checks.find(check => 
  check.name === 'Database Performance'
);
console.log(performanceCheck.details);
```

## 🛠️ Development

### Adding New Tables
1. Define TypeScript interface in `types.ts`
2. Add SQL schema in `schema.ts`
3. Create API methods in `api.ts`
4. Add tests in `test.ts`
5. Update migrations if needed

### Extending Functionality
```typescript
// Add custom query method
export class DatabaseAPI {
  public async getTasksByDeadline(userId: string, days: number): Promise<Task[]> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    
    return this.db.query(
      'SELECT * FROM tasks WHERE user_id = ? AND deadline <= ?',
      [userId, deadline]
    );
  }
}
```

## 🔧 Troubleshooting

### Common Issues

#### Connection Errors
```typescript
// Ensure proper initialization
await dbManager.initialize();
await dbAPI.runMigrations();
```

#### Foreign Key Violations
```typescript
// Check foreign key constraints
const result = db.get('PRAGMA foreign_key_check');
if (result.length > 0) {
  console.log('Foreign key violations:', result);
}
```

#### Performance Issues
```typescript
// Enable query analysis
db.pragma('analysis_limit = 1000');
db.pragma('optimize');
```

### Health Check
```typescript
const health = await dbAPI.healthCheck();
switch (health.status) {
  case 'healthy':
    console.log('Database is healthy');
    break;
  case 'warning':
    console.log('Database has warnings:', health.checks);
    break;
  case 'critical':
    console.error('Database has critical issues:', health.checks);
    break;
}
```

## 📚 Examples

### Complete Task Management Flow
```typescript
async function manageTask(userId: string, listId: string) {
  // 1. Create task with subtasks
  const task = await dbAPI.createTask({
    name: 'Launch new feature',
    description: 'Deploy the new task management feature',
    priority: 'High',
    status: 'todo',
    userId,
    listId,
    position: 0,
    isRecurring: false,
  });

  // 2. Add subtasks
  await dbAPI.createSubtask({
    name: 'Write tests',
    isCompleted: false,
    taskId: task.id,
    position: 0,
  });

  await dbAPI.createSubtask({
    name: 'Deploy to production',
    isCompleted: false,
    taskId: task.id,
    position: 1,
  });

  // 3. Add labels
  await dbAPI.addLabelToTask(task.id, 'feature-label-id');
  await dbAPI.addLabelToTask(task.id, 'urgent-label-id');

  // 4. Set reminder
  await dbAPI.createReminder({
    taskId: task.id,
    remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    isSent: false,
    method: 'push',
  });

  // 5. Get complete task with details
  const fullTask = await dbAPI.getTaskWithDetails(task.id);
  return fullTask;
}
```

### Advanced Filtering
```typescript
// Get high-priority tasks due this week with specific labels
const tasks = await dbAPI.getUserTasks('user-123', {
  priority: 'High',
  labelIds: ['urgent-label', 'work-label'],
  dateFrom: new Date(),
  dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
  search: 'urgent'
});
```

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add tests for new functionality
3. Update documentation
4. Ensure all existing tests pass
5. Validate with the test suite

## 📄 License

This database implementation is part of the Daily Task Planner project and follows the same licensing terms.

---

**Ready for Production! 🎉**

The database is fully tested and ready for use in the Daily Task Planner application. All features are working correctly, and comprehensive error handling ensures robust operation in production environments.