import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Cpu, Activity, Link2, Share2, Smartphone, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/permissions';
import WidgetGallery from './WidgetGallery';
import IntegrationsSettings from './IntegrationsSettings';
import ActiveWidgets from './ActiveWidgets';
import LinkedAccountsSettings from './LinkedAccountsSettings';
import SharedWidgetsSettings from './SharedWidgetsSettings';
import DashboardManagement from './DashboardManagement';

type SubTabId = 'gallery' | 'active' | 'dashboard' | 'services' | 'shared' | 'linked';

interface SubTab {
    id: SubTabId;
    label: string;
    icon: LucideIcon;
    adminOnly: boolean;
}

/**
 * Integrations Settings - Main wrapper with sub-tabs
 * Sub-tabs: 
 *   - Widget Gallery (all users)
 *   - Active Widgets (all users)
 *   - Service Settings (admin only - API keys, URLs)
 *   - My Linked Accounts (all users - link Overseerr username, etc.)
 */
const WidgetsSettings: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<SubTabId>('gallery');
    const { user } = useAuth();
    const hasAdminAccess = isAdmin(user);

    // Refs for auto-scrolling sub-tab buttons into view
    const subTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Scroll active sub-tab into view when it changes
    useEffect(() => {
        const tabButton = subTabRefs.current[activeSubTab];
        if (tabButton) {
            tabButton.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeSubTab]);

    // Build sub-tabs based on permissions
    const subTabs: SubTab[] = [
        { id: 'gallery', label: 'Widget Gallery', icon: LayoutGrid, adminOnly: false },
        { id: 'active', label: 'Active Widgets', icon: Activity, adminOnly: false },
        { id: 'dashboard', label: 'Dashboard', icon: Smartphone, adminOnly: false },
        ...(hasAdminAccess ? [
            { id: 'services' as const, label: 'Service Settings', icon: Cpu, adminOnly: true },
            { id: 'shared' as const, label: 'Shared Widgets', icon: Share2, adminOnly: true }
        ] : []),
        { id: 'linked', label: 'My Linked Accounts', icon: Link2, adminOnly: false }
    ];

    // Spring config for sub-tab indicator
    const tabSpring = {
        type: 'spring',
        stiffness: 350,
        damping: 35,
    };

    const getTabStyle = (tabId: SubTabId): React.CSSProperties => ({
        opacity: activeSubTab === tabId ? 1 : 0,
        transition: 'opacity 0.3s ease',
        position: activeSubTab === tabId ? 'relative' : 'absolute',
        visibility: activeSubTab === tabId ? 'visible' : 'hidden',
        width: '100%',
        top: 0
    });

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
                <div className="flex gap-1 relative overflow-x-auto scroll-contain-x">
                    {subTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeSubTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                ref={(el) => { subTabRefs.current[tab.id] = el; }}
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
                <div style={getTabStyle('gallery')}>
                    <WidgetGallery />
                </div>

                <div style={getTabStyle('active')}>
                    <ActiveWidgets />
                </div>

                <div style={getTabStyle('dashboard')}>
                    <DashboardManagement />
                </div>

                {/* Admin-only: Service Settings */}
                {hasAdminAccess && (
                    <div style={getTabStyle('services')}>
                        <IntegrationsSettings />
                    </div>
                )}

                {/* Admin-only: Shared Widgets Management */}
                {hasAdminAccess && (
                    <div style={getTabStyle('shared')}>
                        <SharedWidgetsSettings />
                    </div>
                )}

                <div style={getTabStyle('linked')}>
                    <LinkedAccountsSettings />
                </div>
            </div>
        </div>
    );
};

export default WidgetsSettings;
