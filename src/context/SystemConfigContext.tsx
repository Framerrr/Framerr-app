import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import { useAuth } from './AuthContext';
import { isAdmin } from '../utils/permissions';
import logger from '../utils/logger';
import type { SystemConfigContextValue, SystemConfig } from '../types/context/systemConfig';

const SystemConfigContext = createContext<SystemConfigContextValue | null>(null);

interface SystemConfigProviderProps {
    children: ReactNode;
}

export const SystemConfigProvider = ({ children }: SystemConfigProviderProps): React.JSX.Element => {
    const { isAuthenticated, user } = useAuth();
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchSystemConfig = async (): Promise<void> => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        // Wait for user data to be available before checking admin status
        if (!user) {
            setLoading(false);
            return;
        }

        // Only admins can access system config
        if (!isAdmin(user)) {
            setSystemConfig({ groups: [], tabGroups: [] });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get<SystemConfig>('/api/config/system');
            setSystemConfig(response.data);
        } catch (error) {
            const axiosError = error as AxiosError;
            // Only log debug for 403 (expected for non-admins), error for other issues
            if (axiosError.response?.status === 403) {
                logger.debug('System config not accessible (not admin)');
            } else {
                logger.error('Failed to fetch system config', { error });
            }
            // Set empty config to prevent crashes
            setSystemConfig({ groups: [], tabGroups: [] });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSystemConfig();
    }, [isAuthenticated, user]);

    const value: SystemConfigContextValue = {
        systemConfig,
        loading,
        refreshSystemConfig: fetchSystemConfig
    };

    return (
        <SystemConfigContext.Provider value={value}>
            {children}
        </SystemConfigContext.Provider>
    );
};

export const useSystemConfig = (): SystemConfigContextValue => {
    const context = useContext(SystemConfigContext);
    if (!context) {
        throw new Error('useSystemConfig must be used within a SystemConfigProvider');
    }
    return context;
};
