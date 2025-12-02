import React from 'react';

/**
 * DebugOverlay - Shows dashboard grid and layout information
 * Helps diagnose responsive layout and sort order issues
 */
const DebugOverlay = ({
    enabled = true, // Default true for backward compatibility during development
    currentBreakpoint,
    layouts,
    widgets,
    gridConfig
}) => {
    // Don't render if not enabled
    if (!enabled) return null;
    const currentLayout = layouts[currentBreakpoint] || [];

    // Sort widgets by their Y position to show stacking order
    const sortedWidgets = [...currentLayout]
        .sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        })
        .map((layout, index) => {
            const widget = widgets.find(w => w.id === layout.i);
            return {
                index: index + 1,
                id: layout.i,
                title: widget?.config?.title || widget?.type || 'Unknown',
                ...layout
            };
        });

    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] w-80 max-h-96 overflow-auto
                       bg-slate-900/95 border-2 border-purple-500 rounded-lg shadow-2xl
                       backdrop-blur-md text-white text-xs font-mono"
        >
            {/* Header */}
            <div className="sticky top-0 bg-purple-600 px-3 py-2 flex items-center justify-between">
                <span className="font-bold text-sm">🐛 Debug Overlay</span>
                <span className="text-purple-200 text-[10px]">v1.0</span>
            </div>

            {/* Grid Info */}
            <div className="p-3 border-b border-slate-700">
                <div className="font-bold text-purple-400 mb-2">Grid Info</div>
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
                        <span className="text-slate-400">CompactType:</span>
                        <span className="text-cyan-400">{gridConfig?.compactType || 'null'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Row Height:</span>
                        <span className="text-orange-400">{gridConfig?.rowHeight}px</span>
                    </div>
                </div>
            </div>

            {/* Widget List */}
            <div className="p-3">
                <div className="font-bold text-purple-400 mb-2">
                    Widget Positions ({sortedWidgets.length})
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
