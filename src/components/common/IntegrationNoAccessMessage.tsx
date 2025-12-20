import React from 'react';
import { ShieldOff } from 'lucide-react';

export interface IntegrationNoAccessMessageProps {
    serviceName: string;
}

/**
 * IntegrationNoAccessMessage - Shown to non-admin users when they don't have access to an integration
 * Unlike IntegrationDisabledMessage (for admins), this doesn't link to settings
 */
const IntegrationNoAccessMessage = ({ serviceName }: IntegrationNoAccessMessageProps): React.JSX.Element => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <ShieldOff size={32} className="text-theme-secondary opacity-50 mb-3" />
            <p className="text-theme-primary font-medium mb-1">
                Access Not Available
            </p>
            <p className="text-sm text-theme-secondary">
                <span className="font-medium">{serviceName}</span> access is managed by your administrator.
            </p>
        </div>
    );
};

export default IntegrationNoAccessMessage;
