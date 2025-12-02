const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const CUSTOM_ICONS_DB_PATH = path.join(DATA_DIR, 'custom-icons.json');
const ICONS_DIR = path.join(DATA_DIR, 'upload/custom-icons'); // Consolidated under /config/upload/

/**
 * Initialize custom icons database and directory
 */
async function initCustomIconsDB() {
    try {
        await fs.access(CUSTOM_ICONS_DB_PATH);
    } catch {
        logger.info('Initializing custom icons database...');
        try {
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.mkdir(ICONS_DIR, { recursive: true });
            await fs.writeFile(CUSTOM_ICONS_DB_PATH, JSON.stringify({ icons: [] }, null, 2));
            logger.info('Custom icons database created at ' + CUSTOM_ICONS_DB_PATH);
        } catch (error) {
            logger.error('Failed to initialize custom icons database', { error: error.message });
            throw error;
        }
    }
}

/**
 * Read custom icons database
 * @returns {Promise<object>} Database content
 */
async function readDB() {
    await initCustomIconsDB();
    try {
        const data = await fs.readFile(CUSTOM_ICONS_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to read custom icons database', { error: error.message });
        throw error;
    }
}

/**
 * Write to custom icons database
 * @param {object} db - Database content
 */
async function writeDB(db) {
    try {
        await fs.writeFile(CUSTOM_ICONS_DB_PATH, JSON.stringify(db, null, 2));
    } catch (error) {
        logger.error('Failed to write custom icons database', { error: error.message });
        throw error;
    }
}

/**
 * Add a custom icon
 * @param {object} iconData - Icon data (filename, originalName, mimeType, uploadedBy)
 * @returns {Promise<object>} Created icon record
 */
async function addIcon(iconData) {
    const db = await readDB();

    const icon = {
        id: uuidv4(),
        filename: iconData.filename,
        originalName: iconData.originalName,
        mimeType: iconData.mimeType,
        uploadedBy: iconData.uploadedBy,
        uploadedAt: new Date().toISOString()
    };

    db.icons.push(icon);
    await writeDB(db);

    logger.info(`Custom icon added: ${icon.filename} by user ${icon.uploadedBy}`);
    return icon;
}

/**
 * Get icon by ID
 * @param {string} iconId - Icon ID
 * @returns {Promise<object|null>} Icon object or null
 */
async function getIconById(iconId) {
    const db = await readDB();
    return db.icons.find(i => i.id === iconId) || null;
}

/**
 * List all custom icons
 * @returns {Promise<array>} Array of icons
 */
async function listIcons() {
    const db = await readDB();
    return db.icons;
}

/**
 * Delete an icon
 * @param {string} iconId - Icon ID
 * @returns {Promise<object|null>} Deleted icon or null
 */
async function deleteIcon(iconId) {
    const db = await readDB();
    const icon = db.icons.find(i => i.id === iconId);

    if (!icon) return null;

    // Delete the physical file
    const filePath = path.join(ICONS_DIR, icon.filename);
    try {
        await fs.unlink(filePath);
        logger.info(`Deleted icon file: ${icon.filename}`);
    } catch (error) {
        logger.warn(`Failed to delete icon file: ${icon.filename}`, { error: error.message });
    }

    // Remove from database
    db.icons = db.icons.filter(i => i.id !== iconId);
    await writeDB(db);

    logger.info(`Custom icon deleted: ${icon.filename}`);
    return icon;
}

/**
 * Get icon file path
 * @param {string} filename - Icon filename
 * @returns {string} Full path to icon file
 */
function getIconPath(filename) {
    return path.join(ICONS_DIR, filename);
}

module.exports = {
    addIcon,
    getIconById,
    listIcons,
    deleteIcon,
    getIconPath,
    ICONS_DIR
};
