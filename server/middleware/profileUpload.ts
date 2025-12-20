import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, '/config/upload/temp');
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // Use timestamp + random suffix to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer configuration for profile pictures
// No fileFilter here - validation happens at route level for better error messages
const profileUpload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit (matches frontend validation)
    }
});

export default profileUpload;
