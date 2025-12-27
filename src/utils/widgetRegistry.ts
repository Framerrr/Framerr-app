import { lazy, ComponentType } from 'react';
import {
    Activity,
    Tv,
    Download,
    Cloud,
    Calendar,
    Link,
    Clock,
    Code,
    Film,
    MonitorPlay,
    Star,
    LucideIcon
} from 'lucide-react';
import type { WidgetTypeKey, WidgetCategory } from '../../shared/types/widget';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WidgetComponent = React.ComponentType<any>;

/**
 * Widget metadata interface
 */
export interface WidgetMetadata {
    type?: string; // Added when retrieved via getWidgetsByCategory
    component: WidgetComponent;
    icon: LucideIcon;
    name: string;
    description: string;
    category: WidgetCategory;
    defaultSize: { w: number; h: number };
    minSize?: { w?: number; h?: number };
    maxSize?: { w?: number; h?: number };
    requiresIntegration?: string | false;
    requiresIntegrations?: string[];
    defaultConfig?: Record<string, unknown>;
}

/**
 * Widget registry type
 */
export type WidgetRegistry = Record<string, WidgetMetadata>;

/**
 * Widget with type info for category grouping
 */
export interface WidgetTypeInfo extends WidgetMetadata {
    type: string;
}

/**
 * Widgets grouped by category
 */
export type WidgetsByCategory = Record<string, WidgetTypeInfo[]>;

// Lazy-loaded widgets
const SystemStatusWidget = lazy(() => import('../components/widgets/SystemStatusWidget'));
const PlexWidget = lazy(() => import('../components/widgets/PlexWidget'));
const SonarrWidget = lazy(() => import('../components/widgets/SonarrWidget'));
const RadarrWidget = lazy(() => import('../components/widgets/RadarrWidget'));
const OverseerrWidget = lazy(() => import('../components/widgets/OverseerrWidget'));
const QBittorrentWidget = lazy(() => import('../components/widgets/QBittorrentWidget'));
const WeatherWidget = lazy(() => import('../components/widgets/WeatherWidget'));
const CalendarWidget = lazy(() => import('../components/widgets/CalendarWidget'));
const CustomHTMLWidget = lazy(() => import('../components/widgets/CustomHTMLWidget'));
const LinkGridWidget = lazy(() => import('../components/widgets/LinkGridWidget_v2'));
const ClockWidget = lazy(() => import('../components/widgets/ClockWidget'));

/**
 * Widget Type Registry
 * Maps widget type strings to their component, icon, and metadata
 */
export const WIDGET_TYPES: WidgetRegistry = {
    // System Widgets
    'system-status': {
        component: SystemStatusWidget,
        icon: Activity,
        name: 'System Status',
        description: 'CPU, memory, and temperature monitoring',
        category: 'system',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 4 }, // No width limit, max height only
        requiresIntegration: 'systemstatus'
    },

    // Media Widgets
    'plex': {
        component: PlexWidget,
        icon: Tv,
        name: 'Plex',
        description: 'Now playing and recent activity',
        category: 'media',
        defaultSize: { w: 6, h: 3 },  // Wider for multi-stream display
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 6 }, // No width limit, max height only
        requiresIntegration: 'plex'
    },

    'sonarr': {
        component: SonarrWidget,
        icon: MonitorPlay,
        name: 'Sonarr',
        description: 'TV show management and calendar',
        category: 'media',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 6 }, // No width limit, scrolling list
        requiresIntegration: 'sonarr'
    },

    'radarr': {
        component: RadarrWidget,
        icon: Film,
        name: 'Radarr',
        description: 'Movie management and calendar',
        category: 'media',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 6 }, // No width limit, scrolling list
        requiresIntegration: 'radarr'
    },

    'overseerr': {
        component: OverseerrWidget,
        icon: Star,
        name: 'Overseerr',
        description: 'Media requests and discovery',
        category: 'media',
        defaultSize: { w: 6, h: 3 }, // Wider for horizontal carousel
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 6 }, // No width limit
        requiresIntegration: 'overseerr'
    },

    'qbittorrent': {
        component: QBittorrentWidget,
        icon: Download,
        name: 'qBittorrent',
        description: 'Torrent downloads and management',
        category: 'downloads',
        defaultSize: { w: 6, h: 3 },
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 8 }, // No width limit, scrolling list
        requiresIntegration: 'qbittorrent'
    },

    // Utility Widgets
    'weather': {
        component: WeatherWidget,
        icon: Cloud,
        name: 'Weather',
        description: 'Current weather and forecast',
        category: 'utility',
        defaultSize: { w: 3, h: 3 },
        minSize: { w: 6, h: 1 }, // Compact horizontal mode at smallest
        maxSize: { h: 2 }, // Max height 2, no width limit
        requiresIntegration: false
    },

    'calendar': {
        component: CalendarWidget,
        icon: Calendar,
        name: 'Calendar',
        description: 'Combined Sonarr and Radarr calendar',
        category: 'media',
        defaultSize: { w: 6, h: 5 },
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 8 }, // No width limit
        requiresIntegrations: ['sonarr', 'radarr'] // Requires both integrations
    },

    'custom-html': {
        component: CustomHTMLWidget,
        icon: Code,
        name: 'Custom HTML',
        description: 'User-defined HTML and CSS content',
        category: 'utility',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 10 }, // No width limit
        requiresIntegration: false
    },

    'link-grid': {
        component: LinkGridWidget,
        icon: Link,
        name: 'Link Grid',
        description: 'Quick access links with icons',
        category: 'utility',
        defaultSize: { w: 4, h: 2 },
        minSize: { w: 1, h: 1 }, // TEMP: Set to 1x1 for testing
        maxSize: { h: 8 }, // No width limit, allow flexible sizing
        requiresIntegration: false,
        defaultConfig: {
            hideHeader: true
        }
    },

    'clock': {
        component: ClockWidget,
        icon: Clock,
        name: 'Clock',
        description: 'Time display with timezone support',
        category: 'utility',
        defaultSize: { w: 3, h: 2 },
        minSize: { w: 4, h: 1 }, // Compact horizontal mode at smallest
        maxSize: { h: 2 }, // No width limit, shorter max height for inline mode
        requiresIntegration: false
    }
};

/**
 * Get widget component by type
 * Returns null if type not found
 */
export function getWidgetComponent(type: string): WidgetComponent | null {
    return WIDGET_TYPES[type]?.component || null;
}

/**
 * Get widget icon by type
 */
export function getWidgetIcon(type: string): LucideIcon {
    return WIDGET_TYPES[type]?.icon || Activity;
}

/**
 * Get widget metadata by type
 */
export function getWidgetMetadata(type: string): WidgetMetadata | null {
    return WIDGET_TYPES[type] || null;
}

/**
 * Get widget icon name (string) for IconPicker
 * Extracts the component name to use as icon name
 */
export function getWidgetIconName(type: string): string {
    const metadata = WIDGET_TYPES[type];
    if (!metadata?.icon) return 'Server';
    // Get the component name (e.g., Activity, Tv, etc.)
    return metadata.icon.name || 'Server';
}

/**
 * Get all available widgets grouped by category
 */
export function getWidgetsByCategory(): WidgetsByCategory {
    const categories: WidgetsByCategory = {};
    Object.entries(WIDGET_TYPES).forEach(([type, config]) => {
        const category = config.category || 'other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({ type, ...config });
    });
    return categories;
}
