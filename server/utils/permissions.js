const { getSystemConfig } = require('../db/systemConfig');
const logger = require('./logger');

/**
 * Check if a user has a specific permission
 * @param {object} user - User object
 * @param {string} permission - Permission to check
 * @returns {Promise<boolean>} True if user has permission
 */
async function hasPermission(user, permission) {
    if (!user || !user.group) return false;

    try {
        const config = await getSystemConfig();
        const group = config.groups.find(g => g.id === user.group);

        if (!group) {
            logger.warn(`User ${user.username} belongs to unknown group ${user.group}`);
            return false;
        }

        // Ensure permissions array exists
        if (!group.permissions || !Array.isArray(group.permissions)) {
            logger.warn(`Group ${group.id} has invalid permissions array`);
            return false;
        }

        // Admin superuser check
        if (group.permissions.includes('*')) return true;

        // Check specific permission
        return group.permissions.includes(permission);
    } catch (error) {
        logger.error('Permission check failed', { error: error.message });
        return false;
    }
}

/**
 * Get all permissions for a user
 * @param {object} user - User object
 * @returns {Promise<string[]>} Array of permissions
 */
async function getUserPermissions(user) {
    if (!user || !user.group) return [];

    try {
        const config = await getSystemConfig();
        const group = config.groups.find(g => g.id === user.group);
        return group ? group.permissions : [];
    } catch (error) {
        logger.error('Failed to get user permissions', { error: error.message });
        return [];
    }
}

module.exports = {
    hasPermission,
    getUserPermissions
};
