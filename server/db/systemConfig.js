const { db } = require('../database/db');
const logger = require('../utils/logger');

// In-memory cache to prevent repeated database queries
let configCache = null;
let cacheTimestamp = null;

// Default system configuration
const DEFAULT_CONFIG = {
    server: {
        port: 3001,
        name: 'Framerr'
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
    ],
    webPushEnabled: true  // Global toggle for Web Push notifications
};

/**
 * Helper: Rebuild nested config object from flattened key-value pairs
 */
function buildConfigFromKeyValues(rows) {
    const config = { ...DEFAULT_CONFIG };

    for (const row of rows) {
        const { key, value } = row;
        const parsed = JSON.parse(value);

        // Map keys to config structure
        switch (key) {
            case 'server':
                config.server = { ...config.server, ...parsed };
                break;
            case 'auth.local':
                config.auth.local = { ...config.auth.local, ...parsed };
                break;
            case 'auth.proxy':
                config.auth.proxy = { ...config.auth.proxy, ...parsed };
                break;
            case 'auth.iframe':
                config.auth.iframe = { ...config.auth.iframe, ...parsed };
                break;
            case 'auth.session':
                config.auth.session = { ...config.auth.session, ...parsed };
                break;
            case 'integrations':
                config.integrations = { ...config.integrations, ...parsed };
                break;
            case 'groups':
                config.groups = parsed;
                break;
            case 'defaultGroup':
                config.defaultGroup = parsed;
                break;
            case 'tabGroups':
                config.tabGroups = parsed;
                break;
            case 'debug':
                config.debug = parsed;
                break;
            case 'favicon':
                config.favicon = parsed;
                break;
<<<<<<< HEAD
=======
            case 'plexSSO':
                config.plexSSO = parsed;
                break;
            case 'webhookBaseUrl':
                config.webhookBaseUrl = parsed;
                break;
            case 'vapidKeys':
                config.vapidKeys = parsed;
                break;
            case 'webPushEnabled':
                config.webPushEnabled = parsed;
                break;
>>>>>>> develop
        }
    }

    return config;
}

/**
 * Read system configuration from SQLite (with in-memory caching)
 * @returns {Promise<object>} System configuration
 */
async function getSystemConfig() {
    try {
        // Return cached config if available
        if (configCache !== null) {
            return configCache;
        }

        const rows = db.prepare('SELECT key, value FROM system_config').all();

        // If no config exists, cache and return defaults
        if (rows.length === 0) {
            logger.info('No system config in database, returning defaults');
            configCache = DEFAULT_CONFIG;
            cacheTimestamp = Date.now();
            return DEFAULT_CONFIG;
        }

        const config = buildConfigFromKeyValues(rows);

        // Cache the config
        configCache = config;
        cacheTimestamp = Date.now();
        logger.debug('System config loaded and cached', { timestamp: cacheTimestamp });

        return config;
    } catch (error) {
        logger.error('Failed to read system config from database', { error: error.message });
        throw error;
    }
}

/**
<<<<<<< HEAD
=======
 * Deep merge integration configs to preserve nested properties like webhookConfig
 * @param {object} current - Current integrations config
 * @param {object} updates - Integration updates
 * @returns {object} Merged integrations
 */
function deepMergeIntegrations(current, updates) {
    if (!updates) return current || {};

    const merged = { ...current };

    for (const [key, value] of Object.entries(updates)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Deep merge objects (like individual integration configs)
            merged[key] = {
                ...(merged[key] || {}),
                ...value,
                // Special handling for webhookConfig to preserve all nested properties
                webhookConfig: value.webhookConfig !== undefined
                    ? { ...(merged[key]?.webhookConfig || {}), ...value.webhookConfig }
                    : merged[key]?.webhookConfig
            };
        } else {
            merged[key] = value;
        }
    }

    return merged;
}

/**
>>>>>>> develop
 * Update system configuration in SQLite
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
        integrations: deepMergeIntegrations(currentConfig.integrations, updates.integrations),
        debug: { ...currentConfig.debug, ...(updates.debug || {}) },
        favicon: updates.favicon !== undefined ? updates.favicon : currentConfig.favicon, // Support null to delete
        groups: currentConfig.groups,  // Always preserve locked groups
        defaultGroup: updates.defaultGroup || currentConfig.defaultGroup,
        tabGroups: updates.tabGroups || currentConfig.tabGroups,
        plexSSO: updates.plexSSO ? { ...currentConfig.plexSSO, ...updates.plexSSO } : currentConfig.plexSSO,
        webhookBaseUrl: updates.webhookBaseUrl !== undefined ? updates.webhookBaseUrl : currentConfig.webhookBaseUrl,
        vapidKeys: updates.vapidKeys ? { ...currentConfig.vapidKeys, ...updates.vapidKeys } : currentConfig.vapidKeys,
        webPushEnabled: updates.webPushEnabled !== undefined ? updates.webPushEnabled : currentConfig.webPushEnabled
    };

    try {
        // Prepare UPSERT statements for each top-level config key
        const upsert = db.prepare(`
            INSERT INTO system_config (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);

        // Update all config sections as separate key-value pairs
        const updateMany = db.transaction(() => {
            if (updates.server) {
                upsert.run('server', JSON.stringify(newConfig.server));
            }
            if (updates.auth?.local) {
                upsert.run('auth.local', JSON.stringify(newConfig.auth.local));
            }
            if (updates.auth?.proxy) {
                upsert.run('auth.proxy', JSON.stringify(newConfig.auth.proxy));
            }
            if (updates.auth?.iframe) {
                upsert.run('auth.iframe', JSON.stringify(newConfig.auth.iframe));
            }
            if (updates.auth?.session) {
                upsert.run('auth.session', JSON.stringify(newConfig.auth.session));
            }
            if (updates.integrations) {
                upsert.run('integrations', JSON.stringify(newConfig.integrations));
            }
            if (updates.debug) {
                upsert.run('debug', JSON.stringify(newConfig.debug));
            }
            if (updates.favicon !== undefined) {
                upsert.run('favicon', JSON.stringify(newConfig.favicon));
            }
            if (updates.defaultGroup) {
                upsert.run('defaultGroup', JSON.stringify(newConfig.defaultGroup));
            }
            if (updates.tabGroups) {
                upsert.run('tabGroups', JSON.stringify(newConfig.tabGroups));
            }
<<<<<<< HEAD
=======
            if (updates.plexSSO) {
                upsert.run('plexSSO', JSON.stringify(newConfig.plexSSO));
            }
            if (updates.webhookBaseUrl !== undefined) {
                upsert.run('webhookBaseUrl', JSON.stringify(newConfig.webhookBaseUrl));
            }
            if (updates.vapidKeys) {
                upsert.run('vapidKeys', JSON.stringify(newConfig.vapidKeys));
            }
            if (updates.webPushEnabled !== undefined) {
                upsert.run('webPushEnabled', JSON.stringify(newConfig.webPushEnabled));
            }
>>>>>>> develop
        });

        updateMany();

        // Invalidate cache after update
        configCache = null;
        cacheTimestamp = null;
        logger.info('System configuration updated in database (cache invalidated)');

        return newConfig;
    } catch (error) {
        logger.error('Failed to update system config in database', { error: error.message });
        throw error;
    }
}

module.exports = {
    getSystemConfig,
    updateSystemConfig,
    DEFAULT_CONFIG
};
