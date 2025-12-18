/**
 * Axios interceptor setup for global error handling
 * Shows toast notifications for authentication errors (401)
 * Auto-triggers logout on session expiry
 */
import axios from 'axios';

// Store reference to notification and logout functions (set by providers)
let showErrorFn = null;
let logoutFn = null;
let isLoggingOut = false; // Flag to prevent 401 handler during explicit logout

/**
 * Set the notification functions for the interceptor to use
 * Called from a component inside NotificationProvider
 */
export const setNotificationFunctions = ({ error }) => {
    showErrorFn = error;
};

/**
 * Set the logout function for the interceptor to use
 * Called from AuthContext after logout function is available
 */
export const setLogoutFunction = (logout) => {
    logoutFn = logout;
};

/**
 * Set logging out flag to prevent 401 handler from firing during explicit logout
 */
export const setLoggingOut = (value) => {
    isLoggingOut = value;
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

            // Only handle unexpected 401s (actual session expiry)
            // Skip if we're in the middle of an explicit logout to prevent race conditions
            if (!isAuthEndpoint && !isLoginPage && !isSetupPage && !isLoggingOut) {
                if (showErrorFn) {
                    showErrorFn('Session Expired', 'Please log in again');
                }
                // Auto-logout and redirect
                if (logoutFn) {
                    logoutFn();
                }
            }
        }
        return Promise.reject(error);
    }
);

export default axios;

