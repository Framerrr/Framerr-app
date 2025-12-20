/**
 * SQLite Database Connection Module
 * 
 * Provides a singleton connection to the SQLite database for Framerr.
 * Uses better-sqlite3 for synchronous, fast SQLite operations.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Determine database location
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'framerr.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database instance type
type DatabaseInstance = ReturnType<typeof Database>;

// Create database connection
let db: DatabaseInstance;

try {
    db = new Database(DB_PATH, {
        // Verbose logging disabled - was causing UUID truncation in console output
        verbose: undefined
    });

    // Enable WAL mode for better concurrency (allows simultaneous reads and writes)
    db.pragma('journal_mode = WAL');

    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');

    console.log(`[DB] Connected to SQLite database: ${DB_PATH}`);
    console.log(`[DB] WAL mode enabled, foreign keys enforced`);

} catch (error) {
    console.error('[DB] Failed to initialize database:', (error as Error).message);
    throw error;
}

/**
 * Initialize database schema from schema.sql file
 * This should be called once on first startup
 */
function initializeSchema(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
        // Execute schema in a transaction for atomicity
        db.exec(schema);
        console.log('[DB] Schema initialized successfully');
    } catch (error) {
        console.error('[DB] Failed to initialize schema:', (error as Error).message);
        throw error;
    }
}

interface TableCountResult {
    count: number;
}

/**
 * Check if database is initialized (has tables)
 */
function isInitialized(): boolean {
    const result = db.prepare(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='table' AND name='users'
    `).get() as TableCountResult;

    return result.count > 0;
}

/**
 * Close database connection
 * Should only be called on graceful shutdown
 */
function closeDatabase(): void {
    if (db) {
        db.close();
        console.log('[DB] Database connection closed');
    }
}

// Export singleton instance and utilities
export {
    db,
    initializeSchema,
    isInitialized,
    closeDatabase
};
