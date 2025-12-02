const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const users = require('../db/users');
const logger = require('../utils/logger');

// All admin routes require authentication and admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
    try {
        const allUsers = await users.getAllUsers();

        // Remove password hashes from response
        const sanitizedUsers = allUsers.map(user => {
            const { passwordHash, ...safeUser } = user;
            return safeUser;
        });

        res.json({ users: sanitizedUsers });
    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/admin/users - Create new user
router.post('/users', async (req, res) => {
    try {
        const { username, email, password, group } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Hash password
        const { hashPassword } = require('../auth/password');
        const passwordHash = await hashPassword(password);

        const newUser = await users.createUser({
            username,
            email,
            passwordHash,
            group: group || 'user',
            displayName: username
        });

        const { passwordHash: _, ...safeUser } = newUser;
        res.status(201).json({ user: safeUser });
    } catch (error) {
        logger.error('Error creating user:', error);
        res.status(400).json({ error: error.message || 'Failed to create user' });
    }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, group } = req.body;

        const updates = {
            username,
            email,
            group
        };

        // Only update password if provided
        if (password && password.trim() !== '') {
            const { hashPassword } = require('../auth/password');
            updates.passwordHash = await hashPassword(password);
        }

        const updatedUser = await users.updateUser(id, updates);

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { passwordHash, ...safeUser } = updatedUser;
        res.json({ user: safeUser });
    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(400).json({ error: error.message || 'Failed to update user' });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const allUsers = await users.getAllUsers();
        const adminUsers = allUsers.filter(u => u.group === 'admin');

        // Prevent deleting the last admin
        const userToDelete = allUsers.find(u => u.id === id);
        if (userToDelete && userToDelete.group === 'admin' && adminUsers.length <= 1) {
            return res.status(400).json({ error: 'Cannot delete the last admin user' });
        }

        const success = await users.deleteUser(id);

        if (!success) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

//POST /api/admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await users.resetUserPassword(id);

        res.json(result);
    } catch (error) {
        logger.error('Error resetting password:', error);
        res.status(400).json({ error: error.message || 'Failed to reset password' });
    }
});

module.exports = router;
