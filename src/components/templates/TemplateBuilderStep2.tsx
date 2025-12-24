/**
 * TemplateBuilderStep2 - Grid Editor for template building
 * 
 * DASHBOARD PARITY: Editing behavior matches Dashboard.tsx
 * - Full widget drag (not just header)
 * - 8-direction resize handles on desktop
 * - New widgets placed at y:0, existing shifted down
 * - Edit mode CSS classes for hover effects
 * - Delete button with .no-drag class
 * - Undo/Redo with Ctrl+Z / Ctrl+Shift+Z
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Plus, X, ChevronLeft, ChevronRight, LayoutGrid, Monitor, Smartphone, Undo2, Redo2 } from 'lucide-react';
import { getWidgetsByCategory, getWidgetIcon, getWidgetMetadata, WIDGET_TYPES } from '../../utils/widgetRegistry';
import type { TemplateData, TemplateWidget } from './TemplateBuilder';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../../styles/GridLayout.css'; // Dashboard edit mode styles

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Step2Props {
    data: TemplateData;
    onChange: (updates: Partial<TemplateData>) => void;
}

// Grid configuration matching REAL dashboard (Dashboard.tsx)
const GRID_COLS = { lg: 24, sm: 2 };
const ROW_HEIGHT = 60;
const BREAKPOINTS = { lg: 768, sm: 0 };

// Max history size to prevent memory issues
const MAX_HISTORY_SIZE = 50;

type ViewMode = 'desktop' | 'mobile';

const TemplateBuilderStep2: React.FC<Step2Props> = ({ data, onChange }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('desktop');

    // Undo/Redo history stacks
    const [undoStack, setUndoStack] = useState<TemplateWidget[][]>([]);
    const [redoStack, setRedoStack] = useState<TemplateWidget[][]>([]);

    // Track if we're in the middle of an undo/redo operation
    const isUndoRedoRef = useRef(false);
    // Track the last committed state to detect real changes
    const lastCommittedRef = useRef<string>(JSON.stringify(data.widgets));

    // Get all available widgets
    const widgetsByCategory = useMemo(() => getWidgetsByCategory(), []);

    // Convert template widgets to grid layouts
    const layouts = useMemo(() => {
        const lgLayout: Layout[] = data.widgets.map((widget, index) => ({
            i: `widget-${index}`,
            x: widget.layout.x,
            y: widget.layout.y,
            w: widget.layout.w,
            h: widget.layout.h,
            minW: WIDGET_TYPES[widget.type]?.minSize?.w,
            minH: WIDGET_TYPES[widget.type]?.minSize?.h,
            maxW: WIDGET_TYPES[widget.type]?.maxSize?.w,
            maxH: WIDGET_TYPES[widget.type]?.maxSize?.h,
        }));

        // Auto-generate mobile layouts using band detection algorithm (matches layoutUtils.ts)
        // This ensures template preview matches actual dashboard mobile layout

        // Step 1: Build widget info with Y ranges
        const widgetInfos = data.widgets.map((w, i) => ({
            index: i,
            x: w.layout.x,
            y: w.layout.y,
            h: w.layout.h,
            yStart: w.layout.y,
            yEnd: w.layout.y + w.layout.h,
        }));

        // Step 2: Sort by Y, then X, then index for deterministic ordering
        const ySorted = [...widgetInfos].sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            if (a.x !== b.x) return a.x - b.x;
            return a.index - b.index;
        });

        // Step 3: Band detection - group widgets that overlap vertically
        const bands: typeof widgetInfos[] = [];
        let currentBand: typeof widgetInfos = [];
        let currentBandMaxY = -1;

        ySorted.forEach((widget) => {
            if (currentBand.length === 0) {
                currentBand.push(widget);
                currentBandMaxY = widget.yEnd;
                return;
            }

            // Hard cut: widget starts at or after current band's bottom
            if (widget.y >= currentBandMaxY) {
                bands.push(currentBand);
                currentBand = [widget];
                currentBandMaxY = widget.yEnd;
            } else {
                // Widget overlaps with current band
                currentBand.push(widget);
                currentBandMaxY = Math.max(currentBandMaxY, widget.yEnd);
            }
        });

        if (currentBand.length > 0) {
            bands.push(currentBand);
        }

        // Step 4: Sort each band by X (left column first), then Y, then index
        const sortedIndices = bands.flatMap(band =>
            [...band].sort((a, b) => {
                if (a.x !== b.x) return a.x - b.x;
                if (a.y !== b.y) return a.y - b.y;
                return a.index - b.index;
            }).map(item => item.index)
        );

        // Step 5: Create stacked mobile layout
        let mobileY = 0;
        const smLayout: Layout[] = sortedIndices.map(originalIndex => {
            const widget = data.widgets[originalIndex];
            const layoutItem = {
                i: `widget-${originalIndex}`,
                x: 0,
                y: mobileY,
                w: 2, // Full width on mobile
                h: widget.layout.h,
            };
            mobileY += widget.layout.h;
            return layoutItem;
        });

        return { lg: lgLayout, sm: smLayout };
    }, [data.widgets]);

    // Add widget to template - PARITY: y:0, full width, shift existing down
    const handleAddWidget = useCallback((widgetType: string) => {
        const metadata = getWidgetMetadata(widgetType);
        if (!metadata) return;

        const newWidgetHeight = metadata.defaultSize.h;

        // Create new widget at y:0, full width (24 cols)
        const newWidget: TemplateWidget = {
            type: widgetType,
            layout: {
                x: 0,
                y: 0,
                w: 24, // Full width like dashboard
                h: newWidgetHeight,
            },
        };

        // Shift all existing widgets down by new widget's height
        const shiftedWidgets = data.widgets.map(w => ({
            ...w,
            layout: {
                ...w.layout,
                y: w.layout.y + newWidgetHeight,
            },
        }));

        onChange({ widgets: [newWidget, ...shiftedWidgets] });
    }, [data.widgets, onChange]);

    // Remove widget from template
    const handleRemoveWidget = useCallback((index: number) => {
        const newWidgets = [...data.widgets];
        newWidgets.splice(index, 1);
        onChange({ widgets: newWidgets });
    }, [data.widgets, onChange]);

    // Handle layout change from grid (desktop editing only)
    const handleLayoutChange = useCallback((layout: Layout[]) => {
        if (viewMode !== 'desktop') return; // Don't update on mobile preview

        const newWidgets = data.widgets.map((widget, index) => {
            const layoutItem = layout.find(l => l.i === `widget-${index}`);
            if (!layoutItem) return widget;
            return {
                ...widget,
                layout: {
                    x: layoutItem.x,
                    y: layoutItem.y,
                    w: layoutItem.w,
                    h: layoutItem.h,
                },
            };
        });
        onChange({ widgets: newWidgets });
    }, [data.widgets, onChange, viewMode]);

    // Push current state to undo stack (called before making changes)
    const pushToHistory = useCallback(() => {
        if (isUndoRedoRef.current) return; // Don't push during undo/redo

        const currentState = JSON.stringify(data.widgets);
        // Only push if state actually changed
        if (currentState !== lastCommittedRef.current) {
            setUndoStack(prev => {
                const newStack = [...prev, data.widgets];
                // Limit history size
                if (newStack.length > MAX_HISTORY_SIZE) {
                    return newStack.slice(-MAX_HISTORY_SIZE);
                }
                return newStack;
            });
            // Clear redo stack on new action
            setRedoStack([]);
            lastCommittedRef.current = currentState;
        }
    }, [data.widgets]);

    // Track widget changes for history
    useEffect(() => {
        const currentState = JSON.stringify(data.widgets);
        if (!isUndoRedoRef.current && currentState !== lastCommittedRef.current) {
            pushToHistory();
        }
    }, [data.widgets, pushToHistory]);

    // Undo handler
    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;

        isUndoRedoRef.current = true;

        // Save current state to redo stack
        setRedoStack(prev => [...prev, data.widgets]);

        // Pop from undo stack and apply
        const newUndoStack = [...undoStack];
        const previousState = newUndoStack.pop()!;
        setUndoStack(newUndoStack);

        lastCommittedRef.current = JSON.stringify(previousState);
        onChange({ widgets: previousState });

        // Reset flag after state update
        setTimeout(() => {
            isUndoRedoRef.current = false;
        }, 0);
    }, [undoStack, data.widgets, onChange]);

    // Redo handler
    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;

        isUndoRedoRef.current = true;

        // Save current state to undo stack
        setUndoStack(prev => [...prev, data.widgets]);

        // Pop from redo stack and apply
        const newRedoStack = [...redoStack];
        const nextState = newRedoStack.pop()!;
        setRedoStack(newRedoStack);

        lastCommittedRef.current = JSON.stringify(nextState);
        onChange({ widgets: nextState });

        // Reset flag after state update
        setTimeout(() => {
            isUndoRedoRef.current = false;
        }, 0);
    }, [redoStack, data.widgets, onChange]);

    // Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if not in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            }

            // Also support Ctrl+Y for redo (Windows standard)
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    // Determine grid cols based on view mode
    const activeCols = viewMode === 'desktop' ? { lg: 24 } : { sm: 2 };
    const activeBreakpoints = viewMode === 'desktop' ? { lg: 0 } : { sm: 0 };

    // Can undo/redo checks
    const canUndo = undoStack.length > 0;
    const canRedo = redoStack.length > 0;

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* Toolbar */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-theme bg-theme-secondary rounded-t-lg">
                <div className="flex items-center gap-2">
                    {/* Desktop/Mobile Toggle */}
                    <div className="flex items-center gap-1 bg-theme-primary rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('desktop')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'desktop'
                                ? 'bg-accent text-white'
                                : 'text-theme-secondary hover:text-theme-primary'
                                }`}
                        >
                            <Monitor size={14} />
                            Desktop
                        </button>
                        <button
                            onClick={() => setViewMode('mobile')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'mobile'
                                ? 'bg-accent text-white'
                                : 'text-theme-secondary hover:text-theme-primary'
                                }`}
                        >
                            <Smartphone size={14} />
                            Mobile
                        </button>
                    </div>

                    {/* Undo/Redo Buttons */}
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            onClick={handleUndo}
                            disabled={!canUndo || viewMode === 'mobile'}
                            className={`p-2 rounded-lg transition-colors ${canUndo && viewMode === 'desktop'
                                    ? 'hover:bg-theme-hover text-theme-primary'
                                    : 'text-theme-tertiary opacity-50 cursor-not-allowed'
                                }`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={!canRedo || viewMode === 'mobile'}
                            className={`p-2 rounded-lg transition-colors ${canRedo && viewMode === 'desktop'
                                    ? 'hover:bg-theme-hover text-theme-primary'
                                    : 'text-theme-tertiary opacity-50 cursor-not-allowed'
                                }`}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo2 size={16} />
                        </button>
                    </div>
                </div>

                <div className="text-xs text-theme-tertiary">
                    {data.widgets.length} widget{data.widgets.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Mobile Preview Banner */}
            {viewMode === 'mobile' && (
                <div className="flex-shrink-0 px-4 py-2 bg-info/10 border-b border-info/30 text-info text-sm text-center">
                    Mobile layout is auto-generated. You can customize it later from your dashboard.
                </div>
            )}

            <div className="flex flex-1 min-h-0 overflow-hidden rounded-b-lg border border-t-0 border-theme">
                {/* Widget Sidebar */}
                <div
                    className={`flex-shrink-0 bg-theme-secondary border-r border-theme transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-72' : 'w-12'
                        }`}
                >
                    {sidebarOpen ? (
                        <div className="flex flex-col h-full min-h-0">
                            {/* Sidebar Header */}
                            <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-theme">
                                <span className="font-medium text-theme-primary text-sm">Add Widget</span>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-1 rounded hover:bg-theme-hover text-theme-secondary"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                            </div>

                            {/* Widget List - ONLY SCROLLABLE ELEMENT */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                                {Object.entries(widgetsByCategory).map(([category, widgets]) => (
                                    <div key={category}>
                                        <div className="text-xs font-medium text-theme-tertiary uppercase tracking-wide mb-2 px-2">
                                            {category}
                                        </div>
                                        <div className="space-y-1">
                                            {widgets.map(widget => {
                                                const Icon = widget.icon;
                                                return (
                                                    <button
                                                        key={widget.type}
                                                        onClick={() => handleAddWidget(widget.type)}
                                                        disabled={viewMode === 'mobile'}
                                                        className={`w-full flex items-center gap-2 p-2 rounded-lg
                                                                   bg-theme-primary hover:bg-theme-hover border border-theme
                                                                   transition-colors text-left group
                                                                   ${viewMode === 'mobile' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <div className="p-1.5 rounded bg-accent/20 text-accent">
                                                            <Icon size={14} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-theme-primary truncate">
                                                                {widget.name}
                                                            </div>
                                                            <div className="text-xs text-theme-tertiary">
                                                                {widget.defaultSize.w}×{widget.defaultSize.h}
                                                            </div>
                                                        </div>
                                                        <Plus size={14} className="text-theme-tertiary group-hover:text-accent" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="w-full h-full flex items-center justify-center hover:bg-theme-hover text-theme-secondary"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>

                {/* Grid Canvas - scrollable when content exceeds height */}
                <div className={`flex-1 bg-theme-tertiary overflow-auto custom-scrollbar ${viewMode === 'mobile' ? 'max-w-[400px] mx-auto' : ''}`}>
                    {data.widgets.length === 0 ? (
                        /* Empty State */
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="p-4 rounded-full bg-theme-secondary mb-4">
                                <LayoutGrid size={32} className="text-theme-tertiary" />
                            </div>
                            <h3 className="text-lg font-medium text-theme-primary mb-2">
                                Start building your template
                            </h3>
                            <p className="text-sm text-theme-secondary max-w-md">
                                Click widgets from the sidebar to add them to your layout.
                                You can drag to reposition and resize them.
                            </p>
                        </div>
                    ) : (
                        /* Grid Layout */
                        <div className="p-4 h-full">
                            <ResponsiveGridLayout
                                layouts={layouts}
                                breakpoints={activeBreakpoints}
                                cols={activeCols}
                                rowHeight={ROW_HEIGHT}
                                onLayoutChange={handleLayoutChange}
                                isDraggable={viewMode === 'desktop'}
                                isResizable={viewMode === 'desktop'}
                                // PARITY: 8-direction resize handles like dashboard
                                resizeHandles={['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']}
                                // PARITY: No draggableHandle - entire widget is draggable
                                draggableCancel=".no-drag"
                                margin={[12, 12]}
                                containerPadding={[0, 0]}
                                compactType="vertical"
                            >
                                {data.widgets.map((widget, index) => {
                                    const Icon = getWidgetIcon(widget.type);
                                    const metadata = getWidgetMetadata(widget.type);

                                    return (
                                        <div
                                            key={`widget-${index}`}
                                            // PARITY: edit-mode class for CSS hover effects
                                            className="edit-mode glass-subtle rounded-lg border border-theme overflow-hidden flex flex-col"
                                        >
                                            {/* Widget Header */}
                                            <div className="flex items-center justify-between px-3 py-2 bg-theme-secondary/50 border-b border-theme">
                                                <div className="flex items-center gap-2">
                                                    <Icon size={14} className="text-accent" />
                                                    <span className="text-sm font-medium text-theme-primary">
                                                        {metadata?.name || widget.type}
                                                    </span>
                                                </div>
                                                {viewMode === 'desktop' && (
                                                    // PARITY: Delete button with .no-drag + styled like WidgetWrapper
                                                    <button
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveWidget(index);
                                                        }}
                                                        className="no-drag w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 
                                                            flex items-center justify-center text-red-400 hover:text-red-300
                                                            transition-all duration-200"
                                                        style={{ pointerEvents: 'auto', touchAction: 'none' }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Widget Preview Placeholder */}
                                            <div className="flex-1 flex items-center justify-center p-4 text-center">
                                                <div className="text-theme-tertiary">
                                                    <Icon size={24} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">Preview</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </ResponsiveGridLayout>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplateBuilderStep2;
