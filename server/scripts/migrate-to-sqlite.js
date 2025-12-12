#!/usr/bin/env node
/**
 * Framerr JSON to SQLite Migration Script
 * 
 * Migrates all data from JSON files to SQLite database.
 * Preserves all user data: accounts, configs, tabs, widgets, notifications.
 * 
 * Usage:
 *   node server/scripts/migrate-to-sqlite.js [--dry-run]
 * 
 * Flags:
 *   --dry-run    Preview migration without making changes
 */

const fs = require('fs');
const path = require('path');
const { db, initializeSchema, isInitialized } = require('../database/db');

// Determine data directory
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// JSON file paths
const JSON_FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    systemConfig: path.join(DATA_DIR, 'config.json'),
    userConfigs: path.join(DATA_DIR, 'user-configs'),
    notifications: path.join(DATA_DIR, 'notifications')
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

/**
 * Read JSON file safely
 */
function readJSONFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`[ERROR] Failed to read ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Validate migration source data
 */
function validateSourceData() {
    console.log('\n[VALIDATE] Checking JSON source files...');

    const checks = {
        users: fs.existsSync(JSON_FILES.users),
        systemConfig: fs.existsSync(JSON_FILES.systemConfig),
        userConfigs: fs.existsSync(JSON_FILES.userConfigs),
        notifications: fs.existsSync(JSON_FILES.notifications)
    };

    console.log('  users.json:', checks.users ? '✓' : '✗');
    console.log('  config.json:', checks.systemConfig ? '✓' : '✗');
    console.log('  user-configs/:', checks.userConfigs ? '✓' : '✗');
    console.log('  notifications/:', checks.notifications ? '✓' : '✗');

    return checks;
}

/**
 * Migrate users and sessions
 */
function migrateUsers() {
    console.log('\n[MIGRATE] Users and sessions...');

    const usersData = readJSONFile(JSON_FILES.users);
    if (!usersData) {
        console.log('  No users.json found, skipping');
        return { users: 0, sessions: 0 };
    }

    const { users = [], sessions = [] } = usersData;

    if (isDryRun) {
        console.log(`  Would migrate ${users.length} users`);
        console.log(`  Would migrate ${sessions.length} sessions`);
        return { users: users.length, sessions: sessions.length };
    }

    // Migration implementation will be completed in Session 3
    console.log('  [TODO] Migrate users to SQLite');
    console.log('  [TODO] Migrate sessions to SQLite');

    return { users: 0, sessions: 0 };
}

/**
 * Migrate user configurations
 */
function migrateUserConfigs() {
    console.log('\n[MIGRATE] User configurations...');

    if (!fs.existsSync(JSON_FILES.userConfigs)) {
        console.log('  No user-configs directory found, skipping');
        return 0;
    }

    const configFiles = fs.readdirSync(JSON_FILES.userConfigs)
        .filter(f => f.endsWith('.json'));

    if (isDryRun) {
        console.log(`  Would migrate ${configFiles.length} user configs`);
        return configFiles.length;
    }

    // Migration implementation will be completed in Session 3
    console.log('  [TODO] Migrate user configs to SQLite');

    return 0;
}

/**
 * Migrate system configuration
 */
function migrateSystemConfig() {
    console.log('\n[MIGRATE] System configuration...');

    const configData = readJSONFile(JSON_FILES.systemConfig);
    if (!configData) {
        console.log('  No config.json found, using defaults');
        return 0;
    }

    if (isDryRun) {
        const keys = Object.keys(configData);
        console.log(`  Would migrate ${keys.length} config keys`);
        return keys.length;
    }

    // Migration implementation will be completed in Session 3
    console.log('  [TODO] Migrate system config to SQLite');

    return 0;
}

/**
 * Migrate notifications
 */
function migrateNotifications() {
    console.log('\n[MIGRATE] Notifications...');

    if (!fs.existsSync(JSON_FILES.notifications)) {
        console.log('  No notifications directory found, skipping');
        return 0;
    }

    const notifFiles = fs.readdirSync(JSON_FILES.notifications)
        .filter(f => f.endsWith('.json'));

    let totalNotifications = 0;
    notifFiles.forEach(file => {
        const data = readJSONFile(path.join(JSON_FILES.notifications, file));
        if (data && Array.isArray(data)) {
            totalNotifications += data.length;
        }
    });

    if (isDryRun) {
        console.log(`  Would migrate ${totalNotifications} notifications from ${notifFiles.length} users`);
        return totalNotifications;
    }

    // Migration implementation will be completed in Session 3
    console.log('  [TODO] Migrate notifications to SQLite');

    return 0;
}

/**
 * Verify migrated data integrity
 */
function verifyMigration(stats) {
    console.log('\n[VERIFY] Data integrity...');

    // Verification implementation will be completed in Session 3
    console.log('  [TODO] Verify user count matches');
    console.log('  [TODO] Verify config integrity');
    console.log('  [TODO] Verify notification count');

    return true;
}

/**
 * Create JSON backups before migration
 */
function createBackups() {
    console.log('\n[BACKUP] Creating JSON backups...');

    const backupDir = path.join(DATA_DIR, 'json-backup-' + Date.now());

    if (isDryRun) {
        console.log(`  Would create backup at: ${backupDir}`);
        return backupDir;
    }

    fs.mkdirSync(backupDir, { recursive: true });

    // Copy JSON files to backup
    if (fs.existsSync(JSON_FILES.users)) {
        fs.copyFileSync(JSON_FILES.users, path.join(backupDir, 'users.json'));
    }
    if (fs.existsSync(JSON_FILES.systemConfig)) {
        fs.copyFileSync(JSON_FILES.systemConfig, path.join(backupDir, 'config.json'));
    }

    console.log(`  ✓ Backup created: ${backupDir}`);
    return backupDir;
}

/**
 * Main migration function
 */
async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Framerr JSON → SQLite Migration');
    console.log('═══════════════════════════════════════════════════');

    if (isDryRun) {
        console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
    }

    // Step 1: Validate source data
    const checks = validateSourceData();

    // Step 2: Initialize schema if needed
    if (!isInitialized()) {
        console.log('\n[SCHEMA] Initializing database schema...');
        if (!isDryRun) {
            initializeSchema();
            console.log('  ✓ Schema initialized');
        } else {
            console.log('  Would initialize schema');
        }
    } else {
        console.log('\n[SCHEMA] Database already initialized');
    }

    // Step 3: Create backups (unless dry run)
    const backupDir = createBackups();

    // Step 4: Migrate data
    const stats = {
        users: 0,
        sessions: 0,
        configs: 0,
        notifications: 0,
        systemConfig: 0
    };

    const userStats = migrateUsers();
    stats.users = userStats.users;
    stats.sessions = userStats.sessions;

    stats.configs = migrateUserConfigs();
    stats.systemConfig = migrateSystemConfig();
    stats.notifications = migrateNotifications();

    // Step 5: Verify migration
    if (!isDryRun) {
        verifyMigration(stats);
    }

    // Step 6: Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Migration Summary');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Users:         ${stats.users}`);
    console.log(`  Sessions:      ${stats.sessions}`);
    console.log(`  User Configs:  ${stats.configs}`);
    console.log(`  System Config: ${stats.systemConfig}`);
    console.log(`  Notifications: ${stats.notifications}`);

    if (!isDryRun) {
        console.log(`\n  Backup: ${backupDir}`);
        console.log('\n✓ Migration complete!');
    } else {
        console.log('\n✓ Dry run complete - use without --dry-run to migrate');
    }
}

// Run migration
if (require.main === module) {
    main().catch(error => {
        console.error('\n[FATAL] Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { main };
