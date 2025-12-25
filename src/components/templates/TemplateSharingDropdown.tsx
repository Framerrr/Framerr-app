/**
 * TemplateSharingDropdown - Template sharing control for admin
 * 
 * Adapted from SharingDropdown.tsx for integration sharing.
 * Allows selecting share mode: Not Shared, Everyone, Specific Groups, Specific Users
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Users, User, Globe, Lock, ChevronDown, Check, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logger from '../../utils/logger';
import WidgetConflictModal, { WidgetConflict } from './WidgetConflictModal';

export type SharingMode = 'none' | 'everyone' | 'groups' | 'users';

export interface TemplateSharingState {
    mode: SharingMode;
    groups: string[];
    users: string[];
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

export interface TemplateSharingDropdownProps {
    templateId: string;
    templateName: string;
    currentShares?: { sharedWith: string }[];
    onShareComplete: () => void;
    onConflictDetected?: (conflicts: WidgetConflict[]) => void;
    disabled?: boolean;
}

/**
 * TemplateSharingDropdown - Template sharing control for admin
 */
const TemplateSharingDropdown: React.FC<TemplateSharingDropdownProps> = ({
    templateId,
    templateName,
    currentShares: initialShares = [],
    onShareComplete,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [loadingShares, setLoadingShares] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Conflict modal state
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [conflicts, setConflicts] = useState<WidgetConflict[]>([]);

    // Fetched shares state
    const [currentShares, setCurrentShares] = useState<{ sharedWith: string }[]>(initialShares);

    // Fetch current shares on mount
    useEffect(() => {
        const fetchShares = async () => {
            setLoadingShares(true);
            try {
                const response = await axios.get<{ shares: { sharedWith: string }[] }>(`/api/templates/${templateId}/shares`);
                const shares = response.data.shares || [];
                setCurrentShares(shares);

                // Update mode and users based on fetched shares
                const isEveryone = shares.some(s => s.sharedWith === 'everyone');
                const userIds = shares.filter(s => s.sharedWith !== 'everyone').map(s => s.sharedWith);

                if (isEveryone) {
                    setSelectedMode('everyone');
                    setSelectedUsers([]);
                } else if (userIds.length > 0) {
                    setSelectedMode('users');
                    setSelectedUsers(userIds);
                } else {
                    setSelectedMode('none');
                    setSelectedUsers([]);
                }
            } catch (error) {
                logger.debug('No shares found or error fetching shares', { error });
                setCurrentShares([]);
            } finally {
                setLoadingShares(false);
            }
        };

        fetchShares();
    }, [templateId]);

    // Current sharing state derived from currentShares
    const isSharedWithEveryone = currentShares.some(s => s.sharedWith === 'everyone');
    const sharedUserIds = currentShares.filter(s => s.sharedWith !== 'everyone').map(s => s.sharedWith);

    const currentMode: SharingMode = isSharedWithEveryone
        ? 'everyone'
        : sharedUserIds.length > 0
            ? 'users'
            : 'none';

    const [selectedMode, setSelectedMode] = useState<SharingMode>('none');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

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

    const fetchUsersAndGroups = async (): Promise<void> => {
        setLoadingData(true);
        try {
            const response = await axios.get<{ users: UserInfo[] }>('/api/admin/users');
            // Filter out admin users (they always have access)
            const nonAdminUsers = response.data.users?.filter(u => u.group !== 'admin') || [];
            setUsers(nonAdminUsers);

            // Extract unique groups
            const uniqueGroups = [...new Set(nonAdminUsers.map(u => u.group))];
            setGroups(uniqueGroups);
        } catch (error) {
            logger.error('Error fetching users for sharing:', { error });
        } finally {
            setLoadingData(false);
        }
    };

    const handleModeChange = (mode: SharingMode): void => {
        setSelectedMode(mode);
        if (mode === 'none') {
            setSelectedUsers([]);
        } else if (mode === 'everyone') {
            setSelectedUsers([]);
        }
    };

    const handleUserToggle = (userId: string): void => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(u => u !== userId)
                : [...prev, userId]
        );
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
            // Check for widget conflicts first
            if (selectedMode !== 'none') {
                const conflictResponse = await axios.post<{ conflicts: WidgetConflict[] }>(
                    `/api/templates/${templateId}/check-conflicts`,
                    {
                        userIds: selectedUsers,
                        shareMode: selectedMode
                    }
                );

                if (conflictResponse.data.conflicts.length > 0) {
                    setConflicts(conflictResponse.data.conflicts);
                    setIsOpen(false); // Close dropdown when showing conflict modal
                    setShowConflictModal(true);
                    setSaving(false);
                    return;
                }
            }

            await executeSharing();
        } catch (error) {
            logger.error('Failed to update template sharing', { error });
        } finally {
            setSaving(false);
        }
    };

    const executeSharing = async (): Promise<void> => {
        // Remove all existing shares
        for (const share of currentShares) {
            await axios.delete(`/api/templates/${templateId}/share/${share.sharedWith}`);
        }

        // Add new shares based on mode
        if (selectedMode === 'everyone') {
            await axios.post(`/api/templates/${templateId}/share`, { sharedWith: 'everyone' });
        } else if (selectedMode === 'users' && selectedUsers.length > 0) {
            for (const userId of selectedUsers) {
                await axios.post(`/api/templates/${templateId}/share`, { sharedWith: userId });
            }
        }

        logger.info('Template sharing updated', { templateId, mode: selectedMode, userCount: selectedUsers.length });
        setIsOpen(false);
        onShareComplete();
    };

    const handleShareWithConflicts = async (): Promise<void> => {
        // User chose to proceed - just share without sharing integrations
        await executeSharing();
        setShowConflictModal(false);
    };

    const handleShareIntegrations = async (): Promise<void> => {
        try {
            // Get current integrations config
            const integrationsResponse = await axios.get<{ integrations: Record<string, unknown> }>('/api/integrations');
            const integrations = integrationsResponse.data.integrations;

            // Update sharing for each conflicted integration
            for (const conflict of conflicts) {
                const integrationConfig = integrations[conflict.integration] as {
                    enabled?: boolean;
                    sharing?: {
                        enabled?: boolean;
                        mode?: 'everyone' | 'groups' | 'users';
                        groups?: string[];
                        users?: string[];
                        sharedBy?: string;
                        sharedAt?: string;
                    };
                } | undefined;

                if (!integrationConfig) continue;

                // Determine new sharing state based on template share mode
                if (selectedMode === 'everyone') {
                    // Share integration with everyone
                    integrations[conflict.integration] = {
                        ...integrationConfig,
                        sharing: {
                            ...integrationConfig.sharing,
                            enabled: true,
                            mode: 'everyone',
                            sharedAt: new Date().toISOString()
                        }
                    };
                } else if (selectedMode === 'users' && selectedUsers.length > 0) {
                    // Add these users to the integration's shared users
                    const existingUsers = integrationConfig.sharing?.users || [];
                    const newUsers = [...new Set([...existingUsers, ...selectedUsers])];

                    integrations[conflict.integration] = {
                        ...integrationConfig,
                        sharing: {
                            ...integrationConfig.sharing,
                            enabled: true,
                            mode: 'users',
                            users: newUsers,
                            sharedAt: new Date().toISOString()
                        }
                    };
                }
            }

            // Save updated integrations
            await axios.put('/api/integrations', { integrations });
            logger.info('Integrations shared with users', {
                integrations: conflicts.map(c => c.integration),
                mode: selectedMode
            });

            // Now share the template
            await executeSharing();
            setShowConflictModal(false);
        } catch (error) {
            logger.error('Failed to share integrations', { error });
        }
    };

    const getModeLabel = (): string => {
        if (selectedMode === 'everyone') return 'Shared with Everyone';
        if (selectedMode === 'users' && selectedUsers.length > 0) {
            return `Shared with ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`;
        }
        if (selectedMode === 'groups') {
            return 'Select Groups...';
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
    const hasChanges = selectedMode !== currentMode ||
        JSON.stringify(selectedUsers.sort()) !== JSON.stringify(sharedUserIds.sort());

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
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${selectedMode === 'none' ? 'bg-theme-tertiary' : ''}`}
                            >
                                <Lock size={16} className="text-theme-secondary" />
                                <span>Not Shared</span>
                                {selectedMode === 'none' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('everyone')}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${selectedMode === 'everyone' ? 'bg-theme-tertiary' : ''}`}
                            >
                                <Globe size={16} className="text-info" />
                                <span>Everyone</span>
                                {selectedMode === 'everyone' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('groups')}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${selectedMode === 'groups' ? 'bg-theme-tertiary' : ''}`}
                            >
                                <Users size={16} className="text-warning" />
                                <span>Specific Groups</span>
                                {selectedMode === 'groups' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('users')}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${selectedMode === 'users' ? 'bg-theme-tertiary' : ''}`}
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
                                                <label key={group} className="flex items-center gap-2 cursor-pointer hover:bg-theme-hover px-2 py-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={() => handleGroupToggle(group)}
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

                        {/* Users Selection */}
                        {selectedMode === 'users' && (
                            <div className="border-t border-theme px-4 py-3 max-h-48 overflow-y-auto">
                                <p className="text-xs text-theme-secondary mb-2">Select users:</p>
                                {loadingData ? (
                                    <p className="text-xs text-theme-tertiary">Loading...</p>
                                ) : users.length === 0 ? (
                                    <p className="text-xs text-theme-tertiary">No non-admin users available</p>
                                ) : (
                                    <div className="space-y-1">
                                        {users.map(user => (
                                            <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-theme-hover px-2 py-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => handleUserToggle(user.id)}
                                                    className="rounded border-theme text-accent focus:ring-accent"
                                                />
                                                <span className="text-sm">{user.displayName || user.username}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Save button */}
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
            {/* Dropdown Trigger */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    flex items-center gap-2 px-3 py-2
                    bg-theme-tertiary border border-theme rounded-lg
                    text-sm text-theme-primary
                    transition-colors
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-hover cursor-pointer'}
                `}
            >
                <Share2 size={14} />
                <ModeIcon size={14} className={selectedMode !== 'none' ? 'text-success' : 'text-theme-secondary'} />
                <span className="hidden sm:inline">{getModeLabel()}</span>
                <ChevronDown
                    size={14}
                    className={`text-theme-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Render dropdown via portal */}
            {createPortal(dropdownContent, document.body)}

            {/* Widget Conflict Modal */}
            <WidgetConflictModal
                isOpen={showConflictModal}
                onClose={() => setShowConflictModal(false)}
                conflicts={conflicts}
                templateName={templateName}
                onShareIntegrations={handleShareIntegrations}
                onProceedWithoutSharing={handleShareWithConflicts}
            />
        </div>
    );
};

export default TemplateSharingDropdown;
