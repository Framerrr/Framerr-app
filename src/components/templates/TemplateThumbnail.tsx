/**
 * TemplateThumbnail - CSS-scaled mini preview of a template grid
 * 
 * Uses CSS transform: scale() to create a miniature version of the grid.
 * The thumbnail shows simplified widget blocks with type indicators.
 * 
 * Note: At small scales, borders must be thick enough to remain visible.
 * A 1px border at 0.1x scale = 0.1px = invisible.
 */

import React, { useMemo } from 'react';
import { getWidgetIcon } from '../../utils/widgetRegistry';

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
const GRID_GAP = 12;   // px gap at full scale (increased for visibility)

const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
    widgets,
    width = 80,
    height = 60,
    className = '',
}) => {
    // Calculate the full grid dimensions
    const gridMetrics = useMemo(() => {
        if (widgets.length === 0) {
            return { maxY: 1, fullWidth: 800, fullHeight: 60, scale: 0.1, offsetX: 0, offsetY: 0 };
        }

        // Find bounds of the template
        const maxY = Math.max(...widgets.map(w => w.layout.y + w.layout.h));

        // Calculate full grid size at 1:1 scale
        const fullWidth = 800; // Standard grid width
        const fullHeight = maxY * ROW_HEIGHT + (maxY - 1) * GRID_GAP;

        // Calculate scale to fit in container with some padding
        const padding = 4;
        const scaleX = (width - padding * 2) / fullWidth;
        const scaleY = (height - padding * 2) / fullHeight;
        const scale = Math.min(scaleX, scaleY);

        // Calculate offsets to center the content
        const scaledWidth = fullWidth * scale;
        const scaledHeight = fullHeight * scale;
        const offsetX = (width - scaledWidth) / 2;
        const offsetY = (height - scaledHeight) / 2;

        return { maxY, fullWidth, fullHeight, scale, offsetX, offsetY };
    }, [widgets, width, height]);

    if (widgets.length === 0) {
        return (
            <div
                className={`bg-theme-tertiary rounded flex items-center justify-center ${className}`}
                style={{ width, height }}
            >
                <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>Empty</span>
            </div>
        );
    }

    // Calculate border thickness that will be visible after scaling
    // At 0.1x scale, we need 10px borders to show as 1px
    const borderThickness = Math.max(8, Math.round(1 / gridMetrics.scale));

    return (
        <div
            className={`relative overflow-hidden bg-theme-tertiary rounded ${className}`}
            style={{ width, height }}
        >
            {/* Scaled grid container - centered */}
            <div
                style={{
                    width: gridMetrics.fullWidth,
                    height: gridMetrics.fullHeight,
                    transform: `scale(${gridMetrics.scale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    left: gridMetrics.offsetX,
                    top: gridMetrics.offsetY,
                }}
            >
                {widgets.map((widget, index) => {
                    const Icon = getWidgetIcon(widget.type);

                    // Calculate position and size
                    const left = (widget.layout.x / GRID_COLS) * gridMetrics.fullWidth;
                    const widgetWidth = (widget.layout.w / GRID_COLS) * gridMetrics.fullWidth - GRID_GAP;
                    const top = widget.layout.y * (ROW_HEIGHT + GRID_GAP);
                    const widgetHeight = widget.layout.h * ROW_HEIGHT + (widget.layout.h - 1) * GRID_GAP;

                    return (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                left,
                                top,
                                width: widgetWidth,
                                height: widgetHeight,
                                background: 'var(--bg-secondary)',
                                borderRadius: `${borderThickness * 2}px`,
                                border: `${borderThickness}px solid var(--border)`,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {/* Simple icon indicator instead of full mock content */}
                            <Icon
                                size={Math.min(widgetWidth, widgetHeight) * 0.4}
                                style={{ color: 'var(--accent)', opacity: 0.6 }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TemplateThumbnail;
