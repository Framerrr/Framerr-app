import React, { useState, useEffect, MouseEvent } from 'react';
import { Activity, TestTube, ChevronDown, AlertCircle, CheckCircle2, Loader, RefreshCw, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../../../utils/logger';
import { Button } from '../../common/Button';
import BackendSelector from './BackendSelector';
import GlancesConfig from './backends/GlancesConfig';
import CustomBackendConfig from './backends/CustomBackendConfig';
import SharingDropdown from '../SharingDropdown';

type BackendType = 'glances' | 'custom';

interface GlancesConfigData {
    url: string;
    password: string;
}

interface CustomConfigData {
    url: string;
    token: string;
}

interface IntegrationConfig {
    enabled: boolean;
    backend: BackendType;
    glances: GlancesConfigData;
    custom: CustomConfigData;
    _isValid?: boolean;
}



interface TestState {
    loading: boolean;
    success?: boolean;
    message?: string;
}

export interface SystemHealthIntegrationProps {
    integration?: Partial<IntegrationConfig>;
    onUpdate: (config: IntegrationConfig) => void;
    integrationName?: string;
}

/**
 * SystemHealthIntegration - Multi-backend System Status configuration
 */
const SystemHealthIntegration = ({ integration, onUpdate, integrationName = 'systemstatus' }: SystemHealthIntegrationProps): React.JSX.Element => {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [selectedBackend, setSelectedBackend] = useState<BackendType>((integration?.backend as BackendType) || 'glances');
    const [config, setConfig] = useState<IntegrationConfig>(integration as IntegrationConfig || {
        enabled: false,
        backend: 'glances',
        glances: { url: '', password: '' },
        custom: { url: '', token: '' }
    });
    const [testState, setTestState] = useState<TestState | null>(null);
    const [confirmReset, setConfirmReset] = useState<boolean>(false);

    const handleToggle = (): void => {
        const newConfig: IntegrationConfig = { ...config, enabled: !config.enabled };
        setConfig(newConfig);
        onUpdate(newConfig);

        if (!config.enabled) {
            setIsExpanded(true);
        }
    };

    const handleBackendChange = (backend: BackendType): void => {
        const newConfig: IntegrationConfig = { ...config, backend };
        setSelectedBackend(backend);
        setConfig(newConfig);
        onUpdate(newConfig);
    };

    const handleConfigChange = (field: string, value: string): void => {
        const newConfig: IntegrationConfig = {
            ...config,
            [selectedBackend]: {
                ...config[selectedBackend],
                [field]: value
            }
        };
        setConfig(newConfig);
        onUpdate(newConfig);
    };

    const handleTest = async (): Promise<void> => {
        setTestState({ loading: true });

        const backendConfig = config[selectedBackend];

        try {
            let endpoint = '';
            const params = new URLSearchParams();

            if (selectedBackend === 'glances') {
                endpoint = '/api/systemstatus/glances/status';
                params.append('url', backendConfig.url);
                if ((backendConfig as GlancesConfigData).password) params.append('password', (backendConfig as GlancesConfigData).password);
            } else {
                endpoint = '/api/systemstatus/status';
                params.append('url', backendConfig.url);
                if ((backendConfig as CustomConfigData).token) params.append('token', (backendConfig as CustomConfigData).token);
            }

            const response = await fetch(`${endpoint}?${params}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setTestState({
                    loading: false,
                    success: true,
                    message: `Connected! CPU: ${Math.round(data.cpu)}%, Memory: ${Math.round(data.memory)}%`
                });
            } else {
                const error = await response.json();
                setTestState({
                    loading: false,
                    success: false,
                    message: error.error || 'Connection failed'
                });
            }
        } catch (error) {
            logger.error('System Health test error:', { error });
            setTestState({
                loading: false,
                success: false,
                message: (error as Error).message || 'Connection failed'
            });
        }

        setTimeout(() => {
            setTestState(null);
        }, 5000);
    };

    const handleReset = (): void => {
        const resetConfig: IntegrationConfig = {
            enabled: false,
            backend: 'glances',
            glances: { url: '', password: '' },
            custom: { url: '', token: '' },
            _isValid: true
        };
        setConfig(resetConfig);
        setSelectedBackend('glances');
        onUpdate(resetConfig);
        setConfirmReset(false);
    };

    const backendConfig = config[selectedBackend] || {};

    const isValidConfig = (): boolean => {
        if (!config.enabled) return true;

        if (selectedBackend === 'glances') {
            return !!backendConfig.url;
        } else if (selectedBackend === 'custom') {
            return !!backendConfig.url;
        }
        return false;
    };

    const isConfigured = isValidConfig();

    useEffect(() => {
        if (onUpdate) {
            const configWithValidation: IntegrationConfig = {
                ...config,
                _isValid: isConfigured
            };
            onUpdate(configWithValidation);
        }
    }, [isConfigured, config.enabled, selectedBackend, backendConfig.url, (backendConfig as GlancesConfigData).password, (backendConfig as CustomConfigData).token]);

    return (
        <div className="glass-subtle shadow-medium rounded-xl overflow-hidden border border-theme card-glow">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-6 flex items-center justify-between hover:bg-theme-hover/30 transition-colors"
            >
                <div className="flex items-center gap-4 flex-1">
                    <Activity className="text-theme-secondary" size={20} />
                    <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-semibold text-theme-primary">System Health</h3>
                        <p className="text-sm text-theme-secondary hidden sm:block">
                            Server monitoring (CPU, Memory, Temperature)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!isExpanded && config.enabled && (
                        <span className={`
              px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5
              ${isConfigured
                                ? 'bg-success/10 text-success sm:border sm:border-success/20'
                                : 'bg-warning/10 text-warning sm:border sm:border-warning/20'
                            }
            `}>
                            <span>{isConfigured ? '🟢' : '🟡'}</span>
                            <span className="hidden sm:inline">{isConfigured ? 'Configured' : 'Setup Required'}</span>
                        </span>
                    )}

                    <div
                        onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            handleToggle();
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${config.enabled ? 'bg-success' : 'bg-theme-tertiary'}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>

                    <ChevronDown size={20} className={`text-theme-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Configuration Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden">
                        <div className="px-6 pb-6 border-t border-theme pt-6 space-y-6">
                            <BackendSelector
                                selected={selectedBackend}
                                onSelect={handleBackendChange}
                                disabled={false}
                            />

                            <div>
                                {selectedBackend === 'glances' ? (
                                    <GlancesConfig
                                        config={backendConfig}
                                        onChange={handleConfigChange}
                                    />
                                ) : (
                                    <CustomBackendConfig
                                        config={backendConfig}
                                        onChange={handleConfigChange}
                                    />
                                )}
                            </div>

                            <SharingDropdown
                                integrationName={integrationName}
                                disabled={!isConfigured}
                            />

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={handleTest}
                                        disabled={testState?.loading || !isConfigured}
                                        variant={testState && !testState.loading ? (testState.success ? 'primary' : 'danger') : 'secondary'}
                                        size="sm"
                                        icon={testState?.loading ? Loader : (testState?.success ? CheckCircle2 : testState ? AlertCircle : TestTube)}
                                        className={testState && !testState.loading ? (testState.success ? 'bg-success border-success' : '') : ''}
                                    >
                                        {testState?.loading ? 'Testing...' :
                                            testState?.success ? <span className="hidden sm:inline">Connected!</span> :
                                                testState ? <span className="hidden sm:inline">Failed</span> :
                                                    'Test'}
                                    </Button>
                                </div>

                                {config.enabled && (
                                    !confirmReset ? (
                                        <Button
                                            onClick={() => setConfirmReset(true)}
                                            variant="secondary"
                                            size="sm"
                                            className="text-error hover:bg-error/10 border-error/20"
                                        >
                                            Reset Integration
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-error">Reset?</span>
                                            <Button
                                                onClick={handleReset}
                                                variant="danger"
                                                size="sm"
                                                icon={Check}
                                            >
                                                Yes
                                            </Button>
                                            <Button
                                                onClick={() => setConfirmReset(false)}
                                                variant="secondary"
                                                size="sm"
                                                icon={X}
                                            >
                                                No
                                            </Button>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SystemHealthIntegration;
