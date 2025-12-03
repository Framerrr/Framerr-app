/**
 * Frontend Logger Utility
 * 
 * Environment-aware logging synchronized with backend LOG_LEVEL.
 * - Fetches LOG_LEVEL from /api/health on app startup
 * - Falls back to build-time env (DEV mode) if fetch fails
 * - Caches level in memory for session duration
 * 
 * Usage:
 *   import logger from './utils/logger';
 *   logger.debug('User action', { details: '...' });
 *   logger.info('Operation completed');
 *   logger.error('Failed to save', { error: err.message });
 */
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};
class Logger {
    constructor() {
        this.level = LOG_LEVELS.error; // Default to error-only until loaded
        this.isReady = false;
        this.initPromise = this.init();
    }
    /**
     * Initialize logger by fetching LOG_LEVEL from backend
     * This happens once when the app loads
     */
    async init() {
        try {
            // Fetch LOG_LEVEL from backend health endpoint
            const response = await fetch('/api/health', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                const serverLogLevel = data.logLevel || 'info';
                this.level = LOG_LEVELS[serverLogLevel] ?? LOG_LEVELS.info;

                // Log initialization (only if debug enabled)
                if (this.shouldLog('debug')) {
                    console.log(`[LOGGER] Initialized with LOG_LEVEL=${serverLogLevel}`);
                }
            } else {
                throw new Error(`Health endpoint returned ${response.status}`);
            }
        } catch (error) {
            // Fallback to build-time detection if backend unavailable
            const isDevelopment = import.meta.env.DEV;
            this.level = isDevelopment ? LOG_LEVELS.debug : LOG_LEVELS.error;

            // Always log initialization failure
            console.warn('[LOGGER] Failed to fetch LOG_LEVEL from backend, using fallback:', {
                fallback: isDevelopment ? 'debug' : 'error',
                error: error.message
            });
        } finally {
            this.isReady = true;
        }
    }
    /**
     * Check if a log level should be output
     * @param {string} level - Log level to check (error, warn, info, debug)
     * @returns {boolean}
     */
    shouldLog(level) {
        return LOG_LEVELS[level] <= this.level;
    }
    /**
     * Log info message
     * Shows when LOG_LEVEL >= info
     */
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }
    /**
     * Log error message
     * Always shown (unless LOG_LEVEL explicitly set to never, which is not recommended)
     */
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
    /**
     * Log warning message
     * Shows when LOG_LEVEL >= warn
     */
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }
    /**
     * Log debug message
     * Shows ONLY when LOG_LEVEL = debug (most verbose)
     */
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
}
// Export singleton instance
export default new Logger();
