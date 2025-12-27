/**
 * Template Database Layer
 * 
 * Handles all CRUD operations for dashboard templates, categories, shares, and backups.
 */

import { db } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TemplateWidget {
    type: string;
    layout: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    config?: Record<string, unknown>; // Widget-specific settings (showHeader, flatten, etc.)
}

export interface DashboardTemplate {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    categoryId: string | null;
    widgets: TemplateWidget[];
    thumbnail: string | null;
    isDraft: boolean;
    isDefault: boolean;
    sharedFromId: string | null;
    userModified: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface TemplateCategory {
    id: string;
    name: string;
    createdBy: string;
    createdAt: string;
}

export interface TemplateShare {
    id: string;
    templateId: string;
    sharedWith: string; // User ID or 'everyone'
    createdAt: string;
}

export interface DashboardBackup {
    id: string;
    userId: string;
    widgets: unknown[];
    mobileLayoutMode: 'linked' | 'independent';
    mobileWidgets: unknown[] | null;
    backedUpAt: string;
}

// Database row types
interface TemplateRow {
    id: string;
    owner_id: string;
    name: string;
    description: string | null;
    category_id: string | null;
    widgets: string;
    thumbnail: string | null;
    is_draft: number;
    is_default: number;
    shared_from_id: string | null;
    user_modified: number;
    version: number;
    created_at: number;
    updated_at: number;
}

interface CategoryRow {
    id: string;
    name: string;
    created_by: string;
    created_at: number;
}

interface ShareRow {
    id: string;
    template_id: string;
    shared_with: string;
    created_at: number;
}

interface BackupRow {
    id: string;
    user_id: string;
    widgets: string;
    mobile_layout_mode: string;
    mobile_widgets: string | null;
    backed_up_at: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function rowToTemplate(row: TemplateRow): DashboardTemplate {
    let widgets: TemplateWidget[] = [];
    try {
        widgets = JSON.parse(row.widgets);
    } catch {
        logger.warn('Failed to parse template widgets', { templateId: row.id });
    }

    return {
        id: row.id,
        ownerId: row.owner_id,
        name: row.name,
        description: row.description,
        categoryId: row.category_id,
        widgets,
        thumbnail: row.thumbnail,
        isDraft: row.is_draft === 1,
        isDefault: row.is_default === 1,
        sharedFromId: row.shared_from_id,
        userModified: row.user_modified === 1,
        version: row.version,
        createdAt: new Date(row.created_at * 1000).toISOString(),
        updatedAt: new Date(row.updated_at * 1000).toISOString(),
    };
}

function rowToCategory(row: CategoryRow): TemplateCategory {
    return {
        id: row.id,
        name: row.name,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at * 1000).toISOString(),
    };
}

// ============================================================================
// Template CRUD Operations
// ============================================================================

export interface CreateTemplateData {
    ownerId: string;
    name: string;
    description?: string;
    categoryId?: string;
    widgets?: TemplateWidget[];
    thumbnail?: string;
    isDraft?: boolean;
    isDefault?: boolean;
    sharedFromId?: string;
    version?: number; // For shared copies, match parent version
}

/**
 * Create a new template
 */
export async function createTemplate(data: CreateTemplateData): Promise<DashboardTemplate> {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    try {
        const insert = db.prepare(`
            INSERT INTO dashboard_templates 
            (id, owner_id, name, description, category_id, widgets, thumbnail, is_draft, is_default, shared_from_id, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insert.run(
            id,
            data.ownerId,
            data.name,
            data.description || null,
            data.categoryId || null,
            JSON.stringify(data.widgets || []),
            data.thumbnail || null,
            data.isDraft ? 1 : 0,
            data.isDefault ? 1 : 0,
            data.sharedFromId || null,
            data.version ?? 1, // Use provided version or default to 1
            now,
            now
        );

        logger.debug('Template created', { id, name: data.name, ownerId: data.ownerId, version: data.version ?? 1 });

        return getTemplateById(id) as Promise<DashboardTemplate>;
    } catch (error) {
        logger.error('Failed to create template', { error: (error as Error).message, data });
        throw error;
    }
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string): Promise<DashboardTemplate | null> {
    try {
        const row = db.prepare('SELECT * FROM dashboard_templates WHERE id = ?').get(id) as TemplateRow | undefined;
        return row ? rowToTemplate(row) : null;
    } catch (error) {
        logger.error('Failed to get template', { error: (error as Error).message, id });
        throw error;
    }
}

/**
 * Extended template with sharing metadata
 */
export interface TemplateWithMeta extends DashboardTemplate {
    sharedBy?: string;      // Username of original owner (for shared templates)
    hasUpdate?: boolean;    // Parent template has newer version
    originalVersion?: number; // Parent's current version for comparison
    shareCount?: number;    // Number of users this template is shared with (for admin)
}

/**
 * Get all templates for a user (owned only - user copies of shared templates ARE owned)
 * Includes sharedBy and hasUpdate for templates that were shared
 */
export async function getTemplatesForUser(userId: string): Promise<TemplateWithMeta[]> {
    try {
        // Get all templates owned by this user
        // This now includes user copies of shared templates (they have sharedFromId)
        // For admin templates, count how many user copies exist
        const query = `
            SELECT 
                t.*,
                parent.owner_id as parent_owner_id,
                parent.version as parent_version,
                u.username as parent_owner_username,
                (SELECT COUNT(*) FROM template_shares WHERE template_id = t.id) as share_count
            FROM dashboard_templates t
            LEFT JOIN dashboard_templates parent ON t.shared_from_id = parent.id
            LEFT JOIN users u ON parent.owner_id = u.id
            WHERE t.owner_id = ?
            ORDER BY t.is_draft DESC, t.name ASC
        `;

        interface ExtendedRow extends TemplateRow {
            parent_owner_id: string | null;
            parent_version: number | null;
            parent_owner_username: string | null;
            share_count: number;
        }

        const rows = db.prepare(query).all(userId) as ExtendedRow[];

        return rows.map(row => {
            const template = rowToTemplate(row);
            const meta: TemplateWithMeta = { ...template };

            // If this is a shared copy, add metadata
            if (row.shared_from_id && row.parent_owner_username) {
                meta.sharedBy = row.parent_owner_username;
                meta.hasUpdate = row.parent_version !== null && row.parent_version > row.version;
                meta.originalVersion = row.parent_version ?? undefined;
            }

            // For non-shared templates (admin's originals), show share count
            if (!row.shared_from_id && row.share_count > 0) {
                meta.shareCount = row.share_count;
            }

            return meta;
        });
    } catch (error) {
        logger.error('Failed to get templates for user', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Get user's copy of a shared template (by sharedFromId)
 */
export async function getUserCopyOfTemplate(userId: string, originalTemplateId: string): Promise<DashboardTemplate | null> {
    try {
        const row = db.prepare(
            'SELECT * FROM dashboard_templates WHERE owner_id = ? AND shared_from_id = ?'
        ).get(userId, originalTemplateId) as TemplateRow | undefined;

        return row ? rowToTemplate(row) : null;
    } catch (error) {
        logger.error('Failed to get user copy', { error: (error as Error).message, userId, originalTemplateId });
        throw error;
    }
}

/**
 * Update a template
 */
export interface UpdateTemplateData {
    name?: string;
    description?: string;
    categoryId?: string | null;
    widgets?: TemplateWidget[];
    thumbnail?: string | null;
    isDraft?: boolean;
    isDefault?: boolean;
    userModified?: boolean;
}

export async function updateTemplate(id: string, ownerId: string, data: UpdateTemplateData): Promise<DashboardTemplate | null> {
    try {
        // Verify ownership
        const existing = await getTemplateById(id);
        if (!existing || existing.ownerId !== ownerId) {
            return null;
        }

        const updates: string[] = [];
        const params: (string | number | null)[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            params.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            params.push(data.description);
        }
        if (data.categoryId !== undefined) {
            updates.push('category_id = ?');
            params.push(data.categoryId);
        }
        if (data.widgets !== undefined) {
            updates.push('widgets = ?');
            params.push(JSON.stringify(data.widgets));
        }
        if (data.thumbnail !== undefined) {
            updates.push('thumbnail = ?');
            params.push(data.thumbnail);
        }
        if (data.isDraft !== undefined) {
            updates.push('is_draft = ?');
            params.push(data.isDraft ? 1 : 0);
        }
        if (data.isDefault !== undefined) {
            updates.push('is_default = ?');
            params.push(data.isDefault ? 1 : 0);
        }
        if (data.userModified !== undefined) {
            updates.push('user_modified = ?');
            params.push(data.userModified ? 1 : 0);
        }

        // Increment version
        updates.push('version = version + 1');

        if (updates.length === 0) {
            return existing;
        }

        params.push(id);
        const updateQuery = `UPDATE dashboard_templates SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(updateQuery).run(...params);

        logger.debug('Template updated', { id, updates: Object.keys(data) });

        return getTemplateById(id);
    } catch (error) {
        logger.error('Failed to update template', { error: (error as Error).message, id });
        throw error;
    }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string, ownerId: string): Promise<boolean> {
    try {
        const result = db.prepare('DELETE FROM dashboard_templates WHERE id = ? AND owner_id = ?').run(id, ownerId);

        if (result.changes > 0) {
            logger.debug('Template deleted', { id, ownerId });
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Failed to delete template', { error: (error as Error).message, id });
        throw error;
    }
}

/**
 * Get the default template (for new users)
 */
export async function getDefaultTemplate(): Promise<DashboardTemplate | null> {
    try {
        const row = db.prepare('SELECT * FROM dashboard_templates WHERE is_default = 1 LIMIT 1').get() as TemplateRow | undefined;
        return row ? rowToTemplate(row) : null;
    } catch (error) {
        logger.error('Failed to get default template', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Set a template as default (clears other defaults)
 */
export async function setDefaultTemplate(id: string, ownerId: string): Promise<boolean> {
    try {
        // Verify ownership and admin status would be checked at route level
        const existing = await getTemplateById(id);
        if (!existing || existing.ownerId !== ownerId) {
            return false;
        }

        // Clear all defaults
        db.prepare('UPDATE dashboard_templates SET is_default = 0 WHERE is_default = 1').run();

        // Set new default
        db.prepare('UPDATE dashboard_templates SET is_default = 1 WHERE id = ?').run(id);

        logger.info('Default template set', { id });
        return true;
    } catch (error) {
        logger.error('Failed to set default template', { error: (error as Error).message, id });
        throw error;
    }
}

// ============================================================================
// Category Operations
// ============================================================================

/**
 * Get all categories
 */
export async function getCategories(): Promise<TemplateCategory[]> {
    try {
        const rows = db.prepare('SELECT * FROM template_categories ORDER BY name ASC').all() as CategoryRow[];
        return rows.map(rowToCategory);
    } catch (error) {
        logger.error('Failed to get categories', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Create a category (admin only - checked at route level)
 */
export async function createCategory(name: string, createdBy: string): Promise<TemplateCategory> {
    const id = uuidv4();

    try {
        const insert = db.prepare(`
            INSERT INTO template_categories (id, name, created_by)
            VALUES (?, ?, ?)
        `);

        insert.run(id, name, createdBy);
        logger.debug('Category created', { id, name, createdBy });

        const row = db.prepare('SELECT * FROM template_categories WHERE id = ?').get(id) as CategoryRow;
        return rowToCategory(row);
    } catch (error) {
        logger.error('Failed to create category', { error: (error as Error).message, name });
        throw error;
    }
}

/**
 * Delete a category (moves templates to uncategorized)
 */
export async function deleteCategory(id: string): Promise<boolean> {
    try {
        // Templates will have category_id set to NULL due to ON DELETE SET NULL
        const result = db.prepare('DELETE FROM template_categories WHERE id = ?').run(id);

        if (result.changes > 0) {
            logger.debug('Category deleted', { id });
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Failed to delete category', { error: (error as Error).message, id });
        throw error;
    }
}

// ============================================================================
// Sharing Operations
// ============================================================================

/**
 * Share a template with a user or everyone
 */
export async function shareTemplate(templateId: string, sharedWith: string): Promise<TemplateShare> {
    const id = uuidv4();

    try {
        const insert = db.prepare(`
            INSERT OR IGNORE INTO template_shares (id, template_id, shared_with)
            VALUES (?, ?, ?)
        `);

        insert.run(id, templateId, sharedWith);
        logger.debug('Template shared', { templateId, sharedWith });

        return {
            id,
            templateId,
            sharedWith,
            createdAt: new Date().toISOString(),
        };
    } catch (error) {
        logger.error('Failed to share template', { error: (error as Error).message, templateId, sharedWith });
        throw error;
    }
}

/**
 * Unshare a template
 * Also clears shared_from_id on user copies so they become "normal" templates
 */
export async function unshareTemplate(templateId: string, sharedWith: string): Promise<boolean> {
    try {
        // Delete the share permission
        const result = db.prepare('DELETE FROM template_shares WHERE template_id = ? AND shared_with = ?').run(templateId, sharedWith);

        // Also clear shared_from_id on user copies so they look like normal templates
        // This removes the "shared by" badge on the user's copy
        if (sharedWith === 'everyone') {
            // If sharing with everyone was revoked, clear all copies
            db.prepare('UPDATE dashboard_templates SET shared_from_id = NULL WHERE shared_from_id = ?').run(templateId);
            logger.debug('Cleared shared_from_id on all user copies', { templateId });
        } else {
            // Clear shared_from_id only for the specific user's copy
            db.prepare('UPDATE dashboard_templates SET shared_from_id = NULL WHERE shared_from_id = ? AND owner_id = ?').run(templateId, sharedWith);
            logger.debug('Cleared shared_from_id on user copy', { templateId, userId: sharedWith });
        }

        return result.changes > 0;
    } catch (error) {
        logger.error('Failed to unshare template', { error: (error as Error).message, templateId, sharedWith });
        throw error;
    }
}

/**
 * Get shares for a template
 */
export async function getTemplateShares(templateId: string): Promise<TemplateShare[]> {
    try {
        const rows = db.prepare('SELECT * FROM template_shares WHERE template_id = ?').all(templateId) as ShareRow[];
        return rows.map(row => ({
            id: row.id,
            templateId: row.template_id,
            sharedWith: row.shared_with,
            createdAt: new Date(row.created_at * 1000).toISOString(),
        }));
    } catch (error) {
        logger.error('Failed to get template shares', { error: (error as Error).message, templateId });
        throw error;
    }
}

// ============================================================================
// Backup Operations
// ============================================================================

/**
 * Create or update dashboard backup before template apply
 */
export async function createBackup(
    userId: string,
    widgets: unknown[],
    mobileLayoutMode: 'linked' | 'independent',
    mobileWidgets?: unknown[]
): Promise<DashboardBackup> {
    const id = uuidv4();

    try {
        // Upsert - replace existing backup for user
        const upsert = db.prepare(`
            INSERT INTO dashboard_backups (id, user_id, widgets, mobile_layout_mode, mobile_widgets)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                widgets = excluded.widgets,
                mobile_layout_mode = excluded.mobile_layout_mode,
                mobile_widgets = excluded.mobile_widgets,
                backed_up_at = strftime('%s', 'now')
        `);

        upsert.run(
            id,
            userId,
            JSON.stringify(widgets),
            mobileLayoutMode,
            mobileWidgets ? JSON.stringify(mobileWidgets) : null
        );

        logger.debug('Dashboard backup created', { userId, widgetCount: widgets.length });

        return getBackup(userId) as Promise<DashboardBackup>;
    } catch (error) {
        logger.error('Failed to create backup', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Get backup for a user
 */
export async function getBackup(userId: string): Promise<DashboardBackup | null> {
    try {
        const row = db.prepare('SELECT * FROM dashboard_backups WHERE user_id = ?').get(userId) as BackupRow | undefined;

        if (!row) return null;

        let widgets: unknown[] = [];
        let mobileWidgets: unknown[] | null = null;

        try {
            widgets = JSON.parse(row.widgets);
        } catch {
            logger.warn('Failed to parse backup widgets', { userId });
        }

        if (row.mobile_widgets) {
            try {
                mobileWidgets = JSON.parse(row.mobile_widgets);
            } catch {
                logger.warn('Failed to parse backup mobile widgets', { userId });
            }
        }

        return {
            id: row.id,
            userId: row.user_id,
            widgets,
            mobileLayoutMode: row.mobile_layout_mode as 'linked' | 'independent',
            mobileWidgets,
            backedUpAt: new Date(row.backed_up_at * 1000).toISOString(),
        };
    } catch (error) {
        logger.error('Failed to get backup', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Delete backup after revert
 */
export async function deleteBackup(userId: string): Promise<boolean> {
    try {
        const result = db.prepare('DELETE FROM dashboard_backups WHERE user_id = ?').run(userId);
        return result.changes > 0;
    } catch (error) {
        logger.error('Failed to delete backup', { error: (error as Error).message, userId });
        throw error;
    }
}

// ============================================================================
// Template Application Helpers
// ============================================================================

interface DashboardWidget {
    i: string;
    id: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    layouts: {
        lg: {
            x: number;
            y: number;
            w: number;
            h: number;
        };
    };
    config: Record<string, unknown>;
}

/**
 * Convert template widgets to dashboard widget format
 * This is the canonical conversion used by both:
 * - POST /api/templates/:id/apply endpoint
 * - User creation (applying default template)
 */
export function convertTemplateWidgets(widgets: TemplateWidget[]): DashboardWidget[] {
    return widgets.map((tw, index) => {
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
}

/**
 * Apply a template to a user's dashboard
 * Used by both the apply endpoint and user creation (default template)
 * 
 * @param template - The template to apply
 * @param userId - User ID to apply to
 * @param createBackup - Whether to backup current dashboard (false for new users)
 */
export async function applyTemplateToUser(
    template: DashboardTemplate,
    userId: string,
    createBackupFirst: boolean = true
): Promise<DashboardWidget[]> {
    // Dynamic import to avoid circular dependency
    const { getUserConfig, updateUserConfig } = await import('./userConfig');

    // Backup current dashboard if requested
    if (createBackupFirst) {
        const userConfig = await getUserConfig(userId);
        const currentDashboard = userConfig.dashboard || {};

        await createBackup(
            userId,
            currentDashboard.widgets || [],
            currentDashboard.mobileLayoutMode || 'linked',
            currentDashboard.mobileWidgets
        );
    }

    // Convert template widgets to dashboard format
    const dashboardWidgets = convertTemplateWidgets(template.widgets);

    // Apply to user's dashboard
    await updateUserConfig(userId, {
        dashboard: {
            widgets: dashboardWidgets,
            mobileLayoutMode: 'linked',
            mobileWidgets: undefined,
        },
    });

    logger.info('Template applied to user', {
        templateId: template.id,
        userId,
        widgetCount: dashboardWidgets.length,
        backupCreated: createBackupFirst
    });

    return dashboardWidgets;
}

// ============================================================================
// Template Sharing Helper
// ============================================================================

export interface ShareTemplateOptions {
    /** Strip sensitive configs from widgets (default: true) */
    stripConfigs?: boolean;
    /** Share required integrations with user (default: false) */
    shareIntegrations?: boolean;
    /** Apply template to user's dashboard (default: false) */
    applyToDashboard?: boolean;
    /** Create backup before applying (default: true, ignored if applyToDashboard=false) */
    createBackup?: boolean;
}

export interface ShareTemplateResult {
    templateCopy: DashboardTemplate | null;
    integrationsShared: string[];
    skipped: boolean;
    reason?: string;
}

/**
 * Share a template with a user - creates user's copy with sanitized config.
 * 
 * Used by:
 * - Manual share endpoint (POST /api/templates/:id/share)
 * - Auto-share for new users (default template)
 * 
 * @param template - The template to share
 * @param targetUserId - User to share with
 * @param sharedByAdminId - Admin performing the share
 * @param options - Sharing options
 */
export async function shareTemplateWithUser(
    template: DashboardTemplate,
    targetUserId: string,
    sharedByAdminId: string,
    options: ShareTemplateOptions = {}
): Promise<ShareTemplateResult> {
    const {
        stripConfigs = true,
        shareIntegrations = false,
        applyToDashboard = false,
        createBackup = true,
    } = options;

    // Check if user already has a copy
    const existingCopy = await getUserCopyOfTemplate(targetUserId, template.id);
    if (existingCopy) {
        logger.debug('User already has template copy', { userId: targetUserId, templateId: template.id });
        return {
            templateCopy: existingCopy,
            integrationsShared: [],
            skipped: true,
            reason: 'User already has a copy of this template'
        };
    }

    // Strip sensitive configs if requested
    let sanitizedWidgets = template.widgets;
    if (stripConfigs) {
        const { stripSensitiveConfig } = await import('../../shared/widgetIntegrations');
        sanitizedWidgets = template.widgets.map(widget => ({
            ...widget,
            config: stripSensitiveConfig(widget.type, widget.config || {})
        }));
    }

    // Create user's copy of the template
    const userCopy = await createTemplate({
        ownerId: targetUserId,
        name: template.name,
        description: template.description || undefined,
        categoryId: template.categoryId || undefined,
        widgets: sanitizedWidgets,
        sharedFromId: template.id,
        version: template.version, // Match parent version so hasUpdate = false
        isDraft: false,
    });

    logger.info('Template copy created for user', {
        templateId: template.id,
        userCopyId: userCopy.id,
        userId: targetUserId,
        configsStripped: stripConfigs
    });

    // Share required integrations if requested
    let integrationsShared: string[] = [];
    if (shareIntegrations) {
        const { getRequiredIntegrations } = await import('../../shared/widgetIntegrations');
        const widgetTypes = template.widgets.map(w => w.type);
        const requiredIntegrations = getRequiredIntegrations(widgetTypes);

        if (requiredIntegrations.length > 0) {
            const integrationSharesDb = await import('./integrationShares');
            const result = await integrationSharesDb.shareIntegrationsForUsers(
                requiredIntegrations,
                [targetUserId],
                sharedByAdminId
            );
            integrationsShared = result.shared;

            logger.info('Integrations shared with user', {
                templateId: template.id,
                userId: targetUserId,
                shared: result.shared,
                alreadyShared: result.alreadyShared
            });
        }
    }

    // Apply to dashboard if requested
    // IMPORTANT: Use userCopy (sanitized) instead of original template
    // This ensures sensitive configs (links, custom HTML) are stripped from dashboard widgets
    if (applyToDashboard && userCopy) {
        await applyTemplateToUser(userCopy, targetUserId, createBackup);
    }

    return {
        templateCopy: userCopy,
        integrationsShared,
        skipped: false
    };
}
