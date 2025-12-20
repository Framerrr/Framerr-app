/**
 * Permissions module declaration
 */

import type { User } from '../../shared/types/user';

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null | undefined): boolean;

/**
 * Check if user has permission
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean;

/**
 * Get user permissions
 */
export function getUserPermissions(user: User | null | undefined): string[];
