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

<<<<<<< HEAD
        // groups is stored as object {"admin":{...},"user":{...}} in database
        const group = config.groups[user.group];
=======
        // Handle both array format (new) and object format (legacy)
        // Array: [{id: 'admin', ...}, {id: 'user', ...}]
        // Object: {'admin': {...}, 'user': {...}}
        let group;
        if (Array.isArray(config.groups)) {
            group = config.groups.find(g => g.id === user.group);
        } else {
            group = config.groups[user.group];
        }
>>>>>>> develop

        if (!group) {
            logger.warn(`User ${user.username} belongs to unknown group ${user.group}`);
            return false;
        }

        // Ensure permissions array exists
        if (!group.permissions || !Array.isArray(group.permissions)) {
            logger.warn(`Group ${user.group} has invalid permissions array`);
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
<<<<<<< HEAD
        // groups is stored as object {"admin":{...},"user":{...}}
        const group = config.groups[user.group];
=======

        // Handle both array format (new) and object format (legacy)
        let group;
        if (Array.isArray(config.groups)) {
            group = config.groups.find(g => g.id === user.group);
        } else {
            group = config.groups[user.group];
        }

>>>>>>> develop
        return group && group.permissions ? group.permissions : [];
    } catch (error) {
        logger.error('Failed to get user permissions', { error: error.message });
        return [];
    }
}

module.exports = {
    hasPermission,
    getUserPermissions
};
