const express = require('express');
const router = express.Router();
const { hashPassword } = require('../auth/password');
const { createUser, listUsers } = require('../db/users');
const logger = require('../utils/logger');

/**
 * GET /api/auth/setup/status
 * Check if setup is needed (no users exist)
 */
router.get('/status', async (req, res) => {
    try {
        const users = await listUsers();
        const needsSetup = users.length === 0;

        logger.debug(`Setup status check: ${needsSetup ? 'needed' : 'not needed'}`);

        res.json({ needsSetup });
    } catch (error) {
        logger.error('Setup status check error', { error: error.message });
        res.status(500).json({ error: 'Failed to check setup status' });
    }
});

/**
 * POST /api/auth/setup
 * Create admin user (only works if no users exist)
 */
router.post('/', async (req, res) => {
    try {
        const { username, password, confirmPassword, displayName } = req.body;

        // Security: Verify no users exist
        const users = await listUsers();
        if (users.length > 0) {
            logger.warn('Setup attempt when users already exist');
            return res.status(403).json({ error: 'Setup has already been completed' });
        }

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Validate username format (alphanumeric, underscore, hyphen)
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                error: 'Username can only contain letters, numbers, underscores, and hyphens'
            });
        }

        // Create admin user
        const passwordHash = await hashPassword(password);
        const user = await createUser({
            username,
            passwordHash,
            displayName: displayName || username,
            group: 'admin',
            preferences: {
                theme: 'dark'
            }
        });

        logger.info(`Admin user created via setup wizard: ${username}`);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                group: user.group,
                preferences: user.preferences
            }
        });
    } catch (error) {
        logger.error('Setup error', { error: error.message });
        res.status(500).json({ error: error.message || 'Setup failed' });
    }
});

module.exports = router;
