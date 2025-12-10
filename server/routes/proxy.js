const express = require('express');
const router = express.Router();
const axios = require('axios');
const xml2js = require('xml2js');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { httpsAgent } = require('../utils/httpsAgent');
const { translateHostUrl } = require('../utils/urlHelper');

// All proxy routes require authentication
router.use(requireAuth);

/**
 * Plex Proxy Routes
 */

// GET /api/plex/sessions - Get active Plex streaming sessions
router.get('/plex/sessions', async (req, res) => {
    const { url, token } = req.query;

    if (!url || !token) {
        return res.status(400).json({ error: 'URL and token required' });
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const response = await axios.get(`${translatedUrl}/status/sessions`, {
            headers: {
                'X-Plex-Token': token,
                'Accept': 'application/json'  // Request JSON instead of XML
            },
            httpsAgent,
            timeout: 10000
        });

        // Plex returns JSON array of sessions when Accept: application/json is set
        const sessions = Array.isArray(response.data) ? response.data :
            response.data.MediaContainer?.Metadata || [];

        // Log first session for debugging (if any exist)
        if (sessions.length > 0) {
            logger.debug('Raw Plex session sample:', {
                sessionKey: sessions[0].sessionKey,
                key: sessions[0].key,
                Session_id: sessions[0].Session?.id,
                Session_key: sessions[0].Session?.key,
                Player_state: sessions[0].Player?.state
            });
        }

        // Transform sessions to a comprehensive format with all metadata
        const formattedSessions = sessions.map(session => ({
            sessionKey: session.sessionKey || session.key,
            type: session.type,
            title: session.title,
            grandparentTitle: session.grandparentTitle,
            parentIndex: session.parentIndex,
            index: session.index,
            duration: parseInt(session.duration) || 0,
            viewOffset: parseInt(session.viewOffset) || 0,
            art: session.art,
            thumb: session.thumb,

            // Player information (for playback data modal)
            Player: session.Player ? {
                address: session.Player.address,
                device: session.Player.device,
                platform: session.Player.platform,
                product: session.Player.product,
                state: session.Player.state,
                title: session.Player.title
            } : null,

            // Session details (network info + session ID for terminate)
            Session: session.Session ? {
                id: session.Session.id,
                key: session.Session.key,
                location: session.Session.location, // lan/wan
                bandwidth: parseInt(session.Session.bandwidth) || 0
            } : null,

            // Transcode information
            TranscodeSession: session.TranscodeSession ? {
                videoDecision: session.TranscodeSession.videoDecision,
                audioDecision: session.TranscodeSession.audioDecision,
                throttled: session.TranscodeSession.throttled,
                complete: session.TranscodeSession.complete,
                progress: parseFloat(session.TranscodeSession.progress) || 0,
                videoCodec: session.TranscodeSession.videoCodec,
                audioCodec: session.TranscodeSession.audioCodec,
                container: session.TranscodeSession.container
            } : null,

            // Media metadata (for info modal and Plex links)
            Media: {
                ratingKey: session.ratingKey || session.key,
                guid: session.guid,
                rating: session.rating,
                year: session.year,
                studio: session.studio,
                contentRating: session.contentRating,
                summary: session.summary,
                tagline: session.tagline
            },

            // Role/Cast information (if available)
            Role: session.Role ? session.Role.map(role => ({
                tag: role.tag, // Actor name
                role: role.role, // Character name
                thumb: role.thumb // Actor photo
            })) : [],

            // Genre tags
            Genre: session.Genre ? session.Genre.map(g => g.tag) : [],

            // Director/Writer
            Director: session.Director ? session.Director.map(d => d.tag) : [],
            Writer: session.Writer ? session.Writer.map(w => w.tag) : [],

            user: {
                title: session.User?.title || 'Unknown'
            }
        }));

        // Filter out stopped sessions (they're stale)
        const activeSessions = formattedSessions.filter(session =>
            session.Player && session.Player.state !== 'stopped'
        );

        res.json({ sessions: activeSessions });
    } catch (error) {
        logger.error('Plex sessions proxy error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url
        });
        res.status(500).json({
            error: 'Failed to fetch Plex sessions',
            details: error.message || error.code || 'Unknown error'
        });
    }
});

// GET /api/plex/image - Proxy Plex images (posters, backdrops)
router.get('/plex/image', async (req, res) => {
    const { path, url, token } = req.query;

    if (!path || !url || !token) {
        return res.status(400).json({ error: 'Path, URL, and token required' });
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const imageUrl = `${translatedUrl}${path}?X-Plex-Token=${token}`;
        const response = await axios.get(imageUrl, {
            responseType: 'stream',
            httpsAgent,
            timeout: 10000
        });

        // Proxy image stream directly to client
        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        response.data.pipe(res);
    } catch (error) {
        logger.error('Plex image proxy error:', error.message);
        res.status(500).json({ error: 'Failed to fetch image' });
    }
});

// POST /api/plex/terminate - Terminate a Plex playback session
router.post('/plex/terminate', async (req, res) => {
    const { url, token, sessionKey } = req.body;

    if (!url || !token || !sessionKey) {
        return res.status(400).json({ error: 'URL, token, and sessionKey required' });
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);

        const terminateUrl = `${translatedUrl}/status/sessions/terminate`;
        const params = {
            sessionId: sessionKey,
            'X-Plex-Token': token
        };

        // Log the exact request being made
        logger.info('Plex terminate request:', {
            url: terminateUrl,
            params,
            sessionKey
        });

        // Terminate the session by sending a GET request to Plex
        await axios.get(terminateUrl, {
            params,
            headers: { 'X-Plex-Token': token },
            httpsAgent,
            timeout: 5000
        });

        res.json({ success: true, message: 'Session terminated successfully' });
    } catch (error) {
        logger.error('Plex terminate session error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        });
        res.status(500).json({
            error: 'Failed to terminate session',
            details: error.message
        });
    }
});

// GET /api/plex/proxy - Generic Plex API proxy (for machine ID, etc.)
router.get('/plex/proxy', async (req, res) => {
    const { path, url, token } = req.query;

    if (!path || !url || !token) {
        return res.status(400).json({ error: 'Path, URL, and token required' });
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const response = await axios.get(`${translatedUrl}${path}`, {
            headers: { 'X-Plex-Token': token },
            httpsAgent,
            timeout: 5000
        });

        // Return raw response (XML or JSON)
        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);
    } catch (error) {
        logger.error('Plex proxy error:', {
            message: error.message,
            status: error.response?.status,
            path
        });
        res.status(500).json({
            error: 'Failed to proxy Plex request',
            details: error.message
        });
    }
});

/**
 * Sonarr Proxy Routes
 */

// GET /api/sonarr/calendar - Get upcoming TV episodes with series enrichment
router.get('/sonarr/calendar', async (req, res) => {
    const { start, end, url, apiKey } = req.query;

    if (!url || !apiKey || !start || !end) {
        return res.status(400).json({ error: 'URL, API key, start, and end dates required' });
    }

    try {
        const baseUrl = url.replace(/\/$/, '');

        // Fetch calendar data
        const response = await axios.get(`${baseUrl}/api/v3/calendar`, {
            params: { start, end },
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 10000
        });

        // Enrich calendar data with series information
        const enrichedData = await Promise.all(
            response.data.map(async (episode) => {
                try {
                    // Fetch series details for each episode
                    const seriesRes = await axios.get(`${baseUrl}/api/v3/series/${episode.seriesId}`, {
                        headers: { 'X-Api-Key': apiKey },
                        httpsAgent,
                        timeout: 5000
                    });

                    return {
                        ...episode,
                        series: {
                            title: seriesRes.data.title,
                            id: seriesRes.data.id
                        }
                    };
                } catch (err) {
                    logger.error(`Error fetching series ${episode.seriesId}:`, err.message);
                    // Gracefully degrade - return episode with unknown series
                    return {
                        ...episode,
                        series: { title: 'Unknown Series', id: episode.seriesId }
                    };
                }
            })
        );

        res.json(enrichedData);
    } catch (error) {
        logger.error('Sonarr calendar proxy error:', error.message);
        res.status(500).json({ error: 'Failed to fetch Sonarr calendar', details: error.message });
    }
});

/**
 * Radarr Proxy Routes
 */

// GET /api/radarr/calendar - Get upcoming movie releases
router.get('/radarr/calendar', async (req, res) => {
    const { start, end, url, apiKey } = req.query;

    if (!url || !apiKey || !start || !end) {
        return res.status(400).json({ error: 'URL, API key, start, and end dates required' });
    }

    try {
        const baseUrl = url.replace(/\/$/, '');

        const response = await axios.get(`${baseUrl}/api/v3/calendar`, {
            params: { start, end },
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 10000
        });

        res.json(response.data);
    } catch (error) {
        logger.error('Radarr calendar proxy error:', error.message);
        res.status(500).json({ error: 'Failed to fetch Radarr calendar', details: error.message });
    }
});

/**
 * Overseerr Proxy Routes
 */

// GET /api/overseerr/requests - Get media requests with enriched details
router.get('/overseerr/requests', async (req, res) => {
    const { url, apiKey } = req.query;

    if (!url || !apiKey) {
        return res.status(400).json({ error: 'URL and API key required' });
    }

    try {
        const baseUrl = url.replace(/\/$/, '');

        // Fetch request list
        const response = await axios.get(`${baseUrl}/api/v1/request`, {
            params: {
                take: 20,
                skip: 0,
                sort: 'added',
                filter: 'all'
            },
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 10000
        });

        // Enrich each request with full media details
        const enrichedResults = await Promise.all(
            response.data.results.map(async (request) => {
                try {
                    const mediaType = request.type; // 'movie' or 'tv'
                    const tmdbId = request.media?.tmdbId;

                    if (tmdbId) {
                        // Fetch full media details from Overseerr's TMDB cache
                        const mediaResponse = await axios.get(`${baseUrl}/api/v1/${mediaType}/${tmdbId}`, {
                            headers: { 'X-Api-Key': apiKey },
                            httpsAgent,
                            timeout: 5000
                        });
                        const mediaData = mediaResponse.data;

                        // Add enriched media data to the request
                        return {
                            ...request,
                            media: {
                                ...request.media,
                                title: mediaData.title || mediaData.name,
                                posterPath: mediaData.posterPath,
                                overview: mediaData.overview,
                                releaseDate: mediaData.releaseDate || mediaData.firstAirDate
                            }
                        };
                    }

                    return request;
                } catch (err) {
                    logger.error(`Error fetching media for request ${request.id}:`, err.message);
                    // Gracefully degrade - return request without enrichment
                    return request;
                }
            })
        );

        res.json({
            ...response.data,
            results: enrichedResults
        });
    } catch (error) {
        logger.error('Overseerr requests proxy error:', error.message);
        res.status(500).json({ error: 'Failed to fetch Overseerr requests', details: error.message });
    }
});

/**
 * qBittorrent Proxy Routes
 */

// POST /api/qbittorrent/torrents - Get torrent list
router.post('/qbittorrent/torrents', async (req, res) => {
    const { url, username, password } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        // Step 1: Login to qBittorrent
        const formData = new URLSearchParams();
        if (username) formData.append('username', username);
        if (password) formData.append('password', password);

        const loginResponse = await axios.post(
            `${url}/api/v2/auth/login`,
            formData,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 5000
            }
        );

        // Step 2: Extract session cookie
        const cookie = loginResponse.headers['set-cookie']?.[0];

        if (!cookie && (username || password)) {
            return res.status(401).json({ error: 'qBittorrent authentication failed' });
        }

        // Step 3: Get torrent list with session cookie (or without if no auth)
        const torrentsResponse = await axios.get(`${url}/api/v2/torrents/info`, {
            headers: cookie ? { Cookie: cookie } : {},
            timeout: 5000
        });

        res.json(torrentsResponse.data);
    } catch (error) {
        logger.error('qBittorrent torrents proxy error:', error.message);

        // Check if it's an auth error
        if (error.response?.status === 401 || error.response?.status === 403) {
            return res.status(401).json({ error: 'qBittorrent authentication failed' });
        }

        res.status(500).json({ error: 'Failed to fetch qBittorrent torrents', details: error.message });
    }
});

// POST /api/qbittorrent/transfer-info - Get global transfer statistics
router.post('/qbittorrent/transfer-info', async (req, res) => {
    const { url, username, password } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        // Step 1: Login to qBittorrent
        const formData = new URLSearchParams();
        if (username) formData.append('username', username);
        if (password) formData.append('password', password);

        const loginResponse = await axios.post(
            `${url}/api/v2/auth/login`,
            formData,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 5000
            }
        );

        // Step 2: Extract session cookie
        const cookie = loginResponse.headers['set-cookie']?.[0];

        if (!cookie && (username || password)) {
            return res.status(401).json({ error: 'qBittorrent authentication failed' });
        }

        // Step 3: Get sync/maindata with session cookie (this includes server_state with alltime stats)
        const syncResponse = await axios.get(`${url}/api/v2/sync/maindata`, {
            headers: cookie ? { Cookie: cookie } : {},
            timeout: 5000
        });

        // Extract server_state which contains all transfer info including alltime_dl and alltime_ul
        const serverState = syncResponse.data?.server_state || {};

        // Debug: Log the response to verify we're getting alltime stats
        logger.debug('qBittorrent server_state:', {
            alltime_dl: serverState.alltime_dl,
            alltime_ul: serverState.alltime_ul,
            dl_info_data: serverState.dl_info_data,
            up_info_data: serverState.up_info_data
        });

        res.json(serverState);
    } catch (error) {
        logger.error('qBittorrent transfer info proxy error:', error.message);

        // Check if it's an auth error
        if (error.response?.status === 401 || error.response?.status === 403) {
            return res.status(401).json({ error: 'qBittorrent authentication failed' });
        }

        res.status(500).json({ error: 'Failed to fetch qBittorrent transfer info', details: error.message });
    }
});

/**
 * System Status Proxy Routes
 */

// GET /api/systemstatus/status - Get current system status
router.get('/systemstatus/status', async (req, res) => {
    const { url, token } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(`${translatedUrl}/status`, {
            headers,
            httpsAgent,
            timeout: 5000
        });

        res.json(response.data);
    } catch (error) {
        logger.error('System status proxy error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url
        });
        res.status(500).json({
            error: 'Failed to fetch system status',
            details: error.message || error.code || 'Unknown error'
        });
    }
});

// GET /api/systemstatus/history - Get system status history for graphs
router.get('/systemstatus/history', async (req, res) => {
    const { url, token } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get(`${translatedUrl}/history`, {
            headers,
            httpsAgent,
            timeout: 10000
        });

        res.json(response.data);
    } catch (error) {
        logger.error('System status history proxy error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url
        });
        res.status(500).json({
            error: 'Failed to fetch system status history',
            details: error.message || error.code || 'Unknown error'
        });
    }
});

/**
 * Glances Monitoring System Proxy Routes
 */

// GET /api/systemstatus/glances/status - Get current system status from Glances
router.get('/systemstatus/glances/status', async (req, res) => {
    const { url, password } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const headers = {};

        // Glances uses basic auth with password
        if (password) {
            const auth = Buffer.from(`glances:${password}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }

        // Fetch multiple Glances endpoints in parallel
        const [cpuRes, memRes, sensorsRes, uptimeRes] = await Promise.all([
            axios.get(`${translatedUrl}/api/3/cpu`, { headers, httpsAgent, timeout: 5000 }),
            axios.get(`${translatedUrl}/api/3/mem`, { headers, httpsAgent, timeout: 5000 }),
            axios.get(`${translatedUrl}/api/3/sensors`, { headers, httpsAgent, timeout: 5000 }).catch(() => ({ data: [] })),
            axios.get(`${translatedUrl}/api/3/uptime`, { headers, httpsAgent, timeout: 5000 })
        ]);

        // Extract CPU percentage (overall usage)
        const cpuPercent = cpuRes.data?.total || 0;

        // Extract memory percentage
        const memPercent = memRes.data?.percent || 0;

        // Extract CPU temperature from sensors (prioritize CPU temp, fall back to first available)
        let temperature = 0;
        if (Array.isArray(sensorsRes.data) && sensorsRes.data.length > 0) {
            // Look for CPU temperature sensors first
            const cpuSensor = sensorsRes.data.find(s =>
                s.label?.toLowerCase().includes('cpu') ||
                s.label?.toLowerCase().includes('core')
            );

            if (cpuSensor && cpuSensor.value) {
                temperature = cpuSensor.value;
            } else {
                // Fallback to first temperature sensor
                const firstTempSensor = sensorsRes.data.find(s => s.value && s.unit === 'C');
                if (firstTempSensor) {
                    temperature = firstTempSensor.value;
                }
            }
        }

        // Format uptime (Glances returns uptime string or object)
        let uptime = '--';
        if (typeof uptimeRes.data === 'string') {
            uptime = uptimeRes.data;
        } else if (uptimeRes.data?.uptime) {
            uptime = uptimeRes.data.uptime;
        }

        // Return normalized format matching System Status widget expectations
        res.json({
            cpu: cpuPercent,
            memory: memPercent,
            temperature: temperature,
            uptime: uptime
        });

    } catch (error) {
        logger.error('Glances status proxy error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url
        });

        // Return helpful error message
        if (error.response?.status === 401) {
            return res.status(401).json({
                error: 'Glances authentication failed',
                details: 'Password required or incorrect'
            });
        }

        res.status(500).json({
            error: 'Failed to fetch Glances status',
            details: error.message || error.code || 'Unknown error'
        });
    }
});

// GET /api/systemstatus/glances/history - Get historical data from Glances
router.get('/systemstatus/glances/history', async (req, res) => {
    const { url, password } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        // Translate local IPs to host.local for Docker compatibility
        const translatedUrl = translateHostUrl(url);
        const headers = {};

        // Glances uses basic auth with password
        if (password) {
            const auth = Buffer.from(`glances:${password}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }

        // Glances doesn't have a built-in historical endpoint like /history
        // Instead, we need to use the stats history endpoints for each metric
        // Note: This requires Glances to be running with --export flag or using local cache

        // Fetch current stats as a fallback (Glances v3 API doesn't expose full history via REST easily)
        // For proper historical data, Glances needs to export to InfluxDB/Prometheus
        // We'll return current data point in array format for now

        const [cpuRes, memRes, sensorsRes] = await Promise.all([
            axios.get(`${translatedUrl}/api/3/cpu`, { headers, httpsAgent, timeout: 5000 }),
            axios.get(`${translatedUrl}/api/3/mem`, { headers, httpsAgent, timeout: 5000 }),
            axios.get(`${translatedUrl}/api/3/sensors`, { headers, httpsAgent, timeout: 5000 }).catch(() => ({ data: [] }))
        ]);

        // Extract values
        const cpuPercent = cpuRes.data?.total || 0;
        const memPercent = memRes.data?.percent || 0;

        let temperature = 0;
        if (Array.isArray(sensorsRes.data) && sensorsRes.data.length > 0) {
            const cpuSensor = sensorsRes.data.find(s =>
                s.label?.toLowerCase().includes('cpu') ||
                s.label?.toLowerCase().includes('core')
            );
            if (cpuSensor?.value) {
                temperature = cpuSensor.value;
            } else {
                const firstTempSensor = sensorsRes.data.find(s => s.value && s.unit === 'C');
                if (firstTempSensor) {
                    temperature = firstTempSensor.value;
                }
            }
        }

        // Return current data point in historical format
        // Note: For real historical data, Glances needs external time-series DB integration
        const now = new Date().toISOString();
        res.json([
            {
                time: now,
                cpu: cpuPercent,
                memory: memPercent,
                temperature: temperature
            }
        ]);

    } catch (error) {
        logger.error('Glances history proxy error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url
        });

        if (error.response?.status === 401) {
            return res.status(401).json({
                error: 'Glances authentication failed',
                details: 'Password required or incorrect'
            });
        }

        res.status(500).json({
            error: 'Failed to fetch Glances history',
            details: error.message || error.code || 'Unknown error'
        });
    }
});

module.exports = router;
