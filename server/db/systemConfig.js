const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const SYSTEM_CONFIG_PATH = path.join(DATA_DIR, 'config.json');
// Default system configuration
const DEFAULT_CONFIG = {
    server: {
        port: 3001,
        name: 'Homelab Dashboard'
    },
    auth: {
        local: { enabled: true },
        proxy: {
            enabled: false,
            headerName: '',  // Empty by default - user must configure
            emailHeaderName: '',  // Empty by default - user must configure
            whitelist: [],  // Empty by default - user must configure
            overrideLogout: false,
            logoutUrl: ''  // Empty by default - user must configure
        },
        iframe: {
            enabled: false,
            endpoint: '',  // OAuth authorize endpoint
            clientId: '',  // OAuth client ID
            redirectUri: '',  // OAuth redirect URI (defaults to current origin + /login-complete)
            scopes: 'openid profile email'  // OAuth scopes
        },
        session: { timeout: 86400000 } // 24 hours
    },
    integrations: {
        plex: { enabled: false },
        sonarr: { enabled: false },
        radarr: { enabled: false },
        overseerr: { enabled: false },
        qbittorrent: { enabled: false }
    },
    groups: [
        {
            id: 'admin',
            name: 'Administrators',
            description: 'Full system access',
            permissions: ['*'],  // Superuser - all permissions
            locked: true
        },
        {
            id: 'user',
            name: 'Users',
            description: 'Personal customization',
            permissions: ['view_dashboard', 'manage_widgets'],  // Standard user permissions
            locked: true
        },
        {
            id: 'guest',
            name: 'Guests',
            description: 'View only',
            permissions: ['view_dashboard'],  // Read-only access
            locked: true
        }
    ],
    defaultGroup: 'user',
    tabGroups: [
        { id: 'media', name: 'Media', order: 0 },
        { id: 'downloads', name: 'Downloads', order: 1 },
        { id: 'system', name: 'System', order: 2 }
    ]
};
/**
 * Initialize system config if it doesn't exist
 */
async function initSystemConfig() {
    try {
        await fs.access(SYSTEM_CONFIG_PATH);
    } catch {
        logger.info('Initializing system config...');
        try {
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.writeFile(SYSTEM_CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
            logger.info('System config created at ' + SYSTEM_CONFIG_PATH);
        } catch (error) {
            logger.error('Failed to initialize system config', { error: error.message });
            throw error;
        }
    }
}
/**
 * Read system configuration
 * @returns {Promise<object>} System configuration
 */
async function getSystemConfig() {
    await initSystemConfig();
    try {
        const data = await fs.readFile(SYSTEM_CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to read system config', { error: error.message });
        throw error;
    }
}
/**
 * Update system configuration
 * @param {object} updates - Partial updates to apply
 * @returns {Promise<object>} Updated configuration
 */
async function updateSystemConfig(updates) {
    const currentConfig = await getSystemConfig();
    // VALIDATION: Prevent modification/deletion of system groups
    if (updates.groups) {
        throw new Error('Permission groups cannot be modified. Groups are locked to: admin, user, guest');
    }
    // Build new config explicitly to avoid merge issues
    const newConfig = {
        server: { ...currentConfig.server, ...(updates.server || {}) },
        auth: {
            local: { ...currentConfig.auth?.local, ...(updates.auth?.local || {}) },
            session: { ...currentConfig.auth?.session, ...(updates.auth?.session || {}) },
            proxy: { ...currentConfig.auth?.proxy, ...(updates.auth?.proxy || {}) },
            iframe: { ...currentConfig.auth?.iframe, ...(updates.auth?.iframe || {}) }
        },
        integrations: { ...currentConfig.integrations, ...(updates.integrations || {}) },
        debug: { ...currentConfig.debug, ...(updates.debug || {}) },
        favicon: updates.favicon !== undefined ? updates.favicon : currentConfig.favicon, // Support null to delete
        groups: currentConfig.groups,  // Always preserve locked groups
        defaultGroup: updates.defaultGroup || currentConfig.defaultGroup,
        tabGroups: updates.tabGroups || currentConfig.tabGroups
    };
    try {
        await fs.writeFile(SYSTEM_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
        logger.info('System configuration updated');
        return newConfig;
    } catch (error) {
        logger.error('Failed to update system config', { error: error.message });
        throw error;
    }
};
module.exports = {
    getSystemConfig,
    updateSystemConfig,
    DEFAULT_CONFIG
};
