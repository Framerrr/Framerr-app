import React, { useState, useEffect } from 'react';
import { Share2, Users, User, Globe, Lock, Trash2, Settings, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { useNotifications } from '../../context/NotificationContext';
import logger from '../../utils/logger';

/**
 * SharedWidgetsSettings - Admin view of currently shared widgets
 * Allows quick management of shared widgets (change sharing, revoke)
 */
const SharedWidgetsSettings = () => {
    const [integrations, setIntegrations] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { success: showSuccess, error: showError } = useNotifications();

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
                setIntegrations(data.integrations || {});
            }
        } catch (error) {
            logger.error('Error fetching integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeSharing = async (serviceName) => {
        setSaving(true);
        try {
            const updatedIntegrations = {
                ...integrations,
                [serviceName]: {
                    ...integrations[serviceName],
                    sharing: { enabled: false }
                }
            };

            const response = await fetch('/api/integrations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ integrations: updatedIntegrations })
            });

            if (response.ok) {
                setIntegrations(updatedIntegrations);
                showSuccess('Sharing Revoked', `${serviceName} is no longer shared with users`);
            } else {
                showError('Failed', 'Could not revoke sharing');
            }
        } catch (error) {
            logger.error('Error revoking sharing:', error);
            showError('Error', 'Failed to revoke sharing');
        } finally {
            setSaving(false);
        }
    };

    // Get list of shared integrations
    const sharedWidgets = Object.entries(integrations)
        .filter(([_, config]) => config.enabled && config.sharing?.enabled)
        .map(([serviceName, config]) => ({
            serviceName,
            ...config
        }));

    const getSharingDescription = (sharing) => {
        if (!sharing?.enabled) return '';

        switch (sharing.mode) {
            case 'everyone':
                return 'Shared with everyone';
            case 'groups':
                const groups = sharing.groups || [];
                return groups.length > 0
                    ? `Shared with: ${groups.join(', ')}`
                    : 'No groups selected';
            case 'users':
                const userCount = sharing.users?.length || 0;
                return `Shared with ${userCount} user${userCount !== 1 ? 's' : ''}`;
            default:
                return '';
        }
    };

    const getSharingIcon = (mode) => {
        switch (mode) {
            case 'everyone':
                return Globe;
            case 'groups':
                return Users;
            case 'users':
                return User;
            default:
                return Lock;
        }
    };

    if (loading) {
        return <div className="text-center py-16 text-theme-secondary">Loading shared widgets...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-theme-primary">
                    Shared Widgets
                </h2>
                <p className="text-theme-secondary text-sm">
                    Manage which integration widgets are shared with your users
                </p>
            </div>

            {sharedWidgets.length === 0 ? (
                // Empty State
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-theme-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Share2 size={32} className="text-theme-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-theme-primary mb-2">
                        No Shared Widgets Yet
                    </h3>
                    <p className="text-theme-secondary max-w-md mx-auto mb-6">
                        You haven't shared any widgets with your users yet.
                        Go to <strong>Service Settings</strong> to configure integrations and share them.
                    </p>
                    <div className="bg-info/10 border border-info/20 rounded-xl p-4 max-w-lg mx-auto">
                        <div className="flex gap-3 text-left">
                            <AlertCircle className="text-info flex-shrink-0 mt-0.5" size={20} />
                            <div className="text-sm">
                                <p className="font-medium text-theme-primary mb-1">How to share widgets</p>
                                <p className="text-theme-secondary">
                                    1. Go to the <strong>Service Settings</strong> tab<br />
                                    2. Configure an integration (e.g., Plex)<br />
                                    3. Use the "Share Widget" dropdown to share it
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Shared Widgets List
                <div className="space-y-4">
                    {sharedWidgets.map(widget => {
                        const SharingIcon = getSharingIcon(widget.sharing?.mode);
                        const description = getSharingDescription(widget.sharing);

                        return (
                            <div
                                key={widget.serviceName}
                                className="glass-subtle shadow-medium rounded-xl p-6 border border-theme card-glow"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-success/20 rounded-lg">
                                            <Share2 size={24} className="text-success" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-theme-primary capitalize">
                                                {widget.serviceName}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-theme-secondary">
                                                <SharingIcon size={14} />
                                                <span>{description}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => handleRevokeSharing(widget.serviceName)}
                                            variant="secondary"
                                            size="sm"
                                            disabled={saving}
                                            className="text-error hover:bg-error/10 border-error/20"
                                            icon={Trash2}
                                        >
                                            Revoke Access
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            {sharedWidgets.length > 0 && (
                <div className="mt-6 text-center text-sm text-theme-secondary">
                    {sharedWidgets.length} widget{sharedWidgets.length !== 1 ? 's' : ''} shared with users
                </div>
            )}
        </div>
    );
};

export default SharedWidgetsSettings;
