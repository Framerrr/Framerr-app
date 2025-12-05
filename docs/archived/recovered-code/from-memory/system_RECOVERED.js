const express = require('express');
const router = express.Router();
const { getSystemConfig, updateSystemConfig } = require('../db/systemConfig');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
/**
 * GET /api/system/config
 * Get system configuration (admin only)
 */
router.get('/config', requireAdmin, async (req, res) => {
    try {
        const config = await getSystemConfig();
        res.json({
            success: true,
            config: config
        });
    } catch (error) {
        logger.error('Failed to get system config', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'CONFIG_READ_ERROR',
                message: 'Failed to read system configuration'
            }
        });
    }
});
/**
 * PUT /api/system/config
 * Update system configuration (admin only)
 */
router.put('/config', requireAdmin, async (req, res) => {
    try {
        const updates = req.body;
        const newConfig = await updateSystemConfig(updates);
        // Refresh in-memory cached config for middleware
        req.app.set('systemConfig', newConfig);
        logger.info('System config updated', {
            user: req.user.username,
            updates: Object.keys(updates)
        });
        res.json({
            success: true,
            config: newConfig
        });
    } catch (error) {
        logger.error('Failed to update system config', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'CONFIG_UPDATE_ERROR',
                message: error.message || 'Failed to update system configuration'
            }
        });
    }
});
module.exports = router;
