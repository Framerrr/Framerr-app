import React, { useState } from 'react';
import { X, Search, Plus, AlertCircle, CheckCircle2, Loader, Share2 } from 'lucide-react';
import { getWidgetsByCategory, getWidgetMetadata } from '../../utils/widgetRegistry';

/**
 * AddWidgetModal - Modal for browsing and adding widgets to dashboard
 * Supports both click-to-add and drag-and-drop interaction
 * 
 * For admins: Shows all widgets
 * For users: Shows utility widgets + widgets whose integration is shared with them
 */
const AddWidgetModal = ({
    isOpen,
    onClose,
    onAddWidget,
    integrations = {},
    isAdmin = false,
    sharedIntegrations = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [adding, setAdding] = useState(null);

    const widgetsByCategory = getWidgetsByCategory();
    const categories = ['all', ...Object.keys(widgetsByCategory)];

    /**
     * Check if a widget is visible to the current user
     * - Admins see all widgets
     * - Users see utility widgets (no integration required)
     * - Users see integration widgets only if shared with them
     */
    const isWidgetVisible = (widget) => {
        // Admins see all
        if (isAdmin) return true;

        // Utility widgets (no integration required) - always visible
        if (!widget.requiresIntegration && !widget.requiresIntegrations) {
            return true;
        }

        // Integration widgets - check if shared
        const requiredIntegration = widget.requiresIntegration || (widget.requiresIntegrations?.[0]);
        if (requiredIntegration) {
            return sharedIntegrations.some(si => si.name === requiredIntegration);
        }

        return false;
    };

    /**
     * Get share info for a widget (for badge display)
     */
    const getSharedByInfo = (widget) => {
        const requiredIntegration = widget.requiresIntegration || (widget.requiresIntegrations?.[0]);
        if (!requiredIntegration) return null;

        const shared = sharedIntegrations.find(si => si.name === requiredIntegration);
        return shared?.sharedBy || null;
    };

    // Filter widgets based on search, category, and permissions
    const filteredWidgets = Object.entries(widgetsByCategory).reduce((acc, [category, widgets]) => {
        if (selectedCategory !== 'all' && selectedCategory !== category) {
            return acc;
        }

        const filtered = widgets.filter(widget => {
            // First check visibility (permissions)
            if (!isWidgetVisible(widget)) return false;

            // Then check search term
            return widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                widget.description.toLowerCase().includes(searchTerm.toLowerCase());
        });

        if (filtered.length > 0) {
            acc[category] = filtered;
        }

        return acc;
    }, {});

    const handleAddWidget = async (widgetType) => {
        setAdding(widgetType);
        try {
            await onAddWidget(widgetType);
        } catch (error) {
            console.error('Failed to add widget', { error: error.message, modal: 'AddWidget' });
        } finally {
            setAdding(null);
        }
    };

    const handleDragStart = (e, widgetType) => {
        e.dataTransfer.setData('widgetType', widgetType);
        e.dataTransfer.effectAllowed = 'copy';

        // Add visual feedback during drag
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-4xl max-h-[90vh] glass-subtle shadow-deep rounded-2xl border border-slate-700/50 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Add Widget</h2>
                        <p className="text-sm text-slate-400">Choose a widget to add to your dashboard</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-slate-700 flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search widgets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-glow w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-accent transition-all"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-accent capitalize transition-all"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat} className="capitalize">
                                {cat === 'all' ? 'All Categories' : cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Widget Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {Object.keys(filteredWidgets).length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <p>No widgets found matching your search.</p>
                        </div>
                    ) : (
                        Object.entries(filteredWidgets).map(([category, widgets]) => (
                            <div key={category} className="mb-8 last:mb-0">
                                <h3 className="text-lg font-semibold text-white mb-4 capitalize flex items-center gap-2">
                                    {category}
                                    <span className="text-sm text-slate-400 font-normal">({widgets.length})</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {widgets.map(widget => {
                                        const Icon = widget.icon;
                                        const isIntegrationRequired = widget.requiresIntegration || widget.requiresIntegrations;
                                        const integration = widget.requiresIntegration ? integrations[widget.requiresIntegration] : null;
                                        const isIntegrationReady = !isIntegrationRequired || (integration?.enabled && integration?.url);
                                        const sharedByInfo = !isAdmin ? getSharedByInfo(widget) : null;

                                        return (
                                            <div
                                                key={widget.type}
                                                draggable={true}
                                                onDragStart={(e) => handleDragStart(e, widget.type)}
                                                onDragEnd={handleDragEnd}
                                                className="glass-subtle shadow-medium rounded-xl p-5 border border-slate-700/50 hover:border-slate-600 transition-all cursor-grab active:cursor-grabbing"
                                            >
                                                {/* Header */}
                                                <div className="flex items-start gap-4 mb-3">
                                                    <div className="p-3 bg-accent/20 rounded-lg flex-shrink-0">
                                                        <Icon size={24} className="text-accent" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-white mb-1">{widget.name}</h4>
                                                        <p className="text-sm text-slate-400 line-clamp-2">{widget.description}</p>
                                                    </div>
                                                </div>

                                                {/* Info & Badges */}
                                                <div className="flex items-center flex-wrap gap-2 mb-4 text-xs">
                                                    <span className="px-2 py-1 bg-slate-700/50 rounded text-slate-300">
                                                        {widget.defaultSize.w}x{widget.defaultSize.h}
                                                    </span>

                                                    {/* Shared by badge for non-admins */}
                                                    {sharedByInfo && (
                                                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                                            <Share2 size={12} />
                                                            <span>Shared by {sharedByInfo}</span>
                                                        </div>
                                                    )}

                                                    {/* Integration status - only for admins */}
                                                    {isAdmin && isIntegrationRequired && (
                                                        <div className={`flex items-center gap-1 px-2 py-1 rounded ${isIntegrationReady
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'bg-amber-500/20 text-amber-400'
                                                            }`}>
                                                            {isIntegrationReady ? (
                                                                <CheckCircle2 size={12} />
                                                            ) : (
                                                                <AlertCircle size={12} />
                                                            )}
                                                            <span>{widget.requiresIntegration || 'Integration'}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Add Button */}
                                                <button
                                                    onClick={() => handleAddWidget(widget.type)}
                                                    disabled={adding === widget.type}
                                                    className="button-elevated w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-slate-600 text-white rounded-lg transition-all font-medium"
                                                >
                                                    {adding === widget.type ? (
                                                        <>
                                                            <Loader size={18} className="animate-spin" />
                                                            <span>Adding...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus size={18} />
                                                            <span>Add to Dashboard</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer hint */}
                <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                    <p className="text-xs text-slate-400 text-center">
                        💡 <span className="hidden sm:inline">Tip: </span>Click "Add to Dashboard" or drag widgets directly onto your dashboard
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AddWidgetModal;
