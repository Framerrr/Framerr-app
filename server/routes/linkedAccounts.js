/**
 * Linked Accounts Routes
 * API endpoints for user linked account management
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getLinkedAccountsForUser } = require('../db/linkedAccounts');
const logger = require('../utils/logger');

/**
 * GET /api/linked-accounts/me
 * Get current user's linked accounts (from database - SSO links, etc.)
 * Returns both database-stored links (Plex SSO) and any other linked services
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all linked accounts from database (includes Plex SSO links)
        const dbLinkedAccounts = getLinkedAccountsForUser(userId);

        // Convert to object keyed by service for easier frontend use
        const accountsByService = {};
        for (const account of dbLinkedAccounts) {
            accountsByService[account.service] = {
                linked: true,
                externalId: account.externalId,
                externalUsername: account.externalUsername,
                externalEmail: account.externalEmail,
                linkedAt: account.linkedAt,
                metadata: account.metadata || {}
            };
        }

        logger.debug('[LinkedAccounts] Fetched accounts for user', {
            userId,
            services: Object.keys(accountsByService)
        });

        res.json({
            accounts: accountsByService
        });
    } catch (error) {
        logger.error('[LinkedAccounts] Failed to fetch accounts:', error.message);
        res.status(500).json({ error: 'Failed to fetch linked accounts' });
    }
});

module.exports = router;
