/**
 * Axios interceptor setup for global error handling
 * Shows toast notifications for authentication errors (401)
 * Auto-triggers logout on session expiry
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Types
type ErrorNotifyFn = (title: string, message: string) => void;
type LogoutFn = () => void;

interface NotificationFunctions {
    error: ErrorNotifyFn;
}

// Store reference to notification and logout functions (set by providers)
let showErrorFn: ErrorNotifyFn | null = null;
let logoutFn: LogoutFn | null = null;
let isLoggingOut = false; // Flag to prevent 401 handler during explicit logout

/**
 * Set the notification functions for the interceptor to use
 * Called from a component inside NotificationProvider
 */
export const setNotificationFunctions = (fns: NotificationFunctions | null): void => {
    showErrorFn = fns?.error ?? null;
};

/**
 * Set the logout function for the interceptor to use
 * Called from AuthContext after logout function is available
 */
export const setLogoutFunction = (logout: LogoutFn | null): void => {
    logoutFn = logout;
};

/**
 * Set logging out flag to prevent 401 handler from firing during explicit logout
 */
export const setLoggingOut = (value: boolean): void => {
    isLoggingOut = value;
};

// URLs where 401 is expected and should NOT show "session expired"
const AUTH_ENDPOINTS: string[] = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/auth/setup'
];

// REQUEST interceptor - block ALL requests during logout to prevent race conditions
// This stops FaviconInjector, AppTitle, etc from making API calls that Authentik intercepts
axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (isLoggingOut && !config.url?.includes('/api/auth/logout')) {
            // Block all requests except the logout request itself
            return Promise.reject(new Error('Request blocked - logout in progress'));
        }
        return config;
    }
);

// Response interceptor for 401 errors
// TEMPORARILY DISABLED: Auto-logout on 401 may be interfering with proxy auth logout
// See docs/secondopinion/ for debugging context
axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
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
                // DISABLED: Auto-logout may be conflicting with proxy auth
                // TODO: Re-enable after fixing auth proxy logout issue
                // if (logoutFn) {
                //     logoutFn();
                // }
            }
        }
        return Promise.reject(error);
    }
);

export default axios;
