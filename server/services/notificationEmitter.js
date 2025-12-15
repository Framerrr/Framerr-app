/**
 * Notification Event Emitter
 * 
 * Singleton event emitter for broadcasting notification events to SSE connections.
 * Used to push real-time notifications to connected clients.
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class NotificationEmitter extends EventEmitter {
    constructor() {
        super();
        // Store active SSE connections by userId
        this.connections = new Map();
        logger.info('[SSE] NotificationEmitter initialized');
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
     * Send a notification to a specific user's SSE connections
     * @param {string} userId - User ID
     * @param {object} notification - Notification object
     */
    sendNotification(userId, notification) {
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
        }
    }

    /**
     * Broadcast a notification to all connected users
     * @param {object} notification - Notification object
     */
    broadcast(notification) {
        this.connections.forEach((connections, userId) => {
            this.sendNotification(userId, notification);
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
