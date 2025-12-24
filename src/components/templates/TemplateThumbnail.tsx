/**
 * TemplateThumbnail - Apple-style mini preview of a template grid
 * 
 * Approach: Render at full size (800px wide), THEN scale down the entire
 * composed result. This preserves all styling, borders, and spacing.
 * 
 * Key: Everything is rendered at full resolution first, then CSS transform
 * scales it as a bitmap - just like iOS folder icons show app icons.
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

// Grid configuration at FULL SIZE (before scaling)
const FULL_WIDTH = 800;   // Render width
const GRID_COLS = 24;
const ROW_HEIGHT = 60;    // px per row
const GRID_GAP = 8;       // px gap

const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
    widgets,
    width = 80,
    height = 60,
    className = '',
}) => {
    // Calculate full-size dimensions and scale factor
    const gridMetrics = useMemo(() => {
        if (widgets.length === 0) {
            return { fullHeight: 120, scale: height / 120, offsetX: 0, offsetY: 0 };
        }

        // Find max Y extent
        const maxY = Math.max(...widgets.map(w => w.layout.y + w.layout.h));
        const fullHeight = maxY * ROW_HEIGHT + (maxY - 1) * GRID_GAP;

        // Calculate scale to fit in thumbnail container
        const scaleX = width / FULL_WIDTH;
        const scaleY = height / fullHeight;
        const scale = Math.min(scaleX, scaleY) * 0.95; // 95% to leave tiny margin

        // Calculate offsets to center
        const scaledWidth = FULL_WIDTH * scale;
        const scaledHeight = fullHeight * scale;
        const offsetX = (width - scaledWidth) / 2;
        const offsetY = (height - scaledHeight) / 2;

        return { fullHeight, scale, offsetX, offsetY };
    }, [widgets, width, height]);

    if (widgets.length === 0) {
        return (
            <div
                className={`bg-theme-tertiary rounded flex items-center justify-center ${className}`}
                style={{ width, height }}
            >
                <span style={{ fontSize: '8px', color: 'var(--text-tertiary)' }}>Empty</span>
            </div>
        );
    }

    return (
        <div
            className={`relative overflow-hidden rounded ${className}`}
            style={{
                width,
                height,
                background: 'var(--bg-tertiary)',
            }}
        >
            {/* This div is rendered at FULL SIZE, then scaled down */}
            <div
                style={{
                    position: 'absolute',
                    left: gridMetrics.offsetX,
                    top: gridMetrics.offsetY,
                    width: FULL_WIDTH,
                    height: gridMetrics.fullHeight,
                    transform: `scale(${gridMetrics.scale})`,
                    transformOrigin: 'top left',
                    // GPU acceleration for smooth scaling
                    willChange: 'transform',
                }}
            >
                {widgets.map((widget, index) => {
                    const MockWidget = getMockWidget(widget.type);

                    // Position at FULL SIZE (before scaling)
                    const left = (widget.layout.x / GRID_COLS) * FULL_WIDTH;
                    const w = (widget.layout.w / GRID_COLS) * FULL_WIDTH - GRID_GAP;
                    const top = widget.layout.y * (ROW_HEIGHT + GRID_GAP);
                    const h = widget.layout.h * ROW_HEIGHT + (widget.layout.h - 1) * GRID_GAP;

                    return (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                left,
                                top,
                                width: w,
                                height: h,
                                background: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                overflow: 'hidden',
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
