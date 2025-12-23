/**
 * TemplateBuilderStep2 - Grid Editor for template building
 * 
 * Features:
 * - Toolbar with Desktop/Mobile toggle, Undo/Redo (future)
 * - Widget sidebar with available widgets
 * - react-grid-layout canvas matching dashboard (24 cols desktop, 2 cols mobile)
 * - Add/remove/move/resize widgets (same as dashboard edit mode)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Plus, X, ChevronLeft, ChevronRight, LayoutGrid, Monitor, Smartphone } from 'lucide-react';
import { getWidgetsByCategory, getWidgetIcon, getWidgetMetadata, WIDGET_TYPES } from '../../utils/widgetRegistry';
import type { TemplateData, TemplateWidget } from './TemplateBuilder';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Step2Props {
    data: TemplateData;
    onChange: (updates: Partial<TemplateData>) => void;
}

// Grid configuration matching REAL dashboard (DevDashboard.tsx line 159)
const GRID_COLS = { lg: 24, sm: 2 };
const ROW_HEIGHT = 60;
const BREAKPOINTS = { lg: 768, sm: 0 };

type ViewMode = 'desktop' | 'mobile';

const TemplateBuilderStep2: React.FC<Step2Props> = ({ data, onChange }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('desktop');

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

        // Auto-generate mobile layouts (stacked, full-width)
        const smLayout: Layout[] = data.widgets.map((widget, index) => ({
            i: `widget-${index}`,
            x: 0,
            y: index * 2,
            w: 2, // Full width on mobile
            h: widget.layout.h,
        }));

        return { lg: lgLayout, sm: smLayout };
    }, [data.widgets]);

    // Add widget to template
    const handleAddWidget = useCallback((widgetType: string) => {
        const metadata = getWidgetMetadata(widgetType);
        if (!metadata) return;

        // Find next available Y position
        let maxY = 0;
        data.widgets.forEach(w => {
            const bottom = w.layout.y + w.layout.h;
            if (bottom > maxY) maxY = bottom;
        });

        const newWidget: TemplateWidget = {
            type: widgetType,
            layout: {
                x: 0,
                y: maxY,
                w: metadata.defaultSize.w,
                h: metadata.defaultSize.h,
            },
        };

        onChange({ widgets: [...data.widgets, newWidget] });
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

    // Determine grid cols based on view mode
    const activeBreakpoint = viewMode === 'desktop' ? 'lg' : 'sm';
    const activeCols = viewMode === 'desktop' ? { lg: 24 } : { sm: 2 };
    const activeBreakpoints = viewMode === 'desktop' ? { lg: 0 } : { sm: 0 };

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-theme bg-theme-secondary rounded-t-lg">
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
                </div>

                <div className="text-xs text-theme-tertiary">
                    {data.widgets.length} widget{data.widgets.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Mobile Preview Banner */}
            {viewMode === 'mobile' && (
                <div className="px-4 py-2 bg-info/10 border-b border-info/30 text-info text-sm text-center">
                    Mobile layout is auto-generated. You can customize it later from your dashboard.
                </div>
            )}

            <div className="flex flex-1 overflow-hidden rounded-b-lg border border-t-0 border-theme">
                {/* Widget Sidebar */}
                <div
                    className={`flex-shrink-0 bg-theme-secondary border-r border-theme transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-12'
                        }`}
                >
                    {sidebarOpen ? (
                        <div className="flex flex-col h-full">
                            {/* Sidebar Header */}
                            <div className="flex items-center justify-between p-3 border-b border-theme">
                                <span className="font-medium text-theme-primary text-sm">Add Widget</span>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-1 rounded hover:bg-theme-hover text-theme-secondary"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                            </div>

                            {/* Widget List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
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

                {/* Grid Canvas */}
                <div className={`flex-1 bg-theme-tertiary overflow-auto ${viewMode === 'mobile' ? 'max-w-[400px] mx-auto' : ''}`}>
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
                        <div className="p-4 min-h-full">
                            <ResponsiveGridLayout
                                layouts={layouts}
                                breakpoints={activeBreakpoints}
                                cols={activeCols}
                                rowHeight={ROW_HEIGHT}
                                onLayoutChange={handleLayoutChange}
                                isDraggable={viewMode === 'desktop'}
                                isResizable={viewMode === 'desktop'}
                                draggableHandle=".drag-handle"
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
                                            className="glass-subtle rounded-lg border border-theme overflow-hidden flex flex-col"
                                        >
                                            {/* Widget Header */}
                                            <div className={`drag-handle flex items-center justify-between px-3 py-2 bg-theme-secondary/50 border-b border-theme ${viewMode === 'desktop' ? 'cursor-move' : 'cursor-default'}`}>
                                                <div className="flex items-center gap-2">
                                                    <Icon size={14} className="text-accent" />
                                                    <span className="text-sm font-medium text-theme-primary">
                                                        {metadata?.name || widget.type}
                                                    </span>
                                                </div>
                                                {viewMode === 'desktop' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveWidget(index);
                                                        }}
                                                        className="p-1 rounded hover:bg-error/20 text-theme-tertiary hover:text-error transition-colors"
                                                    >
                                                        <X size={14} />
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
