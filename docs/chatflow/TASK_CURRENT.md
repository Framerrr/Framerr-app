# Session State

**Last Updated:** 2025-12-19 09:35 EST  
**Branch:** `develop`

---

## Version Tracking

| Field | Value |
|-------|-------|
| **Last Released Version** | `1.2.0` |
| **Release Status** | RELEASED |
| **Draft Changelog** | `docs/versions/v1.2.1-draft.md` |
| **Draft Status** | DRAFT - In Development |

---

## Current State

**Status:** 🔴 Auth Proxy Logout Bug - WIP

**This Session:**
- Deep debugging of auth proxy logout issue
- Identified root cause: Framerr's API calls during logout transition are captured by Authentik as redirect targets
- This breaks the redirect chain and causes CORS errors
- Organizr handles this correctly with the same Authentik setup
- Multiple code changes made (may need to revert):
  - `AuthContext.jsx` - Boolean return from logout()
  - `Sidebar.jsx` - Conditional navigation
  - `axiosSetup.js` - Request blocking during logout
  - `Login.jsx` - Disabled Plex SSO check on mount

**Second opinions gathered:**
- `docs/secondopinion/chatgpt-authproxy-bug.md`
- `docs/secondopinion/gemini-authproxy-bug.md`

---

## Next Step

**Deep dive into Organizr's auth proxy implementation:**
1. Study Organizr's security and auth routes
2. Understand how Organizr handles proxy logout
3. Identify what Organizr does differently
4. Apply learnings to Framerr

---

**=== SESSION END 2025-12-19 09:35 EST ===**
