/**
 * Framerr Database Migration System
 * 
 * Handles automatic schema migrations on server startup.
 * Uses PRAGMA user_version for version tracking.
 * 
 * Features:
 * - Auto-backup before migrations
 * - Forward-only migrations (industry standard)
 * - Downgrade detection with helpful error
 * - Transaction-wrapped migrations
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Data directory configuration
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'framerr.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 3;

/**
 * Get current schema version from database
 * @param {Database} db - better-sqlite3 database instance
 * @returns {number} Current schema version
 */
function getCurrentVersion(db) {
    const result = db.pragma('user_version', { simple: true });
    return result || 0;
}

/**
 * Set schema version in database
 * @param {Database} db - better-sqlite3 database instance
 * @param {number} version - Version number to set
 */
function setVersion(db, version) {
    db.pragma(`user_version = ${version}`);
}

/**
 * Get expected schema version (highest migration available)
 * @returns {number} Expected version
 */
function getExpectedVersion() {
    const migrations = loadMigrations();
    if (migrations.length === 0) return 1; // Base version
    return Math.max(...migrations.map(m => m.version));
}

/**
 * Load all migration files from migrations directory
 * @returns {Array} Sorted array of migration objects
 */
function loadMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
        logger.debug('[Migrator] No migrations directory found');
        return [];
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.js'))
        .sort(); // Alphabetical = version order due to naming convention

    const migrations = [];
    for (const file of files) {
        try {
            const migration = require(path.join(migrationsDir, file));
            if (migration.version && migration.up) {
                migrations.push({
                    ...migration,
                    filename: file
                });
            }
        } catch (error) {
            logger.error(`[Migrator] Failed to load migration ${file}:`, error.message);
        }
    }

    return migrations.sort((a, b) => a.version - b.version);
}

/**
 * Get pending migrations that need to be run
 * @param {Database} db - better-sqlite3 database instance
 * @returns {Array} Migrations to run
 */
function getPendingMigrations(db) {
    const currentVersion = getCurrentVersion(db);
    const migrations = loadMigrations();
    return migrations.filter(m => m.version > currentVersion);
}

/**
 * Create backup of database file
 * @returns {string|null} Backup file path or null if failed
 */
function createBackup() {
    if (!fs.existsSync(DB_PATH)) {
        logger.debug('[Migrator] No database to backup');
        return null;
    }

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentVersion = getCurrentVersion(require('./db').db);
    const backupPath = path.join(BACKUP_DIR, `framerr-v${currentVersion}-${timestamp}.db`);

    try {
        fs.copyFileSync(DB_PATH, backupPath);
        logger.info(`[Migrator] Backup created: ${backupPath}`);

        // Clean up old backups
        cleanupOldBackups();

        return backupPath;
    } catch (error) {
        logger.error('[Migrator] Failed to create backup:', error.message);
        return null;
    }
}

/**
 * Remove old backups, keep only MAX_BACKUPS most recent
 */
function cleanupOldBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('framerr-') && f.endsWith('.db'))
        .map(f => ({
            name: f,
            path: path.join(BACKUP_DIR, f),
            time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Newest first

    // Delete backups beyond MAX_BACKUPS
    for (let i = MAX_BACKUPS; i < backups.length; i++) {
        try {
            fs.unlinkSync(backups[i].path);
            logger.debug(`[Migrator] Deleted old backup: ${backups[i].name}`);
        } catch (error) {
            logger.warn(`[Migrator] Failed to delete old backup: ${backups[i].name}`);
        }
    }
}

/**
 * Restore database from backup file
 * @param {string} backupPath - Path to backup file
 * @returns {boolean} Success
 */
function restoreFromBackup(backupPath) {
    if (!fs.existsSync(backupPath)) {
        logger.error(`[Migrator] Backup not found: ${backupPath}`);
        return false;
    }

    try {
        fs.copyFileSync(backupPath, DB_PATH);
        logger.info(`[Migrator] Database restored from: ${backupPath}`);
        return true;
    } catch (error) {
        logger.error('[Migrator] Failed to restore backup:', error.message);
        return false;
    }
}

/**
 * Check if database needs migration
 * @param {Database} db - better-sqlite3 database instance
 * @returns {Object} { needsMigration, currentVersion, expectedVersion, isDowngrade }
 */
function checkMigrationStatus(db) {
    const currentVersion = getCurrentVersion(db);
    const expectedVersion = getExpectedVersion();

    return {
        needsMigration: currentVersion < expectedVersion,
        isDowngrade: currentVersion > expectedVersion,
        currentVersion,
        expectedVersion
    };
}

/**
 * Run all pending migrations
 * @param {Database} db - better-sqlite3 database instance
 * @returns {Object} { success, migratedFrom, migratedTo, error }
 */
function runMigrations(db) {
    const status = checkMigrationStatus(db);

    // Handle downgrade attempt
    if (status.isDowngrade) {
        const error = new Error(
            `Database schema (v${status.currentVersion}) is newer than this version of Framerr expects (v${status.expectedVersion}). ` +
            `Please upgrade Framerr or restore from a backup. Backups are stored in: ${BACKUP_DIR}`
        );
        logger.error('[Migrator]', error.message);
        return { success: false, error: error.message };
    }

    // No migration needed
    if (!status.needsMigration) {
        logger.debug(`[Migrator] Database at version ${status.currentVersion}, no migration needed`);
        return { success: true, migratedFrom: status.currentVersion, migratedTo: status.currentVersion };
    }

    const pending = getPendingMigrations(db);
    logger.info(`[Migrator] Running ${pending.length} migrations (v${status.currentVersion} → v${status.expectedVersion})`);

    // Create backup before migration
    const backupPath = createBackup();
    if (!backupPath && fs.existsSync(DB_PATH)) {
        logger.warn('[Migrator] Failed to create backup, proceeding anyway...');
    }

    let lastSuccessfulVersion = status.currentVersion;

    try {
        for (const migration of pending) {
            logger.info(`[Migrator] Running migration ${migration.version}: ${migration.name || migration.filename}`);

            // Run migration in transaction
            const runMigration = db.transaction(() => {
                migration.up(db);
                setVersion(db, migration.version);
            });

            runMigration();
            lastSuccessfulVersion = migration.version;
            logger.info(`[Migrator] ✓ Migration ${migration.version} complete`);
        }

        logger.info(`[Migrator] All migrations complete (v${status.currentVersion} → v${lastSuccessfulVersion})`);
        return {
            success: true,
            migratedFrom: status.currentVersion,
            migratedTo: lastSuccessfulVersion
        };

    } catch (error) {
        logger.error(`[Migrator] Migration failed at v${lastSuccessfulVersion + 1}:`, error.message);

        // Attempt to restore from backup
        if (backupPath) {
            logger.info('[Migrator] Attempting to restore from backup...');
            if (restoreFromBackup(backupPath)) {
                logger.info('[Migrator] Database restored successfully');
            } else {
                logger.error('[Migrator] Failed to restore backup! Manual intervention required.');
            }
        }

        return {
            success: false,
            migratedFrom: status.currentVersion,
            migratedTo: lastSuccessfulVersion,
            error: error.message
        };
    }
}

/**
 * List available backups
 * @returns {Array} Array of backup info objects
 */
function listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    return fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('framerr-') && f.endsWith('.db'))
        .map(f => {
            const stat = fs.statSync(path.join(BACKUP_DIR, f));
            return {
                filename: f,
                path: path.join(BACKUP_DIR, f),
                size: stat.size,
                created: stat.mtime
            };
        })
        .sort((a, b) => b.created - a.created);
}

module.exports = {
    getCurrentVersion,
    setVersion,
    getExpectedVersion,
    loadMigrations,
    getPendingMigrations,
    checkMigrationStatus,
    runMigrations,
    createBackup,
    restoreFromBackup,
    listBackups,
    BACKUP_DIR
};
