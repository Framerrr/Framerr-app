const express = require('express');
const router = express.Router();
const path = require('path');
const iconUpload = require('../middleware/iconUpload');
const customIconsDB = require('../db/customIcons');
const { requireAuth: authenticateUser } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * POST /api/custom-icons - Upload a new custom icon
 */
router.post('/', authenticateUser, iconUpload.single('icon'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Store file path (relative to /config/upload/custom-icons/)
        const icon = await customIconsDB.addIcon({
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            filePath: req.file.filename, // Just the filename, served from /config/upload/custom-icons/
            uploadedBy: req.user.id
        });

        res.status(201).json({ icon });
    } catch (error) {
        logger.error('Failed to upload custom icon', { error: error.message });
        res.status(500).json({ error: 'Failed to upload icon' });
    }
});

/**
 * GET /api/custom-icons - List all custom icons
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const icons = await customIconsDB.listIcons();
        res.json({ icons });
    } catch (error) {
        logger.error('Failed to list custom icons', { error: error.message });
        res.status(500).json({ error: 'Failed to list icons' });
    }
});

/**
 * GET /api/custom-icons/:id/file - Serve icon file
 */
router.get('/:id/file', async (req, res) => {
    try {
        const icon = await customIconsDB.getIconById(req.params.id);

        if (!icon) {
            return res.status(404).json({ error: 'Icon not found' });
        }

        // Use icon.filePath (the actual file path) not icon.filename
        const filePath = await customIconsDB.getIconPath(icon.filePath);
        res.sendFile(filePath);
    } catch (error) {
        logger.error('Failed to serve custom icon', { error: error.message });
        res.status(500).json({ error: 'Failed to serve icon' });
    }
});

/**
 * DELETE /api/custom-icons/:id - Delete a custom icon
 */
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const iconId = req.params.id;
        const deletedIcon = await customIconsDB.deleteIcon(iconId);

        if (!deletedIcon) {
            return res.status(404).json({ error: 'Icon not found' });
        }

        res.json({ success: true, icon: deletedIcon });
    } catch (error) {
        logger.error('Failed to delete custom icon', { error: error.message });
        res.status(500).json({ error: 'Failed to delete icon' });
    }
});

module.exports = router;
