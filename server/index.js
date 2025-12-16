/**
 * Homelab Dashboard - Server Entry Point
 * 
 * Main server application using Express.js
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const { version } = require('./package.json');

// Initialize Express app
const app = express();

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Body parsing middleware - increased limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(require('cookie-parser')());

// Proxy whitelist validation (must be before session middleware)
const { validateProxyWhitelist } = require('./middleware/proxyWhitelist');
app.use(validateProxyWhitelist());

// Security middleware - configured for HTTP Docker deployments
app.use(helmet({
    contentSecurityPolicy: false,  // Disable CSP that forces HTTPS
    hsts: false,  // Disable HSTS in non-HTTPS environments
    crossOriginOpenerPolicy: false,  // Disable COOP warnings on HTTP
    crossOriginEmbedderPolicy: false  // Disable COEP warnings on HTTP
}));
app.use(cors({
    origin: true,  // Allow all origins (recommended for reverse proxy setups)
    credentials: true
}));

// Global session middleware - proxy auth takes precedence over local session
app.use(async (req, res, next) => {
    try {
        // Load fresh config from DB to respect runtime toggle changes
        const { getSystemConfig } = require('./db/systemConfig');
        const systemConfig = await getSystemConfig();

        // Try proxy auth first (if enabled and headers present)
        if (systemConfig?.auth?.proxy?.enabled) {
            // Get configured header names (with fallbacks to Authentik defaults)
            const headerName = (systemConfig.auth.proxy.headerName || 'X-authentik-username').toLowerCase();
            const emailHeaderName = (systemConfig.auth.proxy.emailHeaderName || 'X-authentik-email').toLowerCase();

            // Check configured header first, then common fallbacks
            const username = req.headers[headerName] ||
                req.headers['x-forwarded-user'] ||
                req.headers['remote-user'];
            const email = req.headers[emailHeaderName] ||
                req.headers['x-forwarded-email'] ||
                req.headers['remote-email'];

            if (username) {
                const { getUser, createUser } = require('./db/users');
                let user = await getUser(username);

                // Auto-create user from proxy auth if doesn't exist
                if (!user) {
                    logger.info(`[ProxyAuth] Auto-creating user: ${username}`);
                    const { hashPassword } = require('./auth/password');
                    const passwordHash = await hashPassword('PROXY_AUTH_PLACEHOLDER');

                    user = await createUser({
                        username,
                        email: email || `${username}@proxy.local`,
                        passwordHash,  // createUser expects passwordHash, not password
                        group: 'user'  // New proxy users are regular users by default
                    });
                }

                req.user = user;
                req.proxyAuth = true;  // Flag to indicate proxy auth was used
                return next();
            }
        }

        // Fall back to session-based auth if proxy auth not used
        const sessionId = req.cookies?.sessionId;
        if (sessionId) {
            const { validateSession } = require('./auth/session');
            const { getUserById } = require('./db/users');

            const session = await validateSession(sessionId);
            if (session) {
                const user = await getUserById(session.userId);
                if (user) {
                    req.user = user;
                }
            }
        }
    } catch (error) {
        logger.error('Auth middleware error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
    }
    next();
});

// Request logging middleware (only in development)
if (NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        logger.debug('Incoming request', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            authenticated: !!req.user
        });
        next();
    });
}

// Serve static files with CORS for proxy compatibility
const path = require('path');

// Default Framerr favicons (always available, never deleted)
// Always serve from server's public folder (these are bundled with the server, not the frontend)
const defaultFaviconPath = path.join(__dirname, 'public/favicon-default');
app.use('/favicon-default', cors(), express.static(defaultFaviconPath));

// Custom user favicons (uploaded via Settings UI)
// ALWAYS serve from DATA_DIR for persistence across container restarts
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const customFaviconPath = path.join(DATA_DIR, 'public/favicon');
const fs = require('fs');
// Ensure directory exists
if (!fs.existsSync(customFaviconPath)) {
    fs.mkdirSync(customFaviconPath, { recursive: true });
}

// Favicon with fallback: try custom first, then default
app.use('/favicon', cors(), (req, res, next) => {
    const customFile = path.join(customFaviconPath, req.path);

    // Check if custom file exists
    if (fs.existsSync(customFile)) {
        return res.sendFile(customFile);
    }

    // Fallback to default Framerr favicon
    const defaultFile = path.join(defaultFaviconPath, req.path);
    if (fs.existsSync(defaultFile)) {
        return res.sendFile(defaultFile);
    }

    // Neither exists - 404
    res.status(404).json({ error: 'Favicon not found' });
});

// Profile pictures
app.use('/profile-pictures', cors(), express.static('/config/upload/profile-pictures'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version,
        environment: NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'  // Expose LOG_LEVEL for frontend logger sync
    });
});

// Routes
app.use('/api/auth/setup', require('./routes/setup'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/config', require('./routes/config'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/system', require('./routes/system'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/tabs', require('./routes/tabs'));
app.use('/api/widgets', require('./routes/widgets'));
app.use('/api/theme', require('./routes/theme'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/custom-icons', require('./routes/custom-icons'));
app.use('/api/advanced', require('./routes/advanced'));
app.use('/api/diagnostics', require('./routes/diagnostics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/plex', require('./routes/plex'));
app.use('/api/linked-accounts', require('./routes/linkedAccounts'));
app.use('/api/webhooks', require('./routes/webhooks'));



// Proxy routes for widgets (require authentication)
app.use('/api', require('./routes/proxy'));

// In production, serve built frontend
if (NODE_ENV === 'production') {
    const path = require('path');
    const distPath = path.join(__dirname, '../dist');

    // Service Worker - prevent caching to ensure updates are picked up
    app.get('/sw.js', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(path.join(distPath, 'sw.js'));
    });

    // Serve static files
    app.use(express.static(distPath));

    // OAuth callback route - serve login-complete.html directly
    app.get('/login-complete', (req, res) => {
        res.sendFile(path.join(distPath, 'login-complete.html'));
    });

    // SPA fallback - send index.html for all non-API routes
    app.get('*', (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api') || req.path.startsWith('/favicon') || req.path.startsWith('/profile-pictures')) {
            return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// Root API endpoint (will be overridden by SPA in production)
app.get('/', (req, res) => {
    res.json({
        message: 'Framerr API',
        version,
        endpoints: {
            health: '/api/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    logger.warn('404 Not Found', { path: req.path, method: req.method });
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Server error', {
        error: err.message,
        stack: err.stack,
        path: req.path
    });

    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: NODE_ENV === 'production'
                ? 'An error occurred'
                : err.message
        }
    });
});

// Start server with proper async initialization
(async () => {
    try {
        // Initialize database schema if this is a fresh database
        const { isInitialized, initializeSchema, db } = require('./database/db');
        const { checkMigrationStatus, runMigrations, setVersion } = require('./database/migrator');

        if (!isInitialized()) {
            logger.info('Fresh database detected - initializing schema...');
            initializeSchema();
            // Set initial version for fresh databases
            setVersion(db, 1); // Current expected version (matches latest migration)
            logger.info('Database schema initialized (v1)');
        } else {
            // Check if migrations are needed
            const status = checkMigrationStatus(db);

            if (status.isDowngrade) {
                // Database is newer than app expects - refuse to start
                logger.error(`Database schema (v${status.currentVersion}) is newer than this version of Framerr expects (v${status.expectedVersion}).`);
                logger.error('Please upgrade Framerr or restore from a backup.');
                process.exit(1);
            }

            if (status.needsMigration) {
                logger.info(`Database migration needed: v${status.currentVersion} → v${status.expectedVersion}`);
                const result = runMigrations(db);

                if (!result.success) {
                    logger.error('Database migration failed:', result.error);
                    logger.error('Please check logs and restore from backup if needed.');
                    process.exit(1);
                }

                logger.info(`Database migrated successfully: v${result.migratedFrom} → v${result.migratedTo}`);
            } else {
                logger.debug(`Database at version ${status.currentVersion}, no migration needed`);
            }
        }

        // Load system config BEFORE starting server
        const { getSystemConfig } = require('./db/systemConfig');
        const systemConfig = await getSystemConfig();
        app.set('systemConfig', systemConfig);
        logger.info('System config loaded');

        // Load log level from systemConfig if set
        if (systemConfig.debug?.logLevel) {
            logger.setLevel(systemConfig.debug.logLevel);
        }

        // Now start server with config loaded
        app.listen(PORT, () => {
            logger.startup('Homelab Dashboard', {
                version,
                port: PORT,
                env: NODE_ENV
            });

            logger.info('API endpoints available');
            logger.info('Health check: GET /api/health');

            if (NODE_ENV === 'development') {
                logger.debug('Development mode active - verbose logging enabled');
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
