/**
 * @deprecated AS OF 2025-12-22 10:43 EST
 * 
 * DevDashboard has been FULLY MIGRATED to Dashboard.tsx.
 * All mobile layout fixes, visibility systems, and edit mode improvements
 * are now in the production Dashboard.tsx file.
 * 
 * This file is kept for reference only and should NOT be used for new development.
 * 
 * See: src/pages/Dashboard.tsx for the current production implementation.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Edit, Save, X as XIcon, Plus, LucideIcon, RotateCcw } from 'lucide-react';
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
import DevDebugOverlay from '../components/dev/DevDebugOverlay';
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

// LocalStorage keys for isolated dev testing
const DEV_STORAGE_KEYS = {
    widgets: 'dev-dashboard-widgets',
    mobileLayoutMode: 'dev-dashboard-mobile-mode',
    mobileWidgets: 'dev-dashboard-mobile-widgets'
};

interface DevStorageData {
    widgets: Widget[];
    mobileLayoutMode: MobileLayoutMode;
    mobileWidgets: Widget[];
}

const DevDashboard = (): React.JSX.Element => {
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
    const [mobileDisclaimerDismissed, setMobileDisclaimerDismissed] = useState<boolean>(false);
    const [pendingUnlink, setPendingUnlink] = useState<boolean>(false);
    const [isUserDragging, setIsUserDragging] = useState<boolean>(false);

    // Widget management
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [integrations, setIntegrations] = useState<Record<string, IntegrationConfig>>({});
    const [sharedIntegrations, setSharedIntegrations] = useState<SharedIntegration[]>([]);
    const [greetingEnabled] = useState<boolean>(true);
    const [greetingText] = useState<string>('Dev Dashboard - Beta Testing');

    const userIsAdmin = isAdmin(user);

    // Grid configuration - FIXED: compactType always 'vertical'
    const effectiveBreakpoint = isMobile ? 'sm' : currentBreakpoint;
    const gridBreakpoints: { [key: string]: number } = isMobile ? { sm: 0 } : { lg: 768, sm: 0 };
    const gridCols: { [key: string]: number } = isMobile ? { sm: 2 } : { lg: 24, sm: 2 };

    // Load data on mount
    useEffect(() => {
        fetchWidgets();
        fetchIntegrations();
        loadUserPreferences();
    }, []);

    const loadUserPreferences = async (): Promise<void> => {
        try {
            const response = await axios.get<UserConfigResponse>('/api/config/user', { withCredentials: true });
            if (response.data?.preferences?.mobileEditDisclaimerDismissed) {
                setMobileDisclaimerDismissed(true);
            }
        } catch (error) {
            logger.debug('Could not load user preferences');
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

    // ISOLATED: fetchWidgets - loads from localStorage if available, otherwise from API
    const fetchWidgets = async (): Promise<void> => {
        try {
            setLoading(true);

            // First check if we have dev data in localStorage
            const storedData = localStorage.getItem(DEV_STORAGE_KEYS.widgets);

            let fetchedWidgets: Widget[] = [];
            let fetchedMobileMode: MobileLayoutMode = 'linked';
            let fetchedMobileWidgets: Widget[] = [];

            if (storedData) {
                // Use localStorage data
                try {
                    const parsed: DevStorageData = JSON.parse(storedData);
                    fetchedWidgets = parsed.widgets || [];
                    fetchedMobileMode = parsed.mobileLayoutMode || 'linked';
                    fetchedMobileWidgets = parsed.mobileWidgets || [];
                    logger.debug('Loaded dev dashboard from localStorage');
                } catch {
                    logger.warn('Failed to parse localStorage, falling back to API');
                    storedData && localStorage.removeItem(DEV_STORAGE_KEYS.widgets);
                }
            }

            // If no localStorage data, fetch from API as initial seed
            if (fetchedWidgets.length === 0) {
                const response = await axios.get<WidgetApiResponse>('/api/widgets');
                fetchedWidgets = response.data.widgets || [];
                fetchedMobileMode = response.data.mobileLayoutMode || 'linked';
                fetchedMobileWidgets = response.data.mobileWidgets || [];
                logger.debug('Seeded dev dashboard from API');
            }

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
        } catch (error) {
            logger.error('Failed to load widgets:', { error });
            setWidgets([]);
            setMobileWidgets([]);
            setLayouts({ lg: [], sm: [] });
        } finally {
            setLoading(false);
        }
    };

    // Helper: Save to localStorage (isolated from main dashboard)
    const saveToLocalStorage = (data: DevStorageData): void => {
        localStorage.setItem(DEV_STORAGE_KEYS.widgets, JSON.stringify(data));
        logger.debug('Saved dev dashboard to localStorage');
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

    // Handle layout change - only mark as unsaved if user is actually dragging
    // This prevents false pendingUnlink triggers on breakpoint changes
    const handleLayoutChange = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }): void => {
        if (!editMode) return;

        // Only mark as unsaved if user is actively dragging/resizing
        // This prevents breakpoint changes from triggering unlink logic
        if (!isUserDragging) return;

        setHasUnsavedChanges(true);

        // Mark as pending unlink if on mobile and currently linked
        if ((isMobile || currentBreakpoint === 'sm') && mobileLayoutMode === 'linked') {
            setPendingUnlink(true);
        }
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
            } else {
                setWidgets(updatedWidgets);
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
        }

        // Reset user dragging flag
        setIsUserDragging(false);
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
                    // Perform unlink - this happens after user confirms in modal
                    const mobileWidgetsToSave = widgets.map(w => ({
                        ...w,
                        layouts: {
                            ...w.layouts,
                            sm: w.layouts?.sm || { x: 0, y: 0, w: 2, h: 2 }
                        }
                    }));

                    // ISOLATED: Save to localStorage only, not to backend
                    saveToLocalStorage({
                        widgets: widgets,
                        mobileLayoutMode: 'independent',
                        mobileWidgets: mobileWidgetsToSave
                    });

                    setMobileLayoutMode('independent');
                    setMobileWidgets(mobileWidgetsToSave);
                    setMobileOriginalLayout(JSON.parse(JSON.stringify(mobileWidgetsToSave)));
                    setPendingUnlink(false);
                    logger.debug('Mobile dashboard unlinked and saved to localStorage');
                } else if (mobileLayoutMode === 'independent') {
                    // Already independent - just save mobile widgets
                    saveToLocalStorage({
                        widgets: widgets,
                        mobileLayoutMode: 'independent',
                        mobileWidgets: mobileWidgets
                    });
                    setMobileOriginalLayout(JSON.parse(JSON.stringify(mobileWidgets)));
                    logger.debug('Independent mobile widgets saved to localStorage');
                }
            } else {
                // Desktop save (no mobile changes) - to localStorage only
                saveToLocalStorage({
                    widgets,
                    mobileLayoutMode,
                    mobileWidgets: mobileLayoutMode === 'independent' ? mobileWidgets : []
                });
            }

            setOriginalLayout(JSON.parse(JSON.stringify(widgets)));
            setHasUnsavedChanges(false);
            setEditMode(false);
            setShowUnlinkConfirmation(false);
            logger.debug('Widgets saved to localStorage (isolated from main dashboard)');
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

    // Reset to linked mode - clears localStorage and forces linked state
    const handleResetMobileLayout = async (): Promise<void> => {
        if (!confirm('Reset to LINKED mode? This will regenerate mobile layouts from desktop.')) {
            return;
        }

        try {
            setLoading(true);

            // Clear localStorage
            localStorage.removeItem(DEV_STORAGE_KEYS.widgets);

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

            // Save this linked state to localStorage
            saveToLocalStorage({
                widgets: fetchedWidgets,
                mobileLayoutMode: 'linked',
                mobileWidgets: []
            });

            logger.debug('Reset to linked mode - regenerated from desktop');
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
                y: Infinity,
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

            setWidgets(withLayouts);
            setLayouts({
                lg: withLayouts.map(w => createLgLayoutItem(w)),
                sm: withLayouts.map(w => createSmLayoutItem(w))
            });

            setHasUnsavedChanges(true);
            setShowAddModal(false);

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

        // Determine padding size based on widget type (matching Dashboard)
        const getPaddingSize = (widgetType: string): 'compact' | 'default' | 'relaxed' => {
            switch (widgetType) {
                case 'weather':
                case 'clock':
                    return 'compact';
                case 'link-grid':
                    return 'compact';
                default:
                    return 'default';
            }
        };

        return (
            <WidgetWrapper
                id={widget.id}
                type={widget.type}
                title={widget.config?.title as string || 'Widget'}
                icon={Icon as LucideIcon}
                editMode={editMode}
                onDelete={handleDeleteWidget}
                flatten={widget.config?.flatten as boolean || false}
                showHeader={widget.config?.showHeader !== false}
                paddingSize={getPaddingSize(widget.type)}
            >
                {/* Debug Y-position badge */}
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
                <WidgetErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                        <WidgetComponent
                            config={widget.config}
                            editMode={editMode}
                            widgetId={widget.id}
                            onVisibilityChange={() => { }}
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

    // Empty state
    if (widgets.length === 0 && !editMode) {
        return (
            <div className="w-full min-h-screen max-w-[2000px] mx-auto fade-in p-2 md:p-8">
                <header className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-bold mb-3 gradient-text">
                            Dev Dashboard (Beta)
                        </h1>
                        <p className="text-xl text-slate-400">{greetingText}</p>
                    </div>
                    <button
                        onClick={() => setEditMode(true)}
                        className="px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-all duration-300 flex items-center gap-2"
                    >
                        <Edit size={16} />
                        Edit
                    </button>
                </header>
                <div className="text-center py-12">
                    <p className="text-theme-secondary">No widgets. Add one to get started.</p>
                    <button onClick={handleAddWidget} className="mt-4 px-4 py-2 bg-accent text-white rounded">Add Widget</button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen max-w-[2000px] mx-auto fade-in p-2 md:p-8">
            {/* Header */}
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold mb-2 gradient-text">
                        Dev Dashboard (Beta)
                    </h1>
                    <p className="text-lg text-slate-400">
                        {editMode ? 'Editing mode - Drag to rearrange widgets' : greetingText}
                    </p>
                    {/* Mode indicator */}
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
                        {/* Reset button for testing */}
                        {mobileLayoutMode === 'independent' && !editMode && (
                            <button
                                onClick={handleResetMobileLayout}
                                className="text-xs px-2 py-1 rounded bg-red-500/50 hover:bg-red-500/70 text-white flex items-center gap-1"
                                title="Reset to linked mode"
                            >
                                <RotateCcw size={12} />
                                Reset
                            </button>
                        )}
                    </div>
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

            {/* Grid Layout */}
            <div className="relative min-h-[400px]">
                {widgets.length > 0 && (
                    <ResponsiveGridLayout
                        className="layout"
                        cols={gridCols}
                        breakpoints={gridBreakpoints}
                        rowHeight={100}
                        // FIX: compactType always 'vertical' - never toggles
                        compactType="vertical"
                        preventCollision={false}
                        isDraggable={editMode && isGlobalDragEnabled}
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
                                    className={editMode ? 'edit-mode' : 'locked'}
                                    style={{
                                        // Debug: color-coded background
                                        backgroundColor: pendingUnlink
                                            ? 'rgba(249, 115, 22, 0.1)'
                                            : mobileLayoutMode === 'independent'
                                                ? 'rgba(34, 197, 94, 0.1)'
                                                : 'rgba(59, 130, 246, 0.1)',
                                        overflow: 'hidden'
                                    }}
                                    data-grid={{
                                        ...layoutItem,
                                        minW: metadata?.minSize?.w || 1,
                                        minH: metadata?.minSize?.h || 1,
                                        maxW: metadata?.maxSize?.w || 24,
                                        maxH: metadata?.maxSize?.h || 10
                                    }}
                                >
                                    {renderedWidget}
                                </div>
                            );
                        })}
                    </ResponsiveGridLayout>
                )}
            </div>

            {/* Dev Debug Overlay - always visible */}
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

            {/* Bottom Spacer */}
            <div style={{ height: isMobile ? LAYOUT.TABBAR_HEIGHT + LAYOUT.PAGE_MARGIN : LAYOUT.PAGE_MARGIN }} aria-hidden="true" />
        </div>
    );
};

export default DevDashboard;
