import logger from './logger';
import { getWidgetMetadata } from './widgetRegistry';

export const generateMobileLayout = (widgets, breakpoint = 'xs') => {
    // Determine column count based on breakpoint
    const cols = breakpoint === 'xxs' ? 2 : breakpoint === 'xs' ? 6 : 12; // md/sm=12, xs=6, xxs=2

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


    // 2. Group widgets into rows based on overlapping Y ranges
    const rows = [];
    const processed = new Set();

    console.log('🐛 [SORT DEBUG] Desktop widgets:', desktopWidgets.map(w => ({
        id: w.id,
        type: w.type,
        x: w.x,
        y: w.y,
        yStart: w.yStart,
        yEnd: w.yEnd
    })));

    desktopWidgets.forEach(widget => {
        if (processed.has(widget.id)) return;

        // Find all widgets that overlap with this widget's Y range (including edge-touching)
        const overlapping = desktopWidgets.filter(w =>
            !processed.has(w.id) &&
            !(w.yEnd < widget.yStart || w.yStart > widget.yEnd) // Changed <= to < for edge-touching
        );

        logger.debug(`Processing widget: ${widget.type}`, { overlapping: overlapping.map(w => w.type) });

        overlapping.forEach(w => processed.add(w.id));
        rows.push(overlapping);
    });

    logger.debug('Rows grouped', { rows: rows.map(row => row.map(w => w.type)) });

    // 3. Sort rows by minimum Y position
    rows.sort((a, b) => Math.min(...a.map(w => w.y)) - Math.min(...b.map(w => w.y)));

    // 4. Within each row: leftmost column (X=0) first sorted by Y, then other columns by X then Y
    const sorted = rows.flatMap(row => {
        const leftmost = row.filter(w => w.x === 0).sort((a, b) => a.y - b.y);
        const others = row.filter(w => w.x !== 0).sort((a, b) => {
            if (a.x !== b.x) return a.x - b.x;
            return a.y - b.y;
        });

        logger.debug('Row sorting', { leftmost: leftmost.map(w => w.type), others: others.map(w => w.type) });

        return [...leftmost, ...others];
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
    const max = breakpoint === 'xxs' ? 4 : 6;
    return Math.max(min, Math.min(max, scaled));
};

/**
 * Generate mobile layouts for all stacking breakpoints: md, sm, xs, xxs
 */
export const generateAllMobileLayouts = (widgets) => {
    const withMd = generateMobileLayout(widgets, 'md');
    const withSm = generateMobileLayout(withMd, 'sm');
    const withXs = generateMobileLayout(withSm, 'xs');
    const withXxs = generateMobileLayout(withXs, 'xxs');
    return withXxs;
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
