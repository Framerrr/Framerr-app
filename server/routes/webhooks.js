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
const express = require('express');
const router = express.Router();
const { getSystemConfig } = require('../db/systemConfig');
const { createNotification } = require('../db/notifications');
const { resolveUserByUsername, getAdminsWithReceiveUnmatched, userWantsEvent } = require('../services/webhookUserResolver');
const logger = require('../utils/logger');

// Event type mappings from external services to Framerr event keys
const OVERSEERR_EVENT_MAP = {
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
    // Test events
    'test': 'test',
    'Test Notification': 'test'
};

const SONARR_EVENT_MAP = {
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

const RADARR_EVENT_MAP = {
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
async function validateToken(service, token) {
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
        logger.error('[Webhook] Token validation error:', error.message);
        return { valid: false, reason: 'Validation error' };
    }
}

/**
 * POST /api/webhooks/overseerr/:token
 * Receive Overseerr webhook
 */
router.post('/overseerr/:token', async (req, res) => {
    const { token } = req.params;
    const payload = req.body;

    logger.debug('[Webhook] Received Overseerr webhook', { event: payload.event });

    const validation = await validateToken('overseerr', token);
    if (!validation.valid) {
        logger.warn('[Webhook] Invalid Overseerr webhook', { reason: validation.reason });
        return res.status(401).json({ error: validation.reason });
    }

    try {
        // Map Overseerr event to Framerr event key
        const eventKey = OVERSEERR_EVENT_MAP[payload.event];
        if (!eventKey) {
            logger.debug('[Webhook] Unknown Overseerr event type', { event: payload.event });
            return res.status(200).json({ status: 'ignored', reason: 'Unknown event type' });
        }

        // Extract username based on event type
        let username = null;
        if (payload.request?.requestedBy_username) {
            username = payload.request.requestedBy_username;
        } else if (payload.issue?.reportedBy_username) {
            username = payload.issue.reportedBy_username;
        } else if (payload.comment?.commentedBy_username) {
            username = payload.comment.commentedBy_username;
        }

        // Build notification content
        const title = payload.subject || 'Overseerr Notification';
        const message = payload.message || `Event: ${payload.event}`;

        // Process notification
        const result = await processWebhookNotification({
            service: 'overseerr',
            eventKey,
            username,
            title,
            message,
            webhookConfig: validation.webhookConfig
        });

        res.status(200).json({ status: 'ok', ...result });
    } catch (error) {
        logger.error('[Webhook] Overseerr processing error:', error.message);
        res.status(500).json({ error: 'Processing failed' });
    }
});

/**
 * POST /api/webhooks/sonarr/:token
 * Receive Sonarr webhook
 */
router.post('/sonarr/:token', async (req, res) => {
    const { token } = req.params;
    const payload = req.body;

    logger.debug('[Webhook] Received Sonarr webhook', { eventType: payload.eventType });

    const validation = await validateToken('sonarr', token);
    if (!validation.valid) {
        logger.warn('[Webhook] Invalid Sonarr webhook', { reason: validation.reason });
        return res.status(401).json({ error: validation.reason });
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
            return res.status(200).json({ status: 'ignored', reason: 'Unknown event type' });
        }

        // Build notification content
        const series = payload.series?.title || 'Unknown Series';
        const episodes = payload.episodes || [];
        const episodeInfo = episodes.length > 0
            ? `S${episodes[0].seasonNumber}E${episodes[0].episodeNumber}`
            : '';

        const title = `Sonarr: ${series}`;
        const message = buildSonarrMessage(payload.eventType, series, episodeInfo, payload);

        // Sonarr doesn't have per-user requests, so notifications go to admins only
        const result = await processWebhookNotification({
            service: 'sonarr',
            eventKey,
            username: null, // No user association for Sonarr
            title,
            message,
            webhookConfig: validation.webhookConfig,
            adminOnly: true
        });

        res.status(200).json({ status: 'ok', ...result });
    } catch (error) {
        logger.error('[Webhook] Sonarr processing error:', error.message);
        res.status(500).json({ error: 'Processing failed' });
    }
});

/**
 * POST /api/webhooks/radarr/:token
 * Receive Radarr webhook
 */
router.post('/radarr/:token', async (req, res) => {
    const { token } = req.params;
    const payload = req.body;

    logger.debug('[Webhook] Received Radarr webhook', { eventType: payload.eventType });

    const validation = await validateToken('radarr', token);
    if (!validation.valid) {
        logger.warn('[Webhook] Invalid Radarr webhook', { reason: validation.reason });
        return res.status(401).json({ error: validation.reason });
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
            return res.status(200).json({ status: 'ignored', reason: 'Unknown event type' });
        }

        // Build notification content
        const movie = payload.movie?.title || 'Unknown Movie';
        const year = payload.movie?.year ? ` (${payload.movie.year})` : '';

        const title = `Radarr: ${movie}${year}`;
        const message = buildRadarrMessage(payload.eventType, movie, payload);

        // Radarr doesn't have per-user requests, notifications go to admins only
        const result = await processWebhookNotification({
            service: 'radarr',
            eventKey,
            username: null,
            title,
            message,
            webhookConfig: validation.webhookConfig,
            adminOnly: true
        });

        res.status(200).json({ status: 'ok', ...result });
    } catch (error) {
        logger.error('[Webhook] Radarr processing error:', error.message);
        res.status(500).json({ error: 'Processing failed' });
    }
});

/**
 * Process webhook and create notifications for appropriate users
 */
async function processWebhookNotification({ service, eventKey, username, title, message, webhookConfig, adminOnly = false }) {
    const notificationsSent = [];

    // Test events bypass all preference checks and go to all admins
    const isTestEvent = eventKey === 'test';

    logger.info('[Webhook] Processing notification', {
        service,
        eventKey,
        username,
        isTestEvent,
        adminOnly
    });

    if (isTestEvent) {
        // Test notifications - send to all admins regardless of settings
        const { listUsers } = require('../db/users');
        const users = await listUsers();
        const admins = users.filter(u => u.group === 'admin');

        for (const admin of admins) {
            await createNotification({
                userId: admin.id,
                type: 'success',
                title: `[Test] ${title}`,
                message: message || 'Test notification received successfully!'
            });
            notificationsSent.push({ userId: admin.id, username: admin.username, test: true });
        }

        logger.info('[Webhook] Test notifications sent to admins', { count: notificationsSent.length });
        return { notificationsSent: notificationsSent.length };
    }

    if (!adminOnly && username) {
        // Try to find the user who triggered this event
        const user = await resolveUserByUsername(username, service);

        if (user) {
            const isAdmin = user.group === 'admin';
            const wantsEvent = await userWantsEvent(user.id, service, eventKey, isAdmin, webhookConfig);

            logger.debug('[Webhook] User event check', {
                userId: user.id,
                isAdmin,
                wantsEvent,
                eventKey
            });

            if (wantsEvent) {
                await createNotification({
                    userId: user.id,
                    type: 'info',
                    title,
                    message
                });
                notificationsSent.push({ userId: user.id, username: user.username });
                logger.info('[Webhook] Notification created for user', { userId: user.id, service, eventKey });
            }
        } else {
            // No user match - send to admins with receiveUnmatched
            logger.debug('[Webhook] No user match, checking admins with receiveUnmatched');
            const admins = await getAdminsWithReceiveUnmatched();

            for (const admin of admins) {
                const wantsEvent = await userWantsEvent(admin.id, service, eventKey, true, webhookConfig);

                if (wantsEvent) {
                    await createNotification({
                        userId: admin.id,
                        type: 'info',
                        title: `[Unmatched] ${title}`,
                        message: `From: ${username}\n${message}`
                    });
                    notificationsSent.push({ userId: admin.id, username: admin.username, unmatched: true });
                    logger.info('[Webhook] Unmatched notification sent to admin', { adminId: admin.id, username });
                }
            }
        }
    } else {
        // Admin-only notifications (Sonarr/Radarr system events)
        const admins = await getAdminsWithReceiveUnmatched();

        for (const admin of admins) {
            const wantsEvent = await userWantsEvent(admin.id, service, eventKey, true, webhookConfig);

            if (wantsEvent) {
                await createNotification({
                    userId: admin.id,
                    type: 'info',
                    title,
                    message
                });
                notificationsSent.push({ userId: admin.id, username: admin.username });
            }
        }

        logger.info('[Webhook] Admin notifications created', { service, eventKey, count: notificationsSent.length });
    }

    return { notificationsSent: notificationsSent.length };
}

/**
 * Build descriptive message for Sonarr events
 */
function buildSonarrMessage(eventType, series, episodeInfo, payload) {
    switch (eventType) {
        case 'Grab':
            return `Grabbed ${episodeInfo ? episodeInfo + ' of ' : ''}${series}`;
        case 'Download':
            return `Downloaded ${episodeInfo ? episodeInfo + ' of ' : ''}${series}`;
        case 'Upgrade':
            return `Upgraded ${episodeInfo ? episodeInfo + ' of ' : ''}${series}`;
        case 'ImportComplete':
            return `Import complete for ${series}`;
        case 'SeriesAdd':
            return `Added series: ${series}`;
        case 'SeriesDelete':
            return `Deleted series: ${series}`;
        case 'Health':
        case 'HealthRestored':
            return payload.message || `Health status changed for ${series}`;
        case 'ApplicationUpdate':
            return 'Sonarr application update available';
        case 'ManualInteractionRequired':
            return `Manual interaction required for ${series}`;
        default:
            return `Event: ${eventType}`;
    }
}

/**
 * Build descriptive message for Radarr events
 */
function buildRadarrMessage(eventType, movie, payload) {
    switch (eventType) {
        case 'Grab':
            return `Grabbed ${movie}`;
        case 'Download':
            return `Downloaded ${movie}`;
        case 'Upgrade':
            return `Upgraded ${movie}`;
        case 'ImportComplete':
            return `Import complete for ${movie}`;
        case 'MovieAdded':
            return `Added movie: ${movie}`;
        case 'MovieDelete':
            return `Deleted movie: ${movie}`;
        case 'Health':
        case 'HealthRestored':
            return payload.message || `Health status changed`;
        case 'ApplicationUpdate':
            return 'Radarr application update available';
        case 'ManualInteractionRequired':
            return `Manual interaction required for ${movie}`;
        default:
            return `Event: ${eventType}`;
    }
}

module.exports = router;
