/**
 * Migration 0001: Initial Schema
 * 
 * This is the baseline migration representing the initial SQLite schema.
 * It's a no-op when run, just records that version 1 is the starting point.
 * 
 * The actual schema is created by schema.sql
 */

module.exports = {
    version: 1,
    name: 'initial_schema',

    /**
     * Up migration - nothing to do, schema.sql handles initial setup
     */
    up(db) {
        // No-op: Initial schema is created by schema.sql
        // This migration just marks version 1 as the baseline
        console.log('[Migration 0001] Initial schema baseline recorded');
    },

    /**
     * Down migration - not supported for initial schema
     */
    down(db) {
        throw new Error('Cannot rollback initial schema - restore from backup instead');
    }
};
