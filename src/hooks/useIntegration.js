import { useContext } from 'react';
import { AppDataContext } from '../context/AppDataContext';

export const useIntegration = (integrationKey) => {
    const { integrations } = useContext(AppDataContext);

    // Return the specific integration config or a default disabled config
    return integrations?.[integrationKey] || {
        enabled: false,
        url: '',
        apiKey: ''
    };
};

/**
 * Mock fetch integration hook for widget compatibility
 * In a recovered build, this would fetch live data
 */
export const useFetchIntegration = (integrationKey) => {
    const config = useIntegration(integrationKey);

    return {
        data: null,
        loading: !config.enabled,
        error: config.enabled ? null : 'Integration not configured'
    };
};
