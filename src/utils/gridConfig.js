/**
 * Grid Configuration Constants
 * Single source of truth for all dashboard grid/layout values
 */

export const GRID_CONFIG = {
    // Grid dimensions
    // Note: rowHeight is static at 100px for reliable, consistent sizing across all viewports
    colWidth: 100,            // Target: ~100px per column for 12-column grid
    maxWidth: 2400,           // Maximum container width (20% increase for better large display utilization)
    cols: 12,                 // Total columns in grid (industry standard)

    // Breakpoints (from react-grid-layout)
    breakpoints: {
        lg: 1200,
        md: 1024,
        sm: 768,
        xs: 600,
        xxs: 0
    },

    // Padding values (in pixels)
    padding: {
        // Card component padding (from Card.jsx)
        card: {
            sm: 16,   // p-4
            md: 20,   // p-5
            lg: 24,   // p-6 (default for WidgetWrapper)
            xl: 32    // p-8
        },

        // WidgetWrapper content padding (from WidgetWrapper.jsx line 103)
        widgetContent: 16,       // p-4

        // Widget container padding (from PlexWidget.jsx line 228)
        widgetContainer: 4,      // 0.25rem

        // Header approximate height (from WidgetWrapper.jsx line 88)
        widgetHeader: 52         // Includes icon + title + padding
    },

    // Gap values
    gap: {
        container: 16,   // 1rem
        card: 8          // 0.5rem
    }
};

/**
 * Grid presets for different densities (future feature)
 */
export const GRID_PRESETS = {
    standard: { cols: 12, colWidth: 100, label: 'Standard (12 columns)' },
    compact: { cols: 16, colWidth: 75, label: 'Compact (16 columns)' },
    spacious: { cols: 8, colWidth: 150, label: 'Spacious (8 columns)' }
};

/**
 * Calculate available space for widget content
 * 
 * @param {number} widgetCols - Widget width in grid columns (1-12)
 * @param {number} widgetRows - Widget height in grid rows (1-10)
 * @param {boolean} [hasHeader=true] - Whether widget header is visible
 * @param {Object} [options={}] - Optional configuration overrides
 * @param {number} [options.rowHeight] - Override row height (default: dynamically calculated)
 * @param {number} [options.colWidth] - Override column width (default: GRID_CONFIG.colWidth)
 * @param {number} [options.cardPadding] - Override card padding (default: GRID_CONFIG.padding.card.lg)
 * 
 * @returns {Object} Available space dimensions
 * @returns {number} return.width - Available width in pixels
 * @returns {number} return.height - Available height in pixels
 * @returns {number} return.aspectRatio - Width/height ratio
 * 
 * @example
 * // w:4 h:4 widget with header (12-column grid)
 * const space = calculateAvailableSpace(4, 4, true);
 * // => { width: ~300, height: ~260, aspectRatio: ~1.15 }
 * 
 * @example
 * // w:4 h:4 widget without header
 * const space = calculateAvailableSpace(4, 4, false);
 * // => { width: ~300, height: ~312, aspectRatio: ~0.96 }
 */
export const calculateAvailableSpace = (
    widgetCols,
    widgetRows,
    hasHeader = true,
    options = {}
) => {
    // Allow runtime overrides for future features
    const rowHeight = options.rowHeight || GRID_CONFIG.colWidth; // Default to colWidth for square cells
    const colWidth = options.colWidth || GRID_CONFIG.colWidth;
    const cardPadding = options.cardPadding || GRID_CONFIG.padding.card.lg;

    // Calculate total widget dimensions in pixels
    const widgetWidth = widgetCols * colWidth;
    const widgetHeight = widgetRows * rowHeight;

    // Calculate total padding that consumes space
    const verticalPadding =
        (cardPadding * 2) +                           // Card top/bottom
        (GRID_CONFIG.padding.widgetContent * 2) +     // Content wrapper top/bottom
        (GRID_CONFIG.padding.widgetContainer * 2);    // Container top/bottom

    const horizontalPadding =
        (cardPadding * 2) +                           // Card left/right
        (GRID_CONFIG.padding.widgetContent * 2) +     // Content wrapper left/right
        (GRID_CONFIG.padding.widgetContainer * 2);    // Container left/right

    const headerHeight = hasHeader ? GRID_CONFIG.padding.widgetHeader : 0;

    // Calculate available space after subtracting all padding
    const availableWidth = widgetWidth - horizontalPadding;
    const availableHeight = widgetHeight - verticalPadding - headerHeight;

    return {
        width: Math.max(0, availableWidth),
        height: Math.max(0, availableHeight),
        aspectRatio: availableWidth / availableHeight
    };
};

/**
 * Measure actual padding from rendered element
 * Useful for verifying GRID_CONFIG values match reality
 * 
 * @param {HTMLElement} element - The element to measure
 * @returns {Object|null} Padding measurements or null if element is invalid
 * @returns {number} return.top - Top padding in pixels
 * @returns {number} return.right - Right padding in pixels
 * @returns {number} return.bottom - Bottom padding in pixels
 * @returns {number} return.left - Left padding in pixels
 * @returns {Object} return.total - Combined padding measurements
 * @returns {number} return.total.vertical - Top + bottom padding
 * @returns {number} return.total.horizontal - Left + right padding
 * 
 * @example
 * const padding = measureActualPadding(containerRef.current);
 * console.log('Vertical padding:', padding.total.vertical);
 */
export const measureActualPadding = (element) => {
    if (!element) return null;

    const style = window.getComputedStyle(element);
    return {
        top: parseFloat(style.paddingTop),
        right: parseFloat(style.paddingRight),
        bottom: parseFloat(style.paddingBottom),
        left: parseFloat(style.paddingLeft),
        total: {
            vertical: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
            horizontal: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        }
    };
};
