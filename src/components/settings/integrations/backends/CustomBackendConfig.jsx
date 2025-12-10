import React from 'react';
import { Code, Lightbulb } from 'lucide-react';
import { Input } from '../../common/Input';

/**
 * CustomBackendConfig - Custom API configuration panel
 * For users with their own monitoring solutions
 */
const CustomBackendConfig = ({ config, onChange }) => {
    return (
        <div className="space-y-4">
            {/* API Requirements banner */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4">
                <div className="flex gap-3">
                    <Code className="text-info flex-shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                        <p className="font-medium text-theme-primary mb-2">Custom API Requirements</p>
                        <p className="text-theme-secondary mb-2">Your API must provide these endpoints:</p>
                        <ul className="space-y-1 text-theme-secondary">
                            <li className="font-mono text-xs bg-theme-tertiary px-2 py-1 rounded">
                                GET /status → {'{'} cpu, memory, temperature, uptime {'}'}
                            </li>
                            <li className="font-mono text-xs bg-theme-tertiary px-2 py-1 rounded">
                                GET /history → [{'{'} time, cpu, memory, temperature {'}'}]
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Base URL Field */}
            <Input
                label="Base URL"
                type="text"
                value={config?.url || ''}
                onChange={(e) => onChange('url', e.target.value)}
                placeholder="http://your-monitoring-service.local:3001"
                required
            />

            {/* Token Field (Optional) */}
            <Input
                label="Authentication Token (Optional)"
                type="password"
                value={config?.token || ''}
                onChange={(e) => onChange('token', e.target.value)}
                placeholder="Bearer token for API authentication"
            />
        </div>
    );
};

export default CustomBackendConfig;
