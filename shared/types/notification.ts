/**
 * Notification Types
 * Shared between frontend (NotificationContext) and backend (notification service)
 */

/**
 * Notification severity/type
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification metadata varies by source
 */
export interface NotificationMetadata {
    actionable?: boolean;
    requestId?: string;
    mediaType?: 'movie' | 'tv';
    service?: 'overseerr' | 'sonarr' | 'radarr';
    eventType?: string;
    username?: string;
    [key: string]: unknown;
}

/**
 * Persistent notification stored in database
 */
export interface Notification {
    id: string;
    userId?: string;
    type: NotificationType;
    title: string;
    message: string;
    iconId?: string | null;
    read: boolean;
    metadata?: NotificationMetadata;
    createdAt: string;
}

/**
 * Action button on a toast notification
 */
export interface ToastAction {
    label: string;
    variant?: 'success' | 'danger' | 'default';
    onClick: () => void;
}

/**
 * Transient toast notification (shown briefly, not persisted)
 */
export interface Toast {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    iconId?: string | null;
    duration: number;
    action?: ToastAction;
    actions?: ToastAction[];
    onBodyClick?: () => void;
    notificationId?: string | null;
    createdAt: Date;
}

/**
 * Options when creating a toast
 */
export interface ToastOptions {
    iconId?: string;
    duration?: number;
    action?: ToastAction;
    actions?: ToastAction[];
    onBodyClick?: () => void;
    notificationId?: string;
}

/**
 * Filters for fetching notifications
 */
export interface NotificationFilters {
    unread?: boolean;
    limit?: number;
    offset?: number;
}

/**
 * Push subscription record
 */
export interface PushSubscriptionRecord {
    id: string;
    userId: string;
    endpoint: string;
    deviceName: string;
    p256dh: string;
    auth: string;
    createdAt: string;
}
