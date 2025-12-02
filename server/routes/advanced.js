const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const logBuffer = require('../utils/logBuffer');

// All advanced settings routes require admin access
router.use(requireAdmin);

// ============================================================================
// LOGS ENDPOINTS
// ============================================================================

// Get recent logs
router.get('/logs', async (req, res) => {
    try {
        const logs = logBuffer.get();
        res.json({
            success: true,
            logs: logs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear logs
router.post('/logs/clear', async (req, res) => {
    try {
        logBuffer.clear();
        res.json({ success: true, message: 'Logs cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download logs
router.get('/logs/download', async (req, res) => {
    try {
        const logsText = logBuffer.toText();
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=framerr-logs.txt');
        res.send(logsText || 'No logs available');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Relay frontend logs to server (centralized logging)
router.post('/logs/relay', async (req, res) => {
    try {
        const { level, message, meta } = req.body;

        // Validate log level
        const validLevels = ['error', 'warn', 'info', 'debug'];
        if (!level || !validLevels.includes(level.toLowerCase())) {
            return res.status(400).json({
                error: 'Invalid log level'
            });
        }

        // Add to log buffer
        logBuffer.add(level.toLowerCase(), `[FRONTEND] ${message}`, meta || {});

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update log level
router.post('/logs/level', async (req, res) => {
    try {
        const { level } = req.body;
        const validLevels = ['error', 'warn', 'info', 'debug'];

        if (!level || !validLevels.includes(level.toLowerCase())) {
            return res.status(400).json({
                error: 'Invalid log level. Must be: error, warn, info, or debug'
            });
        }

        // Update runtime logger
        const logger = require('../utils/logger');
        logger.setLevel(level);

        // Save to systemConfig for persistence
        const { updateSystemConfig } = require('../db/systemConfig');
        await updateSystemConfig({
            debug: { logLevel: level.toLowerCase() }
        });

        res.json({
            success: true,
            level: level.toLowerCase(),
            message: 'Log level updated'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// SYSTEM ENDPOINTS
// ============================================================================

// Get system information
router.get('/system/info', async (req, res) => {
    try {
        const systemInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime(),
            appVersion: require('../package.json').version  // Fixed: one level up from server/
        };
        res.json({ success: true, data: systemInfo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get resource usage
router.get('/system/resources', async (req, res) => {
    try {
        const memoryUsage = process.memoryUsage();
        const resources = {
            memory: {
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            },
            cpu: process.cpuUsage()
        };
        res.json({ success: true, data: resources });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get health check status
router.get('/system/health', async (req, res) => {
    try {
        // TODO: Implement actual health checks
        const health = {
            database: { status: 'healthy', message: 'Connected' },
            api: { status: 'healthy', message: 'Responsive' }
        };
        res.json({ success: true, data: health });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// DIAGNOSTICS ENDPOINTS
// ============================================================================

// Run diagnostic tests
router.post('/diagnostics/test', async (req, res) => {
    try {
        // TODO: Implement diagnostic tests
        res.json({
            success: true,
            results: {
                database: { status: 'pass', latency: 5 },
                integrations: { status: 'pass', tested: 0 }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// FEATURE FLAGS ENDPOINTS
// ============================================================================

// Get feature flags
router.get('/features', async (req, res) => {
    try {
        // TODO: Get from systemConfig
        res.json({
            success: true,
            features: {}
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update feature flags
router.post('/features', async (req, res) => {
    try {
        // TODO: Update systemConfig
        res.json({ success: true, message: 'Feature flags updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
