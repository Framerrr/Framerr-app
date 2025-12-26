import React, { useState, useEffect } from 'react';
import { Share2, Users, User, Globe, Lock, Trash2, Settings, AlertCircle, LucideIcon } from 'lucide-react';
import { Button } from '../common/Button';
import { useNotifications } from '../../context/NotificationContext';
import logger from '../../utils/logger';
import axios from 'axios';

// Database share record
interface IntegrationShare {
    id: string;
    integrationName: string;
    shareType: 'everyone' | 'user' | 'group';
    shareTarget: string | null;
    sharedBy: string;
    createdAt: string;
}

interface SharedWidget {
    serviceName: string;
    sharingMode: 'everyone' | 'groups' | 'users';
    targets: string[];
    source: 'database' | 'config';
}

/**
 * SharedWidgetsSettings - Admin view of currently shared widgets
 * Allows quick management of shared widgets (change sharing, revoke)
 */
const SharedWidgetsSettings: React.FC = () => {
    const [sharedWidgets, setSharedWidgets] = useState<SharedWidget[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const { success: showSuccess, error: showError } = useNotifications();

    useEffect(() => {
        fetchShares();

        // Listen for integration updates from IntegrationsSettings
        const handleIntegrationsUpdated = (): void => {
            fetchShares();
        };
        window.addEventListener('integrationsUpdated', handleIntegrationsUpdated);

        return () => {
            window.removeEventListener('integrationsUpdated', handleIntegrationsUpdated);
        };
    }, []);

    const fetchShares = async (): Promise<void> => {
        try {
            // Fetch from new database endpoint
            const response = await axios.get<{ shares: Record<string, IntegrationShare[]> }>(
                '/api/integrations/all-shares',
                { withCredentials: true }
            );

            const sharesMap = response.data.shares || {};
            const widgets: SharedWidget[] = [];

            // Convert database shares to display format
            for (const [serviceName, shares] of Object.entries(sharesMap)) {
                if (shares.length === 0) continue;

                // Determine mode from shares
                const hasEveryone = shares.some(s => s.shareType === 'everyone');
                const hasGroups = shares.some(s => s.shareType === 'group');
                const hasUsers = shares.some(s => s.shareType === 'user');

                let sharingMode: 'everyone' | 'groups' | 'users' = 'everyone';
                let targets: string[] = [];

                if (hasEveryone) {
                    sharingMode = 'everyone';
                } else if (hasGroups) {
                    sharingMode = 'groups';
                    targets = shares.filter(s => s.shareType === 'group').map(s => s.shareTarget!);
                } else if (hasUsers) {
                    sharingMode = 'users';
                    targets = shares.filter(s => s.shareType === 'user').map(s => s.shareTarget!);
                }

                widgets.push({ serviceName, sharingMode, targets, source: 'database' });
            }

            setSharedWidgets(widgets);
        } catch (error) {
            logger.error('Error fetching integration shares:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeSharing = async (serviceName: string): Promise<void> => {
        setSaving(true);
        try {
            // Use new DELETE endpoint
            await axios.delete(`/api/integrations/${serviceName}/share`, {
                withCredentials: true
            });

            showSuccess('Sharing Revoked', `${serviceName} is no longer shared with users`);

            // Refresh the list
            await fetchShares();

            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('integrationsUpdated'));
        } catch (error) {
            logger.error('Error revoking sharing:', error);
            showError('Error', 'Failed to revoke sharing');
        } finally {
            setSaving(false);
        }
    };

    const getSharingDescription = (widget: SharedWidget): string => {
        switch (widget.sharingMode) {
            case 'everyone':
                return 'Shared with everyone';
            case 'groups':
                return widget.targets.length > 0
                    ? `Shared with: ${widget.targets.join(', ')}`
                    : 'No groups selected';
            case 'users':
                const userCount = widget.targets.length;
                return `Shared with ${userCount} user${userCount !== 1 ? 's' : ''}`;
            default:
                return '';
        }
    };

    const getSharingIcon = (mode?: string): LucideIcon => {
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
                        const SharingIcon = getSharingIcon(widget.sharingMode);
                        const description = getSharingDescription(widget);

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
                                            <span className="hidden sm:inline">Revoke Access</span>
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
