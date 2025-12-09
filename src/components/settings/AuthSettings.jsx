import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Save, Loader, Globe, Lock, ExternalLink, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

const AuthSettings = () => {
    // Subtab state
    const [activeTab, setActiveTab] = useState('proxy'); // 'proxy' or 'iframe'

    // Auth proxy state
    const [proxyEnabled, setProxyEnabled] = useState(false);
    const [headerName, setHeaderName] = useState('');
    const [emailHeaderName, setEmailHeaderName] = useState('');
    const [whitelist, setWhitelist] = useState('');
    const [overrideLogout, setOverrideLogout] = useState(false);
    const [logoutUrl, setLogoutUrl] = useState('');

    // iFrame auth state
    const [iframeEnabled, setIframeEnabled] = useState(false);
    const [oauthEndpoint, setOauthEndpoint] = useState('');
    const [clientId, setClientId] = useState('');
    const [redirectUri, setRedirectUri] = useState('');
    const [scopes, setScopes] = useState('openid profile email');

    // iFrame auth detection state
    const [authDetectionSensitivity, setAuthDetectionSensitivity] = useState('balanced');
    const [customAuthPatterns, setCustomAuthPatterns] = useState([]);
    const [newAuthPattern, setNewAuthPattern] = useState('');

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalSettings, setOriginalSettings] = useState({});
    const [showAuthentikInstructions, setShowAuthentikInstructions] = useState(false);
    const [testingOAuth, setTestingOAuth] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        // Auto-populate redirect URI if empty
        if (!redirectUri) {
            setRedirectUri(`${window.location.origin}/login-complete`);
        }
    }, []);

    useEffect(() => {
        const current = {
            proxyEnabled,
            headerName,
            emailHeaderName,
            whitelist,
            overrideLogout,
            logoutUrl,
            iframeEnabled,
            oauthEndpoint,
            clientId,
            redirectUri,
            scopes,
            authDetectionSensitivity,
            customAuthPatterns
        };
        setHasChanges(JSON.stringify(current) !== JSON.stringify(originalSettings));
    }, [proxyEnabled, headerName, emailHeaderName, whitelist, overrideLogout, logoutUrl,
        iframeEnabled, oauthEndpoint, clientId, redirectUri, scopes,
        authDetectionSensitivity, customAuthPatterns, originalSettings]);

    // Auto-toggle logout override based on proxy state
    useEffect(() => {
        if (!proxyEnabled && overrideLogout) {
            setOverrideLogout(false);
        } else if (proxyEnabled && logoutUrl && !overrideLogout) {
            setOverrideLogout(true);
        }
    }, [proxyEnabled]);

    const fetchSettings = async () => {
        try {
            const response = await axios.get('/api/config/auth');
            const { proxy, iframe } = response.data;

            setProxyEnabled(proxy?.enabled || false);
            setHeaderName(proxy?.headerName || '');
            setEmailHeaderName(proxy?.emailHeaderName || '');
            setWhitelist((proxy?.whitelist || []).join(', '));
            setOverrideLogout(proxy?.overrideLogout || false);
            setLogoutUrl(proxy?.logoutUrl || '');

            setIframeEnabled(iframe?.enabled || false);
            setOauthEndpoint(iframe?.endpoint || '');
            setClientId(iframe?.clientId || '');
            setRedirectUri(iframe?.redirectUri || `${window.location.origin}/login-complete`);
            setScopes(iframe?.scopes || 'openid profile email');

            // Load auth detection settings from system config
            const systemResponse = await axios.get('/api/config/system');
            const iframeAuth = systemResponse.data.iframeAuth || {};
            setAuthDetectionSensitivity(iframeAuth.sensitivity || 'balanced');
            setCustomAuthPatterns(iframeAuth.customPatterns || []);

            setOriginalSettings({
                proxyEnabled: proxy?.enabled || false,
                headerName: proxy?.headerName || '',
                emailHeaderName: proxy?.emailHeaderName || '',
                whitelist: (proxy?.whitelist || []).join(', '),
                overrideLogout: proxy?.overrideLogout || false,
                logoutUrl: proxy?.logoutUrl || '',
                iframeEnabled: iframe?.enabled || false,
                oauthEndpoint: iframe?.endpoint || '',
                clientId: iframe?.clientId || '',
                redirectUri: iframe?.redirectUri || `${window.location.origin}/login-complete`,
                scopes: iframe?.scopes || 'openid profile email',
                authDetectionSensitivity: iframeAuth.sensitivity || 'balanced',
                customAuthPatterns: iframeAuth.customPatterns || []
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
            const whitelistArray = whitelist
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            await axios.put('/api/config/auth', {
                proxy: {
                    enabled: proxyEnabled,
                    headerName,
                    emailHeaderName,
                    whitelist: whitelistArray,
                    overrideLogout: overrideLogout && proxyEnabled,
                    logoutUrl
                },
                iframe: {
                    enabled: iframeEnabled,
                    endpoint: oauthEndpoint,
                    clientId,
                    redirectUri,
                    scopes
                }
            });

            // Save auth detection settings to system config
            await axios.put('/api/config/system', {
                iframeAuth: {
                    enabled: iframeEnabled,
                    sensitivity: authDetectionSensitivity,
                    customPatterns: customAuthPatterns
                }
            });

            setOriginalSettings({
                proxyEnabled,
                headerName,
                emailHeaderName,
                whitelist,
                overrideLogout,
                logoutUrl,
                iframeEnabled,
                oauthEndpoint,
                clientId,
                redirectUri,
                scopes,
                authDetectionSensitivity,
                customAuthPatterns
            });

            logger.info('Auth settings saved successfully');
        } catch (error) {
            logger.error('Failed to save auth settings', { error: error.message });
            alert(error.response?.data?.error || 'Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleUseAuthentikTemplate = () => {
        setOauthEndpoint('https://auth.example.com/application/o/authorize/');
        setClientId('');
        setRedirectUri(`${window.location.origin}/login-complete`);
        setScopes('openid profile email');
    };

    const handleTestOAuth = () => {
        if (!oauthEndpoint || !clientId) {
            alert('Please fill in OAuth endpoint and client ID before testing');
            return;
        }

        setTestingOAuth(true);
        const testUrl = `${oauthEndpoint}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(JSON.stringify({ test: true }))}`;

        const testWindow = window.open(testUrl, '_blank', 'width=600,height=700');

        const interval = setInterval(() => {
            if (testWindow.closed) {
                clearInterval(interval);
                setTestingOAuth(false);
            }
        }, 500);
    };

    const handleAddAuthPattern = () => {
        if (newAuthPattern.trim() && !customAuthPatterns.includes(newAuthPattern.trim())) {
            setCustomAuthPatterns([...customAuthPatterns, newAuthPattern.trim()]);
            setNewAuthPattern('');
        }
    };

    const handleRemoveAuthPattern = (pattern) => {
        setCustomAuthPatterns(customAuthPatterns.filter(p => p !== pattern));
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
                    Configure reverse proxy authentication and iframe OAuth
                </p>
            </div>

            {/* Subtab Navigation */}
            <div className="flex gap-2 border-b border-theme">
                <button
                    onClick={() => setActiveTab('proxy')}
                    className={`px-4 py-3 font-medium transition-all relative ${activeTab === 'proxy'
                        ? 'text-accent border-b-2 border-accent'
                        : 'text-theme-secondary hover:text-theme-primary'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Shield size={18} />
                        Auth Proxy
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('iframe')}
                    className={`px-4 py-3 font-medium transition-all relative ${activeTab === 'iframe'
                        ? 'text-accent border-b-2 border-accent'
                        : 'text-theme-secondary hover:text-theme-primary'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Globe size={18} />
                        iFrame Auth
                    </div>
                </button>
            </div>

            {/* Auth Proxy Tab */}
            {activeTab === 'proxy' && (
                <div className="glass-subtle rounded-xl shadow-deep border border-theme p-6 space-y-6">
                    {/* Proxy Toggle */}
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

                    {/* Header Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Auth Proxy Header Name"
                            type="text"
                            value={headerName}
                            onChange={(e) => setHeaderName(e.target.value)}
                            disabled={!proxyEnabled}
                            placeholder="X-Auth-User"
                            helperText="HTTP header containing the username"
                        />
                        <Input
                            label="Auth Proxy Header Name for Email"
                            type="text"
                            value={emailHeaderName}
                            onChange={(e) => setEmailHeaderName(e.target.value)}
                            disabled={!proxyEnabled}
                            placeholder="X-Auth-Email"
                            helperText="HTTP header containing the user email"
                        />
                    </div>

                    <Input
                        label="Auth Proxy Whitelist"
                        type="text"
                        value={whitelist}
                        onChange={(e) => setWhitelist(e.target.value)}
                        disabled={!proxyEnabled}
                        placeholder="10.0.0.0/8, 172.16.0.0/12"
                        helperText="Trusted proxy source IPs (where auth headers come from) - comma-separated IPs or CIDR ranges"
                    />

                    {/* Override Logout */}
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
                            <div className={`w-11 h-6 bg-theme-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-theme-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent ${!proxyEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                        </label>
                    </div>

                    {overrideLogout && proxyEnabled && (
                        <Input
                            label="Logout URL"
                            type="text"
                            value={logoutUrl}
                            onChange={(e) => setLogoutUrl(e.target.value)}
                            placeholder="https://auth.example.com/logout"
                            helperText="URL to redirect to when user logs out"
                        />
                    )}
                </div>
            )}

            {/* iFrame Auth Tab */}
            {activeTab === 'iframe' && (
                <div className="space-y-6">
                    {/* iFrame Auth Detection Card */}
                    <div className="glass-subtle rounded-xl shadow-medium border border-theme p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-theme-primary mb-2">
                                iFrame Auth Detection
                            </h3>
                            <p className="text-sm text-theme-secondary mb-3">
                                Automatically detect when embedded pages need authentication. Works best when your services are protected by the same OAuth provider configured below.
                            </p>
                            <div className="p-3 bg-theme-tertiary rounded-lg border border-theme">
                                <p className="text-xs text-theme-secondary">
                                    <strong className="text-theme-primary">⚠️ Limitations:</strong> Due to browser security restrictions, Framerr cannot read content inside iframes. Detection relies on monitoring URL changes and redirect patterns.
                                    <br /><br />
                                    <strong className="text-theme-primary">URL Requirements:</strong> Your OAuth provider must use the same base domain with <code className="px-1 bg-theme-primary rounded text-accent">/app</code> prefix (e.g., <code className="px-1 bg-theme-primary rounded text-accent">yourdomain.com/app/...</code>). Subdomains (e.g., <code className="px-1 bg-theme-primary rounded text-accent">auth.yourdomain.com</code>) will not work for automatic detection.
                                </p>
                            </div>
                        </div>

                        {/* Detection Sensitivity */}
                        <div>
                            <label className="block text-sm font-medium text-theme-primary mb-3">
                                Detection Sensitivity
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['conservative', 'balanced', 'aggressive'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setAuthDetectionSensitivity(level)}
                                        className={`p-3 rounded-lg border-2 transition-all text-center ${authDetectionSensitivity === level
                                            ? 'border-accent bg-accent/10 text-accent'
                                            : 'border-theme hover:border-theme-light bg-theme-tertiary text-theme-secondary'
                                            } cursor-pointer`}
                                    >
                                        <div className="font-medium text-sm capitalize">{level}</div>
                                        <div className="text-xs mt-1 opacity-75">
                                            {level === 'conservative' && 'High confidence only'}
                                            {level === 'balanced' && 'Recommended'}
                                            {level === 'aggressive' && 'Any redirect'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-theme-tertiary mt-2">
                                • <strong>Conservative:</strong> Only shows auth prompt for user-defined patterns or very high confidence
                                <br />• <strong>Balanced:</strong> Shows prompt for common auth patterns (login, oauth, etc.)
                                <br />• <strong>Aggressive:</strong> Shows prompt on any significant redirect
                            </p>
                        </div>

                        {/* Custom Auth Patterns */}
                        <div>
                            <label className="block text-sm font-medium text-theme-primary mb-3">
                                Custom Auth URL Patterns (Optional)
                            </label>
                            <p className="text-xs text-theme-secondary mb-3">
                                Add domains or URL patterns that should always trigger authentication. Example: auth.yourdomain.com
                            </p>

                            {/* Add Pattern Input */}
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newAuthPattern}
                                    onChange={(e) => setNewAuthPattern(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddAuthPattern()}
                                    placeholder="auth.yourdomain.com"
                                    className="flex-1 px-4 py-2 bg-theme-primary border border-theme rounded-lg text-theme-primary text-sm focus:border-accent focus:outline-none transition-all"
                                />
                                <button
                                    onClick={handleAddAuthPattern}
                                    disabled={!newAuthPattern.trim()}
                                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    Add
                                </button>
                            </div>

                            {/* Pattern List */}
                            {customAuthPatterns.length > 0 && (
                                <div className="space-y-2">
                                    {customAuthPatterns.map((pattern, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-theme-tertiary rounded-lg border border-theme"
                                        >
                                            <span className="text-sm text-theme-primary font-mono">{pattern}</span>
                                            <button
                                                onClick={() => handleRemoveAuthPattern(pattern)}
                                                className="text-error hover:text-error/80 transition-colors"
                                                title="Remove pattern"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Configuration Card */}
                    <div className="glass-subtle rounded-xl shadow-deep border border-theme p-6 space-y-6">
                        {/* iFrame Auth Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-theme-secondary">
                                    Enable iFrame Auth
                                </label>
                                <p className="text-xs text-theme-tertiary mt-1">
                                    Automatic OAuth authentication for iframe tabs
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={iframeEnabled}
                                    onChange={(e) => setIframeEnabled(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-theme-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-theme-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                            </label>
                        </div>

                        {/* Template Button */}
                        <button
                            onClick={handleUseAuthentikTemplate}
                            className="w-full px-4 py-3 border border-theme rounded-lg text-theme-secondary hover:bg-theme-hover hover:border-accent transition-all text-sm"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Check size={16} />
                                Use Authentik Template
                            </div>
                        </button>

                        {/* OAuth Configuration Fields */}
                        <div className="space-y-4">
                            <Input
                                label="OAuth Provider Endpoint"
                                type="text"
                                value={oauthEndpoint}
                                onChange={(e) => setOauthEndpoint(e.target.value)}
                                placeholder="https://auth.example.com/application/o/authorize/"
                                helperText="OAuth 2.0 authorization endpoint URL (must be HTTPS)"
                            />

                            <Input
                                label="Client ID"
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="your-client-id-here"
                                helperText="OAuth client ID from your provider"
                            />

                            <Input
                                label="Redirect URI"
                                type="text"
                                value={redirectUri}
                                onChange={(e) => setRedirectUri(e.target.value)}
                                placeholder={`${window.location.origin}/login-complete`}
                                helperText="OAuth callback URL (auto-populated)"
                            />

                            <Input
                                label="Scopes"
                                type="text"
                                value={scopes}
                                onChange={(e) => setScopes(e.target.value)}
                                placeholder="openid profile email"
                                helperText="Space-separated OAuth scopes"
                            />
                        </div>

                        {/* Test OAuth Button */}
                        <button
                            onClick={handleTestOAuth}
                            disabled={!oauthEndpoint || !clientId || testingOAuth}
                            className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {testingOAuth ? (
                                <>
                                    <Loader className="animate-spin" size={18} />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <ExternalLink size={18} />
                                    Test OAuth Configuration
                                </>
                            )}
                        </button>
                    </div>

                    {/* Authentik Instructions */}
                    <div className="glass-subtle rounded-xl border border-theme overflow-hidden">
                        <button
                            onClick={() => setShowAuthentikInstructions(!showAuthentikInstructions)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-theme-hover transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Lock size={18} className="text-accent" />
                                <span className="font-medium text-theme-primary">Authentik Setup Instructions</span>
                            </div>
                            {showAuthentikInstructions ? (
                                <ChevronUp size={20} className="text-theme-secondary" />
                            ) : (
                                <ChevronDown size={20} className="text-theme-secondary" />
                            )}
                        </button>

                        {showAuthentikInstructions && (
                            <div className="px-6 pb-6 space-y-4 text-sm text-theme-secondary border-t border-theme pt-4">
                                <ol className="list-decimal list-inside space-y-3">
                                    <li className="font-medium text-theme-primary">
                                        Go to your Authentik Admin Panel → Applications → Providers
                                    </li>
                                    <li>
                                        Click <span className="font-mono bg-theme-tertiary px-2 py-1 rounded">Create</span> and select <span className="font-semibold">OAuth2/OpenID Provider</span>
                                    </li>
                                    <li>
                                        Configure the provider:
                                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                            <li><span className="font-medium">Name:</span> Framerr Callback</li>
                                            <li><span className="font-medium">Client Type:</span> Public</li>
                                            <li><span className="font-medium">Client ID:</span> Copy this and paste above</li>
                                            <li><span className="font-medium">Redirect URI:</span> <span className="font-mono text-accent">{redirectUri || `${window.location.origin}/login-complete`}</span></li>
                                            <li><span className="font-medium">Scopes:</span> openid, profile, email</li>
                                        </ul>
                                    </li>
                                    <li>
                                        Save the provider and copy the <span className="font-semibold">Authorization URL</span>
                                    </li>
                                    <li>
                                        Paste the Authorization URL in the <span className="font-semibold">OAuth Provider Endpoint</span> field above
                                    </li>
                                    <li>
                                        Click <span className="font-semibold">Save Settings</span> below and test with the <span className="font-semibold">Test OAuth</span> button
                                    </li>
                                </ol>

                                <div className="mt-4 p-4 bg-theme-tertiary rounded-lg">
                                    <p className="text-xs text-theme-tertiary">
                                        <span className="font-semibold text-theme-secondary">Note:</span> The OAuth provider must point to the same Authentik instance that protects your services (Radarr, Sonarr, etc.) for automatic iframe authentication to work.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    icon={saving ? Loader : Save}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
};

export default AuthSettings;
