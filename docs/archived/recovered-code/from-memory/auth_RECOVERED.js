const express = require('express');
const router = express.Router();
const { hashPassword, verifyPassword } = require('../auth/password');
const { createUserSession, validateSession } = require('../auth/session');
const { getUser, getUserById, listUsers } = require('../db/users');
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
        // Check proxy auth first (req.user set by session middleware)
        if (req.user) {
            logger.debug('[Auth] /me: Using proxy auth user', { username: req.user.username });
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
module.exports = router;
