/**
 * Linked Accounts Routes
 * API endpoints for user linked account management
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getLinkedAccountsForUser } from '../db/linkedAccounts';
import logger from '../utils/logger';

const router = Router();

interface AuthenticatedUser {
    id: string;
    username: string;
    group: string;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

interface LinkedAccountInfo {
    linked: boolean;
    externalId: string;
    externalUsername: string | null;
    externalEmail: string | null;
    linkedAt: number;
    metadata: Record<string, unknown>;
}

/**
 * GET /api/linked-accounts/me
 * Get current user's linked accounts (from database - SSO links, etc.)
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user!.id;

        // Get all linked accounts from database (includes Plex SSO links)
        const dbLinkedAccounts = getLinkedAccountsForUser(userId);

        // Convert to object keyed by service for easier frontend use
        const accountsByService: Record<string, LinkedAccountInfo> = {};
        for (const account of dbLinkedAccounts) {
            accountsByService[account.service] = {
                linked: true,
                externalId: account.externalId,
                externalUsername: account.externalUsername,
                externalEmail: account.externalEmail,
                linkedAt: account.linkedAt,
                metadata: account.metadata || {}
            };
        }

        logger.debug('[LinkedAccounts] Fetched accounts for user', {
            userId,
            services: Object.keys(accountsByService)
        });

        res.json({
            accounts: accountsByService
        });
    } catch (error) {
        logger.error('[LinkedAccounts] Failed to fetch accounts', { error: (error as Error).message });
        res.status(500).json({ error: 'Failed to fetch linked accounts' });
    }
});

export default router;

