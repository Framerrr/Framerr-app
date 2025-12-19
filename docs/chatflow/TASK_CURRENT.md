# Session State

**Last Updated:** 2025-12-19 11:35 EST  
**Branch:** `develop`

---

## Version Tracking

| Field | Value |
|-------|-------|
| **Last Released Version** | `1.2.1` |
| **Release Status** | RELEASED |
| **Draft Changelog** | (none - next session will create v1.2.2-draft.md if needed) |
| **Draft Status** | N/A |

---

## Current State

**Status:** ✅ Auth Proxy Logout Bug - FIXED

**This Session:**
- Fixed auth proxy logout bug that caused CORS errors with Authentik
- Root cause: Service Worker was caching index.html and serving it after logout, bypassing nginx auth_request
- Solution: SW now skips cache for navigation requests (`mode === 'navigate'`)
- Additional: Browser-native logout via HTTP 302 redirect
- Re-enabled Plex SSO check on login page
- Released v1.2.1

---

## v1.2.1 Release Summary

**Changes:**
- Service Worker no longer caches navigation requests (fixes auth proxy)
- GET `/api/auth/logout` endpoint with HTTP 302 redirect
- Cleaned up debug logging

**Docker:**
- `pickels23/framerr:1.2.1`
- `pickels23/framerr:latest`

---

**=== SESSION END 2025-12-19 11:35 EST ===**
