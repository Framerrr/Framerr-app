import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Trash2, Check, XCircle } from 'lucide-react';
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
        clearAll,
        handleRequestAction
    } = useNotifications();

    const [activeFilter, setActiveFilter] = useState('all');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Track filter direction for animations (all=0, unread=1, read=2)
    const filterOrder = { all: 0, unread: 1, read: 2 };
    const prevFilterRef = useRef(activeFilter);
    const [slideDirection, setSlideDirection] = useState(0); // -1 = left, 1 = right

    useEffect(() => {
        const prevIndex = filterOrder[prevFilterRef.current];
        const newIndex = filterOrder[activeFilter];
        setSlideDirection(newIndex > prevIndex ? 1 : -1);
        prevFilterRef.current = activeFilter;
    }, [activeFilter]);

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
        try {
            await clearAll();
            setShowClearConfirm(false);
        } catch (error) {
            logger.error('Failed to clear all notifications', { error: error.message });
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

    const renderNotification = (notification, index) => {
        const Icon = ICONS[notification.type] || Info;

        return (
            <motion.div
                key={notification.id}
                layout="position"
                initial={{ opacity: 0, x: slideDirection * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{
                    duration: 0.2,
                    delay: index * 0.02,
                    layout: { duration: 0.25, ease: 'easeOut' }
                }}
                className={`
                    mx-4 mb-3 p-4 rounded-xl border border-theme
                    ${!notification.read
                        ? 'bg-accent/5 glass-card'
                        : 'glass-subtle'
                    }
                    hover:shadow-md
                    transition-shadow duration-200 cursor-pointer
                `}
                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
                <div className="flex items-start gap-3">
                    {/* Icon - custom icon or type-based icon */}
                    {notification.iconId ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-theme-tertiary/50 flex items-center justify-center shadow-sm">
                            <img
                                src={`/api/custom-icons/${notification.iconId}/file`}
                                alt=""
                                className="w-7 h-7 object-contain"
                            />
                        </div>
                    ) : (
                        <div
                            className="p-2.5 rounded-xl flex-shrink-0 shadow-sm"
                            style={{
                                backgroundColor: `color-mix(in srgb, var(--${notification.type}) 15%, transparent)`,
                                border: `1px solid color-mix(in srgb, var(--${notification.type}) 20%, transparent)`
                            }}
                        >
                            <Icon
                                size={18}
                                style={{ color: `var(--${notification.type})` }}
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-semibold leading-tight ${notification.read ? 'text-theme-secondary' : 'text-theme-primary'}`}>
                                {notification.title}
                            </h4>
                            <span className="text-xs text-theme-tertiary whitespace-nowrap font-medium">
                                {formatTime(notification.createdAt)}
                            </span>
                        </div>
                        <p className="text-sm text-theme-secondary mt-1.5 leading-relaxed">
                            {notification.message}
                        </p>

                        {/* Actionable notification buttons (Overseerr approve/decline) */}
                        {notification.metadata?.actionable && notification.metadata?.requestId && (
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRequestAction(notification.id, 'approve');
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                        bg-success/20 text-success hover:bg-success/30 
                                        border border-success/20 hover:border-success/40
                                        transition-all duration-200 hover:scale-105"
                                >
                                    <Check size={14} />
                                    Approve
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRequestAction(notification.id, 'decline');
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                        bg-error/20 text-error hover:bg-error/30 
                                        border border-error/20 hover:border-error/40
                                        transition-all duration-200 hover:scale-105"
                                >
                                    <XCircle size={14} />
                                    Decline
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                        {!notification.read && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                }}
                                className="p-2 rounded-lg text-theme-tertiary 
                                    hover:text-success hover:bg-success/10 
                                    transition-all duration-200"
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
                            className="p-2 rounded-lg text-theme-tertiary 
                                hover:text-error hover:bg-error/10 
                                transition-all duration-200"
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
            <div key={title} className="mb-6">
                <div className="mx-4 mb-2 px-2 py-1.5 text-xs font-bold text-theme-tertiary uppercase tracking-wider flex items-center gap-2">
                    <span>{title}</span>
                    <span className="text-theme-tertiary/50 font-medium normal-case">({items.length})</span>
                </div>
                <AnimatePresence mode="sync">
                    {items.map((notification, index) => renderNotification(notification, index))}
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
                <div className="flex gap-1 mb-3 bg-theme-tertiary/30 p-1 rounded-lg">
                    {[
                        { id: 'all', label: 'All', count: notifications.length },
                        { id: 'unread', label: 'Unread', count: unreadCount },
                        { id: 'read', label: 'Read', count: notifications.length - unreadCount }
                    ].map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            className="relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1"
                        >
                            {activeFilter === filter.id && (
                                <motion.div
                                    layoutId="notificationFilterIndicator"
                                    className="absolute inset-0 bg-accent rounded-md"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className={`relative z-10 ${activeFilter === filter.id ? 'text-white' : 'text-theme-secondary'}`}>
                                {filter.label} ({filter.count})
                            </span>
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

                        {!showClearConfirm ? (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg
                                    bg-error/10 text-error hover:bg-error/20
                                    transition-colors"
                            >
                                Clear all
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleClearAll}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg
                                        bg-error text-white hover:bg-error/80
                                        transition-colors"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg
                                        bg-theme-tertiary text-theme-primary hover:bg-theme-hover
                                        transition-colors"
                                >
                                    Cancel
                                </button>
                                <span className="text-xs text-theme-secondary">Are you sure?</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto custom-scrollbar">
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
        </div>
    );
};

export default NotificationCenter;
