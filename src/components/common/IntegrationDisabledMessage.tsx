import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface IntegrationDisabledMessageProps {
    serviceName: string;
}

/**
 * IntegrationDisabledMessage - Reusable component for disabled integration state
 * Shows when a widget's integration is not enabled in settings
 */
const IntegrationDisabledMessage = ({ serviceName }: IntegrationDisabledMessageProps): React.JSX.Element => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <AlertCircle size={32} className="text-warning opacity-50 mb-3" />
            <p className="text-theme-primary font-medium mb-1">
                Integration Disabled
            </p>
            <p className="text-sm text-theme-secondary">
                Please enable <span className="font-medium">{serviceName}</span> in
            </p>
            <p className="text-sm text-theme-secondary">
                <a
                    href="#settings?tab=integrations"
                    className="text-accent hover:underline"
                    onClick={() => {
                        // Navigate to settings integrations tab
                        window.location.hash = '#settings?tab=integrations';
                    }}
                >
                    Integration Settings
                </a>
            </p>
        </div>
    );
};

export default IntegrationDisabledMessage;
