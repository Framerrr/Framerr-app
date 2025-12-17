const express = require('express');
const router = express.Router();
const { hashPassword, verifyPassword } = require('../auth/password');
const { createUserSession, validateSession } = require('../auth/session');
const { getUser, getUserById, listUsers } = require('../db/users');
const { getUserConfig } = require('../db/userConfig');
const { getSystemConfig } = require('../db/systemConfig');
const logger = require('../utils/logger');
// Get auth config helper
// In real app this would come from system config
const getAuthConfig = async () => {
    const config = await getSystemConfig();
    return config.auth;
};
/**
 * POST /api/auth/login
 * Login with username/password
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;
        const authConfig = await getAuthConfig();
        if (!authConfig.local.enabled) {
            return res.status(403).json({ error: 'Local authentication is disabled' });
        }
        const user = await getUser(username);
        if (!user) {
            logger.warn(`Login failed: User not found`, { username });
            return res.status(401).json({ error: 'Login failed. Please check your credentials and try again.' });
        }
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            logger.warn(`Login failed: Invalid password`, { username });
            return res.status(401).json({ error: 'Login failed. Please check your credentials and try again.' });
        }
        // Create session
        const expiresIn = rememberMe
            ? (authConfig.session.rememberMeDuration || 2592000000) // 30 days
            : (authConfig.session.timeout || 86400000); // 24 hours
        const session = await createUserSession(user, req, expiresIn);
        // Set cookie
        res.cookie('sessionId', session.id, {
            httpOnly: true,
            secure: false, // Allow HTTP for Docker/IP access
            sameSite: 'lax',
            maxAge: expiresIn
        });
        logger.info(`User logged in: ${username}`);

        // Fetch displayName from preferences
        const config = await getUserConfig(user.id);
        const displayName = config.preferences?.displayName || user.displayName || user.username;

        res.json({
            user: {
                id: user.id,
                username: user.username,
                displayName,
                group: user.group,
                preferences: user.preferences
            }
        });
    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ error: 'Login failed' });
    }
});
/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId;
        if (sessionId) {
            const { revokeSession } = require('../db/users');
            await revokeSession(sessionId);
        }
        res.clearCookie('sessionId');
        // Check if proxy auth redirect is configured (read fresh config)
        const systemConfig = await getSystemConfig();
        const proxy = systemConfig?.auth?.proxy || {};
        if (proxy.enabled && proxy.overrideLogout && proxy.logoutUrl) {
            return res.json({
                success: true,
                redirectUrl: proxy.logoutUrl
            });
        }
        res.json({ success: true });
    } catch (error) {
        logger.error('Logout error', { error: error.message });
        res.status(500).json({ error: 'Logout failed' });
    }
});
/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', async (req, res) => {
    try {
        // Check if user is already authenticated (via session or proxy auth middleware)
        if (req.user) {
            // Log authentication method accurately
            const authMethod = req.proxyAuth ? 'proxy auth' : 'session';
            logger.debug(`[Auth] /me: Authenticated user via ${authMethod}`, { username: req.user.username });
<<<<<<< HEAD
=======

            // Fetch displayName from preferences
            const config = await getUserConfig(req.user.id);
            const displayName = config.preferences?.displayName || req.user.displayName || req.user.username;

>>>>>>> develop
            return res.json({
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    displayName,
                    group: req.user.group,
                    preferences: req.user.preferences
                }
            });
        }
        // Fall back to session-based auth
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const session = await validateSession(sessionId);
        if (!session) {
            res.clearCookie('sessionId');
            return res.status(401).json({ error: 'Session invalid or expired' });
        }
        const user = await getUserById(session.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        // Attach user to request for middleware use (if this was middleware)
        req.user = user;

        // Fetch displayName from preferences
        const config = await getUserConfig(user.id);
        const displayName = config.preferences?.displayName || user.displayName || user.username;

        res.json({
            user: {
                id: user.id,
                username: user.username,
                displayName,
                group: user.group,
                preferences: user.preferences
            }
        });
    } catch (error) {
        logger.error('Auth check error', { error: error.message });
        res.status(500).json({ error: 'Auth check failed' });
    }
});

/**
 * POST /api/auth/plex-login
 * Login with Plex SSO
 */
router.post('/plex-login', async (req, res) => {
    try {
        const { plexToken, plexUserId } = req.body;

        if (!plexToken || !plexUserId) {
            return res.status(400).json({ error: 'Plex token and user ID are required' });
        }

        // Get SSO config
        const systemConfig = await getSystemConfig();
        const ssoConfig = systemConfig.plexSSO;

        if (!ssoConfig?.enabled) {
            return res.status(403).json({ error: 'Plex SSO is not enabled' });
        }

        // Verify user is on admin's Plex server
        const axios = require('axios');
        const clientId = ssoConfig.clientIdentifier;

        // Get user info from Plex
        const userResponse = await axios.get('https://plex.tv/api/v2/user', {
            headers: {
                'Accept': 'application/json',
                'X-Plex-Token': plexToken,
                'X-Plex-Client-Identifier': clientId
            }
        });

        const plexUser = userResponse.data;

        // Check if this Plex user is the admin or has library access
        const isPlexAdmin = plexUser.id.toString() === ssoConfig.adminPlexId?.toString();

        logger.info('[PlexSSO] Checking user access:', {
            plexUserId: plexUser.id,
            plexUsername: plexUser.username,
            adminPlexId: ssoConfig.adminPlexId,
            isPlexAdmin,
            machineId: ssoConfig.machineId
        });

        if (!isPlexAdmin) {
            // Verify user has library access on the specific Plex server
            // Use /api/v2/shared_servers/{machineId} which returns ONLY users with library access
            // NOT /api/users which returns ALL friends (including those without library access)

            if (!ssoConfig.machineId) {
                logger.error('[PlexSSO] No machine ID configured');
                return res.status(500).json({ error: 'Plex server not configured' });
            }

            let sharedUsers = [];
            try {
                // Correct URL: /api/servers/{machineId}/shared_servers (NOT /api/v2/shared_servers/{machineId})
                const sharedServersResponse = await axios.get(
                    `https://plex.tv/api/servers/${ssoConfig.machineId}/shared_servers`,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'X-Plex-Token': ssoConfig.adminToken,
                            'X-Plex-Client-Identifier': clientId
                        }
                    }
                );

                // Log raw response for debugging - using INFO level to ensure visibility
                const responseData = sharedServersResponse.data;
                logger.info('[PlexSSO] shared_servers raw response:', {
                    status: sharedServersResponse.status,
                    dataType: typeof responseData,
                    sampleData: (typeof responseData === 'string' ? responseData : JSON.stringify(responseData)).substring(0, 500)
                });

                // API returns XML, not JSON - need to parse it
                if (typeof responseData === 'string' && responseData.includes('<?xml')) {
                    const xml2js = require('xml2js');
                    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
                    const parsed = await parser.parseStringPromise(responseData);

                    // Extract SharedServer entries from MediaContainer
                    const sharedServers = parsed?.MediaContainer?.SharedServer;
                    if (sharedServers) {
                        sharedUsers = Array.isArray(sharedServers) ? sharedServers : [sharedServers];
                    }

                    logger.info('[PlexSSO] Parsed XML shared users:', {
                        count: sharedUsers.length,
                        userIds: sharedUsers.map(u => u.userID).slice(0, 10).join(', ')
                    });
                } else if (responseData?.MediaContainer?.SharedServer) {
                    // JSON response (fallback)
                    const sharedServers = responseData.MediaContainer.SharedServer;
                    sharedUsers = Array.isArray(sharedServers) ? sharedServers : [sharedServers];
                }
            } catch (apiError) {
                logger.error('[PlexSSO] Failed to fetch shared servers:', {
                    error: apiError.message,
                    status: apiError.response?.status,
                    data: JSON.stringify(apiError.response?.data || {}).substring(0, 500)
                });
                return res.status(500).json({ error: 'Failed to verify library access' });
            }

            logger.info('[PlexSSO] Checking library access:', {
                machineId: ssoConfig.machineId,
                sharedUserCount: sharedUsers.length,
                sharedUsernames: sharedUsers.map(u => u.username || u.email).slice(0, 5).join(', '),
                lookingForId: plexUser.id,
                lookingForUsername: plexUser.username,
                // Log first user structure for debugging
                firstUserFields: sharedUsers.length > 0 ? Object.keys(sharedUsers[0]).join(', ') : 'none'
            });

            // Check if logging-in user has library access on this server
            const hasLibraryAccess = sharedUsers.some(sharedUser => {
                // Different API versions use different field names: userID, invitedId, or id
                const sharedUserId = sharedUser.userID || sharedUser.invitedId || sharedUser.id;
                const matches = sharedUserId?.toString() === plexUser.id.toString();
                if (matches) {
                    logger.debug('[PlexSSO] Found matching shared user:', {
                        userId: sharedUserId,
                        username: sharedUser.username || sharedUser.email
                    });
                }
                return matches;
            });

            if (!hasLibraryAccess) {
                logger.warn('[PlexSSO] User does not have library access on this server', {
                    plexUserId: plexUser.id,
                    plexUsername: plexUser.username,
                    machineId: ssoConfig.machineId,
                    sharedUserCount: sharedUsers.length
                });
                return res.status(403).json({ error: 'Login failed. Please check your credentials and try again.' });
            }

            logger.info('[PlexSSO] User has library access', { plexUsername: plexUser.username });
        } else {
            logger.info('[PlexSSO] User is Plex admin, skipping library access check', { plexUsername: plexUser.username });
        }

        // Find or create Framerr user for this Plex user
        const { findUserByExternalId, linkAccount } = require('../db/linkedAccounts');
        let user;

        // Check if user already has a linked Plex account
        const linkedUserId = findUserByExternalId('plex', plexUser.id.toString());

        if (linkedUserId) {
            // Existing linked user - use that account
            user = await getUserById(linkedUserId);
            logger.debug('[PlexSSO] Found existing linked account', { plexUsername: plexUser.username, framerUser: user?.username });
        } else if (isPlexAdmin && ssoConfig.linkedUserId) {
            // Plex admin logging in - map to the configured Framerr admin user
            user = await getUserById(ssoConfig.linkedUserId);
            if (user) {
                // Link this Plex account to the Framerr admin
                linkAccount(user.id, 'plex', {
                    externalId: plexUser.id.toString(),
                    externalUsername: plexUser.username,
                    externalEmail: plexUser.email,
                    metadata: { thumb: plexUser.thumb }
                });
                logger.info('[PlexSSO] Linked Plex admin to Framerr user', { plexUsername: plexUser.username, framerUser: user.username });
            }
        } else {
            // Try to find existing user by username match
            user = await getUser(plexUser.username);

            if (!user && ssoConfig.autoCreateUsers) {
                // Auto-create new user
                const { createUser } = require('../db/users');
                const { hashPassword } = require('../auth/password');
                const { v4: uuidv4 } = require('uuid');

                // Generate random password (user will log in via Plex)
                const passwordHash = await hashPassword(uuidv4());

                user = await createUser({
                    username: plexUser.username,
                    email: plexUser.email || `${plexUser.username}@plex.local`,
                    passwordHash,
                    displayName: plexUser.username,
                    group: ssoConfig.defaultGroup || 'user'
                });

                logger.info('[PlexSSO] Created new user', { username: plexUser.username });
            }

            if (user) {
                // Link Plex account to user
                linkAccount(user.id, 'plex', {
                    externalId: plexUser.id.toString(),
                    externalUsername: plexUser.username,
                    externalEmail: plexUser.email,
                    metadata: { thumb: plexUser.thumb }
                });
            }
        }

        if (!user) {
            logger.warn('[PlexSSO] No matching user found and auto-creation is disabled', { plexUsername: plexUser.username });
            return res.status(403).json({ error: 'Login failed. Please check your credentials and try again.' });
        }

        // Create session
        const expiresIn = systemConfig.auth?.session?.timeout || 86400000;
        const session = await createUserSession(user, req, expiresIn);

        res.cookie('sessionId', session.id, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: expiresIn
        });

        logger.info(`[PlexSSO] User logged in: ${user.username}`);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName || user.username,
                group: user.group,
                preferences: user.preferences
            }
        });

    } catch (error) {
        logger.error('[PlexSSO] Login error', { error: error.message });
        res.status(500).json({ error: 'Plex login failed' });
    }
});

module.exports = router;

