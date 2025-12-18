import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import ToastNotification from './ToastNotification';
import { useNotifications } from '../../context/NotificationContext';

/**
 * ToastContainer Component
 * 
 * Manages and renders all active toast notifications
 * - Renders via portal (outside DOM hierarchy)
 * - Stacks toasts vertically
 * - Limits to max 5 toasts
 * - Positioned in top-right corner
 */
const ToastContainer = () => {
    const { toasts, dismissToast } = useNotifications();

    // Only render if there are toasts
    if (toasts.length === 0) return null;

    const toastContent = (
        <div
            className="fixed top-4 right-4 z-[1070] flex flex-col gap-3 pointer-events-none"
            aria-live="polite"
            aria-atomic="false"
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastNotification
                            {...toast}
                            onDismiss={dismissToast}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );

    return createPortal(toastContent, document.body);
};

export default ToastContainer;
