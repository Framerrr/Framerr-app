import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { setLogoutFunction } from '../utils/axiosSetup';
import logger from '../utils/logger';
import type { User, LoginResult } from '../../shared/types/user';
import type { AuthContextValue } from '../types/context/auth';

interface MeApiResponse {
    user: User;
}

interface SetupStatusResponse {
    needsSetup: boolean;
}

interface LoginApiResponse {
    user: User;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): React.JSX.Element => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [needsSetup, setNeedsSetup] = useState<boolean>(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Session expiry handler - clears state and redirects
    const handleSessionExpiry = useCallback((): void => {
        setUser(null);
        navigate('/login', { replace: true });
    }, [navigate]);

    // Logout function - uses browser navigation for seamless auth proxy support
    const logout = useCallback((): void => {
        // Browser-native logout - server handles redirect
        // This eliminates race conditions with auth proxy
        window.location.href = '/api/auth/logout';
    }, []);

    const checkSetupStatus = async (): Promise<boolean> => {
        try {
            const response = await axios.get<SetupStatusResponse>('/api/auth/setup/status');
            setNeedsSetup(response.data.needsSetup);
            return response.data.needsSetup;
        } catch (err) {
            logger.error('Setup status check failed', { error: err });
            setNeedsSetup(false);
            return false;
        }
    };

    const checkAuth = async (): Promise<void> => {
        try {
            const response = await axios.get<MeApiResponse>('/api/auth/me');
            setUser(response.data.user);
        } catch (err) {
            // Not authenticated - this is normal on first load
            setUser(null);
        }
    };

    const checkSetupAndAuth = async (): Promise<void> => {
        try {
            // First check if setup is needed
            const setupNeeded = await checkSetupStatus();

            // If setup is not needed, check authentication
            if (!setupNeeded) {
                await checkAuth();
            }
        } catch (err) {
            logger.error('Initial check failed', { error: err });
        } finally {
            setLoading(false);
        }
    };

    // Check setup status and auth on mount
    useEffect(() => {
        checkSetupAndAuth();
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
        const handleVisibilityChange = async (): Promise<void> => {
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

    const login = async (username: string, password: string, rememberMe: boolean): Promise<LoginResult> => {
        try {
            const response = await axios.post<LoginApiResponse>('/api/auth/login', {
                username,
                password,
                rememberMe
            });
            setUser(response.data.user);
            return { success: true };
        } catch (err) {
            const axiosError = err as AxiosError<{ error?: string }>;
            const msg = axiosError.response?.data?.error || 'Login failed';
            setError(msg);
            return { success: false, error: msg };
        }
    };

    const loginWithPlex = async (plexToken: string, plexUserId: string): Promise<LoginResult> => {
        try {
            const response = await axios.post<LoginApiResponse>('/api/auth/plex-login', {
                plexToken,
                plexUserId
            });
            setUser(response.data.user);
            return { success: true };
        } catch (err) {
            const axiosError = err as AxiosError<{ error?: string }>;
            const msg = axiosError.response?.data?.error || 'Plex login failed';
            setError(msg);
            return { success: false, error: msg };
        }
    };

    const value: AuthContextValue = {
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
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};


export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
