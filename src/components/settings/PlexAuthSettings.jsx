/**
 * PlexAuthSettings Component
 * Plex SSO configuration for AuthSettings
 * 
 * Features:
 * - Plex OAuth login button for admin setup
 * - Machine (server) selector
 * - Auto-create users toggle
 * - Default group selector
 */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Tv, Save, Loader, RefreshCw, Users, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Input } from '../common/Input';
import { useNotifications } from '../../context/NotificationContext';
import logger from '../../utils/logger';

const PlexAuthSettings = ({ onSaveNeeded, onSave }) => {
    const { success: showSuccess, error: showError } = useNotifications();
    const pollIntervalRef = useRef(null);

    // Config state
    const [config, setConfig] = useState({
        enabled: false,
        adminEmail: '',
        machineId: '',
        autoCreateUsers: false,
        defaultGroup: 'user',
        hasToken: false,
        linkedUserId: ''
    });

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [authenticating, setAuthenticating] = useState(false);
    const [servers, setServers] = useState([]);
    const [loadingServers, setLoadingServers] = useState(false);
    const [groups, setGroups] = useState([]);

    // State for admin user linking
    const [users, setUsers] = useState([]);

    // Change tracking
    const [originalConfig, setOriginalConfig] = useState(null);

    useEffect(() => {
        fetchConfig();
        fetchGroups();
        fetchUsers();
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Fetch servers when config is loaded and has token
    useEffect(() => {
        if (config.hasToken && servers.length === 0) {
            fetchAdminServers();
        }
    }, [config.hasToken]);

    const fetchConfig = async () => {
        try {
            const response = await axios.get('/api/plex/sso/config', { withCredentials: true });
            setConfig(response.data);
            setOriginalConfig(response.data);
        } catch (error) {
            logger.error('[PlexAuth] Failed to fetch config:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = async () => {
        try {
            const response = await axios.get('/api/config/system', { withCredentials: true });
            if (response.data.groups) {
                // Groups can be array of {id, name, ...} or object {groupId: {...}}
                const groupsData = response.data.groups;
                if (Array.isArray(groupsData)) {
                    // Array format: extract IDs
                    setGroups(groupsData.map(g => g.id));
                } else {
                    // Object format: use keys
                    setGroups(Object.keys(groupsData));
                }
            }
        } catch (error) {
            logger.error('[PlexAuth] Failed to fetch groups:', error.message);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/admin/users', { withCredentials: true });
            setUsers(response.data.users || []);
        } catch (error) {
            logger.error('[PlexAuth] Failed to fetch users:', error.message);
        }
    };

    const fetchAdminServers = async () => {
        setLoadingServers(true);
        try {
            const response = await axios.get('/api/plex/admin-resources', { withCredentials: true });
            setServers(response.data);
        } catch (error) {
            logger.debug('[PlexAuth] Failed to fetch admin servers:', error.message);
        } finally {
            setLoadingServers(false);
        }
    };

    const handlePlexLogin = async () => {
        setAuthenticating(true);
        try {
            // Generate PIN
            const pinResponse = await axios.post('/api/plex/auth/pin', {
                forwardUrl: `${window.location.origin}/settings/auth`
            }, { withCredentials: true });

            const { pinId, authUrl } = pinResponse.data;

            // Open Plex auth in popup
            const popup = window.open(
                authUrl,
                'PlexAuth',
                'width=600,height=700,menubar=no,toolbar=no,location=no,status=no'
            );

            // Poll for token
            pollIntervalRef.current = setInterval(async () => {
                try {
                    const tokenResponse = await axios.get(`/api/plex/auth/token?pinId=${pinId}`, {
                        withCredentials: true
                    });

                    if (tokenResponse.data.authToken) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        popup?.close();

                        // Save token to config
                        const { authToken, user } = tokenResponse.data;

                        await axios.post('/api/plex/sso/config', {
                            adminToken: authToken,
                            adminEmail: user.email,
                            adminPlexId: user.id
                        }, { withCredentials: true });

                        // Fetch servers
                        await fetchServers(authToken);

                        setConfig(prev => ({
                            ...prev,
                            hasToken: true,
                            adminEmail: user.email
                        }));

                        showSuccess('Plex Connected', `Connected as ${user.username}`);
                        setAuthenticating(false);
                    }
                } catch (error) {
                    if (error.response?.status === 404) {
                        // PIN expired
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        showError('Plex Auth Failed', 'PIN expired. Please try again.');
                        setAuthenticating(false);
                    }
                }
            }, 2000);

            // Stop polling after 5 minutes
            setTimeout(() => {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                    setAuthenticating(false);
                }
            }, 300000);

        } catch (error) {
            logger.error('[PlexAuth] OAuth error:', error.message);
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
            setServers(response.data);
        } catch (error) {
            logger.error('[PlexAuth] Failed to fetch servers:', error.message);
        } finally {
            setLoadingServers(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post('/api/plex/sso/config', {
                enabled: config.enabled,
                machineId: config.machineId,
                autoCreateUsers: config.autoCreateUsers,
                defaultGroup: config.defaultGroup,
                linkedUserId: config.linkedUserId
            }, { withCredentials: true });

            showSuccess('Settings Saved', 'Plex SSO configuration updated');
            setOriginalConfig(config); // Reset change tracking
            if (onSaveNeeded) onSaveNeeded(false);
        } catch (error) {
            logger.error('[PlexAuth] Failed to save:', error.message);
            showError('Save Failed', error.message);
        } finally {
            setSaving(false);
        }
    };

    // Expose save function to parent
    useEffect(() => {
        if (onSave) {
            onSave.current = handleSave;
        }
    }, [config]);

    // Track changes and notify parent
    useEffect(() => {
        if (!originalConfig || !onSaveNeeded) return;

        const hasChanges =
            config.enabled !== originalConfig.enabled ||
            config.machineId !== originalConfig.machineId ||
            config.autoCreateUsers !== originalConfig.autoCreateUsers ||
            config.defaultGroup !== originalConfig.defaultGroup ||
            config.linkedUserId !== originalConfig.linkedUserId;

        onSaveNeeded(hasChanges);
    }, [config, originalConfig]);

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        if (onSaveNeeded) onSaveNeeded(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader className="animate-spin text-accent" size={32} />
            </div>
        );
    }

    return (
        <div className="glass-subtle rounded-xl shadow-medium border border-theme p-6 space-y-6">
            {/* Header with Enable Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
                        <Tv size={20} className="text-accent" />
                        Plex SSO
                    </h3>
                    <p className="text-sm text-theme-secondary mt-1">
                        Allow users to sign in with their Plex account
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => handleChange('enabled', e.target.checked)}
                        disabled={!config.hasToken}
                        className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent ${!config.hasToken ? 'opacity-50' : ''}`}></div>
                </label>
            </div>

            {/* Plex Connection Status */}
            <div className="p-4 rounded-lg border border-theme bg-theme-tertiary">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {config.hasToken ? (
                            <>
                                <CheckCircle size={20} className="text-success flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-theme-primary">Connected to Plex</p>
                                    <p className="text-xs text-theme-secondary break-all">{config.adminEmail}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={20} className="text-warning flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-theme-primary">Not Connected</p>
                                    <p className="text-xs text-theme-secondary">Login with Plex to configure SSO</p>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={handlePlexLogin}
                        disabled={authenticating}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-[#e5a00d] hover:bg-[#c88a0b] text-black font-medium rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
                    >
                        {authenticating ? (
                            <>
                                <Loader className="animate-spin" size={16} />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <ExternalLink size={16} />
                                {config.hasToken ? 'Reconnect' : 'Login with Plex'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Server Selection */}
            {config.hasToken && (
                <div className="space-y-4">
                    {/* Link to Framerr User */}
                    <div>
                        <label className="block text-sm font-medium text-theme-primary mb-2">
                            Link Plex Account to User
                        </label>
                        <select
                            value={config.linkedUserId || ''}
                            onChange={(e) => handleChange('linkedUserId', e.target.value)}
                            className="w-full px-4 py-2 bg-theme-primary border border-theme rounded-lg text-theme-primary text-sm focus:border-accent focus:outline-none transition-all"
                        >
                            <option value="">No user linked (optional)</option>
                            {users.filter(u => u.group === 'admin').map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.displayName || user.username} (Admin)
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-theme-tertiary mt-1">
                            Link this Plex account to a specific Framerr admin user
                        </p>
                    </div>

                    {/* Server Selector */}
                    <div>
                        <label className="block text-sm font-medium text-theme-primary mb-2">
                            Plex Server
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={config.machineId || ''}
                                onChange={(e) => handleChange('machineId', e.target.value)}
                                className="flex-1 px-4 py-2 bg-theme-primary border border-theme rounded-lg text-theme-primary text-sm focus:border-accent focus:outline-none transition-all"
                            >
                                <option value="">Select a server...</option>
                                {servers.map(server => (
                                    <option key={server.machineId} value={server.machineId}>
                                        {server.name} {server.owned ? '(Owner)' : ''}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={fetchAdminServers}
                                disabled={loadingServers}
                                className="px-3 py-2 border border-theme rounded-lg text-theme-secondary hover:bg-theme-hover transition-all"
                                title="Refresh servers"
                            >
                                <RefreshCw size={18} className={loadingServers ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <p className="text-xs text-theme-tertiary mt-1">
                            Only users shared with this server can log in via Plex SSO
                        </p>
                    </div>

                    {/* Auto-create Users */}
                    <div className="flex items-center justify-between pt-4 border-t border-theme">
                        <div>
                            <label className="text-sm font-medium text-theme-secondary">
                                Auto-create Users
                            </label>
                            <p className="text-xs text-theme-tertiary mt-1">
                                Automatically create Framerr accounts for new Plex users
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.autoCreateUsers}
                                onChange={(e) => handleChange('autoCreateUsers', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
                        </label>
                    </div>

                    {/* Default Group */}
                    {config.autoCreateUsers && (
                        <div>
                            <label className="block text-sm font-medium text-theme-primary mb-2">
                                Default Group for New Users
                            </label>
                            <select
                                value={config.defaultGroup}
                                onChange={(e) => handleChange('defaultGroup', e.target.value)}
                                className="w-full px-4 py-2 bg-theme-primary border border-theme rounded-lg text-theme-primary text-sm focus:border-accent focus:outline-none transition-all"
                            >
                                {groups.map(group => (
                                    <option key={group} value={group}>
                                        {group.charAt(0).toUpperCase() + group.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PlexAuthSettings;
