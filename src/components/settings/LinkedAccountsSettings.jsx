import React, { useState, useEffect } from 'react';
import { Link2, Save, Loader, CheckCircle2, Star, Info, Tv } from 'lucide-react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import logger from '../../utils/logger';

/**
 * LinkedAccountsSettings - User's linked external service accounts
 * Shows Plex SSO status (read-only) and editable Overseerr username
 * Allows users to link their Overseerr username for notification matching
 */
const LinkedAccountsSettings = () => {
    const { user } = useAuth();
    const { success: showSuccess, error: showError } = useNotifications();

    // Database-stored linked accounts (e.g., Plex via SSO)
    const [dbLinkedAccounts, setDbLinkedAccounts] = useState({});

    // User preference-based linked accounts (editable, e.g., Overseerr)
    const [prefLinkedAccounts, setPrefLinkedAccounts] = useState({
        overseerr: { username: '' }
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load both database-stored links and preference-based links
    useEffect(() => {
        fetchAllLinkedAccounts();
    }, []);

    const fetchAllLinkedAccounts = async () => {
        try {
            // Fetch database-stored linked accounts (Plex SSO, etc.)
            const dbResponse = await fetch('/api/linked-accounts/me', {
                credentials: 'include'
            });
            if (dbResponse.ok) {
                const data = await dbResponse.json();
                setDbLinkedAccounts(data.accounts || {});
            }

            // Fetch user preferences for editable linked accounts
            const prefResponse = await fetch('/api/config/user', {
                credentials: 'include'
            });
            if (prefResponse.ok) {
                const data = await prefResponse.json();
                const accounts = data.preferences?.linkedAccounts || { overseerr: { username: '' } };
                setPrefLinkedAccounts(accounts);
            }
        } catch (error) {
            logger.error('Error fetching linked accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (service, field, value) => {
        setPrefLinkedAccounts(prev => ({
            ...prev,
            [service]: {
                ...prev[service],
                [field]: value
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/config/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    preferences: {
                        linkedAccounts: prefLinkedAccounts
                    }
                })
            });

            if (response.ok) {
                showSuccess('Accounts Linked', 'Your linked accounts have been saved');
                setHasChanges(false);
            } else {
                const error = await response.json();
                showError('Save Failed', error.error || 'Failed to save linked accounts');
            }
        } catch (error) {
            logger.error('Error saving linked accounts:', error);
            showError('Save Failed', 'Failed to save linked accounts');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center py-16 text-theme-secondary">Loading linked accounts...</div>;
    }

    // Check if Plex is linked (from database - SSO login)
    const plexAccount = dbLinkedAccounts.plex;
    const isPlexLinked = !!plexAccount?.linked;

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-theme-primary">
                    My Linked Accounts
                </h2>
                <p className="text-theme-secondary text-sm">
                    Link your external service accounts to receive personalized notifications
                </p>
            </div>

            {/* Info Banner */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                    <Info className="text-info flex-shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-theme-primary">
                        <p className="font-medium mb-1">Why Link Accounts?</p>
                        <p className="text-theme-secondary">
                            When you link your service accounts, Framerr can send you personalized notifications
                            for your requests. For example, link your Overseerr username to receive notifications
                            when your media requests are approved or available.
                        </p>
                    </div>
                </div>
            </div>

            {/* Linked Accounts List */}
            <div className="space-y-4">
                {/* Plex Account (read-only - linked via SSO) */}
                <div className={`glass-subtle shadow-medium rounded-xl p-4 sm:p-6 border ${isPlexLinked ? 'border-success/30' : 'border-theme'} card-glow`}>
                    <div className="flex items-start gap-3 sm:gap-4">
                        {/* Icon - hidden on very small screens when linked */}
                        <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${isPlexLinked ? 'bg-success/20' : 'bg-theme-tertiary'} ${isPlexLinked ? 'hidden xs:block' : ''}`}>
                            <Tv className={isPlexLinked ? 'text-success' : 'text-theme-secondary'} size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-theme-primary">Plex</h3>
                                {isPlexLinked && (
                                    <span className="flex items-center gap-1 text-[10px] sm:text-xs bg-success/20 text-success px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                                        <CheckCircle2 size={10} className="sm:hidden" />
                                        <CheckCircle2 size={12} className="hidden sm:block" />
                                        <span className="hidden sm:inline">Linked via</span> SSO
                                    </span>
                                )}
                            </div>

                            {isPlexLinked ? (
                                <div className="text-sm text-theme-secondary">
                                    <p className="mb-2 hidden sm:block">Your Plex account is automatically linked through Single Sign-On.</p>
                                    <div className="bg-theme-tertiary/50 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                                        <p className="truncate"><span className="text-theme-tertiary">User:</span> <span className="text-theme-primary font-medium">{plexAccount.externalUsername || 'Unknown'}</span></p>
                                        {plexAccount.externalEmail && (
                                            <p className="truncate mt-1"><span className="text-theme-tertiary">Email:</span> <span className="text-theme-primary">{plexAccount.externalEmail}</span></p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs sm:text-sm text-theme-secondary">
                                    Log in with Plex to link your account
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overseerr Account (editable) */}
                <div className="glass-subtle shadow-medium rounded-xl p-6 border border-theme card-glow">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-theme-tertiary rounded-lg">
                            <Star className="text-accent" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-theme-primary mb-1">Overseerr</h3>
                            <p className="text-sm text-theme-secondary mb-4">
                                Link your Overseerr username to receive notifications for your media requests
                            </p>

                            <Input
                                label="Overseerr Username"
                                value={prefLinkedAccounts.overseerr?.username || ''}
                                onChange={(e) => handleFieldChange('overseerr', 'username', e.target.value)}
                                placeholder={isPlexLinked && plexAccount.externalUsername
                                    ? `Often same as Plex: ${plexAccount.externalUsername}`
                                    : 'Your Overseerr username'}
                                helperText={isPlexLinked
                                    ? "Your account is automatically matched using your Plex username. Only enter a value here if automatic matching fails."
                                    : "Enter your Overseerr username to receive personalized notifications. Must match exactly."}
                            />
                        </div>
                    </div>
                </div>

                {/* Placeholder for future integrations */}
                <div className="glass-subtle shadow-medium rounded-xl p-6 border border-theme opacity-50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-theme-tertiary rounded-lg">
                            <Link2 className="text-theme-secondary" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-theme-secondary">More Coming Soon</h3>
                            <p className="text-sm text-theme-tertiary">
                                Additional service linking options will be added in future updates
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    icon={saving ? Loader : Save}
                >
                    {saving ? 'Saving...' : 'Save Linked Accounts'}
                </Button>
            </div>
        </div>
    );
};

export default LinkedAccountsSettings;
