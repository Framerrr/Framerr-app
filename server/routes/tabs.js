const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getUserTabs, addUserTab, updateUserTab, deleteUserTab, reorderUserTabs } = require('../db/userConfig');
const logger = require('../utils/logger');

/**
 * GET /api/tabs
 * Get current user's personal tabs
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const tabs = await getUserTabs(req.user.id);
        res.json({ tabs });
    } catch (error) {
        logger.error('Error fetching user tabs:', error);
        res.status(500).json({ error: 'Failed to fetch tabs' });
    }
});

/**
 * PUT /api/tabs/reorder
 * Reorder user's tabs
 * IMPORTANT: This must come BEFORE /:id route to avoid route collision
 */
router.put('/reorder', requireAuth, async (req, res) => {
    try {
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ error: 'orderedIds must be an array' });
        }

        const tabs = await reorderUserTabs(req.user.id, orderedIds);

        res.json({ tabs });
    } catch (error) {
        logger.error('Error reordering tabs:', error);
        res.status(500).json({ error: 'Failed to reorder tabs' });
    }
});

/**
 * GET /api/tabs/:id
 * Get specific tab by ID (user must own it)
 */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const tabs = await getUserTabs(req.user.id);
        const tab = tabs.find(t => t.id === req.params.id);

        if (!tab) {
            return res.status(404).json({ error: 'Tab not found' });
        }

        res.json({ tab });
    } catch (error) {
        logger.error('Error fetching tab:', error);
        res.status(500).json({ error: 'Failed to fetch tab' });
    }
});

/**
 * POST /api/tabs
 * Create new personal tab
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, url, icon, groupId, enabled } = req.body;

        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }

        const tab = await addUserTab(req.user.id, { name, url, icon, groupId, enabled });

        res.status(201).json({ tab });
    } catch (error) {
        logger.error('Error creating tab:', error);
        res.status(500).json({ error: 'Failed to create tab' });
    }
});

/**
 * PUT /api/tabs/:id
 * Update personal tab
 */
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { name, url, icon, groupId, enabled } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (url !== undefined) updates.url = url;
        if (icon !== undefined) updates.icon = icon;
        if (groupId !== undefined) updates.groupId = groupId;
        if (enabled !== undefined) updates.enabled = enabled;

        const tab = await updateUserTab(req.user.id, req.params.id, updates);

        res.json({ tab });
    } catch (error) {
        logger.error('Error updating tab:', error);
        if (error.message === 'Tab not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update tab' });
    }
});

/**
 * DELETE /api/tabs/:id
 * Delete personal tab
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        await deleteUserTab(req.user.id, req.params.id);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting tab:', error);
        if (error.message === 'Tab not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to delete tab' });
    }
});

module.exports = router;
