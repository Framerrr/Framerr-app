const express = require('express');
const router = express.Router();
const { getSystemConfig, updateSystemConfig } = require('../db/systemConfig');
const { getUserConfig, updateUserConfig } = require('../db/userConfig');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const upload = require('../middleware/upload');
const AdmZip = require('adm-zip');
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/config/system
 * Get system configuration (Admin only)
 */
router.get('/system', requireAdmin, async (req, res) => {
    try {
        const config = await getSystemConfig();
        // Remove sensitive data if necessary, though admins usually need to see it
        res.json(config);
    } catch (error) {
        logger.error('Failed to get system config', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/config/system
 * Update system configuration (Admin only)
 */
router.put('/system', requireAdmin, async (req, res) => {
    try {
        const updatedConfig = await updateSystemConfig(req.body);

        logger.info('System config updated by admin', {
            userId: req.user.id,
            username: req.user.username
        });

        res.json(updatedConfig);
    } catch (error) {
        logger.error('Failed to update system config', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/config/app-name
 * Get application name (public, no auth required)
 * This endpoint is safe to be public as it only exposes the display name
 */
router.get('/app-name', async (req, res) => {
    try {
        const config = await getSystemConfig();
        res.json({
            name: config.server?.name || 'Framerr'
        });
    } catch (error) {
        logger.error('Failed to get app name', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/config/user
 * Get current user's configuration
 */
router.get('/user', requireAuth, async (req, res) => {
    try {
        const config = await getUserConfig(req.user.id);
        res.json(config);
    } catch (error) {
        logger.error('Failed to get user config', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/config/user
 * Update current user's configuration
 */
router.put('/user', requireAuth, async (req, res) => {
    try {
        const updatedConfig = await updateUserConfig(req.user.id, req.body);

        logger.debug('User config updated', {
            userId: req.user.id
        });

        res.json(updatedConfig);
    } catch (error) {
        logger.error('Failed to update user config', {
            userId: req.user.id,
            error: error.message
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/config/auth
 * Get authentication configuration (Admin only)
 */
router.get('/auth', requireAdmin, async (req, res) => {
    try {
        const config = await getSystemConfig();
        res.json(config.auth || {});
    } catch (error) {
        logger.error('Failed to get auth config', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/config/auth
 * Update authentication configuration (Admin only)
 */
router.put('/auth', requireAdmin, async (req, res) => {
    try {
        // Validate iframe OAuth endpoint must be HTTPS
        if (req.body.iframe?.enabled && req.body.iframe?.endpoint) {
            try {
                const endpointUrl = new URL(req.body.iframe.endpoint);
                if (endpointUrl.protocol !== 'https:') {
                    return res.status(400).json({
                        error: 'OAuth endpoint must use HTTPS for security'
                    });
                }
            } catch (error) {
                return res.status(400).json({
                    error: 'Invalid OAuth endpoint URL format'
                });
            }
        }

        // Get current config to check if we're disabling proxy auth
        const currentConfig = await getSystemConfig();
        const wasProxyEnabled = currentConfig?.auth?.proxy?.enabled;
        const willProxyBeDisabled = !req.body.proxy?.enabled;

        // If disabling proxy auth while user is authenticated via proxy,
        // create a local session to maintain authentication
        if (wasProxyEnabled && willProxyBeDisabled && req.proxyAuth) {
            logger.info('Proxy auth being disabled - creating local session', {
                userId: req.user.id,
                username: req.user.username
            });

            // Create a session for the proxy-authenticated user
            const { createUserSession } = require('../auth/session');
            const session = await createUserSession(
                req.user,
                req,
                currentConfig.auth.session?.timeout || 86400000 // 24 hours default
            );

            // Set session cookie so user stays authenticated
            res.cookie('sessionId', session.id, {
                httpOnly: true,
                secure: false, // Allow HTTP for Docker/IP access
                sameSite: 'lax',
                maxAge: currentConfig.auth.session?.timeout || 86400000
            });

            logger.info('Local session created for proxy user', {
                userId: req.user.id,
                sessionId: session.id
            });
        }

        await updateSystemConfig({ auth: req.body });
        const config = await getSystemConfig();

        logger.info('Auth config updated', {
            userId: req.user.id,
            username: req.user.username
        });

        res.json(config.auth);
    } catch (error) {
        logger.error('Failed to update auth config', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Favicon management endpoints

/**
 * POST /api/config/favicon
 * Upload favicon ZIP package (Admin only)
 */
router.post('/favicon', requireAdmin, upload.single('faviconZip'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { htmlSnippet } = req.body;
        if (!htmlSnippet || typeof htmlSnippet !== 'string') {
            // Clean up uploaded file
            await fs.unlink(req.file.path);
            return res.status(400).json({ error: 'HTML snippet is required' });
        }

        // Use DATA_DIR for persistent storage (survives container restarts)
        const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
        const faviconDir = path.join(DATA_DIR, 'public/favicon');

        // Clean up old favicon files
        try {
            const files = await fs.readdir(faviconDir);
            await Promise.all(files.map(file => fs.unlink(path.join(faviconDir, file))));
        } catch (err) {
            // Directory might be empty or not exist, that's okay
            // Ensure it exists before extraction
            await fs.mkdir(faviconDir, { recursive: true });
        }

        // Extract ZIP to favicon directory
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(faviconDir, true);

        // Clean up uploaded ZIP file
        await fs.unlink(req.file.path);

        // Update system config with HTML snippet
        await updateSystemConfig({
            favicon: {
                enabled: true,
                htmlSnippet: htmlSnippet,
                uploadedAt: new Date().toISOString(),
                uploadedBy: req.user.username
            }
        });

        logger.info('Favicon uploaded successfully', {
            userId: req.user.id,
            username: req.user.username
        });

        const updatedConfig = await getSystemConfig();
        res.json({
            success: true,
            message: 'Favicon uploaded successfully',
            favicon: updatedConfig.favicon
        });
    } catch (error) {
        logger.error('Failed to upload favicon', { error: error.message });

        // Clean up on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (err) {
                // Ignore cleanup errors
            }
        }

        res.status(500).json({ error: 'Failed to upload favicon: ' + error.message });
    }
});

/**
 * GET /api/config/favicon
 * Get current favicon configuration
 */
router.get('/favicon', async (req, res) => {
    try {
        const systemConfig = await getSystemConfig();
        const favicon = systemConfig.favicon || { htmlSnippet: null };
        res.json(favicon);
    } catch (error) {
        logger.error('Failed to get favicon config', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/config/favicon
 * Toggle custom favicon on/off (Admin only)
 */
router.patch('/favicon', requireAdmin, async (req, res) => {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled must be a boolean' });
        }

        const systemConfig = await getSystemConfig();

        if (!systemConfig.favicon || !systemConfig.favicon.htmlSnippet) {
            return res.status(400).json({ error: 'No custom favicon uploaded yet' });
        }

        // Only update the enabled field, preserve other favicon properties
        await updateSystemConfig({
            favicon: {
                ...systemConfig.favicon,
                enabled: enabled
            }
        });

        logger.info(`Custom favicon ${enabled ? 'enabled' : 'disabled'}`, {
            userId: req.user.id,
            username: req.user.username
        });

        const updatedConfig = await getSystemConfig();
        res.json({
            success: true,
            message: `Custom favicon ${enabled ? 'enabled' : 'disabled'}`,
            favicon: updatedConfig.favicon
        });
    } catch (error) {
        logger.error('Failed to toggle favicon', { error: error.message });
        res.status(500).json({ error: 'Failed to toggle favicon' });
    }
});

/**
 * DELETE /api/config/favicon
 * Reset favicon to default (Admin only)
 */
router.delete('/favicon', requireAdmin, async (req, res) => {
    try {
        // Use DATA_DIR for persistent storage
        const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
        const faviconDir = path.join(DATA_DIR, 'public/favicon');

        // Remove all favicon files
        try {
            const files = await fs.readdir(faviconDir);
            await Promise.all(files.map(file => fs.unlink(path.join(faviconDir, file))));
        } catch (err) {
            // Directory might be empty, that's okay
        }

        // Remove favicon config from system config
        // Set to null instead of delete so updateSystemConfig properly saves it
        await updateSystemConfig({ favicon: null });

        logger.info('Favicon reset to default', {
            userId: req.user.id,
            username: req.user.username
        });

        res.json({ success: true, message: 'Favicon reset to default' });
    } catch (error) {
        logger.error('Failed to reset favicon', { error: error.message });
        res.status(500).json({ error: 'Failed to reset favicon' });
    }
});

module.exports = router;
