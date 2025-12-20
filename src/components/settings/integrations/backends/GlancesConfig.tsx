import React, { ChangeEvent } from 'react';
import { AlertCircle, Lightbulb } from 'lucide-react';
import { Input } from '../../../common/Input';

interface GlancesConfigData {
    url?: string;
    password?: string;
}

interface TestState {
    testing: boolean;
    success?: boolean;
    error?: string;
}

export interface GlancesConfigProps {
    config?: GlancesConfigData;
    onChange: (field: string, value: string) => void;
    onTest?: () => void;
    testState?: TestState;
}

/**
 * GlancesConfig - Glances-specific configuration panel
 * Includes helpful tips and smart defaults
 */
const GlancesConfig = ({ config, onChange, onTest, testState }: GlancesConfigProps): React.JSX.Element => {
    return (
        <div className="space-y-4">
            {/* Helpful tip banner */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4">
                <div className="flex gap-3">
                    <Lightbulb className="text-info flex-shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                        <p className="font-medium text-theme-primary mb-1">Quick Setup Tip</p>
                        <p className="text-theme-secondary">
                            Glances typically runs on port <code className="bg-theme-tertiary px-2 py-0.5 rounded text-info">61208</code>.
                            Example: <code className="bg-theme-tertiary px-2 py-0.5 rounded text-info">http://192.168.1.100:61208</code>
                        </p>
                    </div>
                </div>
            </div>

            {/* URL Field */}
            <Input
                label="Glances Server URL"
                type="text"
                value={config?.url || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('url', e.target.value)}
                placeholder="http://192.168.1.100:61208"
                required
            />

            {/* Password Field (Optional) */}
            <Input
                label="Password (Optional)"
                type="password"
                value={config?.password || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('password', e.target.value)}
                placeholder="Leave empty if no authentication"
            />
        </div>
    );
};

export default GlancesConfig;
