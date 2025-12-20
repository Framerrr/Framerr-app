import { db } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// Lazy-load notificationEmitter to avoid circular dependency
let notificationEmitter: { sendNotification: (userId: string, notification: unknown) => void } | null = null;

function getEmitter() {
    if (!notificationEmitter) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        notificationEmitter = require('../services/notificationEmitter');
    }
    return notificationEmitter!;
}

interface NotificationData {
    userId: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    iconId?: string | null;
    metadata?: Record<string, unknown> | null;
    expiresAt?: string | null;
}

interface Notification {
    id: string;
    userId: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    iconId: string | null;
    read: boolean;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    expiresAt: string | null;
}

interface NotificationRow {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    icon_id: string | null;
    read: number;
    metadata: string | null;
    created_at: number;
}

interface NotificationFilters {
    unread?: boolean;
    limit?: number | string;
    offset?: number | string;
}

interface NotificationsResult {
    notifications: Notification[];
    unreadCount: number;
    total: number;
}

interface CountResult {
    count: number;
}

/**
 * Create a notification
 */
export async function createNotification(notificationData: NotificationData): Promise<Notification> {
    const notification: Notification = {
        id: uuidv4(),
        userId: notificationData.userId,
        type: notificationData.type || 'info',
        title: notificationData.title,
        message: notificationData.message,
        iconId: notificationData.iconId || null,
        read: false,
        metadata: notificationData.metadata || null,
        createdAt: new Date().toISOString(),
        expiresAt: notificationData.expiresAt || null
    };

    try {
        const insert = db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, icon_id, metadata, read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        `);

        insert.run(
            notification.id,
            notification.userId,
            notification.title,
            notification.message,
            notification.type,
            notification.iconId,
            notification.metadata ? JSON.stringify(notification.metadata) : null,
            notification.read ? 1 : 0
        );

        logger.debug('Notification created', {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            hasMetadata: !!notification.metadata,
            metadata: notification.metadata
        });

        try {
            getEmitter().sendNotification(notification.userId, notification);
        } catch (sseError) {
            logger.debug('SSE emit failed (no active connections)', { error: (sseError as Error).message });
        }

        return notification;
    } catch (error) {
        logger.error('Failed to create notification', { error: (error as Error).message });
        throw error;
    }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(userId: string, filters: NotificationFilters = {}): Promise<NotificationsResult> {
    try {
        const offset = parseInt(String(filters.offset)) || 0;
        const limit = parseInt(String(filters.limit)) || 50;

        let query = 'SELECT * FROM notifications WHERE user_id = ?';
        const params: (string | number)[] = [userId];

        if (filters.unread === true) {
            query += ' AND read = 0';
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const notifications = db.prepare(query).all(...params) as NotificationRow[];

        let countQuery = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?';
        const countParams: string[] = [userId];

        if (filters.unread === true) {
            countQuery += ' AND read = 0';
        }

        const totalResult = db.prepare(countQuery).get(...countParams) as CountResult;
        const total = totalResult.count;

        const unreadResult = db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
        ).get(userId) as CountResult;
        const unreadCount = unreadResult.count;

        const formattedNotifications: Notification[] = notifications.map(n => {
            let parsedMetadata: Record<string, unknown> | null = null;
            if (n.metadata) {
                try {
                    parsedMetadata = JSON.parse(n.metadata);
                } catch {
                    logger.warn('Failed to parse notification metadata', { id: n.id });
                }
            }
            return {
                id: n.id,
                userId: n.user_id,
                type: n.type as Notification['type'],
                title: n.title,
                message: n.message,
                iconId: n.icon_id || null,
                read: n.read === 1,
                metadata: parsedMetadata,
                createdAt: new Date(n.created_at * 1000).toISOString(),
                expiresAt: null
            };
        });

        return {
            notifications: formattedNotifications,
            unreadCount,
            total
        };
    } catch (error) {
        logger.error('Failed to get notifications', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    try {
        const update = db.prepare(`
            UPDATE notifications
            SET read = 1
            WHERE id = ? AND user_id = ?
        `);

        const result = update.run(notificationId, userId);

        if (result.changes === 0) {
            return null;
        }

        const notification = db.prepare(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
        ).get(notificationId, userId) as NotificationRow;

        logger.debug('Notification marked as read', { id: notificationId, userId });

        try {
            getEmitter().sendNotification(userId, {
                type: 'sync',
                action: 'markRead',
                notificationId
            });
        } catch (sseError) {
            logger.debug('SSE sync emit failed', { error: (sseError as Error).message });
        }

        return {
            id: notification.id,
            userId: notification.user_id,
            type: notification.type as Notification['type'],
            title: notification.title,
            message: notification.message,
            iconId: notification.icon_id || null,
            read: notification.read === 1,
            metadata: null,
            createdAt: new Date(notification.created_at * 1000).toISOString(),
            expiresAt: null
        };
    } catch (error) {
        logger.error('Failed to mark notification as read', { error: (error as Error).message, notificationId, userId });
        throw error;
    }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
        const deleteStmt = db.prepare(`
            DELETE FROM notifications
            WHERE id = ? AND user_id = ?
        `);

        const result = deleteStmt.run(notificationId, userId);

        if (result.changes === 0) {
            return false;
        }

        logger.debug('Notification deleted', { id: notificationId, userId });

        try {
            getEmitter().sendNotification(userId, {
                type: 'sync',
                action: 'delete',
                notificationId
            });
        } catch (sseError) {
            logger.debug('SSE sync emit failed', { error: (sseError as Error).message });
        }

        return true;
    } catch (error) {
        logger.error('Failed to delete notification', { error: (error as Error).message, notificationId, userId });
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
    try {
        const update = db.prepare(`
            UPDATE notifications
            SET read = 1
            WHERE user_id = ? AND read = 0
        `);

        const result = update.run(userId);
        const updatedCount = result.changes;

        if (updatedCount > 0) {
            logger.info('All notifications marked as read', { userId, count: updatedCount });

            try {
                getEmitter().sendNotification(userId, {
                    type: 'sync',
                    action: 'markAllRead'
                });
            } catch (sseError) {
                logger.debug('SSE sync emit failed', { error: (sseError as Error).message });
            }
        }

        return updatedCount;
    } catch (error) {
        logger.error('Failed to mark all notifications as read', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Clear all notifications for a user
 */
export async function clearAll(userId: string): Promise<number> {
    try {
        const deleteStmt = db.prepare(`
            DELETE FROM notifications
            WHERE user_id = ?
        `);

        const result = deleteStmt.run(userId);
        const deletedCount = result.changes;

        if (deletedCount > 0) {
            logger.info('All notifications cleared', { userId, count: deletedCount });

            try {
                getEmitter().sendNotification(userId, {
                    type: 'sync',
                    action: 'clearAll'
                });
            } catch (sseError) {
                logger.debug('SSE sync emit failed', { error: (sseError as Error).message });
            }
        }

        return deletedCount;
    } catch (error) {
        logger.error('Failed to clear all notifications', { error: (error as Error).message, userId });
        throw error;
    }
}

/**
 * Get a single notification by ID
 */
export async function getNotificationById(notificationId: string, userId: string): Promise<Notification | null> {
    try {
        const notification = db.prepare(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
        ).get(notificationId, userId) as NotificationRow | undefined;

        if (!notification) {
            return null;
        }

        let parsedMetadata: Record<string, unknown> | null = null;
        if (notification.metadata) {
            try {
                parsedMetadata = JSON.parse(notification.metadata);
            } catch {
                logger.warn('Failed to parse notification metadata', { id: notification.id });
            }
        }

        return {
            id: notification.id,
            userId: notification.user_id,
            type: notification.type as Notification['type'],
            title: notification.title,
            message: notification.message,
            iconId: notification.icon_id || null,
            read: notification.read === 1,
            metadata: parsedMetadata,
            createdAt: new Date(notification.created_at * 1000).toISOString(),
            expiresAt: null
        };
    } catch (error) {
        logger.error('Failed to get notification by ID', { error: (error as Error).message, notificationId, userId });
        throw error;
    }
}

/**
 * Clean up expired notifications (no-op in current implementation)
 */
export async function cleanupExpiredNotifications(): Promise<void> {
    logger.debug('cleanupExpiredNotifications called (no-op in SQLite implementation)');
}
