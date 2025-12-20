import { Router, Request, Response, NextFunction } from 'express';
import { getUserById, updateUser } from '../db/users';
import { getUserConfig, updateUserConfig } from '../db/userConfig';
import { hashPassword, verifyPassword } from '../auth/password';
import profileUpload from '../middleware/profileUpload';
import logger from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

interface AuthenticatedUser {
    id: string;
    username: string;
    group: string;
}

type AuthenticatedRequest = Request & {
    user?: AuthenticatedUser;
    file?: Express.Multer.File;
};

interface ProfileBody {
    displayName?: string;
}

interface PasswordBody {
    currentPassword: string;
    newPassword: string;
}

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    next();
};

/**
 * GET /api/profile
 * Get current user's profile information
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const user = await getUserById(authReq.user!.id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Get user config to fetch profilePicture and displayName
        const config = await getUserConfig(authReq.user!.id);
        const profilePicture = config.preferences?.profilePicture || null;
        const displayName = config.preferences?.displayName || user.username;

        res.json({
            id: user.id,
            username: user.username,
            group: user.group,
            profilePicture,
            displayName
        });
    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to get profile', { userId: authReq.user?.id, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

/**
 * PUT /api/profile
 * Update user's profile (displayName)
 */
router.put('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { displayName } = req.body as ProfileBody;

        if (displayName !== undefined) {
            await updateUserConfig(authReq.user!.id, {
                preferences: {
                    displayName: displayName.trim() || null
                }
            });

            logger.info('Profile updated', { userId: authReq.user!.id, displayName });
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to update profile', { userId: authReq.user?.id, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * PUT /api/profile/password
 * Change user's password
 */
router.put('/password', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { currentPassword, newPassword } = req.body as PasswordBody;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Current password and new password are required' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ error: 'New password must be at least 6 characters' });
            return;
        }

        // Get user to verify current password
        const user = await getUserById(authReq.user!.id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.passwordHash || '');
        if (!isValid) {
            logger.warn('Password change failed: Invalid current password', { userId: authReq.user!.id });
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update user
        await updateUser(authReq.user!.id, {
            passwordHash: newPasswordHash
        } as Parameters<typeof updateUser>[1]);

        logger.info('Password changed successfully', { userId: authReq.user!.id, username: user.username });

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to change password', { userId: authReq.user?.id, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to change password' });
    }
});

/**
 * POST /api/profile/picture
 * Upload profile picture
 */
router.post('/picture', requireAuth, profileUpload.single('profilePicture'), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
        if (!allowedTypes.includes(authReq.file.mimetype)) {
            await fs.unlink(authReq.file.path);
            res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed' });
            return;
        }

        // Create profile pictures directory if it doesn't exist
        const profilePicturesDir = '/config/upload/profile-pictures';
        try {
            await fs.access(profilePicturesDir);
        } catch {
            await fs.mkdir(profilePicturesDir, { recursive: true });
        }

        // Generate unique filename with extension
        const ext = path.extname(authReq.file.originalname);
        const filename = `${authReq.user!.id}${ext}`;
        const newPath = path.join(profilePicturesDir, filename);

        // Delete old profile picture if it exists
        const user = await getUserById(authReq.user!.id);
        const config = await getUserConfig(authReq.user!.id);
        const oldProfilePicture = config.preferences?.profilePicture as string | null | undefined;

        if (oldProfilePicture && typeof oldProfilePicture === 'string') {
            try {
                if (oldProfilePicture.startsWith('/profile-pictures/')) {
                    const oldPath = path.join('/config/upload', oldProfilePicture);
                    await fs.unlink(oldPath);
                } else {
                    const oldPath = path.join(__dirname, '../public', oldProfilePicture);
                    await fs.unlink(oldPath);
                }
            } catch {
                // Old file might not exist, that's okay
            }
        }

        // Move file to profile pictures directory
        await fs.rename(authReq.file.path, newPath);

        // Update user preferences with profile picture path
        const profilePicturePath = `/profile-pictures/${filename}`;
        await updateUserConfig(authReq.user!.id, {
            preferences: {
                profilePicture: profilePicturePath
            }
        });

        logger.info('Profile picture uploaded', { userId: authReq.user!.id, username: user?.username });

        res.json({
            success: true,
            profilePicture: profilePicturePath
        });
    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to upload profile picture', { userId: authReq.user?.id, error: (error as Error).message });

        // Clean up on error
        if (authReq.file) {
            try {
                await fs.unlink(authReq.file.path);
            } catch {
                // Ignore cleanup errors
            }
        }

        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});

/**
 * DELETE /api/profile/picture
 * Remove profile picture
 */
router.delete('/picture', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const user = await getUserById(authReq.user!.id);
        const config = await getUserConfig(authReq.user!.id);
        const profilePicture = config.preferences?.profilePicture as string | null | undefined;

        if (profilePicture && typeof profilePicture === 'string') {
            // Delete the file
            try {
                if (profilePicture.startsWith('/profile-pictures/')) {
                    const filePath = path.join('/config/upload', profilePicture);
                    await fs.unlink(filePath);
                } else {
                    const filePath = path.join(__dirname, '../public', profilePicture);
                    await fs.unlink(filePath);
                }
            } catch {
                // File might not exist, that's okay
            }

            // Update user preferences to remove profile picture
            await updateUserConfig(authReq.user!.id, {
                preferences: {
                    profilePicture: null
                }
            });
        }

        logger.info('Profile picture removed', { userId: authReq.user!.id, username: user?.username });

        res.json({ success: true, message: 'Profile picture removed' });
    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to remove profile picture', { userId: authReq.user?.id, error: (error as Error).message });
        res.status(500).json({ error: 'Failed to remove profile picture' });
    }
});

export default router;

