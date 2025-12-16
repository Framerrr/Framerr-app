import React, { useState, useEffect } from 'react';
import { Activity, TestTube, ChevronDown, AlertCircle, CheckCircle2, Loader, RefreshCw, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../../../utils/logger';
import { Button } from '../../common/Button';
import BackendSelector from './BackendSelector';
import GlancesConfig from './backends/GlancesConfig';
import CustomBackendConfig from './backends/CustomBackendConfig';
import SharingDropdown from '../SharingDropdown';

/**
 * SystemHealthIntegration - Multi-backend System Status configuration
 * Replaces the generic System Health section in IntegrationsSettings
 */
const SystemHealthIntegration = ({ integration, onUpdate, sharing, onSharingChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedBackend, setSelectedBackend] = useState(integration?.backend || 'glances');
    const [config, setConfig] = useState(integration || {
        enabled: false,
        backend: 'glances',
        glances: { url: '', password: '' },
        custom: { url: '', token: '' }
    });
    const [testState, setTestState] = useState(null);
    const [confirmReset, setConfirmReset] = useState(false);

    // Auto-expand behavior removed - section should stay collapsed on page load
    // It will expand when user clicks the toggle or the header

    const handleToggle = () => {
        const newConfig = { ...config, enabled: !config.enabled, sharing };
        setConfig(newConfig);
        onUpdate(newConfig);

        if (!config.enabled) {
            setIsExpanded(true);
        }
    };

    const handleBackendChange = (backend) => {
        const newConfig = { ...config, backend, sharing };
        setSelectedBackend(backend);
        setConfig(newConfig);
        onUpdate(newConfig);
    };

    const handleConfigChange = (field, value) => {
        const newConfig = {
            ...config,
            [selectedBackend]: {
                ...config[selectedBackend],
                [field]: value
            },
            sharing
        };
        setConfig(newConfig);
        onUpdate(newConfig);
    };

    const handleTest = async () => {
        setTestState({ loading: true });

        const backendConfig = config[selectedBackend];

        try {
            let endpoint = '';
            let params = new URLSearchParams();

            if (selectedBackend === 'glances') {
                endpoint = '/api/systemstatus/glances/status';
                params.append('url', backendConfig.url);
                if (backendConfig.password) params.append('password', backendConfig.password);
            } else {
                // Custom backend
                endpoint = '/api/systemstatus/status';
                params.append('url', backendConfig.url);
                if (backendConfig.token) params.append('token', backendConfig.token);
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
            logger.error('System Health test error:', error);
            setTestState({
                loading: false,
                success: false,
                message: error.message || 'Connection failed'
            });
        }

        // Clear test result after 5 seconds
        setTimeout(() => {
            setTestState(null);
        }, 5000);
    };

    const handleReset = () => {
        const resetConfig = {
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

    // Validation: Check if the selected backend has required fields
    const isValidConfig = () => {
        if (!config.enabled) return true; // If disabled, always valid

        if (selectedBackend === 'glances') {
            return !!backendConfig.url; // Glances requires URL
        } else if (selectedBackend === 'custom') {
            return !!backendConfig.url; // Custom requires URL
        }
        return false;
    };

    const isConfigured = isValidConfig();

    // Notify parent of validation state whenever it changes
    useEffect(() => {
        if (onUpdate) {
            // Pass validation state along with config
            const configWithValidation = {
                ...config,
                _isValid: isConfigured
            };
            onUpdate(configWithValidation);
        }
    }, [isConfigured, config.enabled, selectedBackend, backendConfig.url, backendConfig.password, backendConfig.token]);


    return (
        <div className="glass-subtle shadow-medium rounded-xl overflow-hidden border border-theme card-glow">
            {/* Header - Clickable to expand */}
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
                    {/* Connection status badge (when not expanded) */}
                    {!isExpanded && config.enabled && (
                        <span className={`
                            px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5
                            ${isConfigured
                                ? 'bg-success/10 text-success border border-success/20'
                                : 'bg-warning/10 text-warning border border-warning/20'
                            }
                        `}>
                            <span>{isConfigured ? '🟢' : '🟡'}</span>
                            <span className="hidden sm:inline">{isConfigured ? 'Configured' : 'Setup Required'}</span>
                        </span>
                    )}

                    {/* Toggle Switch */}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggle();
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${config.enabled ? 'bg-success' : 'bg-theme-tertiary'}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>

                    {/* Chevron */}
                    <ChevronDown size={20} className={`text-theme-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Configuration Panel - Animated Collapsible */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden">
                        <div className="px-6 pb-6 border-t border-theme pt-6 space-y-6">
                            {/* Backend Selector */}
                            <BackendSelector
                                selected={selectedBackend}
                                onSelect={handleBackendChange}
                                disabled={false}
                            />

                            {/* Backend-specific Configuration */}
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

                            {/* Widget Sharing */}
                            <SharingDropdown
                                service="systemstatus"
                                sharing={sharing}
                                onChange={onSharingChange}
                                disabled={!isConfigured}
                            />

                            {/* Test Connection & Reset */}
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

                                {/* Reset Integration Button with inline confirmation */}
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
