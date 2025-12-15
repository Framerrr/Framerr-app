const express = require('express');
const router = express.Router();
const {
    createNotification,
    getNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll
} = require('../db/notifications');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const notificationEmitter = require('../services/notificationEmitter');

/**
 * GET /api/notifications/stream
 * SSE endpoint for real-time notifications
 */
router.get('/stream', requireAuth, (req, res) => {
    const userId = req.user.id;

    logger.info('[SSE] New connection', { userId, username: req.user.username });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

    // Register connection
    notificationEmitter.addConnection(userId, res);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    // Clean up on close
    req.on('close', () => {
        clearInterval(heartbeat);
        notificationEmitter.removeConnection(userId, res);
        logger.info('[SSE] Connection closed', { userId });
    });
});

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 * Query params: ?unread=true, ?limit=50, ?offset=0
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { unread, limit = 50, offset = 0 } = req.query;

        const filters = {
            unread: unread === 'true',
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const result = await getNotifications(userId, filters);

        res.json(result);

        logger.debug('Notifications fetched', {
            userId,
            count: result.notifications.length,
            unread: result.unreadCount
        });
    } catch (error) {
        logger.error('Failed to fetch notifications', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * POST /api/notifications
 * Create a new notification (system/admin only)
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const { type, title, message, userId, metadata, expiresAt } = req.body;

        // Validate required fields
        if (!type || !title || !message) {
            return res.status(400).json({
                error: 'Missing required fields: type, title, message'
            });
        }

        // Validate type
        if (!['success', 'error', 'warning', 'info'].includes(type)) {
            return res.status(400).json({
                error: 'Invalid type. Must be: success, error, warning, or info'
            });
        }

        // Use provided userId or default to current user
        const targetUserId = userId || req.user.id;

        const notification = await createNotification({
            userId: targetUserId,
            type,
            title,
            message,
            metadata: metadata || null,
            expiresAt: expiresAt || null
        });

        logger.info('Notification created', {
            id: notification.id,
            userId: targetUserId,
            type
        });

        res.status(201).json(notification);
    } catch (error) {
        logger.error('Failed to create notification', { error: error.message });
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
router.post('/mark-all-read', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const updatedCount = await markAllAsRead(userId);

        logger.info('All notifications marked as read', {
            userId,
            count: updatedCount
        });

        res.json({ updatedCount });
    } catch (error) {
        logger.error('Failed to mark all as read', { error: error.message });
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications for the authenticated user
 */
router.delete('/clear-all', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const deletedCount = await clearAll(userId);

        logger.info('All notifications cleared', {
            userId,
            count: deletedCount
        });

        res.json({ deletedCount });
    } catch (error) {
        logger.error('Failed to clear all notifications', { error: error.message });
        res.status(500).json({ error: 'Failed to clear all notifications' });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const notification = await markAsRead(notificationId, userId);

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        logger.debug('Notification marked as read', {
            id: notificationId,
            userId
        });

        res.json(notification);
    } catch (error) {
        logger.error('Failed to mark notification as read', { error: error.message });
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const deleted = await deleteNotification(notificationId, userId);

        if (!deleted) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        logger.debug('Notification deleted', { id: notificationId, userId });

        res.status(204).send();
    } catch (error) {
        logger.error('Failed to delete notification', { error: error.message });
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

module.exports = router;
