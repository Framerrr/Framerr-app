import React, { useState, useRef, useEffect } from 'react';
import { Bug, Wrench, Beaker, Code, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

// Import subtab components
import DebugSettings from './advanced/DebugSettings';
import SystemSettings from './advanced/SystemSettings';
import ExperimentalSettings from './advanced/ExperimentalSettings';
import DeveloperSettings from './advanced/DeveloperSettings';

type SubTabId = 'debug' | 'system' | 'experimental' | 'developer';

interface SubTab {
    id: SubTabId;
    label: string;
    icon: LucideIcon;
}

const AdvancedSettings: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<SubTabId>('debug');

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

    const subTabs: SubTab[] = [
        { id: 'debug', label: 'Debug', icon: Bug },
        { id: 'system', label: 'System', icon: Wrench },
        { id: 'experimental', label: 'Experimental', icon: Beaker },
        { id: 'developer', label: 'Developer', icon: Code },
    ];

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
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">
                    Advanced Settings
                </h2>
                <p className="text-theme-secondary text-sm">
                    Debug tools, system monitoring, and experimental features
                </p>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="mb-6 border-b border-theme">
                <div className="flex gap-1 overflow-x-auto scroll-contain-x relative">
                    {subTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeSubTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                ref={(el) => { subTabRefs.current[tab.id] = el; }}
                                onClick={() => setActiveSubTab(tab.id)}
                                className="relative px-4 py-2 font-medium transition-colors whitespace-nowrap text-theme-secondary hover:text-theme-primary"
                            >
                                <div className="flex items-center gap-2 relative z-10">
                                    <Icon size={18} className={isActive ? 'text-accent' : ''} />
                                    <span className={isActive ? 'text-accent' : ''}>{tab.label}</span>
                                </div>
                                {isActive && (
                                    <motion.div
                                        layoutId="advancedSubTabIndicator"
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
                <div style={getTabStyle('debug')}>
                    <DebugSettings />
                </div>

                <div style={getTabStyle('system')}>
                    <SystemSettings />
                </div>

                <div style={getTabStyle('experimental')}>
                    <ExperimentalSettings />
                </div>

                <div style={getTabStyle('developer')}>
                    <DeveloperSettings />
                </div>
            </div>
        </div>
    );
};

export default AdvancedSettings;
