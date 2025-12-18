const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// All diagnostics routes require admin access
router.use(requireAdmin);

// ============================================================================
// DATABASE (JSON FILE) TEST
// ============================================================================

/**
 * Test database (JSON files) connection and latency
 */
router.get('/database', async (req, res) => {
    const startTime = Date.now();

    try {
        const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
        const testFile = path.join(DATA_DIR, 'users.json');

        // Test read access
        await fs.access(testFile, fs.constants.R_OK | fs.constants.W_OK);
        const stats = await fs.stat(testFile);

        const latency = Date.now() - startTime;

        res.json({
            success: true,
            status: 'healthy',
            latency,
            details: {
                path: DATA_DIR,
                sizeKB: Math.round(stats.size / 1024),
                accessible: true
            }
        });
    } catch (error) {
        logger.error('Database diagnostic failed', { error: error.message });
        const latency = Date.now() - startTime;

        res.json({
            success: false,
            status: 'error',
            latency,
            error: error.message
        });
    }
});

// ============================================================================
// NETWORK / SPEED TEST
// ============================================================================

/**
 * Simple ping for latency test
 */
router.get('/ping', (req, res) => {
    res.json({ success: true, timestamp: Date.now() });
});

/**
 * Download speed test - send data chunks to client
 */
router.post('/download', (req, res) => {
    try {
        const { size = 1 } = req.body; // Size in MB
        const bytes = size * 1024 * 1024;

        // Generate random data
        const chunk = Buffer.alloc(bytes, 'x');

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', chunk.length);
        res.send(chunk);
    } catch (error) {
        logger.error('Download speed test failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Upload speed test - receive data chunks from client
 */
router.post('/upload', (req, res) => {
    try {
        // Client sends data in req.body
        const receivedBytes = JSON.stringify(req.body).length;

        res.json({
            success: true,
            receivedBytes
        });
    } catch (error) {
        logger.error('Upload speed test failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// API HEALTH CHECKS
// ============================================================================

/**
 * Test critical non-authenticated API endpoints
 */
router.get('/api-health', async (req, res) => {
    const axios = require('axios');
    const baseURL = `http://localhost:${process.env.PORT || 3001}`;

    // Test only public endpoints that don't require authentication
    const endpoints = [
        { name: 'Health Check', path: '/api/health' },
        { name: 'Setup Status', path: '/api/auth/setup/status' },
        { name: 'App Config', path: '/api/config/app-name' }
    ];

    const results = await Promise.all(endpoints.map(async (endpoint) => {
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

            return {
                name: endpoint.name,
                path: endpoint.path,
                status: 'error',
                responseTime,
                error: error.code || error.message
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

module.exports = router;
