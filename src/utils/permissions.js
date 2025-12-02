/**
 * Frontend Permission Utilities
 * Mirrors backend logic for UI conditional rendering
 */

/**
 * Check if a user has a specific permission
 * @param {object} user - User object
 * @param {string} permission - Permission to check
 * @param {object} systemConfig - System configuration (containing groups)
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (user, permission, systemConfig) => {
    if (!user || !user.group) return false;
    if (!systemConfig || !systemConfig.groups) return false;

    const group = systemConfig.groups.find(g => g.id === user.group);
    if (!group) return false;

    // Admin superuser check
    if (group.permissions.includes('*')) return true;

    // Check specific permission
    return group.permissions.includes(permission);
};

/**
 * Common permissions constants
 */
export const PERMISSIONS = {
    VIEW_DASHBOARD: 'view_dashboard',
    MANAGE_WIDGETS: 'manage_widgets',
    MANAGE_SYSTEM: 'manage_system',
    MANAGE_USERS: 'manage_users'
};

/**
 * Check if user is admin (has wildcard permission)
 * @param {object} user - User object
 * @param {object} systemConfig - System configuration
 * @returns {boolean} True if user is admin
 */
export const isAdmin = (user, systemConfig) => {
    if (!user || !user.group) return false;
    if (!systemConfig || !systemConfig.groups) return false;

    const group = systemConfig.groups.find(g => g.id === user.group);
    return group && group.permissions.includes('*');
};
