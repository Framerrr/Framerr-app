/**
 * Generic iframe authentication detection utility
 * Detects when an iframe needs authentication without hardcoded URLs
 */

/**
 * Common authentication URL patterns
 */
const DEFAULT_AUTH_PATTERNS = [
    '/auth',
    '/login',
    '/signin',
    '/sign-in',
    '/oauth',
    '/saml',
    '/sso',
    '/authentication',
    '/authorize',
    '/session',
    '/identity',
];

/**
 * Check if a URL matches common authentication patterns
 * @param {string} url - URL to check
 * @returns {boolean} - True if URL likely requires authentication
 */
export const matchesAuthPattern = (url) => {
    if (!url) return false;

    const lowerUrl = url.toLowerCase();
    return DEFAULT_AUTH_PATTERNS.some(pattern => lowerUrl.includes(pattern));
};

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string|null} - Domain or null if invalid
 */
export const extractDomain = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return null;
    }
};

/**
 * Check if iframe URL differs from expected URL domain
 * @param {string} currentUrl - Current iframe URL
 * @param {string} expectedUrl - Expected tab URL
 * @returns {boolean} - True if domains don't match
 */
export const hasDomainMismatch = (currentUrl, expectedUrl) => {
    const currentDomain = extractDomain(currentUrl);
    const expectedDomain = extractDomain(expectedUrl);

    if (!currentDomain || !expectedDomain) return false;

    return currentDomain !== expectedDomain;
};

/**
 * Check if URL matches user-configured auth patterns
 * @param {string} url - URL to check
 * @param {Array<string>} userPatterns - User-defined auth patterns
 * @returns {boolean} - True if matches user pattern
 */
export const matchesUserPattern = (url, userPatterns = []) => {
    if (!url || !userPatterns.length) return false;

    const lowerUrl = url.toLowerCase();
    return userPatterns.some(pattern =>
        lowerUrl.includes(pattern.toLowerCase())
    );
};

/**
 * Calculate confidence score that iframe needs authentication
 * @param {string} iframeUrl - Current iframe URL
 * @param {string} expectedUrl - Expected tab URL
 * @param {Array<string>} userPatterns - User-defined auth patterns
 * @param {string} sensitivity - Detection sensitivity ('conservative', 'balanced', 'aggressive')
 * @returns {Object} - { needsAuth: boolean, confidence: number, reasons: Array<string> }
 */
export const detectAuthNeed = (iframeUrl, expectedUrl, userPatterns = [], sensitivity = 'balanced') => {
    let confidence = 0;
    const reasons = [];

    // Signal 1: User-configured auth URL (highest confidence)
    if (matchesUserPattern(iframeUrl, userPatterns)) {
        confidence += 5;
        reasons.push('Matches user-configured auth URL');
    }

    // Signal 2: Common auth URL pattern
    if (matchesAuthPattern(iframeUrl)) {
        confidence += 3;
        reasons.push('Matches common auth URL pattern');
    }

    // Signal 3: Domain mismatch (iframe redirected to different domain)
    if (hasDomainMismatch(iframeUrl, expectedUrl)) {
        confidence += 2;
        reasons.push('Domain mismatch detected');
    }

    // Signal 4: HTTPS downgrade (suspicious)
    if (expectedUrl?.startsWith('https:') && iframeUrl?.startsWith('http:')) {
        confidence += 1;
        reasons.push('HTTPS downgrade detected');
    }

    // Determine threshold based on sensitivity
    const thresholds = {
        conservative: 5, // Only user-configured or very high confidence
        balanced: 3,     // Pattern match or multiple signals
        aggressive: 2,   // Any significant signal
    };

    const threshold = thresholds[sensitivity] || thresholds.balanced;
    const needsAuth = confidence >= threshold;

    return {
        needsAuth,
        confidence,
        reasons,
        threshold,
    };
};

/**
 * Get detection sensitivity from config
 * @param {Object} config - System configuration
 * @returns {string} - Sensitivity level
 */
export const getSensitivity = (config) => {
    return config?.iframeAuth?.sensitivity || 'balanced';
};

/**
 * Get user-configured auth patterns from config
 * @param {Object} config - System configuration
 * @returns {Array<string>} - User auth patterns
 */
export const getUserAuthPatterns = (config) => {
    return config?.iframeAuth?.customPatterns || [];
};

/**
 * Check if iframe auth detection is enabled
 * @param {Object} config - System configuration
 * @returns {boolean} - True if enabled
 */
export const isAuthDetectionEnabled = (config) => {
    return config?.iframeAuth?.enabled !== false; // Enabled by default
};
