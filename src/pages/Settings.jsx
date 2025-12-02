import React, { useState } from 'react';
import { Settings as SettingsIcon, Users, Cpu, Palette, Shield, FolderTree } from 'lucide-react';

// Import Settings Components
import UsersSettings from '../components/settings/UsersSettings';
import IntegrationsSettings from '../components/settings/IntegrationsSettings';
import TabGroupsSettings from '../components/settings/TabGroupsSettings';

// Placeholders for future tabs
const PlaceholderTab = ({ name }) => (
    <div className="text-center py-16 text-slate-400">
        <p className="text-lg">{name} settings coming soon...</p>
    </div>
);

const Settings = () => {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'tabgroups', label: 'Tab Groups', icon: FolderTree },
        { id: 'integrations', label: 'Integrations', icon: Cpu },
        { id: 'customization', label: 'Customization', icon: Palette },
        { id: 'auth', label: 'Authentication', icon: Shield },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <header className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 md:gap-4 text-white">
                    <SettingsIcon size={28} className="md:w-8 md:h-8" />
                    Admin Panel
                </h1>
                <p className="text-slate-400 mt-2">
                    Manage users, integrations, and system settings
                </p>
            </header>

            {/* Tab Navigation */}
            <div className="mb-6 md:mb-8 bg-slate-800/30 rounded-xl p-2 overflow-x-auto">
                <div className="flex gap-2 min-w-max md:min-w-0">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap text-sm md:text-base ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white font-semibold'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="mt-6">
                {activeTab === 'users' && <UsersSettings />}
                {activeTab === 'tabgroups' && <TabGroupsSettings />}
                {activeTab === 'integrations' && <IntegrationsSettings />}
                {activeTab === 'customization' && <PlaceholderTab name="Customization" />}
                {activeTab === 'auth' && <PlaceholderTab name="Authentication" />}
            </div>
        </div>
    );
};

export default Settings;
