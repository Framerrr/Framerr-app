import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

const SystemConfigContext = createContext(null);

export const SystemConfigProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [systemConfig, setSystemConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSystemConfig = async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get('/api/config/system');
            setSystemConfig(response.data);
        } catch (error) {
            logger.error('Failed to fetch system config:', error);
            // Set empty config to prevent crashes
            setSystemConfig({ groups: [], tabGroups: [] });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSystemConfig();
    }, [isAuthenticated]);

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
