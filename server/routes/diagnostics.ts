import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';
import axios from 'axios';

const router = Router();

interface DatabaseTestResult {
    success: boolean;
    status: string;
    latency: number;
    details?: {
        path: string;
        sizeKB: number;
        accessible: boolean;
        userCount: number;
        tableCount: number;
        type: string;
    };
    error?: string;
}

interface EndpointResult {
    name: string;
    path: string;
    status: string;
    responseTime: number;
    error?: string;
}

interface DownloadBody {
    size?: number;
}

// All diagnostics routes require admin access
router.use(requireAdmin);

/**
 * Test SQLite database connection and latency
 */
router.get('/database', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { db } = require('../database/db');
        const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
        const dbPath = path.join(DATA_DIR, 'framerr.db');

        // Test database query to verify connection
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
        const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];

        // Get file stats
        const stats = await fs.stat(dbPath);

        const latency = Date.now() - startTime;

        const result: DatabaseTestResult = {
            success: true,
            status: 'healthy',
            latency,
            details: {
                path: dbPath,
                sizeKB: Math.round(stats.size / 1024),
                accessible: true,
                userCount: userCount.count,
                tableCount: tableInfo.length,
                type: 'SQLite'
            }
        };

        res.json(result);
    } catch (error) {
        logger.error('Database diagnostic failed', { error: (error as Error).message });
        const latency = Date.now() - startTime;

        const result: DatabaseTestResult = {
            success: false,
            status: 'error',
            latency,
            error: (error as Error).message
        };

        res.json(result);
    }
});

/**
 * Simple ping for latency test
 */
router.get('/ping', (req: Request, res: Response) => {
    res.json({ success: true, timestamp: Date.now() });
});

/**
 * Download speed test - send data chunks to client
 */
router.post('/download', (req: Request, res: Response) => {
    try {
        const { size = 1 } = req.body as DownloadBody;
        const bytes = size * 1024 * 1024;

        // Generate random data
        const chunk = Buffer.alloc(bytes, 'x');

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', chunk.length);
        res.send(chunk);
    } catch (error) {
        logger.error('Download speed test failed', { error: (error as Error).message });
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * Upload speed test - receive data chunks from client
 */
router.post('/upload', (req: Request, res: Response) => {
    try {
        // Client sends data in req.body
        const receivedBytes = JSON.stringify(req.body).length;

        res.json({
            success: true,
            receivedBytes
        });
    } catch (error) {
        logger.error('Upload speed test failed', { error: (error as Error).message });
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * Test critical non-authenticated API endpoints
 */
router.get('/api-health', async (req: Request, res: Response) => {
    const baseURL = `http://localhost:${process.env.PORT || 3001}`;

    // Test only public endpoints that don't require authentication
    const endpoints = [
        { name: 'Health Check', path: '/api/health' },
        { name: 'Setup Status', path: '/api/auth/setup/status' },
        { name: 'App Config', path: '/api/config/app-name' }
    ];

    const results: EndpointResult[] = await Promise.all(endpoints.map(async (endpoint) => {
        const startTime = Date.now();

        try {
            await axios.get(`${baseURL}${endpoint.path}`, {
                timeout: 5000
            });

            const responseTime = Date.now() - startTime;

            return {
                name: endpoint.name,
                path: endpoint.path,
                status: 'healthy',
                responseTime
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const axiosError = error as { code?: string; message?: string };

            return {
                name: endpoint.name,
                path: endpoint.path,
                status: 'error',
                responseTime,
                error: axiosError.code || axiosError.message
            };
        }
    }));

    const allHealthy = results.every(r => r.status === 'healthy');

    res.json({
        success: true,
        overallStatus: allHealthy ? 'healthy' : 'degraded',
        endpoints: results
    });
});

export default router;

