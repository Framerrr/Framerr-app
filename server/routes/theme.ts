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

