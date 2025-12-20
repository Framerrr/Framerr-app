/**
 * LayoutContext Types
 * Types for responsive layout state
 */

/**
 * Layout mode based on viewport
 */
export type LayoutMode = 'mobile' | 'desktop';

/**
 * LayoutContext value provided to consumers
 */
export interface LayoutContextValue {
    /**
     * Current layout mode
     */
    mode: LayoutMode;

    /**
     * Convenience getter: true if mobile layout
     */
    isMobile: boolean;

    /**
     * Convenience getter: true if desktop layout
     */
    isDesktop: boolean;
}

/**
 * LayoutProvider props
 */
export interface LayoutProviderProps {
    children: React.ReactNode;
}

/**
 * Layout constants
 */
export interface LayoutConstants {
    MOBILE_THRESHOLD: number;
    SIDEBAR_WIDTH: number;
    TABBAR_HEIGHT: number;
    PAGE_MARGIN: number;
}
