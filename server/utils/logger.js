/**
 * Professional Logging Utility
 * 
 * Provides environment-aware logging with multiple severity levels.
 * 
 * - Production: Clean, minimal output (startup info, errors only)
 * - Development: Verbose, structured JSON logs with metadata
 * 
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Server started', { port: 3001 });
 *   logger.error('Database error', { error: err.message });
 */

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

class Logger {
    constructor() {
        // Get log level from environment, default to 'info'
        this.level = process.env.LOG_LEVEL || 'info';
        this.isProduction = process.env.NODE_ENV === 'production';

        // Validate log level
        if (!LOG_LEVELS.hasOwnProperty(this.level)) {
            console.warn(`Invalid LOG_LEVEL "${this.level}", defaulting to "info"`);
            this.level = 'info';
        }
    }

    /**
     * Format log message based on environment
     */
    format(level, message, meta = {}) {
        const timestamp = new Date().toISOString();

        // Production: Clean, human-readable format
        if (this.isProduction) {
            // Stringify metadata if it has content
            const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
        }

        // Development: Structured JSON with full metadata
        const logObj = {
            timestamp,
            level,
            message,
            ...meta
        };

        return JSON.stringify(logObj, null, 2);
    }

    /**
     * Core logging method
     */
    log(level, message, meta = {}) {
        // Check if this level should be logged
        if (LOG_LEVELS[level] > LOG_LEVELS[this.level]) {
            return;
        }

        const formatted = this.format(level, message, meta);

        // Add to log buffer for Debug UI
        try {
            const logBuffer = require('./logBuffer');
            logBuffer.add(level, message, meta);
        } catch (err) {
            // Ignore errors loading logBuffer (e.g., during startup)
        }

        // Use appropriate console method
        if (level === 'error') {
            console.error(formatted);
        } else if (level === 'warn') {
            console.warn(formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} meta - Additional metadata (e.g., { error: err.message, stack: err.stack })
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} meta - Additional metadata
     */
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} meta - Additional metadata
     */
    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    /**
     * Log debug message (only in development with LOG_LEVEL=debug)
     * @param {string} message - Debug message
     * @param {Object} meta - Additional metadata
     */
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    /**
     * Log startup information (always shown, formatted nicely)
     */
    startup(appName, config = {}) {
        const banner = `
╔═══════════════════════════════════════════════════════════╗
║  ${appName.padEnd(55)}  ║
╚═══════════════════════════════════════════════════════════╝`;

        console.log(banner);

        if (config.version) {
            this.info(`Version: ${config.version}`);
        }
        if (config.port) {
            this.info(`Server listening on port ${config.port}`);
        }
        if (config.env) {
            this.info(`Environment: ${config.env}`);
        }

        this.info('Server started successfully');
    }

    /**
     * Set log level dynamically at runtime
     * @param {string} level - New log level (error, warn, info, debug)
     */
    setLevel(level) {
        const lowercaseLevel = level.toLowerCase();
        if (LOG_LEVELS.hasOwnProperty(lowercaseLevel)) {
            this.level = lowercaseLevel;
            this.info(`Log level changed to: ${lowercaseLevel}`);
        } else {
            console.warn(`Invalid log level "${level}". Valid levels: error, warn, info, debug`);
        }
    }
}

// Export singleton instance
module.exports = new Logger();
