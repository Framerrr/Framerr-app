const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Use DATA_DIR from environment or default to server/data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const ICONS_DIR = path.join(DATA_DIR, 'upload/custom-icons');

/**
 * Add a custom icon
 * @param {object} iconData - Icon data (filename, originalName, mimeType, filePath, uploadedBy)
 * @returns {Promise<object>} Created icon record
 */
async function addIcon(iconData) {
    const icon = {
        id: uuidv4(),
        name: iconData.originalName || iconData.filename || iconData.name,
        filePath: iconData.filePath || iconData.filename, // Relative path/filename
        mimeType: iconData.mimeType,
        uploadedBy: iconData.uploadedBy,
        uploadedAt: new Date().toISOString()
    };

    try {
        const insert = db.prepare(`
            INSERT INTO custom_icons (id, name, file_path, mime_type, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        `);

        insert.run(
            icon.id,
            icon.name,
            icon.filePath,
            icon.mimeType,
            icon.uploadedBy
        );

        logger.info(`Custom icon added: ${icon.name} by user ${icon.uploadedBy}`);

        // Return object with legacy field names for compatibility
        return {
            id: icon.id,
            filename: icon.filePath, // File path stored as filename
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
            filename: icon.file_path,
            originalName: icon.name,
            mimeType: icon.mime_type,
            filePath: icon.file_path, // Include file path
            uploadedBy: icon.uploaded_by,
<<<<<<< HEAD
=======
            isSystem: icon.is_system === 1,
>>>>>>> develop
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
<<<<<<< HEAD
        const icons = db.prepare('SELECT id, name, file_path, mime_type, uploaded_by, uploaded_at FROM custom_icons').all();
=======
        const icons = db.prepare('SELECT id, name, file_path, mime_type, uploaded_by, is_system, uploaded_at FROM custom_icons').all();
>>>>>>> develop

        // Return with legacy field names for compatibility (without file paths to reduce payload)
        return icons.map(icon => ({
            id: icon.id,
            filename: icon.file_path,
            originalName: icon.name,
            mimeType: icon.mime_type,
            uploadedBy: icon.uploaded_by,
<<<<<<< HEAD
=======
            isSystem: icon.is_system === 1,
>>>>>>> develop
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
<<<<<<< HEAD
        // First get the icon to return it and delete the file
=======
        // First get the icon to check if it's a system icon and to return it
>>>>>>> develop
        const icon = db.prepare('SELECT * FROM custom_icons WHERE id = ?').get(iconId);

        if (!icon) {
            return null;
        }

<<<<<<< HEAD
=======
        // Prevent deletion of system icons
        if (icon.is_system === 1) {
            const error = new Error('System icons cannot be deleted');
            error.isSystemIcon = true;
            throw error;
        }

>>>>>>> develop
        // Delete physical file from disk
        const filePath = path.join(ICONS_DIR, icon.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`Deleted icon file: ${filePath}`);
        }

        // Delete from database
        const deleteStmt = db.prepare('DELETE FROM custom_icons WHERE id = ?');
        deleteStmt.run(iconId);

        logger.info(`Custom icon deleted: ${icon.name}`);

        // Return with legacy field names for compatibility
        return {
            id: icon.id,
            filename: icon.file_path,
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
 * Get absolute file path for serving icon
 * @param {string} iconIdOrFilename - Icon ID or filename (for legacy compatibility)
 * @returns {Promise<string|null>} Absolute file path or null if not found
 */
async function getIconPath(iconIdOrFilename) {
    try {
        // Try to find by ID first, then by file_path (filename)
        let icon = db.prepare('SELECT file_path FROM custom_icons WHERE id = ?').get(iconIdOrFilename);

        if (!icon) {
            icon = db.prepare('SELECT file_path FROM custom_icons WHERE file_path = ?').get(iconIdOrFilename);
        }

        if (!icon) {
            return null;
        }

        // Return absolute path to file
        return path.join(ICONS_DIR, icon.file_path);
    } catch (error) {
        logger.error('Failed to get icon path', { error: error.message, iconIdOrFilename });
        throw error;
    }
}

<<<<<<< HEAD
=======
/**
 * Add a system icon (used during seeding)
 * @param {object} iconData - Icon data (id, name, filePath, mimeType)
 * @returns {Promise<object>} Created icon record
 */
async function addSystemIcon(iconData) {
    try {
        // Check if icon already exists
        const existing = db.prepare('SELECT id FROM custom_icons WHERE id = ?').get(iconData.id);
        if (existing) {
            logger.debug(`System icon already exists: ${iconData.name}`);
            return null;
        }

        const insert = db.prepare(`
            INSERT INTO custom_icons (id, name, file_path, mime_type, uploaded_by, is_system, uploaded_at)
            VALUES (?, ?, ?, ?, NULL, 1, strftime('%s', 'now'))
        `);

        insert.run(
            iconData.id,
            iconData.name,
            iconData.filePath,
            iconData.mimeType
        );

        logger.info(`System icon added: ${iconData.name}`);

        return {
            id: iconData.id,
            filename: iconData.filePath,
            originalName: iconData.name,
            mimeType: iconData.mimeType,
            isSystem: true
        };
    } catch (error) {
        logger.error('Failed to add system icon', { error: error.message });
        throw error;
    }
}

/**
 * Check if an icon is a system icon
 * @param {string} iconId - Icon ID
 * @returns {Promise<boolean>} True if system icon
 */
async function isSystemIcon(iconId) {
    try {
        const icon = db.prepare('SELECT is_system FROM custom_icons WHERE id = ?').get(iconId);
        return icon?.is_system === 1;
    } catch (error) {
        logger.error('Failed to check if system icon', { error: error.message, iconId });
        return false;
    }
}

/**
 * Get system icon by name (e.g., 'overseerr', 'radarr', 'sonarr')
 * @param {string} name - Icon name
 * @returns {Promise<object|null>} Icon object or null
 */
async function getSystemIconByName(name) {
    try {
        const icon = db.prepare('SELECT * FROM custom_icons WHERE name = ? AND is_system = 1').get(name);
        if (!icon) return null;

        return {
            id: icon.id,
            filename: icon.file_path,
            originalName: icon.name,
            mimeType: icon.mime_type,
            isSystem: true
        };
    } catch (error) {
        logger.error('Failed to get system icon by name', { error: error.message, name });
        return null;
    }
}

>>>>>>> develop
// Export ICONS_DIR for compatibility
module.exports = {
    addIcon,
    getIconById,
    listIcons,
    deleteIcon,
    getIconPath,
    addSystemIcon,
    isSystemIcon,
    getSystemIconByName,
    ICONS_DIR
};

