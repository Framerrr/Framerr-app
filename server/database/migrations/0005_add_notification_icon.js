/**
 * Migration: Add icon_id column to notifications table
 * 
 * Allows notifications to reference a custom icon (system or user-uploaded)
 * for display in the notification UI.
 */

module.exports = {
    version: 5,
    description: 'Add icon_id column to notifications table',

    up: async (db) => {
        // Check if column already exists
        const tableInfo = db.pragma('table_info(notifications)');
        const hasIconId = tableInfo.some(col => col.name === 'icon_id');

        if (!hasIconId) {
            db.exec(`
                ALTER TABLE notifications 
                ADD COLUMN icon_id TEXT DEFAULT NULL
            `);
            console.log('[Migration 0005] Added icon_id column to notifications');
        }
    }
};
