/**
 * Axios setup module declaration
 */

/**
 * Set the logout function for auto-logout on 401
 */
export function setLogoutFunction(logoutFn: (() => void) | null): void;

/**
 * Set notification functions for axios error handling
 */
export function setNotificationFunctions(fns: { error: (title: string, message: string) => void } | null): void;
