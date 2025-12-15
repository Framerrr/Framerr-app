import { lazy } from 'react';
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
    Star
} from 'lucide-react';

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
export const WIDGET_TYPES = {
    // System Widgets
    'system-status': {
        component: SystemStatusWidget,
        icon: Activity,
        name: 'System Status',
        description: 'CPU, memory, and temperature monitoring',
        category: 'system',
        defaultSize: { w: 4, h: 3 },
        minSize: { w: 4, h: 3 }, // Needs space for all 4 metrics + bars
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
        minSize: { w: 4, h: 4 },      // Needs width for images + text, height for header + content
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
        minSize: { w: 3, h: 3 }, // List layout needs vertical space
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
        minSize: { w: 3, h: 3 }, // List layout needs vertical space
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
        minSize: { w: 4, h: 4 }, // Fits one 2:3 poster + text
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
        minSize: { w: 4, h: 3 }, // Stats + torrent list needs space
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
        minSize: { w: 3, h: 2 }, // Responsive: vertical when narrow, horizontal when wide
        maxSize: { h: 4 }, // No width limit
        requiresIntegration: false
    },

    'calendar': {
        component: CalendarWidget,
        icon: Calendar,
        name: 'Calendar',
        description: 'Combined Sonarr and Radarr calendar',
        category: 'media',
        defaultSize: { w: 6, h: 5 },
        minSize: { w: 5, h: 5 }, // Calendar grid needs space for filters + 7-day grid
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
        minSize: { w: 2, h: 2 }, // User-defined, flexible
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
        minSize: { w: 1, h: 1 }, // Minimum: Single cell for one link
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
        minSize: { w: 3, h: 2 }, // Responsive: vertical when narrow, horizontal when wide
        maxSize: { h: 2 }, // No width limit, shorter max height for inline mode
        requiresIntegration: false
    }
};

/**
 * Get widget component by type
 * Returns null if type not found
 */
export function getWidgetComponent(type) {
    return WIDGET_TYPES[type]?.component || null;
}

/**
 * Get widget icon by type
 */
export function getWidgetIcon(type) {
    return WIDGET_TYPES[type]?.icon || Activity;
}

/**
 * Get widget metadata by type
 */
export function getWidgetMetadata(type) {
    return WIDGET_TYPES[type] || null;
}

/**
 * Get widget icon name (string) for IconPicker
 * Extracts the component name to use as icon name
 */
export function getWidgetIconName(type) {
    const metadata = WIDGET_TYPES[type];
    if (!metadata?.icon) return 'Server';
    // Get the component name (e.g., Activity, Tv, etc.)
    return metadata.icon.name || 'Server';
}

/**
 * Get all available widgets grouped by category
 */
export function getWidgetsByCategory() {
    const categories = {};
    Object.entries(WIDGET_TYPES).forEach(([type, config]) => {
        const category = config.category || 'other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({ type, ...config });
    });
    return categories;
}
