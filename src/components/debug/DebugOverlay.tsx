/**
 * @deprecated AS OF 2025-12-22 10:43 EST
 * 
 * This DebugOverlay is DEPRECATED in favor of DevDebugOverlay.tsx.
 * DevDebugOverlay provides the same functionality plus:
 * - Draggable positioning (persists to localStorage)
 * - Collapsible UI
 * - Mobile layout mode tracking
 * - Per-widget visibility status
 * 
 * See: src/components/dev/DevDebugOverlay.tsx for the active implementation.
 */

import React, { useState, useEffect } from 'react';
import { useLayout } from '../../context/LayoutContext';
import { LAYOUT } from '../../constants/layout';
import type { Widget } from '../../../shared/types/widget';

interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

interface LayoutState {
    lg?: LayoutItem[];
    sm?: LayoutItem[];
    [key: string]: LayoutItem[] | undefined;
}

interface GridConfig {
    cols?: Record<string, number>;
    compactType?: string | null;
    rowHeight?: number;
    isDraggable?: boolean;
}

export interface DebugOverlayProps {
    enabled?: boolean;
    currentBreakpoint: string;
    layouts: LayoutState;
    widgets: Widget[];
    gridConfig?: GridConfig;
}

interface SortedWidget extends LayoutItem {
    index: number;
    title: string;
}

/**
 * DebugOverlay - Shows dashboard grid and layout information
 * Helps diagnose responsive layout and sort order issues
 */
const DebugOverlay = ({
    enabled = true,
    currentBreakpoint,
    layouts,
    widgets,
    gridConfig
}: DebugOverlayProps): React.JSX.Element | null => {
    // Don't render if not enabled
    if (!enabled) return null;

    // Get layout context info
    const { mode, isMobile } = useLayout();

    // Track viewport width
    const [viewportWidth, setViewportWidth] = useState<number>(
        typeof window !== 'undefined' ? window.innerWidth : 0
    );

    useEffect(() => {
        const handleResize = (): void => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentLayout = layouts[currentBreakpoint] || [];

    // Sort widgets by their Y position to show stacking order
    const sortedWidgets: SortedWidget[] = [...currentLayout]
        .sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        })
        .map((layout, index) => {
            const widget = widgets.find(w => w.id === layout.i);
            return {
                index: index + 1,
                id: layout.i,
                title: (widget?.config?.title as string) || widget?.type || 'Unknown',
                ...layout
            };
        });

    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] w-80 max-h-[80vh] overflow-auto
                 bg-slate-900/95 border-2 border-purple-500 rounded-lg shadow-2xl
                 backdrop-blur-md text-white text-xs font-mono"
        >
            {/* Header */}
            <div className="sticky top-0 bg-purple-600 px-3 py-2 flex items-center justify-between">
                <span className="font-bold text-sm">🐛 Debug Overlay</span>
                <span className="text-purple-200 text-[10px]">v2.0</span>
            </div>

            {/* Layout Controller Info */}
            <div className="p-3 border-b border-slate-700 bg-slate-800/50">
                <div className="font-bold text-blue-400 mb-2">📐 Layout Controller</div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Mode:</span>
                        <span className={`font-bold ${mode === 'mobile' ? 'text-orange-400' : 'text-green-400'}`}>
                            {mode}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">isMobile:</span>
                        <span className={`font-bold ${isMobile ? 'text-orange-400' : 'text-green-400'}`}>
                            {isMobile ? 'true' : 'false'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Viewport Width:</span>
                        <span className="text-cyan-400">{viewportWidth}px</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Mobile Threshold:</span>
                        <span className="text-yellow-400">{LAYOUT.MOBILE_THRESHOLD}px</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Sidebar Width:</span>
                        <span className="text-yellow-400">{LAYOUT.SIDEBAR_WIDTH}px</span>
                    </div>
                    {/* Visual threshold indicator */}
                    <div className="mt-2 pt-2 border-t border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${viewportWidth >= LAYOUT.MOBILE_THRESHOLD
                                        ? 'bg-green-500'
                                        : 'bg-orange-500'
                                        }`}
                                    style={{
                                        width: `${Math.min(100, (viewportWidth / 1200) * 100)}%`
                                    }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-500 w-16 text-right">
                                {viewportWidth >= LAYOUT.MOBILE_THRESHOLD ? '≥768' : '<768'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Info */}
            <div className="p-3 border-b border-slate-700">
                <div className="font-bold text-purple-400 mb-2">🔲 Grid Info</div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Grid Breakpoint:</span>
                        <span className="text-green-400 font-bold">{currentBreakpoint}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Effective BP:</span>
                        <span className={`font-bold ${isMobile ? 'text-orange-400' : 'text-green-400'}`}>
                            {isMobile ? 'sm (forced)' : currentBreakpoint}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Columns:</span>
                        <span className="text-yellow-400">{gridConfig?.cols?.[currentBreakpoint] || (isMobile ? 2 : 'N/A')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">CompactType:</span>
                        <span className="text-cyan-400">{gridConfig?.compactType || 'null'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Row Height:</span>
                        <span className="text-orange-400">{gridConfig?.rowHeight}px</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Draggable:</span>
                        <span className={gridConfig?.isDraggable ? 'text-green-400' : 'text-red-400'}>
                            {gridConfig?.isDraggable ? 'yes' : 'no'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Widget List */}
            <div className="p-3">
                <div className="font-bold text-purple-400 mb-2">
                    📦 Widget Positions ({sortedWidgets.length})
                </div>
                <div className="space-y-2">
                    {sortedWidgets.map((widget) => (
                        <div
                            key={widget.id}
                            className="bg-slate-800/50 rounded p-2 border border-slate-700"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-purple-300 font-bold">
                                    #{widget.index}
                                </span>
                                <span className="text-white text-[10px] truncate max-w-[180px]">
                                    {widget.title}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">x:</span>
                                    <span className="text-blue-400">{widget.x}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">y:</span>
                                    <span className="text-green-400">{widget.y}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">w:</span>
                                    <span className="text-yellow-400">{widget.w}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">h:</span>
                                    <span className="text-orange-400">{widget.h}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="sticky bottom-0 bg-slate-800 px-3 py-2 border-t border-slate-700">
                <div className="text-[10px] text-slate-400">
                    Order shown = stacking order (top to bottom)
                </div>
            </div>
        </div>
    );
};

export default DebugOverlay;
