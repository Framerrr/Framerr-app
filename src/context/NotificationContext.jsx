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
            duration: options.duration || 5000, // Default 5 seconds
            action: options.action, // { label, onClick }
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
                logger.info('[SSE] Notification received', { id: data.id, title: data.title });

                // Add to notification list
                addNotification(data);

                // Show toast for the notification
                showToast(data.type || 'info', data.title, data.message);
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
    }, [isAuthenticated, user, addNotification, showToast]);

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

        // Connection state
        connected,

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

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
