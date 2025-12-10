import React, { useState, useEffect } from 'react';
import { Server, TestTube, ChevronDown, AlertCircle, CheckCircle2, Loader, Save } from 'lucide-react';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import SystemHealthIntegration from './integrations/SystemHealthIntegration';

const IntegrationsSettings = () => {
    const [integrations, setIntegrations] = useState({
        systemstatus: { enabled: false, url: '', token: '' },
        plex: { enabled: false, url: '', token: '' },
        sonarr: { enabled: false, url: '', apiKey: '' },
        radarr: { enabled: false, url: '', apiKey: '' },
        qbittorrent: { enabled: false, url: '', username: '', password: '' },
        overseerr: { enabled: false, url: '', apiKey: '' }
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});
    const [testStates, setTestStates] = useState({});

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const fetchIntegrations = async () => {
        try {
            const response = await fetch('/api/integrations', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                // Merge server data with defaults to include new integrations
                setIntegrations(prev => ({
                    ...prev,
                    ...(data.integrations || {})
                }));
            }
        } catch (error) {
            logger.error('Error fetching integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (service) => {
        setIntegrations(prev => ({
            ...prev,
            [service]: {
                ...prev[service],
                enabled: !prev[service].enabled
            }
        }));

        // Auto-expand when enabling
        if (!integrations[service].enabled) {
            setExpandedSections(prev => ({ ...prev, [service]: true }));
        }
    };

    const handleFieldChange = (service, field, value) => {
        setIntegrations(prev => ({
            ...prev,
            [service]: {
                ...prev[service],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/integrations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ integrations })
            });

            if (response.ok) {
                alert('Integration settings saved successfully');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save integrations');
            }
        } catch (error) {
            logger.error('Error saving integrations:', error);
            alert('Failed to save integrations');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (service) => {
        setTestStates(prev => ({ ...prev, [service]: { loading: true } }));
        try {
            const response = await fetch('/api/integrations/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    service,
                    config: integrations[service]
                })
            });

            const result = await response.json();
            setTestStates(prev => ({
                ...prev,
                [service]: {
                    loading: false,
                    success: result.success,
                    message: result.success
                        ? `✓ ${result.message}${result.version ? ` (v${result.version})` : ''}`
                        : `✗ ${result.error}`
                }
            }));

            // Clear test result after 5 seconds
            setTimeout(() => {
                setTestStates(prev => ({ ...prev, [service]: null }));
            }, 5000);
        } catch (error) {
            setTestStates(prev => ({
                ...prev,
                [service]: {
                    loading: false,
                    success: false,
                    message: `✗ ${error.message || 'Connection failed'}`
                }
            }));
        }
    };

    const toggleSection = (service) => {
        setExpandedSections(prev => ({ ...prev, [service]: !prev[service] }));
    };

    const integrationConfigs = [
        {
            id: 'plex',
            name: 'Plex',
            description: 'Media server integration',
            fields: [
                { key: 'url', label: 'Plex URL', placeholder: 'http://192.168.1.5:32400', type: 'text' },
                { key: 'token', label: 'X-Plex-Token', placeholder: 'Your Plex token', type: 'password' }
            ]
        },
        {
            id: 'sonarr',
            name: 'Sonarr',
            description: 'TV show management',
            fields: [
                { key: 'url', label: 'Sonarr URL', placeholder: 'http://192.168.1.5:8989', type: 'text' },
                { key: 'apiKey', label: 'API Key', placeholder: 'Your Sonarr API key', type: 'password' }
            ]
        },
        {
            id: 'radarr',
            name: 'Radarr',
            description: 'Movie management',
            fields: [
                { key: 'url', label: 'Radarr URL', placeholder: 'http://192.168.1.5:7878', type: 'text' },
                { key: 'apiKey', label: 'API Key', placeholder: 'Your Radarr API key', type: 'password' }
            ]
        },
        {
            id: 'qbittorrent',
            name: 'qBittorrent',
            description: 'Torrent client',
            fields: [
                { key: 'url', label: 'qBittorrent URL', placeholder: 'http://192.168.1.5:8080', type: 'text' },
                { key: 'username', label: 'Username', placeholder: 'admin', type: 'text' },
                { key: 'password', label: 'Password', placeholder: 'Optional', type: 'password' }
            ]
        },
        {
            id: 'overseerr',
            name: 'Overseerr',
            description: 'Request management',
            fields: [
                { key: 'url', label: 'Overseerr URL', placeholder: 'http://192.168.1.5:5055', type: 'text' },
                { key: 'apiKey', label: 'API Key', placeholder: 'Your Overseerr API key', type: 'password' }
            ]
        }
    ];

    if (loading) {
        return <div className="text-center py-16 text-theme-secondary">Loading integrations...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-theme-primary">
                    Service Integrations
                </h2>
                <p className="text-theme-secondary text-sm">
                    Configure connections to your homelab services
                </p>
            </div>

            {/* Docker Networking Help Banner */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                    <AlertCircle className="text-info flex-shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-theme-primary">
                        <p className="font-medium mb-1">Docker Networking Tip</p>
                        <p className="text-theme-secondary">
                            If running in Docker, use container names or host network IPs instead of localhost.
                            Example: <code className="bg-theme-tertiary px-2 py-0.5 rounded text-info">http://plex:32400</code>
                        </p>
                    </div>
                </div>
            </div>

            {/* System Health Integration - Special Multi-Backend Component */}
            <SystemHealthIntegration
                integration={integrations.systemstatus}
                onUpdate={(updated) => {
                    setIntegrations(prev => ({
                        ...prev,
                        systemstatus: updated
                    }));
                }}
            />

            {/* Other Integrations List */}
            <div className="space-y-4 mt-4">
                {integrationConfigs.map(config => {
                    const isEnabled = integrations[config.id]?.enabled;
                    const isExpanded = expandedSections[config.id];
                    const testState = testStates[config.id];

                    return (
                        <div key={config.id} className="glass-subtle shadow-medium rounded-xl overflow-hidden border border-theme card-glow">
                            {/* Header */}
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <Server className="text-theme-secondary" size={20} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-theme-primary">{config.name}</h3>
                                        <p className="text-sm text-theme-secondary">{config.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Toggle Switch */}
                                    <button
                                        onClick={() => handleToggle(config.id)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? 'bg-success' : 'bg-theme-tertiary'
                                            }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                    </button>

                                    {/* Expand Button */}
                                    {isEnabled && (
                                        <button
                                            onClick={() => toggleSection(config.id)}
                                            className="text-theme-secondary hover:text-theme-primary transition-colors"
                                        >
                                            <ChevronDown size={20} className={`transition-transform ${isExpanded ? 'rotate-180' : ''
                                                }`} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Configuration Form - Collapsible */}
                            {isEnabled && isExpanded && (
                                <div className="px-6 pb-6 border-t border-theme pt-6">
                                    <div className="space-y-4">
                                        {config.fields.map(field => (
                                            <Input
                                                key={field.key}
                                                label={field.label}
                                                type={field.type}
                                                value={integrations[config.id][field.key] || ''}
                                                onChange={(e) => handleFieldChange(config.id, field.key, e.target.value)}
                                                placeholder={field.placeholder}
                                            />
                                        ))}

                                        {/* Test Connection Button */}
                                        <div className="flex items-center gap-3 pt-2">
                                            <Button
                                                onClick={() => handleTest(config.id)}
                                                disabled={testState?.loading}
                                                variant="secondary"
                                                size="sm"
                                                icon={testState?.loading ? Loader : TestTube}
                                            >
                                                {testState?.loading ? 'Testing...' : 'Test Connection'}
                                            </Button>

                                            {/* Test Result */}
                                            {testState && !testState.loading && (
                                                <div className={`flex items-center gap-2 text-sm ${testState.success ? 'text-success' : 'text-error'
                                                    }`}>
                                                    {testState.success ? (
                                                        <CheckCircle2 size={16} />
                                                    ) : (
                                                        <AlertCircle size={16} />
                                                    )}
                                                    <span>{testState.message}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Save Button */}
            <div className="mt-6">
                {/* Show validation error if System Health is invalid */}
                {integrations.systemstatus?.enabled && integrations.systemstatus?._isValid === false && (
                    <div className="mb-3 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                        ⚠️ System Health requires a URL for the selected backend before saving.
                    </div>
                )}

                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={saving || (integrations.systemstatus?.enabled && integrations.systemstatus?._isValid === false)}
                        icon={saving ? Loader : Save}
                    >
                        {saving ? 'Saving...' : 'Save All Integrations'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default IntegrationsSettings;
