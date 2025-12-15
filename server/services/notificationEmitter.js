/**
 * Notification Event Emitter
 * 
 * Handles real-time notification delivery via SSE (Server-Sent Events)
 * and Web Push notifications. Implements selective routing:
 * - If user has SSE connection → send SSE only (tab is open)
 * - If no SSE connection → send Web Push to subscribed devices
 */

const EventEmitter = require('events');
const webpush = require('web-push');
const logger = require('../utils/logger');

// Lazy-load to avoid circular dependencies
let pushSubscriptionsDb = null;
let systemConfigDb = null;

function getPushSubscriptionsDb() {
    if (!pushSubscriptionsDb) {
        pushSubscriptionsDb = require('../db/pushSubscriptions');
    }
    return pushSubscriptionsDb;
}

function getSystemConfigDb() {
    if (!systemConfigDb) {
        systemConfigDb = require('../db/systemConfig');
    }
    return systemConfigDb;
}

class NotificationEmitter extends EventEmitter {
    constructor() {
        super();
        // Store active SSE connections by userId
        this.connections = new Map();
        // VAPID keys initialized flag
        this.vapidInitialized = false;
        logger.info('[NotificationEmitter] Initialized');
    }

    /**
     * Initialize VAPID keys for Web Push
     * Called lazily on first push attempt
     */
    async initializeVapid() {
        if (this.vapidInitialized) return;

        try {
            const { getSystemConfig, updateSystemConfig } = getSystemConfigDb();
            const config = await getSystemConfig();

            // Check if VAPID keys exist
            if (config.vapidKeys?.publicKey && config.vapidKeys?.privateKey) {
                webpush.setVapidDetails(
                    'mailto:admin@framerr.local',
                    config.vapidKeys.publicKey,
                    config.vapidKeys.privateKey
                );
                this.vapidInitialized = true;
                logger.info('[WebPush] VAPID keys loaded from config');
                return;
            }

            // Generate new VAPID keys
            const vapidKeys = webpush.generateVAPIDKeys();
            await updateSystemConfig({
                vapidKeys: {
                    publicKey: vapidKeys.publicKey,
                    privateKey: vapidKeys.privateKey
                }
            });

            webpush.setVapidDetails(
                'mailto:admin@framerr.local',
                vapidKeys.publicKey,
                vapidKeys.privateKey
            );

            this.vapidInitialized = true;
            logger.info('[WebPush] Generated new VAPID keys');
        } catch (error) {
            logger.error('[WebPush] Failed to initialize VAPID', { error: error.message });
        }
    }

    /**
     * Get VAPID public key for frontend
     * @returns {string|null} Public VAPID key
     */
    async getVapidPublicKey() {
        await this.initializeVapid();
        try {
            const { getSystemConfig } = getSystemConfigDb();
            const config = await getSystemConfig();
            return config.vapidKeys?.publicKey || null;
        } catch (error) {
            logger.error('[WebPush] Failed to get VAPID public key', { error: error.message });
            return null;
        }
    }

    /**
     * Add a new SSE connection for a user
     * @param {string} userId - User ID
     * @param {object} res - Express response object
     */
    addConnection(userId, res) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        this.connections.get(userId).add(res);
        logger.debug('[SSE] Connection added', { userId, activeConnections: this.connections.get(userId).size });
    }

    /**
     * Remove an SSE connection for a user
     * @param {string} userId - User ID
     * @param {object} res - Express response object
     */
    removeConnection(userId, res) {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            userConnections.delete(res);
            if (userConnections.size === 0) {
                this.connections.delete(userId);
            }
            logger.debug('[SSE] Connection removed', { userId, remainingConnections: userConnections?.size || 0 });
        }
    }

    /**
     * Check if user has active SSE connection
     * @param {string} userId - User ID
     * @returns {boolean} True if user has SSE connection
     */
    hasConnection(userId) {
        const userConnections = this.connections.get(userId);
        return userConnections && userConnections.size > 0;
    }

    /**
     * Send notification via SSE to a specific user
     * @param {string} userId - User ID
     * @param {object} notification - Notification object
     */
    sendSSE(userId, notification) {
        const userConnections = this.connections.get(userId);
        if (userConnections && userConnections.size > 0) {
            const eventData = `data: ${JSON.stringify(notification)}\n\n`;
            userConnections.forEach(res => {
                try {
                    res.write(eventData);
                } catch (error) {
                    logger.error('[SSE] Failed to send notification', { userId, error: error.message });
                    this.removeConnection(userId, res);
                }
            });
            logger.debug('[SSE] Notification sent', { userId, connections: userConnections.size });
            return true;
        }
        return false;
    }

    /**
     * Send Web Push notification to a user's subscribed devices
     * @param {string} userId - User ID
     * @param {object} notification - Notification object
     */
    async sendWebPush(userId, notification) {
        await this.initializeVapid();

        if (!this.vapidInitialized) {
            logger.warn('[WebPush] VAPID not initialized, skipping push');
            return;
        }

        try {
            const { getSubscriptionsByUser, deleteSubscriptionByEndpoint, updateLastUsed } = getPushSubscriptionsDb();
            const subscriptions = getSubscriptionsByUser(userId);

            if (subscriptions.length === 0) {
                logger.debug('[WebPush] No subscriptions for user', { userId });
                return;
            }

            const payload = JSON.stringify({
                title: notification.title,
                body: notification.message,
                type: notification.type,
                id: notification.id,
                timestamp: Date.now()
            });

            const pushPromises = subscriptions.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };

                try {
                    await webpush.sendNotification(pushSubscription, payload);
                    updateLastUsed(sub.endpoint);
                    logger.debug('[WebPush] Notification sent', { userId, endpoint: sub.endpoint.slice(-20) });
                } catch (pushError) {
                    // Handle expired/invalid subscriptions
                    if (pushError.statusCode === 404 || pushError.statusCode === 410) {
                        logger.info('[WebPush] Subscription expired, removing', { endpoint: sub.endpoint.slice(-20) });
                        deleteSubscriptionByEndpoint(sub.endpoint);
                    } else {
                        logger.error('[WebPush] Failed to send', {
                            userId,
                            statusCode: pushError.statusCode,
                            error: pushError.message
                        });
                    }
                }
            });

            await Promise.allSettled(pushPromises);
        } catch (error) {
            logger.error('[WebPush] Error sending push notifications', { error: error.message, userId });
        }
    }

    /**
     * Send a notification to a specific user
     * Uses selective routing: SSE if connected, Web Push if not
     * @param {string} userId - User ID
     * @param {object} notification - Notification object
     * @param {object} options - Options { forceWebPush: boolean }
     */
    async sendNotification(userId, notification, options = {}) {
        const { forceWebPush = false } = options;

        // If forcing Web Push (for testing), send push regardless of SSE
        if (forceWebPush) {
            await this.sendWebPush(userId, notification);
            return;
        }

        // Check for SSE connection first
        if (this.hasConnection(userId)) {
            // User has tab open - send SSE only
            this.sendSSE(userId, notification);
        } else {
            // No SSE connection - send Web Push
            await this.sendWebPush(userId, notification);
        }
    }

    /**
     * Broadcast a notification to all connected users
     * @param {object} notification - Notification object
     */
    broadcast(notification) {
        this.connections.forEach((connections, userId) => {
            this.sendSSE(userId, notification);
        });
    }

    /**
     * Get count of active connections
     * @returns {number} Total number of active connections
     */
    getConnectionCount() {
        let count = 0;
        this.connections.forEach(connections => {
            count += connections.size;
        });
        return count;
    }
}

// Singleton instance
const notificationEmitter = new NotificationEmitter();

module.exports = notificationEmitter;

