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
 * GET /api/widgets
 * Get current user's dashboard widgets
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const userConfig = await getUserConfig(req.user.id);
        const widgets = userConfig.dashboard?.widgets || [];

        res.json({ widgets });
    } catch (error) {
        logger.error('Failed to get widgets', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to fetch widgets' });
    }
});

/**
 * PUT /api/widgets
 * Update current user's dashboard widgets
 * Expects: { widgets: [...] }
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const { widgets } = req.body;

        // Validate widgets array
        if (!Array.isArray(widgets)) {
            return res.status(400).json({ error: 'Widgets must be an array' });
        }

        // Get current config
        const userConfig = await getUserConfig(req.user.id);

        // Update widgets while preserving other dashboard settings
        const updatedDashboard = {
            ...userConfig.dashboard,
            widgets: widgets
        };

        // Save to user config
        await updateUserConfig(req.user.id, {
            dashboard: updatedDashboard
        });

        logger.debug('Widgets updated', {
            userId: req.user.id,
            widgetCount: widgets.length
        });

        res.json({
            success: true,
            widgets: widgets
        });

    } catch (error) {
        logger.error('Failed to update widgets', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to save widgets' });
    }
});

/**
 * POST /api/widgets/reset
 * Reset current user's widgets to empty
 */
router.post('/reset', requireAuth, async (req, res) => {
    try {
        const userConfig = await getUserConfig(req.user.id);

        // Reset widgets to empty array
        const updatedDashboard = {
            ...userConfig.dashboard,
            widgets: []
        };

        await updateUserConfig(req.user.id, {
            dashboard: updatedDashboard
        });

        logger.debug('Widgets reset', { userId: req.user.id });

        res.json({
            success: true,
            widgets: []
        });

    } catch (error) {
        logger.error('Failed to reset widgets', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to reset widgets' });
    }
});

module.exports = router;
