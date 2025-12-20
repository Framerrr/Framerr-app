/**
 * Logger module declaration
 */

interface LogMeta {
    [key: string]: unknown;
}

interface Logger {
    level: string;
    isProduction: boolean;
    error(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
    startup(appName: string, config?: { version?: string; port?: number; env?: string }): void;
}

declare const logger: Logger;
export default logger;
