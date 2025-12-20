import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Users, User, Globe, Lock, ChevronDown, Check, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../../utils/logger';

type SharingMode = 'none' | 'everyone' | 'groups' | 'users';

interface SharingState {
    enabled: boolean;
    mode?: SharingMode;
    groups?: string[];
    users?: string[];
    sharedBy?: string;
    sharedAt?: string;
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
    service: string;
    sharing?: SharingState;
    onChange: (sharing: SharingState) => void;
    disabled?: boolean;
}

/**
 * SharingDropdown - Widget sharing control for admin
 * Allows selecting share mode: Not Shared, Everyone, Specific Groups, Specific Users
 */
const SharingDropdown = ({
    service,
    sharing,
    onChange,
    disabled = false
}: SharingDropdownProps): React.JSX.Element => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(false);
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Current sharing state (defaults to not shared)
    const currentMode: SharingMode = sharing?.enabled ? (sharing.mode || 'none') : 'none';
    const selectedGroups = sharing?.groups || [];
    const selectedUsers = sharing?.users || [];

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

    const fetchUsersAndGroups = async (): Promise<void> => {
        setLoadingData(true);
        try {
            // Fetch users from admin API
            const usersResponse = await fetch('/api/admin/users', { credentials: 'include' });
            if (usersResponse.ok) {
                const data = await usersResponse.json();
                // Filter out admin users (they always have access)
                setUsers(data.users?.filter((u: UserInfo) => u.group !== 'admin') || []);

                // Extract unique groups from users
                const uniqueGroups = [...new Set<string>(data.users?.map((u: UserInfo) => u.group) || [])];
                // Admin always has access, so only show non-admin groups
                setGroups(uniqueGroups.filter(g => g !== 'admin'));
            }
        } catch (error) {
            logger.error('Error fetching users/groups for sharing:', { error });
        } finally {
            setLoadingData(false);
        }
    };

    const handleModeChange = (mode: SharingMode): void => {
        onChange({
            enabled: mode !== 'none',
            mode: mode === 'none' ? undefined : mode,
            groups: mode === 'groups' ? selectedGroups : undefined,
            users: mode === 'users' ? selectedUsers : undefined,
            sharedBy: sharing?.sharedBy,
            sharedAt: mode !== 'none' && !sharing?.enabled ? new Date().toISOString() : sharing?.sharedAt
        });

        if (mode !== 'groups' && mode !== 'users') {
            setIsOpen(false);
        }
    };

    const handleGroupToggle = (group: string): void => {
        const newGroups = selectedGroups.includes(group)
            ? selectedGroups.filter(g => g !== group)
            : [...selectedGroups, group];

        onChange({
            ...sharing,
            enabled: newGroups.length > 0,
            mode: 'groups',
            groups: newGroups
        });
    };

    const handleUserToggle = (userId: string): void => {
        const newUsers = selectedUsers.includes(userId)
            ? selectedUsers.filter(u => u !== userId)
            : [...selectedUsers, userId];

        onChange({
            ...sharing,
            enabled: newUsers.length > 0,
            mode: 'users',
            users: newUsers
        });
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
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${currentMode === 'none' ? 'bg-theme-tertiary' : ''}`}
                            >
                                <Lock size={16} className="text-theme-secondary" />
                                <span>Not Shared</span>
                                {currentMode === 'none' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('everyone')}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${currentMode === 'everyone' ? 'bg-theme-tertiary' : ''}`}
                            >
                                <Globe size={16} className="text-info" />
                                <span>Everyone</span>
                                {currentMode === 'everyone' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('groups')}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${currentMode === 'groups' ? 'bg-theme-tertiary' : ''}`}
                            >
                                <Users size={16} className="text-warning" />
                                <span>Specific Groups</span>
                                {currentMode === 'groups' && <Check size={14} className="ml-auto text-success" />}
                            </button>

                            <button
                                onClick={() => handleModeChange('users')}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-theme-hover ${currentMode === 'users' ? 'bg-theme-tertiary' : ''}`}
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
                                            <label key={group} className="flex items-center gap-2 cursor-pointer hover:bg-theme-hover px-2 py-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroups.includes(group)}
                                                    onChange={() => handleGroupToggle(group)}
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

                        {/* Done button for multi-select modes */}
                        {(currentMode === 'groups' || currentMode === 'users') && (
                            <div className="border-t border-theme px-4 py-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent/90"
                                >
                                    Done
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
                disabled={disabled}
                className={`
          w-full flex items-center justify-between gap-2 px-4 py-2.5
          bg-theme-tertiary border border-theme rounded-lg
          text-sm text-theme-primary
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-theme-hover cursor-pointer'}
        `}
            >
                <div className="flex items-center gap-2">
                    <ModeIcon size={16} className={currentMode !== 'none' ? 'text-success' : 'text-theme-secondary'} />
                    <span>{getModeLabel()}</span>
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
