import React, { useState, useEffect } from 'react';

/**
 * DebugOverlay - Shows dashboard grid and layout information
 * Helps diagnose responsive layout and sort order issues
 */
const DebugOverlay = ({
    enabled = true, // Default true for backward compatibility during development
    currentBreakpoint,
    layouts,
    widgets,
    gridConfig,
    gridContainerRef
}) => {
    // Don't render if not enabled
    if (!enabled) return null;

    const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [widgetDimensions, setWidgetDimensions] = useState({});

    // Track screen size
    useEffect(() => {
        const handleResize = () => {
            setScreenSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Measure actual widget dimensions
    useEffect(() => {
        const measureWidgets = () => {
            const gridItems = document.querySelectorAll('.react-grid-item');
            const dimensions = {};

            // Match grid items to layout by index (they render in same order)
            const currentLayout = layouts[currentBreakpoint] || [];
            gridItems.forEach((item, index) => {
                if (index < currentLayout.length) {
                    const widgetId = currentLayout[index].i;
                    dimensions[widgetId] = {
                        width: item.offsetWidth,
                        height: item.offsetHeight
                    };
                }
            });

            setWidgetDimensions(dimensions);
        };

        // Measure on mount and when layouts change
        measureWidgets();
        const interval = setInterval(measureWidgets, 1000); // Update every second
        return () => clearInterval(interval);
    }, [layouts, currentBreakpoint]);

    const currentLayout = layouts[currentBreakpoint] || [];

    // Extract grid config values with fallbacks
    const rowHeight = gridConfig?.rowHeight || 68;
    const marginX = gridConfig?.margin?.[0] || 16;
    const marginY = gridConfig?.margin?.[1] || 16;
    const cols = gridConfig?.cols?.[currentBreakpoint] || 24;

    // Calculate ACTUAL column width from measured container
    // This matches the calculation in Dashboard.jsx
    const containerWidth = gridContainerRef?.current?.offsetWidth || 2000;
    const calculatedCellWidth = (containerWidth - (marginX * (cols - 1))) / cols;
    const calculatedCellHeight = rowHeight; // Row height is set dynamically in Dashboard

    // Sort widgets by their Y position to show stacking order
    const sortedWidgets = [...currentLayout]
        .sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        })
        .map((layout, index) => {
            const widget = widgets.find(w => w.id === layout.i);
            const actualDims = widgetDimensions[layout.i] || { width: 0, height: 0 };
            return {
                index: index + 1,
                id: layout.i,
                title: widget?.config?.title || widget?.type || 'Unknown',
                actualWidth: actualDims.width,
                actualHeight: actualDims.height,
                ...layout
            };
        });

    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] w-96 max-h-[600px] overflow-auto
                       bg-slate-900/95 border-2 border-purple-500 rounded-lg shadow-2xl
                       backdrop-blur-md text-white text-xs font-mono"
        >
            {/* Header */}
            <div className="sticky top-0 bg-purple-600 px-3 py-2 flex items-center justify-between">
                <span className="font-bold text-sm">🐛 Grid Debug</span>
                <span className="text-purple-200 text-[10px]">v2.0</span>
            </div>

            {/* Screen & Cell Info */}
            <div className="p-3 border-b border-slate-700">
                <div className="font-bold text-purple-400 mb-2">Screen & Cell Info</div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Screen:</span>
                        <span className="text-cyan-400">{screenSize.width}×{screenSize.height}px</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Container:</span>
                        <span className="text-yellow-400">{containerWidth.toFixed(0)}px</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Cell Size (calc):</span>
                        <span className="text-yellow-400">{calculatedCellWidth.toFixed(1)}×{calculatedCellHeight.toFixed(1)}px</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Aspect Ratio:</span>
                        <span className={Math.abs(calculatedCellWidth - calculatedCellHeight) < 0.5 ? "text-green-400" : "text-red-400"}>
                            {Math.abs(calculatedCellWidth - calculatedCellHeight) < 0.5 ? "1:1 ✓" : `${(calculatedCellHeight / calculatedCellWidth).toFixed(3)}:1 ✗`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Grid Info */}
            <div className="p-3 border-b border-slate-700">
                <div className="font-bold text-purple-400 mb-2">Grid Config</div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Breakpoint:</span>
                        <span className="text-green-400 font-bold">{currentBreakpoint}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Columns:</span>
                        <span className="text-yellow-400">{gridConfig?.cols?.[currentBreakpoint] || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Row Height:</span>
                        <span className="text-orange-400">{rowHeight?.toFixed(1)}px</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Margin:</span>
                        <span className="text-cyan-400">{marginX}px</span>
                    </div>
                </div>
            </div>

            {/* Widget List */}
            <div className="p-3">
                <div className="font-bold text-purple-400 mb-2">
                    Widget Positions ({sortedWidgets.length})
                </div>
                <div className="space-y-2">
                    {sortedWidgets.map((widget) => {
                        const expectedWidth = widget.w * calculatedCellWidth + (widget.w - 1) * marginX;
                        const expectedHeight = widget.h * calculatedCellHeight + (widget.h - 1) * marginY;
                        const widthMatch = Math.abs(widget.actualWidth - expectedWidth) < 2; // Within 2px tolerance
                        const heightMatch = Math.abs(widget.actualHeight - expectedHeight) < 2;

                        return (
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
                                {/* Actual pixel dimensions */}
                                <div className="mt-2 pt-2 border-t border-slate-700/50">
                                    <div className="text-[9px] space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Actual:</span>
                                            <span className="text-cyan-300">
                                                {widget.actualWidth}×{widget.actualHeight}px
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Expected:</span>
                                            <span className={widthMatch && heightMatch ? "text-green-300" : "text-red-300"}>
                                                {expectedWidth.toFixed(0)}×{expectedHeight.toFixed(0)}px
                                            </span>
                                        </div>
                                        {widget.w === widget.h && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Square?</span>
                                                <span className={widget.actualWidth === widget.actualHeight ? "text-green-400" : "text-red-400"}>
                                                    {widget.actualWidth === widget.actualHeight ? "YES ✓" : `NO (${(widget.actualHeight / widget.actualWidth).toFixed(2)}:1)`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="sticky bottom-0 bg-slate-800 px-3 py-2 border-t border-slate-700">
                <div className="text-[10px] text-slate-400">
                    🟢 = Dimensions match | 🔴 = Mismatch (investigate!)
                </div>
            </div>
        </div>
    );
};

export default DebugOverlay;
