import logger from './logger';
import { getWidgetMetadata } from './widgetRegistry';
export const generateMobileLayout = (widgets, breakpoint = 'sm') => {
    // Determine column count based on breakpoint
    // lg/md use 24 cols (handled separately), sm/xs use 2 cols (stacked)
    const cols = 2;
    // 1. Extract desktop layout info with Y range
    const desktopWidgets = widgets.map(w => ({
        id: w.id,
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
    // Sort by Y to prepare for sweep line algorithm
    const ySorted = desktopWidgets.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
    });

    const bands = [];
    let currentBand = [];
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

    // 3. Sort each band by X (column), then Y (row within column)
    const sorted = bands.flatMap(band => {
        return band.sort((a, b) => {
            if (a.x !== b.x) return a.x - b.x;
            return a.y - b.y;
        });

    });
    logger.debug('Final sorted order', { order: sorted.map(w => w.type) });
    // 5. Create stacked mobile layout
    let currentY = 0;
    return sorted.map((item) => {
        const mobileHeight = calculateMobileHeight(item.widget, breakpoint);
        const mobileLayoutItem = {
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
 */
const calculateMobileHeight = (widget, breakpoint) => {
    const metadata = getWidgetMetadata(widget.type);
    if (metadata?.minSize?.h) {
        return metadata.minSize.h;
    }
    const desktopHeight = widget.layouts?.lg?.h ?? widget.h ?? 2;
    const scaled = Math.ceil(desktopHeight * 0.75);
    const min = 2;
    const max = breakpoint === 'xs' ? 4 : 6;
    return Math.max(min, Math.min(max, scaled));
};
/**
 * Generate mobile layouts for stacking breakpoints: sm, xs
 */
export const generateAllMobileLayouts = (widgets) => {
    const withSm = generateMobileLayout(widgets, 'sm');
    const withXs = generateMobileLayout(withSm, 'xs');
    return withXs;
};
/**
 * Convert old widget format to new layouts format
 */
export const migrateWidgetToLayouts = (widget) => {
    if (widget.layouts?.lg) {
        return widget;
    }
    return {
        ...widget,
        layouts: {
            lg: {
                x: widget.x ?? 0,
                y: widget.y ?? 0,
                w: widget.w ?? 4,
                h: widget.h ?? 2
            }
        }
    };
};
