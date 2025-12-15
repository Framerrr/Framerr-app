/**
 * Linked Accounts Database Module
 * Manages user's linked external service accounts (Plex, Overseerr, etc.)
 */
const { db } = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Link an external account to a Framerr user
 * @param {string} userId - Framerr user ID
 * @param {string} service - Service name (e.g., 'plex', 'overseerr')
 * @param {object} accountData - External account data
 * @returns {object} Created linked account
 */
function linkAccount(userId, service, accountData) {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    try {
        // Check if already linked (unique constraint on user_id + service)
        const existing = db.prepare(`
            SELECT id FROM linked_accounts WHERE user_id = ? AND service = ?
        `).get(userId, service);

        if (existing) {
            // Update existing link
            db.prepare(`
                UPDATE linked_accounts 
                SET external_id = ?, external_username = ?, external_email = ?, 
                    metadata = ?, linked_at = ?
                WHERE user_id = ? AND service = ?
            `).run(
                accountData.externalId,
                accountData.externalUsername || null,
                accountData.externalEmail || null,
                JSON.stringify(accountData.metadata || {}),
                now,
                userId,
                service
            );

            logger.info('[LinkedAccounts] Updated linked account', { userId, service });
            return getLinkedAccount(userId, service);
        }

        // Create new link
        db.prepare(`
            INSERT INTO linked_accounts (id, user_id, service, external_id, external_username, external_email, metadata, linked_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            userId,
            service,
            accountData.externalId,
            accountData.externalUsername || null,
            accountData.externalEmail || null,
            JSON.stringify(accountData.metadata || {}),
            now
        );

        logger.info('[LinkedAccounts] Created linked account', { userId, service });

        return {
            id,
            userId,
            service,
            externalId: accountData.externalId,
            externalUsername: accountData.externalUsername,
            externalEmail: accountData.externalEmail,
            metadata: accountData.metadata || {},
            linkedAt: now
        };
    } catch (error) {
        logger.error('[LinkedAccounts] Failed to link account:', error.message);
        throw error;
    }
}

/**
 * Get a linked account for a user and service
 * @param {string} userId - Framerr user ID
 * @param {string} service - Service name
 * @returns {object|null} Linked account or null
 */
function getLinkedAccount(userId, service) {
    try {
        const row = db.prepare(`
            SELECT * FROM linked_accounts WHERE user_id = ? AND service = ?
        `).get(userId, service);

        if (!row) return null;

        return {
            id: row.id,
            userId: row.user_id,
            service: row.service,
            externalId: row.external_id,
            externalUsername: row.external_username,
            externalEmail: row.external_email,
            metadata: JSON.parse(row.metadata || '{}'),
            linkedAt: row.linked_at
        };
    } catch (error) {
        logger.error('[LinkedAccounts] Failed to get linked account:', error.message);
        return null;
    }
}

/**
 * Get all linked accounts for a user
 * @param {string} userId - Framerr user ID
 * @returns {Array} Array of linked accounts
 */
function getLinkedAccountsForUser(userId) {
    try {
        const rows = db.prepare(`
            SELECT * FROM linked_accounts WHERE user_id = ? ORDER BY service
        `).all(userId);

        return rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            service: row.service,
            externalId: row.external_id,
            externalUsername: row.external_username,
            externalEmail: row.external_email,
            metadata: JSON.parse(row.metadata || '{}'),
            linkedAt: row.linked_at
        }));
    } catch (error) {
        logger.error('[LinkedAccounts] Failed to get linked accounts:', error.message);
        return [];
    }
}

/**
 * Find Framerr user by external ID
 * @param {string} service - Service name
 * @param {string} externalId - External account ID
 * @returns {string|null} Framerr user ID or null
 */
function findUserByExternalId(service, externalId) {
    try {
        const row = db.prepare(`
            SELECT user_id FROM linked_accounts WHERE service = ? AND external_id = ?
        `).get(service, externalId);

        return row ? row.user_id : null;
    } catch (error) {
        logger.error('[LinkedAccounts] Failed to find user by external ID:', error.message);
        return null;
    }
}

/**
 * Unlink an external account
 * @param {string} userId - Framerr user ID
 * @param {string} service - Service name
 * @returns {boolean} Success status
 */
function unlinkAccount(userId, service) {
    try {
        const result = db.prepare(`
            DELETE FROM linked_accounts WHERE user_id = ? AND service = ?
        `).run(userId, service);

        if (result.changes > 0) {
            logger.info('[LinkedAccounts] Unlinked account', { userId, service });
            return true;
        }
        return false;
    } catch (error) {
        logger.error('[LinkedAccounts] Failed to unlink account:', error.message);
        return false;
    }
}

/**
 * Get all users linked to a specific service
 * Useful for notification targeting
 * @param {string} service - Service name
 * @returns {Array} Array of { userId, externalId }
 */
function getUsersLinkedToService(service) {
    try {
        const rows = db.prepare(`
            SELECT user_id, external_id FROM linked_accounts WHERE service = ?
        `).all(service);

        return rows.map(row => ({
            userId: row.user_id,
            externalId: row.external_id
        }));
    } catch (error) {
        logger.error('[LinkedAccounts] Failed to get users linked to service:', error.message);
        return [];
    }
}

module.exports = {
    linkAccount,
    getLinkedAccount,
    getLinkedAccountsForUser,
    findUserByExternalId,
    unlinkAccount,
    getUsersLinkedToService
};
