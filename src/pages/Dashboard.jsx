import React, { useState, useEffect, Suspense } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Edit, Save, X as XIcon, Plus } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import WidgetWrapper from '../components/widgets/WidgetWrapper';
import WidgetErrorBoundary from '../components/widgets/WidgetErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyDashboard from '../components/dashboard/EmptyDashboard';
import { getWidgetComponent, getWidgetIcon, getWidgetMetadata } from '../utils/widgetRegistry';
import { generateAllMobileLayouts, migrateWidgetToLayouts } from '../utils/layoutUtils';
import AddWidgetModal from '../components/dashboard/AddWidgetModal';
import DebugOverlay from '../components/debug/DebugOverlay';
import axios from 'axios';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/GridLayout.css';
import logger from '../utils/logger';
import { useNotifications } from '../context/NotificationContext';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard = () => {
    const { user } = useAuth();
    const { warning: showWarning, error: showError } = useNotifications();

    // State
    const [widgets, setWidgets] = useState([]);
    const [layouts, setLayouts] = useState({
        lg: [],
        sm: []
    });
    const [editMode, setEditMode] = useState(false);
    const [isGlobalDragEnabled, setGlobalDragEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalLayout, setOriginalLayout] = useState([]);
    const [greetingEnabled, setGreetingEnabled] = useState(true);
    const [greetingText, setGreetingText] = useState('Your personal dashboard');
    const [showAddModal, setShowAddModal] = useState(false);
    const [integrations, setIntegrations] = useState({});
    const [widgetVisibility, setWidgetVisibility] = useState({}); // Track widget visibility: {widgetId: boolean}
    const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
    const [debugOverlayEnabled, setDebugOverlayEnabled] = useState(false); // Toggle for debug overlay (can be controlled from settings)
    const [editDisclaimerDismissed, setEditDisclaimerDismissed] = useState(false);

    // Load edit disclaimer preference from user config
    useEffect(() => {
        const loadUserPreferences = async () => {
            try {
                const response = await axios.get('/api/config/user', { withCredentials: true });
                if (response.data?.preferences?.editDisclaimerDismissed) {
                    setEditDisclaimerDismissed(true);
                }
            } catch (error) {
                logger.debug('Could not load user preferences for disclaimer:', error.message);
            }
        };
        loadUserPreferences();
    }, []);

    // Handle widget visibility changes (called by widgets that support hideWhenEmpty)
    const handleWidgetVisibilityChange = (widgetId, isVisible) => {
        setWidgetVisibility(prev => ({
            ...prev,
            [widgetId]: isVisible
        }));
    };

    // Grid configuration - memoized to prevent recreation on every render
    const gridConfig = React.useMemo(() => ({
        className: "layout",
        cols: { lg: 24, md: 24, sm: 2 },
        breakpoints: { lg: 1024, md: 672, sm: 0 },
        rowHeight: 100,
        compactType: currentBreakpoint === 'sm' ? null : 'vertical',
        preventCollision: false,
        isDraggable: editMode && isGlobalDragEnabled,
        isResizable: editMode && isGlobalDragEnabled,
        margin: [16, 16],
        containerPadding: [0, 0],
        onBreakpointChange: (breakpoint) => setCurrentBreakpoint(breakpoint)
    }), [editMode, currentBreakpoint, isGlobalDragEnabled]);

    // Helper: Apply minW/minH/maxH from widget metadata to layout items
    const enrichLayoutWithConstraints = (widget, layoutItem) => {
        const metadata = getWidgetMetadata(widget.type);
        if (!metadata) return layoutItem;

        const enriched = { ...layoutItem };

        // Apply minSize constraints
        if (metadata.minSize) {
            if (metadata.minSize.w !== undefined) {
                enriched.minW = metadata.minSize.w;
            }
            if (metadata.minSize.h !== undefined) {
                let minH = metadata.minSize.h;

                // Header-aware sizing: Reduce minH by 1 when header is hidden
                // Header takes approximately 1 row of vertical space
                const showHeader = widget.config?.showHeader !== false;
                if (!showHeader && minH > 1) {
                    minH = minH - 1;
                }

                // Safety: Never allow minH to drop below 1
                minH = Math.max(minH, 1);

                enriched.minH = minH;
            }
        }

        // Apply maxSize constraints
        if (metadata.maxSize) {
            if (metadata.maxSize.w !== undefined) enriched.maxW = metadata.maxSize.w;
            if (metadata.maxSize.h !== undefined) enriched.maxH = metadata.maxSize.h;
        }

        return enriched;
    };

    useEffect(() => {
        fetchWidgets();
        fetchIntegrations();
        loadUserPreferences();
        loadDebugOverlaySetting();
    }, []);

    // Listen for greeting updates from settings
    useEffect(() => {
        const handleGreetingUpdate = (event) => {
            const { enabled, text } = event.detail || {};
            if (enabled !== undefined) setGreetingEnabled(enabled);
            if (text !== undefined) setGreetingText(text);
        };

        window.addEventListener('greetingUpdated', handleGreetingUpdate);
        return () => window.removeEventListener('greetingUpdated', handleGreetingUpdate);
    }, []);

    // Listen for widget config updates (from individual widgets)
    useEffect(() => {
        const handleWidgetConfigUpdate = async (event) => {
            const { widgetId } = event.detail || {};
            if (!widgetId) return;

            try {
                // Fetch updated widget data
                const response = await axios.get('/api/widgets');
                const allWidgets = response.data.widgets || [];
                const updatedWidget = allWidgets.find(w => w.id === widgetId);

                if (!updatedWidget) {
                    logger.warn('Widget not found in response:', widgetId);
                    return;
                }

                // Ensure widget has layouts - if not, keep existing layouts
                if (!updatedWidget.layouts || !updatedWidget.layouts.lg) {
                    logger.warn('Updated widget missing layouts, keeping existing');
                    // Just update the widget config without changing layouts
                    setWidgets(prev => prev.map(w =>
                        w.id === widgetId ? { ...w, config: updatedWidget.config } : w
                    ));
                    return;
                }

                // Update widget in state (targeted re-render)
                setWidgets(prev => prev.map(w =>
                    w.id === widgetId ? updatedWidget : w
                ));

                // Update layouts for this widget
                setLayouts(prev => ({
                    lg: prev.lg.map(l => l.i === widgetId ? enrichLayoutWithConstraints(updatedWidget, { i: widgetId, ...updatedWidget.layouts.lg }) : l),
                    sm: prev.sm.map(l => l.i === widgetId && updatedWidget.layouts.sm ? { i: widgetId, ...updatedWidget.layouts.sm } : l)
                }));

                logger.debug('Widget refreshed:', widgetId);
            } catch (error) {
                logger.error('Failed to refresh widget:', error);
            }
        };

        window.addEventListener('widget-config-updated', handleWidgetConfigUpdate);
        return () => window.removeEventListener('widget-config-updated', handleWidgetConfigUpdate);
    }, []);

    // Listen for widget modifications from LinkGrid (e.g., link changes)
    useEffect(() => {
        const handleWidgetsModified = (event) => {
            const { widgets: modifiedWidgets } = event.detail || {};
            if (!modifiedWidgets) return;

            // Update widgets state
            setWidgets(modifiedWidgets);

            // Mark as having unsaved changes
            setHasUnsavedChanges(true);
        };

        window.addEventListener('widgets-modified', handleWidgetsModified);
        return () => window.removeEventListener('widgets-modified', handleWidgetsModified);
    }, []);

    // Dynamically recompact mobile layouts when widget visibility changes
    useEffect(() => {
        if (!widgets.length) return;

        // Only run for breakpoints that use sorted stacked layouts (not lg)
        const isSorted = currentBreakpoint !== 'lg';
        if (!isSorted) return;

        logger.debug('Visibility recompaction triggered', { breakpoint: currentBreakpoint });

        // Determine column count for current breakpoint
        const cols = currentBreakpoint === 'sm' || currentBreakpoint === 'xs' ? 2 : 24; // sm/xs=2 (full width), md/lg=24
        const breakpoint = currentBreakpoint;

        logger.debug('Recompacting layouts', { breakpoint, cols, visibility: widgetVisibility });

        // Get widgets in sorted order with current layouts
        // Sort by mobile layout Y position (already has correct column-first order from generateMobileLayout)
        let currentY = 0;
        const compactedLayouts = widgets
            .map(w => ({
                widget: w,
                layout: w.layouts?.[breakpoint] || layouts[breakpoint]?.find(l => l.i === w.id),
                isHidden: widgetVisibility[w.id] === false
            }))
            .filter(item => item.layout)
            .sort((a, b) => a.layout.y - b.layout.y) // Use mobile layout Y (maintains column-first order)
            .map(({ widget, layout, isHidden }) => {
                const height = isHidden ? 0.001 : layout.h;
                logger.debug(`Widget recompaction: ${widget.type}`, { hidden: isHidden, originalY: layout.y, newY: currentY, height });

                const compacted = { i: widget.id, x: 0, y: currentY, w: cols, h: height };
                currentY += height;
                return compacted;
            });

        logger.debug('Layouts compacted', {
            breakpoint,
            order: compactedLayouts.map(l => widgets.find(w => w.id === l.i)?.type),
            count: compactedLayouts.length
        });

        setLayouts(prev => ({
            ...prev,
            [breakpoint]: compactedLayouts
        }));
    }, [widgetVisibility, currentBreakpoint, widgets]);

    const loadUserPreferences = async () => {
        try {
            const response = await axios.get('/api/config/user', {
                withCredentials: true
            });

            if (response.data?.preferences?.dashboardGreeting) {
                const greeting = response.data.preferences.dashboardGreeting;
                setGreetingEnabled(greeting.enabled ?? true);
                setGreetingText(greeting.text || 'Your personal dashboard');
            }
        } catch (error) {
            logger.error('Failed to load user preferences:', error);
        }
    };

    const loadDebugOverlaySetting = async () => {
        try {
            const response = await axios.get('/api/system/config');
            if (response.data.config?.debug) {
                // Set to actual value (true or false), default to false
                setDebugOverlayEnabled(response.data.config.debug.overlayEnabled || false);
            }
        } catch (error) {
            // Silently fail - debug overlay is optional
            logger.debug('Failed to load debug overlay setting:', error);
        }
    };

    const fetchIntegrations = async () => {
        try {
            const response = await axios.get('/api/integrations');
            setIntegrations(response.data.integrations || {});
        } catch (error) {
            logger.error('Failed to fetch integrations:', error);
        }
    };

    const fetchWidgets = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/widgets');

            let fetchedWidgets = response.data.widgets || [];

            // Migrate old format + generate mobile layouts
            fetchedWidgets = fetchedWidgets.map(w => migrateWidgetToLayouts(w));

            // Migrate hideHeader to showHeader (reverse logic)
            fetchedWidgets = fetchedWidgets.map(w => ({
                ...w,
                config: {
                    ...w.config,
                    // Convert hideHeader (true = hidden) to showHeader (true = shown)
                    // If hideHeader exists and is true, set showHeader to false
                    // Otherwise default to true (headers shown by default)
                    showHeader: w.config?.hideHeader ? false : (w.config?.showHeader !== false)
                }
            }));

            // Strip existing mobile layouts to force regeneration with new algorithm
            fetchedWidgets = fetchedWidgets.map(w => ({
                ...w,
                layouts: {
                    lg: w.layouts.lg  // Keep only desktop layout
                }
            }));

            fetchedWidgets = generateAllMobileLayouts(fetchedWidgets);

            setWidgets(fetchedWidgets);

            // Convert to react-grid-layout format for all breakpoints
            const initialLayouts = {
                lg: fetchedWidgets.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts.lg })),
                sm: fetchedWidgets.map(w => ({ i: w.id, ...w.layouts.sm }))
            };

            setLayouts(initialLayouts);
            setOriginalLayout(JSON.parse(JSON.stringify(fetchedWidgets)));
        } catch (error) {
            logger.error('Failed to load widgets:', error);
            setWidgets([]);
            setLayouts({ lg: [], sm: [] });
        } finally {
            setLoading(false);
        }
    };

    // Handle layout changes (drag/resize)
    const handleLayoutChange = (newLayout) => {
        if (!editMode) return;

        // Mark as having unsaved changes immediately (for all breakpoints)
        setHasUnsavedChanges(true);

        // Only process layout changes for lg (desktop) breakpoint
        // md/sm/xs/xxs layouts are auto-generated and managed by visibility useEffect
        if (currentBreakpoint !== 'lg') {
            return;
        }

        // Update widgets with new desktop (lg) positions
        const updatedWidgets = widgets.map(widget => {
            const layoutItem = newLayout.find(l => l.i === widget.id);
            if (layoutItem) {
                return {
                    ...widget,
                    // Old format (for backward compatibility)
                    x: layoutItem.x,
                    y: layoutItem.y,
                    w: layoutItem.w,
                    h: layoutItem.h,
                    // New format (for multi-breakpoint)
                    layouts: {
                        ...widget.layouts,
                        lg: {
                            x: layoutItem.x,
                            y: layoutItem.y,
                            w: layoutItem.w,
                            h: layoutItem.h
                        }
                    }
                };
            }
            return widget;
        });

        // Auto-generate mobile layouts from updated desktop layout
        const withMobileLayouts = generateAllMobileLayouts(updatedWidgets);

        setWidgets(withMobileLayouts);
        setLayouts({
            lg: newLayout,
            sm: withMobileLayouts.map(w => ({ i: w.id, ...w.layouts.sm }))
        });
    };

    // Save changes to API
    const handleSave = async () => {
        try {
            setSaving(true);
            await axios.put('/api/widgets', { widgets });

            // Create deep copy for originalLayout (used by Cancel button)
            const savedWidgets = JSON.parse(JSON.stringify(widgets));
            setOriginalLayout(savedWidgets);

            // Update layouts from saved widgets
            setLayouts({
                lg: savedWidgets.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts.lg })),
                sm: savedWidgets.map(w => ({ i: w.id, ...w.layouts.sm }))
            });

            setHasUnsavedChanges(false);
            setEditMode(false);
            logger.debug('Widgets saved successfully');
        } catch (error) {
            logger.error('Failed to save widgets:', error);
        } finally {
            setSaving(false);
        }
    };

    // Cancel changes
    const handleCancel = () => {
        // Restore the original widgets
        setWidgets(JSON.parse(JSON.stringify(originalLayout)));

        // Restore layouts from original
        setLayouts({
            lg: originalLayout.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts.lg })),
            sm: originalLayout.map(w => ({ i: w.id, ...w.layouts.sm }))
        });

        setHasUnsavedChanges(false);
        setEditMode(false);
    };

    // Toggle edit mode
    const handleToggleEdit = () => {
        if (editMode && hasUnsavedChanges) {
            handleCancel();
        } else {
            // Store current state before entering edit mode
            if (!editMode) {
                setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
            }
            setEditMode(!editMode);
        }
    };

    // Delete widget
    const handleDeleteWidget = (widgetId) => {
        const updatedWidgets = widgets.filter(w => w.id !== widgetId);
        setWidgets(updatedWidgets);

        // Regenerate layouts after deletion
        const withLayouts = generateAllMobileLayouts(updatedWidgets);
        setWidgets(withLayouts);
        setLayouts({
            lg: withLayouts.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts.lg })),
            sm: withLayouts.map(w => ({ i: w.id, ...w.layouts.sm }))
        });

        setHasUnsavedChanges(true);
    };

    // Add widget - opens modal
    const handleAddWidget = () => {
        setShowAddModal(true);
        if (!editMode) {
            setEditMode(true);
        }
    };

    // Add widget from modal (click or drag-and-drop)
    const handleAddWidgetFromModal = async (widgetType, position = null) => {
        try {
            const metadata = getWidgetMetadata(widgetType);

            // Note: Integration checks removed - widgets can now be added without integration configured
            // The widget itself will display IntegrationDisabledMessage if not configured

            // Create new widget
            const newWidget = {
                id: `widget-${Date.now()}`,
                type: widgetType,
                x: position?.x || 0,
                y: position?.y || Infinity,
                w: metadata.defaultSize.w,
                h: metadata.defaultSize.h,
                config: {
                    title: metadata.name,
                    // Handle single integration
                    ...(metadata.requiresIntegration && {
                        enabled: true,
                        ...integrations[metadata.requiresIntegration]
                    }),
                    // Handle multiple integrations
                    ...(metadata.requiresIntegrations && Array.isArray(metadata.requiresIntegrations) &&
                        metadata.requiresIntegrations.reduce((acc, integrationKey) => {
                            acc[integrationKey] = integrations[integrationKey] || {};
                            return acc;
                        }, {})
                    )
                }
            };

            // Migrate new widget and regenerate all layouts
            const migratedWidget = migrateWidgetToLayouts(newWidget);
            const allWidgets = [...widgets, migratedWidget];
            const withLayouts = generateAllMobileLayouts(allWidgets);

            setWidgets(withLayouts);
            setLayouts({
                lg: withLayouts.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts.lg })),
                sm: withLayouts.map(w => ({ i: w.id, ...w.layouts.sm }))
            });

            setHasUnsavedChanges(true);
            setShowAddModal(false);

            // Auto-enter edit mode if not already in it (for drag-and-drop UX)
            if (!editMode) {
                setEditMode(true);
                setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
            }
        } catch (error) {
            logger.error('Failed to add widget:', error);
            showError('Add Widget Failed', 'Failed to add widget. Please try again.');
        }
    };

    // Handle drag-and-drop from modal
    const handleDrop = (e) => {
        e.preventDefault();
        const widgetType = e.dataTransfer.getData('widgetType');
        if (!widgetType) return;

        // Add widget (will auto-place at bottom via y: Infinity)
        handleAddWidgetFromModal(widgetType);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    // Widget renderer with dynamic component loading
    const renderWidget = (widget) => {
        const WidgetComponent = getWidgetComponent(widget.type);
        const defaultIcon = getWidgetIcon(widget.type);

        // Handle custom icon - supports custom:, data:, and Lucide icons
        let Icon;
        if (widget.config?.customIcon) {
            const customIconValue = widget.config.customIcon;

            // Custom uploaded icon
            if (customIconValue.startsWith('custom:')) {
                const iconId = customIconValue.replace('custom:', '');
                Icon = () => <img src={`/api/custom-icons/${iconId}/file`} alt="custom icon" className="w-full h-full object-cover rounded" />;
            }
            // Legacy base64 image
            else if (customIconValue.startsWith('data:')) {
                Icon = () => <img src={customIconValue} alt="custom icon" className="w-full h-full object-cover rounded" />;
            }
            // Lucide icon by name
            else {
                Icon = Icons[customIconValue] || defaultIcon;
            }
        } else {
            Icon = defaultIcon;
        }

        return (
            <WidgetWrapper
                id={widget.id}
                type={widget.type}
                title={widget.config?.title || 'Widget'}
                icon={Icon}
                editMode={editMode}
                onDelete={handleDeleteWidget}
                flatten={widget.config?.flatten || false}
                showHeader={widget.config?.showHeader !== false}
            >
                <WidgetErrorBoundary>
                    <Suspense fallback={<LoadingSpinner size="md" />}>
                        <WidgetComponent
                            config={widget.config}
                            editMode={editMode}
                            widgetId={widget.id}
                            onVisibilityChange={handleWidgetVisibilityChange}
                            setGlobalDragEnabled={setGlobalDragEnabled}
                        />
                    </Suspense>
                </WidgetErrorBoundary>
            </WidgetWrapper>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // Empty state
    if (widgets.length === 0 && !editMode) {
        return (
            <div className="w-full min-h-screen p-8 max-w-[2000px] mx-auto fade-in">
                <header className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-bold mb-3 gradient-text">
                            Welcome back, {user?.displayName || user?.username || 'User'}
                        </h1>
                        {greetingEnabled && (
                            <p className="text-xl text-slate-400">
                                {greetingText}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setEditMode(true)}
                        className="px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-all duration-300 flex items-center gap-2"
                    >
                        <Edit size={16} />
                        Edit
                    </button>
                </header>
                <EmptyDashboard onAddWidget={handleAddWidget} />
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen p-8 max-w-[2000px] mx-auto fade-in">
            {/* Header with Edit Controls */}
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold mb-2 gradient-text">
                        Welcome back, {user?.displayName || user?.username || 'User'}
                    </h1>
                    {greetingEnabled && (
                        <p className="text-lg text-slate-400">
                            {editMode ? 'Editing mode - Drag to rearrange widgets' : greetingText}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {editMode ? (
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Add Widget Button */}
                            <button
                                onClick={handleAddWidget}
                                className="px-3 sm:px-4 py-2.5 bg-theme-tertiary hover:bg-theme-hover border border-theme text-theme-secondary hover:text-theme-primary rounded-lg transition-all duration-300 flex items-center gap-2 button-elevated backdrop-blur-md"
                                title="Add Widget"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Widget</span>
                            </button>

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges || saving}
                                className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-blue-600/50 disabled:to-cyan-600/50 text-white rounded-lg transition-all duration-300 flex items-center gap-2 button-elevated shadow-lg shadow-blue-500/20 disabled:shadow-none disabled:cursor-not-allowed"
                                title="Save Changes"
                            >
                                <Save size={18} />
                                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                            </button>

                            {/* Cancel Button */}
                            <button
                                onClick={handleCancel}
                                className="px-3 sm:px-4 py-2.5 bg-theme-tertiary hover:bg-theme-hover border border-theme text-theme-secondary hover:text-theme-primary rounded-lg transition-all duration-300 flex items-center gap-2 backdrop-blur-md"
                                title="Cancel"
                            >
                                <XIcon size={18} />
                                <span className="hidden sm:inline">Cancel</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleToggleEdit}
                            className="hidden md:flex px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-all duration-300 items-center gap-2"
                        >
                            <Edit size={16} />
                            Edit
                        </button>
                    )}
                </div>
            </header>

            {/* Edit Mode Desktop Disclaimer */}
            {editMode && !editDisclaimerDismissed && (
                <div className="mb-4 px-4 py-3 bg-info/10 border border-info/20 rounded-xl flex items-center justify-between gap-4">
                    <p className="text-sm text-theme-secondary">
                        💡 Dashboard editing is only available on tablet and desktop (≥768px)
                    </p>
                    <button
                        onClick={async () => {
                            setEditDisclaimerDismissed(true);
                            try {
                                await axios.put('/api/config/user', {
                                    preferences: { editDisclaimerDismissed: true }
                                }, { withCredentials: true });
                            } catch (error) {
                                logger.error('Failed to save disclaimer preference:', error);
                            }
                        }}
                        className="p-1.5 hover:bg-theme-hover rounded-lg transition-colors text-theme-tertiary hover:text-theme-primary"
                        title="Dismiss"
                    >
                        <XIcon size={16} />
                    </button>
                </div>
            )}

            {/* Grid Layout with Drop Support - Always rendered for drag-and-drop */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="relative min-h-[400px]"
            >
                {/* Show empty state when no widgets and in edit mode */}
                {widgets.length === 0 && editMode && (
                    <div className="mt-8">
                        <EmptyDashboard onAddWidget={handleAddWidget} />
                    </div>
                )}

                {/* Show grid when widgets exist */}
                {widgets.length > 0 && (
                    <>
                        <ResponsiveGridLayout
                            className="layout"
                            cols={{ lg: 24, md: 24, sm: 2 }}
                            breakpoints={{ lg: 1024, md: 672, sm: 0 }}
                            rowHeight={100}
                            compactType={currentBreakpoint === 'sm' ? null : 'vertical'}
                            preventCollision={false}
                            isDraggable={editMode && isGlobalDragEnabled}
                            isResizable={editMode && isGlobalDragEnabled}
                            resizeHandles={['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']}
                            draggableCancel=".no-drag"
                            margin={[16, 16]}
                            containerPadding={[0, 0]}
                            layouts={layouts}
                            onLayoutChange={handleLayoutChange}
                            onBreakpointChange={(breakpoint) => setCurrentBreakpoint(breakpoint)}
                        >
                            {widgets
                                .map(widget => {
                                    const metadata = getWidgetMetadata(widget.type);
                                    const layoutItem = layouts.lg.find(l => l.i === widget.id) || {
                                        i: widget.id,
                                        x: widget.layouts?.lg?.x || 0,
                                        y: widget.layouts?.lg?.y || 0,
                                        w: widget.layouts?.lg?.w || 4,
                                        h: widget.layouts?.lg?.h || 2
                                    };

                                    const renderedWidget = renderWidget(widget);

                                    // Don't render grid cell if widget returns null
                                    if (!renderedWidget) {
                                        return null;
                                    }

                                    // Shrink grid cell when widget should be hidden (but keep it mounted)
                                    const shouldShrink = widgetVisibility[widget.id] === false && !editMode;

                                    return (
                                        <div
                                            key={widget.id}
                                            className={editMode ? 'edit-mode' : 'locked'}
                                            style={{
                                                opacity: shouldShrink ? 0 : 1,
                                                overflow: 'hidden'
                                            }}
                                            data-grid={{
                                                ...layoutItem,
                                                h: shouldShrink ? 0.001 : layoutItem.h,        // Try 0.01 for thinnest line
                                                minH: shouldShrink ? 0.001 : (metadata?.minSize?.h || 1),
                                                maxW: metadata?.maxSize?.w || 24,
                                                maxH: metadata?.maxSize?.h || 10
                                            }}
                                        >
                                            {renderedWidget}
                                        </div>
                                    );
                                })}
                        </ResponsiveGridLayout>
                    </>
                )}
            </div>

            {/* Debug Overlay */}
            <DebugOverlay
                enabled={debugOverlayEnabled}
                currentBreakpoint={currentBreakpoint}
                layouts={layouts}
                widgets={widgets}
                gridConfig={gridConfig}
            />

            {/* Add Widget Modal */}
            <AddWidgetModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAddWidget={handleAddWidgetFromModal}
                integrations={integrations}
            />

            {/* Bottom Spacer - Prevents content cutoff */}
            <div style={{ height: '100px' }} className="md:h-32" aria-hidden="true" />
        </div>
    );
};

export default Dashboard;
