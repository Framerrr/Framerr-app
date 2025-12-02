import React, { useState } from 'react';
import { User, Layout, Settings as SettingsIcon, Users, Cpu, Shield, FolderTree, LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { isAdmin } from '../utils/permissions';
import { Card } from '../components/common/Card';

// User Settings Components
import UserTabsSettings from '../components/settings/UserTabsSettings';
import CustomizationSettings from '../components/settings/CustomizationSettings';
import ProfileSettings from '../components/settings/ProfileSettings';

// Admin Settings Components
import UsersSettings from '../components/settings/UsersSettings';
import WidgetsSettings from '../components/settings/WidgetsSettings';
import TabGroupsSettings from '../components/settings/TabGroupsSettings';
import AuthSettings from '../components/settings/AuthSettings';
import AdvancedSettings from '../components/settings/AdvancedSettings';


const UserSettings = () => {
    const [activeTab, setActiveTab] = useState('tabs');
    const { user } = useAuth();
    const hasAdminAccess = isAdmin(user);

    // User tabs (always visible)
    const userTabs = [
        { id: 'tabs', label: 'My Tabs', icon: Layout },
        ...(hasAdminAccess ? [{ id: 'tabgroups', label: 'Tab Groups', icon: FolderTree }] : []),
        { id: 'customization', label: 'Customization', icon: SettingsIcon },
        { id: 'profile', label: 'Profile', icon: User },
    ];

    // Admin tabs (only for admins)
    const adminTabs = hasAdminAccess ? [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'widgets', label: 'Widgets', icon: LayoutGrid },
        { id: 'auth', label: 'Auth', icon: Shield },
        { id: 'advanced', label: 'Advanced', icon: Cpu },
    ] : [];

    // Combined tabs
    const allTabs = [...userTabs, ...adminTabs];

    return (
        <div className="w-full p-4 md:p-8 max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-white">
                    {hasAdminAccess ? 'Settings & Admin' : 'Settings'}
                </h1>
                <p className="text-slate-400">
                    {hasAdminAccess
                        ? 'Manage your personal preferences and system configuration'
                        : 'Manage your personal preferences'
                    }
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-700">
                {allTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg 
                                transition-all whitespace-nowrap text-sm font-medium
                                ${isActive
                                    ? 'bg-accent text-white font-semibold'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }
                            `}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <Card>
                {/* User Settings */}
                {activeTab === 'tabs' && <UserTabsSettings />}
                {activeTab === 'customization' && <CustomizationSettings />}
                {activeTab === 'profile' && <ProfileSettings />}

                {/* Admin Settings - only render if user has access */}
                {hasAdminAccess && (
                    <>
                        {activeTab === 'users' && <UsersSettings />}
                        {activeTab === 'tabgroups' && <TabGroupsSettings />}
                        {activeTab === 'widgets' && <WidgetsSettings />}
                        {activeTab === 'auth' && <AuthSettings />}
                        {activeTab === 'advanced' && <AdvancedSettings />}
                    </>
                )}
            </Card>
        </div>
    );
};

export default UserSettings;
