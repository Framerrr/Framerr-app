/**
 * TemplateThumbnail - Apple-style mini preview of a template grid
 * 
 * Renders at full size with widget headers, then scales down.
 * Shows top-left portion prominently, bottom overflow hidden.
 */

import React, { useMemo } from 'react';
import { getMockWidget } from './MockWidgets';
import { getWidgetIcon, WIDGET_TYPES } from '../../utils/widgetRegistry';

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
const FULL_WIDTH = 600;   // Smaller = more zoomed in
const GRID_COLS = 24;
const ROW_HEIGHT = 50;    // px per row
const GRID_GAP = 6;       // px gap
const HEADER_HEIGHT = 24; // Widget header height
const GRID_PADDING = 16;  // Padding around the grid

const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
    widgets,
    width = 80,
    height = 60,
    className = '',
}) => {
    // Calculate scale to fill width (more zoomed in)
    const scale = useMemo(() => {
        // Scale to fit width, let height overflow
        return width / FULL_WIDTH;
    }, [width]);

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
            {/* Rendered at FULL SIZE, then scaled - top-left aligned, bottom overflows */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: FULL_WIDTH,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    willChange: 'transform',
                }}
            >
                {widgets.map((widget, index) => {
                    const MockWidget = getMockWidget(widget.type);
                    const Icon = getWidgetIcon(widget.type);
                    const metadata = WIDGET_TYPES[widget.type];

                    // Position at FULL SIZE (with padding offset)
                    const gridContentWidth = FULL_WIDTH - (GRID_PADDING * 2);
                    const left = GRID_PADDING + (widget.layout.x / GRID_COLS) * gridContentWidth;
                    const w = (widget.layout.w / GRID_COLS) * gridContentWidth - GRID_GAP;
                    const top = GRID_PADDING + widget.layout.y * (ROW_HEIGHT + GRID_GAP);
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
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Widget Header */}
                            <div style={{
                                height: HEADER_HEIGHT,
                                padding: '0 8px',
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--bg-tertiary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                flexShrink: 0,
                            }}>
                                <Icon size={12} style={{ color: 'var(--accent)' }} />
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {metadata?.name || widget.type}
                                </span>
                            </div>
                            {/* Widget Content */}
                            <div style={{ flex: 1, overflow: 'hidden', padding: '8px' }}>
                                <MockWidget />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TemplateThumbnail;
