/**
 * Template Routes
 * 
 * API endpoints for dashboard template management.
 * 
 * IMPORTANT: Route order matters! Specific routes (categories, backup, revert, draft)
 * must be defined BEFORE parameterized routes (/:id) to prevent Express from
 * matching them as template IDs.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as templateDb from '../db/templates';
import { getUserConfig, updateUserConfig } from '../db/userConfig';
import { createNotification } from '../db/notifications';
import logger from '../utils/logger';

const router = Router();

// ============================================================================
// Types
// ============================================================================

interface AuthenticatedUser {
    id: string;
    username: string;
    group: string;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

// ============================================================================
// Middleware
// ============================================================================

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || authReq.user.group !== 'admin') {
        res.status(403).json({ error: 'Forbidden - Admin only' });
        return;
    }
    next();
};

// ============================================================================
// Category Routes (MUST be before /:id routes)
// ============================================================================

/**
 * GET /api/templates/categories
 * Get all categories
 */
router.get('/categories', requireAuth, async (_req: Request, res: Response) => {
    try {
        const categories = await templateDb.getCategories();
        res.json({ categories });
    } catch (error) {
        logger.error('Failed to get categories', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * POST /api/templates/categories
 * Create a new category (admin only)
 */
router.post('/categories', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { name } = req.body;

        if (!name || typeof name !== 'string') {
            res.status(400).json({ error: 'Category name is required' });
            return;
        }

        const category = await templateDb.createCategory(name, authReq.user!.id);
        logger.info('Category created', { id: category.id, name, by: authReq.user!.id });
        res.status(201).json({ category });
    } catch (error) {
        if ((error as Error).message.includes('UNIQUE constraint')) {
            res.status(409).json({ error: 'Category already exists' });
            return;
        }
        logger.error('Failed to create category', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to create category' });
    }
});

/**
 * DELETE /api/templates/categories/:id
 * Delete a category (admin only)
 */
router.delete('/categories/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const deleted = await templateDb.deleteCategory(req.params.id);

        if (!deleted) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }

        logger.info('Category deleted', { id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        logger.error('Failed to delete category', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// ============================================================================
// Backup Routes (MUST be before /:id routes)
// ============================================================================

/**
 * GET /api/templates/backup
 * Get user's dashboard backup
 */
router.get('/backup', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const backup = await templateDb.getBackup(authReq.user!.id);

        if (!backup) {
            res.json({ backup: null });
            return;
        }

        res.json({ backup });
    } catch (error) {
        logger.error('Failed to get backup', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch backup' });
    }
});

/**
 * POST /api/templates/revert
 * Revert dashboard to backup
 */
router.post('/revert', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const backup = await templateDb.getBackup(authReq.user!.id);

        if (!backup) {
            res.status(404).json({ error: 'No backup available' });
            return;
        }

        // Restore dashboard from backup
        await updateUserConfig(authReq.user!.id, {
            dashboard: {
                widgets: backup.widgets,
                mobileLayoutMode: backup.mobileLayoutMode,
                mobileWidgets: backup.mobileWidgets || undefined,
            },
        });

        // Delete backup after revert
        await templateDb.deleteBackup(authReq.user!.id);

        logger.info('Dashboard reverted', { userId: authReq.user!.id });
        res.json({
            success: true,
            widgets: backup.widgets,
            mobileLayoutMode: backup.mobileLayoutMode,
        });
    } catch (error) {
        logger.error('Failed to revert dashboard', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to revert dashboard' });
    }
});

/**
 * POST /api/templates/draft
 * Auto-save draft (creates or updates)
 */
router.post('/draft', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { templateId, name, description, categoryId, widgets, thumbnail } = req.body;

        let template;

        if (templateId) {
            // Update existing draft
            template = await templateDb.updateTemplate(templateId, authReq.user!.id, {
                name,
                description,
                categoryId,
                widgets,
                thumbnail,
                isDraft: true,
            });

            if (!template) {
                res.status(404).json({ error: 'Draft not found' });
                return;
            }
        } else {
            // Create new draft
            template = await templateDb.createTemplate({
                ownerId: authReq.user!.id,
                name: name || 'Untitled Draft',
                description,
                categoryId,
                widgets: widgets || [],
                thumbnail,
                isDraft: true,
            });
        }

        logger.debug('Draft saved', { id: template.id, userId: authReq.user!.id });
        res.json({ template });
    } catch (error) {
        logger.error('Failed to save draft', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// ============================================================================
// Template CRUD Routes (parameterized routes AFTER specific routes)
// ============================================================================

/**
 * GET /api/templates
 * Get all templates for the current user (owned + shared)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const templates = await templateDb.getTemplatesForUser(authReq.user!.id);
        const categories = await templateDb.getCategories();

        res.json({ templates, categories });
    } catch (error) {
        logger.error('Failed to get templates', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * POST /api/templates
 * Create a new template
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { name, description, categoryId, widgets, thumbnail, isDraft } = req.body;

        if (!name || typeof name !== 'string') {
            res.status(400).json({ error: 'Template name is required' });
            return;
        }

        const template = await templateDb.createTemplate({
            ownerId: authReq.user!.id,
            name,
            description,
            categoryId,
            widgets: widgets || [],
            thumbnail,
            isDraft: isDraft || false,
        });

        logger.info('Template created', { id: template.id, name, userId: authReq.user!.id });
        res.status(201).json({ template });
    } catch (error) {
        logger.error('Failed to create template', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to create template' });
    }
});

/**
 * GET /api/templates/:id
 * Get a specific template
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const template = await templateDb.getTemplateById(req.params.id);

        if (!template) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }

        // Check access (owner or shared)
        const authReq = req as AuthenticatedRequest;
        const shares = await templateDb.getTemplateShares(template.id);
        const isOwner = template.ownerId === authReq.user!.id;
        const isShared = shares.some(s => s.sharedWith === authReq.user!.id || s.sharedWith === 'everyone');

        if (!isOwner && !isShared) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        res.json({ template, shares: isOwner ? shares : undefined });
    } catch (error) {
        logger.error('Failed to get template', { error: (error as Error).message, id: req.params.id });
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

/**
 * PUT /api/templates/:id
 * Update a template
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { name, description, categoryId, widgets, thumbnail, isDraft } = req.body;

        // Check if this is a shared copy - if so, mark as userModified
        const existing = await templateDb.getTemplateById(req.params.id);
        const isSharedCopy = existing?.sharedFromId ? true : false;

        const template = await templateDb.updateTemplate(req.params.id, authReq.user!.id, {
            name,
            description,
            categoryId,
            widgets,
            thumbnail,
            isDraft,
            // Mark as user-modified if this is a shared copy
            ...(isSharedCopy && { userModified: true }),
        });

        if (!template) {
            res.status(404).json({ error: 'Template not found or access denied' });
            return;
        }

        logger.info('Template updated', { id: template.id, userId: authReq.user!.id, isSharedCopy });
        res.json({ template });
    } catch (error) {
        logger.error('Failed to update template', { error: (error as Error).message, id: req.params.id });
        res.status(500).json({ error: 'Failed to update template' });
    }
});

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const deleted = await templateDb.deleteTemplate(req.params.id, authReq.user!.id);

        if (!deleted) {
            res.status(404).json({ error: 'Template not found or access denied' });
            return;
        }

        logger.info('Template deleted', { id: req.params.id, userId: authReq.user!.id });
        res.json({ success: true });
    } catch (error) {
        logger.error('Failed to delete template', { error: (error as Error).message, id: req.params.id });
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

/**
 * POST /api/templates/:id/apply
 * Apply a template to the user's dashboard
 */
router.post('/:id/apply', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const template = await templateDb.getTemplateById(req.params.id);

        if (!template) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }

        // Get current dashboard for backup
        const userConfig = await getUserConfig(authReq.user!.id);
        const currentDashboard = userConfig.dashboard || {};

        // Create backup before applying
        await templateDb.createBackup(
            authReq.user!.id,
            currentDashboard.widgets || [],
            currentDashboard.mobileLayoutMode || 'linked',
            currentDashboard.mobileWidgets
        );

        // Convert template widgets to dashboard widgets
        // Dashboard expects: i, id, x, y, w, h, type, layouts, config
        const dashboardWidgets = template.widgets.map((tw, index) => {
            const widgetId = `widget-${Date.now()}-${index}`;
            return {
                i: widgetId,
                id: widgetId,
                type: tw.type,
                // Root level position (for backward compatibility)
                x: tw.layout.x,
                y: tw.layout.y,
                w: tw.layout.w,
                h: tw.layout.h,
                // Responsive layouts
                layouts: {
                    lg: tw.layout,
                },
                // Widget-specific config (showHeader, flatten, etc.)
                config: tw.config || {},
            };
        });

        // Apply template to dashboard
        await updateUserConfig(authReq.user!.id, {
            dashboard: {
                widgets: dashboardWidgets,
                mobileLayoutMode: 'linked',
                mobileWidgets: undefined,
            },
        });

        logger.info('Template applied', {
            templateId: template.id,
            userId: authReq.user!.id,
            widgetCount: dashboardWidgets.length
        });

        res.json({
            success: true,
            widgets: dashboardWidgets,
            message: 'Template applied. Your previous dashboard has been backed up.'
        });
    } catch (error) {
        logger.error('Failed to apply template', { error: (error as Error).message, id: req.params.id });
        res.status(500).json({ error: 'Failed to apply template' });
    }
});

/**
 * POST /api/templates/:id/sync
 * Sync user's copy with the original parent template
 * User must own the template and it must have sharedFromId
 */
router.post('/:id/sync', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const template = await templateDb.getTemplateById(req.params.id);

        if (!template || template.ownerId !== authReq.user!.id) {
            res.status(404).json({ error: 'Template not found or access denied' });
            return;
        }

        if (!template.sharedFromId) {
            res.status(400).json({ error: 'This template is not a shared copy' });
            return;
        }

        // Get the parent template
        const parent = await templateDb.getTemplateById(template.sharedFromId);
        if (!parent) {
            res.status(404).json({ error: 'Original template no longer exists' });
            return;
        }

        // Update user's copy with parent's data
        await templateDb.updateTemplate(req.params.id, authReq.user!.id, {
            name: parent.name,
            description: parent.description || undefined,
            widgets: parent.widgets,
            userModified: false, // Reset since we're syncing
        });

        // Manually set version to match parent (bypassing increment)
        const { db } = await import('../database/db');
        db.prepare(
            'UPDATE dashboard_templates SET version = ? WHERE id = ?'
        ).run(parent.version, req.params.id);

        logger.info('Template synced', {
            templateId: req.params.id,
            parentId: parent.id,
            userId: authReq.user!.id
        });

        const updated = await templateDb.getTemplateById(req.params.id);
        res.json({ success: true, template: updated });
    } catch (error) {
        logger.error('Failed to sync template', { error: (error as Error).message, id: req.params.id });
        res.status(500).json({ error: 'Failed to sync template' });
    }
});

/**
 * GET /api/templates/:id/shares
 * Get current shares for a template (admin only, owner only)
 */
router.get('/:id/shares', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const template = await templateDb.getTemplateById(req.params.id);

        if (!template || template.ownerId !== authReq.user!.id) {
            res.status(404).json({ error: 'Template not found or access denied' });
            return;
        }

        const shares = await templateDb.getTemplateShares(req.params.id);
        res.json({ shares: shares.map(s => ({ sharedWith: s.sharedWith })) });
    } catch (error) {
        logger.error('Failed to get template shares', { error: (error as Error).message, id: req.params.id });
        res.status(500).json({ error: 'Failed to get shares' });
    }
});

/**
 * POST /api/templates/:id/check-conflicts
 * Check for widget conflicts before sharing (admin only)
 * Returns which integrations are needed but not shared with target users
 */
router.post('/:id/check-conflicts', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userIds, shareMode } = req.body; // userIds: string[], shareMode: 'everyone' | 'users' | 'groups'

        const template = await templateDb.getTemplateById(req.params.id);
        if (!template || template.ownerId !== authReq.user!.id) {
            res.status(404).json({ error: 'Template not found or access denied' });
            return;
        }

        // Get required integrations from template widgets
        const requiredIntegrations = new Set<string>();
        for (const widget of template.widgets) {
            // Widget types that require integrations (from widgetRegistry)
            const integrationMap: Record<string, string> = {
                'plex': 'plex',
                'sonarr': 'sonarr',
                'radarr': 'radarr',
                'overseerr': 'overseerr',
                'qbittorrent': 'qbittorrent',
                'system-status': 'systemstatus'
            };
            const integration = integrationMap[widget.type];
            if (integration) {
                requiredIntegrations.add(integration);
            }
        }

        if (requiredIntegrations.size === 0) {
            res.json({ conflicts: [] });
            return;
        }

        // Get all integration configs to check sharing
        const { getSystemConfig } = await import('../db/systemConfig');
        const config = await getSystemConfig();
        const integrations = config.integrations || {};

        interface ConflictResult {
            integration: string;
            integrationDisplayName: string;
            affectedUsers: { id: string; username: string }[];
        }

        const conflicts: ConflictResult[] = [];

        // For each required integration, check if it's shared with target users
        for (const integration of requiredIntegrations) {
            const integrationConfig = integrations[integration] as {
                enabled?: boolean;
                sharing?: {
                    enabled?: boolean;
                    mode?: 'everyone' | 'groups' | 'users';
                    groups?: string[];
                    users?: string[];
                };
            } | undefined;

            if (!integrationConfig?.enabled) {
                // Integration not configured - skip
                continue;
            }

            const sharing = integrationConfig.sharing;
            const isSharedWithEveryone = sharing?.enabled && sharing.mode === 'everyone';

            if (isSharedWithEveryone) {
                // Already shared with everyone, no conflict
                continue;
            }

            // Check which users don't have access
            const affectedUsers: { id: string; username: string }[] = [];

            if (shareMode === 'everyone' || (shareMode === 'users' && userIds?.length > 0)) {
                // Get user details
                const { getAllUsers } = await import('../db/users');
                const allUsers = await getAllUsers();
                const nonAdminUsers = allUsers.filter(u => u.group !== 'admin');

                const targetUsers = shareMode === 'everyone'
                    ? nonAdminUsers
                    : nonAdminUsers.filter(u => userIds.includes(u.id));

                for (const user of targetUsers) {
                    let hasAccess = false;

                    if (sharing?.enabled) {
                        if (sharing.mode === 'groups' && sharing.groups?.includes(user.group)) {
                            hasAccess = true;
                        } else if (sharing.mode === 'users' && sharing.users?.includes(user.id)) {
                            hasAccess = true;
                        }
                    }

                    if (!hasAccess) {
                        affectedUsers.push({ id: user.id, username: user.username });
                    }
                }
            }

            if (affectedUsers.length > 0) {
                const displayNames: Record<string, string> = {
                    'plex': 'Plex',
                    'sonarr': 'Sonarr',
                    'radarr': 'Radarr',
                    'overseerr': 'Overseerr',
                    'qbittorrent': 'qBittorrent',
                    'systemstatus': 'System Status'
                };

                conflicts.push({
                    integration,
                    integrationDisplayName: displayNames[integration] || integration,
                    affectedUsers
                });
            }
        }

        res.json({ conflicts });
    } catch (error) {
        logger.error('Failed to check conflicts', { error: (error as Error).message, id: req.params.id });
        res.status(500).json({ error: 'Failed to check conflicts' });
    }
});

/**
 * POST /api/templates/:id/share
 * Share a template (admin only)
 * Creates a copy for the user with sharedFromId pointing to original
 */
router.post('/:id/share', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { sharedWith } = req.body; // 'everyone' or user ID

        if (!sharedWith) {
            res.status(400).json({ error: 'sharedWith is required' });
            return;
        }

        const template = await templateDb.getTemplateById(req.params.id);
        if (!template || template.ownerId !== authReq.user!.id) {
            res.status(404).json({ error: 'Template not found or access denied' });
            return;
        }

        // Create share record
        const share = await templateDb.shareTemplate(req.params.id, sharedWith);

        // For specific users (not 'everyone'), create a user copy
        if (sharedWith !== 'everyone') {
            // Check if user already has a copy
            const existingCopy = await templateDb.getUserCopyOfTemplate(sharedWith, template.id);

            if (!existingCopy) {
                try {
                    // Create user's own copy of the template
                    const userCopy = await templateDb.createTemplate({
                        ownerId: sharedWith,
                        name: template.name,
                        description: template.description || undefined,
                        categoryId: template.categoryId || undefined,
                        widgets: template.widgets,
                        sharedFromId: template.id,
                        isDraft: false,
                    });

                    logger.info('User copy created', {
                        templateId: template.id,
                        userCopyId: userCopy.id,
                        userId: sharedWith,
                        originalOwner: authReq.user!.id
                    });
                } catch (copyError) {
                    logger.error('Failed to create user copy', {
                        error: (copyError as Error).message,
                        stack: (copyError as Error).stack,
                        templateId: template.id,
                        userId: sharedWith
                    });
                }
            } else {
                logger.debug('User already has copy', { existingCopyId: existingCopy.id, userId: sharedWith });
            }

            // Send notification
            await createNotification({
                userId: sharedWith,
                type: 'info',
                title: 'New template shared',
                message: `${authReq.user!.username} shared template "${template.name}" with you`,
                metadata: { templateId: template.id }
            });
        }

        logger.info('Template shared', { templateId: req.params.id, sharedWith, by: authReq.user!.id });
        res.json({ share });
    } catch (error) {
        logger.error('Failed to share template', { error: (error as Error).message, id: req.params.id });
        res.status(500).json({ error: 'Failed to share template' });
    }
});

/**
 * DELETE /api/templates/:id/share/:userId
 * Revoke sharing (admin only)
 */
router.delete('/:id/share/:userId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const template = await templateDb.getTemplateById(req.params.id);

        if (!template || template.ownerId !== authReq.user!.id) {
            res.status(404).json({ error: 'Template not found or access denied' });
            return;
        }

        const unshared = await templateDb.unshareTemplate(req.params.id, req.params.userId);

        if (unshared && req.params.userId !== 'everyone') {
            await createNotification({
                userId: req.params.userId,
                type: 'info',
                title: 'Template access revoked',
                message: `${authReq.user!.username} revoked access to template "${template.name}"`,
            });
        }

        res.json({ success: unshared });
    } catch (error) {
        logger.error('Failed to unshare template', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to revoke share' });
    }
});

/**
 * POST /api/templates/:id/set-default
 * Set template as default for new users (admin only)
 */
router.post('/:id/set-default', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const success = await templateDb.setDefaultTemplate(req.params.id, authReq.user!.id);

        if (!success) {
            res.status(404).json({ error: 'Template not found or access denied' });
            return;
        }

        logger.info('Default template set', { templateId: req.params.id, by: authReq.user!.id });
        res.json({ success: true });
    } catch (error) {
        logger.error('Failed to set default template', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to set default template' });
    }
});

export default router;
