Based on the constraints and the provided debug logs, I strongly recommend **removing the `Maps('/login')` call from `Sidebar.jsx**` as the primary fix.

This single line of code is the catalyst that starts the race condition. It forces the React app to mount the Login page—and consequently fire the new Plex SSO request—before the browser has finished handing off control to the Authentik logout URL.

Here is the breakdown of why this is the solution and how to implement it safely.

### The Mechanism of Failure

In v1.2.0, the failure chain is triggered by the Sidebar, not the backend:

1. **User clicks Logout:** `Sidebar.jsx` calls `handleLogout()`.
2. **Sidebar Navigates:** `handleLogout` calls `await logout()` and then **immediately** calls `Maps('/login')`.
3. **Login Page Mounts:** The router switches to `/login`, mounting the component.
4. **SSO Check Fires:** The new `useEffect` in `Login.jsx` immediately calls `/api/plex/sso/status`.
5. **Authentik Intercepts:** Because the session is in a "flux" state (cookie being cleared), Authentik sees this anonymous request to `/api/plex/sso/status` and updates its internal "Next URL" to this API endpoint.
6. **Redirect Poisoned:** The actual logout redirect (`window.location.href`) finally processes, but Authentik now thinks you want to go back to `/api/plex/sso/status` after logging out, causing the loop/CORS error.

In **v1.1.10**, step 4 didn't exist, so even if the navigation happened, no "poison" request was sent to Authentik.

---

### The Fix: Stop the Navigation

You must prevent the app from navigating *internally* when an *external* redirect is about to happen.

#### 1. Update `src/components/Sidebar.jsx`

Remove the manual navigation. Let the `logout` function determine where the user goes.

```javascript
// src/components/Sidebar.jsx

const handleLogout = async () => {
    // changing this to ONLY await logout. 
    // The logout function determines if we redirect (Proxy) or clear state (Local).
    await logout();
    
    // REMOVED: navigate('/login');
    // If it's a local logout, AuthContext will clear the user, 
    // and your main App router should automatically redirect to /login 
    // because !user is true.
};

```

#### 2. Update `src/context/AuthContext.jsx`

Ensure `setUser(null)` is **only** called if no redirect is occurring. This handles the "Local Auth" case so the user isn't stuck on the dashboard.

```javascript
// src/context/AuthContext.jsx

const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
        const response = await axios.post('/api/auth/logout');
        
        // PROXY PATH: Hard stop.
        if (response.data?.redirectUrl) {
            // Use replace to avoid keeping the broken state in history
            window.location.replace(response.data.redirectUrl);
            return; // CRITICAL: Stop execution here. Do not touch state.
        }
        
        // LOCAL PATH: Clear state.
        // This triggers the App to render <Navigate to="/login" /> naturally,
        // without the race condition forced by Sidebar.
        setUser(null); 
        
    } catch (err) {
        logger.error('Logout failed', err);
    } finally {
        // Only reset if we are NOT redirecting externally
        // (Optional: checking if window.location changed is hard, 
        // so you might just leave this true if redirecting)
        if (!response?.data?.redirectUrl) {
            setLoggingOut(false);
        }
    }
}, []);

```

#### 3. Safety Net: Guard `src/pages/Login.jsx`

As a final defense, ensure the new v1.2.0 code (Plex SSO check) checks the `isLoggingOut` flag. This ensures that even if the router somehow mounts this page during the transition, the network request is suppressed.

```javascript
// src/pages/Login.jsx

useEffect(() => {
    // Only fire if we are not in the middle of a logout sequence
    if (!isLoggingOut) { 
        checkPlexSSOStatus(); // The new v1.2.0 code
    }
}, [isLoggingOut]);

```

### Why this satisfies your constraints

* **Matches v1.1.10:** It restores the "quiet" network behavior during logout.
* **No User Config:** It works entirely within the Javascript bundle.
* **Fixes the Root Cause:** It removes the race condition source (`Maps`) rather than just patching the symptoms.

**Would you like me to prepare the complete file content for `AuthContext.jsx` or `Sidebar.jsx` to copy-paste?**

will that allow logout when plex sso and auth proxy is disabled?

Yes. If you simply remove Maps('/login'), local logout will still work, provided your application follows standard React routing patterns.

When setUser(null) runs in AuthContext.jsx, it updates the global user state. In any standard React app (including Framerr), the main Router is listening to this state. When user becomes null, the Router detects that the current session is invalid and automatically redirects the user to the /login page (or the root /).

However, to be 100% safe and ensure you don't accidentally break the local logout experience (in case Framerr's router doesn't auto-redirect), I recommend a slightly more robust implementation using a Boolean Return pattern.

This ensures explicit navigation happens for Local/SSO users, but is strictly blocked for Proxy users.

The Robust Solution (Covers All Cases)
Modify AuthContext to tell the Sidebar whether it should handle navigation.

1. Update src/context/AuthContext.jsx
Make logout return true for local logout and false for proxy redirect.

JavaScript
const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
        const response = await axios.post('/api/auth/logout');
        
        // CASE 1: Proxy / Authentik
        if (response.data?.redirectUrl) {
            window.location.replace(response.data.redirectUrl);
            return false; // Signal to Sidebar: "STOP! Browser is redirecting."
        }
        
        // CASE 2: Local / Plex SSO (No Proxy)
        setUser(null);
        return true; // Signal to Sidebar: "Local logout done. You may navigate."
        
    } catch (err) {
        logger.error('Logout failed', err);
        return false;
    } finally {
        // Only turn off the flag if we AREN'T redirecting externally
        if (!response?.data?.redirectUrl) {
            setLoggingOut(false);
        }
    }
}, []);
2. Update src/components/Sidebar.jsx
Check the return value before navigating.

JavaScript
const handleLogout = async () => {
    // Only navigate manually if logout() returns true (Local/Standard logout)
    const shouldNavigate = await logout();
    
    if (shouldNavigate) {
        navigate('/login');
    }
    // If shouldNavigate is false, we do nothing and let the 
    // window.location.replace take over.
};
Why this is the best approach
Proxy Users: logout returns false. Maps('/login') is never called. The race condition is eliminated. Authentik receives the correct logout flow.

Local/Plex SSO Users: logout returns true. Maps('/login') runs immediately, preserving the exact behavior intended in v1.2.0.

Safety: It removes the assumption that the Router will auto-redirect, ensuring no user is ever left "stuck" on the dashboard with a cleared session.