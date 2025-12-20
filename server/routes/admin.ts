import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import * as users from '../db/users';
import { hashPassword } from '../auth/password';
import logger from '../utils/logger';

const router = Router();

interface AuthenticatedUser {
    id: string;
    username: string;
    group: string;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

interface CreateUserBody {
    username: string;
    email?: string;
    password: string;
    group?: string;
}

interface UpdateUserBody {
    username?: string;
    email?: string;
    password?: string;
    group?: string;
}

// All admin routes require authentication and admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/users - List all users
router.get('/users', async (req: Request, res: Response) => {
    try {
        const allUsers = await users.getAllUsers();

        // Remove password hashes from response
        const sanitizedUsers = allUsers.map(user => {
            const { passwordHash, ...safeUser } = user;
            return safeUser;
        });

        res.json({ users: sanitizedUsers });
    } catch (error) {
        logger.error('Error fetching users', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/admin/users - Create new user
router.post('/users', async (req: Request, res: Response) => {
    try {
        const { username, email, password, group } = req.body as CreateUserBody;

        if (!username || !password) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        const newUser = await users.createUser({
            username,
            email,
            passwordHash,
            group: group || 'user'
        });

        res.status(201).json({ user: newUser });
    } catch (error) {
        logger.error('Error creating user', { error: (error as Error).message });
        res.status(400).json({ error: (error as Error).message || 'Failed to create user' });
    }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { id } = req.params;
        const { username, email, password, group } = req.body as UpdateUserBody;

        // Prevent admin from changing their own group
        if (id === authReq.user!.id && group && group !== authReq.user!.group) {
            res.status(400).json({ error: 'Cannot change your own permission group' });
            return;
        }

        const updates: { username?: string; email?: string; group?: string; passwordHash?: string } = {
            username,
            email,
            group
        };

        // Only update password if provided
        if (password && password.trim() !== '') {
            updates.passwordHash = await hashPassword(password);
        }

        const updatedUser = await users.updateUser(id, updates);

        if (!updatedUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user: updatedUser });
    } catch (error) {
        logger.error('Error updating user', { error: (error as Error).message });
        res.status(400).json({ error: (error as Error).message || 'Failed to update user' });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === authReq.user!.id) {
            res.status(400).json({ error: 'Cannot delete your own account' });
            return;
        }

        const allUsers = await users.getAllUsers();
        const adminUsers = allUsers.filter(u => u.group === 'admin');

        // Prevent deleting the last admin
        const userToDelete = allUsers.find(u => u.id === id);
        if (userToDelete && userToDelete.group === 'admin' && adminUsers.length <= 1) {
            res.status(400).json({ error: 'Cannot delete the last admin user' });
            return;
        }

        const success = await users.deleteUser(id);

        if (!success) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting user', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// POST /api/admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await users.resetUserPassword(id);

        res.json(result);
    } catch (error) {
        logger.error('Error resetting password', { error: (error as Error).message });
        res.status(400).json({ error: (error as Error).message || 'Failed to reset password' });
    }
});

export default router;

