import React, { useState } from 'react';
import { Bug, Wrench, Beaker, Code } from 'lucide-react';

// Import subtab components
import DebugSettings from './advanced/DebugSettings';
import SystemSettings from './advanced/SystemSettings';
import ExperimentalSettings from './advanced/ExperimentalSettings';
import DeveloperSettings from './advanced/DeveloperSettings';


const AdvancedSettings = () => {
    const [activeSubTab, setActiveSubTab] = useState('debug');

    const subTabs = [
        { id: 'debug', label: 'Debug', icon: Bug },
        { id: 'system', label: 'System', icon: Wrench },
        { id: 'experimental', label: 'Experimental', icon: Beaker },
        { id: 'developer', label: 'Developer', icon: Code },
    ];

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">
                    Advanced Settings
                </h2>
                <p className="text-slate-400 text-sm">
                    Debug tools, system monitoring, and experimental features
                </p>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="mb-6 border-b border-slate-700">
                <div className="flex gap-1 overflow-x-auto">
                    {subTabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`button-elevated px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${activeSubTab === tab.id
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
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

            {/* Content */}
            <div>
                {activeSubTab === 'debug' && <DebugSettings />}
                {activeSubTab === 'system' && <SystemSettings />}
                {activeSubTab === 'experimental' && <ExperimentalSettings />}
                {activeSubTab === 'developer' && <DeveloperSettings />}
            </div>
        </div>
    );
};

export default AdvancedSettings;
