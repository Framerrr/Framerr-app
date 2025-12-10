import React from 'react';
import { Activity, Wifi, Database, Zap } from 'lucide-react';

const DiagnosticsSettings = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-theme-primary mb-2">System Diagnostics</h3>
                <p className="text-theme-secondary text-sm">
                    Connection tests and system health diagnostics (coming soon)
                </p>
            </div>

            {/* Placeholder */}
            <div className="glass-subtle rounded-xl p-12 text-center">
                <Activity size={64} className="mx-auto mb-4 text-theme-tertiary" />
                <h4 className="text-theme-primary font-medium mb-2">Diagnostic Tools</h4>
                <p className="text-theme-secondary mb-6">
                    Test database connections, API endpoints, and integration health
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary rounded-lg text-theme-secondary">
                        <Database size={16} />
                        <span className="text-sm">Database</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary rounded-lg text-theme-secondary">
                        <Wifi size={16} />
                        <span className="text-sm">Network</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary rounded-lg text-theme-secondary">
                        <Zap size={16} />
                        <span className="text-sm">Integrations</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiagnosticsSettings;
