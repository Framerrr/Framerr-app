/**
 * Log Buffer for Advanced Settings
 * 
 * Stores recent log entries in memory for display in Debug UI
 */

class LogBuffer {
    constructor(maxSize = 500) {
        this.logs = [];
        this.maxSize = maxSize;
    }

    add(level, message, meta = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            ...meta
        };

        this.logs.push(entry);

        // Keep only last maxSize logs
        if (this.logs.length > this.maxSize) {
            this.logs.shift();
        }
    }

    get() {
        return [...this.logs];
    }

    clear() {
        this.logs = [];
    }

    toText() {
        return this.logs
            .map(log => `${log.timestamp} [${log.level}] ${log.message}`)
            .join('\n');
    }
}

// Export singleton
module.exports = new LogBuffer();
