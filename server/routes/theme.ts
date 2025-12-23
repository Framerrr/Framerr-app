import { Router, Request, Response, NextFunction } from 'express';
import { getUserConfig, updateUserConfig } from '../db/userConfig';
import logger from '../utils/logger';

const router = Router();

interface AuthenticatedUser {
    id: string;
    username: string;
    group: string;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

interface Theme {
    mode?: 'light' | 'dark' | 'system';
    primaryColor?: string;
    preset?: string;
    customColors?: Record<string, string>;
}

interface ThemeBody {
    theme: Theme;
}

// Middleware to require authentication
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
};

/**
 * GET /api/theme/default
 * Get the default/admin theme (public - no auth required)
 * Used for login page theming
 */
router.get('/default', async (req: Request, res: Response) => {
    try {
        // Get the first admin user to use their theme as default
        const { db } = await import('../database/db');
        const adminUser = db.prepare(`
            SELECT id FROM users WHERE "group" = 'admin' LIMIT 1
        `).get() as { id: string } | undefined;

        logger.warn('Default theme lookup', { adminFound: !!adminUser, adminId: adminUser?.id });

        if (adminUser) {
            const userConfig = await getUserConfig(adminUser.id);
            const themeConfig = userConfig.theme as any;

            logger.warn('Theme config from getUserConfig', { themeConfig });

            // Check for preset first (set when user changes theme via UI)
            if (themeConfig?.preset) {
                logger.warn('Returning admin theme preset', { theme: themeConfig.preset });
                res.json({ theme: themeConfig.preset });
                return;
            }

            // Check the raw theme_config in database for any saved preset
            const rawConfig = db.prepare(`
                SELECT theme_config FROM user_preferences WHERE user_id = ?
            `).get(adminUser.id) as { theme_config: string | null } | undefined;

            logger.warn('Raw theme_config from DB', { rawConfig: rawConfig?.theme_config });

            if (rawConfig?.theme_config) {
                try {
                    const parsed = JSON.parse(rawConfig.theme_config);
                    if (parsed.preset) {
                        logger.warn('Returning admin theme from raw config', { theme: parsed.preset });
                        res.json({ theme: parsed.preset });
                        return;
                    }
                } catch {
                    // Parse error - continue to default
                }
            }
        }

        // Default fallback
        logger.debug('Returning default theme', { theme: 'dark-pro' });
        res.json({ theme: 'dark-pro' });
    } catch (error) {
        logger.error('Failed to get default theme', {
            error: (error as Error).message
        });
        // Return safe default on error
        res.json({ theme: 'dark-pro' });
    }
});

/**
 * GET /api/theme
 * Get current user's theme preferences
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userConfig = await getUserConfig(authReq.user!.id);
        const theme = userConfig.theme || {
            mode: 'system',
            primaryColor: '#3b82f6',
            preset: 'default'
        };

        res.json({ theme });
    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to get theme', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to fetch theme' });
    }
});

/**
 * PUT /api/theme
 * Update current user's theme preferences
 */
router.put('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { theme } = req.body as ThemeBody;

        // Validate theme object
        if (!theme || typeof theme !== 'object') {
            res.status(400).json({ error: 'Theme must be an object' });
            return;
        }

        // Validate mode if provided
        if (theme.mode && !['light', 'dark', 'system'].includes(theme.mode)) {
            res.status(400).json({
                error: 'Theme mode must be one of: light, dark, system'
            });
            return;
        }

        // Validate primaryColor if provided
        if (theme.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(theme.primaryColor)) {
            res.status(400).json({
                error: 'Primary color must be a valid hex color (e.g., #3b82f6)'
            });
            return;
        }

        // Get current config
        const userConfig = await getUserConfig(authReq.user!.id);

        // Merge theme settings
        const updatedTheme = {
            ...userConfig.theme,
            ...theme
        };

        // Save to user config
        await updateUserConfig(authReq.user!.id, {
            theme: updatedTheme
        });

        logger.debug('Theme updated', {
            userId: authReq.user!.id,
            mode: updatedTheme.mode,
            preset: updatedTheme.preset
        });

        res.json({
            success: true,
            theme: updatedTheme
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to update theme', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to save theme' });
    }
});

/**
 * POST /api/theme/reset
 * Reset current user's theme to defaults
 */
router.post('/reset', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const defaultTheme = {
            mode: 'system' as const,
            primaryColor: '#3b82f6',
            preset: 'default'
        };

        await updateUserConfig(authReq.user!.id, {
            theme: defaultTheme
        });

        logger.debug('Theme reset to defaults', { userId: authReq.user!.id });

        res.json({
            success: true,
            theme: defaultTheme
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to reset theme', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to reset theme' });
    }
});

export default router;

