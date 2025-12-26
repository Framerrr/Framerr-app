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
 * Aligned with TemplateSharingDropdown for consistent UX:
 * - Shows users even in "Everyone" mode (all checked)
 * - Deselecting a user auto-switches to per-user mode
 * - Selecting all users auto-switches to Everyone mode
 * - Explicit Save button (no immediate API calls)
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
    const [loadingShares, setLoadingShares] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const { success: showSuccess, error: showError } = useNotifications();

    // Server state (current shares from database)
    const [shares, setShares] = useState<IntegrationShare[]>([]);

    // Local state for editing (only saved on explicit Save)
    const [selectedMode, setSelectedMode] = useState<SharingMode>('none');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

    // Derived: current mode from server shares
    const serverMode: SharingMode = shares.length === 0
        ? 'none'
        : shares.some(s => s.shareType === 'everyone')
            ? 'everyone'
            : shares.some(s => s.shareType === 'group')
                ? 'groups'
                : 'users';

    const serverUserIds = shares.filter(s => s.shareType === 'user').map(s => s.shareTarget!);
    const serverGroupIds = shares.filter(s => s.shareType === 'group').map(s => s.shareTarget!);

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
                width: Math.max(rect.width, 280)
            });
        }
    }, [isOpen]);

    // Fetch users when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchUsersAndGroups();
        }
    }, [isOpen]);

    const fetchCurrentShares = async (): Promise<void> => {
        setLoadingShares(true);
        try {
            const response = await axios.get<{ shares: IntegrationShare[] }>(
                `/api/integrations/${name}/shares`,
                { withCredentials: true }
            );
            const sharesData = response.data.shares || [];
            setShares(sharesData);

            // Initialize local state from server
            if (sharesData.length === 0) {
                setSelectedMode('none');
                setSelectedUsers([]);
                setSelectedGroups([]);
            } else if (sharesData.some(s => s.shareType === 'everyone')) {
                setSelectedMode('everyone');
                // In everyone mode, we'll show all users as checked (handled in render)
                setSelectedUsers([]);
            } else if (sharesData.some(s => s.shareType === 'group')) {
                setSelectedMode('groups');
                setSelectedGroups(sharesData.filter(s => s.shareType === 'group').map(s => s.shareTarget!));
            } else if (sharesData.some(s => s.shareType === 'user')) {
                setSelectedMode('users');
                setSelectedUsers(sharesData.filter(s => s.shareType === 'user').map(s => s.shareTarget!));
            }
        } catch (error) {
            // If 404, integration doesn't exist yet - that's fine
            if (axios.isAxiosError(error) && error.response?.status !== 404) {
                logger.error('Error fetching integration shares:', { error, integration: name });
            }
        } finally {
            setLoadingShares(false);
        }
    };

    const fetchUsersAndGroups = async (): Promise<void> => {
        setLoadingData(true);
        try {
            const usersResponse = await fetch('/api/admin/users', { credentials: 'include' });
            if (usersResponse.ok) {
                const data = await usersResponse.json();
                // Filter out admin users (they always have access)
                const nonAdminUsers = data.users?.filter((u: UserInfo) => u.group !== 'admin') || [];
                setUsers(nonAdminUsers);
                // Extract unique groups from users
                const uniqueGroups = [...new Set<string>(nonAdminUsers.map((u: UserInfo) => u.group))];
                setGroups(uniqueGroups);
            }
        } catch (error) {
            logger.error('Error fetching users/groups for sharing:', { error });
        } finally {
            setLoadingData(false);
        }
    };

    const handleModeChange = (mode: SharingMode): void => {
        setSelectedMode(mode);
        if (mode === 'none') {
            setSelectedUsers([]);
            setSelectedGroups([]);
        } else if (mode === 'everyone') {
            // In everyone mode, show all users as checked (handled in render)
            setSelectedUsers([]);
        }
    };

    const handleUserToggle = (userId: string): void => {
        // If in Everyone mode and deselecting a user, switch to per-user mode
        if (selectedMode === 'everyone') {
            // Deselecting a user switches to per-user mode with remaining users
            const remainingUsers = users.map(u => u.id).filter(id => id !== userId);
            setSelectedMode('users');
            setSelectedUsers(remainingUsers);
            return;
        }

        setSelectedUsers(prev => {
            const newSelection = prev.includes(userId)
                ? prev.filter(u => u !== userId)
                : [...prev, userId];

            // If all users are now selected, auto-switch to Everyone mode
            const allUserIds = users.map(u => u.id);
            if (allUserIds.length > 0 && newSelection.length === allUserIds.length) {
                setSelectedMode('everyone');
                return []; // Clear since everyone mode
            }

            return newSelection;
        });
    };

    const handleGroupToggle = (group: string): void => {
        // Get all user IDs in this group
        const groupUserIds = users.filter(u => u.group === group).map(u => u.id);
        const allSelected = groupUserIds.every(id => selectedUsers.includes(id));

        if (allSelected) {
            // Deselect all in group
            setSelectedUsers(prev => prev.filter(id => !groupUserIds.includes(id)));
        } else {
            // Select all in group
            setSelectedUsers(prev => [...new Set([...prev, ...groupUserIds])]);
        }
    };

    const handleSave = async (): Promise<void> => {
        setSaving(true);
        try {
            // 1. Remove all existing shares first
            await axios.delete(`/api/integrations/${name}/share`, { withCredentials: true });

            // 2. Add new shares based on selected mode
            if (selectedMode === 'everyone') {
                await axios.post(`/api/integrations/${name}/share`, {
                    shareType: 'everyone'
                }, { withCredentials: true });
                showSuccess('Sharing Updated', `${name} is now shared with everyone`);
            } else if (selectedMode === 'groups' && selectedGroups.length > 0) {
                await axios.post(`/api/integrations/${name}/share`, {
                    shareType: 'group',
                    targets: selectedGroups
                }, { withCredentials: true });
                showSuccess('Sharing Updated', `${name} shared with ${selectedGroups.length} group(s)`);
            } else if (selectedMode === 'users' && selectedUsers.length > 0) {
                await axios.post(`/api/integrations/${name}/share`, {
                    shareType: 'user',
                    targets: selectedUsers
                }, { withCredentials: true });
                showSuccess('Sharing Updated', `${name} shared with ${selectedUsers.length} user(s)`);
            } else {
                showSuccess('Sharing Revoked', `${name} is no longer shared`);
            }

            // 3. Refresh state from server
            await fetchCurrentShares();

            // 4. Notify parent and dispatch event
            onSharingChange?.();
            legacyOnChange?.({ enabled: selectedMode !== 'none', mode: selectedMode });
            window.dispatchEvent(new CustomEvent('integrationsUpdated'));

            setIsOpen(false);
        } catch (error) {
            logger.error('Failed to update sharing:', { error, integration: name });
            showError('Failed', 'Could not update sharing settings');
        } finally {
            setSaving(false);
        }
    };

    // Check if there are unsaved changes
    const hasChanges = (() => {
        if (selectedMode !== serverMode) return true;
        if (selectedMode === 'users') {
            return JSON.stringify(selectedUsers.sort()) !== JSON.stringify(serverUserIds.sort());
        }
        if (selectedMode === 'groups') {
            return JSON.stringify(selectedGroups.sort()) !== JSON.stringify(serverGroupIds.sort());
        }
        return false;
    })();

    const getModeLabel = (): string => {
        if (selectedMode === 'everyone') return 'Shared with Everyone';
        if (selectedMode === 'users' && selectedUsers.length > 0) {
            return `Shared with ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`;
        }
        if (selectedMode === 'groups' && selectedGroups.length > 0) {
            return `Shared with ${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''}`;
        }
        return 'Not Shared';
    };

    const getModeIcon = (): LucideIcon => {
        switch (selectedMode) {
            case 'everyone': return Globe;
            case 'groups': return Users;
            case 'users': return User;
            default: return Lock;
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
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${selectedMode === 'none' ? 'bg-theme-tertiary' : ''} ${saving ? 'opacity-50' : ''}`}
                            >
                                <Lock size={16} className="text-theme-secondary" />
                                <span>Not Shared</span>
                                {selectedMode === 'none' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('everyone')}
                                disabled={saving}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${selectedMode === 'everyone' ? 'bg-theme-tertiary' : ''} ${saving ? 'opacity-50' : ''}`}
                            >
                                <Globe size={16} className="text-info" />
                                <span>Everyone</span>
                                {selectedMode === 'everyone' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('groups')}
                                disabled={saving}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${selectedMode === 'groups' ? 'bg-theme-tertiary' : ''} ${saving ? 'opacity-50' : ''}`}
                            >
                                <Users size={16} className="text-warning" />
                                <span>Specific Groups</span>
                                {selectedMode === 'groups' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('users')}
                                disabled={saving}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${selectedMode === 'users' ? 'bg-theme-tertiary' : ''} ${saving ? 'opacity-50' : ''}`}
                            >
                                <User size={16} className="text-accent" />
                                <span>Specific Users</span>
                                {selectedMode === 'users' && <Check size={14} className="ml-auto text-success" />}
                            </button>
                        </div>

                        {/* Groups Selection */}
                        {selectedMode === 'groups' && (
                            <div className="border-t border-theme px-4 py-3">
                                <p className="text-xs text-theme-secondary mb-2">Select groups:</p>
                                {loadingData ? (
                                    <p className="text-xs text-theme-tertiary">Loading...</p>
                                ) : groups.length === 0 ? (
                                    <p className="text-xs text-theme-tertiary">No groups available</p>
                                ) : (
                                    <div className="space-y-1">
                                        {groups.map(group => {
                                            const groupUserIds = users.filter(u => u.group === group).map(u => u.id);
                                            const allSelected = groupUserIds.every(id => selectedUsers.includes(id));
                                            return (
                                                <label key={group} className={`flex items-center gap-2 cursor-pointer hover:bg-theme-hover px-2 py-1 rounded ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={() => handleGroupToggle(group)}
                                                        disabled={saving}
                                                        className="rounded border-theme text-accent focus:ring-accent"
                                                    />
                                                    <span className="text-sm capitalize">{group}</span>
                                                    <span className="text-xs text-theme-tertiary ml-auto">
                                                        ({groupUserIds.length} user{groupUserIds.length !== 1 ? 's' : ''})
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Users Selection - Show in both 'users' and 'everyone' mode */}
                        {(selectedMode === 'users' || selectedMode === 'everyone') && (
                            <div className="border-t border-theme px-4 py-3 max-h-48 overflow-y-auto">
                                <p className="text-xs text-theme-secondary mb-2">
                                    {selectedMode === 'everyone'
                                        ? 'Shared with all users (deselect to switch to per-user):'
                                        : 'Select users:'}
                                </p>
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
                                                    checked={selectedMode === 'everyone' || selectedUsers.includes(user.id)}
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

                        {/* Save/Cancel buttons */}
                        <div className="border-t border-theme px-4 py-2 flex gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-3 py-1.5 bg-theme-tertiary text-theme-primary text-sm rounded hover:bg-theme-hover"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
                                className="flex-1 px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent/90 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
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
                disabled={disabled || saving || loadingShares}
                className={`
                    w-full flex items-center justify-between gap-2 px-4 py-2.5
                    bg-theme-tertiary border border-theme rounded-lg
                    text-sm text-theme-primary
                    transition-colors
                    ${disabled || saving || loadingShares ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-hover cursor-pointer'}
                `}
            >
                <div className="flex items-center gap-2">
                    {loadingShares ? (
                        <Loader size={16} className="animate-spin text-theme-secondary" />
                    ) : (
                        <ModeIcon size={16} className={selectedMode !== 'none' ? 'text-success' : 'text-theme-secondary'} />
                    )}
                    <span>{loadingShares ? 'Loading...' : getModeLabel()}</span>
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

