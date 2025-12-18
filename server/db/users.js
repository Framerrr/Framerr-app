const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { db } = require('../database/db');

// Default user preferences
const DEFAULT_PREFERENCES = {
    theme: 'dark',
    locale: 'en',
    sidebarCollapsed: false
};

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<object|null>} User object or null
 */
async function getUser(username) {
    try {
        const user = db.prepare(`
            SELECT id, username, password as passwordHash, username as displayName,
                   group_id as "group", is_setup_admin as isSetupAdmin,
                   created_at as createdAt, last_login as lastLogin
            FROM users
            WHERE LOWER(username) = LOWER(?)
        `).get(username);

        if (!user) return null;

        // Parse JSON preferences
        if (user.preferences) {
            user.preferences = JSON.parse(user.preferences);
        }

        return user;
    } catch (error) {
        logger.error('Failed to get user by username', { error: error.message, username });
        throw error;
    }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User object or null
 */
async function getUserById(userId) {
    try {
        const user = db.prepare(`
            SELECT id, username, password as passwordHash, username as displayName,
                   group_id as "group", is_setup_admin as isSetupAdmin,
                   created_at as createdAt, last_login as lastLogin
            FROM users
            WHERE id = ?
        `).get(userId);

        if (!user) return null;

        // Parse JSON preferences
        if (user.preferences) {
            user.preferences = JSON.parse(user.preferences);
        }

        return user;
    } catch (error) {
        logger.error('Failed to get user by ID', { error: error.message, userId });
        throw error;
    }
}

/**
 * Create a new user
 * @param {object} userData - User data
 * @returns {Promise<object>} Created user
 */
async function createUser(userData) {
    try {
        // Check if user already exists
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
            createdAt,  // Already in seconds from line 87
            null
        );

        logger.info(`User created: ${userData.username} (${userData.group || 'user'})`);

        // Return user without password hash
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
        logger.error('Failed to create user', { error: error.message, username: userData.username });
        throw error;
    }
}

/**
 * Update user
 * @param {string} userId - User ID
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>} Updated user
 */
async function updateUser(userId, updates) {
    try {
        // Get current user
        const currentUser = await getUserById(userId);
        if (!currentUser) {
            throw new Error('User not found');
        }

        // If username is being changed, check for duplicates
        if (updates.username && updates.username !== currentUser.username) {
            const existing = db.prepare(`
                SELECT id FROM users 
                WHERE LOWER(username) = LOWER(?) AND id != ?
            `).get(updates.username, userId);

            if (existing) {
                throw new Error('Username already taken');
            }
        }

        // Prevent updating immutable fields
        const { id, createdAt, ...allowedUpdates } = updates;

        // Build dynamic UPDATE query
        const fields = [];
        const values = [];

        if (allowedUpdates.username !== undefined) {
            fields.push('username = ?');
            values.push(allowedUpdates.username);
        }
        if (allowedUpdates.passwordHash !== undefined) {
            fields.push('password = ?');
            values.push(allowedUpdates.passwordHash);
        }
        // displayName not stored separately - it's same as username
        // if (allowedUpdates.displayName !== undefined) {
        //     fields.push('username = ?');
        //     values.push(allowedUpdates.displayName);
        // }
        if (allowedUpdates.group !== undefined) {
            fields.push('group_id = ?');
            values.push(allowedUpdates.group);
        }
        // Preferences not stored in users table anymore
        // if (allowedUpdates.preferences !== undefined) {
        //     const mergedPrefs = {
        //         ...currentUser.preferences,
        //         ...allowedUpdates.preferences
        //     };
        //     fields.push('preferences = ?');
        //     values.push(JSON.stringify(mergedPrefs));
        // }
        // require_password_reset not in schema
        // if (allowedUpdates.requirePasswordReset !== undefined) {
        //     fields.push('require_password_reset = ?');
        //     values.push(allowedUpdates.requirePasswordReset ? 1 : 0);
        // }
        if (allowedUpdates.lastLogin !== undefined) {
            fields.push('last_login = ?');
            values.push(allowedUpdates.lastLogin);
        }

        if (fields.length === 0) {
            // No updates, return current user without password
            const { passwordHash, ...userWithoutPassword } = currentUser;
            return userWithoutPassword;
        }

        // Add userId to values for WHERE clause
        values.push(userId);

        const stmt = db.prepare(`
            UPDATE users 
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);

        // Fetch and return updated user
        const updatedUser = await getUserById(userId);
        const { passwordHash, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    } catch (error) {
        logger.error('Failed to update user', { error: error.message, userId });
        throw error;
    }
}

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {boolean} True if deleted, false if user not found
 */
async function deleteUser(userId) {
    try {
        const user = await getUserById(userId);
        if (!user) return false;

        // Delete user (CASCADE will handle sessions due to foreign key)
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        logger.info(`User deleted: ${user.username}`);
        return true;
    } catch (error) {
        logger.error('Failed to delete user', { error: error.message, userId });
        throw error;
    }
}

/**
 * List all users
 * @returns {Promise<array>} Array of users (without password hashes)
 */
async function listUsers() {
    try {
        const users = db.prepare(`
            SELECT id, username, username as displayName,
                   group_id as "group", is_setup_admin as isSetupAdmin,
                   created_at as createdAt, last_login as lastLogin
            FROM users
            ORDER BY created_at ASC
        `).all();

        // Parse JSON preferences for each user
        return users.map(user => ({
            ...user,
            preferences: user.preferences ? JSON.parse(user.preferences) : DEFAULT_PREFERENCES,
            requirePasswordReset: Boolean(user.requirePasswordReset)
        }));
    } catch (error) {
        logger.error('Failed to list users', { error: error.message });
        throw error;
    }
}

/**
 * Create a session
 * @param {string} userId - User ID
 * @param {object} sessionData - Session data (ipAddress, userAgent)
 * @param {number} expiresIn - Expiration time in milliseconds
 * @returns {Promise<object>} Session object
 */
async function createSession(userId, sessionData, expiresIn = 86400000) {
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
        logger.error('Failed to create session', { error: error.message, userId });
        throw error;
    }
}

/**
 * Get session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Session object or null
 */
async function getSession(sessionId) {
    try {
        const session = db.prepare(`
            SELECT token as id, user_id as userId, ip_address as ipAddress, 
                   user_agent as userAgent, created_at as createdAt, expires_at as expiresAt
            FROM sessions
            WHERE token = ?
        `).get(sessionId);

        if (!session) return null;

        // Check if session is expired (timestamps are Unix seconds)
        if (session.expiresAt < Math.floor(Date.now() / 1000)) {
            await revokeSession(sessionId);
            return null;
        }

        return session;
    } catch (error) {
        logger.error('Failed to get session', { error: error.message, sessionId });
        throw error;
    }
}

/**
 * Revoke a session
 * @param {string} sessionId - Session ID
 */
async function revokeSession(sessionId) {
    try {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(sessionId);
    } catch (error) {
        logger.error('Failed to revoke session', { error: error.message, sessionId });
        throw error;
    }
}

/**
 * Revoke all sessions for a user
 * @param {string} userId - User ID
 */
async function revokeAllUserSessions(userId) {
    try {
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    } catch (error) {
        logger.error('Failed to revoke all user sessions', { error: error.message, userId });
        throw error;
    }
}

/**
 * Get all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of sessions
 */
async function getUserSessions(userId) {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const sessions = db.prepare(`
            SELECT token as id, user_id as userId, ip_address as ipAddress,
                   user_agent as userAgent, created_at as createdAt, expires_at as expiresAt
            FROM sessions
            WHERE user_id = ? AND expires_at > ?
            ORDER BY created_at DESC
        `).all(userId, currentTime);

        return sessions;
    } catch (error) {
        logger.error('Failed to get user sessions', { error: error.message, userId });
        throw error;
    }
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions() {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const result = db.prepare(`
            DELETE FROM sessions WHERE expires_at < ?
        `).run(currentTime);

        if (result.changes > 0) {
            logger.debug(`Cleaned up ${result.changes} expired sessions`);
        }
    } catch (error) {
        logger.error('Failed to cleanup expired sessions', { error: error.message });
        throw error;
    }
}

/**
 * Get all users (including password hashes for backend use)
 * @returns {Promise<array>} Array of users
 */
async function getAllUsers() {
    try {
        const users = db.prepare(`
            SELECT id, username, password as passwordHash, username as displayName,
                   group_id as "group", is_setup_admin as isSetupAdmin,
                   created_at as createdAt, last_login as lastLogin
            FROM users
            ORDER BY created_at ASC
        `).all();

        // Parse JSON preferences for each user
        return users.map(user => ({
            ...user,
            preferences: user.preferences ? JSON.parse(user.preferences) : DEFAULT_PREFERENCES,
            requirePasswordReset: Boolean(user.requirePasswordReset)
        }));
    } catch (error) {
        logger.error('Failed to get all users', { error: error.message });
        throw error;
    }
}

/**
 * Reset user password to temporary password
 * @param {string} userId - User ID
 * @returns {Promise<object>} Result with temporary password
 */
async function resetUserPassword(userId) {
    try {
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
        logger.error('Failed to reset user password', { error: error.message, userId });
        throw error;
    }
}

module.exports = {
    getUser,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    listUsers,
    getAllUsers,
    resetUserPassword,
    createSession,
    getSession,
    revokeSession,
    revokeAllUserSessions,
    getUserSessions,
    cleanupExpiredSessions
};
