import React from 'react';
import { WifiOff } from 'lucide-react';

/**
 * IntegrationConnectionError - Shown when integration data couldn't be loaded
 * due to network error (no internet, server unreachable, etc.)
 */
const IntegrationConnectionError = ({ serviceName }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <WifiOff size={32} className="text-theme-secondary opacity-50 mb-3" />
            <p className="text-theme-primary font-medium mb-1">
                Connection Error
            </p>
            <p className="text-sm text-theme-secondary">
                Unable to load <span className="font-medium">{serviceName}</span> data.
            </p>
            <p className="text-sm text-theme-secondary">
                Check your internet connection.
            </p>
        </div>
    );
};

export default IntegrationConnectionError;
