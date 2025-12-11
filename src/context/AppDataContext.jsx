import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export const AppDataContext = createContext(null);

export const AppDataProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [userSettings, setUserSettings] = useState({});
    const [services, setServices] = useState([]);
    const [groups, setGroups] = useState([]);
    const [widgets, setWidgets] = useState([]);
    const [integrations, setIntegrations] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            // Fetch user config (includes preferences, dashboard layout)
            const userConfigRes = await axios.get('/api/config/user');
            const userConfig = userConfigRes.data;

            // Fetch system config for tab groups
            const systemConfigRes = await axios.get('/api/config/system');
            const systemConfig = systemConfigRes.data;

            // Fetch integrations config
            const integrationsRes = await axios.get('/api/integrations');
            setIntegrations(integrationsRes.data.integrations || {});

            // Set user settings with server name/icon from system config
            setUserSettings({
                serverName: systemConfig?.server?.name || 'Homelab Dashboard',
                serverIcon: systemConfig?.server?.icon || 'Server',
                ...userConfig.preferences
            });

            setWidgets(userConfig.dashboard?.widgets || []);

            // Set tab groups from system config
            setGroups((systemConfig.tabGroups || []).sort((a, b) => a.order - b.order));

            // TODO: Fetch real services from backend when service system is implemented
            setServices([]);

        } catch (error) {
            logger.error('Failed to fetch app data', { error: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Listen for system config updates (app name/icon changes)
        const handleSystemConfigUpdated = () => {
            fetchData();
        };

        // Listen for integrations updates (when user saves integrations)
        const handleIntegrationsUpdated = () => {
            fetchData();
        };

        window.addEventListener('systemConfigUpdated', handleSystemConfigUpdated);
        window.addEventListener('integrationsUpdated', handleIntegrationsUpdated);

        return () => {
            window.removeEventListener('systemConfigUpdated', handleSystemConfigUpdated);
            window.removeEventListener('integrationsUpdated', handleIntegrationsUpdated);
        };
    }, [isAuthenticated]);

    const updateWidgetLayout = async (newLayout) => {
        try {
            // Optimistically update UI
            setWidgets(newLayout);

            // Save to backend
            await axios.put('/api/widgets', {
                widgets: newLayout
            });

            logger.debug('Widget layout saved', { widgetCount: newLayout.length });
        } catch (error) {
            logger.error('Failed to save widget layout', { error: error.message });
            // Revert on error
            fetchData();
        }
    };

    return (
        <AppDataContext.Provider value={{
            userSettings,
            services,
            groups,
            widgets,
            integrations,
            loading,
            updateWidgetLayout,
            refreshData: fetchData
        }}>
            {children}
        </AppDataContext.Provider>
    );
};

export const useAppData = () => {
    const context = useContext(AppDataContext);
    if (!context) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
};
