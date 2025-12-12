import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Trash2, Check } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import logger from '../../utils/logger';

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
};

/**
 * NotificationCenter Component
 * 
 * Unified notification center for desktop and mobile
 * - Desktop: Renders inside transformed sidebar
 * - Mobile: Renders inside expanded mobile menu
 * 
 * @param {boolean} isMobile - Whether rendering in mobile mode
 * @param {function} onClose - Close callback
 */
const NotificationCenter = ({ isMobile = false, onClose }) => {
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        deleteNotification,
        markAllAsRead,
        clearAll
    } = useNotifications();

    const [activeFilter, setActiveFilter] = useState('all');

    // Filter notifications
    const filteredNotifications = useMemo(() => {
        if (activeFilter === 'unread') {
            return notifications.filter(n => !n.read);
        } else if (activeFilter === 'read') {
            return notifications.filter(n => n.read);
        }
        return notifications;
    }, [notifications, activeFilter]);

    // Group notifications by date
    const groupedNotifications = useMemo(() => {
        const groups = {
            today: [],
            yesterday: [],
            thisWeek: [],
            older: []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        filteredNotifications.forEach(notification => {
            const createdAt = new Date(notification.createdAt);
            const createdDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());

            if (createdDate.getTime() === today.getTime()) {
                groups.today.push(notification);
            } else if (createdDate.getTime() === yesterday.getTime()) {
                groups.yesterday.push(notification);
            } else if (createdDate >= weekAgo) {
                groups.thisWeek.push(notification);
            } else {
                groups.older.push(notification);
            }
        });

        return groups;
    }, [filteredNotifications]);

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markAsRead(notificationId);
        } catch (error) {
            logger.error('Failed to mark notification as read', { error: error.message });
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await deleteNotification(notificationId);
        } catch (error) {
            logger.error('Failed to delete notification', { error: error.message });
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
        } catch (error) {
            logger.error('Failed to mark all as read', { error: error.message });
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to clear all notifications?')) {
            try {
                await clearAll();
            } catch (error) {
                logger.error('Failed to clear all notifications', { error: error.message });
            }
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const renderNotification = (notification) => {
        const Icon = ICONS[notification.type] || Info;

        return (
            <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                className={`
                    p-4 border-b border-theme-light
                    ${!notification.read ? 'bg-theme-hover' : 'bg-transparent'}
                    hover:bg-theme-hover transition-colors cursor-pointer
                `}
                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{
                            backgroundColor: `var(--${notification.type})`,
                            opacity: 0.2
                        }}
                    >
                        <Icon
                            size={18}
                            style={{ color: `var(--${notification.type})` }}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-semibold ${notification.read ? 'text-theme-secondary' : 'text-theme-primary'}`}>
                                {notification.title}
                            </h4>
                            <span className="text-xs text-theme-tertiary whitespace-nowrap">
                                {formatTime(notification.createdAt)}
                            </span>
                        </div>
                        <p className="text-sm text-theme-secondary mt-1">
                            {notification.message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                        {!notification.read && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                }}
                                className="p-1.5 rounded-lg text-theme-tertiary 
                                    hover:text-theme-primary hover:bg-theme-hover 
                                    transition-colors"
                                title="Mark as read"
                            >
                                <Check size={16} />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification.id);
                            }}
                            className="p-1.5 rounded-lg text-theme-tertiary 
                                hover:text-error hover:bg-error/10 
                                transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderGroup = (title, items) => {
        if (items.length === 0) return null;

        return (
            <div key={title} className="mb-4">
                <div className="px-6 py-2 text-xs font-semibold text-theme-tertiary uppercase tracking-wider">
                    {title}
                </div>
                <AnimatePresence>
                    {items.map(renderNotification)}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className={`flex-1 flex flex-col ${isMobile ? '' : 'glass-card border-l border-theme'}`} style={{ minHeight: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div className={`border-b border-theme flex-shrink-0 ${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-baseline gap-3">
                        <h2 className={`font-semibold text-theme-primary ${isMobile ? 'text-lg' : 'text-xl'}`}>
                            Notifications
                        </h2>
                        <span className="text-sm text-theme-secondary">
                            {unreadCount} unread
                        </span>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-theme-tertiary hover:text-theme-primary 
                                transition-colors p-1"
                            aria-label="Close notifications"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-3">
                    {[
                        { id: 'all', label: 'All', count: notifications.length },
                        { id: 'unread', label: 'Unread', count: unreadCount },
                        { id: 'read', label: 'Read', count: notifications.length - unreadCount }
                    ].map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            className={`
                                px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                ${activeFilter === filter.id
                                    ? 'bg-accent text-white'
                                    : 'text-theme-secondary hover:bg-theme-hover'
                                }
                            `}
                        >
                            {filter.label} ({filter.count})
                        </button>
                    ))}
                </div>

                {/* Action Buttons */}
                {notifications.length > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg
                                bg-accent text-white hover:bg-accent-hover
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-colors"
                        >
                            Mark all read
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg
                                bg-error/10 text-error hover:bg-error/20
                                transition-colors"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-theme-secondary">Loading...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="p-4 rounded-full bg-theme-tertiary/10 mb-4">
                            <Info size={32} className="text-theme-tertiary" />
                        </div>
                        <h3 className="text-lg font-semibold text-theme-primary mb-2">
                            No notifications
                        </h3>
                        <p className="text-sm text-theme-secondary">
                            {activeFilter === 'unread'
                                ? "You're all caught up!"
                                : activeFilter === 'read'
                                    ? 'No read notifications'
                                    : 'You have no notifications yet'}
                        </p>
                    </div>
                ) : (
                    <div>
                        {renderGroup('Today', groupedNotifications.today)}
                        {renderGroup('Yesterday', groupedNotifications.yesterday)}
                        {renderGroup('This Week', groupedNotifications.thisWeek)}
                        {renderGroup('Older', groupedNotifications.older)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;
