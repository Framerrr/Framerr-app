import React, { useState } from 'react';
import { LayoutGrid, Cpu, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import WidgetGallery from './WidgetGallery';
import IntegrationsSettings from './IntegrationsSettings';
import ActiveWidgets from './ActiveWidgets';

/**
 * Widgets Settings - Main wrapper with sub-tabs
 * Sub-tabs: Gallery (browse/add widgets), Integrations (configure services), Active (manage current widgets)
 */
const WidgetsSettings = () => {
    const [activeSubTab, setActiveSubTab] = useState('gallery');

    const subTabs = [
        { id: 'gallery', label: 'Widget Gallery', icon: LayoutGrid },
        { id: 'integrations', label: 'Integrations', icon: Cpu },
        { id: 'active', label: 'Active Widgets', icon: Activity }
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
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-theme-primary">Widgets</h2>
                <p className="text-theme-secondary text-sm">Configure dashboard widgets and service integrations</p>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="mb-6 border-b border-theme">
                <div className="flex gap-1 relative">
                    {subTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeSubTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className="relative px-4 py-2 font-medium transition-colors text-theme-secondary hover:text-theme-primary"
                            >
                                <div className="flex items-center gap-2 relative z-10">
                                    <Icon size={18} className={isActive ? 'text-accent' : ''} />
                                    <span className={isActive ? 'text-accent' : ''}>{tab.label}</span>
                                </div>

                                {/* Animated sliding indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="widgetSubTabIndicator"
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
                        opacity: activeSubTab === 'integrations' ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: activeSubTab === 'integrations' ? 'relative' : 'absolute',
                        visibility: activeSubTab === 'integrations' ? 'visible' : 'hidden',
                        width: '100%',
                        top: 0
                    }}
                >
                    <IntegrationsSettings context="widgets" />
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
            </div>
        </div>
    );
};

export default WidgetsSettings;
