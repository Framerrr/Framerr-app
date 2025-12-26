Given your constraints, I’d treat this as **“the login route must be zero-network”** and **logout must never SPA-navigate anywhere**.

Your own debug notes basically point to the smoking gun: Authentik ends up with `"redirect":"https://server-nebula.com/api/plex/sso/status"` in its state , and the broken path is specifically “logout → back to Framerr `/login` → CORS errors”, with `/api/plex/sso/status` in the errors  . That only becomes possible because **v1.2.0’s login mount triggers that call** .

### Recommendation (code-only, no Authentik changes)

## 1) Remove `navigate('/login')` from Sidebar logout (and don’t “await → navigate” at all)

Even if `logout()` sets `window.location.href` and returns, the *caller* still continues (because the promise resolves), so `navigate('/login')` can still run in the tiny window before the browser fully commits navigation—mounting `/login` and firing `/api/plex/sso/status`.

Change this:

```js
const handleLogout = async () => {
  await logout();
  navigate('/login');
};
```

To this (simplest):

```js
const handleLogout = () => {
  logout();         // triggers full-page redirect if proxy auth
  // no navigate()
};
```

You already documented that Sidebar does `await logout(); navigate('/login');`  — removing that SPA navigation is the most direct way to prevent `/login` from mounting during the logout redirect window.

## 2) Make `/login` do **zero API calls on mount** (move Plex SSO status check out of mount)

This is the core compatibility rule if you want v1.2.0 to behave like v1.1.10 behind *any* auth proxy: **assume every request can be intercepted**.

So: do **not** call `/api/plex/sso/status` in a `useEffect(() => …, [])` on the login screen. 

Two safe patterns:

### Pattern A (best): Lazy-check on user intent

* Show the “Plex SSO” button unconditionally (or “Continue with Plex”).
* Only when they click it, call `/api/plex/sso/status` (or skip status entirely and just start SSO).

If the proxy intercepts and redirects cross-origin, you handle that gracefully (show “SSO unavailable behind proxy” or “You’re not authenticated yet”).

### Pattern B: Only check after you’re already authenticated

If you have an “authenticated shell” route (post-login), move the status call there—*after* the proxy has already established the session and forwarded you.

Either way, the login page should not fire background requests that can become Authentik’s “last URL” / redirect target.

## 3) Cancel / suppress in-flight requests during logout

Even if you remove the login mount call, you can still get “late” requests from other components.

On logout start:

* Set `isLoggingOut = true` (you already do) 
* **Abort all in-flight axios requests** (Axios v1 supports `AbortController` via `signal`), so nothing completes with a 302/401 after you’ve initiated logout.

This pairs well with your existing interceptor guard .

---

### If I had to pick only one change to try first

**Remove `navigate('/login')` from `Sidebar.jsx`**. It’s the cleanest “make v1.2.0 behave like v1.1.10” change, and it directly prevents the `/login` mount that triggers the new `/api/plex/sso/status` call during logout.

### If you want the most robust fix set (still code-only)

Do **both**:

1. No SPA navigation on logout, and
2. Login route = **zero background network**.

If you paste your current `Login.jsx` snippet where the `/api/plex/sso/status` call happens, I’ll suggest an exact refactor (Pattern A vs B) in the smallest diff possible.
