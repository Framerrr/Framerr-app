import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import { useAuth } from './AuthContext';
import { isAdmin } from '../utils/permissions';
import logger from '../utils/logger';
import type { Widget } from '../../shared/types/widget';
import type { TabGroup } from '../../shared/types/tab';
import type { IntegrationsMap } from '../../shared/types/integration';
import type { AppDataContextValue, UserSettings } from '../types/context/appData';

interface UserConfigResponse {
    preferences?: Record<string, unknown>;
    dashboard?: {
        widgets?: Widget[];
    };
}

interface SystemConfigResponse {
    tabGroups?: TabGroup[];
}

interface IntegrationsResponse {
    integrations?: IntegrationsMap;
}

interface SharedIntegration {
    name: string;
    enabled: boolean;
    url?: string;
    apiKey?: string;
    token?: string;
    [key: string]: unknown;
}

interface SharedIntegrationsResponse {
    integrations?: SharedIntegration[];
}

interface AppBrandingResponse {
    name?: string;
    icon?: string;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

interface AppDataProviderProps {
    children: ReactNode;
}

export const AppDataProvider = ({ children }: AppDataProviderProps): React.JSX.Element => {
    const { isAuthenticated, user } = useAuth();
    const [userSettings, setUserSettings] = useState<UserSettings>({});
    const [services, setServices] = useState<unknown[]>([]);
    const [groups, setGroups] = useState<TabGroup[]>([]);
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [integrations, setIntegrations] = useState<IntegrationsMap>({});
    const [integrationsLoaded, setIntegrationsLoaded] = useState<boolean>(false);
    const [integrationsError, setIntegrationsError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchData = async (): Promise<void> => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            // Fetch user config (includes preferences, dashboard layout)
            const userConfigRes = await axios.get<UserConfigResponse>('/api/config/user');
            const userConfig = userConfigRes.data;

            // Only fetch admin-only endpoints for admins
            let systemConfig: SystemConfigResponse = {};
            if (isAdmin(user)) {
                try {
                    const systemConfigRes = await axios.get<SystemConfigResponse>('/api/config/system');
                    systemConfig = systemConfigRes.data;
                } catch (sysError) {
                    logger.debug('System config not available');
                }

                // Fetch integrations config (admin-only)
                try {
                    const integrationsRes = await axios.get<IntegrationsResponse>('/api/integrations');
                    setIntegrations(integrationsRes.data.integrations || {});
                    setIntegrationsLoaded(true);
                    setIntegrationsError(null);
                } catch (intError) {
                    logger.debug('Full integrations not available');
                    setIntegrations({});
                    setIntegrationsLoaded(true);
                    setIntegrationsError(intError as Error);
                }
            } else {
                // Non-admin: fetch shared integrations that admin has granted access to
                try {
                    const sharedRes = await axios.get<SharedIntegrationsResponse>('/api/integrations/shared');
                    const sharedList = sharedRes.data.integrations || [];

                    // Convert array to object keyed by service name for widget compatibility
                    const sharedIntegrations: IntegrationsMap = {};
                    for (const integration of sharedList) {
                        // Destructure to separate known fields from rest
                        const { name, ...restIntegration } = integration;
                        sharedIntegrations[name] = {
                            ...restIntegration,
                            // Plex uses 'token' - ensure it's set from token or apiKey
                            token: integration.token || integration.apiKey
                        };
                    }
                    setIntegrations(sharedIntegrations);
                    setIntegrationsLoaded(true);
                    setIntegrationsError(null);
                    logger.debug('Shared integrations loaded', { count: sharedList.length });
                } catch (sharedError) {
                    logger.debug('Shared integrations not available');
                    setIntegrations({});
                    setIntegrationsLoaded(true);
                    setIntegrationsError(sharedError as Error);
                }
            }

            // Fetch app branding (public endpoint - works for all users)
            let appBranding: AppBrandingResponse = { name: 'Framerr', icon: 'Server' };
            try {
                const brandingRes = await axios.get<AppBrandingResponse>('/api/config/app-name');
                appBranding = brandingRes.data;
            } catch (brandingError) {
                logger.debug('App branding not available, using defaults');
            }

            // Set user settings with server name/icon from branding API
            setUserSettings({
                serverName: appBranding.name || 'Framerr',
                serverIcon: appBranding.icon || 'Server',
                ...userConfig.preferences
            });

            setWidgets(userConfig.dashboard?.widgets || []);

            // Set tab groups from system config (or empty for non-admins)
            setGroups((systemConfig.tabGroups || []).sort((a, b) => a.order - b.order));

            // TODO: Fetch real services from backend when service system is implemented
            setServices([]);

        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('Failed to fetch app data', { error: axiosError.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Listen for system config updates (app name/icon changes)
        const handleSystemConfigUpdated = (): void => {
            fetchData();
        };

        // Listen for integrations updates (when user saves integrations)
        const handleIntegrationsUpdated = (): void => {
            fetchData();
        };

        window.addEventListener('systemConfigUpdated', handleSystemConfigUpdated);
        window.addEventListener('integrationsUpdated', handleIntegrationsUpdated);

        return () => {
            window.removeEventListener('systemConfigUpdated', handleSystemConfigUpdated);
            window.removeEventListener('integrationsUpdated', handleIntegrationsUpdated);
        };
    }, [isAuthenticated]);

    const updateWidgetLayout = async (newLayout: Widget[]): Promise<void> => {
        try {
            // Optimistically update UI
            setWidgets(newLayout);

            // Save to backend
            await axios.put('/api/widgets', {
                widgets: newLayout
            });

            logger.debug('Widget layout saved', { widgetCount: newLayout.length });
        } catch (error) {
            const axiosError = error as AxiosError;
            logger.error('Failed to save widget layout', { error: axiosError.message });
            // Revert on error
            fetchData();
        }
    };

    const value: AppDataContextValue = {
        userSettings,
        services,
        groups,
        widgets,
        integrations,
        integrationsLoaded,
        integrationsError,
        loading,
        updateWidgetLayout,
        refreshData: fetchData
    };

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};

export const useAppData = (): AppDataContextValue => {
    const context = useContext(AppDataContext);
    if (!context) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
};
