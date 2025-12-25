/**
 * Integration Shares Database Layer
 * 
 * Database-backed sharing for integrations (replaces config-based sharing).
 * Provides atomic share/unshare operations and proper audit trail.
 */

import { db } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

export type ShareType = 'everyone' | 'user' | 'group';

export interface IntegrationShare {
    id: string;
    integrationName: string;
    shareType: ShareType;
    shareTarget: string | null;  // user_id, group_name, or null for 'everyone'
    sharedBy: string;
    createdAt: string;
}

interface ShareRow {
    id: string;
    integration_name: string;
    share_type: string;
    share_target: string | null;
    shared_by: string;
    created_at: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function rowToShare(row: ShareRow): IntegrationShare {
    return {
        id: row.id,
        integrationName: row.integration_name,
        shareType: row.share_type as ShareType,
        shareTarget: row.share_target,
        sharedBy: row.shared_by,
        createdAt: new Date(row.created_at * 1000).toISOString(),
    };
}

// ============================================================================
// Share Operations
// ============================================================================

/**
 * Share an integration with users, groups, or everyone.
 * 
 * @param integrationName - The integration to share (e.g., 'plex', 'sonarr')
 * @param shareType - 'everyone', 'user', or 'group'
 * @param targets - Array of user IDs or group names (empty for 'everyone')
 * @param sharedBy - Admin user ID creating the share
 * @returns Array of created share records
 */
export async function shareIntegration(
    integrationName: string,
    shareType: ShareType,
    targets: string[],
    sharedBy: string
): Promise<IntegrationShare[]> {
    const shares: IntegrationShare[] = [];

    const insert = db.prepare(`
        INSERT OR IGNORE INTO integration_shares (id, integration_name, share_type, share_target, shared_by)
        VALUES (?, ?, ?, ?, ?)
    `);

    if (shareType === 'everyone') {
        // Single record for 'everyone'
        const id = uuidv4();
        try {
            insert.run(id, integrationName, 'everyone', null, sharedBy);
            const created = await getShareById(id);
            if (created) shares.push(created);
            logger.info('Integration shared with everyone', { integrationName, sharedBy });
        } catch (error) {
            if (!(error as Error).message.includes('UNIQUE constraint')) {
                throw error;
            }
            // Already shared with everyone - not an error
            logger.debug('Integration already shared with everyone', { integrationName });
        }
    } else {
        // Multiple records for users/groups
        for (const target of targets) {
            const id = uuidv4();
            try {
                insert.run(id, integrationName, shareType, target, sharedBy);
                const created = await getShareById(id);
                if (created) shares.push(created);
            } catch (error) {
                if (!(error as Error).message.includes('UNIQUE constraint')) {
                    throw error;
                }
                // Already shared with this target - not an error
                logger.debug('Integration already shared with target', { integrationName, shareType, target });
            }
        }
        logger.info('Integration shared', { integrationName, shareType, targetCount: targets.length, sharedBy });
    }

    return shares;
}

/**
 * Revoke sharing for an integration.
 * 
 * @param integrationName - The integration to unshare
 * @param shareType - Optional: only revoke this type ('everyone', 'user', 'group')
 * @param targets - Optional: only revoke for these specific targets
 * @returns Number of shares revoked
 */
export async function unshareIntegration(
    integrationName: string,
    shareType?: ShareType,
    targets?: string[]
): Promise<number> {
    let sql = 'DELETE FROM integration_shares WHERE integration_name = ?';
    const params: (string | null)[] = [integrationName];

    if (shareType) {
        sql += ' AND share_type = ?';
        params.push(shareType);

        if (targets && targets.length > 0 && shareType !== 'everyone') {
            const placeholders = targets.map(() => '?').join(', ');
            sql += ` AND share_target IN (${placeholders})`;
            params.push(...targets);
        }
    }

    const result = db.prepare(sql).run(...params);
    logger.info('Integration sharing revoked', { integrationName, shareType, targets, deletedCount: result.changes });
    return result.changes;
}

/**
 * Get all shares for an integration.
 */
export async function getIntegrationShares(integrationName: string): Promise<IntegrationShare[]> {
    const rows = db.prepare(`
        SELECT * FROM integration_shares WHERE integration_name = ?
        ORDER BY created_at ASC
    `).all(integrationName) as ShareRow[];

    return rows.map(rowToShare);
}

/**
 * Get all shared integrations (across all integrations).
 * Used for SharedWidgetsSettings display.
 */
export async function getAllSharedIntegrations(): Promise<Map<string, IntegrationShare[]>> {
    const rows = db.prepare(`
        SELECT * FROM integration_shares ORDER BY integration_name, created_at
    `).all() as ShareRow[];

    const byIntegration = new Map<string, IntegrationShare[]>();
    for (const row of rows) {
        const share = rowToShare(row);
        const existing = byIntegration.get(share.integrationName) || [];
        existing.push(share);
        byIntegration.set(share.integrationName, existing);
    }

    return byIntegration;
}

/**
 * Check if a user has access to an integration.
 * 
 * @param integrationName - Integration to check
 * @param userId - User ID
 * @param userGroup - User's group
 * @returns true if user has access
 */
export async function userHasIntegrationAccess(
    integrationName: string,
    userId: string,
    userGroup: string
): Promise<boolean> {
    // Check for 'everyone' share
    const everyoneShare = db.prepare(`
        SELECT 1 FROM integration_shares 
        WHERE integration_name = ? AND share_type = 'everyone'
        LIMIT 1
    `).get(integrationName);

    if (everyoneShare) return true;

    // Check for direct user share
    const userShare = db.prepare(`
        SELECT 1 FROM integration_shares 
        WHERE integration_name = ? AND share_type = 'user' AND share_target = ?
        LIMIT 1
    `).get(integrationName, userId);

    if (userShare) return true;

    // Check for group share
    const groupShare = db.prepare(`
        SELECT 1 FROM integration_shares 
        WHERE integration_name = ? AND share_type = 'group' AND share_target = ?
        LIMIT 1
    `).get(integrationName, userGroup);

    return !!groupShare;
}

/**
 * Get all integration names that a user has access to.
 * 
 * @param userId - User ID
 * @param userGroup - User's group
 * @returns Array of integration names
 */
export async function getUserAccessibleIntegrations(
    userId: string,
    userGroup: string
): Promise<string[]> {
    const rows = db.prepare(`
        SELECT DISTINCT integration_name FROM integration_shares
        WHERE share_type = 'everyone'
           OR (share_type = 'user' AND share_target = ?)
           OR (share_type = 'group' AND share_target = ?)
    `).all(userId, userGroup) as { integration_name: string }[];

    return rows.map(r => r.integration_name);
}

/**
 * Share integrations required by a template with target users.
 * Used when sharing a template with `shareIntegrations: true`.
 * 
 * @param requiredIntegrations - Array of integration names needed by template widgets
 * @param targetUserIds - User IDs to share with
 * @param adminId - Admin performing the share
 * @returns Object with shared and alreadyShared integration names
 */
export async function shareIntegrationsForUsers(
    requiredIntegrations: string[],
    targetUserIds: string[],
    adminId: string
): Promise<{ shared: string[]; alreadyShared: string[] }> {
    const shared: string[] = [];
    const alreadyShared: string[] = [];

    for (const integration of requiredIntegrations) {
        // Check if already shared with everyone
        const everyoneShare = db.prepare(`
            SELECT 1 FROM integration_shares 
            WHERE integration_name = ? AND share_type = 'everyone'
            LIMIT 1
        `).get(integration);

        if (everyoneShare) {
            alreadyShared.push(integration);
            continue;
        }

        // Share with each user who doesn't already have access
        let anyNewShares = false;
        for (const userId of targetUserIds) {
            const existingShare = db.prepare(`
                SELECT 1 FROM integration_shares 
                WHERE integration_name = ? AND share_type = 'user' AND share_target = ?
                LIMIT 1
            `).get(integration, userId);

            if (!existingShare) {
                const id = uuidv4();
                db.prepare(`
                    INSERT INTO integration_shares (id, integration_name, share_type, share_target, shared_by)
                    VALUES (?, ?, 'user', ?, ?)
                `).run(id, integration, userId, adminId);
                anyNewShares = true;
            }
        }

        if (anyNewShares) {
            shared.push(integration);
        } else {
            alreadyShared.push(integration);
        }
    }

    logger.info('Integrations shared for template', { shared, alreadyShared, userCount: targetUserIds.length, adminId });
    return { shared, alreadyShared };
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function getShareById(id: string): Promise<IntegrationShare | null> {
    const row = db.prepare('SELECT * FROM integration_shares WHERE id = ?').get(id) as ShareRow | undefined;
    return row ? rowToShare(row) : null;
}

// ============================================================================
// Migration Helper
// ============================================================================

/**
 * Migrate existing config-based shares to database.
 * Should be called once after table creation.
 * 
 * @param integrations - The integrations config from systemConfig
 * @param adminId - Admin ID to use as sharedBy
 */
export async function migrateConfigSharesToDatabase(
    integrations: Record<string, {
        enabled?: boolean;
        sharing?: {
            enabled?: boolean;
            mode?: 'everyone' | 'groups' | 'users';
            groups?: string[];
            users?: string[];
            sharedBy?: string;
        }
    }>,
    adminId: string
): Promise<{ migrated: number; skipped: number }> {
    let migrated = 0;
    let skipped = 0;

    for (const [integrationName, config] of Object.entries(integrations)) {
        if (!config.enabled || !config.sharing?.enabled) {
            continue;
        }

        const sharing = config.sharing;
        const sharedBy = sharing.sharedBy || adminId;

        try {
            if (sharing.mode === 'everyone') {
                await shareIntegration(integrationName, 'everyone', [], sharedBy);
                migrated++;
            } else if (sharing.mode === 'groups' && sharing.groups?.length) {
                await shareIntegration(integrationName, 'group', sharing.groups, sharedBy);
                migrated++;
            } else if (sharing.mode === 'users' && sharing.users?.length) {
                await shareIntegration(integrationName, 'user', sharing.users, sharedBy);
                migrated++;
            } else {
                skipped++;
            }
        } catch (error) {
            logger.error('Failed to migrate integration share', { integrationName, error: (error as Error).message });
            skipped++;
        }
    }

    logger.info('Migration complete', { migrated, skipped });
    return { migrated, skipped };
}
