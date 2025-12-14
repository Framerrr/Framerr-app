import React, { useEffect, useState, useRef } from 'react';
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
 * @param {number} props.duration - Auto-dismiss duration in ms (default 10000)
 * @param {Object} props.action - Optional action button { label, onClick }
 * @param {Function} props.onDismiss - Callback when dismissed
 */
const ToastNotification = ({
    id,
    type = 'info',
    title,
    message,
    duration = 10000,
    action,
    onDismiss
}) => {
    const [isPaused, setIsPaused] = useState(false);
    const [remainingTime, setRemainingTime] = useState(duration);
    const timerRef = useRef(null);
    const startTimeRef = useRef(Date.now());

    const Icon = ICONS[type] || Info;

    // Handle the countdown timer
    useEffect(() => {
        if (!duration) return;

        if (isPaused) {
            // Clear timer when paused
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        // Start/resume timer with remaining time
        startTimeRef.current = Date.now();
        timerRef.current = setTimeout(() => {
            onDismiss(id);
        }, remainingTime);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [id, duration, isPaused, remainingTime, onDismiss]);

    const handleMouseEnter = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        // Calculate how much time has elapsed since last resume
        const elapsed = Date.now() - startTimeRef.current;
        setRemainingTime(prev => Math.max(0, prev - elapsed));
        setIsPaused(true);
    };

    const handleMouseLeave = () => {
        setIsPaused(false);
    };

    // Calculate progress percentage based on remaining time
    const progress = duration ? (remainingTime / duration) * 100 : 100;

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

            {/* Progress bar - smooth CSS transition */}
            {duration && (
                <div
                    className="h-1"
                    style={{
                        width: `${progress}%`,
                        background: `linear-gradient(
                            to right, 
                            var(--${type}), 
                            var(--${type}-hover, var(--${type}))
                        )`,
                        transition: isPaused ? 'none' : `width ${remainingTime}ms linear`
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

