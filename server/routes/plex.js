/**
 * Plex OAuth Routes
 * Handles Plex PIN-based OAuth authentication flow
 * 
 * Used for:
 * 1. Plex SSO (user login via Plex)
 * 2. Plex Integration setup (getting token for widget)
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getSystemConfig, updateSystemConfig } = require('../db/systemConfig');

// Plex API base URLs
const PLEX_TV_API = 'https://plex.tv/api/v2';

// Module-level cache for client identifier (prevents regeneration race condition)
let cachedClientIdentifier = null;

// Standard headers for Plex API requests
const getPlexHeaders = (clientId, token = null) => {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Plex-Product': 'Framerr',
        'X-Plex-Version': '1.0',
        'X-Plex-Client-Identifier': clientId
    };
    if (token) {
        headers['X-Plex-Token'] = token;
    }
    return headers;
};

/**
 * Get or create a persistent client identifier for this Framerr instance
 * Uses module-level cache to prevent race conditions with DB cache invalidation
 */
async function getClientIdentifier() {
    // Return cached value if we have it
    if (cachedClientIdentifier) {
        return cachedClientIdentifier;
    }

    const config = await getSystemConfig();

    // Check if we already have a client ID stored in DB
    if (config.plexSSO?.clientIdentifier) {
        cachedClientIdentifier = config.plexSSO.clientIdentifier;
        logger.debug('[Plex] Using existing client identifier from DB');
        return cachedClientIdentifier;
    }

    // Generate a new one and store it
    const clientId = `framerr-${uuidv4()}`;

    // Save to DB
    await updateSystemConfig({
        plexSSO: {
            ...(config.plexSSO || {}),
            clientIdentifier: clientId
        }
    });

    // Cache it in memory
    cachedClientIdentifier = clientId;

    logger.info('[Plex] Generated new client identifier:', clientId);
    return clientId;
}


/**
 * POST /api/plex/auth/pin
 * Generate a Plex PIN for OAuth
 * Returns: { pinId, code, authUrl }
 */
router.post('/auth/pin', async (req, res) => {
    try {
        const clientId = await getClientIdentifier();
        const { forwardUrl } = req.body;

        logger.info('[Plex] Generating PIN with clientId:', clientId);

        // Generate PIN from Plex
        const pinResponse = await axios.post(
            `${PLEX_TV_API}/pins`,
            { strong: true },
            { headers: getPlexHeaders(clientId) }
        );

        const { id: pinId, code } = pinResponse.data;

        logger.info('[Plex] PIN generated successfully:', {
            pinId,
            code: code?.substring(0, 4) + '...',
            clientId: clientId.substring(0, 20) + '...'
        });

        // Construct the Plex auth URL
        const authParams = new URLSearchParams({
            clientID: clientId,
            code: code,
            'context[device][product]': 'Framerr'
        });

        if (forwardUrl) {
            authParams.append('forwardUrl', forwardUrl);
        }

        const authUrl = `https://app.plex.tv/auth#?${authParams.toString()}`;

        res.json({
            pinId,
            code,
            authUrl,
            expiresIn: 1800 // 30 minutes
        });
    } catch (error) {
        logger.error('[Plex] Failed to generate PIN:', error.message);
        res.status(500).json({ error: 'Failed to generate Plex PIN' });
    }
});


/**
 * GET /api/plex/auth/token
 * Check PIN status and get token if claimed
 * Query: ?pinId=123
 * Returns: { pending: true } or { authToken, user }
 */
router.get('/auth/token', async (req, res) => {
    try {
        const { pinId } = req.query;

        if (!pinId) {
            return res.status(400).json({ error: 'pinId is required' });
        }

        const clientId = await getClientIdentifier();

        logger.debug('[Plex] Checking PIN status', { pinId, clientId: clientId.substring(0, 20) + '...' });

        // Check PIN status from Plex
        const pinResponse = await axios.get(
            `${PLEX_TV_API}/pins/${pinId}`,
            { headers: getPlexHeaders(clientId) }
        );

        logger.debug('[Plex] PIN response received', {
            hasAuthToken: !!pinResponse.data.authToken,
            expiresAt: pinResponse.data.expiresAt
        });

        const { authToken } = pinResponse.data;

        if (!authToken) {
            // PIN exists but user hasn't authenticated yet
            return res.json({ pending: true });
        }

        // PIN was claimed, get user info
        const userResponse = await axios.get(
            `${PLEX_TV_API}/user`,
            { headers: getPlexHeaders(clientId, authToken) }
        );

        const user = {
            id: userResponse.data.id,
            uuid: userResponse.data.uuid,
            username: userResponse.data.username,
            email: userResponse.data.email,
            thumb: userResponse.data.thumb
        };

        logger.info('[Plex] Token obtained for user:', user.username);

        res.json({
            authToken,
            user
        });
    } catch (error) {
        logger.error('[Plex] Failed to check PIN:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });

        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'PIN expired or invalid' });
        }

        res.status(500).json({ error: 'Failed to check Plex PIN' });
    }
});


/**
 * GET /api/plex/resources
 * Get user's Plex servers (machines)
 * Query: ?token=xxx
 * Returns: [{ name, machineId, connections }]
 */
router.get('/resources', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'token is required' });
        }

        const clientId = await getClientIdentifier();

        const response = await axios.get(
            `${PLEX_TV_API}/resources`,
            {
                headers: getPlexHeaders(clientId, token),
                params: { includeHttps: 1, includeRelay: 1 }
            }
        );

        // Filter to only server devices
        const servers = response.data
            .filter(device => device.provides?.includes('server'))
            .map(device => ({
                name: device.name,
                machineId: device.clientIdentifier,
                owned: device.owned,
                connections: device.connections?.map(conn => ({
                    uri: conn.uri,
                    local: conn.local,
                    relay: conn.relay
                })) || []
            }));

        logger.debug('[Plex] Found servers:', servers.length);

        res.json(servers);
    } catch (error) {
        logger.error('[Plex] Failed to get resources:', error.message);
        res.status(500).json({ error: 'Failed to get Plex servers' });
    }
});

/**
 * GET /api/plex/admin-resources
 * Get admin's Plex servers using stored token (for UI refresh)
 * Requires admin authentication
 */
router.get('/admin-resources', requireAuth, requireAdmin, async (req, res) => {
    try {
        const config = await getSystemConfig();
        const ssoConfig = config.plexSSO;

        if (!ssoConfig?.adminToken) {
            return res.status(400).json({ error: 'No Plex token configured' });
        }

        const clientId = await getClientIdentifier();

        const response = await axios.get(
            `${PLEX_TV_API}/resources`,
            {
                headers: getPlexHeaders(clientId, ssoConfig.adminToken),
                params: { includeHttps: 1, includeRelay: 1 }
            }
        );

        // Filter to only server devices
        const servers = response.data
            .filter(device => device.provides?.includes('server'))
            .map(device => ({
                name: device.name,
                machineId: device.clientIdentifier,
                owned: device.owned,
                connections: device.connections?.map(conn => ({
                    uri: conn.uri,
                    local: conn.local,
                    relay: conn.relay
                })) || []
            }));

        logger.debug('[Plex] Found admin servers:', servers.length);

        res.json(servers);
    } catch (error) {
        logger.error('[Plex] Failed to get admin resources:', error.message);
        res.status(500).json({ error: 'Failed to get Plex servers' });
    }
});

/**
 * GET /api/plex/users
 * Get users with library access on this Plex server
 * Query: ?token=xxx
 * Returns: [{ id, username, email, thumb }]
 */
router.get('/users', requireAuth, async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'token is required' });
        }

        // Get users with library access from Plex.tv (not friends)
        // This endpoint returns users who have been invited to access server libraries
        const response = await axios.get('https://plex.tv/api/users', {
            headers: {
                'Accept': 'application/json',
                'X-Plex-Token': token
            }
        });

        // Parse the response - structure is MediaContainer.User[]
        const sharedUsers = response.data?.MediaContainer?.User || [];
        const usersList = Array.isArray(sharedUsers) ? sharedUsers : [sharedUsers];

        const users = usersList.filter(u => u).map(user => ({
            id: user['$']?.id || user.id,
            username: user['$']?.username || user['$']?.title || user.username || user.title,
            email: user['$']?.email || user.email,
            thumb: user['$']?.thumb || user.thumb
        }));

        logger.debug('[Plex] Found shared users:', users.length);

        res.json(users);
    } catch (error) {
        logger.error('[Plex] Failed to get users:', error.message);
        res.status(500).json({ error: 'Failed to get Plex users' });
    }
});

/**
 * POST /api/plex/verify-user
 * Verify a Plex user has library access on the admin's server
 * Body: { plexUserId }
 * Returns: { valid: boolean, user }
 */
router.post('/verify-user', async (req, res) => {
    try {
        const { plexUserId, plexToken } = req.body;

        if (!plexUserId) {
            return res.status(400).json({ error: 'plexUserId is required' });
        }

        // Get SSO config with admin token
        const config = await getSystemConfig();
        const ssoConfig = config.plexSSO;

        if (!ssoConfig?.enabled || !ssoConfig?.adminToken) {
            return res.status(400).json({ error: 'Plex SSO not configured' });
        }

        const clientId = await getClientIdentifier();

        // Check if the Plex user is the admin themselves
        const isAdmin = plexUserId.toString() === ssoConfig.adminPlexId?.toString();

        let hasLibraryAccess = false;

        if (!isAdmin) {
            // Get users with library access from Plex.tv
            const usersResponse = await axios.get('https://plex.tv/api/users', {
                headers: {
                    'Accept': 'application/json',
                    'X-Plex-Token': ssoConfig.adminToken
                }
            });

            const sharedUsers = usersResponse.data?.MediaContainer?.User || [];
            const usersList = Array.isArray(sharedUsers) ? sharedUsers : [sharedUsers];

            hasLibraryAccess = usersList.some(
                sharedUser => (sharedUser?.['$']?.id?.toString() === plexUserId.toString()) ||
                    (sharedUser?.id?.toString() === plexUserId.toString())
            );
        }

        if (!isAdmin && !hasLibraryAccess) {
            logger.warn('[Plex] User does not have library access:', plexUserId);
            return res.json({ valid: false, reason: 'User does not have access to this Plex server' });
        }

        // Get user details if we have their token
        let user = null;
        if (plexToken) {
            const userResponse = await axios.get(
                `${PLEX_TV_API}/user`,
                { headers: getPlexHeaders(clientId, plexToken) }
            );
            user = {
                id: userResponse.data.id,
                username: userResponse.data.username,
                email: userResponse.data.email,
                thumb: userResponse.data.thumb
            };
        }

        logger.info('[Plex] User verified with library access:', plexUserId);

        res.json({ valid: true, isAdmin, user });
    } catch (error) {
        logger.error('[Plex] Failed to verify user:', error.message);
        res.status(500).json({ error: 'Failed to verify Plex user' });
    }
});

/**
 * POST /api/plex/sso/config
 * Save Plex SSO configuration (admin only)
 * Body: { enabled, adminToken, adminEmail, machineId, autoCreateUsers, defaultGroup, linkedUserId }
 */
router.post('/sso/config', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { enabled, adminToken, adminEmail, adminPlexId, machineId, autoCreateUsers, defaultGroup, linkedUserId } = req.body;

        const config = await getSystemConfig();
        const existingConfig = config.plexSSO || {};

        const newConfig = {
            ...existingConfig,
            enabled: enabled ?? existingConfig.enabled ?? false,
            adminToken: adminToken ?? existingConfig.adminToken,
            adminEmail: adminEmail ?? existingConfig.adminEmail,
            adminPlexId: adminPlexId ?? existingConfig.adminPlexId,
            machineId: machineId ?? existingConfig.machineId,
            autoCreateUsers: autoCreateUsers ?? existingConfig.autoCreateUsers ?? false,
            defaultGroup: defaultGroup ?? existingConfig.defaultGroup ?? 'user',
            linkedUserId: linkedUserId ?? existingConfig.linkedUserId
        };

        await updateSystemConfig({ plexSSO: newConfig });

        logger.info('[Plex] SSO config updated', { enabled: newConfig.enabled });

        // Return config without sensitive token
        res.json({
            ...newConfig,
            adminToken: newConfig.adminToken ? '[CONFIGURED]' : null
        });
    } catch (error) {
        logger.error('[Plex] Failed to save SSO config:', error.message);
        res.status(500).json({ error: 'Failed to save Plex SSO configuration' });
    }
});

/**
 * GET /api/plex/sso/config
 * Get Plex SSO configuration (admin only)
 */
router.get('/sso/config', requireAuth, requireAdmin, async (req, res) => {
    try {
        const config = await getSystemConfig();
        const ssoConfig = config.plexSSO || {};

        // Return config without sensitive token
        res.json({
            enabled: ssoConfig.enabled || false,
            adminEmail: ssoConfig.adminEmail,
            adminPlexId: ssoConfig.adminPlexId,
            machineId: ssoConfig.machineId,
            autoCreateUsers: ssoConfig.autoCreateUsers || false,
            defaultGroup: ssoConfig.defaultGroup || 'user',
            hasToken: !!ssoConfig.adminToken,
            clientIdentifier: ssoConfig.clientIdentifier,
            linkedUserId: ssoConfig.linkedUserId || ''
        });
    } catch (error) {
        logger.error('[Plex] Failed to get SSO config:', error.message);
        res.status(500).json({ error: 'Failed to get Plex SSO configuration' });
    }
});

/**
 * GET /api/plex/sso/status
 * Check if Plex SSO is enabled (public, for login page)
 */
router.get('/sso/status', async (req, res) => {
    try {
        const config = await getSystemConfig();
        const ssoConfig = config.plexSSO || {};

        res.json({
            enabled: ssoConfig.enabled || false
        });
    } catch (error) {
        logger.error('[Plex] Failed to get SSO status:', error.message);
        res.status(500).json({ error: 'Failed to get Plex SSO status' });
    }
});

/**
 * GET /api/plex/test
 * Test Plex server connection
 * Query: ?url=xxx&token=xxx
 */
router.get('/test', async (req, res) => {
    try {
        const { url, token } = req.query;

        if (!url || !token) {
            return res.status(400).json({ error: 'url and token are required' });
        }

        const clientId = await getClientIdentifier();

        // Test connection to the Plex server
        const response = await axios.get(`${url}/`, {
            headers: {
                'Accept': 'application/json',
                'X-Plex-Token': token,
                'X-Plex-Client-Identifier': clientId
            }
        });

        const serverName = response.data?.MediaContainer?.friendlyName || 'Plex Server';

        logger.debug('[Plex] Test connection successful:', serverName);

        res.json({
            success: true,
            serverName
        });
    } catch (error) {
        logger.error('[Plex] Test connection failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error || 'Connection failed'
        });
    }
});

module.exports = router;

