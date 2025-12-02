const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const { getUserConfig } = require('../db/userConfig');
const { getSystemConfig } = require('../db/systemConfig');
const { getAllUsers } = require('../db/users');
const logger = require('../utils/logger');

// Middleware
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};



/**
 * GET /api/backup/export
 * Export current user's configuration as JSON
 */
router.get('/export', requireAuth, async (req, res) => {
    try {
        const userConfig = await getUserConfig(req.user.id);

        const backup = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            user: {
                username: req.user.username,
                displayName: req.user.displayName
            },
            data: {
                dashboard: userConfig.dashboard,
                tabs: userConfig.tabs,
                theme: userConfig.theme,
                sidebar: userConfig.sidebar
            }
        };

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `dashboard-backup-${req.user.username}-${timestamp}.json`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(backup);

        logger.info('User config exported', {
            userId: req.user.id,
            username: req.user.username
        });

    } catch (error) {
        logger.error('Failed to export user config', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to export configuration' });
    }
});

/**
 * POST /api/backup/import
 * Import user configuration from JSON backup
 */
router.post('/import', requireAuth, async (req, res) => {
    try {
        const { data } = req.body;

        if (!data || typeof data !== 'object') {
            return res.status(400).json({
                error: 'Invalid backup data. Must include "data" object.'
            });
        }

        // Validate backup structure
        const validFields = ['dashboard', 'tabs', 'theme', 'sidebar'];
        const importData = {};

        for (const field of validFields) {
            if (data[field]) {
                importData[field] = data[field];
            }
        }

        if (Object.keys(importData).length === 0) {
            return res.status(400).json({
                error: 'No valid data to import'
            });
        }

        // Import data
        const { updateUserConfig } = require('../db/userConfig');
        await updateUserConfig(req.user.id, importData);

        logger.info('User config imported', {
            userId: req.user.id,
            fields: Object.keys(importData)
        });

        res.json({
            success: true,
            imported: Object.keys(importData),
            message: 'Configuration imported successfully. Please refresh the page.'
        });

    } catch (error) {
        logger.error('Failed to import user config', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to import configuration' });
    }
});

/**
 * GET /api/backup/system
 * Export full system configuration (admin only)
 */
router.get('/system', requireAdmin, async (req, res) => {
    try {
        const systemConfig = await getSystemConfig();
        const users = await getAllUsers();

        // Read all user configs
        const userConfigs = {};
        for (const user of users) {
            try {
                const config = await getUserConfig(user.id);
                userConfigs[user.id] = {
                    username: user.username,
                    displayName: user.displayName,
                    group: user.group,
                    config: config
                };
            } catch (err) {
                logger.warn(`Failed to load config for user ${user.username}`, err);
            }
        }

        const backup = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            exportedBy: req.user.username,
            system: systemConfig,
            users: userConfigs
        };

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `dashboard-system-backup-${timestamp}.json`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(backup);

        logger.info('System backup exported', {
            admin: req.user.username,
            userCount: Object.keys(userConfigs).length
        });

    } catch (error) {
        logger.error('Failed to export system backup', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to export system backup' });
    }
});

/**
 * POST /api/backup/system/restore
 * Restore full system configuration (admin only, DANGEROUS)
 */
router.post('/system/restore', requireAdmin, async (req, res) => {
    try {
        const { system, users } = req.body;

        if (!system || !users) {
            return res.status(400).json({
                error: 'Invalid backup. Must include "system" and "users".'
            });
        }

        // This is a dangerous operation - require confirmation
        const { confirm } = req.body;
        if (confirm !== 'RESTORE_SYSTEM') {
            return res.status(400).json({
                error: 'System restore requires confirmation. Set confirm: "RESTORE_SYSTEM"'
            });
        }

        logger.warn('System restore initiated', {
            admin: req.user.username,
            userCount: Object.keys(users).length
        });

        // TODO: Implement actual restore logic
        // This would require careful handling of:
        // - System config restoration
        // - User config restoration
        // - Handling conflicts
        // - Data validation

        res.status(501).json({
            error: 'System restore not implemented yet. Manual restore recommended.'
        });

    } catch (error) {
        logger.error('Failed to restore system backup', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to restore system backup' });
    }
});

module.exports = router;
