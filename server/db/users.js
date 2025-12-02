const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const USERS_DB_PATH = path.join(DATA_DIR, 'users.json');

// Default user preferences
const DEFAULT_PREFERENCES = {
    theme: 'dark',
    locale: 'en',
    sidebarCollapsed: false
};

/**
 * Initialize users database if it doesn't exist
 */
async function initUsersDB() {
    try {
        await fs.access(USERS_DB_PATH);
    } catch {
        logger.info('Initializing users database...');
        try {
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.writeFile(USERS_DB_PATH, JSON.stringify({ users: [], sessions: [] }, null, 2));
            logger.info('Users database created at ' + USERS_DB_PATH);
        } catch (error) {
            logger.error('Failed to initialize users database', { error: error.message });
            throw error;
        }
    }
}

/**
 * Read users database
 * @returns {Promise<object>} Database content
 */
async function readDB() {
    await initUsersDB();
    try {
        const data = await fs.readFile(USERS_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error('Failed to read users database', { error: error.message });
        throw error;
    }
}

/**
 * Write to users database
 * @param {object} db - Database content
 */
async function writeDB(db) {
    try {
        await fs.writeFile(USERS_DB_PATH, JSON.stringify(db, null, 2));
    } catch (error) {
        logger.error('Failed to write users database', { error: error.message });
        throw error;
    }
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<object|null>} User object or null
 */
async function getUser(username) {
    const db = await readDB();
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User object or null
 */
async function getUserById(userId) {
    const db = await readDB();
    return db.users.find(u => u.id === userId) || null;
}

/**
 * Create a new user
 * @param {object} userData - User data
 * @returns {Promise<object>} Created user
 */
async function createUser(userData) {
    const db = await readDB();

    // Check if user already exists
    if (db.users.find(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
        throw new Error('User already exists');
    }

    const user = {
        id: uuidv4(),
        username: userData.username,
        passwordHash: userData.passwordHash,
        displayName: userData.displayName || userData.username,
        group: userData.group || 'user', // admin, power-user, user, guest
        preferences: { ...DEFAULT_PREFERENCES, ...userData.preferences },
        requirePasswordReset: userData.requirePasswordReset || false,
        createdAt: new Date().toISOString(),
        lastLogin: null
    };

    db.users.push(user);
    await writeDB(db);

    logger.info(`User created: ${user.username} (${user.group})`);

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Update user
 * @param {string} userId - User ID
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>} Updated user
 */
async function updateUser(userId, updates) {
    const db = await readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('User not found');
    }

    // If username is being changed, check for duplicates
    if (updates.username && updates.username !== db.users[userIndex].username) {
        const existingUser = db.users.find(u =>
            u.username.toLowerCase() === updates.username.toLowerCase() && u.id !== userId
        );
        if (existingUser) {
            throw new Error('Username already taken');
        }
    }

    // Prevent updating immutable fields (only id and createdAt)
    const { id, createdAt, ...allowedUpdates } = updates;

    // Merge preferences if provided
    if (allowedUpdates.preferences) {
        allowedUpdates.preferences = {
            ...db.users[userIndex].preferences,
            ...allowedUpdates.preferences
        };
    }

    db.users[userIndex] = {
        ...db.users[userIndex],
        ...allowedUpdates
    };

    await writeDB(db);

    const { passwordHash, ...userWithoutPassword } = db.users[userIndex];
    return userWithoutPassword;
}

/**
 * Delete user
 * @param {string} userId - User ID
 */
async function deleteUser(userId) {
    const db = await readDB();
    const user = db.users.find(u => u.id === userId);

    if (!user) return;

    db.users = db.users.filter(u => u.id !== userId);
    // Also remove all user sessions
    db.sessions = db.sessions.filter(s => s.userId !== userId);

    await writeDB(db);
    logger.info(`User deleted: ${user.username}`);
}

/**
 * List all users
 * @returns {Promise<array>} Array of users (without password hashes)
 */
async function listUsers() {
    const db = await readDB();
    return db.users.map(({ passwordHash, ...user }) => user);
}

/**
 * Create a session
 * @param {string} userId - User ID
 * @param {object} sessionData - Session data (ipAddress, userAgent)
 * @param {number} expiresIn - Expiration time in milliseconds
 * @returns {Promise<object>} Session object
 */
async function createSession(userId, sessionData, expiresIn = 86400000) {
    const db = await readDB();

    const session = {
        id: uuidv4(),
        userId,
        ipAddress: sessionData.ipAddress || null,
        userAgent: sessionData.userAgent || null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresIn).toISOString()
    };

    db.sessions.push(session);
    await writeDB(db);

    return session;
}

/**
 * Get session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Session object or null
 */
async function getSession(sessionId) {
    const db = await readDB();
    const session = db.sessions.find(s => s.id === sessionId);

    if (!session) return null;

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
        await revokeSession(sessionId);
        return null;
    }

    return session;
}

/**
 * Revoke a session
 * @param {string} sessionId - Session ID
 */
async function revokeSession(sessionId) {
    const db = await readDB();
    db.sessions = db.sessions.filter(s => s.id !== sessionId);
    await writeDB(db);
}

/**
 * Revoke all sessions for a user
 * @param {string} userId - User ID
 */
async function revokeAllUserSessions(userId) {
    const db = await readDB();
    db.sessions = db.sessions.filter(s => s.userId !== userId);
    await writeDB(db);
}

/**
 * Get all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of sessions
 */
async function getUserSessions(userId) {
    const db = await readDB();
    return db.sessions.filter(s => s.userId === userId && new Date(s.expiresAt) > new Date());
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions() {
    const db = await readDB();
    const now = new Date();
    const initialCount = db.sessions.length;

    db.sessions = db.sessions.filter(s => new Date(s.expiresAt) > now);

    if (db.sessions.length < initialCount) {
        await writeDB(db);
        logger.debug(`Cleaned up ${initialCount - db.sessions.length} expired sessions`);
    }
}

/**
 * Get all users (including password hashes for backend use)
 * @returns {Promise<array>} Array of users
 */
async function getAllUsers() {
    const db = await readDB();
    return db.users;
}

/**
 * Reset user password to temporary password
 * @param {string} userId - User ID
 * @returns {Promise<object>} Result with temporary password
 */
async function resetUserPassword(userId) {
    const { hashPassword } = require('../auth/password');
    const db = await readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('User not found');
    }

    const tempPassword = 'temp' + Math.random().toString(36).substr(2, 8);
    const passwordHash = await hashPassword(tempPassword);

    db.users[userIndex].passwordHash = passwordHash;
    db.users[userIndex].requirePasswordReset = true;

    await writeDB(db);

    logger.info(`Password reset for user: ${db.users[userIndex].username}`);

    return {
        success: true,
        tempPassword
    };
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
