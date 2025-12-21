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
    mobileLayoutMode?: 'linked' | 'independent';
    mobileWidgets?: unknown[];
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
 * Get current user's dashboard widgets (desktop and mobile)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userConfig = await getUserConfig(authReq.user!.id);
        const dashboard = userConfig.dashboard || {};

        res.json({
            widgets: dashboard.widgets || [],
            mobileLayoutMode: dashboard.mobileLayoutMode || 'linked',
            mobileWidgets: dashboard.mobileWidgets || undefined
        });
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
 * Update current user's dashboard widgets (desktop and/or mobile)
 */
router.put('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { widgets, mobileLayoutMode, mobileWidgets } = req.body as WidgetsBody;

        // Validate widgets array
        if (!Array.isArray(widgets)) {
            res.status(400).json({ error: 'Widgets must be an array' });
            return;
        }

        // Validate mobileWidgets if provided
        if (mobileWidgets !== undefined && !Array.isArray(mobileWidgets)) {
            res.status(400).json({ error: 'Mobile widgets must be an array' });
            return;
        }

        // Get current config
        const userConfig = await getUserConfig(authReq.user!.id);

        // Update dashboard with widgets and mobile settings
        const updatedDashboard = {
            ...userConfig.dashboard,
            widgets: widgets,
            ...(mobileLayoutMode !== undefined && { mobileLayoutMode }),
            ...(mobileWidgets !== undefined && { mobileWidgets })
        };

        // Save to user config
        await updateUserConfig(authReq.user!.id, {
            dashboard: updatedDashboard
        });

        logger.debug('Widgets updated', {
            userId: authReq.user!.id,
            widgetCount: widgets.length,
            mobileLayoutMode: updatedDashboard.mobileLayoutMode,
            mobileWidgetCount: mobileWidgets?.length
        });

        res.json({
            success: true,
            widgets: widgets,
            mobileLayoutMode: updatedDashboard.mobileLayoutMode,
            mobileWidgets: updatedDashboard.mobileWidgets
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
 * Reset current user's widgets to empty (both desktop and mobile)
 */
router.post('/reset', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;

        // Reset widgets and mobile state to defaults
        const updatedDashboard = {
            layout: [],
            widgets: [],
            mobileLayoutMode: 'linked' as const,
            mobileWidgets: undefined
        };

        await updateUserConfig(authReq.user!.id, {
            dashboard: updatedDashboard
        });

        logger.debug('Widgets reset', { userId: authReq.user!.id });

        res.json({
            success: true,
            widgets: [],
            mobileLayoutMode: 'linked',
            mobileWidgets: undefined
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

/**
 * POST /api/widgets/unlink
 * Transition mobile dashboard from linked to independent
 * Copies current desktop widgets to mobile widgets
 */
router.post('/unlink', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userConfig = await getUserConfig(authReq.user!.id);
        const currentWidgets = userConfig.dashboard?.widgets || [];

        // Copy desktop widgets to mobile and set mode to independent
        const updatedDashboard = {
            ...userConfig.dashboard,
            mobileLayoutMode: 'independent' as const,
            mobileWidgets: JSON.parse(JSON.stringify(currentWidgets))
        };

        await updateUserConfig(authReq.user!.id, {
            dashboard: updatedDashboard
        });

        logger.debug('Mobile dashboard unlinked', {
            userId: authReq.user!.id,
            mobileWidgetCount: currentWidgets.length
        });

        res.json({
            success: true,
            mobileLayoutMode: 'independent',
            mobileWidgets: updatedDashboard.mobileWidgets
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to unlink mobile dashboard', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to unlink mobile dashboard' });
    }
});

/**
 * POST /api/widgets/reconnect
 * Transition mobile dashboard from independent back to linked
 * Clears mobile widgets and resumes auto-generation from desktop
 */
router.post('/reconnect', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userConfig = await getUserConfig(authReq.user!.id);

        // Clear mobile widgets and set mode to linked
        const updatedDashboard = {
            ...userConfig.dashboard,
            mobileLayoutMode: 'linked' as const,
            mobileWidgets: undefined
        };

        await updateUserConfig(authReq.user!.id, {
            dashboard: updatedDashboard
        });

        logger.debug('Mobile dashboard reconnected', { userId: authReq.user!.id });

        res.json({
            success: true,
            mobileLayoutMode: 'linked',
            mobileWidgets: undefined
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to reconnect mobile dashboard', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to reconnect mobile dashboard' });
    }
});

export default router;
