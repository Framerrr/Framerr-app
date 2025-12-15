const express = require('express');
const router = express.Router();
const { hashPassword, verifyPassword } = require('../auth/password');
const { createUserSession, validateSession } = require('../auth/session');
const { getUser, getUserById, listUsers } = require('../db/users');
const { getSystemConfig } = require('../db/systemConfig');
const logger = require('../utils/logger');
const xml2js = require('xml2js');
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
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            logger.warn(`Login failed: Invalid password`, { username });
            return res.status(401).json({ error: 'Invalid username or password' });
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
        res.json({
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
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
            return res.json({
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    displayName: req.user.displayName,
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
        res.json({
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
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

        if (!isPlexAdmin) {
            // Verify user has library access on admin's Plex server
            // Use the /api/users endpoint which returns users with library sharing access
            // Note: This endpoint returns XML, not JSON
            const usersResponse = await axios.get('https://plex.tv/api/users', {
                headers: {
                    'X-Plex-Token': ssoConfig.adminToken
                }
            });

            // Parse XML response
            let usersList = [];
            try {
                const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
                const parsed = await parser.parseStringPromise(usersResponse.data);

                // Extract users from MediaContainer.User
                const users = parsed?.MediaContainer?.User;
                if (users) {
                    usersList = Array.isArray(users) ? users : [users];
                }

                logger.info('[PlexSSO] Parsed shared users:', {
                    count: usersList.length,
                    usernames: usersList.map(u => u.username || u.title).slice(0, 5).join(', '),
                    lookingForId: plexUser.id,
                    lookingForUsername: plexUser.username
                });
            } catch (parseError) {
                logger.error('[PlexSSO] Failed to parse users XML:', parseError.message);
                return res.status(500).json({ error: 'Failed to verify Plex access' });
            }

            const hasLibraryAccess = usersList.some(sharedUser => {
                const userId = sharedUser?.id;
                const matches = userId?.toString() === plexUser.id.toString();
                if (matches) {
                    logger.debug('[PlexSSO] Found matching user:', {
                        sharedUserId: userId,
                        sharedUsername: sharedUser?.username || sharedUser?.title
                    });
                }
                return matches;
            });

            if (!hasLibraryAccess) {
                logger.warn('[PlexSSO] User does not have library access', {
                    plexUserId: plexUser.id,
                    plexUsername: plexUser.username,
                    sharedUserCount: usersList.length
                });
                return res.status(403).json({ error: 'You do not have access to this Plex server' });
            }

            logger.info('[PlexSSO] User has library access', { plexUsername: plexUser.username });
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
            return res.status(403).json({ error: 'No matching user found and auto-creation is disabled' });
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
                displayName: user.displayName,
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

