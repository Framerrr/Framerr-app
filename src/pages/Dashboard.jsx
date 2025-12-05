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

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard = () => {
    const { user } = useAuth();

    // State
    const [widgets, setWidgets] = useState([]);
    const [layouts, setLayouts] = useState({
        lg: [],
        md: [],
        sm: [],
        xs: [],
        xxs: []
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
    const [layoutMode, setLayoutMode] = useState('auto'); // 'auto' = synced layouts, 'manual' = independent per breakpoint

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
        cols: { lg: 12, md: 12, sm: 12, xs: 2, xxs: 2 },  // Desktop tier: 12 cols, Mobile tier: 2 cols
        breakpoints: { lg: 1200, md: 1024, sm: 768, xs: 600, xxs: 0 },
        rowHeight: 100,  // Static for reliability
        compactType: editMode ? 'vertical' : ((currentBreakpoint === 'xs' || currentBreakpoint === 'xxs') ? null : 'vertical'),
        preventCollision: !editMode,  // Allow widgets to push each other in edit mode, prevent in view mode
        isDraggable: editMode && isGlobalDragEnabled,
        isResizable: editMode && isGlobalDragEnabled,
        margin: [16, 16],
        containerPadding: [0, 0],
        onBreakpointChange: (breakpoint) => setCurrentBreakpoint(breakpoint)
    }), [editMode, currentBreakpoint, isGlobalDragEnabled]);

    // DEBUG: Log grid config whenever it changes
    React.useEffect(() => {
        console.log('⚙️ Grid Config Updated:', {
            editMode,
            currentBreakpoint,
            compactType: gridConfig.compactType,
            preventCollision: gridConfig.preventCollision,
            isDraggable: gridConfig.isDraggable,
            isResizable: gridConfig.isResizable,
            cols: gridConfig.cols[currentBreakpoint]
        });
    }, [editMode, currentBreakpoint, gridConfig]);

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
                    xs: prev.xs.map(l => l.i === widgetId && updatedWidget.layouts.xs ? { i: widgetId, ...updatedWidget.layouts.xs } : l),
                    xxs: prev.xxs.map(l => l.i === widgetId && updatedWidget.layouts.xxs ? { i: widgetId, ...updatedWidget.layouts.xxs } : l)
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
        const cols = currentBreakpoint === 'xxs' ? 2 : (currentBreakpoint === 'xs' ? 2 : 12); // Desktop tier: 12, Mobile tier: 2
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
    }, [widgetVisibility, currentBreakpoint, editMode]); // Recompact when visibility, breakpoint, or editMode changes

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
                md: fetchedWidgets.map(w => ({ i: w.id, ...w.layouts.md })),
                sm: fetchedWidgets.map(w => ({ i: w.id, ...w.layouts.sm })),
                xs: fetchedWidgets.map(w => ({ i: w.id, ...w.layouts.xs })),
                xxs: fetchedWidgets.map(w => ({ i: w.id, ...w.layouts.xxs }))
            };

            setLayouts(initialLayouts);
            setOriginalLayout(JSON.parse(JSON.stringify(fetchedWidgets)));
        } catch (error) {
            logger.error('Failed to load widgets:', error);
            setWidgets([]);
            setLayouts({ lg: [], xs: [], xxs: [] });
        } finally {
            setLoading(false);
        }
    };

    // Handle layout changes (drag/resize)
    const handleLayoutChange = (newLayout) => {
        if (!editMode) return;

        // DEBUG: Log layout change event
        console.log('🔧 Layout changed:', {
            mode: layoutMode,
            breakpoint: currentBreakpoint,
            layoutCount: newLayout.length,
            widgets: newLayout.map(l => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
        });

        // Mark as having unsaved changes immediately (for all breakpoints)
        setHasUnsavedChanges(true);

        // MANUAL MODE: Save changes to current breakpoint only (no sync)
        if (layoutMode === 'manual') {
            console.log('📍 MANUAL MODE: Saving to', currentBreakpoint, 'only (no sync)');
            // Update widgets with new positions for current breakpoint
            const updatedWidgets = widgets.map(widget => {
                const layoutItem = newLayout.find(l => l.i === widget.id);
                if (layoutItem) {
                    return {
                        ...widget,
                        // Update old format only if editing desktop
                        ...(currentBreakpoint === 'lg' && {
                            x: layoutItem.x,
                            y: layoutItem.y,
                            w: layoutItem.w,
                            h: layoutItem.h
                        }),
                        // Update current breakpoint layout
                        layouts: {
                            ...widget.layouts,
                            [currentBreakpoint]: {
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

            setWidgets(updatedWidgets);
            setLayouts(prev => {
                const updated = {
                    ...prev,
                    [currentBreakpoint]: newLayout
                };
                console.log('✅ MANUAL: Layout state updated for', currentBreakpoint, ':', newLayout.length, 'widgets');
                return updated;
            });
            return;
        }

        // AUTO MODE: Desktop edits sync to mobile, mobile edits stay local
        if (currentBreakpoint === 'lg') {
            console.log('🔄 AUTO MODE: Desktop edit, syncing down to mobile');
            // Desktop edit → sync to all mobile breakpoints
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
                md: withMobileLayouts.map(w => ({ i: w.id, ...w.layouts.md })),
                sm: withMobileLayouts.map(w => ({ i: w.id, ...w.layouts.sm })),
                xs: withMobileLayouts.map(w => ({ i: w.id, ...w.layouts.xs })),
                xxs: withMobileLayouts.map(w => ({ i: w.id, ...w.layouts.xxs }))
            });
        } else {
            console.log('📱 AUTO MODE: Mobile edit on', currentBreakpoint, ', staying local');
            // Mobile edit → stays on mobile only (no upward sync in Phase 2)
            const updatedWidgets = widgets.map(widget => {
                const layoutItem = newLayout.find(l => l.i === widget.id);
                if (layoutItem) {
                    return {
                        ...widget,
                        layouts: {
                            ...widget.layouts,
                            [currentBreakpoint]: {
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

            setWidgets(updatedWidgets);
            setLayouts(prev => {
                const updated = {
                    ...prev,
                    [currentBreakpoint]: newLayout
                };
                console.log('✅ AUTO: Layout state updated for', currentBreakpoint, ':', newLayout.length, 'widgets');
                return updated;
            });
        }
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
                xs: savedWidgets.map(w => ({ i: w.id, ...w.layouts.xs })),
                xxs: savedWidgets.map(w => ({ i: w.id, ...w.layouts.xxs }))
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
            xs: originalLayout.map(w => ({ i: w.id, ...w.layouts.xs })),
            xxs: originalLayout.map(w => ({ i: w.id, ...w.layouts.xxs }))
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
        console.log('🗑️ Deleting widget:', widgetId, 'from all breakpoints');

        const updatedWidgets = widgets.filter(w => w.id !== widgetId);
        setWidgets(updatedWidgets);

        // PHASE 3: Always sync deletion across all breakpoints (in both modes)
        // This ensures widget list stays consistent
        const withLayouts = generateAllMobileLayouts(updatedWidgets);
        setWidgets(withLayouts);
        setLayouts({
            lg: withLayouts.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts.lg })),
            md: withLayouts.map(w => ({ i: w.id, ...w.layouts.md })),
            sm: withLayouts.map(w => ({ i: w.id, ...w.layouts.sm })),
            xs: withLayouts.map(w => ({ i: w.id, ...w.layouts.xs })),
            xxs: withLayouts.map(w => ({ i: w.id, ...w.layouts.xxs }))
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

            // Check single integration requirement
            if (metadata.requiresIntegration) {
                const integration = integrations[metadata.requiresIntegration];
                if (!integration?.enabled || !integration?.url) {
                    alert(`This widget requires ${metadata.requiresIntegration} integration. Please configure it in Settings first.`);
                    return;
                }
            }

            // Check multiple integrations requirement
            if (metadata.requiresIntegrations && Array.isArray(metadata.requiresIntegrations)) {
                const missingIntegrations = metadata.requiresIntegrations.filter(
                    key => !integrations[key]?.enabled || !integrations[key]?.url
                );
                if (missingIntegrations.length > 0) {
                    alert(`This widget requires ${missingIntegrations.join(' and ')} integration${missingIntegrations.length > 1 ? 's' : ''}. Please configure in Settings first.`);
                    return;
                }
            }

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

            // PHASE 3: Respect layout mode when adding widgets
            const migratedWidget = migrateWidgetToLayouts(newWidget);

            if (layoutMode === 'manual') {
                console.log('➕ MANUAL MODE: Adding widget to', currentBreakpoint, 'only');

                // Add widget to current breakpoint only
                const allWidgets = [...widgets, migratedWidget];
                setWidgets(allWidgets);

                // Get column count for current breakpoint
                const cols = gridConfig.cols[currentBreakpoint] || 12;

                // Calculate Y position: find the bottom-most widget and place below it
                const currentLayouts = layouts[currentBreakpoint] || [];
                let maxY = 0;
                currentLayouts.forEach(item => {
                    const bottomY = item.y + item.h;
                    if (bottomY > maxY) maxY = bottomY;
                });

                // Create layout item for current breakpoint
                // Mobile (xs/xxs): Full width, proper Y position
                // Desktop (lg/md/sm): Use default size, proper Y position
                const newLayoutItem = {
                    i: migratedWidget.id,
                    x: 0,  // Always start at left
                    y: maxY,  // Place at bottom
                    w: cols === 2 ? 2 : migratedWidget.w,  // Full width on mobile, default on desktop
                    h: migratedWidget.h  // Keep default height
                };

                console.log('📍 Widget placement:', { breakpoint: currentBreakpoint, cols, x: 0, y: maxY, w: newLayoutItem.w, h: newLayoutItem.h });

                // Add to current breakpoint layout only
                setLayouts(prev => ({
                    ...prev,
                    [currentBreakpoint]: [...prev[currentBreakpoint], newLayoutItem]
                }));
            } else {
                console.log('➕ AUTO MODE: Adding widget to all breakpoints');

                // Add to all breakpoints with proper sizing
                const allWidgets = [...widgets, migratedWidget];
                const withLayouts = generateAllMobileLayouts(allWidgets);

                setWidgets(withLayouts);
                setLayouts({
                    lg: withLayouts.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts.lg })),
                    md: withLayouts.map(w => ({ i: w.id, ...w.layouts.md })),
                    sm: withLayouts.map(w => ({ i: w.id, ...w.layouts.sm })),
                    xs: withLayouts.map(w => ({ i: w.id, ...w.layouts.xs })),
                    xxs: withLayouts.map(w => ({ i: w.id, ...w.layouts.xxs }))
                });
            }

            setHasUnsavedChanges(true);
            setShowAddModal(false);

            // Auto-enter edit mode if not already in it (for drag-and-drop UX)
            if (!editMode) {
                setEditMode(true);
                setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
            }
        } catch (error) {
            logger.error('Failed to add widget:', error);
            alert('Failed to add widget. Please try again.');
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
            <div className="w-full min-h-screen p-8 max-w-[2400px] mx-auto fade-in">
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
        <div className="w-full min-h-screen p-8 max-w-[2400px] mx-auto fade-in">
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

                {/* Manual/Auto Mode Toggle - Phase 1: State only */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-tertiary border border-theme rounded-lg">
                        <span className="text-xs text-theme-secondary font-medium">Layout Mode:</span>
                        <button
                            onClick={() => {
                                const newMode = layoutMode === 'auto' ? 'manual' : 'auto';
                                console.log('⚙️ Mode toggled:', layoutMode, '→', newMode);
                                setLayoutMode(newMode);
                            }}
                            className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${layoutMode === 'auto'
                                ? 'bg-accent text-white'
                                : 'text-theme-secondary hover:text-theme-primary'
                                }`}
                            title="Auto mode: Layouts sync between breakpoints"
                        >
                            Auto
                        </button>
                        <button
                            onClick={() => {
                                const newMode = layoutMode === 'auto' ? 'manual' : 'auto';
                                console.log('⚙️ Mode toggled:', layoutMode, '→', newMode);
                                setLayoutMode(newMode);
                            }}
                            className={`px-2 py-1 text-xs font-medium rounded transition-all duration-200 ${layoutMode === 'manual'
                                ? 'bg-accent text-white'
                                : 'text-theme-secondary hover:text-theme-primary'
                                }`}
                            title="Manual mode: Independent layouts per breakpoint"
                        >
                            Manual
                        </button>
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
                                className="px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-all duration-300 flex items-center gap-2"
                            >
                                <Edit size={16} />
                                Edit
                            </button>
                        )}
                    </div>
                </div>
            </header>

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
                            key={`grid-${currentBreakpoint}`}
                            {...gridConfig}
                            resizeHandles={['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']}
                            draggableCancel=".no-drag"
                            layouts={layouts}
                            onLayoutChange={handleLayoutChange}
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
                                                h: shouldShrink ? 0.001 : layoutItem.h,
                                                minH: shouldShrink ? 0.001 : (metadata?.minSize?.h || 1),
                                                maxW: metadata?.maxSize?.w || 12,  // Updated for 12-col grid
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
