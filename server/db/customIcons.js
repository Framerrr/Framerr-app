const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Add a custom icon
 * @param {object} iconData - Icon data (name, data as base64, mimeType, uploadedBy)
 * @returns {Promise<object>} Created icon record
 */
async function addIcon(iconData) {
    const icon = {
        id: uuidv4(),
        name: iconData.originalName || iconData.filename || iconData.name,
        data: iconData.data, // Base64 encoded image data
        mimeType: iconData.mimeType,
        uploadedBy: iconData.uploadedBy,
        uploadedAt: new Date().toISOString()
    };

    try {
        const insert = db.prepare(`
            INSERT INTO custom_icons (id, name, data, mime_type, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        `);

        insert.run(
            icon.id,
            icon.name,
            icon.data,
            icon.mimeType,
            icon.uploadedBy
        );

        logger.info(`Custom icon added: ${icon.name} by user ${icon.uploadedBy}`);

        // Return object with legacy field names for compatibility
        return {
            id: icon.id,
            filename: icon.name, // Legacy field name
            originalName: icon.name,
            mimeType: icon.mimeType,
            uploadedBy: icon.uploadedBy,
            uploadedAt: icon.uploadedAt
        };
    } catch (error) {
        logger.error('Failed to add custom icon', { error: error.message });
        throw error;
    }
}

/**
 * Get icon by ID
 * @param {string} iconId - Icon ID
 * @returns {Promise<object|null>} Icon object or null
 */
async function getIconById(iconId) {
    try {
        const icon = db.prepare('SELECT * FROM custom_icons WHERE id = ?').get(iconId);

        if (!icon) {
            return null;
        }

        // Return with legacy field names for compatibility
        return {
            id: icon.id,
            filename: icon.name,
            originalName: icon.name,
            mimeType: icon.mime_type,
            data: icon.data, // Include base64 data for serving
            uploadedBy: icon.uploaded_by,
            uploadedAt: new Date(icon.uploaded_at * 1000).toISOString()
        };
    } catch (error) {
        logger.error('Failed to get icon by ID', { error: error.message, iconId });
        throw error;
    }
}

/**
 * List all custom icons
 * @returns {Promise<array>} Array of icons
 */
async function listIcons() {
    try {
        const icons = db.prepare('SELECT id, name, mime_type, uploaded_by, uploaded_at FROM custom_icons').all();

        // Return with legacy field names for compatibility (without data to reduce payload)
        return icons.map(icon => ({
            id: icon.id,
            filename: icon.name,
            originalName: icon.name,
            mimeType: icon.mime_type,
            uploadedBy: icon.uploaded_by,
            uploadedAt: new Date(icon.uploaded_at * 1000).toISOString()
        }));
    } catch (error) {
        logger.error('Failed to list custom icons', { error: error.message });
        throw error;
    }
}

/**
 * Delete an icon
 * @param {string} iconId - Icon ID
 * @returns {Promise<object|null>} Deleted icon or null
 */
async function deleteIcon(iconId) {
    try {
        // First get the icon to return it
        const icon = db.prepare('SELECT * FROM custom_icons WHERE id = ?').get(iconId);

        if (!icon) {
            return null;
        }

        // Delete from database
        const deleteStmt = db.prepare('DELETE FROM custom_icons WHERE id = ?');
        deleteStmt.run(iconId);

        logger.info(`Custom icon deleted: ${icon.name}`);

        // Return with legacy field names for compatibility
        return {
            id: icon.id,
            filename: icon.name,
            originalName: icon.name,
            mimeType: icon.mime_type,
            uploadedBy: icon.uploaded_by,
            uploadedAt: new Date(icon.uploaded_at * 1000).toISOString()
        };
    } catch (error) {
        logger.error('Failed to delete custom icon', { error: error.message, iconId });
        throw error;
    }
}

/**
 * Get icon data URI (replaces getIconPath for SQLite)
 * @param {string} iconIdOrFilename - Icon ID or filename (for legacy compatibility)
 * @returns {Promise<string|null>} Data URI or null if not found
 */
async function getIconPath(iconIdOrFilename) {
    try {
        // Try to find by ID first, then by name (filename)
        let icon = db.prepare('SELECT data, mime_type FROM custom_icons WHERE id = ?').get(iconIdOrFilename);

        if (!icon) {
            icon = db.prepare('SELECT data, mime_type FROM custom_icons WHERE name = ?').get(iconIdOrFilename);
        }

        if (!icon) {
            return null;
        }

        // Return data URI for embedding in <img> tags
        return `data:${icon.mime_type};base64,${icon.data}`;
    } catch (error) {
        logger.error('Failed to get icon path', { error: error.message, iconIdOrFilename });
        throw error;
    }
}

// Export ICONS_DIR for legacy compatibility (but it's not used anymore)
const ICONS_DIR = '/virtual/icons'; // Virtual path since icons are now in database

module.exports = {
    addIcon,
    getIconById,
    listIcons,
    deleteIcon,
    getIconPath,
    ICONS_DIR
};

