import React, { useState } from 'react';
import { LayoutGrid, Cpu, Activity, Link2, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/permissions';
import WidgetGallery from './WidgetGallery';
import IntegrationsSettings from './IntegrationsSettings';
import ActiveWidgets from './ActiveWidgets';
import LinkedAccountsSettings from './LinkedAccountsSettings';
import SharedWidgetsSettings from './SharedWidgetsSettings';

/**
 * Integrations Settings - Main wrapper with sub-tabs
 * Sub-tabs: 
 *   - Widget Gallery (all users)
 *   - Active Widgets (all users)
 *   - Service Settings (admin only - API keys, URLs)
 *   - My Linked Accounts (all users - link Overseerr username, etc.)
 */
const WidgetsSettings = () => {
    const [activeSubTab, setActiveSubTab] = useState('gallery');
    const { user } = useAuth();
    const hasAdminAccess = isAdmin(user);

    // Build sub-tabs based on permissions
    const subTabs = [
        { id: 'gallery', label: 'Widget Gallery', icon: LayoutGrid, adminOnly: false },
        { id: 'active', label: 'Active Widgets', icon: Activity, adminOnly: false },
        ...(hasAdminAccess ? [
            { id: 'services', label: 'Service Settings', icon: Cpu, adminOnly: true },
            { id: 'shared', label: 'Shared Widgets', icon: Share2, adminOnly: true }
        ] : []),
        { id: 'linked', label: 'My Linked Accounts', icon: Link2, adminOnly: false }
    ];

    // Spring config for sub-tab indicator
    const tabSpring = {
        type: 'spring',
        stiffness: 350,
        damping: 35,
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">Integrations</h2>
                <p className="text-theme-secondary text-sm">
                    {hasAdminAccess
                        ? 'Manage widgets, service connections, and linked accounts'
                        : 'Manage your widgets and linked accounts'
                    }
                </p>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="mb-6 border-b border-theme">
                <div className="flex gap-1 relative overflow-x-auto">
                    {subTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeSubTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className="relative px-4 py-2 font-medium transition-colors text-theme-secondary hover:text-theme-primary whitespace-nowrap"
                            >
                                <div className="flex items-center gap-2 relative z-10">
                                    <Icon size={18} className={isActive ? 'text-accent' : ''} />
                                    <span className={isActive ? 'text-accent' : ''}>{tab.label}</span>
                                </div>

                                {/* Animated sliding indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="integrationsSubTabIndicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                                        transition={tabSpring}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content - Crossfade between tabs */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <div
                    style={{
                        opacity: activeSubTab === 'gallery' ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: activeSubTab === 'gallery' ? 'relative' : 'absolute',
                        visibility: activeSubTab === 'gallery' ? 'visible' : 'hidden',
                        width: '100%',
                        top: 0
                    }}
                >
                    <WidgetGallery />
                </div>

                <div
                    style={{
                        opacity: activeSubTab === 'active' ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: activeSubTab === 'active' ? 'relative' : 'absolute',
                        visibility: activeSubTab === 'active' ? 'visible' : 'hidden',
                        width: '100%',
                        top: 0
                    }}
                >
                    <ActiveWidgets />
                </div>

                {/* Admin-only: Service Settings */}
                {hasAdminAccess && (
                    <div
                        style={{
                            opacity: activeSubTab === 'services' ? 1 : 0,
                            transition: 'opacity 0.3s ease',
                            position: activeSubTab === 'services' ? 'relative' : 'absolute',
                            visibility: activeSubTab === 'services' ? 'visible' : 'hidden',
                            width: '100%',
                            top: 0
                        }}
                    >
                        <IntegrationsSettings />
                    </div>
                )}

                {/* Admin-only: Shared Widgets Management */}
                {hasAdminAccess && (
                    <div
                        style={{
                            opacity: activeSubTab === 'shared' ? 1 : 0,
                            transition: 'opacity 0.3s ease',
                            position: activeSubTab === 'shared' ? 'relative' : 'absolute',
                            visibility: activeSubTab === 'shared' ? 'visible' : 'hidden',
                            width: '100%',
                            top: 0
                        }}
                    >
                        <SharedWidgetsSettings />
                    </div>
                )}

                <div
                    style={{
                        opacity: activeSubTab === 'linked' ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: activeSubTab === 'linked' ? 'relative' : 'absolute',
                        visibility: activeSubTab === 'linked' ? 'visible' : 'hidden',
                        width: '100%',
                        top: 0
                    }}
                >
                    <LinkedAccountsSettings />
                </div>
            </div>
        </div>
    );
};

export default WidgetsSettings;

