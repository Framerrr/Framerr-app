import React, { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, ChevronDown, Play, Tv, MonitorPlay, Film, Download, Star, Activity } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/permissions';
import { Button } from '../common/Button';
import logger from '../../utils/logger';

/**
 * NotificationSettings Component
 * 
 * Standalone settings tab for configuring notification preferences
 * - Enable/disable notifications globally
 * - Enable/disable notification sounds
 * - Test notifications button
 * - Per-integration notification toggles (expandable sections)
 * 
 * For non-admin users, only shows integrations that are shared with them.
 */
const NotificationSettings = () => {
    const { info: showInfoToast, addNotification } = useNotifications();
    const { user } = useAuth();
    const hasAdminAccess = isAdmin(user);

    // General settings
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [notificationSound, setNotificationSound] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Shared integrations for non-admin users
    const [sharedIntegrations, setSharedIntegrations] = useState([]);

    // Integration notification settings
    const [integrationSettings, setIntegrationSettings] = useState({
        plex: { enabled: true, sessionStart: true, sessionEnd: true },
        sonarr: { enabled: true, downloadComplete: true },
        radarr: { enabled: true, downloadComplete: true },
        qbittorrent: { enabled: true, downloadComplete: true },
        overseerr: { enabled: true, requestApproved: true, requestAvailable: true },
        systemHealth: { enabled: true, resourceAlerts: true }
    });

    // Expanded sections state
    const [expandedSections, setExpandedSections] = useState({});

    // Load settings and shared integrations on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load user notification preferences
                const response = await axios.get('/api/config/user', {
                    withCredentials: true
                });

                if (response.data?.preferences?.notifications) {
                    const notifPrefs = response.data.preferences.notifications;
                    setNotificationsEnabled(notifPrefs.enabled ?? true);
                    setNotificationSound(notifPrefs.sound ?? false);

                    if (notifPrefs.integrations) {
                        setIntegrationSettings(prev => ({
                            ...prev,
                            ...notifPrefs.integrations
                        }));
                    }
                }

                // For non-admin users, fetch which integrations are shared with them
                if (!hasAdminAccess) {
                    const sharedResponse = await axios.get('/api/integrations/shared', {
                        withCredentials: true
                    });
                    setSharedIntegrations(sharedResponse.data.integrations || []);
                }
            } catch (error) {
                logger.error('Failed to load notification settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [hasAdminAccess]);

    // Save settings when changed
    const saveSettings = async (updates) => {
        setSaving(true);
        try {
            await axios.put('/api/config/user', {
                preferences: {
                    notifications: {
                        enabled: updates.enabled ?? notificationsEnabled,
                        sound: updates.sound ?? notificationSound,
                        integrations: updates.integrations ?? integrationSettings
                    }
                }
            }, {
                withCredentials: true
            });

            logger.info('Notification settings saved');
        } catch (error) {
            logger.error('Failed to save notification settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleNotifications = async (enabled) => {
        setNotificationsEnabled(enabled);
        await saveSettings({ enabled });
    };

    const handleToggleSound = async (enabled) => {
        setNotificationSound(enabled);
        await saveSettings({ sound: enabled });
    };

    const handleToggleIntegration = async (integrationId, field, value) => {
        const updated = {
            ...integrationSettings,
            [integrationId]: {
                ...integrationSettings[integrationId],
                [field]: value
            }
        };
        setIntegrationSettings(updated);
        await saveSettings({ integrations: updated });
    };

    const toggleSection = (id) => {
        setExpandedSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const sendTestNotification = async () => {
        try {
            // Create notification in backend
            const response = await axios.post('/api/notifications', {
                title: 'Test Notification',
                message: 'This is a test notification to demonstrate how notifications appear!',
                type: 'info'
            }, {
                withCredentials: true
            });

            // Show toast popup
            showInfoToast(
                'Test Notification',
                'This is a test notification to demonstrate how notifications appear!'
            );

            // Add to notification center immediately (from response)
            if (response.data) {
                addNotification(response.data);
            }
        } catch (error) {
            logger.error('Failed to create test notification:', error);
        }
    };

    // Integration configurations for UI
    const integrations = [
        {
            id: 'plex',
            name: 'Plex',
            description: 'Media server notifications',
            icon: Tv,
            options: [
                { key: 'sessionStart', label: 'Session started' },
                { key: 'sessionEnd', label: 'Session ended' }
            ]
        },
        {
            id: 'sonarr',
            name: 'Sonarr',
            description: 'TV show download notifications',
            icon: MonitorPlay,
            options: [
                { key: 'downloadComplete', label: 'Download complete' }
            ]
        },
        {
            id: 'radarr',
            name: 'Radarr',
            description: 'Movie download notifications',
            icon: Film,
            options: [
                { key: 'downloadComplete', label: 'Download complete' }
            ]
        },
        {
            id: 'qbittorrent',
            name: 'qBittorrent',
            description: 'Torrent client notifications',
            icon: Download,
            options: [
                { key: 'downloadComplete', label: 'Download complete' }
            ]
        },
        {
            id: 'overseerr',
            name: 'Overseerr',
            description: 'Media request notifications',
            icon: Star,
            options: [
                { key: 'requestApproved', label: 'Request approved' },
                { key: 'requestAvailable', label: 'Media available' }
            ]
        },
        {
            id: 'systemHealth',
            name: 'System Health',
            description: 'System resource alerts',
            icon: Activity,
            options: [
                { key: 'resourceAlerts', label: 'Resource alerts (high CPU/memory)' }
            ]
        }
    ];

    // Filter integrations based on user access
    // Admins see all integrations, non-admins only see shared ones
    const filteredIntegrations = hasAdminAccess
        ? integrations
        : integrations.filter(integration => {
            // Check if this integration is shared with the user
            return sharedIntegrations.some(si => si.name === integration.id);
        });

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
                    Configure how you receive notifications throughout the application
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

            {/* Integration Notifications Section */}
            <div className="glass-subtle rounded-xl shadow-medium p-6 border border-theme">
                <h3 className="text-lg font-semibold text-theme-primary mb-2 flex items-center gap-2">
                    <Bell size={20} />
                    Integration Notifications
                </h3>
                <p className="text-sm text-theme-secondary mb-6">
                    {hasAdminAccess
                        ? 'Configure which integrations send you notifications. These require the corresponding integration to be enabled in Widgets → Integrations.'
                        : 'Configure notifications for the integrations shared with you by your administrator.'}
                </p>

                <div className="space-y-4">
                    {filteredIntegrations.map((integration) => {
                        const Icon = integration.icon;
                        const isExpanded = expandedSections[integration.id];
                        const settings = integrationSettings[integration.id] || {};
                        const isEnabled = settings.enabled !== false;

                        return (
                            <div
                                key={integration.id}
                                className="glass-subtle shadow-medium rounded-xl overflow-hidden border border-theme card-glow"
                            >
                                {/* Integration Header - Clickable */}
                                <button
                                    onClick={() => toggleSection(integration.id)}
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
                                                handleToggleIntegration(integration.id, 'enabled', !isEnabled);
                                            }}
                                            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${isEnabled ? 'bg-success' : 'bg-theme-tertiary'}`}
                                        >
                                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </div>

                                        {/* Chevron */}
                                        <ChevronDown size={20} className={`text-theme-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Expanded Options */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 border-t border-theme pt-6 space-y-4">
                                                {/* Individual notification type toggles */}
                                                {integration.options.map((option) => (
                                                    <div
                                                        key={option.key}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <span className="text-sm text-theme-secondary">
                                                            {option.label}
                                                        </span>
                                                        <div
                                                            onClick={() => handleToggleIntegration(integration.id, option.key, settings[option.key] === false)}
                                                            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${settings[option.key] !== false ? 'bg-success' : 'bg-theme-tertiary'} ${!notificationsEnabled || !isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings[option.key] !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {/* Info Note - Admin only */}
                {hasAdminAccess && (
                    <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                        <p className="text-xs text-theme-secondary">
                            <strong className="text-warning">Note:</strong> Integration notifications require the corresponding service to be configured in the Widgets → Integrations settings. Notifications will only appear when those integrations are enabled and connected.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationSettings;
