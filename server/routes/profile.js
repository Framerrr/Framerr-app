const express = require('express');
const router = express.Router();
const { getUserById, updateUser } = require('../db/users');
const { getUserConfig, updateUserConfig } = require('../db/userConfig');
const { hashPassword, verifyPassword } = require('../auth/password');
const profileUpload = require('../middleware/profileUpload');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

/**
 * GET /api/profile
 * Get current user's profile information
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

<<<<<<< HEAD
        // Get user config to fetch profilePicture from preferences
        const config = await getUserConfig(req.user.id);
        const profilePicture = config.preferences?.profilePicture || null;

        // Return user without password hash, but include profilePicture from preferences
        const { passwordHash, ...userProfile } = user;
        res.json({
            ...userProfile,
            profilePicture  // Add profilePicture from preferences
=======
        // Get user config to fetch profilePicture and displayName from preferences
        const config = await getUserConfig(req.user.id);
        const profilePicture = config.preferences?.profilePicture || null;
        const displayName = config.preferences?.displayName || user.username;

        // Return user without password hash, but include fields from preferences
        const { passwordHash, ...userProfile } = user;
        res.json({
            ...userProfile,
            profilePicture,
            displayName
>>>>>>> develop
        });
    } catch (error) {
        logger.error('Failed to get profile', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

/**
 * PUT /api/profile
 * Update user's profile (displayName)
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const { displayName } = req.body;

        if (displayName !== undefined) {
            // Update displayName in preferences
            await updateUserConfig(req.user.id, {
                preferences: {
                    displayName: displayName.trim() || null
                }
            });

            logger.info('Profile updated', { userId: req.user.id, displayName });
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        logger.error('Failed to update profile', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * PUT /api/profile/password
 * Change user's password
 */
router.put('/password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Get user to verify current password
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isValid) {
            logger.warn('Password change failed: Invalid current password', { userId: req.user.id });
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update user
        await updateUser(req.user.id, {
            passwordHash: newPasswordHash,
            requirePasswordReset: false
        });

        logger.info('Password changed successfully', { userId: req.user.id, username: user.username });

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Failed to change password', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to change password' });
    }
});

/**
 * POST /api/profile/picture
 * Upload profile picture
 */
router.post('/picture', requireAuth, profileUpload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type (including mobile formats)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            // Clean up uploaded file
            await fs.unlink(req.file.path);
            return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed' });
        }

        // Create profile pictures directory if it doesn't exist
        const profilePicturesDir = '/config/upload/profile-pictures';
        try {
            await fs.access(profilePicturesDir);
        } catch {
            await fs.mkdir(profilePicturesDir, { recursive: true });
        }

        // Generate unique filename with extension
        const ext = path.extname(req.file.originalname);
        const filename = `${req.user.id}${ext}`;
        const newPath = path.join(profilePicturesDir, filename);

        // Delete old profile picture if it exists
        const user = await getUserById(req.user.id);
        const config = await getUserConfig(req.user.id);
        const oldProfilePicture = config.preferences?.profilePicture;

        if (oldProfilePicture) {
            try {
                // Try new location first
                if (oldProfilePicture.startsWith('/profile-pictures/')) {
                    const oldPath = path.join('/config/upload', oldProfilePicture);
                    await fs.unlink(oldPath);
                } else {
                    // Legacy location (server/public) - for existing users
                    const oldPath = path.join(__dirname, '../public', oldProfilePicture);
                    await fs.unlink(oldPath);
                }
            } catch (err) {
                // Old file might not exist, that's okay
            }
        }

        // Move file to profile pictures directory
        await fs.rename(req.file.path, newPath);

        // Update user preferences with profile picture path (NOT users table)
        const profilePicturePath = `/profile-pictures/${filename}`;
        await updateUserConfig(req.user.id, {
            preferences: {
                profilePicture: profilePicturePath
            }
        });

        logger.info('Profile picture uploaded', { userId: req.user.id, username: user.username });

        res.json({
            success: true,
            profilePicture: profilePicturePath
        });
    } catch (error) {
        logger.error('Failed to upload profile picture', { userId: req.user.id, error: error.message });

        // Clean up on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (err) {
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
router.delete('/picture', requireAuth, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        const config = await getUserConfig(req.user.id);
        const profilePicture = config.preferences?.profilePicture;

        if (profilePicture) {
            // Delete the file
            try {
                // Try new location first
                if (profilePicture.startsWith('/profile-pictures/')) {
                    const filePath = path.join('/config/upload', profilePicture);
                    await fs.unlink(filePath);
                } else {
                    // Legacy location (server/public)
                    const filePath = path.join(__dirname, '../public', profilePicture);
                    await fs.unlink(filePath);
                }
            } catch (err) {
                // File might not exist, that's okay
            }

            // Update user preferences to remove profile picture
            await updateUserConfig(req.user.id, {
                preferences: {
                    profilePicture: null
                }
            });
        }

        logger.info('Profile picture removed', { userId: req.user.id, username: user.username });

        res.json({ success: true, message: 'Profile picture removed' });
    } catch (error) {
        logger.error('Failed to remove profile picture', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to remove profile picture' });
    }
});

module.exports = router;
