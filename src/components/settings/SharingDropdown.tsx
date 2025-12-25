import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Users, User, Globe, Lock, ChevronDown, Check, Loader, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logger from '../../utils/logger';
import { useNotifications } from '../../context/NotificationContext';

export type SharingMode = 'none' | 'everyone' | 'groups' | 'users';

// Current sharing state for display purposes (read from server)
export interface SharingState {
    enabled: boolean;
    mode?: SharingMode;
    groups?: string[];
    users?: string[];
    sharedBy?: string;
    sharedAt?: string;
}

// Share record from database
interface IntegrationShare {
    id: string;
    integrationName: string;
    shareType: 'everyone' | 'user' | 'group';
    shareTarget: string | null;
    sharedBy: string;
    createdAt: string;
}

interface UserInfo {
    id: string;
    username: string;
    displayName?: string;
    group: string;
}

interface DropdownPosition {
    top: number;
    left: number;
    width: number;
}

export interface SharingDropdownProps {
    /** Integration name (e.g., 'plex', 'sonarr') */
    integrationName: string;
    /** Optional callback when sharing changes */
    onSharingChange?: () => void;
    /** Whether dropdown is disabled */
    disabled?: boolean;
    /** @deprecated Use integrationName instead */
    service?: string;
    /** @deprecated No longer needed - sharing is handled via API */
    sharing?: SharingState;
    /** @deprecated Use onSharingChange instead */
    onChange?: (sharing: SharingState) => void;
}

/**
 * SharingDropdown - Widget sharing control for admin
 * 
 * Now uses direct API calls to share/unshare integrations.
 * Sharing is persisted immediately, no need for separate "Save" action.
 */
const SharingDropdown = ({
    integrationName,
    onSharingChange,
    disabled = false,
    // Legacy props for backwards compatibility during transition
    service,
    sharing: legacySharing,
    onChange: legacyOnChange
}: SharingDropdownProps): React.JSX.Element => {
    // Use integrationName or fallback to legacy service prop
    const name = integrationName || service || '';

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const { success: showSuccess, error: showError } = useNotifications();

    // Current sharing state from server
    const [shares, setShares] = useState<IntegrationShare[]>([]);
    const [currentMode, setCurrentMode] = useState<SharingMode>('none');
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // Fetch current shares on mount
    useEffect(() => {
        if (name) {
            fetchCurrentShares();
        }
    }, [name]);

    // Calculate dropdown position when opened
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Fetch users and groups for selection
    useEffect(() => {
        if (isOpen && (currentMode === 'groups' || currentMode === 'users')) {
            fetchUsersAndGroups();
        }
    }, [isOpen, currentMode]);

    const fetchCurrentShares = async (): Promise<void> => {
        try {
            const response = await axios.get<{ shares: IntegrationShare[] }>(
                `/api/integrations/${name}/shares`,
                { withCredentials: true }
            );
            const sharesData = response.data.shares || [];
            setShares(sharesData);

            // Determine current mode from shares
            if (sharesData.length === 0) {
                setCurrentMode('none');
                setSelectedUsers([]);
                setSelectedGroups([]);
            } else if (sharesData.some(s => s.shareType === 'everyone')) {
                setCurrentMode('everyone');
            } else if (sharesData.some(s => s.shareType === 'group')) {
                setCurrentMode('groups');
                setSelectedGroups(sharesData.filter(s => s.shareType === 'group').map(s => s.shareTarget!));
            } else if (sharesData.some(s => s.shareType === 'user')) {
                setCurrentMode('users');
                setSelectedUsers(sharesData.filter(s => s.shareType === 'user').map(s => s.shareTarget!));
            }
        } catch (error) {
            // If 404, integration doesn't exist yet - that's fine
            if (axios.isAxiosError(error) && error.response?.status !== 404) {
                logger.error('Error fetching integration shares:', { error, integration: name });
            }
        }
    };

    const fetchUsersAndGroups = async (): Promise<void> => {
        setLoadingData(true);
        try {
            const usersResponse = await fetch('/api/admin/users', { credentials: 'include' });
            if (usersResponse.ok) {
                const data = await usersResponse.json();
                // Filter out admin users (they always have access)
                setUsers(data.users?.filter((u: UserInfo) => u.group !== 'admin') || []);
                // Extract unique groups from users
                const uniqueGroups = [...new Set<string>(data.users?.map((u: UserInfo) => u.group) || [])];
                setGroups(uniqueGroups.filter(g => g !== 'admin'));
            }
        } catch (error) {
            logger.error('Error fetching users/groups for sharing:', { error });
        } finally {
            setLoadingData(false);
        }
    };

    const handleModeChange = async (mode: SharingMode): Promise<void> => {
        if (mode === currentMode) {
            if (mode !== 'groups' && mode !== 'users') {
                setIsOpen(false);
            }
            return;
        }

        setSaving(true);
        try {
            // First, revoke all existing shares
            await axios.delete(`/api/integrations/${name}/share`, { withCredentials: true });

            // Then create new shares based on mode
            if (mode === 'everyone') {
                await axios.post(`/api/integrations/${name}/share`, {
                    shareType: 'everyone'
                }, { withCredentials: true });
                showSuccess('Sharing Updated', `${name} is now shared with everyone`);
            } else if (mode === 'none') {
                showSuccess('Sharing Revoked', `${name} is no longer shared`);
            }
            // For groups/users, don't close - let user select

            setCurrentMode(mode);
            setSelectedUsers([]);
            setSelectedGroups([]);
            await fetchCurrentShares();

            // Notify parent and dispatch event
            onSharingChange?.();
            legacyOnChange?.({ enabled: mode !== 'none', mode });
            window.dispatchEvent(new CustomEvent('integrationsUpdated'));

            if (mode !== 'groups' && mode !== 'users') {
                setIsOpen(false);
            }
        } catch (error) {
            logger.error('Failed to update sharing:', { error, integration: name });
            showError('Failed', 'Could not update sharing settings');
        } finally {
            setSaving(false);
        }
    };

    const handleGroupToggle = async (group: string): Promise<void> => {
        setSaving(true);
        try {
            const isCurrentlySelected = selectedGroups.includes(group);

            if (isCurrentlySelected) {
                // Remove share for this group
                await axios.delete(`/api/integrations/${name}/share`, {
                    data: { shareType: 'group', targets: [group] },
                    withCredentials: true
                });
                setSelectedGroups(prev => prev.filter(g => g !== group));
            } else {
                // Add share for this group
                await axios.post(`/api/integrations/${name}/share`, {
                    shareType: 'group',
                    targets: [group]
                }, { withCredentials: true });
                setSelectedGroups(prev => [...prev, group]);
            }

            await fetchCurrentShares();
            onSharingChange?.();
            window.dispatchEvent(new CustomEvent('integrationsUpdated'));
        } catch (error) {
            logger.error('Failed to toggle group share:', { error, group, integration: name });
            showError('Failed', 'Could not update group sharing');
        } finally {
            setSaving(false);
        }
    };

    const handleUserToggle = async (userId: string): Promise<void> => {
        setSaving(true);
        try {
            const isCurrentlySelected = selectedUsers.includes(userId);

            if (isCurrentlySelected) {
                // Remove share for this user
                await axios.delete(`/api/integrations/${name}/share`, {
                    data: { shareType: 'user', targets: [userId] },
                    withCredentials: true
                });
                setSelectedUsers(prev => prev.filter(u => u !== userId));
            } else {
                // Add share for this user
                await axios.post(`/api/integrations/${name}/share`, {
                    shareType: 'user',
                    targets: [userId]
                }, { withCredentials: true });
                setSelectedUsers(prev => [...prev, userId]);
            }

            await fetchCurrentShares();
            onSharingChange?.();
            window.dispatchEvent(new CustomEvent('integrationsUpdated'));
        } catch (error) {
            logger.error('Failed to toggle user share:', { error, userId, integration: name });
            showError('Failed', 'Could not update user sharing');
        } finally {
            setSaving(false);
        }
    };

    const getModeLabel = (): string => {
        switch (currentMode) {
            case 'everyone':
                return 'Shared with Everyone';
            case 'groups':
                return selectedGroups.length > 0
                    ? `Shared with ${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''}`
                    : 'Select Groups...';
            case 'users':
                return selectedUsers.length > 0
                    ? `Shared with ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`
                    : 'Select Users...';
            default:
                return 'Not Shared';
        }
    };

    const getModeIcon = (): LucideIcon => {
        switch (currentMode) {
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

    const ModeIcon = getModeIcon();

    // Dropdown content rendered via portal
    const dropdownContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop to close */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Dropdown menu */}
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            zIndex: 9999
                        }}
                        className="bg-theme-secondary border border-theme rounded-lg shadow-lg overflow-hidden"
                    >
                        {/* Mode Options */}
                        <div className="py-1">
                            <button
                                onClick={() => handleModeChange('none')}
                                disabled={saving}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${currentMode === 'none' ? 'bg-theme-tertiary' : ''} ${saving ? 'opacity-50' : ''}`}
                            >
                                <Lock size={16} className="text-theme-secondary" />
                                <span>Not Shared</span>
                                {currentMode === 'none' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('everyone')}
                                disabled={saving}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${currentMode === 'everyone' ? 'bg-theme-tertiary' : ''} ${saving ? 'opacity-50' : ''}`}
                            >
                                <Globe size={16} className="text-info" />
                                <span>Everyone</span>
                                {saving && currentMode !== 'everyone' && <Loader size={14} className="ml-auto animate-spin" />}
                                {currentMode === 'everyone' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('groups')}
                                disabled={saving}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${currentMode === 'groups' ? 'bg-theme-tertiary' : ''} ${saving ? 'opacity-50' : ''}`}
                            >
                                <Users size={16} className="text-warning" />
                                <span>Specific Groups</span>
                                {currentMode === 'groups' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('users')}
                                disabled={saving}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${currentMode === 'users' ? 'bg-theme-tertiary' : ''} ${saving ? 'opacity-50' : ''}`}
                            >
                                <User size={16} className="text-accent" />
                                <span>Specific Users</span>
                                {currentMode === 'users' && <Check size={14} className="ml-auto text-success" />}
                            </button>
                        </div>

                        {/* Groups Selection */}
                        {currentMode === 'groups' && (
                            <div className="border-t border-theme px-4 py-3">
                                <p className="text-xs text-theme-secondary mb-2">Select groups:</p>
                                {loadingData ? (
                                    <p className="text-xs text-theme-tertiary">Loading...</p>
                                ) : groups.length === 0 ? (
                                    <p className="text-xs text-theme-tertiary">No groups available</p>
                                ) : (
                                    <div className="space-y-1">
                                        {groups.map(group => (
                                            <label key={group} className={`flex items-center gap-2 cursor-pointer hover:bg-theme-hover px-2 py-1 rounded ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroups.includes(group)}
                                                    onChange={() => handleGroupToggle(group)}
                                                    disabled={saving}
                                                    className="rounded border-theme text-accent focus:ring-accent"
                                                />
                                                <span className="text-sm capitalize">{group}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Users Selection */}
                        {currentMode === 'users' && (
                            <div className="border-t border-theme px-4 py-3 max-h-48 overflow-y-auto">
                                <p className="text-xs text-theme-secondary mb-2">Select users:</p>
                                {loadingData ? (
                                    <p className="text-xs text-theme-tertiary">Loading...</p>
                                ) : users.length === 0 ? (
                                    <p className="text-xs text-theme-tertiary">No non-admin users available</p>
                                ) : (
                                    <div className="space-y-1">
                                        {users.map(user => (
                                            <label key={user.id} className={`flex items-center gap-2 cursor-pointer hover:bg-theme-hover px-2 py-1 rounded ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => handleUserToggle(user.id)}
                                                    disabled={saving}
                                                    className="rounded border-theme text-accent focus:ring-accent"
                                                />
                                                <span className="text-sm">{user.displayName || user.username}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Done button for multi-select modes */}
                        {(currentMode === 'groups' || currentMode === 'users') && (
                            <div className="border-t border-theme px-4 py-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    disabled={saving}
                                    className="w-full px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent/90 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Done'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative">
            {/* Label */}
            <label className="block text-sm font-medium text-theme-secondary mb-2">
                <div className="flex items-center gap-2">
                    <Share2 size={14} />
                    Share Widget
                </div>
            </label>

            {/* Dropdown Trigger */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || saving}
                className={`
                    w-full flex items-center justify-between gap-2 px-4 py-2.5
                    bg-theme-tertiary border border-theme rounded-lg
                    text-sm text-theme-primary
                    transition-colors
                    ${disabled || saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-hover cursor-pointer'}
                `}
            >
                <div className="flex items-center gap-2">
                    {saving ? (
                        <Loader size={16} className="animate-spin text-accent" />
                    ) : (
                        <ModeIcon size={16} className={currentMode !== 'none' ? 'text-success' : 'text-theme-secondary'} />
                    )}
                    <span>{saving ? 'Saving...' : getModeLabel()}</span>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-theme-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Render dropdown via portal */}
            {createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default SharingDropdown;
