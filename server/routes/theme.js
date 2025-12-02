const express = require('express');
const router = express.Router();
const { getUserConfig, updateUserConfig } = require('../db/userConfig');
const logger = require('../utils/logger');

// Middleware to require authentication
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

/**
 * GET /api/theme
 * Get current user's theme preferences
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const userConfig = await getUserConfig(req.user.id);
        const theme = userConfig.theme || {
            mode: 'system',
            primaryColor: '#3b82f6',
            preset: 'default'
        };

        res.json({ theme });
    } catch (error) {
        logger.error('Failed to get theme', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to fetch theme' });
    }
});

/**
 * PUT /api/theme
 * Update current user's theme preferences
 * Expects: { theme: { mode, primaryColor, preset, customColors? } }
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const { theme } = req.body;

        // Validate theme object
        if (!theme || typeof theme !== 'object') {
            return res.status(400).json({ error: 'Theme must be an object' });
        }

        // Validate mode if provided
        if (theme.mode && !['light', 'dark', 'system'].includes(theme.mode)) {
            return res.status(400).json({
                error: 'Theme mode must be one of: light, dark, system'
            });
        }

        // Validate primaryColor if provided (basic hex color check)
        if (theme.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(theme.primaryColor)) {
            return res.status(400).json({
                error: 'Primary color must be a valid hex color (e.g., #3b82f6)'
            });
        }

        // Get current config
        const userConfig = await getUserConfig(req.user.id);

        // Merge theme settings
        const updatedTheme = {
            ...userConfig.theme,
            ...theme
        };

        // Save to user config
        await updateUserConfig(req.user.id, {
            theme: updatedTheme
        });

        logger.debug('Theme updated', {
            userId: req.user.id,
            mode: updatedTheme.mode,
            preset: updatedTheme.preset
        });

        res.json({
            success: true,
            theme: updatedTheme
        });

    } catch (error) {
        logger.error('Failed to update theme', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to save theme' });
    }
});

/**
 * POST /api/theme/reset
 * Reset current user's theme to defaults
 */
router.post('/reset', requireAuth, async (req, res) => {
    try {
        const defaultTheme = {
            mode: 'system',
            primaryColor: '#3b82f6',
            preset: 'default'
        };

        await updateUserConfig(req.user.id, {
            theme: defaultTheme
        });

        logger.debug('Theme reset to defaults', { userId: req.user.id });

        res.json({
            success: true,
            theme: defaultTheme
        });

    } catch (error) {
        logger.error('Failed to reset theme', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to reset theme' });
    }
});

module.exports = router;
