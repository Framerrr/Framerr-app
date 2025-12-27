import React, { useState, useEffect, Suspense } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Edit, Save, X as XIcon, Plus, LucideIcon, RotateCcw, Link, LayoutGrid, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { LAYOUT } from '../constants/layout';
import WidgetWrapper from '../components/widgets/WidgetWrapper';
import WidgetErrorBoundary from '../components/widgets/WidgetErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getWidgetComponent, getWidgetIcon, getWidgetMetadata } from '../utils/widgetRegistry';
import { generateAllMobileLayouts, migrateWidgetToLayouts } from '../utils/layoutUtils';
import AddWidgetModal from '../components/dashboard/AddWidgetModal';
import MobileEditDisclaimerModal from '../components/dashboard/MobileEditDisclaimerModal';
import UnlinkConfirmationModal from '../components/dashboard/UnlinkConfirmationModal';
import RelinkConfirmationModal from '../components/dashboard/RelinkConfirmationModal';
import UnsavedChangesModal from '../components/dashboard/UnsavedChangesModal';
import { useDashboardEdit } from '../context/DashboardEditContext';
import DevDebugOverlay from '../components/dev/DevDebugOverlay';
import { useTouchDragDelay } from '../hooks/useTouchDragDelay';
import { isAdmin } from '../utils/permissions';
import axios from 'axios';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/GridLayout.css';
import logger from '../utils/logger';
import { useNotifications } from '../context/NotificationContext';
import type { Widget, WidgetLayout } from '../../shared/types/widget';

const ResponsiveGridLayout = WidthProvider(Responsive);

/**
 * DevDashboard - Beta dashboard for testing mobile layout overhaul
 * 
 * KEY FIXES FROM MOBILE_LAYOUT_FIX.md:
 * 1. compactType always 'vertical' (never toggles)
 * 2. No layout sorting in render (pass as-is)
 * 3. Consistent widget DOM order (always sorted by sm.y)
 * 4. No manual recompaction in handleLayoutChange (let grid handle)
 * 
 * DEBUG FEATURES:
 * - Color-coded widgets (blue=linked, green=independent)
 * - Orange border when pendingUnlink
 * - Y-position badges on each widget
 * - Dotted grid cell borders
 * - Draggable debug overlay
 */

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

interface UserConfigResponse {
    preferences?: {
        mobileEditDisclaimerDismissed?: boolean;
        dashboardGreeting?: {
            enabled?: boolean;
            text?: string;
        };
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
    [key: string]: GridLayoutItem[];
}



const Dashboard = (): React.JSX.Element => {
    const { user } = useAuth();
    const { isMobile } = useLayout();
    const { error: showError } = useNotifications();

    // Core state
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [layouts, setLayouts] = useState<LayoutState>({ lg: [], sm: [] });
    const [editMode, setEditMode] = useState<boolean>(false);
    const [isGlobalDragEnabled, setGlobalDragEnabled] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [originalLayout, setOriginalLayout] = useState<Widget[]>([]);
    const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');

    // Mobile dashboard independence state
    const [mobileLayoutMode, setMobileLayoutMode] = useState<MobileLayoutMode>('linked');
    const [mobileWidgets, setMobileWidgets] = useState<Widget[]>([]);
    const [mobileOriginalLayout, setMobileOriginalLayout] = useState<Widget[]>([]);
    const [showMobileDisclaimer, setShowMobileDisclaimer] = useState<boolean>(false);
    const [showUnlinkConfirmation, setShowUnlinkConfirmation] = useState<boolean>(false);
    const [showRelinkConfirmation, setShowRelinkConfirmation] = useState<boolean>(false);
    const [mobileDisclaimerDismissed, setMobileDisclaimerDismissed] = useState<boolean>(false);
    const [pendingUnlink, setPendingUnlink] = useState<boolean>(false);
    const [isUserDragging, setIsUserDragging] = useState<boolean>(false);

    // Dashboard Edit Context - syncs state with context for Sidebar navigation blocking
    const dashboardEditContext = useDashboardEdit();

    // Widget management
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [integrations, setIntegrations] = useState<Record<string, IntegrationConfig>>({});
    const [sharedIntegrations, setSharedIntegrations] = useState<SharedIntegration[]>([]);
    const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({}); // Track widget visibility: {widgetId: boolean}
    const [greetingEnabled, setGreetingEnabled] = useState<boolean>(true);
    const [greetingText, setGreetingText] = useState<string>('Your personal dashboard');

    // Debug overlay toggle (controlled from Settings > Advanced > Debug)
    const [debugOverlayEnabled, setDebugOverlayEnabled] = useState<boolean>(false);

    // Touch gesture detection for iOS-style hold-to-drag on mobile
    // Uses NATIVE event listeners to block react-draggable's touch handling
    // registerWidgetRef attaches capture-phase listeners that block touches during hold detection
    const {
        dragReadyWidgetId,
        registerWidgetRef,
        onWidgetTouchMove,
        onWidgetTouchEnd,
        resetDragReady
    } = useTouchDragDelay();

    const userIsAdmin = isAdmin(user);

    // Grid configuration - FIXED: compactType always 'vertical'
    const effectiveBreakpoint = isMobile ? 'sm' : currentBreakpoint;
    const gridBreakpoints: { [key: string]: number } = isMobile ? { sm: 0 } : { lg: 768, sm: 0 };
    const gridCols: { [key: string]: number } = isMobile ? { sm: 2 } : { lg: 24, sm: 2 };

    // Reset touch drag state when exiting edit mode
    // This ensures the 'widget-drag-ready' visual class is cleared from all widgets
    useEffect(() => {
        if (!editMode) {
            resetDragReady();
        }
    }, [editMode, resetDragReady]);

    // Load data on mount
    useEffect(() => {
        fetchWidgets();
        fetchIntegrations();
        loadUserPreferences();
        loadDebugOverlaySetting();
    }, []);

    // Dynamically adjust widget heights when visibility changes
    // Also restore full heights when entering edit mode
    const prevVisibilityRef = React.useRef<Record<string, boolean>>({});
    const prevEditModeRef = React.useRef<boolean>(false);
    useEffect(() => {
        if (!widgets.length) return;

        // Check if editMode just turned ON - restore all heights
        const editModeJustEnabled = editMode && !prevEditModeRef.current;
        prevEditModeRef.current = editMode;

        if (editModeJustEnabled) {
            logger.debug('Edit mode enabled - restoring all widget heights');
            // Restore all widgets to full height
            if (currentBreakpoint === 'lg') {
                const restoredLgLayouts = (layouts.lg || []).map(layout => {
                    const widget = widgets.find(w => w.id === layout.i);
                    const originalHeight = widget?.layouts?.lg?.h ?? 2;
                    return { ...layout, h: originalHeight };
                });
                setLayouts(prev => ({ ...prev, lg: restoredLgLayouts }));
            } else {
                const restoredSmLayouts = (layouts.sm || []).map(layout => {
                    const widget = widgets.find(w => w.id === layout.i);
                    const originalHeight = widget?.layouts?.sm?.h ?? 2;
                    return { ...layout, h: originalHeight };
                });
                setLayouts(prev => ({ ...prev, sm: restoredSmLayouts }));
            }
            return; // Don't process visibility changes on same tick
        }

        if (editMode) return; // Don't auto-adjust during manual editing

        // Only adjust if visibility actually changed
        const visibilityChanged = Object.keys(widgetVisibility).some(
            key => widgetVisibility[key] !== prevVisibilityRef.current[key]
        ) || Object.keys(prevVisibilityRef.current).some(
            key => prevVisibilityRef.current[key] !== widgetVisibility[key]
        );

        prevVisibilityRef.current = { ...widgetVisibility };

        if (!visibilityChanged) return;

        // Update BOTH breakpoints when visibility changes
        // This ensures visibility is correct regardless of which breakpoint is active
        const updatedLgLayouts = (layouts.lg || []).map(layout => {
            const isHidden = widgetVisibility[layout.i] === false;
            const widget = widgets.find(w => w.id === layout.i);
            const originalHeight = widget?.layouts?.lg?.h ?? 2;
            return { ...layout, h: isHidden ? 0.001 : originalHeight };
        });

        const updatedSmLayouts = (layouts.sm || []).map(layout => {
            const isHidden = widgetVisibility[layout.i] === false;
            const widget = widgets.find(w => w.id === layout.i);
            const originalHeight = widget?.layouts?.sm?.h ?? 2;
            return { ...layout, h: isHidden ? 0.001 : originalHeight };
        });

        setLayouts(prev => ({
            ...prev,
            lg: updatedLgLayouts,
            sm: updatedSmLayouts
        }));
    }, [widgetVisibility, widgets, editMode]);

    // Handle widget visibility change - called by widgets like Plex when they have no content
    const handleWidgetVisibilityChange = (widgetId: string, isVisible: boolean): void => {
        setWidgetVisibility(prev => ({
            ...prev,
            [widgetId]: isVisible
        }));
    };

    // Listen for dashboard reset/update events from Settings
    useEffect(() => {
        const handleWidgetsAdded = (): void => {
            logger.debug('widgets-added event received, reloading dashboard');
            fetchWidgets();
        };

        // Listen for greeting updates from CustomizationSettings
        const handleGreetingUpdated = (event: Event): void => {
            const customEvent = event as CustomEvent<{ enabled: boolean; text: string }>;
            if (customEvent.detail) {
                setGreetingEnabled(customEvent.detail.enabled);
                setGreetingText(customEvent.detail.text);
            }
        };

        // Listen for widget config changes (from LinkGridWidget, ActiveWidgets, etc.)
        // Updates local state, and triggers smart change detection when in edit mode
        const handleWidgetConfigChanged = (event: Event): void => {
            const customEvent = event as CustomEvent<{ widgetId: string; config: Record<string, unknown> }>;
            if (!customEvent.detail) return;

            const { widgetId, config } = customEvent.detail;
            logger.debug('widget-config-changed received', { widgetId, hasConfig: !!config });

            setWidgets(prev => {
                const updated = prev.map(w =>
                    w.id === widgetId ? { ...w, config } : w
                );

                // Only run change detection in edit mode
                if (editMode) {
                    const activeBreakpoint = isMobile ? 'sm' : currentBreakpoint;
                    const { hasChanges, shouldUnlink } = checkForActualChanges(updated, activeBreakpoint);
                    setHasUnsavedChanges(hasChanges);
                    if (activeBreakpoint === 'sm') {
                        setPendingUnlink(hasChanges ? shouldUnlink : false);
                    }
                }

                return updated;
            });
        };

        window.addEventListener('widgets-added', handleWidgetsAdded);
        window.addEventListener('greetingUpdated', handleGreetingUpdated);
        window.addEventListener('widget-config-changed', handleWidgetConfigChanged);
        return () => {
            window.removeEventListener('widgets-added', handleWidgetsAdded);
            window.removeEventListener('greetingUpdated', handleGreetingUpdated);
            window.removeEventListener('widget-config-changed', handleWidgetConfigChanged);
        };
    }, [editMode, isMobile, currentBreakpoint]);

    const loadUserPreferences = async (): Promise<void> => {
        try {
            const response = await axios.get<UserConfigResponse>('/api/config/user', { withCredentials: true });
            if (response.data?.preferences?.mobileEditDisclaimerDismissed) {
                setMobileDisclaimerDismissed(true);
            }
            // Load greeting preferences
            if (response.data?.preferences?.dashboardGreeting) {
                const greeting = response.data.preferences.dashboardGreeting;
                setGreetingEnabled(greeting.enabled ?? true);
                setGreetingText(greeting.text || 'Your personal dashboard');
            }
        } catch (error) {
            logger.debug('Could not load user preferences');
        }
    };

    // Load debug overlay setting from system config (admin only)
    const loadDebugOverlaySetting = async (): Promise<void> => {
        if (!userIsAdmin) return;
        try {
            const response = await axios.get<{ config: { debug?: { overlayEnabled?: boolean } } }>('/api/system/config');
            if (response.data.config?.debug) {
                setDebugOverlayEnabled(response.data.config.debug.overlayEnabled || false);
            }
        } catch (error) {
            // Silently fail - debug overlay is optional
            logger.debug('Failed to load debug overlay setting:', { error });
        }
    };

    const fetchIntegrations = async (): Promise<void> => {
        try {
            if (userIsAdmin) {
                const response = await axios.get<{ integrations: Record<string, IntegrationConfig> }>('/api/integrations');
                setIntegrations(response.data.integrations || {});
            } else {
                const response = await axios.get<{ integrations: SharedIntegration[] }>('/api/integrations/shared');
                setSharedIntegrations(response.data.integrations || []);
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

    // Fetch widgets from API (production)
    const fetchWidgets = async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await axios.get<WidgetApiResponse>('/api/widgets');

            let fetchedWidgets = response.data.widgets || [];
            const fetchedMobileMode = response.data.mobileLayoutMode || 'linked';
            let fetchedMobileWidgets = response.data.mobileWidgets || [];

            setMobileLayoutMode(fetchedMobileMode);

            // Migrate old format
            fetchedWidgets = fetchedWidgets.map(w => migrateWidgetToLayouts(w));

            // Handle mobile widgets based on mode
            if (fetchedMobileMode === 'independent' && fetchedMobileWidgets.length > 0) {
                fetchedMobileWidgets = fetchedMobileWidgets.map(w => migrateWidgetToLayouts(w));
                setMobileWidgets(fetchedMobileWidgets);
                setMobileOriginalLayout(JSON.parse(JSON.stringify(fetchedMobileWidgets)));
                fetchedWidgets = generateAllMobileLayouts(fetchedWidgets);
            } else {
                fetchedWidgets = generateAllMobileLayouts(fetchedWidgets);
                setMobileWidgets([]);
                setMobileOriginalLayout([]);
            }

            setWidgets(fetchedWidgets);

            const initialLayouts: LayoutState = {
                lg: fetchedWidgets.map(w => createLgLayoutItem(w)),
                sm: fetchedMobileMode === 'independent' && fetchedMobileWidgets.length > 0
                    ? fetchedMobileWidgets.map(w => createSmLayoutItem(w))
                    : fetchedWidgets.map(w => createSmLayoutItem(w))
            };

            setLayouts(initialLayouts);
            setOriginalLayout(JSON.parse(JSON.stringify(fetchedWidgets)));
            logger.debug('Loaded widgets from API');
        } catch (error) {
            logger.error('Failed to load widgets:', { error });
            setWidgets([]);
            setMobileWidgets([]);
            setLayouts({ lg: [], sm: [] });
        } finally {
            setLoading(false);
        }
    };



    // Helper: Get layout constraints from widget metadata
    const getLayoutConstraints = (widget: Widget): Partial<GridLayoutItem> => {
        const metadata = getWidgetMetadata(widget.type);
        if (!metadata) return {};

        const constraints: Partial<GridLayoutItem> = {};
        if (metadata.minSize?.w) constraints.minW = metadata.minSize.w;
        if (metadata.minSize?.h) constraints.minH = metadata.minSize.h;
        if (metadata.maxSize?.w) constraints.maxW = metadata.maxSize.w;
        if (metadata.maxSize?.h) constraints.maxH = metadata.maxSize.h;
        return constraints;
    };

    // Helper: Create a layout item with explicit defaults to satisfy TypeScript
    const createLgLayoutItem = (widget: Widget): GridLayoutItem => ({
        i: widget.id,
        x: widget.layouts?.lg?.x ?? 0,
        y: widget.layouts?.lg?.y ?? 0,
        w: widget.layouts?.lg?.w ?? 4,
        h: widget.layouts?.lg?.h ?? 2,
        ...getLayoutConstraints(widget)
    });

    const createSmLayoutItem = (widget: Widget): GridLayoutItem => ({
        i: widget.id,
        x: widget.layouts?.sm?.x ?? 0,
        y: widget.layouts?.sm?.y ?? 0,
        w: widget.layouts?.sm?.w ?? 2,
        h: widget.layouts?.sm?.h ?? 2
    });

    // Check if current layouts OR configs differ from original (for smart change detection)
    // Returns whether there are actual changes and whether unlink should be pending
    // Note: shouldUnlink is only true for LAYOUT changes, not config-only changes
    const checkForActualChanges = (
        updatedWidgets: Widget[],
        breakpoint: 'lg' | 'sm'
    ): { hasChanges: boolean; shouldUnlink: boolean } => {
        // Determine which original to compare against
        const originalToCompare = (breakpoint === 'sm' && mobileLayoutMode === 'independent')
            ? mobileOriginalLayout
            : originalLayout;

        // Different widget count = definitely changed (handled by add/delete, not here)
        if (updatedWidgets.length !== originalToCompare.length) {
            return { hasChanges: true, shouldUnlink: breakpoint === 'sm' && mobileLayoutMode === 'linked' };
        }

        // Track layout and config changes separately
        let hasLayoutChanges = false;
        let hasConfigChanges = false;

        // Compare each widget's layout AND config at the relevant breakpoint
        updatedWidgets.forEach(widget => {
            const original = originalToCompare.find(w => w.id === widget.id);
            if (!original) {
                hasLayoutChanges = true; // Widget doesn't exist in original
                return;
            }

            // Check layout changes
            const curr = widget.layouts?.[breakpoint];
            const orig = original.layouts?.[breakpoint];
            if (curr?.x !== orig?.x ||
                curr?.y !== orig?.y ||
                curr?.w !== orig?.w ||
                curr?.h !== orig?.h) {
                hasLayoutChanges = true;
            }

            // Check config changes (for widgets like LinkGrid)
            const currConfig = JSON.stringify(widget.config || {});
            const origConfig = JSON.stringify(original.config || {});
            if (currConfig !== origConfig) {
                hasConfigChanges = true;
            }
        });

        const hasChanges = hasLayoutChanges || hasConfigChanges;

        return {
            hasChanges,
            // Only trigger unlink for LAYOUT changes, not config-only changes
            shouldUnlink: hasLayoutChanges && breakpoint === 'sm' && mobileLayoutMode === 'linked'
        };
    };

    // Handle layout change - no-op, change detection happens in handleDragResizeStop
    // This callback fires too frequently during drag and before positions are finalized
    const handleLayoutChange = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }): void => {
        // Intentionally empty - smart change detection happens after drag/resize completes
    };

    // Handle drag/resize start - marks that user is actively interacting
    const handleDragStart = (): void => {
        setIsUserDragging(true);
    };

    const handleResizeStart = (): void => {
        setIsUserDragging(true);
    };

    // Handle drag/resize stop - this is where we actually update state
    // Using onDragStop/onResizeStop prevents snap-back because the grid's internal state
    // is finalized before we trigger a re-render with our updated layouts prop
    const handleDragResizeStop = (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement): void => {
        if (!editMode) return;

        const activeBreakpoint = isMobile ? 'sm' : currentBreakpoint;

        // Mobile editing path
        if (activeBreakpoint === 'sm') {
            // Update the layouts state with final positions
            setLayouts(prev => ({
                ...prev,
                sm: layout.map(item => ({
                    i: item.i,
                    x: item.x,
                    y: item.y,
                    w: item.w,
                    h: item.h
                }))
            }));

            // Update the widget objects to match
            const widgetsToUpdate = mobileLayoutMode === 'independent' ? mobileWidgets : widgets;
            const updatedWidgets = widgetsToUpdate.map(widget => {
                const layoutItem = layout.find(l => l.i === widget.id);
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
                setMobileWidgets(updatedWidgets);
                // Check for actual changes vs mobileOriginalLayout
                const { hasChanges } = checkForActualChanges(updatedWidgets, 'sm');
                setHasUnsavedChanges(hasChanges);
                // Already independent, no pendingUnlink needed
            } else {
                setWidgets(updatedWidgets);
                // Check for actual changes vs originalLayout
                const { hasChanges, shouldUnlink } = checkForActualChanges(updatedWidgets, 'sm');
                setHasUnsavedChanges(hasChanges);
                // Clear pendingUnlink if no changes (nothing to unlink), otherwise set based on shouldUnlink
                setPendingUnlink(hasChanges ? shouldUnlink : false);
            }

            // Reset user dragging flag
            setIsUserDragging(false);
            return;
        }

        // Desktop editing path (lg breakpoint)
        if (activeBreakpoint === 'lg') {
            const updatedWidgets = widgets.map(widget => {
                const layoutItem = layout.find(l => l.i === widget.id);
                if (layoutItem) {
                    return {
                        ...widget,
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

            // Regenerate mobile layouts from updated desktop (if linked)
            const withMobileLayouts = mobileLayoutMode === 'linked'
                ? generateAllMobileLayouts(updatedWidgets)
                : updatedWidgets;

            setWidgets(withMobileLayouts);

            // Update layouts state
            setLayouts({
                lg: layout.map(item => ({
                    i: item.i,
                    x: item.x,
                    y: item.y,
                    w: item.w,
                    h: item.h
                })),
                sm: withMobileLayouts.map(w => createSmLayoutItem(w))
            });

            // Check for actual changes vs originalLayout (desktop edits)
            const { hasChanges } = checkForActualChanges(withMobileLayouts, 'lg');
            setHasUnsavedChanges(hasChanges);
            // Desktop edits never trigger pendingUnlink
        }

        // Reset user dragging flag and touch gesture state
        setIsUserDragging(false);
        resetDragReady();
    };

    // Handle breakpoint change - restore independent layouts when switching to mobile
    const handleBreakpointChange = (newBreakpoint: string): void => {
        setCurrentBreakpoint(newBreakpoint as Breakpoint);

        // When switching to mobile (sm) and in independent mode, use mobileWidgets layouts
        if (newBreakpoint === 'sm' && mobileLayoutMode === 'independent' && mobileWidgets.length > 0) {
            setLayouts(prev => ({
                ...prev,
                sm: mobileWidgets.map(w => createSmLayoutItem(w))
            }));
            logger.debug('Restored independent mobile layouts on breakpoint change');
        }
    };

    // Save handler - check pendingUnlink regardless of current viewport
    // User may have made mobile edits, then resized back to desktop before saving
    const handleSave = async (): Promise<void> => {
        if (pendingUnlink && mobileLayoutMode === 'linked') {
            setShowUnlinkConfirmation(true);
            return;
        }
        await performSave();
    };

    const performSave = async (): Promise<void> => {
        try {
            setSaving(true);

            // Check pendingUnlink OR if on mobile with independent mode
            // pendingUnlink means mobile edits were made during this session
            if (pendingUnlink || (isMobile && mobileLayoutMode === 'independent')) {
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
                    // Notify Settings tab of mode change
                    window.dispatchEvent(new CustomEvent('mobile-layout-mode-changed'));
                    logger.debug('Mobile dashboard unlinked and saved');
                } else if (mobileLayoutMode === 'independent') {
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
                // Desktop save (no mobile changes)
                await axios.put('/api/widgets', {
                    widgets,
                    mobileLayoutMode,
                    mobileWidgets: mobileLayoutMode === 'independent' ? mobileWidgets : undefined
                });
            }

            setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
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

    // Cancel handler
    const handleCancel = (): void => {
        setWidgets(JSON.parse(JSON.stringify(originalLayout)));
        if (mobileLayoutMode === 'independent') {
            setMobileWidgets(JSON.parse(JSON.stringify(mobileOriginalLayout)));
        }

        setLayouts({
            lg: originalLayout.map(w => createLgLayoutItem(w)),
            sm: mobileLayoutMode === 'independent' && mobileOriginalLayout.length > 0
                ? mobileOriginalLayout.map(w => createSmLayoutItem(w))
                : originalLayout.map(w => createSmLayoutItem(w))
        });

        setHasUnsavedChanges(false);
        setEditMode(false);
        setPendingUnlink(false);
        setShowUnlinkConfirmation(false);
    };

    // Navigation guard handlers - for modal actions when navigating away
    const handleDiscardAndNavigate = (): void => {
        const destination = dashboardEditContext?.pendingDestination;
        handleCancel();
        dashboardEditContext?.setPendingDestination(null);
        if (destination) {
            window.location.hash = destination;
        }
    };

    const handleSaveAndNavigate = async (): Promise<void> => {
        const destination = dashboardEditContext?.pendingDestination;
        dashboardEditContext?.setPendingDestination(null);
        await performSave();
        if (destination) {
            window.location.hash = destination;
        }
    };

    const handleCancelNavigation = (): void => {
        dashboardEditContext?.setPendingDestination(null);
    };

    // Sync edit state to context for Sidebar navigation blocking
    useEffect(() => {
        dashboardEditContext?.updateEditState({
            editMode,
            hasUnsavedChanges,
            pendingUnlink
        });
    }, [editMode, hasUnsavedChanges, pendingUnlink, dashboardEditContext]);

    // Toggle edit mode
    const handleToggleEdit = (): void => {
        if (editMode && hasUnsavedChanges) {
            handleCancel();
        } else if (!editMode) {
            if (isMobile && mobileLayoutMode === 'linked' && !mobileDisclaimerDismissed) {
                setShowMobileDisclaimer(true);
                return;
            }
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
        if (isMobile) {
            if (mobileLayoutMode === 'independent') {
                const updatedMobileWidgets = mobileWidgets.filter(w => w.id !== widgetId);
                setMobileWidgets(updatedMobileWidgets);
                setLayouts(prev => ({
                    ...prev,
                    sm: updatedMobileWidgets.map(w => createSmLayoutItem(w))
                }));
            } else {
                setPendingUnlink(true);
                const updatedWidgets = widgets.filter(w => w.id !== widgetId);
                const withLayouts = generateAllMobileLayouts(updatedWidgets);
                setWidgets(withLayouts);
                setLayouts({
                    lg: withLayouts.map(w => createLgLayoutItem(w)),
                    sm: withLayouts.map(w => createSmLayoutItem(w))
                });
            }
            setHasUnsavedChanges(true);
            return;
        }

        // Desktop deletion
        const updatedWidgets = widgets.filter(w => w.id !== widgetId);
        const withLayouts = mobileLayoutMode === 'linked'
            ? generateAllMobileLayouts(updatedWidgets)
            : updatedWidgets;
        setWidgets(withLayouts);
        setLayouts({
            lg: withLayouts.map(w => createLgLayoutItem(w)),
            sm: mobileLayoutMode === 'independent' && mobileWidgets.length > 0
                ? mobileWidgets.map(w => createSmLayoutItem(w))
                : withLayouts.map(w => createSmLayoutItem(w))
        });
        setHasUnsavedChanges(true);
    };

    // Reset to linked mode - restores synchronization from desktop
    const handleResetMobileLayout = async (): Promise<void> => {
        try {
            setLoading(true);

            // Fetch widgets from API (ignoring their mobile mode)
            const response = await axios.get<WidgetApiResponse>('/api/widgets');
            let fetchedWidgets = response.data.widgets || [];

            // Migrate and generate mobile layouts fresh from desktop
            fetchedWidgets = fetchedWidgets.map(w => migrateWidgetToLayouts(w));
            fetchedWidgets = generateAllMobileLayouts(fetchedWidgets);

            // Force linked mode
            setMobileLayoutMode('linked');
            setMobileWidgets([]);
            setMobileOriginalLayout([]);
            setPendingUnlink(false);

            setWidgets(fetchedWidgets);
            setOriginalLayout(JSON.parse(JSON.stringify(fetchedWidgets)));

            setLayouts({
                lg: fetchedWidgets.map(w => createLgLayoutItem(w)),
                sm: fetchedWidgets.map(w => createSmLayoutItem(w))
            });

            // Save this linked state to API
            await axios.put('/api/widgets', {
                widgets: fetchedWidgets,
                mobileLayoutMode: 'linked',
                mobileWidgets: []
            });

            logger.debug('Reset to linked mode - regenerated from desktop');
            // Notify Settings tab of mode change
            window.dispatchEvent(new CustomEvent('mobile-layout-mode-changed'));
        } catch (error) {
            logger.error('Failed to reset:', { error });
        } finally {
            setLoading(false);
        }
    };

    // Add widget
    const handleAddWidget = (): void => {
        setShowAddModal(true);
        if (!editMode) setEditMode(true);
    };

    const handleAddWidgetFromModal = async (widgetType: string): Promise<void> => {
        try {
            const metadata = getWidgetMetadata(widgetType);
            if (!metadata) {
                showError('Add Widget Failed', 'Widget type not found.');
                return;
            }

            const newWidget: Widget = {
                id: `widget-${Date.now()}`,
                i: `widget-${Date.now()}`,
                type: widgetType,
                x: 0,
                y: 0, // Add to TOP of page, not bottom
                w: metadata.defaultSize.w,
                h: metadata.defaultSize.h,
                config: {
                    title: metadata.name,
                    ...(metadata.requiresIntegration && {
                        enabled: true,
                        ...integrations[metadata.requiresIntegration]
                    })
                }
            };

            const migratedWidget = migrateWidgetToLayouts(newWidget);
            const allWidgets = [...widgets, migratedWidget];
            const withLayouts = generateAllMobileLayouts(allWidgets);

            // Get the new widget height for shifting calculation
            const newWidgetId = migratedWidget.id;
            const newLgHeight = migratedWidget.layouts?.lg?.h ?? metadata.defaultSize.h;
            const newSmHeight = withLayouts.find(w => w.id === newWidgetId)?.layouts?.sm?.h ?? 2;

            // Update widget objects with new positions (new widget at full width, existing shifted down)
            const updatedWidgets = withLayouts.map(w => {
                if (w.id === newWidgetId) {
                    // New widget at top, full width
                    return {
                        ...w,
                        layouts: {
                            ...w.layouts,
                            lg: { x: 0, y: 0, w: 24, h: w.layouts?.lg?.h ?? metadata.defaultSize.h },
                            sm: { x: 0, y: 0, w: 2, h: w.layouts?.sm?.h ?? 2 }
                        }
                    };
                }
                // Shift existing widgets down
                return {
                    ...w,
                    layouts: {
                        ...w.layouts,
                        lg: { ...w.layouts?.lg, y: (w.layouts?.lg?.y ?? 0) + newLgHeight } as WidgetLayout,
                        sm: { ...w.layouts?.sm, y: (w.layouts?.sm?.y ?? 0) + newSmHeight } as WidgetLayout
                    }
                };
            });

            // Create layouts from updated widgets
            const lgLayouts = updatedWidgets.map(w => createLgLayoutItem(w));
            const smLayouts = updatedWidgets.map(w => createSmLayoutItem(w));

            setWidgets(updatedWidgets);
            setLayouts({
                lg: lgLayouts,
                sm: smLayouts
            });

            setHasUnsavedChanges(true);
            setShowAddModal(false);

            // Trigger pending unlink if adding widget on mobile while linked
            // BUT only if there are existing widgets (first widget on empty dashboard shouldn't trigger)
            if ((isMobile || currentBreakpoint === 'sm') && mobileLayoutMode === 'linked' && widgets.length > 0) {
                setPendingUnlink(true);
            }

            if (!editMode) {
                setEditMode(true);
                setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
            }
        } catch (error) {
            logger.error('Failed to add widget:', { error });
            showError('Add Widget Failed', 'Failed to add widget.');
        }
    };

    // Render widget with debug visuals
    const renderWidget = (widget: Widget): React.JSX.Element | null => {
        const WidgetComponent = getWidgetComponent(widget.type);
        const defaultIcon = getWidgetIcon(widget.type);

        if (!WidgetComponent) return null;

        let Icon: LucideIcon | React.FC;
        if (widget.config?.customIcon) {
            const customIconValue = widget.config.customIcon as string;
            if (customIconValue.startsWith('custom:')) {
                const iconId = customIconValue.replace('custom:', '');
                Icon = () => <img src={`/api/custom-icons/${iconId}/file`} alt="custom icon" className="w-full h-full object-cover rounded" />;
            } else if (customIconValue.startsWith('data:')) {
                Icon = () => <img src={customIconValue} alt="custom icon" className="w-full h-full object-cover rounded" />;
            } else {
                Icon = (Icons as unknown as Record<string, LucideIcon>)[customIconValue] || defaultIcon;
            }
        } else {
            Icon = defaultIcon;
        }

        // Get Y position for debug badge
        const smLayout = layouts.sm.find(l => l.i === widget.id);
        const yPos = smLayout?.y ?? '?';

        // Create extra edit controls for link-grid widget (justify button)
        const linkGridExtraControls = widget.type === 'link-grid' ? (() => {
            const gridJustify = (widget.config?.gridJustify as 'left' | 'center' | 'right') || 'center';
            const JustifyIcon = gridJustify === 'left' ? AlignLeft
                : gridJustify === 'center' ? AlignCenter
                    : AlignRight;

            const handleJustifyToggle = () => {
                const nextJustify = gridJustify === 'left' ? 'center'
                    : gridJustify === 'center' ? 'right'
                        : 'left';

                // Update widget config and trigger save detection
                window.dispatchEvent(new CustomEvent('widget-config-changed', {
                    detail: {
                        widgetId: widget.id,
                        config: { ...widget.config, gridJustify: nextJustify }
                    }
                }));
            };

            return (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleJustifyToggle();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-10 h-10 rounded-lg bg-accent/20 hover:bg-accent/30 
                        flex items-center justify-center text-accent hover:text-accent
                        transition-all duration-200"
                    style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
                    title={`Align: ${gridJustify}`}
                >
                    <JustifyIcon size={20} />
                </button>
            );
        })() : undefined;

        // Create extra edit controls for clock widget (24H, SS, Date toggles)
        const clockExtraControls = widget.type === 'clock' ? (() => {
            const format24h = widget.config?.format24h !== false;
            const showSeconds = widget.config?.showSeconds !== false;
            const showDate = widget.config?.showDate !== false;

            const toggleConfig = (key: string, currentValue: boolean) => {
                window.dispatchEvent(new CustomEvent('widget-config-changed', {
                    detail: {
                        widgetId: widget.id,
                        config: { ...widget.config, [key]: !currentValue }
                    }
                }));
            };

            // Button styling - accent when ON, muted when OFF
            const getButtonClass = (isOn: boolean) => isOn
                ? 'w-10 h-10 rounded-lg bg-accent/20 hover:bg-accent/30 flex items-center justify-center text-accent transition-all duration-200'
                : 'w-10 h-10 rounded-lg bg-theme-tertiary hover:bg-theme-hover flex items-center justify-center text-theme-tertiary transition-all duration-200';

            return (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleConfig('format24h', format24h); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={getButtonClass(format24h)}
                        style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
                        title={format24h ? '24-hour format' : '12-hour format'}
                    >
                        <span className="text-xs font-bold">24H</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleConfig('showSeconds', showSeconds); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={getButtonClass(showSeconds)}
                        style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
                        title={showSeconds ? 'Seconds shown' : 'Seconds hidden'}
                    >
                        <span className="text-xs font-bold">:SS</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleConfig('showDate', showDate); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={getButtonClass(showDate)}
                        style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
                        title={showDate ? 'Show date (on)' : 'Hide date (off)'}
                    >
                        <span className="text-xs font-bold">Date</span>
                    </button>
                </>
            );
        })() : undefined;

        // Combine extra controls based on widget type
        const extraControls = linkGridExtraControls || clockExtraControls;

        return (
            <WidgetWrapper
                id={widget.id}
                type={widget.type}
                title={widget.config?.title as string || getWidgetMetadata(widget.type)?.name || 'Widget'}
                icon={Icon as LucideIcon}
                editMode={editMode}
                onDelete={handleDeleteWidget}
                flatten={widget.config?.flatten as boolean || false}
                showHeader={widget.config?.showHeader !== false}
                extraEditControls={extraControls}
            >
                {/* Debug Y-position badge - only visible when debug overlay enabled */}
                {debugOverlayEnabled && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            zIndex: 100
                        }}
                    >
                        sm.y: {yPos}
                    </div>
                )}
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

    // Get widgets to render - use layouts.sm for ordering during edit to prevent snap-back
    const getDisplayWidgets = (): Widget[] => {
        const widgetsToUse = mobileLayoutMode === 'independent' && isMobile
            ? mobileWidgets
            : widgets;

        // During edit mode on mobile, use layouts.sm state for ordering
        // This prevents snap-back by keeping DOM order in sync with grid's internal state
        if (editMode && (isMobile || currentBreakpoint === 'sm')) {
            return [...widgetsToUse].sort((a, b) => {
                const aLayout = layouts.sm.find(l => l.i === a.id);
                const bLayout = layouts.sm.find(l => l.i === b.id);
                return (aLayout?.y ?? 0) - (bLayout?.y ?? 0);
            });
        }

        // Outside edit mode, sort by widget's stored sm.y
        return [...widgetsToUse].sort((a, b) =>
            (a.layouts?.sm?.y ?? 0) - (b.layouts?.sm?.y ?? 0)
        );
    };

    // Loading state
    if (loading) {
        return <div className="h-full w-full flex items-center justify-center"><LoadingSpinner /></div>;
    }

    // Is dashboard empty? (unified layout handles this now)
    const isEmpty = widgets.length === 0;

    return (
        <div className={`w-full min-h-screen max-w-[2000px] mx-auto fade-in p-2 md:p-8 ${editMode ? 'dashboard-edit-mode' : ''}`}>
            {/* Header */}
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold mb-2 gradient-text">
                        Welcome back, {user?.displayName || user?.username || 'User'}
                    </h1>
                    {(editMode || greetingEnabled) && (
                        <p className="text-lg text-slate-400">
                            {editMode ? 'Editing mode - Drag to rearrange widgets' : greetingText}
                        </p>
                    )}
                    {/* Edit mode layout status badge - always visible in edit mode */}
                    {editMode && (
                        <div className="flex items-center gap-2 mt-2">
                            <span
                                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${mobileLayoutMode === 'linked'
                                    ? 'bg-accent/20 text-accent'
                                    : 'bg-green-500/20 text-green-400'
                                    }`}
                            >
                                {mobileLayoutMode === 'linked' ? (
                                    <>
                                        <Link size={12} />
                                        Synced
                                    </>
                                ) : (
                                    <>
                                        <LayoutGrid size={12} />
                                        Independent
                                    </>
                                )}
                            </span>
                            {pendingUnlink && (
                                <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400">
                                    Pending Unlink
                                </span>
                            )}
                        </div>
                    )}
                    {/* Debug mode indicator - only visible when debug overlay enabled */}
                    {debugOverlayEnabled && (
                        <div className="flex items-center gap-2 mt-2">
                            <span
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                    backgroundColor: mobileLayoutMode === 'linked' ? '#3b82f680' : '#22c55e80',
                                    color: '#fff'
                                }}
                            >
                                {mobileLayoutMode.toUpperCase()}
                            </span>
                            {pendingUnlink && (
                                <span className="text-xs px-2 py-1 rounded bg-orange-500/50 text-white">
                                    PENDING UNLINK
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {editMode ? (
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={handleAddWidget}
                                className="px-3 py-2 text-sm font-medium bg-theme-secondary hover:bg-theme-tertiary text-theme-primary rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">Add</span>
                            </button>
                            {/* Re-link button - only when mobile is independent */}
                            {mobileLayoutMode === 'independent' && (
                                <button
                                    onClick={() => setShowRelinkConfirmation(true)}
                                    className="px-3 py-2 text-sm font-medium bg-theme-tertiary hover:bg-theme-hover border border-theme text-theme-secondary hover:text-theme-primary rounded-lg transition-colors flex items-center gap-2"
                                    title="Re-link mobile layout to desktop"
                                >
                                    <Link size={16} />
                                    <span className="hidden sm:inline">Re-link</span>
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={saving || !hasUnsavedChanges}
                                className="px-3 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={16} />
                                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                                onClick={handleCancel}
                                className="px-3 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-colors"
                            >
                                <XIcon size={16} />
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
            </header>

            {/* Grid Layout or Empty State */}
            <div className="relative min-h-[400px]">
                {isEmpty ? (
                    /* Empty Dashboard Content - inline */
                    <div className="flex items-center justify-center py-12">
                        <div className="glass-card rounded-2xl p-10 max-w-xl w-full border border-theme text-center space-y-5">
                            {/* Icon with glow effect */}
                            <div className="flex justify-center mb-2">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full"></div>
                                    <LayoutGrid
                                        size={64}
                                        className="relative text-accent"
                                        strokeWidth={1.5}
                                    />
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-theme-primary">
                                    Your Dashboard is Empty
                                </h2>
                                <p className="text-theme-secondary">
                                    Add your first widget to get started.
                                </p>
                            </div>

                            {/* CTA Button */}
                            <div className="pt-2">
                                <button
                                    onClick={handleAddWidget}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
                                >
                                    <Plus size={18} />
                                    Add Your First Widget
                                </button>
                            </div>

                            {/* Helper Text */}
                            <p className="text-xs text-theme-tertiary pt-2">
                                💡 Widgets can display your media, downloads, system stats, and more.
                            </p>
                        </div>
                    </div>
                ) : (
                    <ResponsiveGridLayout
                        className="layout"
                        cols={gridCols}
                        breakpoints={gridBreakpoints}
                        rowHeight={100}
                        // FIX: compactType always 'vertical' - never toggles
                        compactType="vertical"
                        preventCollision={false}
                        // On mobile: only allow drag when touch hold threshold is reached
                        // This requires tap-unlock-drag pattern (two-phase)
                        // On desktop: allow drag immediately (no touch delay needed)
                        isDraggable={editMode && isGlobalDragEnabled && (!isMobile || dragReadyWidgetId !== null)}
                        isResizable={editMode && isGlobalDragEnabled}
                        resizeHandles={isMobile ? ['s'] : ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']}
                        draggableCancel=".no-drag"
                        margin={[16, 16]}
                        containerPadding={[0, 0]}
                        // FIX: Pass layouts as-is, no sorting
                        layouts={layouts}
                        onLayoutChange={handleLayoutChange}
                        onDragStart={handleDragStart}
                        onResizeStart={handleResizeStart}
                        onDragStop={handleDragResizeStop}
                        onResizeStop={handleDragResizeStop}
                        onBreakpointChange={handleBreakpointChange}
                    >
                        {/* FIX: Always render in consistent order */}
                        {getDisplayWidgets().map(widget => {
                            const metadata = getWidgetMetadata(widget.type);
                            // Use correct breakpoint layout based on current state
                            const currentBpLayouts = (isMobile || currentBreakpoint === 'sm') ? layouts.sm : layouts.lg;
                            const layoutItem = currentBpLayouts.find(l => l.i === widget.id) || {
                                i: widget.id,
                                x: widget.layouts?.lg?.x || 0,
                                y: widget.layouts?.lg?.y || 0,
                                w: widget.layouts?.lg?.w || 4,
                                h: widget.layouts?.lg?.h || 2
                            };

                            const renderedWidget = renderWidget(widget);
                            if (!renderedWidget) return null;

                            return (
                                <div
                                    key={widget.id}
                                    className={`${editMode ? 'edit-mode' : 'locked'} ${dragReadyWidgetId === widget.id ? 'widget-drag-ready' : ''}`}
                                    // Native touch blocking via ref callback
                                    // registerWidgetRef attaches capture-phase listeners that block react-draggable
                                    ref={(el) => {
                                        if (editMode && isMobile) {
                                            registerWidgetRef(widget.id, el);
                                        } else {
                                            // Unregister when not in edit mode or not mobile
                                            registerWidgetRef(widget.id, null);
                                        }
                                    }}
                                    // Keep React touch handlers for compatibility
                                    onTouchMove={dragReadyWidgetId !== widget.id ? onWidgetTouchMove : undefined}
                                    onTouchEnd={editMode && isMobile ? onWidgetTouchEnd : undefined}
                                    style={{
                                        // Debug: color-coded background (only when overlay enabled)
                                        backgroundColor: debugOverlayEnabled
                                            ? (pendingUnlink
                                                ? 'rgba(249, 115, 22, 0.1)'
                                                : mobileLayoutMode === 'independent'
                                                    ? 'rgba(34, 197, 94, 0.1)'
                                                    : 'rgba(59, 130, 246, 0.1)')
                                            : undefined,
                                        overflow: 'hidden',
                                        // iOS: Prevent gesture conflicts during edit mode (zoom, scroll gestures)
                                        touchAction: editMode && isMobile ? 'none' : undefined
                                    }}
                                    data-grid={{
                                        ...layoutItem,
                                        minH: metadata?.minSize?.h || 1,
                                        maxW: metadata?.maxSize?.w || 24,
                                        maxH: metadata?.maxSize?.h || 10,
                                        // On mobile: only allow dragging the specific widget that passed hold threshold
                                        isDraggable: editMode && isGlobalDragEnabled && (!isMobile || dragReadyWidgetId === widget.id)
                                    }}
                                >
                                    {renderedWidget}
                                </div>
                            );
                        })}
                    </ResponsiveGridLayout>
                )}
            </div>

            {/* Debug Overlay - controlled from Settings > Advanced > Debug */}
            {debugOverlayEnabled && (
                <DevDebugOverlay
                    mobileLayoutMode={mobileLayoutMode}
                    pendingUnlink={pendingUnlink}
                    currentBreakpoint={currentBreakpoint}
                    editMode={editMode}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isMobile={isMobile}
                    isUserDragging={isUserDragging}
                    widgets={widgets}
                    mobileWidgets={mobileWidgets}
                    layouts={layouts}
                    widgetVisibility={widgetVisibility}
                />
            )}

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
                    try {
                        await axios.put('/api/config/user', {
                            preferences: { mobileEditDisclaimerDismissed: true }
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

            {/* Relink Confirmation Modal */}
            <RelinkConfirmationModal
                isOpen={showRelinkConfirmation}
                onConfirm={async () => {
                    setShowRelinkConfirmation(false);
                    setEditMode(false); // Close edit mode after re-linking
                    await handleResetMobileLayout();
                }}
                onCancel={() => setShowRelinkConfirmation(false)}
            />

            {/* Navigation Guard Modals - shown when pendingDestination is set */}
            {dashboardEditContext?.pendingDestination && pendingUnlink && (
                <UnlinkConfirmationModal
                    isOpen={true}
                    onConfirm={handleSaveAndNavigate}
                    onCancel={handleCancelNavigation}
                    onDiscard={handleDiscardAndNavigate}
                />
            )}
            {dashboardEditContext?.pendingDestination && !pendingUnlink && hasUnsavedChanges && (
                <UnsavedChangesModal
                    isOpen={true}
                    onSave={handleSaveAndNavigate}
                    onCancel={handleCancelNavigation}
                    onDiscard={handleDiscardAndNavigate}
                />
            )}

            {/* Bottom Spacer */}
            <div style={{ height: isMobile ? LAYOUT.TABBAR_HEIGHT + LAYOUT.PAGE_MARGIN : LAYOUT.PAGE_MARGIN }} aria-hidden="true" />
        </div>
    );
};

export default Dashboard;
