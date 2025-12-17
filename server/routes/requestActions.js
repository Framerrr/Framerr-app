/**
 * Request Actions API
 * 
 * Handles approve/decline actions for Overseerr media requests
 * directly from Framerr notifications.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getNotificationById, deleteNotification } = require('../db/notifications');
const { getSystemConfig } = require('../db/systemConfig');
const logger = require('../utils/logger');

/**
 * POST /api/request-actions/overseerr/:action/:notificationId
 * Approve or decline an Overseerr request via notification
 * 
 * @param action - 'approve' or 'decline'
 * @param notificationId - The notification ID containing the request metadata
 */
router.post('/overseerr/:action/:notificationId', requireAuth, requireAdmin, async (req, res) => {
    const { action, notificationId } = req.params;
    const userId = req.user.id;

    // Validate action
    if (!['approve', 'decline'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be "approve" or "decline"' });
    }

    try {
        // Get the notification
        const notification = await getNotificationById(notificationId, userId);

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        // Verify it's an actionable Overseerr notification
        if (!notification.metadata?.actionable || notification.metadata?.service !== 'overseerr') {
            return res.status(400).json({ error: 'Notification is not actionable' });
        }

        const requestId = notification.metadata.requestId;
        if (!requestId) {
            return res.status(400).json({ error: 'No request ID found in notification' });
        }

        // Get Overseerr integration config
        const config = await getSystemConfig();
        const overseerrConfig = config.integrations?.overseerr;

        if (!overseerrConfig?.enabled || !overseerrConfig?.url || !overseerrConfig?.apiKey) {
            return res.status(400).json({ error: 'Overseerr integration not configured' });
        }

        // Map action to Overseerr status
        const overseerrStatus = action === 'approve' ? 'approve' : 'decline';

        // Call Overseerr API
        const apiUrl = `${overseerrConfig.url.replace(/\/$/, '')}/api/v1/request/${requestId}/${overseerrStatus}`;

        logger.info('[RequestActions] Calling Overseerr API', {
            action,
            requestId,
            url: apiUrl
        });

        try {
            await axios.post(apiUrl, {}, {
                headers: {
                    'X-Api-Key': overseerrConfig.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            // Success - delete the notification
            await deleteNotification(notificationId, userId);

            logger.info('[RequestActions] Request action successful', {
                action,
                requestId,
                notificationId
            });

            res.json({
                success: true,
                action,
                requestId,
                message: `Request ${action}d successfully`
            });

        } catch (apiError) {
            // Handle Overseerr API errors
            const status = apiError.response?.status;
            const errorMessage = apiError.response?.data?.message || apiError.message;

            logger.warn('[RequestActions] Overseerr API error', {
                action,
                requestId,
                status,
                error: errorMessage
            });

            // If 404 or other client error, the request may already be handled
            if (status === 404 || status === 400 || status === 409) {
                // Delete the notification anyway - it's stale
                await deleteNotification(notificationId, userId);

                return res.json({
                    success: true,
                    alreadyHandled: true,
                    action,
                    requestId,
                    message: 'Request was already handled'
                });
            }

            // Other errors - keep notification, report error
            return res.status(502).json({
                success: false,
                error: `Overseerr error: ${errorMessage}`
            });
        }

    } catch (error) {
        logger.error('[RequestActions] Error processing request action', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to process request action' });
    }
});

module.exports = router;
