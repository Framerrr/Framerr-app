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

            // Set user settings
            setUserSettings({
                serverName: 'Homelab',
                serverIcon: 'Server',
                ...userConfig.preferences
            });

            setWidgets(userConfig.dashboard?.widgets || []);

            // Set tab groups from system config
            setGroups((systemConfig.tabGroups || []).sort((a, b) => a.order - b.order));

            // TODO: Fetch real services from backend
            // For now, using mock data to enable UI development
            setServices([
                { id: 'plex', name: 'Plex', groupId: 'media', icon: 'Play' },
                { id: 'sonarr', name: 'Sonarr', groupId: 'downloads', icon: 'Tv' },
                { id: 'radarr', name: 'Radarr', groupId: 'downloads', icon: 'Film' }
            ]);

        } catch (error) {
            console.error('Failed to fetch app data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
            console.error('Failed to save widget layout:', error);
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
