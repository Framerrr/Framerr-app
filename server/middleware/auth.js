const { hasPermission } = require('../utils/permissions');
const logger = require('../utils/logger');

/**
 * Middleware to require authentication
 */
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
            }
        });
    }
    next();
};

/**
 * Middleware to require Admin group specifically
 * (Shortcut for checking '*' permission or 'admin' group)
 */
const requireAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if group is admin OR has wildcard permission
    const isExactAdmin = req.user.group === 'admin';
    const hasWildcard = await hasPermission(req.user, '*');

    if (!isExactAdmin && !hasWildcard) {
        logger.warn(`Admin access denied for user ${req.user.username}`);
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

module.exports = {
    requireAuth,
    requireAdmin
};
