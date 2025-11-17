// Database Connection and Management for Daily Task Planner
// SQLite implementation using better-sqlite3

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { 
  DatabaseConfig, 
  DatabaseError, 
  ValidationError, 
  NotFoundError,
  Transaction,
  DatabaseStats,
  type DatabaseOperation
} from './types';
import { 
  COMPLETE_SCHEMA_WITH_TRIGGERS, 
  DEFAULT_DATABASE_CONFIG,
  VALIDATION_QUERIES,
  SCHEMA_VERSION,
  MIGRATIONS
} from './schema';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;
  private backupInterval: NodeJS.Timeout | null = null;

  private constructor(config?: Partial<DatabaseConfig>) {
    this.config = { ...DEFAULT_DATABASE_CONFIG, ...config };
    this.ensureDataDirectory();
  }

  public static getInstance(config?: Partial<DatabaseConfig>): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(config);
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection and schema
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.createConnection();
      await this.setupSchema();
      await this.validateSchema();
      this.startBackupScheduler();
      this.isInitialized = true;
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_ERROR'
      );
    }
  }

  /**
   * Get database connection
   */
  public getConnection(): Database.Database {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }
    return this.db;
  }

  /**
   * Create database connection
   */
  private createConnection(): void {
    try {
      this.db = new Database(this.config.path, {
        timeout: this.config.timeout,
        verbose: this.config.verbose ? console.log : undefined,
      });

      // Set database pragmas
      this.db.pragma('foreign_keys = ON');
      if (this.config.WAL) {
        this.db.pragma('journal_mode = WAL');
      }

      if (this.config.verbose) {
        console.log(`Database connected: ${this.config.path}`);
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to create database connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_ERROR'
      );
    }
  }

  /**
   * Setup database schema and initial data
   */
  private async setupSchema(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      // Check if tables already exist
      const tableCount = this.db
        .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        .get() as { count: number };

      if (tableCount.count === 0) {
        // First time setup
        this.db.exec(COMPLETE_SCHEMA_WITH_TRIGGERS);
        
        // Create migrations table
        this.db.prepare(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        // Record initial migration
        this.db.prepare(`
          INSERT INTO schema_migrations (id, name, version)
          VALUES (?, ?, ?)
        `).run(MIGRATIONS[0].id, MIGRATIONS[0].name, SCHEMA_VERSION);

        if (this.config.verbose) {
          console.log('Database schema created successfully');
        }
      }

      // Ensure data directory exists
      this.ensureDataDirectory();
    } catch (error) {
      throw new DatabaseError(
        `Failed to setup schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SCHEMA_ERROR'
      );
    }
  }

  /**
   * Validate database schema
   */
  private async validateSchema(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      // Check if all required tables exist
      const existingTables = this.db.prepare(VALIDATION_QUERIES.checkTablesExist).all() as { name: string }[];
      const existingTableNames = existingTables.map(table => table.name);
      
      const requiredTables = [
        'users', 'lists', 'tasks', 'labels', 'task_labels',
        'subtasks', 'reminders', 'task_history', 'attachments'
      ];

      const missingTables = requiredTables.filter(table => !existingTableNames.includes(table));
      if (missingTables.length > 0) {
        throw new DatabaseError(
          `Missing required tables: ${missingTables.join(', ')}`,
          'SCHEMA_VALIDATION_ERROR'
        );
      }

      // Validate critical indexes
      const indexes = this.db.prepare(VALIDATION_QUERIES.checkIndexesExist).all() as { name: string }[];
      if (indexes.length === 0) {
        console.warn('No indexes found - this may impact performance');
      }

      if (this.config.verbose) {
        console.log('Database schema validation passed');
      }
    } catch (error) {
      throw new DatabaseError(
        `Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SCHEMA_VALIDATION_ERROR'
      );
    }
  }

  /**
   * Execute database transaction
   */
  public async executeTransaction<T>(operations: DatabaseOperation<T>[]): Promise<T[]> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    const transaction = this.db.transaction((ops: DatabaseOperation<T>[]) => {
      return ops.map(op => {
        const result = op.execute();
        if (result instanceof Promise) {
          throw new DatabaseError('Synchronous operations only in transactions', 'ASYNC_TRANSACTION_ERROR');
        }
        return result;
      });
    });

    try {
      const results = transaction(operations);
      return results;
    } catch (error) {
      // Rollback is automatic in better-sqlite3 transactions
      throw new DatabaseError(
        `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_ERROR'
      );
    }
  }

  /**
   * Create a new transaction
   */
  public createTransaction(): Transaction {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    let inTransaction = false;

    return {
      execute: async <T>(operation: DatabaseOperation<T>): Promise<T> => {
        if (!inTransaction) {
          throw new DatabaseError('Transaction not started', 'TRANSACTION_NOT_STARTED');
        }

        try {
          const result = operation.execute();
          if (result instanceof Promise) {
            throw new DatabaseError('Synchronous operations only in transactions', 'ASYNC_TRANSACTION_ERROR');
          }
          return result;
        } catch (error) {
          // Rollback will be handled by the transaction context
          throw new DatabaseError(
            `Transaction operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'TRANSACTION_OPERATION_ERROR'
          );
        }
      },

      commit: async (): Promise<void> => {
        inTransaction = false;
      },

      rollback: async (): Promise<void> => {
        inTransaction = false;
        throw new DatabaseError('Transaction rolled back', 'TRANSACTION_ROLLED_BACK');
      },
    };
  }

  /**
   * Health check for database
   */
  public async healthCheck(): Promise<{ healthy: boolean; message: string; stats?: DatabaseStats }> {
    if (!this.db) {
      return {
        healthy: false,
        message: 'Database not initialized',
      };
    }

    try {
      // Test basic operations
      this.db.prepare('SELECT 1').get();
      
      // Get database stats
      const stats = await this.getDatabaseStats();

      return {
        healthy: true,
        message: 'Database is healthy',
        stats,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(): Promise<DatabaseStats> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const stats = this.db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM users) as totalUsers,
          (SELECT COUNT(*) FROM lists) as totalLists,
          (SELECT COUNT(*) FROM tasks) as totalTasks,
          (SELECT COUNT(*) FROM labels) as totalLabels,
          (SELECT COUNT(*) FROM subtasks) as totalSubtasks,
          (SELECT COUNT(*) FROM reminders) as totalReminders,
          (SELECT COUNT(*) FROM attachments) as totalAttachments,
          (SELECT COUNT(*) FROM task_history) as totalHistoryEntries
      `).get() as DatabaseStats;

      return stats;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STATS_ERROR'
      );
    }
  }

  /**
   * Create database backup
   */
  public async createBackup(backupPath?: string): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultBackupPath = path.join(
        path.dirname(this.config.path),
        `backup_tasks_${timestamp}.db`
      );
      
      const targetPath = backupPath || defaultBackupPath;
      
      // Create backup using SQLite backup API
      const backup = this.db.backup(targetPath);
      await backup.step(-1);
      backup.close();

      if (this.config.verbose) {
        console.log(`Database backup created: ${targetPath}`);
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BACKUP_ERROR'
      );
    }
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      
      if (this.config.verbose) {
        console.log('Database connection closed');
      }
    }
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    const dbDir = path.dirname(this.config.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  /**
   * Start backup scheduler
   */
  private startBackupScheduler(): void {
    if (this.config.backupEnabled && this.config.backupInterval > 0) {
      this.backupInterval = setInterval(async () => {
        try {
          await this.createBackup();
        } catch (error) {
          console.error('Scheduled backup failed:', error);
        }
      }, this.config.backupInterval);
    }
  }

  /**
   * Reset database (for development/testing)
   */
  public async reset(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      this.close();
      fs.unlinkSync(this.config.path);
      await this.initialize();
    } catch (error) {
      throw new DatabaseError(
        `Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RESET_ERROR'
      );
    }
  }

  /**
   * Run custom SQL query
   */
  public query<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const statement = this.db.prepare(sql);
      return statement.all(params) as T[];
    } catch (error) {
      throw new DatabaseError(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY_ERROR'
      );
    }
  }

  /**
   * Execute single SQL statement
   */
  public run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: any } {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const statement = this.db.prepare(sql);
      return statement.run(params);
    } catch (error) {
      throw new DatabaseError(
        `Statement execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXECUTION_ERROR'
      );
    }
  }

  /**
   * Get single row from query
   */
  public get<T = any>(sql: string, params: any[] = []): T | undefined {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const statement = this.db.prepare(sql);
      return statement.get(params) as T | undefined;
    } catch (error) {
      throw new DatabaseError(
        `Get operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_ERROR'
      );
    }
  }

  /**
   * Check if database is in WAL mode
   */
  public isWALMode(): boolean {
    if (!this.db) {
      return false;
    }

    try {
      const result = this.db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
      return result.journal_mode.toLowerCase() === 'wal';
    } catch (error) {
      return false;
    }
  }

  /**
   * Optimize database
   */
  public optimize(): void {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      this.db.pragma('optimize');
      this.db.exec('VACUUM');
      
      if (this.config.verbose) {
        console.log('Database optimized');
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to optimize database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'OPTIMIZE_ERROR'
      );
    }
  }
}

// Singleton instance
export const db = DatabaseManager.getInstance();

// Export convenience functions
export const {
  query,
  run,
  get,
  getDatabaseStats,
  healthCheck,
  createBackup,
  close,
} = {
  query: (sql: string, params: any[] = []) => db.query(sql, params),
  run: (sql: string, params: any[] = []) => db.run(sql, params),
  get: (sql: string, params: any[] = []) => db.get(sql, params),
  getDatabaseStats: () => db.getDatabaseStats(),
  healthCheck: () => db.healthCheck(),
  createBackup: (backupPath?: string) => db.createBackup(backupPath),
  close: () => db.close(),
};