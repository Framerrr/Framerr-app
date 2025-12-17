import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Check, XCircle } from 'lucide-react';

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
};

/**
 * ToastNotification Component
 * 
 * Individual toast notification with:
 * - Auto-dismiss with pause-on-hover
 * - Swipe-to-dismiss gestures
 * - Multiple action buttons support (for approve/decline)
 * - Body click to open notification center
 * 
 * @param {Object} props
 * @param {string} props.id - Unique toast ID
 * @param {string} props.type - Type: 'success' | 'error' | 'warning' | 'info'
 * @param {string} props.title - Toast title
 * @param {string} props.message - Toast message
 * @param {string} props.iconId - Optional custom icon ID (for integration logos)
 * @param {number} props.duration - Auto-dismiss duration in ms (default 10000)
 * @param {Object} props.action - Optional single action button { label, onClick }
 * @param {Array} props.actions - Optional multiple action buttons [{ label, onClick, variant }]
 * @param {Function} props.onBodyClick - Optional callback when toast body is clicked
 * @param {Function} props.onDismiss - Callback when dismissed
 */
const ToastNotification = ({
    id,
    type = 'info',
    title,
    message,
    iconId,
    duration = 10000,
    action,
    actions,
    onBodyClick,
    onDismiss
}) => {
    const [progress, setProgress] = useState(100);
    const [isDragging, setIsDragging] = useState(false);
    const isPausedRef = useRef(false);
    const elapsedRef = useRef(0);
    const lastTickRef = useRef(Date.now());
    const rafRef = useRef(null);
    const controls = useAnimation();

    const Icon = ICONS[type] || Info;

    // Animation loop using requestAnimationFrame
    const tick = useCallback(() => {
        if (!duration) return;

        const now = Date.now();

        if (!isPausedRef.current) {
            // Calculate time since last tick
            const delta = now - lastTickRef.current;
            elapsedRef.current += delta;

            // Calculate remaining progress
            const remaining = Math.max(0, 100 - (elapsedRef.current / duration) * 100);
            setProgress(remaining);

            // Check if complete
            if (remaining <= 0) {
                onDismiss(id);
                return;
            }
        }

        lastTickRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
    }, [id, duration, onDismiss]);

    // Start animation on mount
    useEffect(() => {
        if (!duration) return;

        lastTickRef.current = Date.now();
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [duration, tick]);

    const handleMouseEnter = () => {
        isPausedRef.current = true;
    };

    const handleMouseLeave = () => {
        // Reset lastTick to now so we don't count pause time
        lastTickRef.current = Date.now();
        isPausedRef.current = false;
    };

    // Trigger initial animation on mount
    useEffect(() => {
        controls.start({ opacity: 1, y: 0, scale: 1, x: 0 });
    }, [controls]);

    // Handle swipe dismiss
    const handleDragEnd = (event, info) => {
        setIsDragging(false);
        const threshold = 100;

        if (Math.abs(info.offset.x) > threshold) {
            // Animate out in swipe direction
            controls.start({
                x: info.offset.x > 0 ? 400 : -400,
                opacity: 0,
                transition: { duration: 0.2 }
            }).then(() => {
                onDismiss(id);
            });
        } else {
            // Snap back
            controls.start({ x: 0, opacity: 1 });
        }
    };

    // Handle body click (open notification center)
    const handleBodyClick = (e) => {
        // Don't trigger if clicking buttons or during drag
        if (isDragging) return;
        if (e.target.closest('button')) return;

        if (onBodyClick) {
            onBodyClick();
            onDismiss(id); // Also dismiss the toast
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95, x: 0 }}
            animate={controls}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
                type: 'spring',
                stiffness: 350,
                damping: 35
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className={`glass-subtle border border-theme rounded-xl shadow-lg 
                max-w-sm w-full overflow-hidden ${onBodyClick ? 'cursor-pointer' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleBodyClick}
            role="alert"
            aria-live="assertive"
            style={{ touchAction: 'pan-y' }}
        >
            <div className="flex items-start gap-3 p-4">
                {/* Icon - custom icon or type-based icon */}
                {iconId ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-theme-tertiary flex items-center justify-center">
                        <img
                            src={`/api/custom-icons/${iconId}/file`}
                            alt=""
                            className="w-8 h-8 object-contain"
                        />
                    </div>
                ) : (
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
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-theme-primary font-semibold text-sm">
                        {title}
                    </h4>
                    <p className="text-theme-secondary text-sm mt-1">
                        {message}
                    </p>

                    {/* Single action button (legacy support) */}
                    {action && !actions && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                action.onClick();
                                onDismiss(id);
                            }}
                            className="text-accent hover:text-accent-hover 
                                text-sm font-medium mt-2 transition-colors"
                        >
                            {action.label}
                        </button>
                    )}

                    {/* Multiple action buttons (approve/decline) */}
                    {actions && actions.length > 0 && (
                        <div className="flex gap-2 mt-3">
                            {actions.map((actionItem, index) => (
                                <button
                                    key={index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        actionItem.onClick();
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${actionItem.variant === 'success'
                                        ? 'bg-success/20 text-success hover:bg-success/30'
                                        : actionItem.variant === 'danger'
                                            ? 'bg-error/20 text-error hover:bg-error/30'
                                            : 'bg-accent/20 text-accent hover:bg-accent/30'
                                        }`}
                                >
                                    {actionItem.variant === 'success' && <Check size={14} />}
                                    {actionItem.variant === 'danger' && <XCircle size={14} />}
                                    {actionItem.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Close button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(id);
                    }}
                    className="text-theme-tertiary hover:text-theme-primary 
                        transition-colors flex-shrink-0 p-1"
                    aria-label="Dismiss notification"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress bar - smooth animation via requestAnimationFrame */}
            {duration && (
                <div
                    className="h-1"
                    style={{
                        width: `${progress}%`,
                        background: `linear-gradient(
                            to right, 
                            var(--${type}), 
                            var(--${type}-hover, var(--${type}))
                        )`
                    }}
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin="0"
                    aria-valuemax="100"
                />
            )}
        </motion.div>
    );
};

export default ToastNotification;
