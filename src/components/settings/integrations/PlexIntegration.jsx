import React, { useState, useEffect, useRef } from 'react';
import { Tv, TestTube, ChevronDown, AlertCircle, CheckCircle2, Loader, ExternalLink, RefreshCw, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logger from '../../../utils/logger';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import SharingDropdown from '../SharingDropdown';
import { useNotifications } from '../../../context/NotificationContext';

/**
 * PlexIntegration - Plex integration configuration with OAuth
 * Allows users to connect their Plex account and select a server
 */
const PlexIntegration = ({ integration, onUpdate, sharing, onSharingChange }) => {
    const { success: showSuccess, error: showError } = useNotifications();
    const pollIntervalRef = useRef(null);

    const [isExpanded, setIsExpanded] = useState(false);
    const [config, setConfig] = useState(integration || {
        enabled: false,
        url: '',
        token: '',
        machineId: '',
        servers: []
    });
    const [testState, setTestState] = useState(null);
    const [authenticating, setAuthenticating] = useState(false);
    const [servers, setServers] = useState(integration?.servers || []);
    const [loadingServers, setLoadingServers] = useState(false);
    const [plexUser, setPlexUser] = useState(null);

    // Load servers from saved config on mount
    useEffect(() => {
        if (integration?.servers?.length > 0) {
            setServers(integration.servers);
        } else if (integration?.token && servers.length === 0) {
            // If we have a token but no saved servers, fetch them
            fetchServers(integration.token);
        }
    }, [integration?.token]);

    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Helper to check if configured
    const isConfigured = config.enabled && config.token && config.url;

    const handleToggle = () => {
        const newConfig = { ...config, enabled: !config.enabled, sharing };
        setConfig(newConfig);
        onUpdate(newConfig);

        if (!config.enabled) {
            setIsExpanded(true);
        }
    };

    const handleConfigChange = (field, value) => {
        const newConfig = { ...config, [field]: value, sharing };
        setConfig(newConfig);
        onUpdate(newConfig);
    };

    const handlePlexLogin = async () => {
        setAuthenticating(true);
        try {
            const pinResponse = await axios.post('/api/plex/auth/pin', {
                forwardUrl: `${window.location.origin}/settings/integrations`
            }, { withCredentials: true });

            const { pinId, authUrl } = pinResponse.data;

            const popup = window.open(
                authUrl,
                'PlexAuth',
                'width=600,height=700,menubar=no,toolbar=no,location=no,status=no'
            );

            pollIntervalRef.current = setInterval(async () => {
                try {
                    const tokenResponse = await axios.get(`/api/plex/auth/token?pinId=${pinId}`, {
                        withCredentials: true
                    });

                    if (tokenResponse.data.authToken) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        popup?.close();

                        const { authToken, user } = tokenResponse.data;
                        setPlexUser(user);

                        // Update config with token
                        const newConfig = { ...config, token: authToken, sharing };
                        setConfig(newConfig);
                        onUpdate(newConfig);

                        // Fetch servers
                        await fetchServers(authToken);

                        showSuccess('Plex Connected', `Connected as ${user.username}`);
                        setAuthenticating(false);
                    }
                } catch (error) {
                    if (error.response?.status === 404) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        showError('Plex Auth Failed', 'PIN expired. Please try again.');
                        setAuthenticating(false);
                    }
                }
            }, 2000);

            setTimeout(() => {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    setAuthenticating(false);
                }
            }, 300000);

        } catch (error) {
            logger.error('[PlexIntegration] OAuth error:', error.message);
            showError('Plex Auth Failed', error.message);
            setAuthenticating(false);
        }
    };

    const fetchServers = async (token) => {
        setLoadingServers(true);
        try {
            const response = await axios.get(`/api/plex/resources?token=${token}`, {
                withCredentials: true
            });
            const fetchedServers = response.data;
            setServers(fetchedServers);

            // Save servers to config for persistence
            let newConfig = { ...config, servers: fetchedServers, sharing };

            // Auto-select first owned server if none selected
            if (!config.machineId && fetchedServers.length > 0) {
                const ownedServer = fetchedServers.find(s => s.owned) || fetchedServers[0];
                newConfig = {
                    ...newConfig,
                    machineId: ownedServer.machineId,
                    url: ownedServer.connections?.find(c => c.local)?.uri || ownedServer.connections?.[0]?.uri || ''
                };
            }

            setConfig(newConfig);
            onUpdate(newConfig);
        } catch (error) {
            logger.error('[PlexIntegration] Failed to fetch servers:', error.message);
        } finally {
            setLoadingServers(false);
        }
    };

    const handleServerChange = (machineId) => {
        const server = servers.find(s => s.machineId === machineId);
        const url = server?.connections?.find(c => c.local)?.uri || server?.connections?.[0]?.uri || '';

        const newConfig = { ...config, machineId, url, sharing };
        setConfig(newConfig);
        onUpdate(newConfig);
    };

    const handleTest = async () => {
        setTestState({ loading: true });

        try {
            const response = await axios.get('/api/plex/test', {
                params: {
                    url: config.url,
                    token: config.token
                },
                withCredentials: true
            });

            if (response.data.success) {
                setTestState({
                    loading: false,
                    success: true,
                    message: `Connected to ${response.data.serverName}`
                });
            } else {
                setTestState({
                    loading: false,
                    success: false,
                    message: response.data.error || 'Connection failed'
                });
            }
        } catch (error) {
            logger.error('[PlexIntegration] Test error:', error);
            setTestState({
                loading: false,
                success: false,
                message: error.response?.data?.error || 'Connection failed'
            });
        }
    };

    return (
        <div className="glass-subtle shadow-medium rounded-xl overflow-hidden border border-theme card-glow">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-6 flex items-center justify-between hover:bg-theme-hover/30 transition-colors"
            >
                <div className="flex items-center gap-4 flex-1">
                    <Tv className="text-theme-secondary" size={20} />
                    <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-semibold text-theme-primary">Plex</h3>
                        <p className="text-sm text-theme-secondary hidden sm:block">Media server integration</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Connection status badge (when not expanded) */}
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

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden">
                        <div className="px-6 pb-6 border-t border-theme pt-6 space-y-4">
                            {/* Plex Login Button */}
                            <div className="p-4 rounded-lg border border-theme bg-theme-tertiary">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {config.token ? (
                                            <>
                                                <CheckCircle2 size={20} className="text-success" />
                                                <div>
                                                    <p className="text-sm font-medium text-theme-primary">Connected to Plex</p>
                                                    <p className="text-xs text-theme-secondary">
                                                        {plexUser?.username || 'Token configured'}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={20} className="text-warning" />
                                                <div>
                                                    <p className="text-sm font-medium text-theme-primary">Not Connected</p>
                                                    <p className="text-xs text-theme-secondary">Login with Plex to auto-configure</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={handlePlexLogin}
                                        disabled={authenticating}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#e5a00d] hover:bg-[#c88a0b] text-black font-medium rounded-lg transition-all disabled:opacity-50"
                                    >
                                        {authenticating ? (
                                            <>
                                                <Loader className="animate-spin" size={16} />
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <ExternalLink size={16} />
                                                {config.token ? 'Reconnect' : 'Login with Plex'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Server Selection */}
                            {config.token && (
                                <div>
                                    <label className="block text-sm font-medium text-theme-primary mb-2">
                                        <Server size={16} className="inline mr-2" />
                                        Select Server
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={config.machineId || ''}
                                            onChange={(e) => handleServerChange(e.target.value)}
                                            className="flex-1 px-4 py-2 bg-theme-primary border border-theme rounded-lg text-theme-primary text-sm focus:border-accent focus:outline-none transition-all"
                                        >
                                            <option value="">Select a server...</option>
                                            {servers.map(server => (
                                                <option key={server.machineId} value={server.machineId}>
                                                    {server.name} {server.owned ? '(Owner)' : '(Shared)'}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => fetchServers(config.token)}
                                            disabled={loadingServers}
                                            className="px-3 py-2 border border-theme rounded-lg text-theme-secondary hover:bg-theme-hover transition-all"
                                            title="Refresh servers"
                                        >
                                            <RefreshCw size={18} className={loadingServers ? 'animate-spin' : ''} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Manual URL input (advanced) */}
                            <Input
                                label="Plex Server URL"
                                type="text"
                                value={config.url}
                                onChange={(e) => handleConfigChange('url', e.target.value)}
                                placeholder="http://192.168.1.x:32400"
                                helperText="Auto-filled from server selection, or enter manually"
                            />

                            {/* Token input (hidden, advanced) */}
                            <div>
                                <label className="block text-sm font-medium text-theme-primary mb-2">
                                    Plex Token
                                </label>
                                <input
                                    type="password"
                                    value={config.token}
                                    onChange={(e) => handleConfigChange('token', e.target.value)}
                                    placeholder="Auto-filled via Plex login"
                                    className="w-full px-4 py-2 bg-theme-primary border border-theme rounded-lg text-theme-primary text-sm focus:border-accent focus:outline-none transition-all"
                                />
                                <p className="text-xs text-theme-tertiary mt-1">
                                    Auto-filled when you login with Plex, or enter manually
                                </p>
                            </div>

                            {/* Widget Sharing */}
                            <SharingDropdown
                                service="plex"
                                sharing={sharing}
                                onChange={onSharingChange}
                                disabled={!isConfigured}
                            />

                            {/* Test Connection */}
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleTest}
                                    disabled={!config.url || !config.token || testState?.loading}
                                    icon={testState?.loading ? Loader : (testState?.success ? CheckCircle2 : testState ? AlertCircle : TestTube)}
                                    variant={testState && !testState.loading ? (testState.success ? 'primary' : 'danger') : 'secondary'}
                                    className={testState && !testState.loading && testState.success ? 'bg-success border-success' : ''}
                                >
                                    {testState?.loading ? 'Testing...' :
                                        testState?.success ? <><span className="hidden sm:inline">Connected</span></> :
                                            testState ? <><span className="hidden sm:inline">Failed</span></> :
                                                'Test'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PlexIntegration;
