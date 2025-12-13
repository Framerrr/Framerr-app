const logger = require('../utils/logger');
const { getUserById } = require('./users');
const { db } = require('../database/db');

// Default user dashboard configuration
const DEFAULT_USER_CONFIG = {
    dashboard: {
        layout: [],
        widgets: []
    },
    tabs: [], // User's personal sidebar tabs
    theme: {
        mode: 'system', // light, dark, system
        primaryColor: '#3b82f6'
    },
    sidebar: {
        collapsed: false
    },
    preferences: {
        dashboardGreeting: {
            enabled: true,
            text: 'Your personal dashboard'
        }
    }
};

/**
 * Get user configuration
 * @param {string} userId - User ID
 * @returns {Promise<object>} User configuration
 */
async function getUserConfig(userId) {
    try {
        // Verify user exists first
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Try to get config from database
        const result = db.prepare(`
            SELECT dashboard_config, tabs, theme_config, sidebar_config, preferences
            FROM user_preferences
            WHERE user_id = ?
        `).get(userId);

        if (!result) {
            // Return default config if no personal config exists
            logger.debug(`No config found for user ${userId}, returning default`);
            return DEFAULT_USER_CONFIG;
        }

        // Parse JSON columns and build config object
        return {
            dashboard: result.dashboard_config ? JSON.parse(result.dashboard_config) : DEFAULT_USER_CONFIG.dashboard,
            tabs: result.tabs ? JSON.parse(result.tabs) : DEFAULT_USER_CONFIG.tabs,
            theme: result.theme_config ? JSON.parse(result.theme_config) : DEFAULT_USER_CONFIG.theme,
            sidebar: result.sidebar_config ? JSON.parse(result.sidebar_config) : DEFAULT_USER_CONFIG.sidebar,
            preferences: result.preferences ? JSON.parse(result.preferences) : DEFAULT_USER_CONFIG.preferences
        };
    } catch (error) {
        logger.error('Failed to get user config', { error: error.message, userId });
        throw error;
    }
}

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
    }

    return output;
}

/**
 * Check if value is an object
 * @param {*} item - Value to check
 * @returns {boolean}
 */
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Update user configuration
 * @param {string} userId - User ID
 * @param {object} updates - Configuration updates
 * @returns {Promise<object>} Updated configuration
 */
async function updateUserConfig(userId, updates) {
    try {
        // Verify user exists
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const currentConfig = await getUserConfig(userId);
        // Use deep merge to properly handle nested objects
        const newConfig = deepMerge(currentConfig, updates);

        // Check if user_preferences record exists
        const exists = db.prepare(`
            SELECT user_id FROM user_preferences WHERE user_id = ?
        `).get(userId);

        if (exists) {
            // Update existing record
            const stmt = db.prepare(`
                UPDATE user_preferences
                SET dashboard_config = ?,
                    tabs = ?,
                    theme_config = ?,
                    sidebar_config = ?,
                    preferences = ?
                WHERE user_id = ?
            `);

            stmt.run(
                JSON.stringify(newConfig.dashboard),
                JSON.stringify(newConfig.tabs),
                JSON.stringify(newConfig.theme),
                JSON.stringify(newConfig.sidebar),
                JSON.stringify(newConfig.preferences),
                userId
            );
        } else {
            // Insert new record
            const stmt = db.prepare(`
                INSERT INTO user_preferences (
                    user_id, dashboard_config, tabs, theme_config, sidebar_config, preferences
                ) VALUES (?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                userId,
                JSON.stringify(newConfig.dashboard),
                JSON.stringify(newConfig.tabs),
                JSON.stringify(newConfig.theme),
                JSON.stringify(newConfig.sidebar),
                JSON.stringify(newConfig.preferences)
            );
        }

        logger.debug(`Configuration updated for user ${user.username}`);
        return newConfig;
    } catch (error) {
        logger.error('Failed to update user config', { error: error.message, userId });
        throw error;
    }
}

/**
 * Generate URL-friendly slug from tab name
 * @param {string} name - Tab name
 * @returns {string} Slug
 */
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Get user's tabs
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of tabs
 */
async function getUserTabs(userId) {
    const config = await getUserConfig(userId);
    return config.tabs || [];
}

/**
 * Add tab to user's config
 * @param {string} userId - User ID
 * @param {object} tabData - Tab data (name, url, icon)
 * @returns {Promise<object>} Created tab
 */
async function addUserTab(userId, tabData) {
    const { v4: uuidv4 } = require('uuid');
    const config = await getUserConfig(userId);

    const tab = {
        id: uuidv4(),
        name: tabData.name,
        url: tabData.url,
        icon: tabData.icon || 'Server',
        slug: generateSlug(tabData.name),
        enabled: tabData.enabled !== false,
        order: config.tabs?.length || 0,
        createdAt: new Date().toISOString()
    };

    const tabs = config.tabs || [];
    tabs.push(tab);

    await updateUserConfig(userId, { tabs });

    logger.info(`Tab created for user ${userId}`, { tabId: tab.id, tabName: tab.name });
    return tab;
}

/**
 * Update user's tab
 * @param {string} userId - User ID
 * @param {string} tabId - Tab ID
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>} Updated tab
 */
async function updateUserTab(userId, tabId, updates) {
    const config = await getUserConfig(userId);
    const tabs = config.tabs || [];
    const tabIndex = tabs.findIndex(t => t.id === tabId);

    if (tabIndex === -1) {
        throw new Error('Tab not found');
    }

    // If name changed, regenerate slug
    if (updates.name && updates.name !== tabs[tabIndex].name) {
        updates.slug = generateSlug(updates.name);
    }

    tabs[tabIndex] = {
        ...tabs[tabIndex],
        ...updates
    };

    await updateUserConfig(userId, { tabs });

    logger.info(`Tab updated for user ${userId}`, { tabId });
    return tabs[tabIndex];
}

/**
 * Delete user's tab
 * @param {string} userId - User ID
 * @param {string} tabId - Tab ID
 * @returns {Promise<boolean>} Success
 */
async function deleteUserTab(userId, tabId) {
    const config = await getUserConfig(userId);
    const tabs = config.tabs || [];
    const filteredTabs = tabs.filter(t => t.id !== tabId);

    if (filteredTabs.length === tabs.length) {
        throw new Error('Tab not found');
    }

    await updateUserConfig(userId, { tabs: filteredTabs });

    logger.info(`Tab deleted for user ${userId}`, { tabId });
    return true;
}

/**
 * Reorder user's tabs
 * @param {string} userId - User ID
 * @param {array} orderedIds - Array of tab IDs in desired order
 * @returns {Promise<array>} Reordered tabs
 */
async function reorderUserTabs(userId, orderedIds) {
    const config = await getUserConfig(userId);
    const tabs = config.tabs || [];

    // Create new array in specified order
    const reorderedTabs = orderedIds.map((id, index) => {
        const tab = tabs.find(t => t.id === id);
        if (!tab) throw new Error(`Tab ${id} not found`);
        return { ...tab, order: index };
    });

    await updateUserConfig(userId, { tabs: reorderedTabs });

    logger.info(`Tabs reordered for user ${userId}`);
    return reorderedTabs;
}

module.exports = {
    getUserConfig,
    updateUserConfig,
    getUserTabs,
    addUserTab,
    updateUserTab,
    deleteUserTab,
    reorderUserTabs,
    DEFAULT_USER_CONFIG
};
