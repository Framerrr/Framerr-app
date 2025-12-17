import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { setNotificationFunctions } from '../utils/axiosSetup';
import logger from '../utils/logger';

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated, user } = useAuth();

    // Toast state
    const [toasts, setToasts] = useState([]);

    // Notification center state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // SSE connection state
    const [connected, setConnected] = useState(false);
    const [eventSource, setEventSource] = useState(null);

    // Web Push state
    const [pushSupported, setPushSupported] = useState(false);
    const [pushPermission, setPushPermission] = useState('default');
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushSubscriptions, setPushSubscriptions] = useState([]);
    const [swRegistration, setSwRegistration] = useState(null);
    const [currentEndpoint, setCurrentEndpoint] = useState(null);  // This device's push endpoint
    const [globalPushEnabled, setGlobalPushEnabled] = useState(true);  // Admin global toggle

    // Notification center open state (for toast body click)
    const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
    const openNotificationCenter = useCallback(() => {
        setNotificationCenterOpen(true);
        // Emit event that Sidebar can listen to
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

                // Check if already subscribed and store endpoint
                registration.pushManager.getSubscription()
                    .then((subscription) => {
                        setPushEnabled(!!subscription);
                        setCurrentEndpoint(subscription?.endpoint || null);
                    });
            })
            .catch((error) => {
                logger.error('[Push] Service Worker registration failed', { error: error.message });
            });
    }, [pushSupported]);

    // Fetch push subscriptions when authenticated
    const fetchPushSubscriptions = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const response = await axios.get('/api/notifications/push/subscriptions', {
                withCredentials: true
            });
            setPushSubscriptions(response.data.subscriptions || []);
        } catch (error) {
            logger.error('[Push] Failed to fetch subscriptions', { error: error.message });
        }
    }, [isAuthenticated]);

    // Fetch global push status
    const fetchGlobalPushStatus = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const response = await axios.get('/api/config/web-push-status', {
                withCredentials: true
            });
            setGlobalPushEnabled(response.data.enabled !== false);
        } catch (error) {
            logger.error('[Push] Failed to fetch global push status', { error: error.message });
            // Default to true if fetch fails
            setGlobalPushEnabled(true);
        }
    }, [isAuthenticated]);

    // Request push notification permission
    const requestPushPermission = useCallback(async () => {
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
    const subscribeToPush = useCallback(async (deviceName = null) => {
        if (!pushSupported || !swRegistration) {
            throw new Error('Push notifications not supported or SW not ready');
        }

        // Request permission if not granted
        if (pushPermission !== 'granted') {
            await requestPushPermission();
        }

        try {
            // Get VAPID public key
            const vapidResponse = await axios.get('/api/notifications/push/vapid-key', {
                withCredentials: true
            });
            const publicKey = vapidResponse.data.publicKey;

            // Convert VAPID key to Uint8Array
            const applicationServerKey = urlBase64ToUint8Array(publicKey);

            // Subscribe to push
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });

            // Auto-detect device name if not provided
            const autoDeviceName = deviceName || detectDeviceName();

            // Send subscription to backend
            await axios.post('/api/notifications/push/subscribe', {
                subscription: subscription.toJSON(),
                deviceName: autoDeviceName
            }, {
                withCredentials: true
            });

            setPushEnabled(true);
            setCurrentEndpoint(subscription.endpoint);  // Track this device's endpoint
            await fetchPushSubscriptions();

            logger.info('[Push] Subscribed successfully', { deviceName: autoDeviceName });

            return true;
        } catch (error) {
            logger.error('[Push] Subscription failed', { error: error.message });
            throw error;
        }
    }, [pushSupported, swRegistration, pushPermission, requestPushPermission, fetchPushSubscriptions]);

    // Unsubscribe THIS device from push notifications
    const unsubscribeFromPush = useCallback(async () => {
        if (!swRegistration) return;

        try {
            const subscription = await swRegistration.pushManager.getSubscription();
            if (subscription) {
                const endpoint = subscription.endpoint;

                // Find matching subscription on server by exact endpoint
                const matchingSub = pushSubscriptions.find(s => s.endpoint === endpoint);

                // Unsubscribe from browser first
                await subscription.unsubscribe();

                // Delete from server if found
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
            logger.error('[Push] Unsubscribe failed', { error: error.message });
            throw error;
        }
    }, [swRegistration, pushSubscriptions]);

    // Remove a specific push subscription
    const removePushSubscription = useCallback(async (subscriptionId) => {
        try {
            // Find the subscription being removed to check if it's THIS device
            const subToRemove = pushSubscriptions.find(s => s.id === subscriptionId);
            const isThisDevice = subToRemove && subToRemove.endpoint === currentEndpoint;

            await axios.delete(`/api/notifications/push/subscriptions/${subscriptionId}`, {
                withCredentials: true
            });

            // Update local state
            setPushSubscriptions(prev => prev.filter(s => s.id !== subscriptionId));

            // If we removed THIS device, update pushEnabled and unsubscribe browser
            if (isThisDevice) {
                setPushEnabled(false);
                setCurrentEndpoint(null);

                // Unsubscribe browser's push manager to keep in sync
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
            logger.error('[Push] Failed to remove subscription', { error: error.message });
            throw error;
        }
    }, [swRegistration, pushSubscriptions, currentEndpoint]);

    // Send test push notification
    const testPushNotification = useCallback(async () => {
        try {
            await axios.post('/api/notifications/push/test', {}, {
                withCredentials: true
            });
            logger.info('[Push] Test notification sent');
            return true;
        } catch (error) {
            logger.error('[Push] Test notification failed', { error: error.message });
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
    const fetchNotifications = useCallback(async (filters = {}) => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.unread) params.append('unread', 'true');
            if (filters.limit) params.append('limit', filters.limit);
            if (filters.offset) params.append('offset', filters.offset);

            const response = await axios.get(`/api/notifications?${params}`, {
                withCredentials: true
            });

            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);

            logger.debug('Notifications fetched', {
                count: response.data.notifications?.length,
                unread: response.data.unreadCount
            });
        } catch (error) {
            logger.error('Failed to fetch notifications', { error: error.message });
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // Add toast notification
    const showToast = useCallback((type, title, message, options = {}) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const toast = {
            id,
            type, // 'success' | 'error' | 'warning' | 'info'
            title,
            message,
            iconId: options.iconId || null, // Custom icon ID for integration logos
            duration: options.duration || 5000, // Default 5 seconds
            action: options.action, // { label, onClick } - single action (legacy)
            actions: options.actions || null, // Array of actions for approve/decline
            onBodyClick: options.onBodyClick || null, // Callback for body click
            notificationId: options.notificationId || null, // Link to notification for dismissal sync
            createdAt: new Date()
        };

        setToasts(prev => {
            // Keep max 5 toasts
            const updated = [toast, ...prev].slice(0, 5);
            return updated;
        });

        logger.debug('Toast notification shown', { type, title });

        return id;
    }, []);

    // Remove toast
    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Convenience methods for toast types
    const success = useCallback((title, message, options) => {
        return showToast('success', title, message, options);
    }, [showToast]);

    const error = useCallback((title, message, options) => {
        return showToast('error', title, message, options);
    }, [showToast]);

    const warning = useCallback((title, message, options) => {
        return showToast('warning', title, message, options);
    }, [showToast]);

    const info = useCallback((title, message, options) => {
        return showToast('info', title, message, options);
    }, [showToast]);

    // Configure axios interceptor with notification functions
    useEffect(() => {
        setNotificationFunctions({ error });
    }, [error]);

    // Add notification to center (from backend or SSE)
    const addNotification = useCallback((notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        logger.debug('Notification added to center', {
            id: notification.id,
            type: notification.type
        });
    }, []);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId) => {
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
            logger.error('Failed to mark notification as read', { error: error.message });
        }
    }, []);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId) => {
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
            logger.error('Failed to delete notification', { error: error.message });
        }
    }, [notifications]);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
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
            logger.error('Failed to mark all as read', { error: error.message });
        }
    }, []);

    // Clear all notifications
    const clearAll = useCallback(async () => {
        try {
            await axios.delete('/api/notifications/clear-all', {
                withCredentials: true
            });

            setNotifications([]);
            setUnreadCount(0);

            logger.info('All notifications cleared');
        } catch (error) {
            logger.error('Failed to clear all notifications', { error: error.message });
        }
    }, []);

    // Handle request action (approve/decline for Overseerr)
    const handleRequestAction = useCallback(async (notificationId, action) => {
        try {
            const response = await axios.post(
                `/api/request-actions/overseerr/${action}/${notificationId}`,
                {},
                { withCredentials: true }
            );

            // Remove notification from state using functional update
            setNotifications(prev => {
                const notification = prev.find(n => n.id === notificationId);
                // Update unread count if notification was unread
                if (notification && !notification.read) {
                    setUnreadCount(count => Math.max(0, count - 1));
                }
                return prev.filter(n => n.id !== notificationId);
            });

            // Dismiss any toast for this notification (match by notificationId property)
            setToasts(prev => prev.filter(t => t.notificationId !== notificationId));

            // Show result toast
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
            logger.error('Failed to process request action', { error: error.message });
            showToast('error', 'Action Failed', error.response?.data?.error || 'Failed to process request');
            throw error;
        }
    }, [showToast]);

    // Show toast for a specific notification ID (used when clicking web push notification)
    // Handles deduplication: if toast already exists, resets its timer
    const showToastForNotification = useCallback((notificationId) => {
        // Check if toast for this notification already exists
        const existingToast = toasts.find(t => t.notificationId === notificationId);

        if (existingToast) {
            // Toast already visible - reset its timer by recreating it
            logger.debug('[Push Click] Toast exists, resetting timer', { notificationId });
            setToasts(prev => prev.map(t =>
                t.notificationId === notificationId
                    ? { ...t, createdAt: new Date() } // Reset createdAt to restart timer
                    : t
            ));
            return;
        }

        // Toast doesn't exist - find the notification and create toast
        const notification = notifications.find(n => n.id === notificationId);

        if (!notification) {
            logger.warn('[Push Click] Notification not found', { notificationId });
            return;
        }

        logger.info('[Push Click] Creating toast for notification', { notificationId });

        // Build toast options
        const toastOptions = {
            iconId: notification.iconId,
            duration: 10000,
            onBodyClick: openNotificationCenter,
            notificationId: notification.id
        };

        // Add action buttons for actionable notifications
        if (notification.metadata?.actionable && notification.metadata?.requestId) {
            toastOptions.actions = [
                {
                    label: 'Approve',
                    variant: 'success',
                    onClick: () => handleRequestAction(notification.id, 'approve')
                },
                {
                    label: 'Decline',
                    variant: 'danger',
                    onClick: () => handleRequestAction(notification.id, 'decline')
                }
            ];
        }

        showToast(notification.type || 'info', notification.title, notification.message, toastOptions);
    }, [toasts, notifications, showToast, openNotificationCenter, handleRequestAction]);

    // Listen for service worker messages (when push notification is clicked while app is open)
    useEffect(() => {
        const handleMessage = (event) => {
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

    // Check URL hash on mount for notification ID (when app opened from push notification)
    useEffect(() => {
        const checkNotificationHash = () => {
            const hash = window.location.hash;
            const match = hash.match(/#notification=([a-f0-9-]+)/i);

            if (match) {
                const notificationId = match[1];
                logger.info('[URL Hash] Notification ID found', { notificationId });

                // Clear the hash to prevent re-triggering
                window.history.replaceState(null, '', window.location.pathname);

                // Wait a moment for notifications to load, then show toast
                setTimeout(() => {
                    showToastForNotification(notificationId);
                }, 500);
            }
        };

        // Check on mount
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

    // SSE connection for real-time notifications
    useEffect(() => {
        if (!isAuthenticated || !user) {
            // Close existing connection if not authenticated
            if (eventSource) {
                eventSource.close();
                setEventSource(null);
                setConnected(false);
            }
            return;
        }

        // Create SSE connection
        const source = new EventSource('/api/notifications/stream', { withCredentials: true });

        source.onopen = () => {
            logger.info('[SSE] Connection established');
            setConnected(true);
        };

        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'connected') {
                    logger.debug('[SSE] Connected message received', { userId: data.userId });
                    return;
                }

                // Real notification received
                logger.info('[SSE] Notification received', { id: data.id, title: data.title, actionable: data.metadata?.actionable });

                // Add to notification list
                addNotification(data);

                // Build toast options
                const toastOptions = {
                    iconId: data.iconId,
                    duration: 10000, // 10 second default for SSE notifications
                    onBodyClick: openNotificationCenter
                };

                // Add action buttons for actionable notifications (Overseerr requests)
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
                    toastOptions.notificationId = data.id; // Track for syncing with notification center
                }

                // Show toast for the notification
                showToast(data.type || 'info', data.title, data.message, toastOptions);
            } catch (error) {
                logger.error('[SSE] Failed to parse message', { error: error.message });
            }
        };

        source.onerror = (err) => {
            logger.error('[SSE] Connection error', { error: err });
            setConnected(false);

            // EventSource automatically reconnects, but we update state
            if (source.readyState === EventSource.CLOSED) {
                logger.info('[SSE] Connection closed, will not reconnect');
            }
        };

        setEventSource(source);

        // Cleanup on unmount or auth change
        return () => {
            logger.info('[SSE] Closing connection');
            source.close();
            setEventSource(null);
            setConnected(false);
        };
    }, [isAuthenticated, user, addNotification, showToast, handleRequestAction, openNotificationCenter]);

    const value = {
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

        // Web Push state
        pushSupported,
        pushPermission,
        pushEnabled,
        pushSubscriptions,
        currentEndpoint,  // This device's push endpoint for identifying "this device"
        globalPushEnabled,  // Admin global toggle status

        // Web Push actions
        requestPushPermission,
        subscribeToPush,
        unsubscribeFromPush,
        removePushSubscription,
        testPushNotification,
        fetchPushSubscriptions,
        fetchGlobalPushStatus,  // Refresh global status

        // Internal state setters (for SSE)
        setConnected,
        setEventSource
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

// Helper: Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
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
function detectDeviceName() {
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

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

