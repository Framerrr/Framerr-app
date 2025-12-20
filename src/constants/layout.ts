/**
 * Layout Constants - Single source of truth for responsive layout values
 * 
 * All layout-related decisions should reference these constants
 * to ensure consistency between sidebar, grid, and padding behavior.
 */

export interface LayoutConstants {
    /** Viewport width below which = mobile mode (tab bar instead of sidebar) */
    MOBILE_THRESHOLD: number;
    /** Collapsed sidebar width in pixels (Tailwind pl-24 = 24 * 4px = 96px) */
    SIDEBAR_WIDTH: number;
    /** Mobile tab bar bottom padding in pixels (full tab bar area) */
    TABBAR_HEIGHT: number;
    /** Page margin - matches sidebar/tabbar distance from screen edge (16px) */
    PAGE_MARGIN: number;
}

export const LAYOUT: LayoutConstants = {
    // Viewport width below which = mobile mode (tab bar instead of sidebar)
    MOBILE_THRESHOLD: 768,

    // Collapsed sidebar width in pixels (Tailwind pl-24 = 24 * 4px = 96px)
    SIDEBAR_WIDTH: 96,

    // Mobile tab bar bottom padding in pixels (full tab bar area)
    TABBAR_HEIGHT: 86,

    // Page margin - matches sidebar/tabbar distance from screen edge (16px)
    PAGE_MARGIN: 16,
};
