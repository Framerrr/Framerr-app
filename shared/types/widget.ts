/**
 * Widget Types
 * Shared between frontend (Dashboard, AppDataContext) and backend (widget routes)
 */

/**
 * Widget type identifiers
 */
export type WidgetTypeKey =
    | 'system-status'
    | 'plex'
    | 'sonarr'
    | 'radarr'
    | 'overseerr'
    | 'qbittorrent'
    | 'weather'
    | 'calendar'
    | 'custom-html'
    | 'link-grid'
    | 'clock';

/**
 * Widget category for grouping in widget picker
 */
export type WidgetCategory = 'system' | 'media' | 'downloads' | 'utility' | 'other';

/**
 * Layout position for a widget at a specific breakpoint
 */
export interface WidgetLayout {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Responsive layouts for different breakpoints
 */
export interface WidgetLayouts {
    lg?: WidgetLayout;
    sm?: WidgetLayout;
    [key: string]: WidgetLayout | undefined;
}

/**
 * Core Widget entity
 * Represents a widget instance on the dashboard
 */
export interface Widget {
    i: string;            // Grid layout ID (react-grid-layout)
    x: number;            // Column position (desktop)
    y: number;            // Row position (desktop)
    w: number;            // Width in columns
    h: number;            // Height in rows
    type: WidgetTypeKey | string;  // Widget type key from registry
    config?: WidgetConfig;         // Widget-specific configuration
    layouts?: WidgetLayouts;       // Responsive layout overrides
}

/**
 * Base widget configuration
 * Extended by specific widget configs
 */
export interface WidgetConfig {
    [key: string]: unknown;
}

// ============================================
// Widget-Specific Configurations
// ============================================

export interface ClockWidgetConfig extends WidgetConfig {
    format?: '12h' | '24h';
    showDate?: boolean;
    timezone?: string;
}

export interface PlexWidgetConfig extends WidgetConfig {
    hideWhenEmpty?: boolean;
}

export interface WeatherWidgetConfig extends WidgetConfig {
    units?: 'imperial' | 'metric';
    location?: string;
}

export interface LinkGridItem {
    id: string;
    name: string;
    url: string;
    icon?: string;
}

export interface LinkGridWidgetConfig extends WidgetConfig {
    links: LinkGridItem[];
    columns?: number;
}

export interface MediaWidgetConfig extends WidgetConfig {
    limit?: number;
    showType?: 'all' | 'movie' | 'tv';
}

export interface QBittorrentWidgetConfig extends WidgetConfig {
    showCompleted?: boolean;
    limit?: number;
}

export interface SystemStatusWidgetConfig extends WidgetConfig {
    refreshInterval?: number;
    showCpu?: boolean;
    showMemory?: boolean;
    showDisk?: boolean;
}

export interface CalendarWidgetConfig extends WidgetConfig {
    showSonarr?: boolean;
    showRadarr?: boolean;
    daysToShow?: number;
}

export interface CustomHtmlWidgetConfig extends WidgetConfig {
    html?: string;
    css?: string;
}
