import React, { useState, useEffect, Suspense } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Edit, Save, X as XIcon, Plus, LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { LAYOUT } from '../constants/layout';
import { Button } from '../components/common/Button';
import WidgetWrapper from '../components/widgets/WidgetWrapper';
import WidgetErrorBoundary from '../components/widgets/WidgetErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyDashboard from '../components/dashboard/EmptyDashboard';
import { getWidgetComponent, getWidgetIcon, getWidgetMetadata, WidgetMetadata } from '../utils/widgetRegistry';
import { generateAllMobileLayouts, migrateWidgetToLayouts } from '../utils/layoutUtils';
import AddWidgetModal from '../components/dashboard/AddWidgetModal';
import MobileEditDisclaimerModal from '../components/dashboard/MobileEditDisclaimerModal';
import UnlinkConfirmationModal from '../components/dashboard/UnlinkConfirmationModal';
import DebugOverlay from '../components/debug/DebugOverlay';
import { isAdmin } from '../utils/permissions';
import axios, { AxiosError } from 'axios';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/GridLayout.css';
import logger from '../utils/logger';
import { useNotifications } from '../context/NotificationContext';
import type { Widget, WidgetLayout } from '../../shared/types/widget';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface IntegrationConfig {
    enabled?: boolean;
    url?: string;
    apiKey?: string;
    [key: string]: unknown;
}

interface SharedIntegration {
    name: string;
    [key: string]: unknown;
}

type MobileLayoutMode = 'linked' | 'independent';

interface WidgetApiResponse {
    widgets: Widget[];
    mobileLayoutMode?: MobileLayoutMode;
    mobileWidgets?: Widget[];
}

interface IntegrationsApiResponse {
    integrations: Record<string, IntegrationConfig> | SharedIntegration[];
}

interface UserConfigResponse {
    preferences?: {
        editDisclaimerDismissed?: boolean;
        mobileEditDisclaimerDismissed?: boolean;
        dashboardGreeting?: {
            enabled?: boolean;
            text?: string;
        };
    };
}

interface SystemConfigResponse {
    config?: {
        debug?: {
            overlayEnabled?: boolean;
        };
    };
}

interface GreetingUpdateEvent extends CustomEvent {
    detail: {
        enabled?: boolean;
        text?: string;
    };
}

interface WidgetConfigUpdateEvent extends CustomEvent {
    detail: {
        widgetId?: string;
    };
}

interface WidgetsModifiedEvent extends CustomEvent {
    detail: {
        widgets?: Widget[];
    };
}

interface GridLayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
}

type Breakpoint = 'lg' | 'sm';

interface LayoutState {
    lg: GridLayoutItem[];
    sm: GridLayoutItem[];
}

const Dashboard = (): React.JSX.Element => {
    const { user } = useAuth();
    const { isMobile } = useLayout();
    const { warning: showWarning, error: showError } = useNotifications();

    // State
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [layouts, setLayouts] = useState<LayoutState>({
        lg: [],
        sm: []
    });
    const [editMode, setEditMode] = useState<boolean>(false);
    const [isGlobalDragEnabled, setGlobalDragEnabled] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [originalLayout, setOriginalLayout] = useState<Widget[]>([]);
    const [greetingEnabled, setGreetingEnabled] = useState<boolean>(true);
    const [greetingText, setGreetingText] = useState<string>('Your personal dashboard');
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [integrations, setIntegrations] = useState<Record<string, IntegrationConfig>>({});
    const [sharedIntegrations, setSharedIntegrations] = useState<SharedIntegration[]>([]); // For non-admins: integrations shared by admin
    const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({}); // Track widget visibility: {widgetId: boolean}
    const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
    const [debugOverlayEnabled, setDebugOverlayEnabled] = useState<boolean>(false); // Toggle for debug overlay (can be controlled from settings)
    const [editDisclaimerDismissed, setEditDisclaimerDismissed] = useState<boolean>(false);

    // Mobile dashboard independence state
    const [mobileLayoutMode, setMobileLayoutMode] = useState<MobileLayoutMode>('linked');
    const [mobileWidgets, setMobileWidgets] = useState<Widget[]>([]);
    const [mobileOriginalLayout, setMobileOriginalLayout] = useState<Widget[]>([]);
    const [showMobileDisclaimer, setShowMobileDisclaimer] = useState<boolean>(false);
    const [showUnlinkConfirmation, setShowUnlinkConfirmation] = useState<boolean>(false);
    const [mobileDisclaimerDismissed, setMobileDisclaimerDismissed] = useState<boolean>(false);
    const [pendingUnlink, setPendingUnlink] = useState<boolean>(false);

    // Check if current user is admin
    const userIsAdmin = isAdmin(user);

    // Load edit disclaimer preference from user config
    useEffect(() => {
        const loadUserPreferences = async (): Promise<void> => {
            try {
                const response = await axios.get<UserConfigResponse>('/api/config/user', { withCredentials: true });
                if (response.data?.preferences?.editDisclaimerDismissed) {
                    setEditDisclaimerDismissed(true);
                }
                if (response.data?.preferences?.mobileEditDisclaimerDismissed) {
                    setMobileDisclaimerDismissed(true);
                }
            } catch (error) {
                const err = error as Error;
                logger.debug('Could not load user preferences for disclaimer:', { message: err.message });
            }
        };
        loadUserPreferences();
    }, []);

    // Handle widget visibility changes (called by widgets that support hideWhenEmpty)
    const handleWidgetVisibilityChange = (widgetId: string, isVisible: boolean): void => {
        setWidgetVisibility(prev => ({
            ...prev,
            [widgetId]: isVisible
        }));
    };

    // Grid configuration - memoized to prevent recreation on every render
    // When isMobile is true, force 2-column mode regardless of container width
    const effectiveBreakpoint = isMobile ? 'sm' : currentBreakpoint;

    // Override breakpoints and cols when mobile to force mobile layout
    // Simplified: only lg and sm (no md) since we only have lg and sm layouts
    const gridBreakpoints = isMobile
        ? { sm: 0 }
        : { lg: 768, sm: 0 };  // lg starts at 768 (same as sidebar threshold)

    const gridCols = isMobile
        ? { sm: 2 }
        : { lg: 24, sm: 2 };

    const gridConfig = React.useMemo(() => ({
        className: "layout",
        cols: gridCols,
        breakpoints: gridBreakpoints,
        rowHeight: 100,
        compactType: effectiveBreakpoint === 'sm' ? null : 'vertical' as const,
        preventCollision: false,
        isDraggable: editMode && isGlobalDragEnabled,
        isResizable: editMode && isGlobalDragEnabled,
        // Mobile only allows vertical resize (height adjustment)
        resizeHandles: isMobile ? ['s'] : ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'],
        margin: [16, 16] as [number, number],
        containerPadding: [0, 0] as [number, number],
        onBreakpointChange: (breakpoint: string) => setCurrentBreakpoint(breakpoint as Breakpoint)
    }), [editMode, effectiveBreakpoint, isGlobalDragEnabled, isMobile, gridBreakpoints, gridCols]);

    // Helper: Apply minW/minH/maxH from widget metadata to layout items
    const enrichLayoutWithConstraints = (widget: Widget, layoutItem: GridLayoutItem): GridLayoutItem => {
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
        loadUserPreferencesInit();
        loadDebugOverlaySetting();
    }, []);

    // Listen for greeting updates from settings
    useEffect(() => {
        const handleGreetingUpdate = (event: Event): void => {
            const customEvent = event as GreetingUpdateEvent;
            const { enabled, text } = customEvent.detail || {};
            if (enabled !== undefined) setGreetingEnabled(enabled);
            if (text !== undefined) setGreetingText(text);
        };

        window.addEventListener('greetingUpdated', handleGreetingUpdate);
        return () => window.removeEventListener('greetingUpdated', handleGreetingUpdate);
    }, []);

    // Listen for widget config updates (from individual widgets)
    useEffect(() => {
        const handleWidgetConfigUpdate = async (event: Event): Promise<void> => {
            const customEvent = event as WidgetConfigUpdateEvent;
            const { widgetId } = customEvent.detail || {};
            if (!widgetId) return;

            try {
                // Fetch updated widget data
                const response = await axios.get<WidgetApiResponse>('/api/widgets');
                const allWidgets = response.data.widgets || [];
                const updatedWidget = allWidgets.find(w => w.id === widgetId);

                if (!updatedWidget) {
                    logger.warn('Widget not found in response:', { widgetId });
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
                    lg: prev.lg.map(l => l.i === widgetId ? enrichLayoutWithConstraints(updatedWidget, { i: widgetId, ...updatedWidget.layouts!.lg }) : l),
                    sm: prev.sm.map(l => l.i === widgetId && updatedWidget.layouts?.sm ? { i: widgetId, ...updatedWidget.layouts.sm } : l)
                }));

                logger.debug('Widget refreshed:', { widgetId });
            } catch (error) {
                logger.error('Failed to refresh widget:', { error });
            }
        };

        window.addEventListener('widget-config-updated', handleWidgetConfigUpdate);
        return () => window.removeEventListener('widget-config-updated', handleWidgetConfigUpdate);
    }, []);

    // Listen for widget modifications from LinkGrid (e.g., link changes)
    useEffect(() => {
        const handleWidgetsModified = (event: Event): void => {
            const customEvent = event as WidgetsModifiedEvent;
            const { widgets: modifiedWidgets } = customEvent.detail || {};
            if (!modifiedWidgets) return;

            // Update widgets state
            setWidgets(modifiedWidgets);

            // Mark as having unsaved changes
            setHasUnsavedChanges(true);
        };

        window.addEventListener('widgets-modified', handleWidgetsModified);
        return () => window.removeEventListener('widgets-modified', handleWidgetsModified);
    }, []);

    // Listen for widgets added from Settings > Widget Gallery
    useEffect(() => {
        const handleWidgetsAdded = (): void => {
            // Re-fetch widgets to get the newly added widget
            fetchWidgets();
        };

        window.addEventListener('widgets-added', handleWidgetsAdded);
        return () => window.removeEventListener('widgets-added', handleWidgetsAdded);
    }, []);

    // Dynamically recompact mobile layouts when widget visibility changes
    // Skip when in edit mode - user is manually arranging widgets
    // Use a ref to track if this is actually a visibility change vs other deps changing
    const prevVisibilityRef = React.useRef<Record<string, boolean>>({});
    useEffect(() => {
        if (!widgets.length) return;
        if (editMode) return; // Don't auto-recompact during manual editing

        // Only recompact if visibility actually changed (not just editMode or widgets)
        const visibilityChanged = Object.keys(widgetVisibility).some(
            key => widgetVisibility[key] !== prevVisibilityRef.current[key]
        ) || Object.keys(prevVisibilityRef.current).some(
            key => prevVisibilityRef.current[key] !== widgetVisibility[key]
        );

        // Update ref for next comparison (always update, even if we don't recompact)
        prevVisibilityRef.current = { ...widgetVisibility };

        if (!visibilityChanged) return; // Don't recompact if only editMode changed

        // Only run for breakpoints that use sorted stacked layouts (not lg)
        const isSorted = currentBreakpoint !== 'lg';
        if (!isSorted) return;

        logger.debug('Visibility recompaction triggered', { breakpoint: currentBreakpoint });

        // Determine column count for current breakpoint
        const cols = currentBreakpoint === 'sm' ? 2 : 24; // sm=2 (full width), lg=24
        const breakpoint = currentBreakpoint;

        logger.debug('Recompacting layouts', { breakpoint, cols, visibility: widgetVisibility });

        // Get widgets in sorted order with current layouts
        // Sort by mobile layout Y position (already has correct column-first order from generateMobileLayout)
        let currentY = 0;
        const compactedLayouts: GridLayoutItem[] = widgets
            .map(w => ({
                widget: w,
                layout: w.layouts?.[breakpoint] || layouts[breakpoint]?.find(l => l.i === w.id),
                isHidden: widgetVisibility[w.id] === false
            }))
            .filter(item => item.layout)
            .sort((a, b) => (a.layout?.y ?? 0) - (b.layout?.y ?? 0)) // Use mobile layout Y (maintains column-first order)
            .map(({ widget, layout, isHidden }) => {
                const height = isHidden ? 0.001 : (layout?.h ?? 2);
                logger.debug(`Widget recompaction: ${widget.type}`, { hidden: isHidden, originalY: layout?.y, newY: currentY, height });

                const compacted: GridLayoutItem = { i: widget.id, x: 0, y: currentY, w: cols, h: height };
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
    }, [widgetVisibility, currentBreakpoint, widgets, editMode]);

    const loadUserPreferencesInit = async (): Promise<void> => {
        try {
            const response = await axios.get<UserConfigResponse>('/api/config/user', {
                withCredentials: true
            });

            if (response.data?.preferences?.dashboardGreeting) {
                const greeting = response.data.preferences.dashboardGreeting;
                setGreetingEnabled(greeting.enabled ?? true);
                setGreetingText(greeting.text || 'Your personal dashboard');
            }
        } catch (error) {
            logger.error('Failed to load user preferences:', { error });
        }
    };

    const loadDebugOverlaySetting = async (): Promise<void> => {
        // Only admins can access system config
        if (!userIsAdmin) {
            return;
        }

        try {
            const response = await axios.get<SystemConfigResponse>('/api/system/config');
            if (response.data.config?.debug) {
                // Set to actual value (true or false), default to false
                setDebugOverlayEnabled(response.data.config.debug.overlayEnabled || false);
            }
        } catch (error) {
            // Silently fail - debug overlay is optional
            logger.debug('Failed to load debug overlay setting:', { error });
        }
    };

    const fetchIntegrations = async (): Promise<void> => {
        try {
            // Admins get full integration config from /api/integrations
            if (userIsAdmin) {
                const response = await axios.get<{ integrations: Record<string, IntegrationConfig> }>('/api/integrations');
                setIntegrations(response.data.integrations || {});
            } else {
                // Non-admins get shared integrations from /api/integrations/shared
                const response = await axios.get<{ integrations: SharedIntegration[] }>('/api/integrations/shared');
                setSharedIntegrations(response.data.integrations || []);
                // Also set integrations object for widget config injection
                const integrationsObj: Record<string, IntegrationConfig> = {};
                (response.data.integrations || []).forEach(integration => {
                    integrationsObj[integration.name] = integration as IntegrationConfig;
                });
                setIntegrations(integrationsObj);
            }
        } catch (error) {
            logger.error('Failed to fetch integrations:', { error });
        }
    };

    const fetchWidgets = async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await axios.get<WidgetApiResponse>('/api/widgets');

            let fetchedWidgets = response.data.widgets || [];
            const fetchedMobileMode = response.data.mobileLayoutMode || 'linked';
            let fetchedMobileWidgets = response.data.mobileWidgets || [];

            // Set mobile layout mode
            setMobileLayoutMode(fetchedMobileMode);

            // Migrate old format + generate mobile layouts for desktop widgets
            fetchedWidgets = fetchedWidgets.map(w => migrateWidgetToLayouts(w));

            // Migrate hideHeader to showHeader (reverse logic)
            fetchedWidgets = fetchedWidgets.map(w => ({
                ...w,
                config: {
                    ...w.config,
                    // Convert hideHeader (true = hidden) to showHeader (true = shown)
                    // If hideHeader exists and is true, set showHeader to false
                    // Otherwise default to true (headers shown by default)
                    showHeader: (w.config as any)?.hideHeader ? false : (w.config?.showHeader !== false)
                }
            }));

            // Handle mobile widgets based on mode
            if (fetchedMobileMode === 'independent' && fetchedMobileWidgets.length > 0) {
                // Mobile is independent - use stored mobile widgets
                fetchedMobileWidgets = fetchedMobileWidgets.map(w => migrateWidgetToLayouts(w));
                fetchedMobileWidgets = fetchedMobileWidgets.map(w => ({
                    ...w,
                    config: {
                        ...w.config,
                        showHeader: (w.config as any)?.hideHeader ? false : (w.config?.showHeader !== false)
                    }
                }));
                setMobileWidgets(fetchedMobileWidgets);
                setMobileOriginalLayout(JSON.parse(JSON.stringify(fetchedMobileWidgets)));

                // For desktop, strip mobile layouts and regenerate (not used on mobile)
                fetchedWidgets = fetchedWidgets.map(w => ({
                    ...w,
                    layouts: {
                        lg: w.layouts!.lg  // Keep only desktop layout
                    }
                }));
                fetchedWidgets = generateAllMobileLayouts(fetchedWidgets);
            } else {
                // Mobile is linked - auto-generate from desktop
                fetchedWidgets = fetchedWidgets.map(w => ({
                    ...w,
                    layouts: {
                        lg: w.layouts!.lg  // Keep only desktop layout
                    }
                }));
                fetchedWidgets = generateAllMobileLayouts(fetchedWidgets);
                setMobileWidgets([]);
                setMobileOriginalLayout([]);
            }

            setWidgets(fetchedWidgets);

            // Convert to react-grid-layout format for all breakpoints
            // Use mobile widgets if independent, otherwise use generated layouts
            const initialLayouts: LayoutState = {
                lg: fetchedWidgets.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts!.lg })),
                sm: fetchedMobileMode === 'independent' && fetchedMobileWidgets.length > 0
                    ? fetchedMobileWidgets.map(w => ({ i: w.id, ...w.layouts!.sm! }))
                    : fetchedWidgets.map(w => ({ i: w.id, ...w.layouts!.sm! }))
            };

            setLayouts(initialLayouts);
            setOriginalLayout(JSON.parse(JSON.stringify(fetchedWidgets)));
        } catch (error) {
            logger.error('Failed to load widgets:', { error });
            setWidgets([]);
            setMobileWidgets([]);
            setLayouts({ lg: [], sm: [] });
        } finally {
            setLoading(false);
        }
    };

    // Handle layout changes (drag/resize)
    const handleLayoutChange = (newLayout: Layout[]): void => {
        if (!editMode) return;

        // Mark as having unsaved changes immediately (for all breakpoints)
        setHasUnsavedChanges(true);

        // Mobile editing - handle separately
        if (isMobile || currentBreakpoint === 'sm') {
            // Mark as pending unlink if currently linked
            if (mobileLayoutMode === 'linked') {
                setPendingUnlink(true);
            }

            // On mobile, manually recompact layouts by sorting by Y and assigning sequential positions
            // This handles reordering when compactType is null
            const sortedLayout = [...newLayout].sort((a, b) => a.y - b.y);
            let currentY = 0;
            const recompactedLayout = sortedLayout.map(item => {
                const recompacted = { ...item, y: currentY, x: 0, w: 2 };
                currentY += item.h;
                return recompacted;
            });

            // Update mobile widgets (will be separate when unlinked)
            const widgetsToUpdate = mobileLayoutMode === 'independent' ? mobileWidgets : widgets;
            const updatedMobileWidgets = widgetsToUpdate.map(widget => {
                const layoutItem = recompactedLayout.find(l => l.i === widget.id);
                if (layoutItem) {
                    return {
                        ...widget,
                        layouts: {
                            ...widget.layouts,
                            sm: {
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

            if (mobileLayoutMode === 'independent') {
                setMobileWidgets(updatedMobileWidgets);
            } else {
                // Still linked - temporarily update sm layouts in widgets for preview
                const updatedWidgets = widgets.map(widget => {
                    const layoutItem = recompactedLayout.find(l => l.i === widget.id);
                    if (layoutItem) {
                        return {
                            ...widget,
                            layouts: {
                                ...widget.layouts,
                                sm: {
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
            }

            setLayouts(prev => ({
                ...prev,
                sm: recompactedLayout as GridLayoutItem[]
            }));
            return;
        }

        // Desktop editing - only process layout changes for lg (desktop) breakpoint
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

        // Auto-generate mobile layouts from updated desktop layout (only if linked)
        const withMobileLayouts = mobileLayoutMode === 'linked'
            ? generateAllMobileLayouts(updatedWidgets)
            : updatedWidgets;

        setWidgets(withMobileLayouts);
        setLayouts({
            lg: newLayout as GridLayoutItem[],
            sm: mobileLayoutMode === 'independent' && mobileWidgets.length > 0
                ? mobileWidgets.map(w => ({ i: w.id, ...w.layouts!.sm! }))
                : withMobileLayouts.map(w => ({ i: w.id, ...w.layouts!.sm! }))
        });
    };

    // Save changes to API
    const handleSave = async (): Promise<void> => {
        // If on mobile and pending unlink, show confirmation modal first
        if (isMobile && pendingUnlink && mobileLayoutMode === 'linked') {
            setShowUnlinkConfirmation(true);
            return;
        }

        await performSave();
    };

    // Actual save implementation (called after confirmation if needed)
    const performSave = async (): Promise<void> => {
        try {
            setSaving(true);

            // Determine what to save based on mode and device
            if (isMobile && (pendingUnlink || mobileLayoutMode === 'independent')) {
                // Mobile save - need to unlink or update mobile widgets
                if (pendingUnlink && mobileLayoutMode === 'linked') {
                    // Perform unlink - copy widgets to mobile and set mode
                    const mobileWidgetsToSave = widgets.map(w => ({
                        ...w,
                        layouts: {
                            ...w.layouts,
                            sm: w.layouts?.sm || { x: 0, y: 0, w: 2, h: 2 }
                        }
                    }));

                    await axios.put('/api/widgets', {
                        widgets: widgets,
                        mobileLayoutMode: 'independent',
                        mobileWidgets: mobileWidgetsToSave
                    });

                    setMobileLayoutMode('independent');
                    setMobileWidgets(mobileWidgetsToSave);
                    setMobileOriginalLayout(JSON.parse(JSON.stringify(mobileWidgetsToSave)));
                    setPendingUnlink(false);

                    logger.debug('Mobile dashboard unlinked and saved');
                } else {
                    // Already independent - just save mobile widgets
                    await axios.put('/api/widgets', {
                        widgets: widgets,
                        mobileLayoutMode: 'independent',
                        mobileWidgets: mobileWidgets
                    });

                    setMobileOriginalLayout(JSON.parse(JSON.stringify(mobileWidgets)));
                    logger.debug('Independent mobile widgets saved');
                }
            } else {
                // Desktop save
                await axios.put('/api/widgets', {
                    widgets,
                    mobileLayoutMode,
                    mobileWidgets: mobileLayoutMode === 'independent' ? mobileWidgets : undefined
                });
            }

            // Create deep copy for originalLayout (used by Cancel button)
            const savedWidgets = JSON.parse(JSON.stringify(widgets)) as Widget[];
            setOriginalLayout(savedWidgets);

            // Update layouts from saved widgets
            setLayouts({
                lg: savedWidgets.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts!.lg })),
                sm: mobileLayoutMode === 'independent' && mobileWidgets.length > 0
                    ? mobileWidgets.map(w => ({ i: w.id, ...w.layouts!.sm! }))
                    : savedWidgets.map(w => ({ i: w.id, ...w.layouts!.sm! }))
            });

            setHasUnsavedChanges(false);
            setEditMode(false);
            setShowUnlinkConfirmation(false);
            logger.debug('Widgets saved successfully');
        } catch (error) {
            logger.error('Failed to save widgets:', { error });
        } finally {
            setSaving(false);
        }
    };

    // Cancel changes
    const handleCancel = (): void => {
        // Restore the original widgets
        setWidgets(JSON.parse(JSON.stringify(originalLayout)));

        // Restore mobile widgets if independent
        if (mobileLayoutMode === 'independent') {
            setMobileWidgets(JSON.parse(JSON.stringify(mobileOriginalLayout)));
        }

        // Restore layouts from original
        setLayouts({
            lg: originalLayout.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts!.lg })),
            sm: mobileLayoutMode === 'independent' && mobileOriginalLayout.length > 0
                ? mobileOriginalLayout.map(w => ({ i: w.id, ...w.layouts!.sm! }))
                : originalLayout.map(w => ({ i: w.id, ...w.layouts!.sm! }))
        });

        // Reset all edit state
        setHasUnsavedChanges(false);
        setEditMode(false);
        setPendingUnlink(false);
        setShowUnlinkConfirmation(false);
    };

    // Toggle edit mode
    const handleToggleEdit = (): void => {
        if (editMode && hasUnsavedChanges) {
            handleCancel();
        } else if (!editMode) {
            // Entering edit mode
            // On mobile, show disclaimer if linked and not dismissed
            if (isMobile && mobileLayoutMode === 'linked' && !mobileDisclaimerDismissed) {
                setShowMobileDisclaimer(true);
                return;
            }

            // Store current state before entering edit mode
            setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
            if (mobileLayoutMode === 'independent') {
                setMobileOriginalLayout(JSON.parse(JSON.stringify(mobileWidgets)));
            }
            setEditMode(true);
        } else {
            setEditMode(!editMode);
        }
    };

    // Delete widget
    const handleDeleteWidget = (widgetId: string): void => {
        // Handle mobile deletion
        if (isMobile) {
            if (mobileLayoutMode === 'independent') {
                // Independent - delete from mobile widgets only
                const updatedMobileWidgets = mobileWidgets.filter(w => w.id !== widgetId);
                setMobileWidgets(updatedMobileWidgets);
                setLayouts(prev => ({
                    ...prev,
                    sm: updatedMobileWidgets.map(w => ({ i: w.id, ...w.layouts!.sm! }))
                }));
            } else {
                // Linked - mark for unlink and delete from widgets (will become mobile-only)
                setPendingUnlink(true);
                const updatedWidgets = widgets.filter(w => w.id !== widgetId);
                const withLayouts = generateAllMobileLayouts(updatedWidgets);
                setWidgets(withLayouts);
                setLayouts({
                    lg: withLayouts.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts!.lg })),
                    sm: withLayouts.map(w => ({ i: w.id, ...w.layouts!.sm! }))
                });
            }
            setHasUnsavedChanges(true);
            return;
        }

        // Desktop deletion
        const updatedWidgets = widgets.filter(w => w.id !== widgetId);
        setWidgets(updatedWidgets);

        // Regenerate layouts after deletion
        const withLayouts = mobileLayoutMode === 'linked'
            ? generateAllMobileLayouts(updatedWidgets)
            : updatedWidgets;
        setWidgets(withLayouts);
        setLayouts({
            lg: withLayouts.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts!.lg })),
            sm: mobileLayoutMode === 'independent' && mobileWidgets.length > 0
                ? mobileWidgets.map(w => ({ i: w.id, ...w.layouts!.sm! }))
                : withLayouts.map(w => ({ i: w.id, ...w.layouts!.sm! }))
        });

        setHasUnsavedChanges(true);
    };

    // Add widget - opens modal
    const handleAddWidget = (): void => {
        setShowAddModal(true);
        if (!editMode) {
            setEditMode(true);
        }
    };

    // Add widget from modal (click or drag-and-drop)
    const handleAddWidgetFromModal = async (widgetType: string, position: { x: number; y: number } | null = null): Promise<void> => {
        try {
            const metadata = getWidgetMetadata(widgetType);
            if (!metadata) {
                showError('Add Widget Failed', 'Widget type not found.');
                return;
            }

            // Note: Integration checks removed - widgets can now be added without integration configured
            // The widget itself will display IntegrationDisabledMessage if not configured

            // Create new widget
            const newWidget: Widget = {
                id: `widget-${Date.now()}`,
                i: `widget-${Date.now()}`,
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
                        metadata.requiresIntegrations.reduce((acc: Record<string, IntegrationConfig>, integrationKey: string) => {
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
                lg: withLayouts.map(w => enrichLayoutWithConstraints(w, { i: w.id, ...w.layouts!.lg })),
                sm: withLayouts.map(w => ({ i: w.id, ...w.layouts!.sm! }))
            });

            setHasUnsavedChanges(true);
            setShowAddModal(false);

            // Auto-enter edit mode if not already in it (for drag-and-drop UX)
            if (!editMode) {
                setEditMode(true);
                setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
            }
        } catch (error) {
            logger.error('Failed to add widget:', { error });
            showError('Add Widget Failed', 'Failed to add widget. Please try again.');
        }
    };

    // Handle drag-and-drop from modal
    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        const widgetType = e.dataTransfer.getData('widgetType');
        if (!widgetType) return;

        // Add widget (will auto-place at bottom via y: Infinity)
        handleAddWidgetFromModal(widgetType);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    // Widget renderer with dynamic component loading
    const renderWidget = (widget: Widget): React.JSX.Element | null => {
        const WidgetComponent = getWidgetComponent(widget.type);
        const defaultIcon = getWidgetIcon(widget.type);

        if (!WidgetComponent) {
            return null;
        }

        // Handle custom icon - supports custom:, data:, and Lucide icons
        let Icon: LucideIcon | React.FC;
        if (widget.config?.customIcon) {
            const customIconValue = widget.config.customIcon as string;

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
                Icon = (Icons as unknown as Record<string, LucideIcon>)[customIconValue] || defaultIcon;
            }
        } else {
            Icon = defaultIcon;
        }

        return (
            <WidgetWrapper
                id={widget.id}
                type={widget.type}
                title={widget.config?.title as string || 'Widget'}
                icon={Icon}
                editMode={editMode}
                onDelete={handleDeleteWidget}
                flatten={widget.config?.flatten as boolean || false}
                showHeader={widget.config?.showHeader !== false}
            >
                <WidgetErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
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

    // Loading state - invisible placeholder prevents layout shift
    // No visible indicator since ProtectedRoute handles initial loading
    // and widgets display their own loading states
    if (loading) {
        return <div className="h-full w-full" />;
    }

    // Empty state
    if (widgets.length === 0 && !editMode) {
        return (
            <div
                className="w-full min-h-screen max-w-[2000px] mx-auto fade-in p-2 md:p-8"
            >
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
        <div
            className="w-full min-h-screen max-w-[2000px] mx-auto fade-in p-2 md:p-8"
        >
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
                        // Edit button - visible on all screen sizes
                        <button
                            onClick={handleToggleEdit}
                            className="flex px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-all duration-300 items-center gap-2"
                        >
                            <Edit size={16} />
                            Edit
                        </button>
                    )}
                </div>
            </header>

            {/* Edit Mode Desktop Disclaimer */}
            {editMode && !editDisclaimerDismissed && !isMobile && (
                <div className="mb-4 px-4 py-3 bg-info/10 border border-info/20 rounded-xl flex items-center justify-between gap-4">
                    <p className="text-sm text-theme-secondary">
                        Drag widgets to rearrange, resize from edges, or delete with the X button.
                    </p>
                    <button
                        onClick={async () => {
                            setEditDisclaimerDismissed(true);
                            try {
                                await axios.put('/api/config/user', {
                                    preferences: { editDisclaimerDismissed: true }
                                }, { withCredentials: true });
                            } catch (error) {
                                logger.error('Failed to save disclaimer preference:', { error });
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
                            cols={gridCols}
                            breakpoints={gridBreakpoints}
                            rowHeight={100}
                            compactType={effectiveBreakpoint === 'sm' ? (editMode ? 'vertical' : null) : 'vertical'}
                            preventCollision={false}
                            isDraggable={editMode && isGlobalDragEnabled}
                            isResizable={editMode && isGlobalDragEnabled}
                            resizeHandles={isMobile ? ['s'] : ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']}
                            draggableCancel=".no-drag"
                            margin={[16, 16]}
                            containerPadding={[0, 0]}
                            layouts={isMobile ? { sm: [...layouts.sm].sort((a, b) => a.y - b.y) } : layouts}
                            onLayoutChange={handleLayoutChange}
                            onBreakpointChange={(breakpoint) => setCurrentBreakpoint(breakpoint as Breakpoint)}
                        >
                            {(isMobile && editMode
                                ? [...widgets].sort((a, b) => (a.layouts?.sm?.y ?? 0) - (b.layouts?.sm?.y ?? 0))
                                : widgets
                            ).map(widget => {
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
                isAdmin={userIsAdmin}
                sharedIntegrations={sharedIntegrations}
            />

            {/* Mobile Edit Disclaimer Modal */}
            <MobileEditDisclaimerModal
                isOpen={showMobileDisclaimer}
                onContinue={() => {
                    setShowMobileDisclaimer(false);
                    setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
                    if (mobileLayoutMode === 'independent') {
                        setMobileOriginalLayout(JSON.parse(JSON.stringify(mobileWidgets)));
                    }
                    setEditMode(true);
                }}
                onCancel={() => setShowMobileDisclaimer(false)}
                onDismissForever={async () => {
                    setMobileDisclaimerDismissed(true);
                    // Persist to user preferences
                    try {
                        await axios.put('/api/config/user', {
                            preferences: {
                                mobileEditDisclaimerDismissed: true
                            }
                        });
                    } catch (error) {
                        logger.error('Failed to save mobile disclaimer preference:', { error });
                    }
                }}
            />

            {/* Unlink Confirmation Modal */}
            <UnlinkConfirmationModal
                isOpen={showUnlinkConfirmation}
                onConfirm={performSave}
                onCancel={() => setShowUnlinkConfirmation(false)}
            />

            {/* Bottom Spacer - On mobile: accounts for tab bar + gap. On desktop: just page margin */}
            <div style={{ height: isMobile ? LAYOUT.TABBAR_HEIGHT + LAYOUT.PAGE_MARGIN : LAYOUT.PAGE_MARGIN }} aria-hidden="true" />
        </div>
    );
};

export default Dashboard;
