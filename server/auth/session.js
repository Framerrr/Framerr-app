const { v4: uuidv4 } = require('uuid');
const { createSession, getSession, revokeSession } = require('../db/users');
const logger = require('../utils/logger');

/**
 * Create a new user session
 * @param {object} user - User object
 * @param {object} req - Express request object
 * @param {number} expiresIn - Expiration time in ms
 * @returns {Promise<object>} Session object
 */
async function createUserSession(user, req, expiresIn) {
    const sessionData = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    };

    try {
        const session = await createSession(user.id, sessionData, expiresIn);
        return session;
    } catch (error) {
        logger.error('Failed to create session', { error: error.message });
        throw error;
    }
}

/**
 * Validate a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Session object if valid
 */
async function validateSession(sessionId) {
    try {
        return await getSession(sessionId);
    } catch (error) {
        logger.error('Failed to validate session', { error: error.message });
        return null;
    }
}

module.exports = {
    createUserSession,
    validateSession
};
