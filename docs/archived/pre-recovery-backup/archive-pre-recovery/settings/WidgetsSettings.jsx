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
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">
                    Dashboard Widgets
                </h2>
                <p className="text-slate-400 text-sm">
                    Add widgets to your dashboard and configure service integrations
                </p>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-700">
                {subTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeSubTab === tab.id
                                ? 'border-accent text-accent'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <Icon size={18} className="inline mr-2" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeSubTab === 'gallery' && <WidgetGallery />}
                {activeSubTab === 'integrations' && <IntegrationsSettings context="widgets" />}
                {activeSubTab === 'active' && <ActiveWidgets />}
            </div>
        </div>
    );
};

export default WidgetsSettings;
