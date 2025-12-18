import React, { useState, useEffect } from 'react';
import { Plus, Search, AlertCircle, CheckCircle2, Loader, Share2, User } from 'lucide-react';
import { getWidgetsByCategory, getWidgetMetadata } from '../../utils/widgetRegistry';
import axios from 'axios';
import logger from '../../utils/logger';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../utils/permissions';

/**
 * Widget Gallery - Browse and add widgets to dashboard
 * For admins: Shows all widgets, integration status
 * For users: Shows utility widgets + widgets shared by admin
 */
const WidgetGallery = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [integrations, setIntegrations] = useState({});
    const [sharedIntegrations, setSharedIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingWidget, setAddingWidget] = useState(null);
    const { success: showSuccess, error: showError } = useNotifications();
    const { user } = useAuth();
    const hasAdminAccess = isAdmin(user);

    const widgetsByCategory = getWidgetsByCategory();
    const categories = ['all', ...Object.keys(widgetsByCategory)];

    useEffect(() => {
        if (hasAdminAccess) {
            fetchIntegrations();
        } else {
            fetchSharedIntegrations();
        }
    }, [hasAdminAccess]);

    // Admin: fetch all integrations
    const fetchIntegrations = async () => {
        try {
            const response = await axios.get('/api/integrations');
            setIntegrations(response.data.integrations || {});
        } catch (error) {
            logger.error('Failed to fetch integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    // User: fetch only shared integrations
    const fetchSharedIntegrations = async () => {
        try {
            const response = await axios.get('/api/integrations/shared');
            setSharedIntegrations(response.data.integrations || []);
        } catch (error) {
            logger.error('Failed to fetch shared integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    // Check if a widget should be visible to the current user
    const isWidgetVisible = (widget) => {
        // Utility widgets (no integration required) are always visible
        if (!widget.requiresIntegration && !widget.requiresIntegrations) {
            return true;
        }

        // For admins, show all widgets
        if (hasAdminAccess) {
            return true;
        }

        // For regular users, check if integration is shared with them
        const requiredIntegration = widget.requiresIntegration;
        if (requiredIntegration) {
            return sharedIntegrations.some(si => si.name === requiredIntegration);
        }

        // For widgets requiring multiple integrations (like calendar)
        // Show if ANY of the required integrations is shared
        const requiredIntegrations = widget.requiresIntegrations;
        if (requiredIntegrations) {
            return requiredIntegrations.some(req =>
                sharedIntegrations.some(si => si.name === req)
            );
        }

        return false;
    };

    // Get sharedBy info for a widget
    const getSharedByInfo = (widget) => {
        if (hasAdminAccess) return null; // Admins don't need to see this

        const requiredIntegration = widget.requiresIntegration;
        if (requiredIntegration) {
            const shared = sharedIntegrations.find(si => si.name === requiredIntegration);
            return shared?.sharedBy;
        }

        return null;
    };

    const handleAddWidget = async (widgetType) => {
        setAddingWidget(widgetType);

        try {
            const metadata = getWidgetMetadata(widgetType);

            // Fetch current widgets
            const currentResponse = await axios.get('/api/widgets');
            const currentWidgets = currentResponse.data.widgets || [];

            // Build widget config based on role
            let widgetConfig = {
                title: metadata.name
            };

            // For admins: copy full integration config
            if (hasAdminAccess && metadata.requiresIntegration && integrations[metadata.requiresIntegration]) {
                widgetConfig = {
                    ...widgetConfig,
                    enabled: true,
                    ...integrations[metadata.requiresIntegration]
                };
            }
            // For users: inject shared integration config
            else if (!hasAdminAccess && metadata.requiresIntegration) {
                const sharedIntegration = sharedIntegrations.find(
                    si => si.name === metadata.requiresIntegration
                );
                if (sharedIntegration) {
                    widgetConfig = {
                        ...widgetConfig,
                        enabled: true,
                        // Include essential config from shared integration
                        url: sharedIntegration.url,
                        apiKey: sharedIntegration.apiKey
                    };
                }
            }

            // Create new widget with defaults
            const newWidget = {
                id: `widget-${Date.now()}`,
                type: widgetType,
                x: 0,
                y: Infinity, // Adds to bottom
                w: metadata.defaultSize.w,
                h: metadata.defaultSize.h,
                config: widgetConfig
            };

            // Add to widgets array
            const updatedWidgets = [...currentWidgets, newWidget];

            // Save updated widgets
            await axios.put('/api/widgets', { widgets: updatedWidgets });

            // Dispatch event so Dashboard can refresh without full page reload
            window.dispatchEvent(new CustomEvent('widgets-added', {
                detail: { widgetId: newWidget.id, widgetType }
            }));

            showSuccess('Widget Added', `${metadata.name} added to your dashboard! Go to the Dashboard to see it.`);
        } catch (error) {
            logger.error('Failed to add widget:', error);
            showError('Add Failed', 'Failed to add widget. Please try again.');
        } finally {
            setAddingWidget(null);
        }
    };

    // Filter widgets based on visibility and search
    const filteredWidgets = Object.entries(widgetsByCategory).reduce((acc, [category, widgets]) => {
        if (selectedCategory !== 'all' && selectedCategory !== category) {
            return acc;
        }

        const filtered = widgets.filter(widget => {
            // First check visibility based on sharing
            if (!isWidgetVisible(widget)) {
                return false;
            }

            // Then apply search filter
            return (
                widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                widget.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });

        if (filtered.length > 0) {
            acc[category] = filtered;
        }

        return acc;
    }, {});

    // Check if there are ANY visible widgets
    const totalVisibleWidgets = Object.values(filteredWidgets).reduce(
        (sum, widgets) => sum + widgets.length, 0
    );

    if (loading) {
        return <div className="text-center py-16 text-theme-secondary">Loading widgets...</div>;
    }

    // Empty state for non-admin users with no shared widgets
    if (!hasAdminAccess && totalVisibleWidgets === 0 && !searchTerm) {
        return (
            <div className="fade-in text-center py-16">
                <div className="w-16 h-16 bg-theme-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Share2 size={32} className="text-theme-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-2">No Widgets Available</h3>
                <p className="text-theme-secondary max-w-md mx-auto">
                    No widgets have been shared with you yet. Contact your administrator to get access
                    to integration widgets like Plex, Sonarr, or System Status.
                </p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={18} />
                    <input
                        type="text"
                        placeholder="Search widgets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-theme-primary border border-theme rounded-lg text-theme-primary placeholder-theme-tertiary focus:outline-none focus:border-accent"
                    />
                </div>

                {/* Category Filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2.5 bg-theme-primary border border-theme rounded-lg text-theme-primary focus:outline-none focus:border-accent capitalize"
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat} className="capitalize">
                            {cat === 'all' ? 'All Categories' : cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* Widget Grid */}
            {Object.keys(filteredWidgets).length === 0 ? (
                <div className="text-center py-16 text-theme-secondary">
                    <p>No widgets found matching your search.</p>
                </div>
            ) : (
                Object.entries(filteredWidgets).map(([category, widgets]) => (
                    <div key={category} className="mb-8">
                        <h3 className="text-lg font-semibold text-theme-primary mb-4 capitalize flex items-center gap-2">
                            {category}
                            <span className="text-sm text-theme-secondary font-normal">({widgets.length})</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {widgets.map(widget => {
                                const Icon = widget.icon;
                                const isIntegrationRequired = widget.requiresIntegration;
                                const integration = hasAdminAccess && isIntegrationRequired
                                    ? integrations[widget.requiresIntegration]
                                    : null;

                                // Check if integration is ready - handle special cases
                                let isIntegrationReady = !isIntegrationRequired;
                                if (isIntegrationRequired && hasAdminAccess) {
                                    if (widget.requiresIntegration === 'systemstatus') {
                                        // SystemStatus uses backend with glances/custom config
                                        isIntegrationReady = integration?.enabled && (
                                            (integration.backend === 'glances' && integration.glances?.url) ||
                                            (integration.backend === 'custom' && integration.custom?.url) ||
                                            (!integration.backend && integration.url) // legacy
                                        );
                                    } else {
                                        // Standard integrations use url directly
                                        isIntegrationReady = integration?.enabled && integration?.url;
                                    }
                                } else if (isIntegrationRequired && !hasAdminAccess) {
                                    isIntegrationReady = sharedIntegrations.some(si => si.name === widget.requiresIntegration);
                                }
                                const sharedBy = getSharedByInfo(widget);

                                return (
                                    <div
                                        key={widget.type}
                                        className="glass-subtle shadow-medium rounded-xl p-6 border border-theme card-glow"
                                    >
                                        {/* Header */}
                                        <div className="flex items-start gap-4 mb-3">
                                            <div className="p-3 bg-accent/20 rounded-lg">
                                                <Icon size={24} className="text-accent" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-theme-primary mb-1">{widget.name}</h4>
                                                <p className="text-sm text-theme-secondary line-clamp-2">{widget.description}</p>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex items-center gap-2 mb-4 text-xs flex-wrap">
                                            <span className="px-2 py-1 bg-theme-tertiary rounded text-theme-secondary">
                                                {widget.defaultSize.w}x{widget.defaultSize.h}
                                            </span>

                                            {/* Integration status badge (admin view) */}
                                            {hasAdminAccess && isIntegrationRequired && (
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded ${isIntegrationReady
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                    {isIntegrationReady ? (
                                                        <CheckCircle2 size={12} />
                                                    ) : (
                                                        <AlertCircle size={12} />
                                                    )}
                                                    <span>{widget.requiresIntegration}</span>
                                                </div>
                                            )}

                                            {/* Shared by badge (user view) */}
                                            {!hasAdminAccess && sharedBy && (
                                                <div className="flex items-center gap-1 px-2 py-1 rounded bg-info/20 text-info">
                                                    <User size={12} />
                                                    <span>Shared by {sharedBy}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Add Button */}
                                        <button
                                            onClick={() => handleAddWidget(widget.type)}
                                            disabled={addingWidget === widget.type}
                                            className="button-elevated w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-theme-tertiary text-white rounded-lg transition-all font-medium"
                                        >
                                            {addingWidget === widget.type ? (
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
    );
};

export default WidgetGallery;

