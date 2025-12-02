const ipaddr = require('ipaddr.js');
const ipRangeCheck = require('ip-range-check');
const logger = require('../utils/logger');

/**
 * Proxy Whitelist Middleware
 * 
 * Validates that proxy auth headers (from Authentik/Authelia) come from a trusted IP range.
 * Prevents header spoofing attacks.
 * 
 * Uses configurable header names from system config.
 */
function validateProxyWhitelist() {
    return (req, res, next) => {
        // Get proxy config early to check which headers to look for
        const systemConfig = req.app.get('systemConfig');
        const configuredHeader = (systemConfig?.auth?.proxy?.headerName || 'X-authentik-username').toLowerCase();
        const configuredEmailHeader = (systemConfig?.auth?.proxy?.emailHeaderName || 'X-authentik-email').toLowerCase();

        // Check if ANY proxy auth headers are present (configured header + common fallbacks)
        const hasProxyHeaders = req.headers[configuredHeader] ||
            req.headers['x-forwarded-user'] ||
            req.headers['remote-user'];

        if (!hasProxyHeaders) {
            return next();
        }

        // Skip if proxy auth is disabled or no whitelist configured
        if (!systemConfig?.auth?.proxy?.enabled || !systemConfig?.auth?.proxy?.whitelist) {
            logger.warn('[ProxyAuth] Proxy headers present but proxy auth not configured - removing headers');
            // Remove ALL possible proxy headers to prevent spoofing
            delete req.headers[configuredHeader];
            delete req.headers[configuredEmailHeader];
            delete req.headers['x-authentik-username'];
            delete req.headers['x-authentik-email'];
            delete req.headers['x-forwarded-user'];
            delete req.headers['x-forwarded-email'];
            delete req.headers['remote-user'];
            delete req.headers['remote-email'];
            return next();
        }

        // Get client IP (the direct connection IP - should be proxy auth server's IP)
        let clientIp = req.connection.remoteAddress || req.socket.remoteAddress;

        // Normalize IPv6-mapped IPv4 addresses
        if (ipaddr.isValid(clientIp)) {
            try {
                const addr = ipaddr.parse(clientIp);
                if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
                    clientIp = addr.toIPv4Address().toString();
                }
            } catch (e) {
                logger.error('[ProxyAuth] IP parsing error:', e);
            }
        }

        // Check if IP is in whitelist
        const whitelist = Array.isArray(systemConfig.auth.proxy.whitelist)
            ? systemConfig.auth.proxy.whitelist
            : [systemConfig.auth.proxy.whitelist];

        const isWhitelisted = whitelist.some(range => {
            try {
                return ipRangeCheck(clientIp, range);
            } catch (e) {
                logger.error(`[ProxyAuth] Invalid IP range: ${range}`, e);
                return false;
            }
        });

        if (!isWhitelisted) {
            logger.warn(`[ProxyAuth] Blocked spoofed headers from ${clientIp} (not in whitelist)`);
            // Remove ALL possible proxy headers to prevent spoofing
            delete req.headers[configuredHeader];
            delete req.headers[configuredEmailHeader];
            delete req.headers['x-authentik-username'];
            delete req.headers['x-authentik-email'];
            delete req.headers['x-forwarded-user'];
            delete req.headers['x-forwarded-email'];
            delete req.headers['remote-user'];
            delete req.headers['remote-email'];
        }

        next();
    };
}

module.exports = { validateProxyWhitelist };
