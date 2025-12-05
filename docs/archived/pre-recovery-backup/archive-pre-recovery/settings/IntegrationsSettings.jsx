import React, { useState, useEffect } from 'react';
import { Server, TestTube, ChevronDown, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import logger from '../../utils/logger';

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
            id: 'systemstatus',
            name: 'System Health',
            description: 'Server health monitoring (CPU, Memory, Temperature)',
            fields: [
                { key: 'url', label: 'Monitoring Service URL', placeholder: 'http://192.168.1.5:3001', type: 'text' },
                { key: 'token', label: 'API Token', placeholder: 'Optional authentication token', type: 'password' }
            ]
        },
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
        return <div className="text-center py-16 text-slate-400">Loading integrations...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">
                    Service Integrations
                </h2>
                <p className="text-slate-400 text-sm">
                    Configure connections to your homelab services
                </p>
            </div>

            {/* Docker Networking Help Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                    <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-blue-100">
                        <p className="font-medium mb-1">Docker Networking Tip</p>
                        <p className="text-blue-200/80">
                            If running in Docker, use container names or host network IPs instead of localhost.
                            Example: <code className="bg-slate-900/50 px-2 py-0.5 rounded text-blue-300">http://plex:32400</code>
                        </p>
                    </div>
                </div>
            </div>

            {/* Integrations List */}
            <div className="space-y-4">
                {integrationConfigs.map(config => {
                    const isEnabled = integrations[config.id]?.enabled;
                    const isExpanded = expandedSections[config.id];
                    const testState = testStates[config.id];

                    return (
                        <div key={config.id} className="glass-subtle shadow-medium rounded-xl overflow-hidden border border-slate-700/50 card-glow">
                            {/* Header */}
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <Server className="text-slate-400" size={20} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white">{config.name}</h3>
                                        <p className="text-sm text-slate-400">{config.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Toggle Switch */}
                                    <button
                                        onClick={() => handleToggle(config.id)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-slate-600'
                                            }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                    </button>

                                    {/* Expand Button */}
                                    {isEnabled && (
                                        <button
                                            onClick={() => toggleSection(config.id)}
                                            className="text-slate-400 hover:text-white transition-colors"
                                        >
                                            <ChevronDown size={20} className={`transition-transform ${isExpanded ? 'rotate-180' : ''
                                                }`} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Configuration Form - Collapsible */}
                            {isEnabled && isExpanded && (
                                <div className="px-6 pb-6 border-t border-slate-700/50 pt-6">
                                    <div className="space-y-4">
                                        {config.fields.map(field => (
                                            <div key={field.key}>
                                                <label className="block mb-2 font-medium text-slate-300 text-sm">
                                                    {field.label}
                                                </label>
                                                <input
                                                    type={field.type}
                                                    value={integrations[config.id][field.key] || ''}
                                                    onChange={(e) => handleFieldChange(config.id, field.key, e.target.value)}
                                                    placeholder={field.placeholder}
                                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
                                                />
                                            </div>
                                        ))}

                                        {/* Test Connection Button */}
                                        <div className="flex items-center gap-3 pt-2">
                                            <button
                                                onClick={() => handleTest(config.id)}
                                                disabled={testState?.loading}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                                            >
                                                {testState?.loading ? (
                                                    <>
                                                        <Loader size={18} className="animate-spin" />
                                                        <span>Testing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TestTube size={18} />
                                                        <span>Test Connection</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Test Result */}
                                            {testState && !testState.loading && (
                                                <div className={`flex items-center gap-2 text-sm ${testState.success ? 'text-green-400' : 'text-red-400'
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
            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <Loader size={18} className="animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <span>Save All Integrations</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default IntegrationsSettings;
