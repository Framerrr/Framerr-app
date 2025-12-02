import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Save, RotateCcw } from 'lucide-react';
import logger from '../../utils/logger';

const AuthSettings = () => {
    // Auth proxy state
    const [proxyEnabled, setProxyEnabled] = useState(false);
    const [headerName, setHeaderName] = useState('X-authentik-username');
    const [emailHeaderName, setEmailHeaderName] = useState('X-authentik-email');
    const [whitelist, setWhitelist] = useState('172.19.0.0/16');
    const [overrideLogout, setOverrideLogout] = useState(false);
    const [logoutUrl, setLogoutUrl] = useState('/outpost.goauthentik.io/sign_out');

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalConfig, setOriginalConfig] = useState(null);

    // Load config on mount
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const response = await axios.get('/api/system/config');
            const proxy = response.data.auth?.proxy || {};

            setProxyEnabled(proxy.enabled || false);
            setHeaderName(proxy.headerName || 'X-authentik-username');
            setEmailHeaderName(proxy.emailHeaderName || 'X-authentik-email');
            setWhitelist(Array.isArray(proxy.whitelist) ? proxy.whitelist.join(', ') : '172.19.0.0/16');
            setOverrideLogout(proxy.overrideLogout || false);
            setLogoutUrl(proxy.logoutUrl || '/outpost.goauthentik.io/sign_out');

            // Store original for reset
            setOriginalConfig({
                proxyEnabled: proxy.enabled || false,
                headerName: proxy.headerName || 'X-authentik-username',
                emailHeaderName: proxy.emailHeaderName || 'X-authentik-email',
                whitelist: Array.isArray(proxy.whitelist) ? proxy.whitelist.join(', ') : '172.19.0.0/16',
                overrideLogout: proxy.overrideLogout || false,
                logoutUrl: proxy.logoutUrl || '/outpost.goauthentik.io/sign_out'
            });
        } catch (error) {
            logger.error('Failed to load auth config', { error: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Track changes
    useEffect(() => {
        if (!originalConfig) return;

        const changed =
            proxyEnabled !== originalConfig.proxyEnabled ||
            headerName !== originalConfig.headerName ||
            emailHeaderName !== originalConfig.emailHeaderName ||
            whitelist !== originalConfig.whitelist ||
            overrideLogout !== originalConfig.overrideLogout ||
            logoutUrl !== originalConfig.logoutUrl;

        setHasChanges(changed);
    }, [proxyEnabled, headerName, emailHeaderName, whitelist, overrideLogout, logoutUrl, originalConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Parse whitelist into array
            const whitelistArray = whitelist
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0);

            await axios.put('/api/system/config', {
                auth: {
                    proxy: {
                        enabled: proxyEnabled,
                        headerName,
                        emailHeaderName,
                        whitelist: whitelistArray,
                        overrideLogout,
                        logoutUrl
                    }
                }
            });

            // Reload to get saved state
            await loadConfig();
            setHasChanges(false);
        } catch (error) {
            logger.error('Failed to save auth config', { error: error.message });
            alert('Failed to save authentication settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (!originalConfig) return;

        setProxyEnabled(originalConfig.proxyEnabled);
        setHeaderName(originalConfig.headerName);
        setEmailHeaderName(originalConfig.emailHeaderName);
        setWhitelist(originalConfig.whitelist);
        setOverrideLogout(originalConfig.overrideLogout);
        setLogoutUrl(originalConfig.logoutUrl);
        setHasChanges(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading authentication settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold mb-2 text-white">
                    Authentication Settings
                </h2>
                <p className="text-sm text-slate-400">
                    Configure reverse proxy authentication and security
                </p>
            </div>

            {/* Proxy Authentication Section */}
            <div className="glass-subtle rounded-xl shadow-deep border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield size={20} />
                    Proxy Authentication
                </h3>

                <div className="space-y-6">
                    {/* Auth Proxy Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-slate-300">
                                Auth Proxy
                            </label>
                            <p className="text-xs text-slate-500 mt-1">
                                Enable authentication via reverse proxy headers
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={proxyEnabled}
                                onChange={(e) => setProxyEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                    </div>

                    {/* Header Fields - Two Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Auth Proxy Header Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Auth Proxy Header Name
                            </label>
                            <input
                                type="text"
                                value={headerName}
                                onChange={(e) => setHeaderName(e.target.value)}
                                disabled={!proxyEnabled}
                                placeholder="X-authentik-username"
                                className={`input-glow w-full px-4 py-3 bg-slate-900 border rounded-lg text-white placeholder-slate-500 transition-all ${proxyEnabled
                                    ? 'border-slate-700 focus:outline-none focus:border-accent'
                                    : 'border-slate-800 opacity-50 cursor-not-allowed'
                                    }`}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                HTTP header containing the username
                            </p>
                        </div>

                        {/* Auth Proxy Header Name for Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Auth Proxy Header Name for Email
                            </label>
                            <input
                                type="text"
                                value={emailHeaderName}
                                onChange={(e) => setEmailHeaderName(e.target.value)}
                                disabled={!proxyEnabled}
                                placeholder="X-authentik-email"
                                className={`input-glow w-full px-4 py-3 bg-slate-900 border rounded-lg text-white placeholder-slate-500 transition-all ${proxyEnabled
                                    ? 'border-slate-700 focus:outline-none focus:border-accent'
                                    : 'border-slate-800 opacity-50 cursor-not-allowed'
                                    }`}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                HTTP header containing the user email
                            </p>
                        </div>
                    </div>

                    {/* Auth Proxy Whitelist */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Auth Proxy Whitelist
                        </label>
                        <input
                            type="text"
                            value={whitelist}
                            onChange={(e) => setWhitelist(e.target.value)}
                            disabled={!proxyEnabled}
                            placeholder="172.19.0.0/16"
                            className={`input-glow w-full px-4 py-3 bg-slate-900 border rounded-lg text-white placeholder-slate-500 transition-all ${proxyEnabled
                                ? 'border-slate-700 focus:outline-none focus:border-accent'
                                : 'border-slate-800 opacity-50 cursor-not-allowed'
                                }`}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Comma-separated IPs or CIDR ranges trusted to send proxy headers (e.g., 172.19.0.0/16, 10.0.0.1)
                        </p>
                    </div>

                    {/* Override Logout Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                        <div>
                            <label className="text-sm font-medium text-slate-300">
                                Override Logout
                            </label>
                            <p className="text-xs text-slate-500 mt-1">
                                Redirect to a custom logout URL instead of local logout
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={overrideLogout}
                                onChange={(e) => setOverrideLogout(e.target.checked)}
                                disabled={!proxyEnabled}
                                className="sr-only peer"
                            />
                            <div className={`w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent ${!proxyEnabled ? 'opacity-50 cursor-not-allowed' : ''
                                }`}></div>
                        </label>
                    </div>

                    {/* Logout URL - Only shown if Override Logout is enabled */}
                    {overrideLogout && proxyEnabled && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Logout URL
                            </label>
                            <input
                                type="text"
                                value={logoutUrl}
                                onChange={(e) => setLogoutUrl(e.target.value)}
                                placeholder="/outpost.goauthentik.io/sign_out"
                                className="input-glow w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-all"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                URL to redirect to when user logs out
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="button-elevated px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-all font-medium"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={!hasChanges}
                        className="button-elevated px-6 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-all font-medium"
                        title="Reset to saved values"
                    >
                        <RotateCcw size={18} />
                        <span className="hidden sm:inline">Reset</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthSettings;
