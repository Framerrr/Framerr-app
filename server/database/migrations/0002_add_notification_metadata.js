/**
 * Migration 0002: Add Notification Metadata Column
 * 
 * Example migration demonstrating how to add a new column.
 * Adds 'metadata' column to notifications table for storing
 * additional context (action buttons, links, etc.)
 */

module.exports = {
    version: 2,
    name: 'add_notification_metadata',

    /**
     * Up migration - add metadata column
     */
    up(db) {
        // Check if column already exists (idempotent)
        const tableInfo = db.prepare('PRAGMA table_info(notifications)').all();
        const hasColumn = tableInfo.some(col => col.name === 'metadata');

        if (!hasColumn) {
            db.exec(`ALTER TABLE notifications ADD COLUMN metadata TEXT`);
            console.log('[Migration 0002] Added metadata column to notifications');
        } else {
            console.log('[Migration 0002] metadata column already exists, skipping');
        }
    },

    /**
     * Down migration - SQLite limitation
     * SQLite doesn't support DROP COLUMN directly in older versions.
     * For safety, we don't attempt rollback - use backup instead.
     */
    down(db) {
        // SQLite 3.35.0+ supports DROP COLUMN, but we can't guarantee version
        // For safety, require backup restoration
        throw new Error('Rollback not supported - restore from backup to remove column');
    }
};
