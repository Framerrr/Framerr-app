/**
 * Migration: Add is_system column to custom_icons
 * Version: 4
 * 
 * Adds is_system flag to distinguish system-provided icons from user uploads.
 * System icons cannot be deleted via the API.
 */

module.exports = {
    version: 4,
    name: 'add_system_icons_column',
    up(db) {
        db.exec(`
            ALTER TABLE custom_icons ADD COLUMN is_system INTEGER DEFAULT 0;
        `);
    }
};
