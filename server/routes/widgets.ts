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

interface WidgetsBody {
    widgets: unknown[];
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
 * GET /api/widgets
 * Get current user's dashboard widgets
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userConfig = await getUserConfig(authReq.user!.id);
        const widgets = userConfig.dashboard?.widgets || [];

        res.json({ widgets });
    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to get widgets', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to fetch widgets' });
    }
});

/**
 * PUT /api/widgets
 * Update current user's dashboard widgets
 */
router.put('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { widgets } = req.body as WidgetsBody;

        // Validate widgets array
        if (!Array.isArray(widgets)) {
            res.status(400).json({ error: 'Widgets must be an array' });
            return;
        }

        // Get current config
        const userConfig = await getUserConfig(authReq.user!.id);

        // Update widgets while preserving other dashboard settings
        const updatedDashboard = {
            ...userConfig.dashboard,
            widgets: widgets
        };

        // Save to user config
        await updateUserConfig(authReq.user!.id, {
            dashboard: updatedDashboard
        });

        logger.debug('Widgets updated', {
            userId: authReq.user!.id,
            widgetCount: widgets.length
        });

        res.json({
            success: true,
            widgets: widgets
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to update widgets', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to save widgets' });
    }
});

/**
 * POST /api/widgets/reset
 * Reset current user's widgets to empty
 */
router.post('/reset', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userConfig = await getUserConfig(authReq.user!.id);

        // Reset widgets to empty array
        const updatedDashboard = {
            ...userConfig.dashboard,
            widgets: []
        };

        await updateUserConfig(authReq.user!.id, {
            dashboard: updatedDashboard
        });

        logger.debug('Widgets reset', { userId: authReq.user!.id });

        res.json({
            success: true,
            widgets: []
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to reset widgets', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to reset widgets' });
    }
});

export default router;

