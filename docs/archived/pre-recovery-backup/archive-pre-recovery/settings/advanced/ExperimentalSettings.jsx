import React from 'react';
import { Beaker, ToggleLeft } from 'lucide-react';

const ExperimentalSettings = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Experimental Features</h3>
                <p className="text-slate-400 text-sm">
                    Feature flags and beta features (coming soon)
                </p>
            </div>

            {/* Placeholder */}
            <div className="glass-card rounded-xl p-12 text-center">
                <Beaker size={64} className="mx-auto mb-4 text-slate-600" />
                <h4 className="text-white font-medium mb-2">Feature Flags System</h4>
                <p className="text-slate-400 mb-4">
                    Control experimental features and beta functionality
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg text-slate-400">
                    <ToggleLeft size={18} />
                    <span className="text-sm">Coming Soon</span>
                </div>
            </div>
        </div>
    );
};

export default ExperimentalSettings;
