import React, { useState } from 'react';
import { Search, Plus, AlertCircle, CheckCircle2, Loader, Share2 } from 'lucide-react';
import Modal from '../common/Modal';
import { getWidgetsByCategory, getWidgetMetadata, WidgetMetadata } from '../../utils/widgetRegistry';
import logger from '../../utils/logger';

interface IntegrationConfig {
    enabled?: boolean;
    url?: string;
    backend?: string;
    glances?: { url?: string };
    custom?: { url?: string };
    [key: string]: unknown;
}

interface SharedIntegration {
    name: string;
    sharedBy?: string;
    [key: string]: unknown;
}

export interface AddWidgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddWidget: (widgetType: string) => Promise<void>;
    integrations?: Record<string, IntegrationConfig>;
    isAdmin?: boolean;
    sharedIntegrations?: SharedIntegration[];
}

/**
 * AddWidgetModal - Modal for browsing and adding widgets to dashboard
 * Supports both click-to-add and drag-and-drop interaction
 */
const AddWidgetModal = ({
    isOpen,
    onClose,
    onAddWidget,
    integrations = {},
    isAdmin = false,
    sharedIntegrations = []
}: AddWidgetModalProps): React.JSX.Element | null => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [adding, setAdding] = useState<string | null>(null);

    const widgetsByCategory = getWidgetsByCategory();
    const categories = ['all', ...Object.keys(widgetsByCategory)];

    /**
     * Check if a widget is visible to the current user
     */
    const isWidgetVisible = (widget: WidgetMetadata): boolean => {
        // Admins see all
        if (isAdmin) return true;

        // Utility widgets (no integration required) - always visible
        if (!widget.requiresIntegration && !widget.requiresIntegrations) {
            return true;
        }

        // Single integration widgets - check if shared
        if (widget.requiresIntegration) {
            return sharedIntegrations.some(si => si.name === widget.requiresIntegration);
        }

        // Multi-integration widgets - show if ANY required integration is shared
        if (widget.requiresIntegrations) {
            return widget.requiresIntegrations.some(req =>
                sharedIntegrations.some(si => si.name === req)
            );
        }

        return false;
    };

    /**
     * Get share info for a widget (for badge display)
     */
    const getSharedByInfo = (widget: WidgetMetadata): string | null => {
        if (widget.requiresIntegration) {
            const shared = sharedIntegrations.find(si => si.name === widget.requiresIntegration);
            return shared?.sharedBy || null;
        }

        if (widget.requiresIntegrations) {
            for (const reqIntegrationName of widget.requiresIntegrations) {
                const shared = sharedIntegrations.find(si => si.name === reqIntegrationName);
                if (shared) {
                    return shared.sharedBy || null;
                }
            }
        }

        return null;
    };

    // Filter widgets based on search, category, and permissions
    const filteredWidgets = Object.entries(widgetsByCategory).reduce<Record<string, WidgetMetadata[]>>((acc, [category, widgets]) => {
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

    const handleAddWidget = async (widgetType: string): Promise<void> => {
        setAdding(widgetType);
        try {
            await onAddWidget(widgetType);
        } catch (error) {
            logger.error('Failed to add widget', { error: (error as Error).message, modal: 'AddWidget' });
        } finally {
            setAdding(null);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, widgetType: string): void => {
        e.dataTransfer.setData('widgetType', widgetType);
        e.dataTransfer.effectAllowed = 'copy';

        // Add visual feedback during drag
        (e.currentTarget as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>): void => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
    };

    const footerContent = (
        <p className="text-xs text-theme-tertiary text-center">
            💡 <span className="hidden sm:inline">Tip: </span>Click "Add to Dashboard" or drag widgets directly onto your dashboard
        </p>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div>
                    <h2 className="text-xl font-bold text-theme-primary mb-1">Add Widget</h2>
                    <p className="text-sm text-theme-secondary font-normal">Choose a widget to add to your dashboard</p>
                </div>
            }
            size="xl"
            footer={footerContent}
        >
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 -mt-2">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={18} />
                    <input
                        type="text"
                        placeholder="Search widgets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-theme-tertiary border border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-accent transition-all"
                    />
                </div>

                {/* Category Filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2.5 bg-theme-tertiary border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-accent capitalize transition-all"
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat} className="capitalize">
                            {cat === 'all' ? 'All Categories' : cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* Widget Grid */}
            <div>
                {Object.keys(filteredWidgets).length === 0 ? (
                    <div className="text-center py-16 text-theme-tertiary">
                        <p>No widgets found matching your search.</p>
                    </div>
                ) : (
                    Object.entries(filteredWidgets).map(([category, widgets]) => (
                        <div key={category} className="mb-8 last:mb-0">
                            <h3 className="text-lg font-semibold text-theme-primary mb-4 capitalize flex items-center gap-2">
                                {category}
                                <span className="text-sm text-theme-tertiary font-normal">({widgets.length})</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {widgets.map(widget => {
                                    const Icon = widget.icon;
                                    const isIntegrationRequired = widget.requiresIntegration || widget.requiresIntegrations;
                                    const integration = widget.requiresIntegration ? integrations[widget.requiresIntegration] : null;

                                    // Check if integration is ready - handle special cases
                                    let isIntegrationReady = !isIntegrationRequired;
                                    if (isIntegrationRequired && widget.requiresIntegration) {
                                        if (widget.requiresIntegration === 'systemstatus') {
                                            // SystemStatus uses backend with glances/custom config
                                            isIntegrationReady = !!integration?.enabled && (
                                                (integration.backend === 'glances' && !!integration.glances?.url) ||
                                                (integration.backend === 'custom' && !!integration.custom?.url) ||
                                                (!integration.backend && !!integration.url) // legacy
                                            );
                                        } else {
                                            // Standard integrations use url directly
                                            isIntegrationReady = !!integration?.enabled && !!integration?.url;
                                        }
                                    } else if (isIntegrationRequired && widget.requiresIntegrations) {
                                        // Multi-integration widgets (calendar) - check if any integration is configured
                                        isIntegrationReady = widget.requiresIntegrations.some(intName => {
                                            const intConfig = integrations[intName];
                                            return intConfig?.enabled && intConfig?.url;
                                        });
                                    }

                                    const sharedByInfo = !isAdmin ? getSharedByInfo(widget) : null;

                                    return (
                                        <div
                                            key={widget.type}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, widget.type!)}
                                            onDragEnd={handleDragEnd}
                                            className="glass-subtle rounded-xl p-5 border border-theme hover:border-accent/50 transition-all cursor-grab active:cursor-grabbing"
                                        >
                                            {/* Header */}
                                            <div className="flex items-start gap-4 mb-3">
                                                <div className="p-3 bg-accent/20 rounded-lg flex-shrink-0">
                                                    <Icon size={24} className="text-accent" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-theme-primary mb-1">{widget.name}</h4>
                                                    <p className="text-sm text-theme-secondary line-clamp-2">{widget.description}</p>
                                                </div>
                                            </div>

                                            {/* Info & Badges */}
                                            <div className="flex items-center flex-wrap gap-2 mb-4 text-xs">
                                                <span className="px-2 py-1 bg-theme-tertiary rounded text-theme-secondary">
                                                    {widget.defaultSize.w}x{widget.defaultSize.h}
                                                </span>

                                                {/* Shared by badge for non-admins */}
                                                {sharedByInfo && (
                                                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-info/20 text-info">
                                                        <Share2 size={12} />
                                                        <span>Shared by {sharedByInfo}</span>
                                                    </div>
                                                )}

                                                {/* Integration status - only for admins */}
                                                {isAdmin && isIntegrationRequired && (
                                                    <div className={`flex items-center gap-1 px-2 py-1 rounded ${isIntegrationReady
                                                        ? 'bg-success/20 text-success'
                                                        : 'bg-warning/20 text-warning'
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
                                                onClick={() => handleAddWidget(widget.type!)}
                                                disabled={adding === widget.type}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-all font-medium"
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
        </Modal>
    );
};

export default AddWidgetModal;
