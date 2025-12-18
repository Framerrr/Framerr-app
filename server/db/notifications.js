const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Create a notification
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} Created notification
 */
async function createNotification(notificationData) {
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

    try {
        const insert = db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        `);

        insert.run(
            notification.id,
            notification.userId,
            notification.title,
            notification.message,
            notification.type,
            notification.read ? 1 : 0
        );

        logger.debug('Notification created', { id: notification.id, userId: notification.userId, type: notification.type });

        return notification;
    } catch (error) {
        logger.error('Failed to create notification', { error: error.message });
        throw error;
    }
}

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters { unread, limit, offset }
 * @returns {Promise<object>} Notifications and counts
 */
async function getNotifications(userId, filters = {}) {
    try {
        const offset = parseInt(filters.offset) || 0;
        const limit = parseInt(filters.limit) || 50;

        // Build query with optional unread filter
        let query = 'SELECT * FROM notifications WHERE user_id = ?';
        const params = [userId];

        if (filters.unread === true) {
            query += ' AND read = 0';
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        // Get paginated notifications
        const notifications = db.prepare(query).all(...params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?';
        const countParams = [userId];

        if (filters.unread === true) {
            countQuery += ' AND read = 0';
        }

        const totalResult = db.prepare(countQuery).get(...countParams);
        const total = totalResult.count;

        // Get unread count
        const unreadResult = db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
        ).get(userId);
        const unreadCount = unreadResult.count;

        // Convert SQLite timestamps (unix seconds) to ISO strings
        const formattedNotifications = notifications.map(n => ({
            id: n.id,
            userId: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            read: n.read === 1,
            metadata: null, // Legacy field, not stored in SQLite
            createdAt: new Date(n.created_at * 1000).toISOString(),
            expiresAt: null // Legacy field, not stored in SQLite
        }));

        return {
            notifications: formattedNotifications,
            unreadCount,
            total
        };
    } catch (error) {
        logger.error('Failed to get notifications', { error: error.message, userId });
        throw error;
    }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<object|null>} Updated notification or null
 */
async function markAsRead(notificationId, userId) {
    try {
        const update = db.prepare(`
            UPDATE notifications
            SET read = 1
            WHERE id = ? AND user_id = ?
        `);

        const result = update.run(notificationId, userId);

        if (result.changes === 0) {
            return null; // Notification not found or not owned by user
        }

        // Fetch the updated notification
        const notification = db.prepare(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
        ).get(notificationId, userId);

        logger.debug('Notification marked as read', { id: notificationId, userId });

        return {
            id: notification.id,
            userId: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            read: notification.read === 1,
            metadata: null,
            createdAt: new Date(notification.created_at * 1000).toISOString(),
            expiresAt: null
        };
    } catch (error) {
        logger.error('Failed to mark notification as read', { error: error.message, notificationId, userId });
        throw error;
    }
}

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<boolean>} Success status
 */
async function deleteNotification(notificationId, userId) {
    try {
        const deleteStmt = db.prepare(`
            DELETE FROM notifications
            WHERE id = ? AND user_id = ?
        `);

        const result = deleteStmt.run(notificationId, userId);

        if (result.changes === 0) {
            return false; // Notification not found
        }

        logger.debug('Notification deleted', { id: notificationId, userId });
        return true;
    } catch (error) {
        logger.error('Failed to delete notification', { error: error.message, notificationId, userId });
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications updated
 */
async function markAllAsRead(userId) {
    try {
        const update = db.prepare(`
            UPDATE notifications
            SET read = 1
            WHERE user_id = ? AND read = 0
        `);

        const result = update.run(userId);
        const updatedCount = result.changes;

        if (updatedCount > 0) {
            logger.info('All notifications marked as read', { userId, count: updatedCount });
        }

        return updatedCount;
    } catch (error) {
        logger.error('Failed to mark all notifications as read', { error: error.message, userId });
        throw error;
    }
}

/**
 * Clear all notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications deleted
 */
async function clearAll(userId) {
    try {
        const deleteStmt = db.prepare(`
            DELETE FROM notifications
            WHERE user_id = ?
        `);

        const result = deleteStmt.run(userId);
        const deletedCount = result.changes;

        if (deletedCount > 0) {
            logger.info('All notifications cleared', { userId, count: deletedCount });
        }

        return deletedCount;
    } catch (error) {
        logger.error('Failed to clear all notifications', { error: error.message, userId });
        throw error;
    }
}

/**
 * Clean up expired notifications
 * Run periodically to remove old notifications
 * NOTE: Expiration feature not implemented in SQLite schema yet
 * This function is kept for API compatibility but does nothing
 */
async function cleanupExpiredNotifications() {
    // Legacy function - expiration not stored in current SQLite schema
    // Kept for API compatibility with existing code
    logger.debug('cleanupExpiredNotifications called (no-op in SQLite implementation)');
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

