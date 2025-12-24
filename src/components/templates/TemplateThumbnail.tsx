/**
 * TemplateThumbnail - Mini preview of a template grid
 * 
 * Renders widgets at actual small pixel sizes (no CSS transform: scale).
 * This ensures borders, spacing, and styling render correctly.
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

// Grid configuration - scaled to fit in the thumbnail
const GRID_COLS = 24;

const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
    widgets,
    width = 80,
    height = 60,
    className = '',
}) => {
    // Calculate dimensions to fit widgets in the container
    const { cellWidth, cellHeight, maxRows } = useMemo(() => {
        if (widgets.length === 0) {
            return { cellWidth: 3, cellHeight: 8, maxRows: 1 };
        }

        const maxY = Math.max(...widgets.map(w => w.layout.y + w.layout.h));

        // Calculate cell sizes to fit in container with padding
        const padding = 2;
        const gap = 1; // 1px gap between widgets
        const availableWidth = width - padding * 2;
        const availableHeight = height - padding * 2;

        // Width per column
        const cw = availableWidth / GRID_COLS;
        // Height per row - fit all rows in available height
        const ch = Math.max(6, availableHeight / maxY);

        return { cellWidth: cw, cellHeight: ch, maxRows: maxY };
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
                padding: '2px',
            }}
        >
            {widgets.map((widget, index) => {
                const Icon = getWidgetIcon(widget.type);

                // Calculate position and size in actual pixels
                const left = widget.layout.x * cellWidth;
                const top = widget.layout.y * cellHeight;
                const w = widget.layout.w * cellWidth - 1; // -1 for gap
                const h = widget.layout.h * cellHeight - 1;

                return (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            left: `${left + 2}px`, // +2 for padding
                            top: `${top + 2}px`,
                            width: `${w}px`,
                            height: `${h}px`,
                            background: 'var(--bg-secondary)',
                            borderRadius: '3px',
                            border: '1px solid var(--border)',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon
                            size={Math.min(w, h) * 0.5}
                            style={{ color: 'var(--accent)', opacity: 0.7 }}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default TemplateThumbnail;
