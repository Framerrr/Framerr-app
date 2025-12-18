/**
 * Notification Event Definitions
 * 
 * Defines all webhook event types for each integration.
 * See docs/reference/notifications.md for full documentation.
 */

// Overseerr Events (10 total)
export const OVERSEERR_EVENTS = [
    { key: 'requestPending', label: 'Request Pending Approval', defaultAdmin: true, defaultUser: false },
    { key: 'requestAutoApproved', label: 'Request Auto-Approved', defaultAdmin: true, defaultUser: true },
    { key: 'requestApproved', label: 'Request Approved', defaultAdmin: true, defaultUser: true },
    { key: 'requestDeclined', label: 'Request Declined', defaultAdmin: true, defaultUser: true },
    { key: 'requestAvailable', label: 'Media Available', defaultAdmin: true, defaultUser: true },
    { key: 'requestFailed', label: 'Processing Failed', defaultAdmin: true, defaultUser: false },
    { key: 'issueReported', label: 'Issue Reported', defaultAdmin: true, defaultUser: false },
    { key: 'issueComment', label: 'Issue Comment', defaultAdmin: false, defaultUser: false },
    { key: 'issueResolved', label: 'Issue Resolved', defaultAdmin: true, defaultUser: false },
    { key: 'issueReopened', label: 'Issue Reopened', defaultAdmin: false, defaultUser: false }
];

// Sonarr Events (13 total)
export const SONARR_EVENTS = [
    { key: 'grab', label: 'Episode Grabbed', defaultAdmin: false, defaultUser: false },
    { key: 'download', label: 'Episode Downloaded', defaultAdmin: true, defaultUser: false },
    { key: 'upgrade', label: 'Episode Upgraded', defaultAdmin: false, defaultUser: false },
    { key: 'importComplete', label: 'Import Complete', defaultAdmin: false, defaultUser: false },
    { key: 'rename', label: 'Series Renamed', defaultAdmin: false, defaultUser: false },
    { key: 'seriesAdd', label: 'Series Added', defaultAdmin: true, defaultUser: false },
    { key: 'seriesDelete', label: 'Series Deleted', defaultAdmin: true, defaultUser: false },
    { key: 'episodeFileDelete', label: 'Episode File Deleted', defaultAdmin: false, defaultUser: false },
    { key: 'episodeFileDeleteForUpgrade', label: 'Episode Deleted for Upgrade', defaultAdmin: false, defaultUser: false },
    { key: 'healthIssue', label: 'Health Issue', defaultAdmin: true, defaultUser: false },
    { key: 'healthRestored', label: 'Health Restored', defaultAdmin: true, defaultUser: false },
    { key: 'applicationUpdate', label: 'Application Update', defaultAdmin: true, defaultUser: false },
    { key: 'manualInteractionRequired', label: 'Manual Interaction Required', defaultAdmin: true, defaultUser: false }
];

// Radarr Events (13 total)
export const RADARR_EVENTS = [
    { key: 'grab', label: 'Movie Grabbed', defaultAdmin: false, defaultUser: false },
    { key: 'download', label: 'Movie Downloaded', defaultAdmin: true, defaultUser: false },
    { key: 'upgrade', label: 'Movie Upgraded', defaultAdmin: false, defaultUser: false },
    { key: 'importComplete', label: 'Import Complete', defaultAdmin: false, defaultUser: false },
    { key: 'rename', label: 'Movie Renamed', defaultAdmin: false, defaultUser: false },
    { key: 'movieAdd', label: 'Movie Added', defaultAdmin: true, defaultUser: false },
    { key: 'movieDelete', label: 'Movie Deleted', defaultAdmin: true, defaultUser: false },
    { key: 'movieFileDelete', label: 'Movie File Deleted', defaultAdmin: false, defaultUser: false },
    { key: 'movieFileDeleteForUpgrade', label: 'Movie File Deleted for Upgrade', defaultAdmin: false, defaultUser: false },
    { key: 'healthIssue', label: 'Health Issue', defaultAdmin: true, defaultUser: false },
    { key: 'healthRestored', label: 'Health Restored', defaultAdmin: true, defaultUser: false },
    { key: 'applicationUpdate', label: 'Application Update', defaultAdmin: true, defaultUser: false },
    { key: 'manualInteractionRequired', label: 'Manual Interaction Required', defaultAdmin: true, defaultUser: false }
];

// Map integration names to their events
export const INTEGRATION_EVENTS = {
    overseerr: OVERSEERR_EVENTS,
    sonarr: SONARR_EVENTS,
    radarr: RADARR_EVENTS
};

/**
 * Get default admin events for an integration
 */
export const getDefaultAdminEvents = (integrationId) => {
    const events = INTEGRATION_EVENTS[integrationId] || [];
    return events.filter(e => e.defaultAdmin).map(e => e.key);
};

/**
 * Get default user events for an integration
 */
export const getDefaultUserEvents = (integrationId) => {
    const events = INTEGRATION_EVENTS[integrationId] || [];
    return events.filter(e => e.defaultUser).map(e => e.key);
};

/**
 * Get event label by key
 */
export const getEventLabel = (integrationId, eventKey) => {
    const events = INTEGRATION_EVENTS[integrationId] || [];
    const event = events.find(e => e.key === eventKey);
    return event?.label || eventKey;
};
