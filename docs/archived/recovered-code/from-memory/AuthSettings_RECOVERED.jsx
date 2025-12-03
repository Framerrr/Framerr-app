import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Save, Loader } from 'lucide-react';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

const AuthSettings = () => {
    // Auth proxy state
    const [proxyEnabled, setProxyEnabled] = useState(false);
    const [headerName, setHeaderName] = useState('');
    const [emailHeaderName, setEmailHeaderName] = useState('');
    const [whitelist, setWhitelist] = useState('');
    const [overrideLogout, setOverrideLogout] = useState(false);
    const [logoutUrl, setLogoutUrl] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalSettings, setOriginalSettings] = useState({});

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        const current = {
            proxyEnabled,
            headerName,
            emailHeaderName,
            whitelist,
            overrideLogout,
            logoutUrl
        };
        setHasChanges(JSON.stringify(current) !== JSON.stringify(originalSettings));
    }, [proxyEnabled, headerName, emailHeaderName, whitelist, overrideLogout, logoutUrl, originalSettings]);

    const fetchSettings = async () => {
        try {
            const response = await axios.get('/api/config/auth');
            const { authProxy } = response.data;

            setProxyEnabled(authProxy?.enabled || false);
            setHeaderName(authProxy?.headerName || '');
            setEmailHeaderName(authProxy?.emailHeaderName || '');
            setWhitelist(authProxy?.whitelist || '');
            setOverrideLogout(authProxy?.overrideLogout || false);
            setLogoutUrl(authProxy?.logoutUrl || '');

            setOriginalSettings({
                proxyEnabled: authProxy?.enabled || false,
                headerName: authProxy?.headerName || '',
                emailHeaderName: authProxy?.emailHeaderName || '',
                whitelist: authProxy?.whitelist || '',
                overrideLogout: authProxy?.overrideLogout || false,
                logoutUrl: authProxy?.logoutUrl || ''
            });
        } catch (error) {
            logger.error('Failed to fetch auth settings', { error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/config/auth', {
                authProxy: {
                    enabled: proxyEnabled,
                    headerName,
                    emailHeaderName,
                    whitelist,
                    overrideLogout,
                    logoutUrl
                }
            });

            setOriginalSettings({
                proxyEnabled,
                headerName,
                emailHeaderName,
                whitelist,
                overrideLogout,
                logoutUrl
            });

            logger.info('Auth settings saved successfully');
        } catch (error) {
            logger.error('Failed to save auth settings', { error: error.message });
            alert('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <Loader className="animate-spin text-accent mx-auto mb-4" size={48} />
                    <p className="text-theme-secondary">Loading authentication settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold mb-2 text-theme-primary">
                    Authentication Settings
                </h2>
                <p className="text-sm text-theme-secondary">
                    Configure reverse proxy authentication and security
                </p>
            </div>

            {/* Proxy Authentication Section */}
            <div className="glass-subtle rounded-xl shadow-deep border border-theme p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                    <Shield size={20} />
                    Proxy Authentication
                </h3>

                <div className="space-y-6">
                    {/* Auth Proxy Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-theme-secondary">
                                Auth Proxy
                            </label>
                            <p className="text-xs text-theme-tertiary mt-1">
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
                            <div className="w-11 h-6 bg-theme-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-theme-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                    </div>

                    {/* Header Fields - Two Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Auth Proxy Header Name */}
                        <Input
                            label="Auth Proxy Header Name"
                            type="text"
                            value={headerName}
                            onChange={(e) => setHeaderName(e.target.value)}
                            disabled={!proxyEnabled}
                            placeholder="X-authentik-username"
                            helperText="HTTP header containing the username"
                        />

                        {/* Auth Proxy Header Name for Email */}
                        <Input
                            label="Auth Proxy Header Name for Email"
                            type="text"
                            value={emailHeaderName}
                            onChange={(e) => setEmailHeaderName(e.target.value)}
                            disabled={!proxyEnabled}
                            placeholder="X-authentik-email"
                            helperText="HTTP header containing the user email"
                        />
                    </div>

                    {/* Auth Proxy Whitelist */}
                    <Input
                        label="Auth Proxy Whitelist"
                        type="text"
                        value={whitelist}
                        onChange={(e) => setWhitelist(e.target.value)}
                        disabled={!proxyEnabled}
                        placeholder="172.19.0.0/16"
                        helperText="Comma-separated IPs or CIDR ranges trusted to send proxy headers (e.g., 172.19.0.0/16, 10.0.0.1)"
                    />

                    {/* Override Logout Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-theme">
                        <div>
                            <label className="text-sm font-medium text-theme-secondary">
                                Override Logout
                            </label>
                            <p className="text-xs text-theme-tertiary mt-1">
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
                            <div className={`w-11 h-6 bg-theme-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-theme-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent ${!proxyEnabled ? 'opacity-50 cursor-not-allowed' : ''
                                }`}></div>
                        </label>
                    </div>

                    {/* Logout URL - Only shown if Override Logout is enabled */}
                    {overrideLogout && proxyEnabled && (
                        <Input
                            label="Logout URL"
                            type="text"
                            value={logoutUrl}
                            onChange={(e) => setLogoutUrl(e.target.value)}
                            placeholder="/outpost.goauthentik.io/sign_out"
                            helperText="URL to redirect to when user logs out"
                        />
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        icon={saving ? Loader : Save}
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AuthSettings;
