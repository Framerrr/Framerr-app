# Organizr Auth Proxy Deep Dive Analysis

**Date:** 2025-12-19  
**Purpose:** Research how Organizr handles auth proxy integration to understand why their logout works with Authentik but Framerr's doesn't

---

## Executive Summary

After deep analysis of Organizr's authentication architecture, the key difference is **architectural**: Organizr is a **server-side PHP application** while Framerr is a **React SPA**. This creates fundamentally different behaviors during authentication state transitions.

**Key Finding:** The issue isn't that Organizr does something special for auth proxies—it's that **server-side rendering naturally avoids SPA race conditions**. Organizr's PHP endpoints return HTTP responses before the browser has a chance to make competing requests.

---

## Organizr Architecture Overview

### Tech Stack
- **Backend:** PHP 7.2+ with Slim Framework
- **Auth:** JWT tokens stored in cookies (`organizr_token_<uuid>`)
- **Database:** SQLite
- **Frontend:** Traditional PHP templates + jQuery (NOT SPA)

### Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Organizr Auth Flow                    │
├─────────────────────────────────────────────────────────┤
│ 1. User logs in → PHP generates JWT → Sets cookie       │
│ 2. Each request → JWT validated server-side             │
│ 3. User logs out → Cookie cleared → 302 redirect        │
│                                                          │
│ Key: Server returns RESPONSE before browser continues   │
└─────────────────────────────────────────────────────────┘
```

---

## Key Code Analysis

### 1. Auth Endpoint (`/api/v2/auth/{group}`)

**File:** `api/v2/routes/root.php`

```php
$app->any('/auth[/[{group}[/{type}[/{ips}]]]]', function ($request, $response, $args) {
    $Organizr = ($request->getAttribute('Organizr')) ?? new Organizr();
    $_GET['group'] = $args['group'] ?? 0;
    $_GET['type'] = $args['type'] ?? 'deny';
    $_GET['ips'] = $args['ips'] ?? '192.0.0.0';
    $Organizr->auth();
    $response->getBody()->write(jsonE($GLOBALS['api']));
    return $response
        ->withHeader('Content-Type', 'application/json;charset=UTF-8')
        ->withStatus($GLOBALS['responseCode']);
});
```

This endpoint is used by nginx `auth_request`. It:
- Validates the JWT cookie server-side
- Returns `200` (authorized) or `401` (unauthorized)
- Can return `302` for redirect
- **Crucially: The response completes BEFORE any further browser activity**

### 2. Logout Endpoint (`/api/v2/logout`)

**File:** `api/v2/routes/logout.php`

```php
$app->get('/logout', function ($request, $response, $args) {
    $Organizr = ($request->getAttribute('Organizr')) ?? new Organizr();
    $Organizr->logout();
    $response->getBody()->write(jsonE($GLOBALS['api']));
    return $response
        ->withHeader('Content-Type', 'application/json;charset=UTF-8')
        ->withStatus($GLOBALS['responseCode']);
});
```

The `logout()` method in organizr.class.php:
1. Clears the JWT cookie
2. Clears any SSO cookies (Plex, Ombi, etc.)
3. Returns a JSON response or redirect URL

### 3. Session Management (JWT in Cookies)

**File:** `api/functions/token-functions.php`

- Uses `lcobucci/jwt` library
- HMAC-SHA256 signing with `organizrHash` secret
- Tokens include: username, groupID, userID, email, image, expiry
- Cookie name: `organizr_token_<uuid>`

---

## Why Organizr Works with Auth Proxies

### Server-Side Rendering Advantage

```
┌──────────────────────────────────────────────────────────┐
│                ORGANIZR (PHP - Works)                     │
├──────────────────────────────────────────────────────────┤
│ 1. User clicks Logout                                     │
│ 2. Browser navigates to /api/v2/logout                    │
│ 3. PHP processes request, clears session                  │
│ 4. PHP returns 302 redirect (or JSON)                     │
│ 5. Browser follows redirect                               │
│                                                           │
│ ✅ NO RACE CONDITION: Steps 3-4 complete before step 5    │
│ ✅ No SPA = No concurrent React component mounting        │
│ ✅ Full page navigation = clean state transition          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│           FRAMERR v1.2.0 (React SPA - Broken)            │
├──────────────────────────────────────────────────────────┤
│ 1. User clicks Logout                                     │
│ 2. React calls logout() async                             │
│ 3. API call made to /api/auth/logout                      │
│ 4. CONCURRENT: React navigates to /login (v1.2.0)         │
│ 5. CONCURRENT: Login.jsx mounts and calls API             │
│ 6. Authentik intercepts API call from step 5              │
│ 7. Authentik stores /api/plex/sso/status as redirect      │
│ 8. Original logout completes (too late)                   │
│                                                           │
│ ❌ RACE CONDITION: Steps 4-6 happen while 3 is pending    │
│ ❌ Authentik captures wrong redirect target               │
└──────────────────────────────────────────────────────────┘
```

### Organizr Has a "Logout URL" Setting

Found in Organizr's settings: ability to configure a custom "Logout URL" for auth proxy deployments. When set, clicking logout redirects to this URL instead of the local logout endpoint.

**This is exactly what our `redirectUrl` in the logout response does.**

---

## Comparison with Framerr Implementation

### What Framerr Already Has Right

✅ **AuthContext.jsx** (lines 30-52):
```javascript
const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
        const response = await axios.post('/api/auth/logout');
        
        // PROXY AUTH: redirect and return false (caller must NOT navigate)
        if (response.data?.redirectUrl) {
            window.location.replace(response.data.redirectUrl);
            return false; // Signal: "STOP! Browser is redirecting externally."
        }
        
        // LOCAL AUTH: clear state and return true (caller can navigate)
        setUser(null);
        setLoggingOut(false);
        return true; // Signal: "Local logout done. You may navigate."
    } catch (err) {
        logger.error('Logout failed', err);
        setLoggingOut(false);
        return false;
    }
}, []);
```

✅ **Sidebar.jsx** (lines 114-121):
```javascript
const handleLogout = async () => {
    // logout() returns true for local auth, false for proxy redirect
    const shouldNavigate = await logout();
    if (shouldNavigate) {
        navigate('/login');
    }
    // If false, browser is redirecting to proxy logout - do NOT navigate
};
```

✅ **Login.jsx** - Plex SSO check is already commented out:
```javascript
//             const response = await axios.get('/api/plex/sso/status');
```

### What Might Still Be Wrong

1. **Timing Issue**: Even with the boolean return, there's still a small window where:
   - `logout()` is called
   - API request is in flight
   - Other components (not Sidebar) might fire requests

2. **axios Interceptors**: Do we block ALL requests when `isLoggingOut` is true?

3. **Other API Calls**: Are there any other places that make API calls during the logout transition?

---

## Recommendations

### Option A: Nuclear Option (Match Organizr More Closely)

Make logout a **full page navigation** instead of an async call:

```javascript
const handleLogout = () => {
    // Skip the API dance entirely for proxy auth
    // Just redirect to the server logout which does a 302
    window.location.href = '/api/auth/logout';
};
```

The server then handles everything:
1. Clear session
2. If proxy auth configured, return `302` to Authentik logout
3. If local auth, return `302` to `/login`

**Pros:** Matches Organizr behavior exactly, no race conditions possible
**Cons:** Less SPA-like, loses control over logout flow

### Option B: Strengthen Existing Pattern

Keep the current async approach but add more guards:

1. **Use AbortController** to cancel all in-flight requests on logout:
```javascript
window.abortController?.abort(); // Cancel everything
window.abortController = null;
setLoggingOut(true);
await axios.post('/api/auth/logout');
```

2. **Block axios requests** during logout (check if this is working):
```javascript
// In axiosSetup.js request interceptor
if (isLoggingOut) {
    return Promise.reject(new axios.Cancel('Logout in progress'));
}
```

3. **Never mount components** during logout transition

### Option C: Hybrid (Recommended)

For proxy auth specifically, don't call the logout API at all:

```javascript
const handleLogout = async () => {
    // Check if we have a proxy auth redirect configured
    // (could be from a pre-fetched config or a known env variable)
    if (window.__PROXY_AUTH_LOGOUT_URL__) {
        window.location.replace(window.__PROXY_AUTH_LOGOUT_URL__);
        return; // Hard stop - browser navigating away
    }
    
    // Local auth - use existing flow
    const shouldNavigate = await logout();
    if (shouldNavigate) {
        navigate('/login');
    }
};
```

---

## What Organizr Does That We Don't

| Feature | Organizr | Framerr |
|---------|----------|---------|
| Session storage | Server-side + JWT cookie | Server-side + httpOnly cookie |
| Logout mechanism | Full page navigation / API | Async API call |
| Auth proxy handling | Server decides redirect | Server sends redirectUrl |
| Race condition risk | None (synchronous HTTP) | High (async SPA) |
| SSO cookie cleanup | Server handles all | Not fully implemented |

---

## Next Steps

1. **Verify axiosSetup.js** - Confirm request blocking during logout is working
2. **Test the `return false` path** - Verify Sidebar correctly stops navigation
3. **Consider full-page logout** - May be the cleanest fix for proxy auth
4. **Check for other API callers** - Are there other components making requests during logout?

---

## Files Analyzed

**Organizr Repository:** https://github.com/causefx/Organizr

| File | Purpose |
|------|---------|
| `api/v2/routes/root.php` | Auth endpoint for nginx auth_request |
| `api/v2/routes/logout.php` | Logout route handler |
| `api/v2/routes/login.php` | Login route handler |
| `api/functions/auth-functions.php` | LDAP, Plex, Emby auth backends |
| `api/functions/sso-functions.php` | SSO cookie management |
| `api/functions/token-functions.php` | JWT generation/validation |
| `api/classes/organizr.class.php` | Main class (263KB) |

**Framerr Files:**
| File | Current Status |
|------|----------------|
| `src/context/AuthContext.jsx` | Has boolean return pattern ✅ |
| `src/components/Sidebar.jsx` | Conditionally navigates ✅ |
| `src/pages/Login.jsx` | Plex SSO check commented out ✅ |
| `src/utils/axiosSetup.js` | Need to verify blocking works |
