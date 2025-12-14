import React, { useState, useEffect } from 'react';
import { Link2, Save, Loader, CheckCircle2, AlertCircle, Star, Info } from 'lucide-react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import logger from '../../utils/logger';

/**
 * LinkedAccountsSettings - User's linked external service accounts
 * Allows users to link their Overseerr username for notification matching
 */
const LinkedAccountsSettings = () => {
    const { user } = useAuth();
    const { success: showSuccess, error: showError } = useNotifications();

    const [linkedAccounts, setLinkedAccounts] = useState({
        overseerr: { username: '' }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load user's linked accounts from preferences
    useEffect(() => {
        fetchLinkedAccounts();
    }, []);

    const fetchLinkedAccounts = async () => {
        try {
            const response = await fetch('/api/config/user', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                // Extract linked accounts from preferences
                const accounts = data.preferences?.linkedAccounts || { overseerr: { username: '' } };
                setLinkedAccounts(accounts);
            }
        } catch (error) {
            logger.error('Error fetching linked accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (service, field, value) => {
        setLinkedAccounts(prev => ({
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
                        linkedAccounts
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
                {/* Overseerr Account */}
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
                                value={linkedAccounts.overseerr?.username || ''}
                                onChange={(e) => handleFieldChange('overseerr', 'username', e.target.value)}
                                placeholder="Your Overseerr username"
                                helperText="This should match your username in Overseerr exactly"
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
