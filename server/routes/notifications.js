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

// =============================================================================
// WEB PUSH NOTIFICATION ENDPOINTS
// =============================================================================

const {
    createSubscription,
    getSubscriptionsByUser,
    deleteSubscriptionById
} = require('../db/pushSubscriptions');

/**
 * GET /api/notifications/push/vapid-key
 * Get the VAPID public key for push subscription
 */
router.get('/push/vapid-key', requireAuth, async (req, res) => {
    try {
        const publicKey = await notificationEmitter.getVapidPublicKey();

        if (!publicKey) {
            return res.status(500).json({ error: 'Web Push not configured' });
        }

        res.json({ publicKey });
    } catch (error) {
        logger.error('Failed to get VAPID key', { error: error.message });
        res.status(500).json({ error: 'Failed to get VAPID key' });
    }
});

/**
 * POST /api/notifications/push/subscribe
 * Subscribe to push notifications
 */
router.post('/push/subscribe', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { subscription, deviceName } = req.body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({
                error: 'Invalid subscription. Required: endpoint and keys'
            });
        }

        if (!subscription.keys.p256dh || !subscription.keys.auth) {
            return res.status(400).json({
                error: 'Invalid subscription keys. Required: p256dh and auth'
            });
        }

        const result = createSubscription(userId, subscription, deviceName || null);

        logger.info('[WebPush] Subscription created', {
            userId,
            subscriptionId: result.id,
            deviceName
        });

        res.status(201).json({
            success: true,
            subscription: {
                id: result.id,
                deviceName: result.device_name,
                createdAt: result.created_at
            }
        });
    } catch (error) {
        logger.error('Failed to create push subscription', { error: error.message });
        res.status(500).json({ error: 'Failed to create push subscription' });
    }
});

/**
 * GET /api/notifications/push/subscriptions
 * Get all push subscriptions for the current user
 */
router.get('/push/subscriptions', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriptions = getSubscriptionsByUser(userId);

        // Map to client-friendly format (don't expose keys)
        const result = subscriptions.map(sub => ({
            id: sub.id,
            deviceName: sub.device_name,
            lastUsed: sub.last_used,
            createdAt: sub.created_at
        }));

        res.json({ subscriptions: result });
    } catch (error) {
        logger.error('Failed to get push subscriptions', { error: error.message });
        res.status(500).json({ error: 'Failed to get push subscriptions' });
    }
});

/**
 * DELETE /api/notifications/push/subscriptions/:id
 * Remove a push subscription
 */
router.delete('/push/subscriptions/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriptionId = req.params.id;

        const deleted = deleteSubscriptionById(subscriptionId, userId);

        if (!deleted) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        logger.info('[WebPush] Subscription deleted', { userId, subscriptionId });

        res.status(204).send();
    } catch (error) {
        logger.error('Failed to delete push subscription', { error: error.message });
        res.status(500).json({ error: 'Failed to delete push subscription' });
    }
});

/**
 * POST /api/notifications/push/test
 * Send a test push notification to the current user
 * Forces Web Push even if SSE is connected
 */
router.post('/push/test', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user has any subscriptions
        const subscriptions = getSubscriptionsByUser(userId);
        if (subscriptions.length === 0) {
            return res.status(400).json({
                error: 'No push subscriptions found. Enable push notifications first.'
            });
        }

        // Create a test notification
        const testNotification = {
            id: 'test-' + Date.now(),
            title: 'Test Push Notification',
            message: 'Web Push is working! 🎉',
            type: 'info',
            userId
        };

        // Force Web Push (bypass SSE check)
        await notificationEmitter.sendNotification(userId, testNotification, { forceWebPush: true });

        logger.info('[WebPush] Test notification sent', { userId });

        res.json({ success: true, message: 'Test notification sent' });
    } catch (error) {
        logger.error('Failed to send test push', { error: error.message });
        res.status(500).json({ error: 'Failed to send test push notification' });
    }
});

module.exports = router;

