const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const NOTIFICATIONS_DB_PATH = path.join(DATA_DIR, 'notifications.json');

/**
 * Initialize notifications database if it doesn't exist
 */
async function initNotificationsDB() {
    try {
        await fs.access(NOTIFICATIONS_DB_PATH);
    } catch {
        logger.info('Initializing notifications database...');
        try {
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.writeFile(NOTIFICATIONS_DB_PATH, JSON.stringify({ notifications: [] }, null, 2));
            logger.info('Notifications database created at ' + NOTIFICATIONS_DB_PATH);
        } catch (error) {
            logger.error('Failed to initialize notifications database', { error: error.message });
            throw error;
        }
    }
}

/**
 * Read notifications database
 * @returns {Promise<object>} Database content
 */
async function readDB() {
    await initNotificationsDB();
    try {
        const data = await fs.readFile(NOTIFICATIONS_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to read notifications database', { error: error.message });
        throw error;
    }
}

/**
 * Write to notifications database
 * @param {object} db - Database content
 */
async function writeDB(db) {
    try {
        await fs.writeFile(NOTIFICATIONS_DB_PATH, JSON.stringify(db, null, 2));
    } catch (error) {
        logger.error('Failed to write notifications database', { error: error.message });
        throw error;
    }
}

/**
 * Create a notification
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} Created notification
 */
async function createNotification(notificationData) {
    const db = await readDB();

    const notification = {
        id: uuidv4(),
        userId: notificationData.userId,
        type: notificationData.type || 'info', // success, error, warning, info
        title: notificationData.title,
        message: notificationData.message,
        read: false,
        metadata: notificationData.metadata || null,
        createdAt: new Date().toISOString(),
        expiresAt: notificationData.expiresAt || null
    };

    db.notifications.push(notification);
    await writeDB(db);

    logger.debug('Notification created', { id: notification.id, userId: notification.userId, type: notification.type });

    return notification;
}

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters { unread, limit, offset }
 * @returns {Promise<object>} Notifications and counts
 */
async function getNotifications(userId, filters = {}) {
    const db = await readDB();

    let userNotifications = db.notifications.filter(n => n.userId === userId);

    // Filter by read status
    if (filters.unread === true) {
        userNotifications = userNotifications.filter(n => !n.read);
    }

    // Sort by createdAt descending (newest first)
    userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Count unread
    const unreadCount = userNotifications.filter(n => !n.read).length;

    // Apply pagination
    const offset = parseInt(filters.offset) || 0;
    const limit = parseInt(filters.limit) || 50;
    const paginatedNotifications = userNotifications.slice(offset, offset + limit);

    return {
        notifications: paginatedNotifications,
        unreadCount,
        total: userNotifications.length
    };
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<object|null>} Updated notification or null
 */
async function markAsRead(notificationId, userId) {
    const db = await readDB();
    const notificationIndex = db.notifications.findIndex(
        n => n.id === notificationId && n.userId === userId
    );

    if (notificationIndex === -1) {
        return null;
    }

    db.notifications[notificationIndex].read = true;
    await writeDB(db);

    logger.debug('Notification marked as read', { id: notificationId, userId });

    return db.notifications[notificationIndex];
}

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<boolean>} Success status
 */
async function deleteNotification(notificationId, userId) {
    const db = await readDB();
    const initialLength = db.notifications.length;

    db.notifications = db.notifications.filter(
        n => !(n.id === notificationId && n.userId === userId)
    );

    if (db.notifications.length === initialLength) {
        return false; // Notification not found
    }

    await writeDB(db);
    logger.debug('Notification deleted', { id: notificationId, userId });

    return true;
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications updated
 */
async function markAllAsRead(userId) {
    const db = await readDB();
    let updatedCount = 0;

    db.notifications.forEach(notification => {
        if (notification.userId === userId && !notification.read) {
            notification.read = true;
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        await writeDB(db);
        logger.info('All notifications marked as read', { userId, count: updatedCount });
    }

    return updatedCount;
}

/**
 * Clear all notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications deleted
 */
async function clearAll(userId) {
    const db = await readDB();
    const initialLength = db.notifications.length;

    db.notifications = db.notifications.filter(n => n.userId !== userId);

    const deletedCount = initialLength - db.notifications.length;

    if (deletedCount > 0) {
        await writeDB(db);
        logger.info('All notifications cleared', { userId, count: deletedCount });
    }

    return deletedCount;
}

/**
 * Clean up expired notifications
 * Run periodically to remove old notifications
 */
async function cleanupExpiredNotifications() {
    const db = await readDB();
    const now = new Date();
    const initialCount = db.notifications.length;

    db.notifications = db.notifications.filter(n => {
        // Remove if expired
        if (n.expiresAt && new Date(n.expiresAt) < now) {
            return false;
        }
        return true;
    });

    if (db.notifications.length < initialCount) {
        await writeDB(db);
        logger.debug(`Cleaned up ${initialCount - db.notifications.length} expired notifications`);
    }
}

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
    cleanupExpiredNotifications
};
