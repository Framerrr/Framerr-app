/**
 * Migration 0003: Add Widget Default Settings
 * 
 * Example migration demonstrating how to update JSON columns.
 * Adds new default fields to existing widget configurations.
 * 
 * This pattern is used when:
 * - A new widget setting is added
 * - Existing users need the new default value
 * - New users get it from DEFAULT_USER_CONFIG
 */

const { addDefaultToJsonColumn } = require('../json-utils');

module.exports = {
    version: 3,
    name: 'add_widget_default_settings',

    /**
     * Up migration - add new defaults to user_preferences.dashboard_config
     */
    up(db) {
        // Example: Add 'refreshInterval' default to all dashboards
        // This ensures existing users get the new field with a sensible default

        const updated = addDefaultToJsonColumn(
            db,
            'user_preferences',
            'dashboard_config',
            'settings.refreshInterval',
            30000  // 30 seconds default
        );

        console.log(`[Migration 0003] Added refreshInterval to ${updated} user dashboards`);

        // Example: Add 'compactMode' to preferences
        const updated2 = addDefaultToJsonColumn(
            db,
            'user_preferences',
            'preferences',
            'ui.compactMode',
            false  // Off by default
        );

        console.log(`[Migration 0003] Added compactMode to ${updated2} user preferences`);
    },

    /**
     * Down migration - remove added fields
     * Note: This is optional, most JSON migrations are forward-only
     */
    down(db) {
        const { removeFromJsonColumn } = require('../json-utils');

        removeFromJsonColumn(db, 'user_preferences', 'dashboard_config', 'settings.refreshInterval');
        removeFromJsonColumn(db, 'user_preferences', 'preferences', 'ui.compactMode');

        console.log('[Migration 0003] Removed added fields');
    }
};
