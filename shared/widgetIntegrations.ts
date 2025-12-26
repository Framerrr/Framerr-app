/**
 * Widget Integration Mapping
 * 
 * CANONICAL source for widget type → integration name mapping.
 * Used by both frontend and backend to determine which integrations
 * are required for each widget type.
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH.
 * Do NOT hardcode these mappings elsewhere.
 */

/**
 * Map of widget type keys to their required integration(s).
 * - string: Single integration required
 * - string[]: Multiple integrations required (all needed)
 * - false: No integration required (standalone widget)
 */
export const WIDGET_INTEGRATION_MAP: Record<string, string | string[] | false> = {
    // System widgets
    'system-status': 'systemstatus',

    // Media widgets
    'plex': 'plex',
    'sonarr': 'sonarr',
    'radarr': 'radarr',
    'overseerr': 'overseerr',
    'calendar': ['sonarr', 'radarr'],  // Requires both

    // Download widgets
    'qbittorrent': 'qbittorrent',

    // Utility widgets (no integration required)
    'weather': false,
    'clock': false,
    'custom-html': false,
    'link-grid': false,
};

/**
 * Get all required integrations for a list of widget types.
 * Deduplicates and flattens the result.
 * 
 * @param widgetTypes - Array of widget type strings
 * @returns Array of unique integration names (excludes 'false' entries)
 */
export function getRequiredIntegrations(widgetTypes: string[]): string[] {
    const integrations = new Set<string>();

    for (const widgetType of widgetTypes) {
        const requirement = WIDGET_INTEGRATION_MAP[widgetType.toLowerCase()];

        if (requirement === false || requirement === undefined) {
            continue;
        }

        if (Array.isArray(requirement)) {
            requirement.forEach(i => integrations.add(i));
        } else {
            integrations.add(requirement);
        }
    }

    return Array.from(integrations);
}

/**
 * Get the integration name for a single widget type.
 * 
 * @param widgetType - Widget type string
 * @returns Integration name, array of names, or null if not required
 */
export function getWidgetIntegration(widgetType: string): string | string[] | null {
    const requirement = WIDGET_INTEGRATION_MAP[widgetType.toLowerCase()];

    if (requirement === false || requirement === undefined) {
        return null;
    }

    return requirement;
}

/**
 * Display names for integrations (for UI)
 */
export const INTEGRATION_DISPLAY_NAMES: Record<string, string> = {
    'plex': 'Plex',
    'sonarr': 'Sonarr',
    'radarr': 'Radarr',
    'overseerr': 'Overseerr',
    'qbittorrent': 'qBittorrent',
    'systemstatus': 'System Status',
};

/**
 * Get display name for an integration
 */
export function getIntegrationDisplayName(integrationName: string): string {
    return INTEGRATION_DISPLAY_NAMES[integrationName] || integrationName;
}
