import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { db } from '../database/db';
import * as templateDb from './templates';
import { updateUserConfig } from './userConfig';

// Default user preferences
const DEFAULT_PREFERENCES = {
    theme: 'dark',
    locale: 'en',
    sidebarCollapsed: false
};

interface UserRow {
    id: string;
    username: string;
    passwordHash?: string;
    displayName: string;
    group: string;
    isSetupAdmin: number;
    createdAt: number;
    lastLogin: number | null;
    preferences?: string;
    requirePasswordReset?: number;
}

interface SessionRow {
    id: string;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: number;
    expiresAt: number;
}

interface User {
    id: string;
    username: string;
    passwordHash?: string;
    displayName: string;
    group: string;
    isSetupAdmin: boolean;
    createdAt: number;
    lastLogin: number | null;
    preferences?: Record<string, unknown>;
}

interface Session {
    id: string;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: number;
    expiresAt: number;
}

interface CreateUserData {
    username: string;
    passwordHash: string;
    email?: string;
    group?: string;
    isSetupAdmin?: boolean;
}

interface UpdateUserData {
    username?: string;
    passwordHash?: string;
    displayName?: string;
    group?: string;
    lastLogin?: number;
    id?: string;
    createdAt?: number;
}

interface SessionData {
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Get user by username
 */
export async function getUser(username: string): Promise<User | null> {
    try {
        const user = db.prepare(`
            SELECT id, username, password as passwordHash, username as displayName,
                   group_id as "group", is_setup_admin as isSetupAdmin,
                   created_at as createdAt, last_login as lastLogin
            FROM users
            WHERE LOWER(username) = LOWER(?)
        `).get(username) as UserRow | undefined;

        if (!user) return null;

        return {
            ...user,
            isSetupAdmin: Boolean(user.isSetupAdmin),
            preferences: user.preferences ? JSON.parse(user.preferences) : undefined
        };
    } catch (error) {
        logger.error('Failed to get user by username', { error: (error as Error).message, username });
        throw error;
    }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
    try {
        const user = db.prepare(`
            SELECT id, username, password as passwordHash, username as displayName,
                   group_id as "group", is_setup_admin as isSetupAdmin,
                   created_at as createdAt, last_login as lastLogin
            FROM users
            WHERE id = ?
        `).get(userId) as UserRow | undefined;

        if (!user) return null;

        return {
            ...user,
            isSetupAdmin: Boolean(user.isSetupAdmin),
            preferences: user.preferences ? JSON.parse(user.preferences) : undefined
        };
    } catch (error) {
        logger.error('Failed to get user by ID', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserData): Promise<Omit<User, 'passwordHash'>> {
    try {
        const existing = db.prepare(`
            SELECT id FROM users WHERE LOWER(username) = LOWER(?)
        `).get(userData.username);

        if (existing) {
            throw new Error('User already exists');
        }

        const id = uuidv4();
        const createdAt = Math.floor(Date.now() / 1000);

        const stmt = db.prepare(`
            INSERT INTO users (
                id, username, password, email, group_id,
                is_setup_admin, created_at, last_login
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            userData.username,
            userData.passwordHash,
            userData.email || null,
            userData.group || 'user',
            userData.isSetupAdmin ? 1 : 0,
            createdAt,
            null
        );

        logger.info(`User created: ${userData.username} (${userData.group || 'user'})`);

        // Apply default template for non-admin users
        const isAdmin = userData.group === 'admin' || userData.isSetupAdmin;
        if (!isAdmin) {
            try {
                const defaultTemplate = await templateDb.getDefaultTemplate();
                if (defaultTemplate) {
                    // 1. Create a copy of the default template for the user's template list
                    await templateDb.createTemplate({
                        ownerId: id,
                        name: defaultTemplate.name,
                        description: defaultTemplate.description || undefined,
                        categoryId: defaultTemplate.categoryId || undefined,
                        widgets: defaultTemplate.widgets,
                        sharedFromId: defaultTemplate.id,
                        version: defaultTemplate.version,
                        isDraft: false,
                    });

                    // 2. Apply template widgets to user's actual dashboard
                    // Use the shared helper function (same as POST /api/templates/:id/apply)
                    const dashboardWidgets = await templateDb.applyTemplateToUser(
                        defaultTemplate,
                        id,
                        false // Don't create backup for new users (they have no existing dashboard)
                    );

                    // 3. Share required integrations with the new user
                    // Extract unique integration types from template widgets
                    const integrationTypes = new Set<string>();
                    for (const widget of defaultTemplate.widgets) {
                        // Map widget types to integration names
                        const integrationMap: Record<string, string> = {
                            'plex': 'plex',
                            'sonarr': 'sonarr',
                            'radarr': 'radarr',
                            'overseerr': 'overseerr',
                            'qbittorrent': 'qbittorrent',
                            'sabnzbd': 'sabnzbd',
                            'systemstatus': 'systemstatus',
                            'upcomingmedia': 'upcomingmedia',
                        };
                        const integrationName = integrationMap[widget.type.toLowerCase()];
                        if (integrationName) {
                            integrationTypes.add(integrationName);
                        }
                    }

                    // Share each required integration with the new user
                    if (integrationTypes.size > 0) {
                        // Dynamic import to avoid circular dependency
                        const integrationShares = await import('./integrationShares');
                        for (const integrationName of integrationTypes) {
                            try {
                                await integrationShares.shareIntegration(
                                    integrationName,
                                    'user',
                                    [id], // new user's ID as array
                                    defaultTemplate.ownerId // admin who created the template
                                );
                            } catch (shareError) {
                                // Don't fail if integration sharing fails (might already be shared)
                                logger.debug('Integration share skipped (may already exist)', {
                                    integrationName,
                                    userId: id
                                });
                            }
                        }
                        logger.info('Integrations shared with new user from default template', {
                            userId: id,
                            integrations: Array.from(integrationTypes)
                        });
                    }

                    logger.info('Default template applied to new user', {
                        userId: id,
                        templateId: defaultTemplate.id,
                        widgetCount: dashboardWidgets.length
                    });
                }
            } catch (templateError) {
                // Don't fail user creation if template application fails
                logger.warn('Failed to apply default template to new user', { error: (templateError as Error).message, userId: id });
            }
        }

        return {
            id,
            username: userData.username,
            displayName: userData.username,
            group: userData.group || 'user',
            isSetupAdmin: userData.isSetupAdmin || false,
            createdAt,
            lastLogin: null
        };
    } catch (error) {
        logger.error('Failed to create user', { error: (error as Error).message, username: userData.username });
        throw error;
    }
}

/**
 * Update user
 */
export async function updateUser(userId: string, updates: UpdateUserData): Promise<Omit<User, 'passwordHash'>> {
    try {
        const currentUser = await getUserById(userId);
        if (!currentUser) {
            throw new Error('User not found');
        }

        if (updates.username && updates.username !== currentUser.username) {
            const existing = db.prepare(`
                SELECT id FROM users 
                WHERE LOWER(username) = LOWER(?) AND id != ?
            `).get(updates.username, userId);

            if (existing) {
                throw new Error('Username already taken');
            }
        }

        const { id, createdAt, ...allowedUpdates } = updates;

        const fields: string[] = [];
        const values: (string | number | null)[] = [];

        if (allowedUpdates.username !== undefined) {
            fields.push('username = ?');
            values.push(allowedUpdates.username);
        }
        if (allowedUpdates.passwordHash !== undefined) {
            fields.push('password = ?');
            values.push(allowedUpdates.passwordHash);
        }
        if (allowedUpdates.group !== undefined) {
            fields.push('group_id = ?');
            values.push(allowedUpdates.group);
        }
        if (allowedUpdates.lastLogin !== undefined) {
            fields.push('last_login = ?');
            values.push(allowedUpdates.lastLogin);
        }

        if (fields.length === 0) {
            const { passwordHash, ...userWithoutPassword } = currentUser;
            return userWithoutPassword;
        }

        values.push(userId);

        const stmt = db.prepare(`
            UPDATE users 
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);

        const updatedUser = await getUserById(userId);
        if (!updatedUser) throw new Error('User not found after update');

        const { passwordHash, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    } catch (error) {
        logger.error('Failed to update user', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<boolean> {
    try {
        const user = await getUserById(userId);
        if (!user) return false;

        db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        logger.info(`User deleted: ${user.username}`);
        return true;
    } catch (error) {
        logger.error('Failed to delete user', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * List all users (without password hashes)
 */
export async function listUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    try {
        const users = db.prepare(`
            SELECT id, username, username as displayName,
                   group_id as "group", is_setup_admin as isSetupAdmin,
                   created_at as createdAt, last_login as lastLogin
            FROM users
            ORDER BY created_at ASC
        `).all() as UserRow[];

        return users.map(user => ({
            ...user,
            isSetupAdmin: Boolean(user.isSetupAdmin),
            preferences: user.preferences ? JSON.parse(user.preferences) : DEFAULT_PREFERENCES
        }));
    } catch (error) {
        logger.error('Failed to list users', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Create a session
 */
export async function createSession(userId: string, sessionData: SessionData, expiresIn: number = 86400000): Promise<Session> {
    try {
        const token = uuidv4();
        const createdAt = Math.floor(Date.now() / 1000);
        const expiresAt = Math.floor((Date.now() + expiresIn) / 1000);

        const stmt = db.prepare(`
            INSERT INTO sessions (token, user_id, ip_address, user_agent, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            token,
            userId,
            sessionData.ipAddress || null,
            sessionData.userAgent || null,
            createdAt,
            expiresAt
        );

        return {
            id: token,
            userId,
            ipAddress: sessionData.ipAddress || null,
            userAgent: sessionData.userAgent || null,
            createdAt,
            expiresAt
        };
    } catch (error) {
        logger.error('Failed to create session', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
    try {
        const session = db.prepare(`
            SELECT token as id, user_id as userId, ip_address as ipAddress, 
                   user_agent as userAgent, created_at as createdAt, expires_at as expiresAt
            FROM sessions
            WHERE token = ?
        `).get(sessionId) as SessionRow | undefined;

        if (!session) return null;

        if (session.expiresAt < Math.floor(Date.now() / 1000)) {
            await revokeSession(sessionId);
            return null;
        }

        return session;
    } catch (error) {
        logger.error('Failed to get session', { error: (error as Error).message, sessionId });
        throw error;
    }
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string): Promise<void> {
    try {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(sessionId);
    } catch (error) {
        logger.error('Failed to revoke session', { error: (error as Error).message, sessionId });
        throw error;
    }
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
    try {
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    } catch (error) {
        logger.error('Failed to revoke all user sessions', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const sessions = db.prepare(`
            SELECT token as id, user_id as userId, ip_address as ipAddress,
                   user_agent as userAgent, created_at as createdAt, expires_at as expiresAt
            FROM sessions
            WHERE user_id = ? AND expires_at > ?
            ORDER BY created_at DESC
        `).all(userId, currentTime) as SessionRow[];

        return sessions;
    } catch (error) {
        logger.error('Failed to get user sessions', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const result = db.prepare(`
            DELETE FROM sessions WHERE expires_at < ?
        `).run(currentTime);

        if (result.changes > 0) {
            logger.debug(`Cleaned up ${result.changes} expired sessions`);
        }
    } catch (error) {
        logger.error('Failed to cleanup expired sessions', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Get all users (including password hashes for backend use)
 */
export async function getAllUsers(): Promise<User[]> {
    try {
        const users = db.prepare(`
            SELECT id, username, password as passwordHash, username as displayName,
                   group_id as "group", is_setup_admin as isSetupAdmin,
                   created_at as createdAt, last_login as lastLogin
            FROM users
            ORDER BY created_at ASC
        `).all() as UserRow[];

        return users.map(user => ({
            ...user,
            isSetupAdmin: Boolean(user.isSetupAdmin),
            preferences: user.preferences ? JSON.parse(user.preferences) : DEFAULT_PREFERENCES
        }));
    } catch (error) {
        logger.error('Failed to get all users', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Reset user password to temporary password
 */
export async function resetUserPassword(userId: string): Promise<{ success: boolean; tempPassword: string }> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { hashPassword } = require('../auth/password');
        const user = await getUserById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const tempPassword = 'temp' + Math.random().toString(36).substr(2, 8);
        const passwordHash = await hashPassword(tempPassword);

        db.prepare(`
            UPDATE users 
            SET password = ?
            WHERE id = ?
        `).run(passwordHash, userId);

        logger.info(`Password reset for user: ${user.username}`);

        return {
            success: true,
            tempPassword
        };
    } catch (error) {
        logger.error('Failed to reset user password', { error: (error as Error).message, userId });
        throw error;
    }
}
