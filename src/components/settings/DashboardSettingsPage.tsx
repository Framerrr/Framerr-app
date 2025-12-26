/**
 * DashboardSettingsPage - Main Dashboard settings with sub-tabs
 * 
 * Sub-tabs:
 * - General: Mobile layout mode, reset dashboard
 * - Templates: Create, save current, apply templates
 */

import React, { useState, useRef, useEffect } from 'react';
import { Settings2, Layout, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardManagement from './DashboardManagement';
import TemplateSettings from './TemplateSettings';

type SubTabId = 'general' | 'templates';

interface SubTab {
    id: SubTabId;
    label: string;
    icon: LucideIcon;
}

const DashboardSettingsPage: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<SubTabId>('general');
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

    const subTabs: SubTab[] = [
        { id: 'general', label: 'General', icon: Settings2 },
        { id: 'templates', label: 'Templates', icon: Layout },
    ];

    // Spring config for sub-tab indicator
    const tabSpring = {
        type: 'spring',
        stiffness: 350,
        damping: 35,
    } as const;

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
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">Dashboard</h2>
                <p className="text-theme-secondary text-sm">
                    Manage your dashboard layout and templates
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
                                        layoutId="dashboardSubTabIndicator"
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
                <div style={getTabStyle('general')}>
                    <DashboardManagement />
                </div>

                <div style={getTabStyle('templates')}>
                    <TemplateSettings />
                </div>
            </div>
        </div>
    );
};

export default DashboardSettingsPage;
