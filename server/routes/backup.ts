import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/auth';
import { getUserConfig, updateUserConfig } from '../db/userConfig';
import { getSystemConfig } from '../db/systemConfig';
import { getAllUsers } from '../db/users';
import logger from '../utils/logger';

const router = Router();

interface AuthenticatedUser {
    id: string;
    username: string;
    displayName?: string;
    group: string;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

interface ImportData {
    dashboard?: unknown;
    tabs?: unknown;
    theme?: unknown;
    sidebar?: unknown;
}

interface ImportBody {
    data: ImportData;
}

interface SystemRestoreBody {
    system: unknown;
    users: Record<string, unknown>;
    confirm?: string;
}

// Middleware
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
};

/**
 * GET /api/backup/export
 * Export current user's configuration as JSON
 */
router.get('/export', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userConfig = await getUserConfig(authReq.user!.id);

        const backup = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            user: {
                username: authReq.user!.username,
                displayName: authReq.user!.displayName
            },
            data: {
                dashboard: userConfig.dashboard,
                tabs: userConfig.tabs,
                theme: userConfig.theme,
                sidebar: userConfig.sidebar
            }
        };

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `dashboard-backup-${authReq.user!.username}-${timestamp}.json`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(backup);

        logger.info('User config exported', {
            userId: authReq.user!.id,
            username: authReq.user!.username
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to export user config', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to export configuration' });
    }
});

/**
 * POST /api/backup/import
 * Import user configuration from JSON backup
 */
router.post('/import', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { data } = req.body as ImportBody;

        if (!data || typeof data !== 'object') {
            res.status(400).json({
                error: 'Invalid backup data. Must include "data" object.'
            });
            return;
        }

        // Validate backup structure
        const validFields = ['dashboard', 'tabs', 'theme', 'sidebar'] as const;
        const importData: Partial<ImportData> = {};

        for (const field of validFields) {
            if (data[field]) {
                importData[field] = data[field];
            }
        }

        if (Object.keys(importData).length === 0) {
            res.status(400).json({
                error: 'No valid data to import'
            });
            return;
        }

        // Import data
        await updateUserConfig(authReq.user!.id, importData as Parameters<typeof updateUserConfig>[1]);

        logger.info('User config imported', {
            userId: authReq.user!.id,
            fields: Object.keys(importData)
        });

        res.json({
            success: true,
            imported: Object.keys(importData),
            message: 'Configuration imported successfully. Please refresh the page.'
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to import user config', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to import configuration' });
    }
});

/**
 * GET /api/backup/system
 * Export full system configuration (admin only)
 */
router.get('/system', requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const systemConfig = await getSystemConfig();
        const users = await getAllUsers();

        // Read all user configs
        const userConfigs: Record<string, unknown> = {};
        for (const user of users) {
            try {
                const config = await getUserConfig(user.id);
                userConfigs[user.id] = {
                    username: user.username,
                    displayName: user.displayName,
                    group: user.group,
                    config: config
                };
            } catch (err) {
                logger.warn(`Failed to load config for user ${user.username}`, { error: (err as Error).message });
            }
        }

        const backup = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            exportedBy: authReq.user!.username,
            system: systemConfig,
            users: userConfigs
        };

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `dashboard-system-backup-${timestamp}.json`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(backup);

        logger.info('System backup exported', {
            admin: authReq.user!.username,
            userCount: Object.keys(userConfigs).length
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to export system backup', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to export system backup' });
    }
});

/**
 * POST /api/backup/system/restore
 * Restore full system configuration (admin only, DANGEROUS)
 */
router.post('/system/restore', requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { system, users, confirm } = req.body as SystemRestoreBody;

        if (!system || !users) {
            res.status(400).json({
                error: 'Invalid backup. Must include "system" and "users".'
            });
            return;
        }

        // This is a dangerous operation - require confirmation
        if (confirm !== 'RESTORE_SYSTEM') {
            res.status(400).json({
                error: 'System restore requires confirmation. Set confirm: "RESTORE_SYSTEM"'
            });
            return;
        }

        logger.warn('System restore initiated', {
            admin: authReq.user!.username,
            userCount: Object.keys(users).length
        });

        // TODO: Implement actual restore logic
        res.status(501).json({
            error: 'System restore not implemented yet. Manual restore recommended.'
        });

    } catch (error) {
        const authReq = req as AuthenticatedRequest;
        logger.error('Failed to restore system backup', {
            userId: authReq.user?.id,
            error: (error as Error).message
        });
        res.status(500).json({ error: 'Failed to restore system backup' });
    }
});

export default router;

