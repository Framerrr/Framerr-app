/**
 * Push Subscriptions Database Module
 * 
 * Handles CRUD operations for Web Push notification subscriptions.
 * Each user can have multiple subscriptions (one per device/browser).
 */

const { db } = require('../database/db');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new push subscription for a user
 * @param {string} userId - User ID
 * @param {object} subscription - Push subscription object from browser
 * @param {string} subscription.endpoint - Push service endpoint URL
 * @param {object} subscription.keys - Encryption keys (p256dh and auth)
 * @param {string} deviceName - Human-readable device name
 * @returns {object} Created subscription record
 */
function createSubscription(userId, subscription, deviceName = null) {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    try {
        // Check if endpoint already exists
        const existing = db.prepare(
            'SELECT id FROM push_subscriptions WHERE endpoint = ?'
        ).get(subscription.endpoint);

        if (existing) {
            // Update existing subscription (might be re-subscribing)
            db.prepare(`
                UPDATE push_subscriptions 
                SET user_id = ?, p256dh = ?, auth = ?, device_name = ?, last_used = NULL
                WHERE endpoint = ?
            `).run(
                userId,
                subscription.keys.p256dh,
                subscription.keys.auth,
                deviceName,
                subscription.endpoint
            );

            logger.info('[PushSubscriptions] Updated existing subscription', {
                userId,
                subscriptionId: existing.id
            });

            return getSubscriptionById(existing.id);
        }

        // Create new subscription
        db.prepare(`
            INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, device_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            userId,
            subscription.endpoint,
            subscription.keys.p256dh,
            subscription.keys.auth,
            deviceName,
            now
        );

        logger.info('[PushSubscriptions] Created new subscription', { userId, subscriptionId: id });

        return getSubscriptionById(id);
    } catch (error) {
        logger.error('[PushSubscriptions] Failed to create subscription', {
            error: error.message,
            userId
        });
        throw error;
    }
}

/**
 * Get a subscription by ID
 * @param {string} id - Subscription ID
 * @returns {object|null} Subscription record
 */
function getSubscriptionById(id) {
    return db.prepare(
        'SELECT * FROM push_subscriptions WHERE id = ?'
    ).get(id);
}

/**
 * Get all subscriptions for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of subscription records
 */
function getSubscriptionsByUser(userId) {
    return db.prepare(
        'SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
}

/**
 * Get all active subscriptions (for broadcast scenarios)
 * @returns {Array} Array of all subscription records
 */
function getAllSubscriptions() {
    return db.prepare('SELECT * FROM push_subscriptions').all();
}

/**
 * Delete a subscription by ID (user must own it)
 * @param {string} id - Subscription ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {boolean} True if deleted
 */
function deleteSubscriptionById(id, userId) {
    const result = db.prepare(
        'DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?'
    ).run(id, userId);

    if (result.changes > 0) {
        logger.info('[PushSubscriptions] Deleted subscription', { subscriptionId: id, userId });
        return true;
    }
    return false;
}

/**
 * Delete a subscription by endpoint (for cleanup on push failure)
 * @param {string} endpoint - Push endpoint URL
 * @returns {boolean} True if deleted
 */
function deleteSubscriptionByEndpoint(endpoint) {
    const result = db.prepare(
        'DELETE FROM push_subscriptions WHERE endpoint = ?'
    ).run(endpoint);

    if (result.changes > 0) {
        logger.info('[PushSubscriptions] Deleted subscription by endpoint (cleanup)');
        return true;
    }
    return false;
}

/**
 * Update the last_used timestamp for a subscription
 * @param {string} endpoint - Push endpoint URL
 */
function updateLastUsed(endpoint) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
        'UPDATE push_subscriptions SET last_used = ? WHERE endpoint = ?'
    ).run(now, endpoint);
}

/**
 * Get subscription by endpoint
 * @param {string} endpoint - Push endpoint URL
 * @returns {object|null} Subscription record
 */
function getSubscriptionByEndpoint(endpoint) {
    return db.prepare(
        'SELECT * FROM push_subscriptions WHERE endpoint = ?'
    ).get(endpoint);
}

module.exports = {
    createSubscription,
    getSubscriptionById,
    getSubscriptionsByUser,
    getAllSubscriptions,
    deleteSubscriptionById,
    deleteSubscriptionByEndpoint,
    updateLastUsed,
    getSubscriptionByEndpoint
};
