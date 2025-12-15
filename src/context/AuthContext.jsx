import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
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

    const logout = async () => {
        try {
            const response = await axios.post('/api/auth/logout');
            setUser(null);

            // If backend returns redirectUrl (proxy auth logout), redirect to it
            if (response.data?.redirectUrl) {
                window.location.href = response.data.redirectUrl;
            }
        } catch (err) {
            logger.error('Logout failed', err);
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

