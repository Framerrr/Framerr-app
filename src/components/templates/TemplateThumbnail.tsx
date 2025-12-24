/**
 * TemplateThumbnail - CSS-scaled mini preview of a template grid
 * 
 * Uses CSS transform: scale() to create a miniature version of the grid.
 * The thumbnail shows mock widgets in their actual positions, scaled down.
 * 
 * Used for:
 * - TemplateCard thumbnail
 * - iOS folder-style animation (thumbnail grows into full preview)
 */

import React, { useMemo } from 'react';
import { getMockWidget } from './MockWidgets';

interface TemplateWidget {
    type: string;
    layout: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
}

interface TemplateThumbnailProps {
    widgets: TemplateWidget[];
    width?: number;  // Container width in px
    height?: number; // Container height in px
    className?: string;
}

// Grid configuration matching dashboard
const GRID_COLS = 24;
const ROW_HEIGHT = 60; // px per row at full scale
const GRID_GAP = 8;    // px gap at full scale

const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
    widgets,
    width = 80,
    height = 60,
    className = '',
}) => {
    // Calculate the full grid dimensions
    const gridMetrics = useMemo(() => {
        if (widgets.length === 0) {
            return { maxY: 1, fullWidth: 1000, fullHeight: 60, scale: 0.1 };
        }

        // Find max Y extent (bottom of lowest widget)
        const maxY = Math.max(...widgets.map(w => w.layout.y + w.layout.h));

        // Calculate full grid size at 1:1 scale
        // Use a reasonable "full width" that represents 24 columns
        const fullWidth = 800; // Simulated full grid width
        const fullHeight = maxY * ROW_HEIGHT + (maxY - 1) * GRID_GAP;

        // Calculate scale to fit in container
        const scaleX = width / fullWidth;
        const scaleY = height / fullHeight;
        const scale = Math.min(scaleX, scaleY);

        return { maxY, fullWidth, fullHeight, scale };
    }, [widgets, width, height]);

    if (widgets.length === 0) {
        return (
            <div
                className={`bg-theme-tertiary rounded flex items-center justify-center ${className}`}
                style={{ width, height }}
            >
                <span className="text-[10px] text-theme-tertiary">Empty</span>
            </div>
        );
    }

    return (
        <div
            className={`relative overflow-hidden bg-theme-tertiary rounded ${className}`}
            style={{ width, height }}
        >
            {/* Scaled grid container */}
            <div
                style={{
                    width: gridMetrics.fullWidth,
                    height: gridMetrics.fullHeight,
                    transform: `scale(${gridMetrics.scale})`,
                    transformOrigin: 'top left',
                    position: 'relative',
                }}
            >
                {widgets.map((widget, index) => {
                    const MockWidget = getMockWidget(widget.type);

                    // Calculate position and size
                    const left = (widget.layout.x / GRID_COLS) * gridMetrics.fullWidth;
                    const widgetWidth = (widget.layout.w / GRID_COLS) * gridMetrics.fullWidth;
                    const top = widget.layout.y * (ROW_HEIGHT + GRID_GAP);
                    const widgetHeight = widget.layout.h * ROW_HEIGHT + (widget.layout.h - 1) * GRID_GAP;

                    return (
                        <div
                            key={index}
                            className="absolute bg-theme-secondary rounded border border-theme overflow-hidden"
                            style={{
                                left,
                                top,
                                width: widgetWidth,
                                height: widgetHeight,
                            }}
                        >
                            <MockWidget />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TemplateThumbnail;
