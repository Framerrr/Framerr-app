import { useNotifications } from '../context/NotificationContext';

/**
 * Custom hook for easy notification usage throughout the app
 * 
 * @example
 * const { notify, success, error, warning, info } = useNotification();
 * 
 * success('Widget added successfully!');
 * error('Failed to save settings', { duration: 10000 });
 * warning('Connection lost, retrying...');
 * info('New feature available!', { 
 *   action: { label: 'Learn More', onClick: () => {} } 
 * });
 */
export const useNotification = () => {
    const {
        showToast,
        dismissToast,
        success,
        error,
        warning,
        info
    } = useNotifications();

    // Generic notify function
    const notify = (type, title, message, options) => {
        return showToast(type, title, message, options);
    };

    return {
        notify,
        success,
        error,
        warning,
        info,
        dismiss: dismissToast
    };
};
