// Database Utilities for Daily Task Planner
// Migration system, health checks, and helper functions

import path from 'path';
import fs from 'fs';
import { 
  DatabaseManager,
  ValidationError,
  NotFoundError,
  DatabaseError 
} from './types';
import { 
  SCHEMA_VERSION,
  MIGRATIONS,
  VALIDATION_QUERIES,
  SchemaUtils
} from './schema';

export class MigrationManager {
  private db: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager;
  }

  /**
   * Get current schema version
   */
  public getCurrentVersion(): string {
    try {
      const result = this.db.get(
        'SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1'
      );
      return result?.version || '0.0.0';
    } catch (error) {
      return '0.0.0'; // No migrations applied
    }
  }

  /**
   * Check if migration needs to be applied
   */
  public needsMigration(): boolean {
    const currentVersion = this.getCurrentVersion();
    return this.compareVersions(currentVersion, SCHEMA_VERSION) < 0;
  }

  /**
   * Run pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      if (!this.needsMigration()) {
        return;
      }

      // Create migrations table if it doesn't exist
      this.db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Get applied migrations
      const appliedMigrations = this.db.query(
        'SELECT id FROM schema_migrations'
      ) as { id: string }[];

      const appliedIds = new Set(appliedMigrations.map(m => m.id));

      // Apply pending migrations
      for (const migration of MIGRATIONS) {
        if (!appliedIds.has(migration.id)) {
          await this.applyMigration(migration);
        }
      }

    } catch (error) {
      throw new DatabaseError(
        `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MIGRATION_ERROR'
      );
    }
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: typeof MIGRATIONS[0]): Promise<void> {
    try {
      // Record migration start
      this.db.run(
        'INSERT INTO schema_migrations (id, name, version) VALUES (?, ?, ?)',
        [migration.id, migration.name, SCHEMA_VERSION]
      );

      // Execute migration SQL
      this.db.exec(migration.sql);

      console.log(`Applied migration: ${migration.name} (${migration.id})`);
    } catch (error) {
      // Rollback migration record on failure
      this.db.run('DELETE FROM schema_migrations WHERE id = ?', [migration.id]);
      
      throw new DatabaseError(
        `Failed to apply migration ${migration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MIGRATION_APPLY_ERROR'
      );
    }
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }
}

export class HealthChecker {
  private db: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager;
  }

  /**
   * Comprehensive health check
   */
  public async performHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: any;
    }>;
    timestamp: Date;
  }> {
    const checks = [
      this.checkConnection(),
      this.checkSchema(),
      this.checkIndexes(),
      this.checkConstraints(),
      this.checkPerformance(),
      this.checkDiskSpace(),
      this.checkBackupStatus(),
    ];

    const results = await Promise.all(checks);
    const failedChecks = results.filter(check => check.status === 'fail');
    const warningChecks = results.filter(check => check.status === 'warning');

    let status: 'healthy' | 'warning' | 'critical';
    if (failedChecks.length > 0) {
      status = 'critical';
    } else if (warningChecks.length > 0) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return {
      status,
      checks: results,
      timestamp: new Date(),
    };
  }

  /**
   * Check database connection
   */
  private async checkConnection(): Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }> {
    try {
      const startTime = Date.now();
      this.db.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        name: 'Database Connection',
        status: responseTime > 1000 ? 'warning' : 'pass',
        message: responseTime > 1000 
          ? `Slow connection (${responseTime}ms)`
          : `Connection healthy (${responseTime}ms)`,
        details: { responseTime },
      };
    } catch (error) {
      return {
        name: 'Database Connection',
        status: 'fail',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check database schema
   */
  private async checkSchema(): Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }> {
    try {
      const tables = this.db.query(VALIDATION_QUERIES.checkTablesExist) as { name: string }[];
      const tableNames = tables.map(t => t.name);
      
      const requiredTables = [
        'users', 'lists', 'tasks', 'labels', 'task_labels',
        'subtasks', 'reminders', 'task_history', 'attachments'
      ];

      const missingTables = requiredTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        return {
          name: 'Database Schema',
          status: 'fail',
          message: `Missing tables: ${missingTables.join(', ')}`,
          details: { missingTables, existingTables: tableNames },
        };
      }

      return {
        name: 'Database Schema',
        status: 'pass',
        message: 'All required tables exist',
        details: { tableCount: tableNames.length },
      };
    } catch (error) {
      return {
        name: 'Database Schema',
        status: 'fail',
        message: `Schema check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check database indexes
   */
  private async checkIndexes(): Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }> {
    try {
      const indexes = this.db.query(VALIDATION_QUERIES.checkIndexesExist) as { name: string }[];
      
      if (indexes.length === 0) {
        return {
          name: 'Database Indexes',
          status: 'warning',
          message: 'No indexes found - performance may be poor',
          details: { indexCount: 0 },
        };
      }

      const expectedIndexes = 15; // Based on schema.ts
      if (indexes.length < expectedIndexes) {
        return {
          name: 'Database Indexes',
          status: 'warning',
          message: `Expected at least ${expectedIndexes} indexes, found ${indexes.length}`,
          details: { indexCount: indexes.length, expected: expectedIndexes },
        };
      }

      return {
        name: 'Database Indexes',
        status: 'pass',
        message: 'Indexes present',
        details: { indexCount: indexes.length },
      };
    } catch (error) {
      return {
        name: 'Database Indexes',
        status: 'fail',
        message: `Index check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check foreign key constraints
   */
  private async checkConstraints(): Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }> {
    try {
      // Check if foreign keys are enabled
      const foreignKeyStatus = this.db.query('PRAGMA foreign_keys') as { foreign_keys: number }[];
      const foreignKeysEnabled = foreignKeyStatus[0]?.foreign_keys === 1;

      if (!foreignKeysEnabled) {
        return {
          name: 'Foreign Key Constraints',
          status: 'fail',
          message: 'Foreign key constraints are disabled',
        };
      }

      // Check for orphaned records
      const orphanedTasks = this.db.query(`
        SELECT COUNT(*) as count FROM tasks t
        LEFT JOIN lists l ON t.list_id = l.id
        WHERE l.id IS NULL
      `) as { count: number }[];

      if (orphanedTasks[0]?.count > 0) {
        return {
          name: 'Foreign Key Constraints',
          status: 'warning',
          message: `Found ${orphanedTasks[0].count} orphaned tasks`,
          details: { orphanedTasks: orphanedTasks[0].count },
        };
      }

      return {
        name: 'Foreign Key Constraints',
        status: 'pass',
        message: 'Foreign key constraints are healthy',
      };
    } catch (error) {
      return {
        name: 'Foreign Key Constraints',
        status: 'fail',
        message: `Constraint check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check database performance
   */
  private async checkPerformance(): Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }> {
    try {
      // Check if WAL mode is enabled
      const isWAL = this.db.isWALMode();
      
      // Check database size
      const stats = await this.db.getDatabaseStats();
      const totalRecords = stats.totalTasks + stats.totalLists + stats.totalLabels;
      
      let status: 'pass' | 'fail' | 'warning' = 'pass';
      const warnings: string[] = [];

      if (!isWAL) {
        warnings.push('WAL mode not enabled');
        status = 'warning';
      }

      if (totalRecords > 10000) {
        warnings.push('Large dataset - consider optimization');
        if (status === 'pass') status = 'warning';
      }

      return {
        name: 'Database Performance',
        status,
        message: warnings.length > 0 ? warnings.join(', ') : 'Performance is good',
        details: { 
          isWAL, 
          totalRecords,
          warnings: warnings.length,
        },
      };
    } catch (error) {
      return {
        name: 'Database Performance',
        status: 'fail',
        message: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace(): Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }> {
    try {
      const dbPath = (this.db as any).config?.path || './data/tasks.db';
      const stats = fs.statSync(dbPath);
      const sizeInMB = stats.size / (1024 * 1024);
      
      // Check available disk space
      const dbDir = path.dirname(dbPath);
      const { available } = fs.statSync(dbDir);
      
      if (sizeInMB > 100) {
        return {
          name: 'Disk Space',
          status: 'warning',
          message: `Database size is ${sizeInMB.toFixed(2)}MB - consider archiving old data`,
          details: { sizeInMB },
        };
      }

      return {
        name: 'Disk Space',
        status: 'pass',
        message: `Database size is healthy (${sizeInMB.toFixed(2)}MB)`,
        details: { sizeInMB },
      };
    } catch (error) {
      return {
        name: 'Disk Space',
        status: 'fail',
        message: `Disk space check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check backup status
   */
  private async checkBackupStatus(): Promise<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }> {
    try {
      const dbDir = path.dirname((this.db as any).config?.path || './data/tasks.db');
      
      if (!fs.existsSync(dbDir)) {
        return {
          name: 'Backup Status',
          status: 'fail',
          message: 'Database directory not accessible',
        };
      }

      const backupFiles = fs.readdirSync(dbDir)
        .filter(file => file.startsWith('backup_tasks_') && file.endsWith('.db'));
      
      const latestBackup = backupFiles
        .map(file => ({
          file,
          time: fs.statSync(path.join(dbDir, file)).mtime
        }))
        .sort((a, b) => b.time.getTime() - a.time.getTime())[0];

      if (!latestBackup) {
        return {
          name: 'Backup Status',
          status: 'warning',
          message: 'No backup files found',
          details: { backupCount: 0 },
        };
      }

      const hoursSinceBackup = (Date.now() - latestBackup.time.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceBackup > 24) {
        return {
          name: 'Backup Status',
          status: 'warning',
          message: `Last backup was ${hoursSinceBackup.toFixed(1)} hours ago`,
          details: { 
            hoursSinceBackup: Math.round(hoursSinceBackup),
            latestBackup: latestBackup.file,
          },
        };
      }

      return {
        name: 'Backup Status',
        status: 'pass',
        message: 'Recent backup found',
        details: { 
          backupCount: backupFiles.length,
          hoursSinceBackup: Math.round(hoursSinceBackup),
        },
      };
    } catch (error) {
      return {
        name: 'Backup Status',
        status: 'fail',
        message: `Backup check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export class QueryBuilder {
  private query: {
    select: string[];
    from: string;
    where: Record<string, any>;
    whereIn: Record<string, any[]>;
    orderBy: Array<{ column: string; direction: 'ASC' | 'DESC' }>;
    limit?: number;
    offset?: number;
    joins: Array<{ table: string; condition: string }>;
  };

  constructor() {
    this.query = {
      select: [],
      from: '',
      where: {},
      whereIn: {},
      orderBy: [],
      joins: []
    };
  }

  public select(columns: string[]): QueryBuilder {
    this.query.select = columns;
    return this;
  }

  public from(table: string): QueryBuilder {
    this.query.from = SchemaUtils.sanitizeTableName(table);
    return this;
  }

  public where(conditions: Record<string, any>): QueryBuilder {
    this.query.where = { ...this.query.where, ...conditions };
    return this;
  }

  public whereIn(column: string, values: any[]): QueryBuilder {
    this.query.whereIn[column] = values;
    return this;
  }

  public orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.query.orderBy.push({ column, direction });
    return this;
  }

  public limit(count: number): QueryBuilder {
    this.query.limit = count;
    return this;
  }

  public offset(count: number): QueryBuilder {
    this.query.offset = count;
    return this;
  }

  public join(table: string, condition: string): QueryBuilder {
    this.query.joins.push({ 
      table: SchemaUtils.sanitizeTableName(table), 
      condition 
    });
    return this;
  }

  public build(): { sql: string; params: any[] } {
    const params: any[] = [];
    
    // Build SELECT clause
    const selectClause = this.query.select.length > 0 
      ? this.query.select.join(', ')
      : '*';

    // Build FROM clause
    let sql = `SELECT ${selectClause} FROM ${this.query.from}`;

    // Build JOIN clauses
    for (const join of this.query.joins) {
      sql += ` JOIN ${join.table} ON ${join.condition}`;
    }

    // Build WHERE clause
    const whereConditions: string[] = [];
    
    for (const [key, value] of Object.entries(this.query.where)) {
      whereConditions.push(`${key} = ?`);
      params.push(value);
    }

    for (const [column, values] of Object.entries(this.query.whereIn)) {
      const placeholders = values.map(() => '?').join(', ');
      whereConditions.push(`${column} IN (${placeholders})`);
      params.push(...values);
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Build ORDER BY clause
    if (this.query.orderBy.length > 0) {
      const orderClauses = this.query.orderBy.map(({ column, direction }) => `${column} ${direction}`);
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Build LIMIT clause
    if (this.query.limit) {
      sql += ` LIMIT ${this.query.limit}`;
      params.push(this.query.limit);
    }

    // Build OFFSET clause
    if (this.query.offset) {
      sql += ` OFFSET ${this.query.offset}`;
      params.push(this.query.offset);
    }

    return { sql, params };
  }

  public reset(): void {
    this.query = {
      select: [],
      from: '',
      where: {},
      whereIn: {},
      orderBy: [],
      joins: []
    };
  }
}

export class DataValidator {
  /**
   * Validate task data
   */
  public static validateTask(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Task name is required');
    }

    if (data.priority && !['High', 'Medium', 'Low', 'None'].includes(data.priority)) {
      errors.push('Invalid priority value');
    }

    if (data.status && !['todo', 'in_progress', 'done', 'archived'].includes(data.status)) {
      errors.push('Invalid status value');
    }

    if (data.estimate && !/^\d{1,2}:\d{2}$/.test(data.estimate)) {
      errors.push('Estimate must be in HH:mm format');
    }

    if (data.actualTime && !/^\d{1,2}:\d{2}$/.test(data.actualTime)) {
      errors.push('Actual time must be in HH:mm format');
    }

    if (data.date && isNaN(Date.parse(data.date))) {
      errors.push('Invalid date format');
    }

    if (data.deadline && isNaN(Date.parse(data.deadline))) {
      errors.push('Invalid deadline format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate list data
   */
  public static validateList(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('List name is required');
    }

    if (!data.color || typeof data.color !== 'string') {
      errors.push('List color is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate label data
   */
  public static validateLabel(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Label name is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize string input
   */
  public static sanitizeString(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .substring(0, maxLength)
      .replace(/[<>]/g, ''); // Remove potential HTML tags
  }
}

// Export utility functions
export const {
  MigrationManager,
  HealthChecker,
  QueryBuilder,
  DataValidator,
} = {
  MigrationManager,
  HealthChecker,
  QueryBuilder,
  DataValidator,
};