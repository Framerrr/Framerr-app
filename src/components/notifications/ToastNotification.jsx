import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
};

/**
 * ToastNotification Component
 * 
 * Individual toast notification with auto-dismiss, pause-on-hover, and progress bar
 * 
 * @param {Object} props
 * @param {string} props.id - Unique toast ID
 * @param {string} props.type - Type: 'success' | 'error' | 'warning' | 'info'
 * @param {string} props.title - Toast title
 * @param {string} props.message - Toast message
 * @param {number} props.duration - Auto-dismiss duration in ms (default 5000)
 * @param {Object} props.action - Optional action button { label, onClick }
 * @param {Function} props.onDismiss - Callback when dismissed
 */
const ToastNotification = ({
    id,
    type = 'info',
    title,
    message,
    duration = 5000,
    action,
    onDismiss
}) => {
    const [progress, setProgress] = useState(100);
    const [isPaused, setIsPaused] = useState(false);
    const [startTime] = useState(Date.now());
    const [pausedTime, setPausedTime] = useState(null);

    const Icon = ICONS[type] || Info;

    useEffect(() => {
        if (isPaused || !duration) return;

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime - (pausedTime || 0);
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);

            setProgress(remaining);

            if (remaining <= 0) {
                onDismiss(id);
            }
        }, 16); // ~60fps

        return () => clearInterval(interval);
    }, [id, duration, isPaused, startTime, pausedTime, onDismiss]);

    const handleMouseEnter = () => {
        setIsPaused(true);
        setPausedTime(Date.now() - startTime);
    };

    const handleMouseLeave = () => {
        setIsPaused(false);
        setPausedTime(null);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
                type: 'spring',
                stiffness: 350,
                damping: 35
            }}
            className="glass-subtle border border-theme rounded-xl shadow-lg 
                max-w-sm w-full overflow-hidden"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-start gap-3 p-4">
                {/* Icon with type-based background */}
                <div
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{
                        backgroundColor: `var(--${type})`,
                        opacity: 0.2
                    }}
                >
                    <Icon
                        size={20}
                        style={{ color: `var(--${type})` }}
                        aria-hidden="true"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-theme-primary font-semibold text-sm">
                        {title}
                    </h4>
                    <p className="text-theme-secondary text-sm mt-1">
                        {message}
                    </p>
                    {action && (
                        <button
                            onClick={() => {
                                action.onClick();
                                onDismiss(id);
                            }}
                            className="text-accent hover:text-accent-hover 
                                text-sm font-medium mt-2 transition-colors"
                        >
                            {action.label}
                        </button>
                    )}
                </div>

                {/* Close button */}
                <button
                    onClick={() => onDismiss(id)}
                    className="text-theme-tertiary hover:text-theme-primary 
                        transition-colors flex-shrink-0 p-1"
                    aria-label="Dismiss notification"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress bar */}
            {duration && (
                <div
                    className="h-1 transition-all duration-100"
                    style={{
                        width: `${progress}%`,
                        background: `linear-gradient(
                            to right, 
                            var(--${type}), 
                            var(--${type}-hover, var(--${type}))
                        )`
                    }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                />
            )}
        </motion.div>
    );
};

export default ToastNotification;
