import { Router, Request, Response } from 'express';
import iconUpload from '../middleware/iconUpload';
import * as customIconsDB from '../db/customIcons';
import { requireAuth as authenticateUser } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

interface AuthenticatedUser {
    id: string;
    username: string;
    group: string;
}

interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
    file?: Express.Multer.File;
}

interface DeleteIconError extends Error {
    isSystemIcon?: boolean;
}

/**
 * POST /api/custom-icons - Upload a new custom icon
 */
router.post('/', authenticateUser, iconUpload.single('icon'), async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Store file path (relative to /config/upload/custom-icons/)
        const icon = await customIconsDB.addIcon({
            filename: authReq.file.filename,
            originalName: authReq.file.originalname,
            mimeType: authReq.file.mimetype,
            filePath: authReq.file.filename,
            uploadedBy: authReq.user!.id
        });

        res.status(201).json({ icon });
    } catch (error) {
        logger.error('Failed to upload custom icon', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to upload icon' });
    }
});

/**
 * GET /api/custom-icons - List all custom icons
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const icons = await customIconsDB.listIcons();
        res.json({ icons });
    } catch (error) {
        logger.error('Failed to list custom icons', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to list icons' });
    }
});

/**
 * GET /api/custom-icons/:id/file - Serve icon file
 */
router.get('/:id/file', async (req: Request, res: Response) => {
    try {
        const icon = await customIconsDB.getIconById(req.params.id);

        if (!icon) {
            res.status(404).json({ error: 'Icon not found' });
            return;
        }

        // Use icon.filePath (the actual file path) not icon.filename
        const filePath = await customIconsDB.getIconPath(icon.filePath!);
        if (filePath) {
            res.sendFile(filePath);
        } else {
            res.status(404).json({ error: 'Icon file not found' });
        }
    } catch (error) {
        logger.error('Failed to serve custom icon', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to serve icon' });
    }
});

/**
 * DELETE /api/custom-icons/:id - Delete a custom icon
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
        const iconId = req.params.id;
        const deletedIcon = await customIconsDB.deleteIcon(iconId);

        if (!deletedIcon) {
            res.status(404).json({ error: 'Icon not found' });
            return;
        }

        res.json({ success: true, icon: deletedIcon });
    } catch (error) {
        // Check if this is a system icon deletion attempt
        if ((error as DeleteIconError).isSystemIcon) {
            res.status(403).json({ error: 'System icons cannot be deleted' });
            return;
        }
        logger.error('Failed to delete custom icon', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to delete icon' });
    }
});

export default router;

