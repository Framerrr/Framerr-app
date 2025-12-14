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

// URLs where 401 is expected and should NOT show "session expired"
const AUTH_ENDPOINTS = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/auth/setup'
];

// Response interceptor for 401 errors
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const requestUrl = error.config?.url || '';

            // Check if this is an auth endpoint (expected 401)
            const isAuthEndpoint = AUTH_ENDPOINTS.some(endpoint =>
                requestUrl.includes(endpoint)
            );

            // Check if on login/setup page
            const isLoginPage = window.location.hash.includes('login');
            const isSetupPage = window.location.hash.includes('setup');

            // Only show error for unexpected 401s (actual session expiry)
            if (!isAuthEndpoint && !isLoginPage && !isSetupPage && showErrorFn) {
                showErrorFn('Session Expired', 'Please log in again to continue');
            }
        }
        return Promise.reject(error);
    }
);

export default axios;
