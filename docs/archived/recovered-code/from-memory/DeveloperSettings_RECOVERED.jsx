import React from 'react';
import { Code, BookOpen, Webhook } from 'lucide-react';

const DeveloperSettings = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-theme-primary mb-2">Developer Tools</h3>
                <p className="text-theme-secondary text-sm">
                    API documentation and developer utilities (coming soon)
                </p>
            </div>

            {/* Placeholder */}
            <div className="glass-card rounded-xl p-12 text-center border border-theme">
                <Code size={64} className="mx-auto mb-4 text-theme-tertiary" />
                <h4 className="text-theme-primary font-medium mb-2">Developer Features</h4>
                <p className="text-theme-secondary mb-6">
                    Access API documentation, webhooks, and technical tools
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary rounded-lg text-theme-secondary">
                        <BookOpen size={16} />
                        <span className="text-sm">API Docs</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary rounded-lg text-theme-secondary">
                        <Webhook size={16} />
                        <span className="text-sm">Webhooks</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeveloperSettings;
