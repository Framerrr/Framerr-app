import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { setLogoutFunction, setLoggingOut } from '../utils/axiosSetup';
import logger from '../utils/logger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [needsSetup, setNeedsSetup] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Check setup status and auth on mount
    useEffect(() => {
        checkSetupAndAuth();
    }, []);

    // Session expiry handler - clears state and redirects
    const handleSessionExpiry = useCallback(() => {
        setUser(null);
        navigate('/login', { replace: true });
    }, [navigate]);

    // Logout function - returns boolean indicating if caller should handle navigation
    // Returns FALSE for proxy auth (browser is redirecting, do NOT navigate)
    // Returns TRUE for local auth (caller should navigate to /login)
    const logout = useCallback(async () => {
        setLoggingOut(true);
        try {
            const response = await axios.post('/api/auth/logout');

            // PROXY AUTH: redirect and return false (caller must NOT navigate)
            if (response.data?.redirectUrl) {
                // Use replace() to avoid broken state in browser history
                window.location.replace(response.data.redirectUrl);
                return false; // Signal: "STOP! Browser is redirecting externally."
            }

            // LOCAL AUTH: clear state and return true (caller can navigate)
            setUser(null);
            setLoggingOut(false);
            return true; // Signal: "Local logout done. You may navigate."
        } catch (err) {
            logger.error('Logout failed', err);
            setLoggingOut(false);
            return false; // On error, don't navigate
        }
        // Note: No finally block - we handle setLoggingOut(false) explicitly above
        // to avoid it running after window.location.replace()
    }, []);

    // Register session expiry handler with axios interceptor for auto-logout on 401
    // Use handleSessionExpiry (just clears state) - don't call full logout() which makes API calls
    // For proxy auth, the simple state clear + navigate is enough - Authentik will handle the rest
    useEffect(() => {
        setLogoutFunction(handleSessionExpiry);
        return () => setLogoutFunction(null);
    }, [handleSessionExpiry]);

    // Check auth when tab becomes visible (handles sleeping tabs)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            // Only check if tab is becoming visible and user is logged in
            if (document.visibilityState === 'visible' && user) {
                try {
                    await axios.get('/api/auth/me');
                } catch (err) {
                    // 401 will be handled by axios interceptor
                    // which calls handleSessionExpiry
                    logger.debug('Visibility auth check failed');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [user]);

    // Handle redirects when setup status or auth changes
    useEffect(() => {
        if (loading) return; // Don't redirect while loading

        const currentPath = location.pathname;

        // If setup needed: redirect to /setup (unless already there)
        if (needsSetup) {
            if (currentPath !== '/setup') {
                navigate('/setup', { replace: true });
            }
            return; // Don't process other redirects when setup is needed
        }

        // Setup complete: redirect away from /setup to /login
        if (currentPath === '/setup') {
            navigate('/login', { replace: true });
        }
    }, [needsSetup, loading, location.pathname, navigate]);

    const checkSetupStatus = async () => {
        try {
            const response = await axios.get('/api/auth/setup/status');
            setNeedsSetup(response.data.needsSetup);
            return response.data.needsSetup;
        } catch (err) {
            logger.error('Setup status check failed:', err);
            setNeedsSetup(false);
            return false;
        }
    };

    const checkSetupAndAuth = async () => {
        try {
            // First check if setup is needed
            const setupNeeded = await checkSetupStatus();

            // If setup is not needed, check authentication
            if (!setupNeeded) {
                await checkAuth();
            }
        } catch (err) {
            logger.error('Initial check failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const checkAuth = async () => {
        try {
            const response = await axios.get('/api/auth/me');
            setUser(response.data.user);
        } catch (err) {
            // Not authenticated - this is normal on first load
            setUser(null);
        }
    };

    const login = async (username, password, rememberMe) => {
        try {
            const response = await axios.post('/api/auth/login', {
                username,
                password,
                rememberMe
            });
            setUser(response.data.user);
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed';
            setError(msg);
            return { success: false, error: msg };
        }
    };

    const loginWithPlex = async (plexToken, plexUserId) => {
        try {
            const response = await axios.post('/api/auth/plex-login', {
                plexToken,
                plexUserId
            });
            setUser(response.data.user);
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.error || 'Plex login failed';
            setError(msg);
            return { success: false, error: msg };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            needsSetup,
            login,
            loginWithPlex,
            logout,
            checkAuth,
            checkSetupStatus,
            isAuthenticated: !!user
            // isAdmin removed - use isAdmin(user, systemConfig) utility instead
        }}>
            {children}
        </AuthContext.Provider>
    );
};


export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

