import { db } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

// Use DATA_DIR from environment or default to server/data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
export const ICONS_DIR = path.join(DATA_DIR, 'upload/custom-icons');

interface IconRow {
    id: string;
    name: string;
    file_path: string;
    mime_type: string;
    uploaded_by: string | null;
    is_system: number;
    uploaded_at: number;
}

interface IconData {
    filename?: string;
    originalName?: string;
    name?: string;
    filePath?: string;
    mimeType: string;
    uploadedBy: string;
}

interface SystemIconData {
    id: string;
    name: string;
    filePath: string;
    mimeType: string;
}

interface Icon {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    uploadedBy: string | null;
    isSystem?: boolean;
    uploadedAt: string;
    filePath?: string;
}

interface DeleteIconError extends Error {
    isSystemIcon?: boolean;
}

/**
 * Add a custom icon
 */
export async function addIcon(iconData: IconData): Promise<Icon> {
    const icon = {
        id: uuidv4(),
        name: iconData.originalName || iconData.filename || iconData.name || '',
        filePath: iconData.filePath || iconData.filename || '',
        mimeType: iconData.mimeType,
        uploadedBy: iconData.uploadedBy,
        uploadedAt: new Date().toISOString()
    };

    try {
        const insert = db.prepare(`
            INSERT INTO custom_icons (id, name, file_path, mime_type, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        `);

        insert.run(
            icon.id,
            icon.name,
            icon.filePath,
            icon.mimeType,
            icon.uploadedBy
        );

        logger.info(`Custom icon added: ${icon.name} by user ${icon.uploadedBy}`);

        return {
            id: icon.id,
            filename: icon.filePath,
            originalName: icon.name,
            mimeType: icon.mimeType,
            uploadedBy: icon.uploadedBy,
            uploadedAt: icon.uploadedAt
        };
    } catch (error) {
        logger.error('Failed to add custom icon', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Get icon by ID
 */
export async function getIconById(iconId: string): Promise<Icon | null> {
    try {
        const icon = db.prepare('SELECT * FROM custom_icons WHERE id = ?').get(iconId) as IconRow | undefined;

        if (!icon) {
            return null;
        }

        return {
            id: icon.id,
            filename: icon.file_path,
            originalName: icon.name,
            mimeType: icon.mime_type,
            filePath: icon.file_path,
            uploadedBy: icon.uploaded_by,
            isSystem: icon.is_system === 1,
            uploadedAt: new Date(icon.uploaded_at * 1000).toISOString()
        };
    } catch (error) {
        logger.error('Failed to get icon by ID', { error: (error as Error).message, iconId });
        throw error;
    }
}

/**
 * List all custom icons
 */
export async function listIcons(): Promise<Icon[]> {
    try {
        const icons = db.prepare('SELECT id, name, file_path, mime_type, uploaded_by, is_system, uploaded_at FROM custom_icons').all() as IconRow[];

        return icons.map(icon => ({
            id: icon.id,
            filename: icon.file_path,
            originalName: icon.name,
            mimeType: icon.mime_type,
            uploadedBy: icon.uploaded_by,
            isSystem: icon.is_system === 1,
            uploadedAt: new Date(icon.uploaded_at * 1000).toISOString()
        }));
    } catch (error) {
        logger.error('Failed to list custom icons', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Delete an icon
 */
export async function deleteIcon(iconId: string): Promise<Icon | null> {
    try {
        const icon = db.prepare('SELECT * FROM custom_icons WHERE id = ?').get(iconId) as IconRow | undefined;

        if (!icon) {
            return null;
        }

        if (icon.is_system === 1) {
            const error: DeleteIconError = new Error('System icons cannot be deleted');
            error.isSystemIcon = true;
            throw error;
        }

        const filePath = path.join(ICONS_DIR, icon.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`Deleted icon file: ${filePath}`);
        }

        const deleteStmt = db.prepare('DELETE FROM custom_icons WHERE id = ?');
        deleteStmt.run(iconId);

        logger.info(`Custom icon deleted: ${icon.name}`);

        return {
            id: icon.id,
            filename: icon.file_path,
            originalName: icon.name,
            mimeType: icon.mime_type,
            uploadedBy: icon.uploaded_by,
            uploadedAt: new Date(icon.uploaded_at * 1000).toISOString()
        };
    } catch (error) {
        logger.error('Failed to delete custom icon', { error: (error as Error).message, iconId });
        throw error;
    }
}

/**
 * Get absolute file path for serving icon
 */
export async function getIconPath(iconIdOrFilename: string): Promise<string | null> {
    try {
        let icon = db.prepare('SELECT file_path FROM custom_icons WHERE id = ?').get(iconIdOrFilename) as { file_path: string } | undefined;

        if (!icon) {
            icon = db.prepare('SELECT file_path FROM custom_icons WHERE file_path = ?').get(iconIdOrFilename) as { file_path: string } | undefined;
        }

        if (!icon) {
            return null;
        }

        return path.join(ICONS_DIR, icon.file_path);
    } catch (error) {
        logger.error('Failed to get icon path', { error: (error as Error).message, iconIdOrFilename });
        throw error;
    }
}

/**
 * Add a system icon (used during seeding)
 */
export async function addSystemIcon(iconData: SystemIconData): Promise<Icon | null> {
    try {
        const existing = db.prepare('SELECT id FROM custom_icons WHERE id = ?').get(iconData.id);
        if (existing) {
            logger.debug(`System icon already exists: ${iconData.name}`);
            return null;
        }

        const insert = db.prepare(`
            INSERT INTO custom_icons (id, name, file_path, mime_type, uploaded_by, is_system, uploaded_at)
            VALUES (?, ?, ?, ?, NULL, 1, strftime('%s', 'now'))
        `);

        insert.run(
            iconData.id,
            iconData.name,
            iconData.filePath,
            iconData.mimeType
        );

        logger.info(`System icon added: ${iconData.name}`);

        return {
            id: iconData.id,
            filename: iconData.filePath,
            originalName: iconData.name,
            mimeType: iconData.mimeType,
            uploadedBy: null,
            isSystem: true,
            uploadedAt: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Failed to add system icon', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Check if an icon is a system icon
 */
export async function isSystemIcon(iconId: string): Promise<boolean> {
    try {
        const icon = db.prepare('SELECT is_system FROM custom_icons WHERE id = ?').get(iconId) as { is_system: number } | undefined;
        return icon?.is_system === 1;
    } catch (error) {
        logger.error('Failed to check if system icon', { error: (error as Error).message, iconId });
        return false;
    }
}

/**
 * Get system icon by name (e.g., 'overseerr', 'radarr', 'sonarr')
 */
export async function getSystemIconByName(name: string): Promise<Omit<Icon, 'uploadedAt' | 'uploadedBy'> | null> {
    try {
        const icon = db.prepare('SELECT * FROM custom_icons WHERE name = ? AND is_system = 1').get(name) as IconRow | undefined;
        if (!icon) return null;

        return {
            id: icon.id,
            filename: icon.file_path,
            originalName: icon.name,
            mimeType: icon.mime_type,
            isSystem: true
        };
    } catch (error) {
        logger.error('Failed to get system icon by name', { error: (error as Error).message, name });
        return null;
    }
}
