import logger from '../utils/logger';
import { getUserById } from './users';
import { db } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

interface DashboardConfig {
    layout: unknown[];
    widgets: unknown[];
}

interface ThemeConfig {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
}

interface SidebarConfig {
    collapsed: boolean;
}

interface DashboardGreeting {
    enabled: boolean;
    text: string;
}

interface Preferences {
    dashboardGreeting: DashboardGreeting;
    [key: string]: unknown;
}

interface UserTab {
    id: string;
    name: string;
    url: string;
    icon: string;
    slug: string;
    enabled: boolean;
    order: number;
    createdAt: string;
}

interface UserConfig {
    dashboard: DashboardConfig;
    tabs: UserTab[];
    theme: ThemeConfig;
    sidebar: SidebarConfig;
    preferences: Preferences;
}

interface UserPreferencesRow {
    user_id: string;
    dashboard_config: string | null;
    tabs: string | null;
    theme_config: string | null;
    sidebar_config: string | null;
    preferences: string | null;
}

// Default user dashboard configuration
const DEFAULT_USER_CONFIG: UserConfig = {
    dashboard: {
        layout: [],
        widgets: []
    },
    tabs: [],
    theme: {
        mode: 'system',
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
 */
export async function getUserConfig(userId: string): Promise<UserConfig> {
    try {
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const result = db.prepare(`
            SELECT dashboard_config, tabs, theme_config, sidebar_config, preferences
            FROM user_preferences
            WHERE user_id = ?
        `).get(userId) as UserPreferencesRow | undefined;

        if (!result) {
            logger.debug(`No config found for user ${userId}, returning default`);
            return DEFAULT_USER_CONFIG;
        }

        return {
            dashboard: result.dashboard_config ? JSON.parse(result.dashboard_config) : DEFAULT_USER_CONFIG.dashboard,
            tabs: result.tabs ? JSON.parse(result.tabs) : DEFAULT_USER_CONFIG.tabs,
            theme: result.theme_config ? JSON.parse(result.theme_config) : DEFAULT_USER_CONFIG.theme,
            sidebar: result.sidebar_config ? JSON.parse(result.sidebar_config) : DEFAULT_USER_CONFIG.sidebar,
            preferences: result.preferences ? JSON.parse(result.preferences) : DEFAULT_USER_CONFIG.preferences
        };
    } catch (error) {
        logger.error('Failed to get user config', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Check if value is an object
 */
function isObject(item: unknown): item is Record<string, unknown> {
    return Boolean(item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const output = { ...target } as T;

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            const sourceValue = source[key as keyof typeof source];
            if (isObject(sourceValue)) {
                if (!(key in target)) {
                    (output as Record<string, unknown>)[key] = sourceValue;
                } else {
                    (output as Record<string, unknown>)[key] = deepMerge(
                        target[key as keyof T] as Record<string, unknown>,
                        sourceValue as Record<string, unknown>
                    );
                }
            } else {
                (output as Record<string, unknown>)[key] = sourceValue;
            }
        });
    }

    return output;
}

/**
 * Update user configuration
 */
export async function updateUserConfig(userId: string, updates: Partial<UserConfig>): Promise<UserConfig> {
    try {
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const currentConfig = await getUserConfig(userId);
        const newConfig = deepMerge(currentConfig as unknown as Record<string, unknown>, updates as unknown as Record<string, unknown>) as unknown as UserConfig;

        const exists = db.prepare(`
            SELECT user_id FROM user_preferences WHERE user_id = ?
        `).get(userId);

        if (exists) {
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
        logger.error('Failed to update user config', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Generate URL-friendly slug from tab name
 */
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Get user's tabs
 */
export async function getUserTabs(userId: string): Promise<UserTab[]> {
    const config = await getUserConfig(userId);
    return config.tabs || [];
}

/**
 * Add tab to user's config
 */
export async function addUserTab(userId: string, tabData: { name: string; url: string; icon?: string; enabled?: boolean }): Promise<UserTab> {
    const config = await getUserConfig(userId);

    const tab: UserTab = {
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
 */
export async function updateUserTab(userId: string, tabId: string, updates: Partial<UserTab>): Promise<UserTab> {
    const config = await getUserConfig(userId);
    const tabs = config.tabs || [];
    const tabIndex = tabs.findIndex(t => t.id === tabId);

    if (tabIndex === -1) {
        throw new Error('Tab not found');
    }

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
 */
export async function deleteUserTab(userId: string, tabId: string): Promise<boolean> {
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
 */
export async function reorderUserTabs(userId: string, orderedIds: string[]): Promise<UserTab[]> {
    const config = await getUserConfig(userId);
    const tabs = config.tabs || [];

    const reorderedTabs = orderedIds.map((id, index) => {
        const tab = tabs.find(t => t.id === id);
        if (!tab) throw new Error(`Tab ${id} not found`);
        return { ...tab, order: index };
    });

    await updateUserConfig(userId, { tabs: reorderedTabs });

    logger.info(`Tabs reordered for user ${userId}`);
    return reorderedTabs;
}

export { DEFAULT_USER_CONFIG };
