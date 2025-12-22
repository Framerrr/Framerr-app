import logger from './logger';
import { getWidgetMetadata } from './widgetRegistry';
import type { Widget, WidgetLayout } from '../../shared/types/widget';

/**
 * Breakpoint type for mobile layouts
 */
type MobileBreakpoint = 'sm' | 'xs';

/**
 * Desktop widget info for layout calculation
 */
interface DesktopWidgetInfo {
    i: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    yStart: number;
    yEnd: number;
    widget: Widget;
}

/**
 * Generate mobile layout for widgets
 */
export const generateMobileLayout = (widgets: Widget[], breakpoint: MobileBreakpoint = 'sm'): Widget[] => {
    // Determine column count based on breakpoint
    // lg/md use 24 cols (handled separately), sm/xs use 2 cols (stacked)
    const cols = 2;

    // 1. Extract desktop layout info with Y range
    const desktopWidgets: DesktopWidgetInfo[] = widgets.map(w => ({
        i: w.i,
        type: w.type,
        x: w.layouts?.lg?.x ?? w.x ?? 0,
        y: w.layouts?.lg?.y ?? w.y ?? 0,
        w: w.layouts?.lg?.w ?? w.w ?? 4,
        h: w.layouts?.lg?.h ?? w.h ?? 2,
        yStart: w.layouts?.lg?.y ?? w.y ?? 0,
        yEnd: (w.layouts?.lg?.y ?? w.y ?? 0) + (w.layouts?.lg?.h ?? w.h ?? 2),
        widget: w
    }));

    // 2. Apply band detection directly to all widgets (no row grouping needed)
    // Sort by Y, then X, then ID for deterministic ordering (JS sort is not stable)
    const ySorted = [...desktopWidgets].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        if (a.x !== b.x) return a.x - b.x;
        return (a.i || '').localeCompare(b.i || ''); // ID tiebreaker
    });

    const bands: DesktopWidgetInfo[][] = [];
    let currentBand: DesktopWidgetInfo[] = [];
    let currentBandMaxY = -1;

    // Sweep line: Separate into horizontal bands
    ySorted.forEach((widget) => {
        // Initialize first band
        if (currentBand.length === 0) {
            currentBand.push(widget);
            currentBandMaxY = widget.yEnd;
            return;
        }

        // Check for hard cut: widget starts at or after current band's bottom
        if (widget.y >= currentBandMaxY) {
            bands.push(currentBand);
            currentBand = [widget];
            currentBandMaxY = widget.yEnd;
        } else {
            // No cut: widget overlaps with current band
            currentBand.push(widget);
            currentBandMaxY = Math.max(currentBandMaxY, widget.yEnd);
        }
    });

    // Push final band
    if (currentBand.length > 0) {
        bands.push(currentBand);
    }

    logger.debug('Band detection', {
        bandCount: bands.length,
        bands: bands.map(band => ({
            widgets: band.map(w => w.type),
            yRange: `${Math.min(...band.map(w => w.y))}-${Math.max(...band.map(w => w.yEnd))}`
        }))
    });

    // 3. Sort each band by X (column), then Y (row within column), then ID (tiebreaker)
    const sorted = bands.flatMap(band => {
        return [...band].sort((a, b) => {
            if (a.x !== b.x) return a.x - b.x;
            if (a.y !== b.y) return a.y - b.y;
            return (a.i || '').localeCompare(b.i || ''); // ID tiebreaker
        });
    });

    logger.debug('Final sorted order', { order: sorted.map(w => w.type) });

    // 5. Create stacked mobile layout
    let currentY = 0;
    return sorted.map((item) => {
        const mobileHeight = calculateMobileHeight(item.widget, breakpoint);
        const mobileLayoutItem: WidgetLayout = {
            x: 0,
            y: currentY,
            w: cols,
            h: mobileHeight
        };
        currentY += mobileHeight;
        return {
            ...item.widget,
            layouts: {
                ...item.widget.layouts,
                [breakpoint]: mobileLayoutItem
            }
        };
    });
};

/**
 * Calculate appropriate widget height for mobile breakpoints
 * For linked mode: preserves desktop (lg) height for consistency
 */
const calculateMobileHeight = (widget: Widget, breakpoint: MobileBreakpoint): number => {
    // Use the desktop height directly for linked mode consistency
    const desktopHeight = widget.layouts?.lg?.h ?? (widget as any).h ?? 2;

    // Ensure height is at least 1 (minimum valid height)
    return Math.max(1, desktopHeight);
};

/**
 * Generate mobile layout for sm breakpoint
 */
export const generateAllMobileLayouts = (widgets: Widget[]): Widget[] => {
    return generateMobileLayout(widgets, 'sm');
};

/**
 * Convert old widget format to new layouts format
 */
export const migrateWidgetToLayouts = (widget: Widget): Widget => {
    if (widget.layouts?.lg) {
        return widget;
    }
    return {
        ...widget,
        layouts: {
            lg: {
                x: (widget as any).x ?? 0,
                y: (widget as any).y ?? 0,
                w: (widget as any).w ?? 4,
                h: (widget as any).h ?? 2
            }
        }
    };
};
