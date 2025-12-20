/**
 * Webhook Routes
 * 
 * Receives webhooks from external services (Overseerr, Sonarr, Radarr)
 * and creates notifications for the appropriate Framerr users.
 * 
 * Endpoints:
 * - POST /api/webhooks/overseerr/:token
 * - POST /api/webhooks/sonarr/:token
 * - POST /api/webhooks/radarr/:token
 */
import { Router, Request, Response } from 'express';
import { getSystemConfig } from '../db/systemConfig';
import { createNotification } from '../db/notifications';
import { resolveUserByUsername, getAdminsWithReceiveUnmatched, userWantsEvent } from '../services/webhookUserResolver';
import { getSystemIconIdForService } from '../services/seedSystemIcons';
import { listUsers } from '../db/users';
import logger from '../utils/logger';
import type {
    OverseerrWebhookPayload,
    SonarrWebhookPayload,
    RadarrWebhookPayload
} from '../types/webhooks';

const router = Router();

// Types
type WebhookService = 'overseerr' | 'sonarr' | 'radarr';

interface TokenValidationResult {
    valid: boolean;
    reason?: string;
    webhookConfig?: WebhookConfig;
}

interface WebhookConfig {
    webhookEnabled?: boolean;
    webhookToken?: string;
    [key: string]: unknown;
}

interface NotificationSent {
    userId: string;
    username: string;
    role?: string;
    test?: boolean;
    unmatched?: boolean;
}

interface NotificationMetadata {
    [key: string]: unknown;
    requestId?: number;
    service: string;
    actionable: boolean;
    mediaTitle: string;
}

interface ProcessNotificationParams {
    service: WebhookService;
    eventKey: string;
    username: string | null;
    title: string;
    message: string;
    webhookConfig: WebhookConfig;
    metadata?: NotificationMetadata | null;
    adminOnly?: boolean;
}

interface NotificationContent {
    title: string;
    message: string;
}

interface User {
    id: string;
    username: string;
    group: string;
}

// Event type mappings from external services to Framerr event keys
// Supports both Overseerr (media.pending) and Seerr/Jellyseerr ("New Movie Request") formats
const OVERSEERR_EVENT_MAP: Record<string, string> = {
    // Overseerr format
    'media.pending': 'requestPending',
    'media.approved': 'requestApproved',
    'media.auto_approved': 'requestAutoApproved',
    'media.available': 'requestAvailable',
    'media.declined': 'requestDeclined',
    'media.failed': 'requestFailed',
    'issue.created': 'issueReported',
    'issue.comment': 'issueComment',
    'issue.resolved': 'issueResolved',
    'issue.reopened': 'issueReopened',

    // Seerr/Jellyseerr format (human-readable event names)
    'New Movie Request': 'requestPending',
    'New Series Request': 'requestPending',
    'New Request': 'requestPending',
    'Movie Request Approved': 'requestApproved',
    'Series Request Approved': 'requestApproved',
    'Request Approved': 'requestApproved',
    'Movie Request Automatically Approved': 'requestAutoApproved',
    'Series Request Automatically Approved': 'requestAutoApproved',
    'Request Automatically Approved': 'requestAutoApproved',
    'Movie Now Available': 'requestAvailable',
    'Series Now Available': 'requestAvailable',
    'Now Available': 'requestAvailable',
    'Movie Available': 'requestAvailable',
    'Series Available': 'requestAvailable',
    'Movie Request Declined': 'requestDeclined',
    'Series Request Declined': 'requestDeclined',
    'Request Declined': 'requestDeclined',
    'Movie Request Failed': 'requestFailed',
    'Series Request Failed': 'requestFailed',
    'Request Failed': 'requestFailed',
    'New Issue': 'issueReported',
    'Issue Created': 'issueReported',
    'Issue Comment': 'issueComment',
    'New Issue Comment': 'issueComment',
    'Issue Resolved': 'issueResolved',
    'Issue Reopened': 'issueReopened',

    // Test events
    'test': 'test',
    'Test Notification': 'test',
    'TEST_NOTIFICATION': 'test'
};

const SONARR_EVENT_MAP: Record<string, string> = {
    'Grab': 'grab',
    'Download': 'download',
    'Upgrade': 'upgrade',
    'ImportComplete': 'importComplete',
    'Rename': 'rename',
    'SeriesAdd': 'seriesAdd',
    'SeriesDelete': 'seriesDelete',
    'EpisodeFileDelete': 'episodeFileDelete',
    'EpisodeFileDeleteForUpgrade': 'episodeFileDeleteForUpgrade',
    'Health': 'healthIssue', // Will check payload for restored
    'HealthRestored': 'healthRestored',
    'ApplicationUpdate': 'applicationUpdate',
    'ManualInteractionRequired': 'manualInteractionRequired',
    'Test': 'test'
};

const RADARR_EVENT_MAP: Record<string, string> = {
    'Grab': 'grab',
    'Download': 'download',
    'Upgrade': 'upgrade',
    'ImportComplete': 'importComplete',
    'Rename': 'rename',
    'MovieAdded': 'movieAdd',
    'MovieDelete': 'movieDelete',
    'MovieFileDelete': 'movieFileDelete',
    'MovieFileDeleteForUpgrade': 'movieFileDeleteForUpgrade',
    'Health': 'healthIssue',
    'HealthRestored': 'healthRestored',
    'ApplicationUpdate': 'applicationUpdate',
    'ManualInteractionRequired': 'manualInteractionRequired',
    'Test': 'test'
};

/**
 * Validate webhook token against stored config
 */
async function validateToken(service: WebhookService, token: string): Promise<TokenValidationResult> {
    try {
        const config = await getSystemConfig();
        const integrationConfig = config.integrations?.[service];

        if (!integrationConfig?.webhookConfig?.webhookEnabled) {
            return { valid: false, reason: 'Webhook not enabled' };
        }

        if (integrationConfig.webhookConfig.webhookToken !== token) {
            return { valid: false, reason: 'Invalid token' };
        }

        return { valid: true, webhookConfig: integrationConfig.webhookConfig };
    } catch (error) {
        logger.error('[Webhook] Token validation error:', { message: (error as Error).message });
        return { valid: false, reason: 'Validation error' };
    }
}

/**
 * POST /api/webhooks/overseerr/:token
 * Receive Overseerr webhook
 */
router.post('/overseerr/:token', async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const payload = req.body as OverseerrWebhookPayload;

    logger.debug('[Webhook] Received Overseerr webhook', { event: payload.event });

    const validation = await validateToken('overseerr', token);
    if (!validation.valid) {
        logger.warn('[Webhook] Invalid Overseerr webhook', { reason: validation.reason });
        res.status(401).json({ error: validation.reason });
        return;
    }

    try {
        // Map Overseerr event to Framerr event key
        // Overseerr may use different field names depending on version/config
        const eventType = payload.event || payload.notification_type || payload.notificationType || payload.type;
        const eventKey = eventType ? OVERSEERR_EVENT_MAP[eventType] : undefined;

        logger.debug('[Webhook] Overseerr event details', {
            eventType,
            eventKey,
            payloadKeys: Object.keys(payload)
        });

        if (!eventKey) {
            logger.debug('[Webhook] Unknown Overseerr event type', { eventType, payloadKeys: Object.keys(payload) });
            res.status(200).json({ status: 'ignored', reason: 'Unknown event type' });
            return;
        }

        // Extract username based on event type
        let username: string | null = null;
        if (payload.request?.requestedBy_username) {
            username = payload.request.requestedBy_username;
        } else if (payload.issue?.reportedBy_username) {
            username = payload.issue.reportedBy_username;
        }

        // Build normalized notification content
        const mediaTitle = payload.subject || payload.media?.title || 'Unknown';
        const { title, message } = buildOverseerrNotification(eventKey, mediaTitle, username, payload);

        // Extract requestId for actionable notifications
        // Try different field names used by Overseerr/Jellyseerr/Seerr
        const requestId = payload.request?.id || payload.request?.request_id || payload.request?.requestId || null;
        const metadata: NotificationMetadata | null = requestId && eventKey === 'requestPending' ? {
            requestId,
            service: 'overseerr',
            actionable: true,
            mediaTitle
        } : null;

        logger.info('[Webhook] Metadata check', {
            requestId,
            eventKey,
            hasMetadata: !!metadata,
            isRequestPending: eventKey === 'requestPending',
            requestObjectKeys: payload.request ? Object.keys(payload.request) : 'null'
        });

        // Process notification
        const result = await processWebhookNotification({
            service: 'overseerr',
            eventKey,
            username,
            title,
            message,
            webhookConfig: validation.webhookConfig!,
            metadata
        });

        res.status(200).json({ status: 'ok', ...result });
    } catch (error) {
        logger.error('[Webhook] Overseerr processing error:', { message: (error as Error).message });
        res.status(500).json({ error: 'Processing failed' });
    }
});

/**
 * POST /api/webhooks/sonarr/:token
 * Receive Sonarr webhook
 */
router.post('/sonarr/:token', async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const payload = req.body as SonarrWebhookPayload;

    logger.debug('[Webhook] Received Sonarr webhook', { eventType: payload.eventType });

    const validation = await validateToken('sonarr', token);
    if (!validation.valid) {
        logger.warn('[Webhook] Invalid Sonarr webhook', { reason: validation.reason });
        res.status(401).json({ error: validation.reason });
        return;
    }

    try {
        // Map Sonarr event to Framerr event key
        let eventKey = SONARR_EVENT_MAP[payload.eventType];

        // Special handling for Health events
        if (payload.eventType === 'Health' && payload.isHealthRestored) {
            eventKey = 'healthRestored';
        }

        if (!eventKey) {
            logger.debug('[Webhook] Unknown Sonarr event type', { eventType: payload.eventType });
            res.status(200).json({ status: 'ignored', reason: 'Unknown event type' });
            return;
        }

        // Build normalized notification content
        const series = payload.series?.title || 'Unknown Series';
        const episodes = payload.episodes || [];
        const quality = payload.release?.quality || null;
        const { title, message } = buildSonarrNotification(payload.eventType, series, episodes, quality, payload);

        // Sonarr doesn't have per-user requests, so notifications go to admins only
        const result = await processWebhookNotification({
            service: 'sonarr',
            eventKey,
            username: null, // No user association for Sonarr
            title,
            message,
            webhookConfig: validation.webhookConfig!,
            adminOnly: true
        });

        res.status(200).json({ status: 'ok', ...result });
    } catch (error) {
        logger.error('[Webhook] Sonarr processing error:', { message: (error as Error).message });
        res.status(500).json({ error: 'Processing failed' });
    }
});

/**
 * POST /api/webhooks/radarr/:token
 * Receive Radarr webhook
 */
router.post('/radarr/:token', async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const payload = req.body as RadarrWebhookPayload;

    logger.debug('[Webhook] Received Radarr webhook', { eventType: payload.eventType });

    const validation = await validateToken('radarr', token);
    if (!validation.valid) {
        logger.warn('[Webhook] Invalid Radarr webhook', { reason: validation.reason });
        res.status(401).json({ error: validation.reason });
        return;
    }

    try {
        // Map Radarr event to Framerr event key
        let eventKey = RADARR_EVENT_MAP[payload.eventType];

        // Special handling for Health events
        if (payload.eventType === 'Health' && payload.isHealthRestored) {
            eventKey = 'healthRestored';
        }

        if (!eventKey) {
            logger.debug('[Webhook] Unknown Radarr event type', { eventType: payload.eventType });
            res.status(200).json({ status: 'ignored', reason: 'Unknown event type' });
            return;
        }

        // Build normalized notification content
        const movie = payload.movie?.title || 'Unknown Movie';
        const year = payload.movie?.year || null;
        const quality = payload.release?.quality || null;
        const { title, message } = buildRadarrNotification(payload.eventType, movie, year, quality, payload);

        // Radarr doesn't have per-user requests, notifications go to admins only
        const result = await processWebhookNotification({
            service: 'radarr',
            eventKey,
            username: null,
            title,
            message,
            webhookConfig: validation.webhookConfig!,
            adminOnly: true
        });

        res.status(200).json({ status: 'ok', ...result });
    } catch (error) {
        logger.error('[Webhook] Radarr processing error:', { message: (error as Error).message });
        res.status(500).json({ error: 'Processing failed' });
    }
});

/**
 * Process webhook and create notifications for appropriate users
 * 
 * Routing logic:
 * - Admin events (requestPending, issues) → Admins
 * - User events (approved, available, declined) → User who requested
 * - Failed events → Both user and admins
 * - Test events → All admins
 */
async function processWebhookNotification({
    service,
    eventKey,
    username,
    title,
    message,
    webhookConfig,
    metadata = null,
    adminOnly = false
}: ProcessNotificationParams): Promise<{ notificationsSent: number }> {
    const notificationsSent: NotificationSent[] = [];

    // Get the system icon ID for this service
    const iconId = getSystemIconIdForService(service);

    // Define event routing
    const ADMIN_EVENTS = ['requestPending', 'issueReported', 'issueReopened'];
    const USER_EVENTS = ['requestApproved', 'requestAutoApproved', 'requestAvailable', 'requestDeclined', 'issueResolved', 'issueComment'];
    const BOTH_EVENTS = ['requestFailed'];

    const isTestEvent = eventKey === 'test';
    const isAdminEvent = ADMIN_EVENTS.includes(eventKey);
    const isUserEvent = USER_EVENTS.includes(eventKey);
    const isBothEvent = BOTH_EVENTS.includes(eventKey);

    logger.info('[Webhook] Processing notification', {
        service,
        eventKey,
        username,
        isTestEvent,
        isAdminEvent,
        isUserEvent,
        isBothEvent,
        adminOnly,
        hasMetadata: !!metadata
    });

    // Helper: Get all admins
    const getAdmins = async (): Promise<User[]> => {
        const users = await listUsers();
        return users.filter(u => u.group === 'admin') as User[];
    };

    // Helper: Send to admins (with preference check)
    const sendToAdmins = async (titleOverride: string | null = null, messageOverride: string | null = null): Promise<void> => {
        const admins = await getAdmins();

        for (const admin of admins) {
            const wantsEvent = await userWantsEvent(admin.id, service, eventKey, true, webhookConfig);

            if (wantsEvent) {
                await createNotification({
                    userId: admin.id,
                    type: 'info',
                    title: titleOverride || title,
                    message: messageOverride || message,
                    iconId,
                    metadata
                });
                notificationsSent.push({ userId: admin.id, username: admin.username, role: 'admin' });
                logger.debug('[Webhook] Admin notification sent', { adminId: admin.id, eventKey });
            }
        }
    };

    // Helper: Send to specific user
    const sendToUser = async (user: User): Promise<void> => {
        const isAdmin = user.group === 'admin';
        const wantsEvent = await userWantsEvent(user.id, service, eventKey, isAdmin, webhookConfig);

        if (wantsEvent) {
            await createNotification({
                userId: user.id,
                type: 'info',
                title,
                message,
                iconId,
                metadata
            });
            notificationsSent.push({ userId: user.id, username: user.username, role: 'user' });
            logger.debug('[Webhook] User notification sent', { userId: user.id, eventKey });
        }
    };

    // ============================================
    // ROUTING LOGIC
    // ============================================

    if (isTestEvent) {
        // Test notifications - send to all admins regardless of settings
        const admins = await getAdmins();

        for (const admin of admins) {
            await createNotification({
                userId: admin.id,
                type: 'success',
                title: `[Test] ${title}`,
                message: message || 'Test notification received successfully!',
                iconId,
                metadata: undefined // Test notifications are not actionable
            });
            notificationsSent.push({ userId: admin.id, username: admin.username, test: true });
        }

        logger.info('[Webhook] Test notifications sent to admins', { count: notificationsSent.length });
        return { notificationsSent: notificationsSent.length };
    }

    if (adminOnly) {
        // Admin-only notifications (Sonarr/Radarr system events)
        await sendToAdmins();
        logger.info('[Webhook] Admin-only notifications created', { service, eventKey, count: notificationsSent.length });
        return { notificationsSent: notificationsSent.length };
    }

    if (isAdminEvent) {
        // Events that should go to admins (request pending, new issues)
        await sendToAdmins();
        logger.info('[Webhook] Admin event notifications sent', { eventKey, count: notificationsSent.length });
        return { notificationsSent: notificationsSent.length };
    }

    if (isUserEvent && username) {
        // Events that should go to the user who triggered them
        const user = await resolveUserByUsername(username, service);

        if (user) {
            await sendToUser(user as User);
            logger.info('[Webhook] User event notification sent', { userId: user.id, eventKey });
        } else {
            // User not found - send to admins with receiveUnmatched
            logger.debug('[Webhook] User not found, sending to admins with receiveUnmatched');
            const admins = await getAdminsWithReceiveUnmatched();

            for (const admin of admins) {
                const wantsEvent = await userWantsEvent(admin.id, service, eventKey, true, webhookConfig);

                if (wantsEvent) {
                    await createNotification({
                        userId: admin.id,
                        type: 'info',
                        title: `[Unmatched] ${title}`,
                        message: `From: ${username}\n${message}`,
                        iconId
                    });
                    notificationsSent.push({ userId: admin.id, username: admin.username, unmatched: true });
                }
            }
        }
        return { notificationsSent: notificationsSent.length };
    }

    if (isBothEvent && username) {
        // Events that should go to BOTH user and admins
        const user = await resolveUserByUsername(username, service);

        // Send to user if found
        if (user) {
            await sendToUser(user as User);
        }

        // Always send to admins for failed events
        await sendToAdmins();

        logger.info('[Webhook] Both user and admin notifications sent', { eventKey, count: notificationsSent.length });
        return { notificationsSent: notificationsSent.length };
    }

    // Fallback: If we can't determine routing, send to admins
    logger.warn('[Webhook] Unknown event routing, sending to admins', { eventKey });
    await sendToAdmins();

    return { notificationsSent: notificationsSent.length };
}

/**
 * Build normalized notification for Overseerr events
 */
function buildOverseerrNotification(
    eventKey: string,
    mediaTitle: string,
    username: string | null,
    payload: OverseerrWebhookPayload
): NotificationContent {
    const titleMap: Record<string, string> = {
        'requestPending': 'Request Pending',
        'requestApproved': 'Request Approved',
        'requestAutoApproved': 'Request Auto-Approved',
        'requestAvailable': 'Now Available',
        'requestDeclined': 'Request Declined',
        'requestFailed': 'Request Failed',
        'issueReported': 'Issue Reported',
        'issueComment': 'New Comment',
        'issueResolved': 'Issue Resolved',
        'issueReopened': 'Issue Reopened',
        'test': 'Test Notification'
    };

    const title = `Overseerr: ${titleMap[eventKey] || 'Notification'}`;

    let message: string;
    switch (eventKey) {
        case 'requestPending':
            message = username
                ? `"${mediaTitle}" requested by ${username} is awaiting approval`
                : `"${mediaTitle}" is awaiting approval`;
            break;
        case 'requestApproved':
            message = `Your request for "${mediaTitle}" has been approved`;
            break;
        case 'requestAutoApproved':
            message = `"${mediaTitle}" was automatically approved`;
            break;
        case 'requestAvailable':
            message = `"${mediaTitle}" is now available to watch`;
            break;
        case 'requestDeclined':
            message = `Your request for "${mediaTitle}" was declined`;
            break;
        case 'requestFailed':
            message = `Failed to process request for "${mediaTitle}"`;
            break;
        case 'issueReported':
            message = `A new issue was reported for "${mediaTitle}"`;
            break;
        case 'issueComment':
            message = `New comment on issue for "${mediaTitle}"`;
            break;
        case 'issueResolved':
            message = `The issue for "${mediaTitle}" has been resolved`;
            break;
        case 'issueReopened':
            message = `An issue for "${mediaTitle}" has been reopened`;
            break;
        case 'test':
            message = 'Successfully connected to Framerr';
            break;
        default:
            message = payload.message || `Event received for "${mediaTitle}"`;
    }

    return { title, message };
}

interface SonarrEpisodeInfo {
    episodeNumber: number;
    seasonNumber: number;
}

/**
 * Build normalized notification for Sonarr events
 */
function buildSonarrNotification(
    eventType: string,
    series: string,
    episodes: SonarrEpisodeInfo[],
    quality: string | null,
    payload: SonarrWebhookPayload
): NotificationContent {
    const titleMap: Record<string, string> = {
        'Grab': 'Episode Grabbed',
        'Download': 'Episode Downloaded',
        'Upgrade': 'Episode Upgraded',
        'ImportComplete': 'Import Complete',
        'Rename': 'Episode Renamed',
        'SeriesAdd': 'Series Added',
        'SeriesDelete': 'Series Removed',
        'EpisodeFileDelete': 'Episode Deleted',
        'EpisodeFileDeleteForUpgrade': 'Episode Deleted for Upgrade',
        'Health': 'Health Warning',
        'HealthRestored': 'Health Restored',
        'ApplicationUpdate': 'Update Available',
        'ManualInteractionRequired': 'Action Required',
        'Test': 'Test Notification'
    };

    const title = `Sonarr: ${titleMap[eventType] || 'Notification'}`;

    // Build episode info
    let episodeInfo = '';
    if (episodes && episodes.length > 0) {
        const ep = episodes[0];
        episodeInfo = `Season ${ep.seasonNumber} Episode ${ep.episodeNumber}`;
    }

    let message: string;
    switch (eventType) {
        case 'Grab':
            message = episodeInfo
                ? `${series} ${episodeInfo} has been grabbed${quality ? ` in ${quality}` : ''}`
                : `${series} has been grabbed${quality ? ` in ${quality}` : ''}`;
            break;
        case 'Download':
            message = episodeInfo
                ? `${series} ${episodeInfo} has been downloaded`
                : `${series} has been downloaded`;
            break;
        case 'Upgrade':
            message = episodeInfo
                ? `${series} ${episodeInfo} upgraded to ${quality || 'higher quality'}`
                : `${series} upgraded to ${quality || 'higher quality'}`;
            break;
        case 'ImportComplete':
            message = episodeInfo
                ? `${series} ${episodeInfo} import is complete`
                : `${series} import is complete`;
            break;
        case 'SeriesAdd':
            message = `${series} has been added to the library`;
            break;
        case 'SeriesDelete':
            message = `${series} has been removed from the library`;
            break;
        case 'EpisodeFileDelete':
        case 'EpisodeFileDeleteForUpgrade':
            message = episodeInfo
                ? `${series} ${episodeInfo} file has been deleted`
                : `${series} episode file has been deleted`;
            break;
        case 'Health':
            message = payload.message || 'A health issue was detected';
            break;
        case 'HealthRestored':
            message = 'All health issues have been resolved';
            break;
        case 'ApplicationUpdate':
            message = 'A new version of Sonarr is available';
            break;
        case 'ManualInteractionRequired':
            message = `${series} requires manual intervention`;
            break;
        case 'Test':
            message = 'Successfully connected to Framerr';
            break;
        default:
            message = `Event received for ${series}`;
    }

    return { title, message };
}

/**
 * Build normalized notification for Radarr events
 */
function buildRadarrNotification(
    eventType: string,
    movie: string,
    year: number | null,
    quality: string | null,
    payload: RadarrWebhookPayload
): NotificationContent {
    const titleMap: Record<string, string> = {
        'Grab': 'Movie Grabbed',
        'Download': 'Movie Downloaded',
        'Upgrade': 'Movie Upgraded',
        'ImportComplete': 'Import Complete',
        'Rename': 'Movie Renamed',
        'MovieAdded': 'Movie Added',
        'MovieDelete': 'Movie Removed',
        'MovieFileDelete': 'Movie Deleted',
        'MovieFileDeleteForUpgrade': 'Movie Deleted for Upgrade',
        'Health': 'Health Warning',
        'HealthRestored': 'Health Restored',
        'ApplicationUpdate': 'Update Available',
        'ManualInteractionRequired': 'Action Required',
        'Test': 'Test Notification'
    };

    const title = `Radarr: ${titleMap[eventType] || 'Notification'}`;
    const movieWithYear = year ? `${movie} (${year})` : movie;

    let message: string;
    switch (eventType) {
        case 'Grab':
            message = `${movieWithYear} has been grabbed${quality ? ` in ${quality}` : ''}`;
            break;
        case 'Download':
            message = `${movieWithYear} has been downloaded`;
            break;
        case 'Upgrade':
            message = `${movieWithYear} upgraded to ${quality || 'higher quality'}`;
            break;
        case 'ImportComplete':
            message = `${movieWithYear} import is complete`;
            break;
        case 'MovieAdded':
            message = `${movieWithYear} has been added to the library`;
            break;
        case 'MovieDelete':
            message = `${movie} has been removed from the library`;
            break;
        case 'MovieFileDelete':
        case 'MovieFileDeleteForUpgrade':
            message = `${movie} file has been deleted`;
            break;
        case 'Health':
            message = payload.message || 'A health issue was detected';
            break;
        case 'HealthRestored':
            message = 'All health issues have been resolved';
            break;
        case 'ApplicationUpdate':
            message = 'A new version of Radarr is available';
            break;
        case 'ManualInteractionRequired':
            message = `${movie} requires manual intervention`;
            break;
        case 'Test':
            message = 'Successfully connected to Framerr';
            break;
        default:
            message = `Event received for ${movie}`;
    }

    return { title, message };
}

export default router;
