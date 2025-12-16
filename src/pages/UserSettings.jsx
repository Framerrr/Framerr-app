import React, { useState, useEffect } from 'react';
import { User, Layout, Settings as SettingsIcon, Users, Cpu, Shield, FolderTree, Puzzle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../utils/permissions';
import { Card } from '../components/common/Card';

// User Settings Components
import UserTabsSettings from '../components/settings/UserTabsSettings';
import CustomizationSettings from '../components/settings/CustomizationSettings';
import ProfileSettings from '../components/settings/ProfileSettings';
import NotificationSettings from '../components/settings/NotificationSettings';

// Admin Settings Components
import UsersSettings from '../components/settings/UsersSettings';
import WidgetsSettings from '../components/settings/WidgetsSettings';
import TabGroupsSettings from '../components/settings/TabGroupsSettings';
import AuthSettings from '../components/settings/AuthSettings';
import AdvancedSettings from '../components/settings/AdvancedSettings';

const UserSettings = () => {
    const [activeTab, setActiveTab] = useState('tabs');
    const { user } = useAuth();

    // Parse query params from hash manually 
    // (useSearchParams doesn't work with hash-based routing!)
    const getHashParams = () => {
        const hash = window.location.hash.slice(1); // Remove '#'
        const questionMarkIndex = hash.indexOf('?');
        if (questionMarkIndex === -1) return new URLSearchParams();
        const queryString = hash.slice(questionMarkIndex + 1);
        return new URLSearchParams(queryString);
    };

    // Read tab from hash query parameter on mount and when hash changes
    useEffect(() => {
        const updateTabFromHash = () => {
            const params = getHashParams();
            const tabFromUrl = params.get('tab');
            if (tabFromUrl) {
                setActiveTab(tabFromUrl);
            }
        };

        updateTabFromHash();
        window.addEventListener('hashchange', updateTabFromHash);
        return () => window.removeEventListener('hashchange', updateTabFromHash);
    }, []);

    // Check if user is admin
    const hasAdminAccess = isAdmin(user);

    // User tabs (always visible)
    const userTabs = [
        { id: 'tabs', label: 'My Tabs', icon: Layout },
        ...(hasAdminAccess ? [{ id: 'tabgroups', label: 'Tab Groups', icon: FolderTree }] : []),
        { id: 'integrations', label: 'Integrations', icon: Puzzle },
        { id: 'customization', label: 'Customization', icon: SettingsIcon },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    // Admin tabs (only for admins)
    const adminTabs = hasAdminAccess ? [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'auth', label: 'Auth', icon: Shield },
        { id: 'advanced', label: 'Advanced', icon: Cpu },
    ] : [];

    // Combined tabs
    const allTabs = [...userTabs, ...adminTabs];

    // Spring config for tab animations
    const tabSpring = {
        type: 'spring',
        stiffness: 350,
        damping: 35,
    };

    // Content transition spring (matching AnimationTest)
    const contentSpring = {
        type: 'spring',
        stiffness: 220,
        damping: 30,
    };

    return (
        <div className="w-full p-4 md:p-8 max-w-[2000px] mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-white">
                    {hasAdminAccess ? 'Settings & Admin' : 'Settings'}
                </h1>
                <p className="text-theme-secondary">
                    {hasAdminAccess
                        ? 'Manage your personal preferences and system configuration'
                        : 'Manage your personal preferences'
                    }
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto scroll-contain-x pb-2 mb-6 border-b border-slate-700">
                {allTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                // Preserve hash-based navigation with query params
                                const params = new URLSearchParams({ tab: tab.id });
                                // Check if there's a source param to preserve
                                const currentParams = getHashParams();
                                const currentSource = currentParams.get('source');
                                if (currentSource) {
                                    params.set('source', currentSource);
                                }
                                window.location.hash = `settings?${params.toString()}`;
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm font-medium relative text-theme-secondary hover:text-theme-primary"
                        >
                            {/* Animated sliding indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="settingsTabIndicator"
                                    className="absolute inset-0 bg-accent rounded-lg"
                                    transition={tabSpring}
                                />
                            )}
                            {/* Icon and text with relative z-index */}
                            <Icon size={16} className={`relative z-10 ${isActive ? 'text-white' : ''}`} />
                            <span className={`relative z-10 ${isActive ? 'text-white font-semibold' : ''}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <Card>
                <AnimatePresence mode="wait">
                    {/* User Settings */}
                    {activeTab === 'tabs' && (
                        <motion.div
                            key="tabs"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={contentSpring}
                        >
                            <UserTabsSettings />
                        </motion.div>
                    )}
                    {activeTab === 'customization' && (
                        <motion.div
                            key="customization"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={contentSpring}
                        >
                            <CustomizationSettings />
                        </motion.div>
                    )}
                    {activeTab === 'profile' && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={contentSpring}
                        >
                            <ProfileSettings />
                        </motion.div>
                    )}
                    {activeTab === 'notifications' && (
                        <motion.div
                            key="notifications"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={contentSpring}
                        >
                            <NotificationSettings />
                        </motion.div>
                    )}
                    {activeTab === 'integrations' && (
                        <motion.div
                            key="integrations"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={contentSpring}
                        >
                            <WidgetsSettings />
                        </motion.div>
                    )}

                    {/* Admin Settings - only render if user has access */}
                    {hasAdminAccess && (
                        <>
                            {activeTab === 'users' && (
                                <motion.div
                                    key="users"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={contentSpring}
                                >
                                    <UsersSettings />
                                </motion.div>
                            )}
                            {activeTab === 'tabgroups' && (
                                <motion.div
                                    key="tabgroups"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={contentSpring}
                                >
                                    <TabGroupsSettings />
                                </motion.div>
                            )}
                            {activeTab === 'auth' && (
                                <motion.div
                                    key="auth"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={contentSpring}
                                >
                                    <AuthSettings />
                                </motion.div>
                            )}
                            {activeTab === 'advanced' && (
                                <motion.div
                                    key="advanced"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={contentSpring}
                                >
                                    <AdvancedSettings />
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </Card>

            {/* Bottom Spacer - Prevents content cutoff */}
            <div style={{ height: '100px' }} className="md:h-32" aria-hidden="true" />
        </div>
    );
};

export default UserSettings;
