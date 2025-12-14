const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getSystemConfig, updateSystemConfig } = require('../db/systemConfig');
const { getUserById, listUsers } = require('../db/users');
const logger = require('../utils/logger');
const axios = require('axios');
const { translateHostUrl } = require('../utils/urlHelper');
const { httpsAgent } = require('../utils/httpsAgent');

// NOTE: Different auth levels for different endpoints
// /shared - requires auth only (all users)
// All other routes - require auth + admin

/**
 * GET /api/integrations/shared
 * Get integrations shared with the current user
 * Returns integration name, config (url/apiKey), and sharedBy info
 */
router.get('/shared', requireAuth, async (req, res) => {
    try {
        const config = await getSystemConfig();
        const integrations = config.integrations || {};
        const userId = req.user.id;
        const userGroup = req.user.group;

        // Build list of integrations shared with this user
        const sharedIntegrations = [];

        for (const [serviceName, serviceConfig] of Object.entries(integrations)) {
            // Skip if not enabled
            if (!serviceConfig.enabled) continue;

            // Check sharing settings
            const sharing = serviceConfig.sharing;
            if (!sharing || !sharing.enabled) continue;

            let hasAccess = false;

            switch (sharing.mode) {
                case 'everyone':
                    hasAccess = true;
                    break;
                case 'groups':
                    hasAccess = sharing.groups?.includes(userGroup);
                    break;
                case 'users':
                    hasAccess = sharing.users?.includes(userId);
                    break;
            }

            if (hasAccess) {
                // Get sharedBy user's display name
                let sharedByName = 'Admin';
                if (sharing.sharedBy) {
                    try {
                        const sharedByUser = await getUserById(sharing.sharedBy);
                        if (sharedByUser) {
                            sharedByName = sharedByUser.displayName || sharedByUser.username;
                        }
                    } catch (e) {
                        // Fallback to 'Admin' if user lookup fails
                    }
                }

                // Include config needed for widget to function
                sharedIntegrations.push({
                    name: serviceName,  // 'name' for consistency with widget registry
                    url: serviceConfig.url,
                    apiKey: serviceConfig.apiKey,
                    enabled: true,
                    sharedBy: sharedByName,
                    sharedAt: sharing.sharedAt || null
                });
            }
        }

        res.json({ integrations: sharedIntegrations });
    } catch (error) {
        logger.error('Error fetching shared integrations:', error);
        res.status(500).json({ error: 'Failed to fetch shared integrations' });
    }
});

/**
 * GET /api/integrations
 * Get all integration configurations (ADMIN ONLY)
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const config = await getSystemConfig();
        res.json({ integrations: config.integrations || {} });
    } catch (error) {
        logger.error('Error fetching integrations:', error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

/**
 * PUT /api/integrations
 * Update integration configurations (ADMIN ONLY)
 */
router.put('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { integrations } = req.body;

        if (!integrations) {
            return res.status(400).json({ error: 'Integrations data required' });
        }

        const updatedConfig = await updateSystemConfig({ integrations });

        logger.info('Integrations updated by admin', {
            userId: req.user.id,
            username: req.user.username
        });

        res.json({ success: true, integrations: updatedConfig.integrations });
    } catch (error) {
        logger.error('Error updating integrations:', error);
        res.status(500).json({ error: 'Failed to update integrations' });
    }
});

/**
 * POST /api/integrations/test
 * Test integration connection (ADMIN ONLY)
 */
router.post('/test', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { service, config } = req.body;

        if (!service || !config) {
            return res.status(400).json({ error: 'Service and config required' });
        }

        let result;

        switch (service) {
            case 'plex':
                result = await testPlex(config);
                break;
            case 'sonarr':
                result = await testSonarr(config);
                break;
            case 'radarr':
                result = await testRadarr(config);
                break;
            case 'qbittorrent':
                result = await testQBittorrent(config);
                break;
            case 'overseerr':
                result = await testOverseerr(config);
                break;
            case 'systemstatus':
                result = await testSystemStatus(config);
                break;
            default:
                return res.status(400).json({ error: 'Unknown service type' });
        }

        res.json(result);
    } catch (error) {
        logger.error('Error testing integration:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Test failed'
        });
    }
});

/**
 * Test Plex connection
 */
async function testPlex(config) {
    const { url, token } = config;

    if (!url || !token) {
        return { success: false, error: 'URL and token required' };
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const response = await axios.get(`${translatedUrl}/status/sessions`, {
            headers: { 'X-Plex-Token': token },
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: response.headers['x-plex-version'] || 'Unknown'
        };
    } catch (error) {
        logger.error('Plex health check error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url
        });
        return {
            success: false,
            error: error.response?.statusText || error.message || error.code || 'Connection failed'
        };
    }
}

/**
 * Test Sonarr connection
 */
async function testSonarr(config) {
    const { url, apiKey } = config;

    if (!url || !apiKey) {
        return { success: false, error: 'URL and API key required' };
    }

    try {
        const response = await axios.get(`${url}/api/v3/system/status`, {
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: response.data.version || 'Unknown'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message || 'Connection failed'
        };
    }
}

/**
 * Test Radarr connection
 */
async function testRadarr(config) {
    const { url, apiKey } = config;

    if (!url || !apiKey) {
        return { success: false, error: 'URL and API key required' };
    }

    try {
        const response = await axios.get(`${url}/api/v3/system/status`, {
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: response.data.version || 'Unknown'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message || 'Connection failed'
        };
    }
}

/**
 * Test qBittorrent connection
 */
async function testQBittorrent(config) {
    const { url, username, password } = config;

    if (!url) {
        return { success: false, error: 'URL required' };
    }

    try {
        // qBittorrent login endpoint
        const formData = new URLSearchParams();
        if (username) formData.append('username', username);
        if (password) formData.append('password', password);

        const response = await axios.post(
            `${url}/api/v2/auth/login`,
            formData,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                httpsAgent,
                timeout: 5000
            }
        );

        // qBittorrent returns "Ok." on success
        if (response.data === 'Ok.' || response.status === 200) {
            // Get version info
            try {
                const cookie = response.headers['set-cookie']?.[0];
                const versionResponse = await axios.get(`${url}/api/v2/app/version`, {
                    headers: cookie ? { Cookie: cookie } : {},
                    httpsAgent,
                    timeout: 5000
                });

                return {
                    success: true,
                    message: 'Connection successful',
                    version: versionResponse.data || 'Unknown'
                };
            } catch {
                return {
                    success: true,
                    message: 'Connection successful',
                    version: 'Unknown'
                };
            }
        }

        return { success: false, error: 'Authentication failed' };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message || 'Connection failed'
        };
    }
}

/**
 * Test Overseerr connection
 */
async function testOverseerr(config) {
    const { url, apiKey } = config;

    if (!url || !apiKey) {
        return { success: false, error: 'URL and API key required' };
    }

    try {
        const response = await axios.get(`${url}/api/v1/settings/public`, {
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: response.data.version || 'Unknown'
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.message || error.message || 'Connection failed'
        };
    }
}

/**
 * Test System Status connection
 */
async function testSystemStatus(config) {
    const { url, token } = config;

    if (!url) {
        return { success: false, error: 'URL required' };
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(`${translatedUrl}/status`, {
            headers,
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: 'Unknown'  // System status API doesn't typically return version
        };
    } catch (error) {
        logger.error('System status health check error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url
        });
        return {
            success: false,
            error: error.response?.statusText || error.message || error.code || 'Connection failed'
        };
    }
}

module.exports = router;
