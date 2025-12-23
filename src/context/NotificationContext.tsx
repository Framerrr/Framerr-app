import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import { useAuth } from './AuthContext';
import { setNotificationFunctions } from '../utils/axiosSetup';
import logger from '../utils/logger';
import type {
    Notification,
    Toast,
    NotificationType,
    ToastOptions,
    ToastAction,
    NotificationFilters,
    PushSubscriptionRecord
} from '../../shared/types/notification';
import type { NotificationContextValue } from '../types/context/notification';

// API Response types
interface NotificationsApiResponse {
    notifications?: Notification[];
    unreadCount?: number;
}

interface PushSubscriptionsResponse {
    subscriptions?: PushSubscriptionRecord[];
}

interface VapidKeyResponse {
    publicKey: string;
}

interface WebPushStatusResponse {
    enabled?: boolean;
}

interface RequestActionResponse {
    alreadyHandled?: boolean;
    message?: string;
    error?: string;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps): React.JSX.Element => {
    const { isAuthenticated, user } = useAuth();

    // Toast state
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Notification center state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    // SSE connection state
    const [connected, setConnected] = useState<boolean>(false);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    const [sseReconnectTrigger, setSseReconnectTrigger] = useState<number>(0);
    const reconnectAttemptsRef = useRef<number>(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // SSE reconnect constants
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 1000; // 1 second
    const MAX_RECONNECT_DELAY = 30000; // 30 seconds

    // Web Push state
    const [pushSupported, setPushSupported] = useState<boolean>(false);
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
    const [pushEnabled, setPushEnabled] = useState<boolean>(false);
    const [pushSubscriptions, setPushSubscriptions] = useState<PushSubscriptionRecord[]>([]);
    const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
    const [globalPushEnabled, setGlobalPushEnabled] = useState<boolean>(true);

    // Notification center open state
    const [notificationCenterOpen, setNotificationCenterOpen] = useState<boolean>(false);
    const openNotificationCenter = useCallback((): void => {
        setNotificationCenterOpen(true);
        window.dispatchEvent(new CustomEvent('openNotificationCenter'));
    }, []);

    // Check if Web Push is supported
    useEffect(() => {
        const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        setPushSupported(isSupported);

        if (isSupported) {
            setPushPermission(Notification.permission);
        }
    }, []);

    // Register Service Worker on mount
    useEffect(() => {
        if (!pushSupported) return;

        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                logger.info('[Push] Service Worker registered');
                setSwRegistration(registration);

                registration.pushManager.getSubscription()
                    .then((subscription) => {
                        setPushEnabled(!!subscription);
                        setCurrentEndpoint(subscription?.endpoint || null);
                    });
            })
            .catch((error: Error) => {
                logger.error('[Push] Service Worker registration failed', { error: error.message });
            });
    }, [pushSupported]);

    // Fetch push subscriptions when authenticated
    const fetchPushSubscriptions = useCallback(async (): Promise<void> => {
        if (!isAuthenticated) return;

        try {
            const response = await axios.get<PushSubscriptionsResponse>('/api/notifications/push/subscriptions', {
                withCredentials: true
            });
            setPushSubscriptions(response.data.subscriptions || []);
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('[Push] Failed to fetch subscriptions', { error: axiosError.message });
        }
    }, [isAuthenticated]);

    // Fetch global push status
    const fetchGlobalPushStatus = useCallback(async (): Promise<void> => {
        if (!isAuthenticated) return;

        try {
            const response = await axios.get<WebPushStatusResponse>('/api/config/web-push-status', {
                withCredentials: true
            });
            setGlobalPushEnabled(response.data.enabled !== false);
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('[Push] Failed to fetch global push status', { error: axiosError.message });
            setGlobalPushEnabled(true);
        }
    }, [isAuthenticated]);

    // Request push notification permission
    const requestPushPermission = useCallback(async (): Promise<NotificationPermission> => {
        if (!pushSupported) {
            throw new Error('Push notifications not supported');
        }

        const permission = await Notification.requestPermission();
        setPushPermission(permission);

        if (permission !== 'granted') {
            throw new Error('Push notification permission denied');
        }

        return permission;
    }, [pushSupported]);

    // Subscribe to push notifications
    const subscribeToPush = useCallback(async (deviceName: string | null = null): Promise<boolean> => {
        if (!pushSupported || !swRegistration) {
            throw new Error('Push notifications not supported or SW not ready');
        }

        if (pushPermission !== 'granted') {
            await requestPushPermission();
        }

        try {
            const vapidResponse = await axios.get<VapidKeyResponse>('/api/notifications/push/vapid-key', {
                withCredentials: true
            });
            const publicKey = vapidResponse.data.publicKey;

            const applicationServerKey = urlBase64ToUint8Array(publicKey);

            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey.buffer as ArrayBuffer
            });

            const autoDeviceName = deviceName || detectDeviceName();

            await axios.post('/api/notifications/push/subscribe', {
                subscription: subscription.toJSON(),
                deviceName: autoDeviceName
            }, {
                withCredentials: true
            });

            setPushEnabled(true);
            setCurrentEndpoint(subscription.endpoint);
            await fetchPushSubscriptions();

            logger.info('[Push] Subscribed successfully', { deviceName: autoDeviceName });

            return true;
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('[Push] Subscription failed', { error: axiosError.message });
            throw error;
        }
    }, [pushSupported, swRegistration, pushPermission, requestPushPermission, fetchPushSubscriptions]);

    // Unsubscribe THIS device from push notifications
    const unsubscribeFromPush = useCallback(async (): Promise<void> => {
        if (!swRegistration) return;

        try {
            const subscription = await swRegistration.pushManager.getSubscription();
            if (subscription) {
                const endpoint = subscription.endpoint;

                const matchingSub = pushSubscriptions.find(s => s.endpoint === endpoint);

                await subscription.unsubscribe();

                if (matchingSub) {
                    await axios.delete(`/api/notifications/push/subscriptions/${matchingSub.id}`, {
                        withCredentials: true
                    });
                    setPushSubscriptions(prev => prev.filter(s => s.id !== matchingSub.id));
                }
            }

            setPushEnabled(false);
            setCurrentEndpoint(null);
            logger.info('[Push] Unsubscribed this device successfully');
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('[Push] Unsubscribe failed', { error: axiosError.message });
            throw error;
        }
    }, [swRegistration, pushSubscriptions]);

    // Remove a specific push subscription
    const removePushSubscription = useCallback(async (subscriptionId: string): Promise<void> => {
        try {
            const subToRemove = pushSubscriptions.find(s => s.id === subscriptionId);
            const isThisDevice = subToRemove && subToRemove.endpoint === currentEndpoint;

            await axios.delete(`/api/notifications/push/subscriptions/${subscriptionId}`, {
                withCredentials: true
            });

            setPushSubscriptions(prev => prev.filter(s => s.id !== subscriptionId));

            if (isThisDevice) {
                setPushEnabled(false);
                setCurrentEndpoint(null);

                if (swRegistration) {
                    const browserSub = await swRegistration.pushManager.getSubscription();
                    if (browserSub) {
                        await browserSub.unsubscribe();
                    }
                }

                logger.info('[Push] This device subscription removed');
            } else {
                logger.info('[Push] Other device subscription removed', { subscriptionId });
            }
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('[Push] Failed to remove subscription', { error: axiosError.message });
            throw error;
        }
    }, [swRegistration, pushSubscriptions, currentEndpoint]);

    // Send test push notification
    const testPushNotification = useCallback(async (): Promise<boolean> => {
        try {
            await axios.post('/api/notifications/push/test', {}, {
                withCredentials: true
            });
            logger.info('[Push] Test notification sent');
            return true;
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('[Push] Test notification failed', { error: axiosError.message });
            throw error;
        }
    }, []);

    // Load push subscriptions and global status when authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            fetchPushSubscriptions();
            fetchGlobalPushStatus();
        } else {
            setPushSubscriptions([]);
            setGlobalPushEnabled(true);
        }
    }, [isAuthenticated, user, fetchPushSubscriptions, fetchGlobalPushStatus]);

    // Fetch notifications from backend
    const fetchNotifications = useCallback(async (filters: NotificationFilters = {}): Promise<void> => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.unread) params.append('unread', 'true');
            if (filters.limit) params.append('limit', String(filters.limit));
            if (filters.offset) params.append('offset', String(filters.offset));

            const response = await axios.get<NotificationsApiResponse>(`/api/notifications?${params}`, {
                withCredentials: true
            });

            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);

            logger.debug('Notifications fetched', {
                count: response.data.notifications?.length,
                unread: response.data.unreadCount
            });
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('Failed to fetch notifications', { error: axiosError.message });
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // Add toast notification
    const showToast = useCallback((type: NotificationType, title: string, message: string, options: ToastOptions = {}): string => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const toast: Toast = {
            id,
            type,
            title,
            message,
            iconId: options.iconId || null,
            duration: options.duration || 5000,
            action: options.action,
            actions: options.actions || undefined,
            onBodyClick: options.onBodyClick,
            notificationId: options.notificationId || null,
            createdAt: new Date()
        };

        setToasts(prev => {
            const updated = [toast, ...prev].slice(0, 5);
            return updated;
        });

        logger.debug('Toast notification shown', { type, title });

        return id;
    }, []);

    // Remove toast
    const dismissToast = useCallback((id: string): void => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Convenience methods for toast types
    const success = useCallback((title: string, message: string, options?: ToastOptions): string => {
        return showToast('success', title, message, options);
    }, [showToast]);

    const error = useCallback((title: string, message: string, options?: ToastOptions): string => {
        return showToast('error', title, message, options);
    }, [showToast]);

    const warning = useCallback((title: string, message: string, options?: ToastOptions): string => {
        return showToast('warning', title, message, options);
    }, [showToast]);

    const info = useCallback((title: string, message: string, options?: ToastOptions): string => {
        return showToast('info', title, message, options);
    }, [showToast]);

    // Configure axios interceptor with notification functions
    useEffect(() => {
        setNotificationFunctions({ error });
    }, [error]);

    // Add notification to center (from backend or SSE)
    const addNotification = useCallback((notification: Notification): void => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        logger.debug('Notification added to center', {
            id: notification.id,
            type: notification.type
        });
    }, []);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
        try {
            await axios.patch(`/api/notifications/${notificationId}/read`, {}, {
                withCredentials: true
            });

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));

            logger.debug('Notification marked as read', { id: notificationId });
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('Failed to mark notification as read', { error: axiosError.message });
        }
    }, []);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId: string): Promise<void> => {
        try {
            await axios.delete(`/api/notifications/${notificationId}`, {
                withCredentials: true
            });

            const notification = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (notification && !notification.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            logger.debug('Notification deleted', { id: notificationId });
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('Failed to delete notification', { error: axiosError.message });
        }
    }, [notifications]);

    // Mark all as read
    const markAllAsRead = useCallback(async (): Promise<void> => {
        try {
            await axios.post('/api/notifications/mark-all-read', {}, {
                withCredentials: true
            });

            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );
            setUnreadCount(0);

            logger.info('All notifications marked as read');
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('Failed to mark all as read', { error: axiosError.message });
        }
    }, []);

    // Clear all notifications
    const clearAll = useCallback(async (): Promise<void> => {
        try {
            await axios.delete('/api/notifications/clear-all', {
                withCredentials: true
            });

            setNotifications([]);
            setUnreadCount(0);

            logger.info('All notifications cleared');
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('Failed to clear all notifications', { error: axiosError.message });
        }
    }, []);

    // Handle request action (approve/decline for Overseerr)
    const handleRequestAction = useCallback(async (notificationId: string, action: 'approve' | 'decline'): Promise<unknown> => {
        try {
            const response = await axios.post<RequestActionResponse>(
                `/api/request-actions/overseerr/${action}/${notificationId}`,
                {},
                { withCredentials: true }
            );

            setNotifications(prev => {
                const notification = prev.find(n => n.id === notificationId);
                if (notification && !notification.read) {
                    setUnreadCount(count => Math.max(0, count - 1));
                }
                return prev.filter(n => n.id !== notificationId);
            });

            setToasts(prev => prev.filter(t => t.notificationId !== notificationId));

            if (response.data.alreadyHandled) {
                showToast('info', 'Already Handled', 'This request was already handled in Overseerr.');
            } else {
                showToast(
                    'success',
                    action === 'approve' ? 'Request Approved' : 'Request Declined',
                    response.data.message || `Request ${action}d successfully`
                );
            }

            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<{ error?: string }>;
            logger.error('Failed to process request action', { error: axiosError.message });
            showToast('error', 'Action Failed', axiosError.response?.data?.error || 'Failed to process request');
            throw error;
        }
    }, [showToast]);

    // Show toast for a specific notification ID
    const showToastForNotification = useCallback((notificationId: string): void => {
        logger.info('[Push Click] showToastForNotification called', { notificationId });

        setToasts(prevToasts => {
            const existingToast = prevToasts.find(t => t.notificationId === notificationId);

            if (existingToast) {
                logger.info('[Push Click] Toast exists, resetting timer', { notificationId });
                return prevToasts.map(t =>
                    t.notificationId === notificationId
                        ? { ...t, createdAt: new Date() }
                        : t
                );
            }

            return prevToasts;
        });

        setTimeout(() => {
            setToasts(prevToasts => {
                if (prevToasts.find(t => t.notificationId === notificationId)) {
                    logger.debug('[Push Click] Toast already exists after check');
                    return prevToasts;
                }

                return prevToasts;
            });

            setNotifications(prevNotifications => {
                setToasts(currentToasts => {
                    if (currentToasts.find(t => t.notificationId === notificationId)) {
                        return currentToasts;
                    }

                    const notification = prevNotifications.find(n => n.id === notificationId);

                    if (!notification) {
                        logger.warn('[Push Click] Notification not found', { notificationId, count: prevNotifications.length });
                        return currentToasts;
                    }

                    logger.info('[Push Click] Creating toast for notification', { notificationId, title: notification.title });

                    const id = `toast-${Date.now()}-${Math.random()}`;
                    const newToast: Toast = {
                        id,
                        type: notification.type || 'info',
                        title: notification.title,
                        message: notification.message,
                        iconId: notification.iconId || null,
                        duration: 10000,
                        action: undefined,
                        actions: (notification.metadata?.actionable && notification.metadata?.requestId) ? [
                            { label: 'Approve', variant: 'success', onClick: () => handleRequestAction(notification.id, 'approve') },
                            { label: 'Decline', variant: 'danger', onClick: () => handleRequestAction(notification.id, 'decline') }
                        ] : undefined,
                        onBodyClick: openNotificationCenter,
                        notificationId: notification.id,
                        createdAt: new Date()
                    };

                    return [newToast, ...currentToasts].slice(0, 5);
                });

                return prevNotifications;
            });
        }, 50);
    }, [handleRequestAction, openNotificationCenter]);

    // Listen for service worker messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent): void => {
            if (event.data?.type === 'NOTIFICATION_CLICK') {
                logger.info('[SW Message] Notification click received', { notificationId: event.data.notificationId });
                if (event.data.notificationId) {
                    showToastForNotification(event.data.notificationId);
                }
            }
        };

        navigator.serviceWorker?.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
    }, [showToastForNotification]);

    // Check URL hash on mount for notification ID
    useEffect(() => {
        const checkNotificationHash = (): void => {
            const hash = window.location.hash;
            const match = hash.match(/#notification=([a-f0-9-]+)/i);

            if (match) {
                const notificationId = match[1];
                logger.info('[URL Hash] Notification ID found', { notificationId });

                window.history.replaceState(null, '', window.location.pathname);

                setTimeout(() => {
                    showToastForNotification(notificationId);
                }, 500);
            }
        };

        if (isAuthenticated && user) {
            checkNotificationHash();
        }
    }, [isAuthenticated, user, showToastForNotification]);

    // Load notifications on mount and when auth changes
    useEffect(() => {
        if (isAuthenticated && user) {
            fetchNotifications({ limit: 50 });
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [isAuthenticated, user, fetchNotifications]);

    // SSE connection for real-time notifications with auto-reconnect
    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (eventSource) {
                eventSource.close();
                setEventSource(null);
                setConnected(false);
            }
            // Clear any pending reconnect timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            reconnectAttemptsRef.current = 0;
            return;
        }

        const source = new EventSource('/api/notifications/stream', { withCredentials: true });

        source.onopen = (): void => {
            logger.info('[SSE] Connection established');
            setConnected(true);
            // Reset reconnect attempts on successful connection
            reconnectAttemptsRef.current = 0;
        };

        source.onmessage = (event: MessageEvent): void => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'connected') {
                    logger.debug('[SSE] Connected message received', { userId: data.userId });
                    return;
                }

                if (data.type === 'sync') {
                    logger.info('[SSE] Sync event received', { action: data.action, notificationId: data.notificationId });

                    switch (data.action) {
                        case 'markRead':
                            setNotifications(prev => prev.map(n =>
                                n.id === data.notificationId ? { ...n, read: true } : n
                            ));
                            setUnreadCount(prev => Math.max(0, prev - 1));
                            break;
                        case 'delete':
                            setNotifications(prev => {
                                const notification = prev.find(n => n.id === data.notificationId);
                                if (notification && !notification.read) {
                                    setUnreadCount(count => Math.max(0, count - 1));
                                }
                                return prev.filter(n => n.id !== data.notificationId);
                            });
                            setToasts(prev => prev.filter(t => t.notificationId !== data.notificationId));
                            break;
                        case 'markAllRead':
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            setUnreadCount(0);
                            break;
                        case 'clearAll':
                            setNotifications([]);
                            setUnreadCount(0);
                            setToasts(prev => prev.filter(t => !t.notificationId));
                            break;
                    }
                    return;
                }

                logger.info('[SSE] Notification received', { id: data.id, title: data.title, actionable: data.metadata?.actionable });

                addNotification(data);

                const toastOptions: ToastOptions = {
                    iconId: data.iconId,
                    duration: 10000,
                    onBodyClick: openNotificationCenter
                };

                if (data.metadata?.actionable && data.metadata?.requestId) {
                    toastOptions.actions = [
                        {
                            label: 'Approve',
                            variant: 'success',
                            onClick: () => handleRequestAction(data.id, 'approve')
                        },
                        {
                            label: 'Decline',
                            variant: 'danger',
                            onClick: () => handleRequestAction(data.id, 'decline')
                        }
                    ];
                    toastOptions.notificationId = data.id;
                }

                showToast(data.type || 'info', data.title, data.message, toastOptions);
            } catch (error) {
                const parseError = error as Error;
                logger.error('[SSE] Failed to parse message', { error: parseError.message });
            }
        };

        source.onerror = (): void => {
            logger.error('[SSE] Connection error');
            setConnected(false);

            // Auto-reconnect with exponential backoff
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(
                    BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
                    MAX_RECONNECT_DELAY
                );
                logger.info(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectAttemptsRef.current += 1;
                    source.close();
                    setSseReconnectTrigger(prev => prev + 1);
                }, delay);
            } else {
                logger.warn('[SSE] Max reconnect attempts reached, giving up');
            }
        };

        setEventSource(source);

        return () => {
            logger.info('[SSE] Closing connection');
            source.close();
            setEventSource(null);
            setConnected(false);
            // Clear reconnect timeout on cleanup
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [isAuthenticated, user, sseReconnectTrigger, addNotification, showToast, handleRequestAction, openNotificationCenter]);

    // Reconnect SSE when tab becomes visible if disconnected
    useEffect(() => {
        const handleVisibilityChange = (): void => {
            if (!document.hidden && !connected && isAuthenticated && user) {
                logger.info('[SSE] Tab visible and disconnected, triggering reconnect');
                reconnectAttemptsRef.current = 0; // Reset attempts
                setSseReconnectTrigger(prev => prev + 1);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [connected, isAuthenticated, user]);

    const value: NotificationContextValue = {
        // Toast state
        toasts,
        showToast,
        dismissToast,
        success,
        error,
        warning,
        info,

        // Notification center state
        notifications,
        unreadCount,
        loading,

        // Notification actions
        fetchNotifications,
        addNotification,
        markAsRead,
        deleteNotification,
        markAllAsRead,
        clearAll,
        handleRequestAction,

        // Notification center state
        notificationCenterOpen,
        setNotificationCenterOpen,
        openNotificationCenter,

        // SSE connection state
        connected,
        setConnected,
        setEventSource,

        // Web Push state
        pushSupported,
        pushPermission,
        pushEnabled,
        pushSubscriptions,
        currentEndpoint,
        globalPushEnabled,

        // Web Push actions
        requestPushPermission,
        subscribeToPush,
        unsubscribeFromPush,
        removePushSubscription,
        testPushNotification,
        fetchPushSubscriptions,
        fetchGlobalPushStatus
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

// Helper: Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Helper: Auto-detect device name
function detectDeviceName(): string {
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect browser
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';

    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('iPad')) os = 'iPad';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} on ${os}`;
}

export const useNotifications = (): NotificationContextValue => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
