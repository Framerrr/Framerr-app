import React, { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, ChevronDown, Play, Copy, Zap, Star, Film, Tv, Check, AlertTriangle, RefreshCw, Link, Smartphone, Trash2, Send, Shield, ShieldOff, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/permissions';
import { Button } from '../common/Button';
import EventSelectDropdown from './EventSelectDropdown';
import { INTEGRATION_EVENTS, getDefaultAdminEvents, getDefaultUserEvents } from '../../constants/notificationEvents';
import logger from '../../utils/logger';

/**
 * NotificationSettings Component
 * 
 * Settings for configuring notification preferences including:
 * - Global enable/disable and sound settings
 * - Per-integration webhook notification controls
 *   - Admin: Configure which events admins receive and which users can receive
 *   - User: Select from admin-allowed events what they want to receive
 * 
 * Integration cards only show for users if:
 * 1. Integration is shared with them
 * 2. Admin has enabled at least one event for users
 */
const NotificationSettings = () => {
    const {
        info: showInfoToast,
        success: showSuccess,
        error: showError,
        addNotification,
        // Web Push
        pushSupported,
        pushPermission,
        pushEnabled,
        pushSubscriptions,
        currentEndpoint,
        subscribeToPush,
        unsubscribeFromPush,
        removePushSubscription,
        testPushNotification,
        fetchPushSubscriptions
    } = useNotifications();
    const { user } = useAuth();
    const [pushLoading, setPushLoading] = useState(false);
    const hasAdminAccess = isAdmin(user);

    // General settings
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [notificationSound, setNotificationSound] = useState(false);
    const [receiveUnmatched, setReceiveUnmatched] = useState(true);
    const [webhookBaseUrl, setWebhookBaseUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Integration data from systemConfig (admin only loads full data)
    const [integrations, setIntegrations] = useState({});

    // Shared integrations for non-admin users
    const [sharedIntegrations, setSharedIntegrations] = useState([]);

    // User's personal notification preferences
    const [userIntegrationSettings, setUserIntegrationSettings] = useState({});

    // Expanded sections state
    const [expandedSections, setExpandedSections] = useState({});

    // Webhook integrations that support notifications
    const webhookIntegrations = [
        { id: 'overseerr', name: 'Overseerr', description: 'Media request notifications', icon: Star },
        { id: 'sonarr', name: 'Sonarr', description: 'TV show notifications', icon: Tv },
        { id: 'radarr', name: 'Radarr', description: 'Movie notifications', icon: Film }
    ];

    // Load settings on mount
    useEffect(() => {
        loadData();
    }, [hasAdminAccess]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load user's notification preferences
            const userResponse = await axios.get('/api/config/user', { withCredentials: true });

            if (userResponse.data?.preferences?.notifications) {
                const notifPrefs = userResponse.data.preferences.notifications;
                setNotificationsEnabled(notifPrefs.enabled ?? true);
                setNotificationSound(notifPrefs.sound ?? false);
                setReceiveUnmatched(notifPrefs.receiveUnmatched ?? true);

                if (notifPrefs.integrations) {
                    setUserIntegrationSettings(notifPrefs.integrations);
                }
            }

            if (hasAdminAccess) {
                // Admin: Load full integration config
                const integrationsResponse = await axios.get('/api/integrations', { withCredentials: true });
                setIntegrations(integrationsResponse.data.integrations || {});

                // Load webhook base URL from systemConfig (global setting)
                const sysConfigResponse = await axios.get('/api/config/system', { withCredentials: true });
                const savedBaseUrl = sysConfigResponse.data?.webhookBaseUrl;
                setWebhookBaseUrl(savedBaseUrl || window.location.origin);
            } else {
                // Non-admin: Load shared integrations
                const sharedResponse = await axios.get('/api/integrations/shared', { withCredentials: true });
                const sharedList = sharedResponse.data.integrations || [];
                setSharedIntegrations(sharedList);

                // Build integrations data from shared integrations for webhookConfig access
                const integrationsData = {};
                sharedList.forEach(si => {
                    // Include all integration data, especially webhookConfig
                    integrationsData[si.name] = {
                        enabled: si.enabled,
                        webhookConfig: si.webhookConfig || null
                    };
                });
                setIntegrations(integrationsData);

                logger.debug('User shared integrations loaded:', {
                    count: sharedList.length,
                    integrations: sharedList.map(si => ({
                        name: si.name,
                        hasWebhookConfig: !!si.webhookConfig,
                        userEventsCount: si.webhookConfig?.userEvents?.length || 0
                    }))
                });
            }
        } catch (error) {
            logger.error('Failed to load notification settings:', error);
        } finally {
            setLoading(false);
        }
    };

    // Save general settings
    const saveGeneralSettings = async (updates) => {
        setSaving(true);
        try {
            await axios.put('/api/config/user', {
                preferences: {
                    notifications: {
                        enabled: updates.enabled ?? notificationsEnabled,
                        sound: updates.sound ?? notificationSound,
                        receiveUnmatched: updates.receiveUnmatched ?? receiveUnmatched,
                        integrations: userIntegrationSettings
                    }
                }
            }, { withCredentials: true });
        } catch (error) {
            logger.error('Failed to save notification settings:', error);
        } finally {
            setSaving(false);
        }
    };

    // Save admin webhook config
    const saveAdminWebhookConfig = async (integrationId, webhookConfig) => {
        setSaving(true);
        try {
            const updatedIntegrations = {
                ...integrations,
                [integrationId]: {
                    ...integrations[integrationId],
                    webhookConfig
                }
            };

            await axios.put('/api/integrations', { integrations: updatedIntegrations }, { withCredentials: true });
            setIntegrations(updatedIntegrations);

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('integrationsUpdated'));
        } catch (error) {
            logger.error('Failed to save webhook config:', error);
            showError('Error', 'Failed to save notification settings');
        } finally {
            setSaving(false);
        }
    };

    // Save user's integration preferences
    const saveUserIntegrationSettings = async (integrationId, settings) => {
        const updated = {
            ...userIntegrationSettings,
            [integrationId]: settings
        };
        setUserIntegrationSettings(updated);

        setSaving(true);
        try {
            await axios.put('/api/config/user', {
                preferences: {
                    notifications: {
                        enabled: notificationsEnabled,
                        sound: notificationSound,
                        receiveUnmatched,
                        integrations: updated
                    }
                }
            }, { withCredentials: true });
        } catch (error) {
            logger.error('Failed to save user notification settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleNotifications = async (enabled) => {
        setNotificationsEnabled(enabled);
        await saveGeneralSettings({ enabled });
    };

    const handleToggleSound = async (enabled) => {
        setNotificationSound(enabled);
        await saveGeneralSettings({ sound: enabled });
    };

    const handleToggleReceiveUnmatched = async (enabled) => {
        setReceiveUnmatched(enabled);
        await saveGeneralSettings({ receiveUnmatched: enabled });
    };

    const toggleSection = (id) => {
        setExpandedSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const sendTestNotification = async () => {
        try {
            const response = await axios.post('/api/notifications', {
                title: 'Test Notification',
                message: 'This is a test notification to demonstrate how notifications appear!',
                type: 'info'
            }, { withCredentials: true });

            showInfoToast(
                'Test Notification',
                'This is a test notification to demonstrate how notifications appear!'
            );

            if (response.data) {
                addNotification(response.data);
            }
        } catch (error) {
            logger.error('Failed to create test notification:', error);
        }
    };

    const copyWebhookUrl = (integrationId) => {
        const webhookConfig = integrations[integrationId]?.webhookConfig;
        if (webhookConfig?.webhookToken) {
            const baseUrl = webhookBaseUrl || window.location.origin;
            const url = `${baseUrl}/api/webhooks/${integrationId}/${webhookConfig.webhookToken}`;
            navigator.clipboard.writeText(url);
            showSuccess('Copied', 'Webhook URL copied to clipboard');
        }
    };

    const saveWebhookBaseUrl = async (url) => {
        try {
            await axios.put('/api/config/system', {
                webhookBaseUrl: url
            }, { withCredentials: true });
            setWebhookBaseUrl(url);
            showSuccess('Saved', 'Webhook base URL updated');
        } catch (error) {
            logger.error('Failed to save webhook base URL:', error);
            showError('Error', 'Failed to save webhook base URL');
        }
    };

    const resetWebhookBaseUrl = () => {
        const browserUrl = window.location.origin;
        setWebhookBaseUrl(browserUrl);
        saveWebhookBaseUrl(browserUrl);
    };

    const generateWebhookToken = async (integrationId) => {
        // Generate UUID with fallback for non-HTTPS environments
        const token = typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        const currentConfig = integrations[integrationId]?.webhookConfig || {};

        await saveAdminWebhookConfig(integrationId, {
            ...currentConfig,
            webhookToken: token,
            webhookEnabled: true,
            adminEvents: currentConfig.adminEvents || getDefaultAdminEvents(integrationId),
            userEvents: currentConfig.userEvents || getDefaultUserEvents(integrationId)
        });

        showSuccess('Token Generated', 'New webhook token created');
    };

    // Get visible integrations based on permissions
    const getVisibleIntegrations = () => {
        if (hasAdminAccess) {
            return webhookIntegrations;
        }

        // For users: Show only integrations that are shared AND have userEvents configured
        return webhookIntegrations.filter(integration => {
            const isShared = sharedIntegrations.some(si => si.name === integration.id);
            const webhookConfig = integrations[integration.id]?.webhookConfig;
            const hasUserEvents = webhookConfig?.userEvents?.length > 0;
            return isShared && hasUserEvents;
        });
    };

    const visibleIntegrations = getVisibleIntegrations();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-theme-secondary">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">
                    Notification Settings
                </h2>
                <p className="text-theme-secondary text-sm">
                    Configure how you receive notifications from integrated services
                </p>
            </div>

            {/* General Settings Section */}
            <div className="glass-subtle rounded-xl shadow-medium p-6 border border-theme">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                    <Bell size={20} />
                    General Settings
                </h3>

                <div className="space-y-4">
                    {/* Master Enable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-theme-tertiary rounded-lg border border-theme">
                        <div className="flex-1">
                            <div className="text-sm font-medium text-theme-primary mb-1">
                                Enable Notifications
                            </div>
                            <div className="text-xs text-theme-tertiary">
                                {notificationsEnabled
                                    ? 'Receive toast notifications for important events'
                                    : 'All notifications are disabled'}
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationsEnabled}
                                onChange={(e) => handleToggleNotifications(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent"></div>
                        </label>
                    </div>

                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between p-4 bg-theme-tertiary rounded-lg border border-theme">
                        <div className="flex-1 flex items-center gap-3">
                            {notificationSound ? (
                                <Volume2 size={20} className="text-accent" />
                            ) : (
                                <VolumeX size={20} className="text-theme-tertiary" />
                            )}
                            <div>
                                <div className="text-sm font-medium text-theme-primary mb-1">
                                    Notification Sound
                                </div>
                                <div className="text-xs text-theme-tertiary">
                                    {notificationSound
                                        ? 'Play a sound when notifications appear'
                                        : 'Notifications are silent'}
                                </div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationSound}
                                onChange={(e) => handleToggleSound(e.target.checked)}
                                disabled={!notificationsEnabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                    </div>

                    {/* Receive Unmatched - Admin Only */}
                    {hasAdminAccess && (
                        <div className="flex items-center justify-between p-4 bg-theme-tertiary rounded-lg border border-theme">
                            <div className="flex-1 flex items-center gap-3">
                                <AlertTriangle size={20} className="text-warning" />
                                <div>
                                    <div className="text-sm font-medium text-theme-primary mb-1">
                                        Receive Unmatched Alerts
                                    </div>
                                    <div className="text-xs text-theme-tertiary">
                                        Receive notifications when webhook events can't be matched to a user
                                    </div>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={receiveUnmatched}
                                    onChange={(e) => handleToggleReceiveUnmatched(e.target.checked)}
                                    disabled={!notificationsEnabled}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-theme-primary border border-theme peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-theme after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                            </label>
                        </div>
                    )}

                    {/* Test Notification */}
                    <div className="p-4 bg-theme-tertiary rounded-lg border border-theme">
                        <h4 className="text-sm font-medium text-theme-primary mb-2">
                            Test Notifications
                        </h4>
                        <p className="text-xs text-theme-secondary mb-4">
                            Send a test notification to preview how notifications will appear.
                        </p>
                        <Button
                            onClick={sendTestNotification}
                            disabled={!notificationsEnabled}
                            variant="secondary"
                            icon={Play}
                        >
                            Send Test Notification
                        </Button>
                    </div>
                </div>
            </div>

            {/* Web Push Notifications Section */}
            <div className="glass-subtle rounded-xl shadow-medium p-6 border border-theme">
                <h3 className="text-lg font-semibold text-theme-primary mb-2 flex items-center gap-2">
                    <Smartphone size={20} />
                    Web Push Notifications
                </h3>
                <p className="text-sm text-theme-secondary mb-6">
                    Receive notifications even when Framerr isn't open in your browser.
                </p>

                {!pushSupported ? (
                    // Not supported
                    <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldOff size={18} className="text-warning" />
                            <span className="text-sm font-medium text-theme-primary">Not Supported</span>
                        </div>
                        <p className="text-xs text-theme-secondary">
                            {navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
                                ? 'Safari on iOS requires this app to be added to your home screen first. On macOS Safari 16+, push should work natively.'
                                : 'Web Push notifications require HTTPS and a modern browser. Push is not available in this environment.'}
                        </p>
                    </div>
                ) : pushPermission === 'denied' ? (
                    // Permission denied - show instructions and retry option
                    <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldOff size={18} className="text-error" />
                            <span className="text-sm font-medium text-theme-primary">Notifications Blocked</span>
                        </div>
                        <p className="text-xs text-theme-secondary mb-3">
                            {navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
                                ? 'Safari: Open Safari Preferences → Websites → Notifications → Find this site and allow.'
                                : 'Click the lock/site info icon in your address bar, find Notifications, and change to "Allow".'}
                        </p>
                        <Button
                            onClick={() => {
                                // Force re-check permission state
                                const currentPerm = Notification.permission;
                                if (currentPerm !== 'denied') {
                                    // Permission was reset, update state
                                    window.location.reload();
                                } else {
                                    showError('Still Blocked', 'Please update your browser notification settings first, then try again.');
                                }
                            }}
                            variant="secondary"
                            size="sm"
                            icon={RefreshCw}
                        >
                            Check Again
                        </Button>
                    </div>
                ) : (
                    // Supported and permission not denied
                    <div className="space-y-4">
                        {/* This Device Enable/Disable Toggle */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-theme-tertiary rounded-lg border border-theme">
                            <div className="flex items-center gap-3">
                                {pushEnabled ? (
                                    <ShieldCheck size={20} className="text-success flex-shrink-0" />
                                ) : (
                                    <Shield size={20} className="text-theme-tertiary flex-shrink-0" />
                                )}
                                <div>
                                    <div className="text-sm font-medium text-theme-primary mb-1">
                                        Push Notifications on This Device
                                    </div>
                                    <div className="text-xs text-theme-tertiary">
                                        {pushEnabled
                                            ? 'This device will receive push notifications'
                                            : 'Enable to receive push notifications when Framerr is closed'}
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={async () => {
                                    setPushLoading(true);
                                    try {
                                        if (pushEnabled) {
                                            // Disable - unsubscribe this device
                                            await unsubscribeFromPush();
                                            showSuccess('Push Disabled', 'This device will no longer receive push notifications');
                                        } else {
                                            // Enable - subscribe this device
                                            await subscribeToPush();
                                            showSuccess('Push Enabled', 'This device will now receive push notifications');
                                        }
                                    } catch (err) {
                                        showError('Error', err.message || 'Failed to update push settings');
                                    } finally {
                                        setPushLoading(false);
                                    }
                                }}
                                variant={pushEnabled ? 'danger' : 'primary'}
                                disabled={pushLoading || !notificationsEnabled}
                                icon={pushLoading ? undefined : (pushEnabled ? ShieldOff : Shield)}
                                className="w-full sm:w-auto flex-shrink-0"
                            >
                                {pushLoading ? (pushEnabled ? 'Disabling...' : 'Enabling...') : (pushEnabled ? 'Disable' : 'Enable')}
                            </Button>
                        </div>

                        {/* Test Push - Only show when enabled */}
                        {pushEnabled && pushSubscriptions.length > 0 && (
                            <div className="p-4 bg-theme-tertiary rounded-lg border border-theme">
                                <h4 className="text-sm font-medium text-theme-primary mb-2">
                                    Test Push Notification
                                </h4>
                                <p className="text-xs text-theme-secondary mb-4">
                                    Send a test push notification to all your subscribed devices.
                                </p>
                                <Button
                                    onClick={async () => {
                                        try {
                                            await testPushNotification();
                                            showSuccess('Test Sent', 'Check your device for the push notification');
                                        } catch (err) {
                                            showError('Error', err.message || 'Failed to send test push');
                                        }
                                    }}
                                    variant="secondary"
                                    icon={Send}
                                >
                                    Send Test Push
                                </Button>
                            </div>
                        )}

                        {/* Subscribed Devices */}
                        {pushSubscriptions.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-theme-primary mb-3 flex items-center gap-2">
                                    <Smartphone size={16} />
                                    Subscribed Devices ({pushSubscriptions.length})
                                </h4>
                                <div className="space-y-2">
                                    {pushSubscriptions.map((sub) => {
                                        const isThisDevice = sub.endpoint === currentEndpoint;
                                        return (
                                            <div
                                                key={sub.id}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${isThisDevice
                                                    ? 'bg-accent/5 border-accent/30'
                                                    : 'bg-theme-primary border-theme'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Smartphone size={18} className={isThisDevice ? 'text-accent' : 'text-theme-secondary'} />
                                                    <div>
                                                        <div className="text-sm font-medium text-theme-primary flex items-center gap-2">
                                                            {sub.deviceName || 'Unknown Device'}
                                                            {isThisDevice && (
                                                                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                                                                    This Device
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-theme-tertiary">
                                                            {sub.lastUsed
                                                                ? `Last used: ${new Date(sub.lastUsed * 1000).toLocaleDateString()}`
                                                                : `Added: ${new Date(sub.createdAt * 1000).toLocaleDateString()}`
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await removePushSubscription(sub.id);
                                                            showSuccess('Removed', isThisDevice
                                                                ? 'Push notifications disabled for this device'
                                                                : 'Device removed from push notifications'
                                                            );
                                                        } catch (err) {
                                                            showError('Error', 'Failed to remove device');
                                                        }
                                                    }}
                                                    className="p-2 text-theme-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                                                    title={isThisDevice ? 'Disable push on this device' : 'Remove device'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Integration Notifications Section */}
            <div className="glass-subtle rounded-xl shadow-medium p-6 border border-theme">
                <h3 className="text-lg font-semibold text-theme-primary mb-2 flex items-center gap-2">
                    <Zap size={20} />
                    Integration Notifications
                </h3>
                <p className="text-sm text-theme-secondary mb-6">
                    {hasAdminAccess
                        ? 'Configure webhook notifications from your integrations. Set which events you receive and which events users can opt into.'
                        : 'Choose which notifications you want to receive from shared integrations.'}
                </p>

                {/* Webhook Base URL Config - Admin Only */}
                {hasAdminAccess && (
                    <div className="p-4 bg-theme-tertiary rounded-lg border border-theme mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Link size={16} className="text-theme-secondary" />
                            <h4 className="text-sm font-medium text-theme-primary">
                                Webhook Base URL
                            </h4>
                        </div>
                        <p className="text-xs text-theme-secondary mb-3">
                            Set the base URL for webhook endpoints. Use internal Docker hostnames (e.g., http://framerr:3001) for container-to-container communication.
                        </p>
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={webhookBaseUrl}
                                onChange={(e) => setWebhookBaseUrl(e.target.value)}
                                placeholder="http://framerr:3001"
                                className="w-full px-3 py-2 text-sm bg-theme-primary border border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => saveWebhookBaseUrl(webhookBaseUrl)}
                                    variant="secondary"
                                    icon={Check}
                                    title="Save webhook base URL"
                                    className="flex-1 sm:flex-none"
                                >
                                    Save
                                </Button>
                                <Button
                                    onClick={resetWebhookBaseUrl}
                                    variant="secondary"
                                    icon={RefreshCw}
                                    title="Reset to browser URL"
                                    className="flex-1 sm:flex-none"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {visibleIntegrations.length === 0 ? (
                    <div className="text-center py-8">
                        <Bell size={32} className="mx-auto mb-3 text-theme-tertiary" />
                        <p className="text-theme-secondary text-sm">
                            {hasAdminAccess
                                ? 'Configure integrations in Widgets → Service Settings to enable webhook notifications.'
                                : 'No integrations with notifications are shared with you.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {visibleIntegrations.map((integration) => (
                            <IntegrationCard
                                key={integration.id}
                                integration={integration}
                                integrationConfig={integrations[integration.id] || {}}
                                userSettings={userIntegrationSettings[integration.id] || {}}
                                isExpanded={expandedSections[integration.id]}
                                onToggleExpand={() => toggleSection(integration.id)}
                                isAdmin={hasAdminAccess}
                                onSaveAdminConfig={(config) => saveAdminWebhookConfig(integration.id, config)}
                                onSaveUserSettings={(settings) => saveUserIntegrationSettings(integration.id, settings)}
                                onCopyWebhookUrl={() => copyWebhookUrl(integration.id)}
                                onGenerateToken={() => generateWebhookToken(integration.id)}
                                disabled={!notificationsEnabled}
                                webhookBaseUrl={webhookBaseUrl}
                            />
                        ))}
                    </div>
                )}

                {/* Info Note - Non-admin */}
                {!hasAdminAccess && visibleIntegrations.length > 0 && (
                    <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-lg">
                        <p className="text-xs text-theme-secondary">
                            <strong className="text-info">Tip:</strong> Link your accounts in Settings → Widgets → My Linked Accounts to ensure you receive personalized notifications.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * IntegrationCard Component
 * 
 * Expandable card for a single integration's notification settings
 */
const IntegrationCard = ({
    integration,
    integrationConfig,
    userSettings,
    isExpanded,
    onToggleExpand,
    isAdmin,
    onSaveAdminConfig,
    onSaveUserSettings,
    onCopyWebhookUrl,
    onGenerateToken,
    disabled,
    webhookBaseUrl
}) => {
    const Icon = integration.icon;
    const events = INTEGRATION_EVENTS[integration.id] || [];
    const webhookConfig = integrationConfig.webhookConfig || {};

    // Admin state
    const adminEvents = webhookConfig.adminEvents || [];
    const userEvents = webhookConfig.userEvents || [];
    const webhookEnabled = webhookConfig.webhookEnabled ?? false;
    const webhookToken = webhookConfig.webhookToken;

    // User state
    const userEnabled = userSettings.enabled ?? true;
    const userSelectedEvents = userSettings.events || [];

    const handleMasterToggle = () => {
        if (isAdmin) {
            onSaveAdminConfig({
                ...webhookConfig,
                webhookEnabled: !webhookEnabled
            });
        } else {
            onSaveUserSettings({
                ...userSettings,
                enabled: !userEnabled
            });
        }
    };

    const handleAdminEventsChange = (newEvents) => {
        onSaveAdminConfig({
            ...webhookConfig,
            adminEvents: newEvents
        });
    };

    const handleUserEventsChange = (newEvents) => {
        onSaveAdminConfig({
            ...webhookConfig,
            userEvents: newEvents
        });
    };

    const handleUserSelectedEventsChange = (newEvents) => {
        onSaveUserSettings({
            ...userSettings,
            events: newEvents
        });
    };

    const isEnabled = isAdmin ? webhookEnabled : userEnabled;

    // For users, filter events to only show what admin has allowed
    const allowedEventsForUser = events.filter(e => userEvents.includes(e.key));

    return (
        <div className="glass-subtle shadow-medium rounded-xl overflow-hidden border border-theme card-glow">
            {/* Header - Clickable */}
            <button
                onClick={onToggleExpand}
                className="w-full p-6 flex items-center justify-between hover:bg-theme-hover/30 transition-colors"
            >
                <div className="flex items-center gap-4 flex-1">
                    <Icon className="text-theme-secondary" size={20} />
                    <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-semibold text-theme-primary">{integration.name}</h3>
                        <p className="text-sm text-theme-secondary">{integration.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Toggle Switch */}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            handleMasterToggle();
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${isEnabled ? 'bg-success' : 'bg-theme-tertiary'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                    </div>

                    {/* Chevron */}
                    <ChevronDown size={20} className={`text-theme-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 border-t border-theme pt-6 space-y-6">
                            {isAdmin ? (
                                // Admin View
                                <>
                                    {/* Admin Events Dropdown */}
                                    <EventSelectDropdown
                                        label="Admin Receives"
                                        events={events}
                                        selectedEvents={adminEvents}
                                        onChange={handleAdminEventsChange}
                                        disabled={disabled || !isEnabled}
                                        placeholder="Select events for admins..."
                                    />

                                    {/* User Events Dropdown */}
                                    <EventSelectDropdown
                                        label="Users Can Receive"
                                        events={events}
                                        selectedEvents={userEvents}
                                        onChange={handleUserEventsChange}
                                        disabled={disabled || !isEnabled}
                                        placeholder="Select events users can opt into..."
                                    />

                                    {/* Webhook Configuration */}
                                    <div className="pt-4 border-t border-theme">
                                        <h4 className="text-sm font-medium text-theme-primary mb-3">
                                            Webhook Configuration
                                        </h4>

                                        {webhookToken ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 px-3 py-2 bg-theme-primary border border-theme rounded-lg text-xs font-mono text-theme-secondary truncate">
                                                        {`${webhookBaseUrl || window.location.origin}/api/webhooks/${integration.id}/${webhookToken.substring(0, 8)}...`}
                                                    </div>
                                                    <button
                                                        onClick={onCopyWebhookUrl}
                                                        className="p-2 bg-theme-tertiary hover:bg-theme-hover border border-theme rounded-lg transition-colors"
                                                        title="Copy full URL"
                                                    >
                                                        <Copy size={16} className="text-theme-secondary" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-theme-tertiary">
                                                    Configure this URL in {integration.name} → Settings → Webhooks. Enable all notification types.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <p className="text-sm text-theme-secondary mb-3">
                                                    Generate a webhook token to receive notifications from {integration.name}.
                                                </p>
                                                <Button
                                                    onClick={onGenerateToken}
                                                    variant="secondary"
                                                    size="sm"
                                                    icon={Zap}
                                                >
                                                    Generate Webhook Token
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                // User View
                                <>
                                    {allowedEventsForUser.length > 0 ? (
                                        <EventSelectDropdown
                                            label="Notify Me When"
                                            events={allowedEventsForUser}
                                            selectedEvents={userSelectedEvents}
                                            onChange={handleUserSelectedEventsChange}
                                            disabled={disabled || !isEnabled}
                                            placeholder="Select which events to receive..."
                                        />
                                    ) : (
                                        <p className="text-sm text-theme-tertiary text-center py-4">
                                            No notification events are currently available for this integration.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationSettings;
