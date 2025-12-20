import React from 'react';
import { Beaker, ToggleLeft } from 'lucide-react';

const ExperimentalSettings = (): React.JSX.Element => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-theme-primary mb-2">Experimental Features</h3>
                <p className="text-theme-secondary text-sm">
                    Feature flags and beta features (coming soon)
                </p>
            </div>

            {/* Placeholder */}
            <div className="glass-card rounded-xl p-12 text-center border border-theme">
                <Beaker size={64} className="mx-auto mb-4 text-theme-tertiary" />
                <h4 className="text-theme-primary font-medium mb-2">Feature Flags System</h4>
                <p className="text-theme-secondary mb-4">
                    Control experimental features and beta functionality
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-theme-tertiary rounded-lg text-theme-secondary">
                    <ToggleLeft size={18} />
                    <span className="text-sm">Coming Soon</span>
                </div>
            </div>
        </div>
    );
};

export default ExperimentalSettings;
