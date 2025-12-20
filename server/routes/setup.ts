import { Router, Request, Response } from 'express';
import { hashPassword } from '../auth/password';
import { createUser, listUsers } from '../db/users';
import logger from '../utils/logger';

const router = Router();

interface SetupBody {
    username: string;
    password: string;
    confirmPassword: string;
    displayName?: string;
}

/**
 * GET /api/auth/setup/status
 * Check if setup is needed (no users exist)
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const users = await listUsers();
        const needsSetup = users.length === 0;

        logger.debug(`Setup status check: ${needsSetup ? 'needed' : 'not needed'}`);

        res.json({ needsSetup });
    } catch (error) {
        logger.error('Setup status check error', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to check setup status' });
    }
});

/**
 * POST /api/auth/setup
 * Create admin user (only works if no users exist)
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { username, password, confirmPassword, displayName } = req.body as SetupBody;

        // Security: Verify no users exist
        const users = await listUsers();
        if (users.length > 0) {
            logger.warn('Setup attempt when users already exist');
            res.status(403).json({ error: 'Setup has already been completed' });
            return;
        }

        // Validation
        if (!username || !password) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        if (password !== confirmPassword) {
            res.status(400).json({ error: 'Passwords do not match' });
            return;
        }

        // Validate username format (alphanumeric, underscore, hyphen)
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
            res.status(400).json({
                error: 'Username can only contain letters, numbers, underscores, and hyphens'
            });
            return;
        }

        // Create admin user
        const passwordHash = await hashPassword(password);
        const user = await createUser({
            username,
            passwordHash,
            group: 'admin'
        });

        logger.info(`Admin user created via setup wizard: ${username}`);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                group: user.group
            }
        });
    } catch (error) {
        logger.error('Setup error', { error: (error as Error).message });
        res.status(500).json({ error: (error as Error).message || 'Setup failed' });
    }
});

export default router;

