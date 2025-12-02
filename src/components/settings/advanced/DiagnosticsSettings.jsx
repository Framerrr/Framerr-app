import React from 'react';
import { Activity, Wifi, Database, Zap } from 'lucide-react';

const DiagnosticsSettings = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">System Diagnostics</h3>
                <p className="text-slate-400 text-sm">
                    Connection tests and system health diagnostics (coming soon)
                </p>
            </div>

            {/* Placeholder */}
            <div className="glass-card rounded-xl p-12 text-center">
                <Activity size={64} className="mx-auto mb-4 text-slate-600" />
                <h4 className="text-white font-medium mb-2">Diagnostic Tools</h4>
                <p className="text-slate-400 mb-6">
                    Test database connections, API endpoints, and integration health
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg text-slate-400">
                        <Database size={16} />
                        <span className="text-sm">Database</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg text-slate-400">
                        <Wifi size={16} />
                        <span className="text-sm">Network</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg text-slate-400">
                        <Zap size={16} />
                        <span className="text-sm">Integrations</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiagnosticsSettings;
