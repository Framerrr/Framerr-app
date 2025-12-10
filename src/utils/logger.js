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
        // Use import.meta.env for Vite compatibility (works in dev server and builds)
        this.level = import.meta.env.VITE_LOG_LEVEL || 'info';
        this.isProduction = import.meta.env.MODE === 'production';

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
            // Only show timestamp and message for non-error logs
            if (level === 'error') {
                return `${timestamp} [ERROR] ${message} ${meta.error ? `- ${meta.error}` : ''}`;
            }
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
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
║  ${appName.padEnd(55)}                                    ║
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
}

// Export singleton instance
export default new Logger();
