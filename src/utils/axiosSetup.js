/**
 * Axios interceptor setup for global error handling
 * Shows toast notifications for authentication errors (401)
 */
import axios from 'axios';

// Store reference to notification functions (set by NotificationProvider)
let showErrorFn = null;

/**
 * Set the notification functions for the interceptor to use
 * Called from a component inside NotificationProvider
 */
export const setNotificationFunctions = ({ error }) => {
    showErrorFn = error;
};

// Response interceptor for 401 errors
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Session expired or not authenticated
            const isLoginPage = window.location.hash.includes('login');
            const isSetupPage = window.location.hash.includes('setup');

            // Don't show error on login/setup pages (expected behavior)
            if (!isLoginPage && !isSetupPage && showErrorFn) {
                showErrorFn('Session Expired', 'Please log in again to continue');
            }
        }
        return Promise.reject(error);
    }
);

export default axios;
