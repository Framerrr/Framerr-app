import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getSystemConfig, updateSystemConfig } from '../db/systemConfig';
import { getUserById } from '../db/users';
import logger from '../utils/logger';
import axios from 'axios';
import { translateHostUrl } from '../utils/urlHelper';
import { httpsAgent } from '../utils/httpsAgent';

const router = Router();

interface AuthenticatedUser {
    id: string;
    username: string;
    group: string;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

interface IntegrationConfig {
    enabled?: boolean;
    url?: string;
    apiKey?: string;
    token?: string;
    username?: string;
    password?: string;
    sharing?: {
        enabled?: boolean;
        mode?: 'everyone' | 'groups' | 'users';
        groups?: string[];
        users?: string[];
        sharedBy?: string;
        sharedAt?: string;
    };
}

interface TestResult {
    success: boolean;
    message?: string;
    version?: string;
    error?: string;
}

/**
 * GET /api/integrations/shared
 * Get integrations shared with the current user
 */
router.get('/shared', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const config = await getSystemConfig();
        const integrations = config.integrations || {};
        const userId = authReq.user!.id;
        const userGroup = authReq.user!.group;

        const sharedIntegrations: unknown[] = [];

        for (const [serviceName, serviceConfig] of Object.entries(integrations)) {
            const config = serviceConfig as IntegrationConfig;
            if (!config.enabled) continue;

            const sharing = config.sharing;
            if (!sharing || !sharing.enabled) continue;

            let hasAccess = false;

            switch (sharing.mode) {
                case 'everyone':
                    hasAccess = true;
                    break;
                case 'groups':
                    hasAccess = sharing.groups?.includes(userGroup) ?? false;
                    break;
                case 'users':
                    hasAccess = sharing.users?.includes(userId) ?? false;
                    break;
            }

            if (hasAccess) {
                let sharedByName = 'Admin';
                if (sharing.sharedBy) {
                    try {
                        const sharedByUser = await getUserById(sharing.sharedBy);
                        if (sharedByUser) {
                            sharedByName = sharedByUser.displayName || sharedByUser.username;
                        }
                    } catch {
                        // Fallback to 'Admin'
                    }
                }

                const { sharing: _omit, ...configWithoutSharing } = config;
                sharedIntegrations.push({
                    name: serviceName,
                    ...configWithoutSharing,
                    enabled: true,
                    sharedBy: sharedByName,
                    sharedAt: sharing.sharedAt || null
                });
            }
        }

        res.json({ integrations: sharedIntegrations });
    } catch (error) {
        logger.error('Error fetching shared integrations', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch shared integrations' });
    }
});

/**
 * GET /api/integrations
 * Get all integration configurations (ADMIN ONLY)
 */
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const config = await getSystemConfig();
        res.json({ integrations: config.integrations || {} });
    } catch (error) {
        logger.error('Error fetching integrations', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

/**
 * PUT /api/integrations
 * Update integration configurations (ADMIN ONLY)
 */
router.put('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { integrations } = req.body;

        if (!integrations) {
            res.status(400).json({ error: 'Integrations data required' });
            return;
        }

        const updatedConfig = await updateSystemConfig({ integrations });

        logger.info('Integrations updated by admin', {
            userId: authReq.user?.id,
            username: authReq.user?.username
        });

        res.json({ success: true, integrations: updatedConfig.integrations });
    } catch (error) {
        logger.error('Error updating integrations', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to update integrations' });
    }
});

/**
 * POST /api/integrations/test
 * Test integration connection (ADMIN ONLY)
 */
router.post('/test', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { service, config } = req.body;

        if (!service || !config) {
            res.status(400).json({ error: 'Service and config required' });
            return;
        }

        let result: TestResult;

        switch (service) {
            case 'plex':
                result = await testPlex(config);
                break;
            case 'sonarr':
                result = await testSonarr(config);
                break;
            case 'radarr':
                result = await testRadarr(config);
                break;
            case 'qbittorrent':
                result = await testQBittorrent(config);
                break;
            case 'overseerr':
                result = await testOverseerr(config);
                break;
            case 'systemstatus':
                result = await testSystemStatus(config);
                break;
            default:
                res.status(400).json({ error: 'Unknown service type' });
                return;
        }

        res.json(result);
    } catch (error) {
        logger.error('Error testing integration', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: (error as Error).message || 'Test failed'
        });
    }
});

async function testPlex(config: { url?: string; token?: string }): Promise<TestResult> {
    const { url, token } = config;
    if (!url || !token) {
        return { success: false, error: 'URL and token required' };
    }

    try {
        const translatedUrl = translateHostUrl(url);
        const response = await axios.get(`${translatedUrl}/status/sessions`, {
            headers: { 'X-Plex-Token': token },
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: response.headers['x-plex-version'] || 'Unknown'
        };
    } catch (error) {
        const axiosError = error as { response?: { statusText?: string }; message?: string; code?: string };
        logger.error('Plex health check error', { error: axiosError.message });
        return {
            success: false,
            error: axiosError.response?.statusText || axiosError.message || axiosError.code || 'Connection failed'
        };
    }
}

async function testSonarr(config: { url?: string; apiKey?: string }): Promise<TestResult> {
    const { url, apiKey } = config;
    if (!url || !apiKey) {
        return { success: false, error: 'URL and API key required' };
    }

    try {
        const response = await axios.get(`${url}/api/v3/system/status`, {
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: response.data.version || 'Unknown'
        };
    } catch (error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        return {
            success: false,
            error: axiosError.response?.data?.message || axiosError.message || 'Connection failed'
        };
    }
}

async function testRadarr(config: { url?: string; apiKey?: string }): Promise<TestResult> {
    const { url, apiKey } = config;
    if (!url || !apiKey) {
        return { success: false, error: 'URL and API key required' };
    }

    try {
        const response = await axios.get(`${url}/api/v3/system/status`, {
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: response.data.version || 'Unknown'
        };
    } catch (error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        return {
            success: false,
            error: axiosError.response?.data?.message || axiosError.message || 'Connection failed'
        };
    }
}

async function testQBittorrent(config: { url?: string; username?: string; password?: string }): Promise<TestResult> {
    const { url, username, password } = config;
    if (!url) {
        return { success: false, error: 'URL required' };
    }

    try {
        const formData = new URLSearchParams();
        if (username) formData.append('username', username);
        if (password) formData.append('password', password);

        const response = await axios.post(
            `${url}/api/v2/auth/login`,
            formData,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                httpsAgent,
                timeout: 5000
            }
        );

        if (response.data === 'Ok.' || response.status === 200) {
            try {
                const cookie = response.headers['set-cookie']?.[0];
                const versionResponse = await axios.get(`${url}/api/v2/app/version`, {
                    headers: cookie ? { Cookie: cookie } : {},
                    httpsAgent,
                    timeout: 5000
                });

                return {
                    success: true,
                    message: 'Connection successful',
                    version: versionResponse.data || 'Unknown'
                };
            } catch {
                return { success: true, message: 'Connection successful', version: 'Unknown' };
            }
        }

        return { success: false, error: 'Authentication failed' };
    } catch (error) {
        const axiosError = error as { response?: { data?: string }; message?: string };
        return {
            success: false,
            error: axiosError.response?.data || axiosError.message || 'Connection failed'
        };
    }
}

async function testOverseerr(config: { url?: string; apiKey?: string }): Promise<TestResult> {
    const { url, apiKey } = config;
    if (!url || !apiKey) {
        return { success: false, error: 'URL and API key required' };
    }

    try {
        const response = await axios.get(`${url}/api/v1/settings/public`, {
            headers: { 'X-Api-Key': apiKey },
            httpsAgent,
            timeout: 5000
        });

        return {
            success: true,
            message: 'Connection successful',
            version: response.data.version || 'Unknown'
        };
    } catch (error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        return {
            success: false,
            error: axiosError.response?.data?.message || axiosError.message || 'Connection failed'
        };
    }
}

async function testSystemStatus(config: { url?: string; token?: string }): Promise<TestResult> {
    const { url, token } = config;
    if (!url) {
        return { success: false, error: 'URL required' };
    }

    try {
        const translatedUrl = translateHostUrl(url);
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        await axios.get(`${translatedUrl}/status`, {
            headers,
            httpsAgent,
            timeout: 5000
        });

        return { success: true, message: 'Connection successful', version: 'Unknown' };
    } catch (error) {
        const axiosError = error as { response?: { statusText?: string }; message?: string; code?: string };
        logger.error('System status health check error', { error: axiosError.message });
        return {
            success: false,
            error: axiosError.response?.statusText || axiosError.message || axiosError.code || 'Connection failed'
        };
    }
}

export default router;

