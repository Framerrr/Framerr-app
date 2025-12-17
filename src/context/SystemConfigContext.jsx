import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { isAdmin } from '../utils/permissions';
import logger from '../utils/logger';

const SystemConfigContext = createContext(null);

export const SystemConfigProvider = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const [systemConfig, setSystemConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSystemConfig = async () => {
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
            const response = await axios.get('/api/config/system');
            setSystemConfig(response.data);
        } catch (error) {
            // Only log debug for 403 (expected for non-admins), error for other issues
            if (error.response?.status === 403) {
                logger.debug('System config not accessible (not admin)');
            } else {
                logger.error('Failed to fetch system config:', error);
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

    return (
        <SystemConfigContext.Provider value={{
            systemConfig,
            loading,
            refreshSystemConfig: fetchSystemConfig
        }}>
            {children}
        </SystemConfigContext.Provider>
    );
};

export const useSystemConfig = () => {
    const context = useContext(SystemConfigContext);
    if (!context) {
        throw new Error('useSystemConfig must be used within a SystemConfigProvider');
    }
    return context;
};
