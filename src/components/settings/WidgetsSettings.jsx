import React, { useState } from 'react';
import { LayoutGrid, Cpu, Activity } from 'lucide-react';
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

    return (
        <div className="fade-in">
            {/* Sub-Tab Navigation */}
            <div className="mb-6 border-b border-theme">
                <div className="flex gap-1">
                    {subTabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeSubTab === tab.id
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-theme-secondary hover:text-theme-primary'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon size={18} />
                                    <span>{tab.label}</span>
                                </div>
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
