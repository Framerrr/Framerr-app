/**
 * Webhook User Resolver Service
 * 
 * Resolves webhook usernames to Framerr users using a cascade:
 * 1. Manual Overseerr link (user_preferences.linkedAccounts.overseerr.username)
 * 2. Plex SSO link (linked_accounts table with matching username)
 * 3. Direct Framerr username match
 * 4. Fallback to admins with receiveUnmatched=true
 */
const { db } = require('../database/db');
const { listUsers } = require('../db/users');
const { getUserConfig } = require('../db/userConfig');
const logger = require('../utils/logger');

/**
 * Find Framerr user by external username
 * Uses cascade matching strategy
 * 
 * @param {string} externalUsername - Username from webhook (e.g., Plex/Overseerr username)
 * @param {string} service - Service name ('overseerr', 'sonarr', 'radarr')
 * @returns {Promise<object|null>} Matched user or null
 */
async function resolveUserByUsername(externalUsername, service) {
    if (!externalUsername) {
        logger.debug('[WebhookResolver] No username provided');
        return null;
    }

    const normalizedUsername = externalUsername.toLowerCase().trim();
    logger.debug('[WebhookResolver] Resolving username', { externalUsername, service });

    try {
        // Strategy 1: Check manual Overseerr link in user_preferences
        // Users can manually set their Overseerr username in Settings → Linked Accounts
        const userWithManualLink = await findUserByManualOverseerrLink(normalizedUsername);
        if (userWithManualLink) {
            logger.info('[WebhookResolver] Matched via manual Overseerr link', {
                username: externalUsername,
                userId: userWithManualLink.id
            });
            return userWithManualLink;
        }

        // Strategy 2: Check Plex SSO link in linked_accounts table
        // When users log in via Plex SSO, their Plex username is stored
        const userWithPlexLink = await findUserByPlexUsername(normalizedUsername);
        if (userWithPlexLink) {
            logger.info('[WebhookResolver] Matched via Plex SSO link', {
                username: externalUsername,
                userId: userWithPlexLink.id
            });
            return userWithPlexLink;
        }

        // Strategy 3: Direct Framerr username match
        const userByUsername = await findUserByFramerrUsername(normalizedUsername);
        if (userByUsername) {
            logger.info('[WebhookResolver] Matched via Framerr username', {
                username: externalUsername,
                userId: userByUsername.id
            });
            return userByUsername;
        }

        logger.debug('[WebhookResolver] No user match found for username', { username: externalUsername });
        return null;
    } catch (error) {
        logger.error('[WebhookResolver] Error resolving user:', error.message);
        return null;
    }
}

/**
 * Find user by manual Overseerr link in user_preferences
 */
async function findUserByManualOverseerrLink(username) {
    try {
        // Query all users and check their linked accounts preferences
        const users = await listUsers();

        for (const user of users) {
            const config = await getUserConfig(user.id);
            const overseerrLink = config?.preferences?.linkedAccounts?.overseerr?.username;

            if (overseerrLink && overseerrLink.toLowerCase().trim() === username) {
                return user;
            }
        }

        return null;
    } catch (error) {
        logger.error('[WebhookResolver] Error checking manual Overseerr links:', error.message);
        return null;
    }
}

/**
 * Find user by Plex SSO username in linked_accounts table
 */
async function findUserByPlexUsername(username) {
    try {
        const row = db.prepare(`
            SELECT user_id, external_username FROM linked_accounts 
            WHERE service = 'plex' AND LOWER(external_username) = ?
        `).get(username);

        if (!row) return null;

        // Get full user object
        const users = await listUsers();
        return users.find(u => u.id === row.user_id) || null;
    } catch (error) {
        logger.error('[WebhookResolver] Error checking Plex SSO links:', error.message);
        return null;
    }
}

/**
 * Find user by Framerr username
 */
async function findUserByFramerrUsername(username) {
    try {
        const users = await listUsers();
        return users.find(u => u.username.toLowerCase() === username) || null;
    } catch (error) {
        logger.error('[WebhookResolver] Error checking Framerr usernames:', error.message);
        return null;
    }
}

/**
 * Get all admin users who have receiveUnmatched enabled
 * These receive notifications when no user match is found
 */
async function getAdminsWithReceiveUnmatched() {
    try {
        const users = await listUsers();
        const admins = users.filter(u => u.group === 'admin');

        const adminsWithUnmatched = [];

        for (const admin of admins) {
            const config = await getUserConfig(admin.id);
            const receiveUnmatched = config?.preferences?.notifications?.receiveUnmatched ?? true; // Default true

            if (receiveUnmatched) {
                adminsWithUnmatched.push(admin);
            }
        }

        return adminsWithUnmatched;
    } catch (error) {
        logger.error('[WebhookResolver] Error getting admins with receiveUnmatched:', error.message);
        return [];
    }
}

/**
 * Check if a user has a specific event enabled in their notification preferences
 * 
 * @param {string} userId - Framerr user ID
 * @param {string} service - Integration service name
 * @param {string} eventKey - Event key to check
 * @param {boolean} isAdmin - Whether the user is an admin
 * @param {object} webhookConfig - Admin's webhook configuration
 * @returns {Promise<boolean>} Whether the user should receive this notification
 */
async function userWantsEvent(userId, service, eventKey, isAdmin, webhookConfig) {
    try {
        if (isAdmin) {
            // Admins check against adminEvents in webhookConfig
            return webhookConfig?.adminEvents?.includes(eventKey) ?? false;
        }

        // Non-admin: Check if event is in userEvents AND user has it enabled
        const userEventsAllowed = webhookConfig?.userEvents || [];
        if (!userEventsAllowed.includes(eventKey)) {
            return false; // Admin hasn't allowed this event for users
        }

        // Check user's personal preferences
        const config = await getUserConfig(userId);
        const userSettings = config?.preferences?.notifications?.integrations?.[service];

        // If user has integration disabled, don't send
        if (userSettings?.enabled === false) {
            return false;
        }

        // Check if user has this specific event enabled
        // If no events array, default to all allowed events
        const userEvents = userSettings?.events;
        if (!userEvents || userEvents.length === 0) {
            // User hasn't configured specific events, use all allowed
            return true;
        }

        return userEvents.includes(eventKey);
    } catch (error) {
        logger.error('[WebhookResolver] Error checking user event preference:', error.message);
        return false;
    }
}

module.exports = {
    resolveUserByUsername,
    getAdminsWithReceiveUnmatched,
    userWantsEvent
};
