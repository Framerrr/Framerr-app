# Current Task - Hash Routing Implementation (INCOMPLETE)

**Status:** Blocked - Routing still incorrect  
**Started:** 2025-12-02 17:42:00  
**Ended:** 2025-12-02 18:07:00  
**Tool Calls:** ~115

---

## Task Description

Restore original hash-based routing system with iframe persistence. User confirmed production was using hash routing with format `#page` (no slash after hash).

---

## Target Requirements

User's production system uses:
- `/login` - Login page (no hash)
- `/#dashboard` - Dashboard
- `/#settings` - Settings page
- `/#settings?tab=profile` - Settings with specific tab
- `/#radarr` - Individual tabs (NOT `/#/tab/radarr`)

---

## Work Completed

### 1. Initial Hash Routing Setup ✅
- Added `HashRouter` with `basename=""` to `main.jsx`
- Removed `BrowserRouter`
- **Commit:** `f1692f6`

### 2. Settings URL Query Parameters ✅
- Updated `UserSettings.jsx` to use `useSearchParams`
- Tab navigation now updates URL with `?tab=` parameter
- Supports `#settings?tab=profile` format
- **Included in commit:** `f1692f6`

### 3. Iframe Persistence System ✅
- Created `IframeManager.jsx` component
- Replaced `TabView.jsx` with `IframeManager`
- Iframes stay mounted until page refresh
- Uses `Set` to track loaded tabs
- **Included in commit:** `f1692f6`

### 4. Removed Placeholder Services ✅
- Removed mock services (Plex, Sonarr, Radarr) from `AppDataContext.jsx`
- Sidebar now empty by default
- **Included in commit:** `f1692f6`

### 5. Route Structure Fixes (ATTEMPTED) ❌
- Removed leading slashes from authenticated routes
- Changed `/tab/:slug` to `:slug`
- Updated all Sidebar NavLinks
- Updated ProtectedRoute redirects
- **Commit:** `5eb8e81`

---

## Problem (BLOCKER)

**User reports URLs are still wrong:**
- Getting: `/#/login`, `/#/settings`, `/#/tab/test`
- Need: `/login`, `/#dashboard`, `/#settings`, `/#test`

**Root Cause Analysis:**
The issue is that React Router's `HashRouter` with `basename=""` does NOT remove the slash - it just removes the basename prefix. The routes themselves still have leading slashes which HashRouter preserves as `/#/route`.

**Attempted Fix:**
- Removed leading slashes from route paths: `path="dashboard"` instead of `path="/dashboard"`
- This SHOULD produce `/#dashboard` but apparently still produces `/#/dashboard`

**Why It's Not Working:**
The fundamental approach might be wrong. Need to investigate if:
1. HashRouter always adds `/` after hash (might need custom implementation)
2. Route paths need different structure
3. Need to remove HashRouter entirely and use custom hash navigation
4. Some other React Router configuration is needed

---

## Files Modified

1. **src/main.jsx** - Added HashRouter with basename=""
2. **src/App.jsx** - Updated routes, removed leading slashes, replaced TabView with IframeManager
3. **src/pages/UserSettings.jsx** - Added useSearchParams for tab navigation
4. **src/components/IframeManager.jsx** - NEW: Iframe persistence component
5. **src/components/Sidebar.jsx** - Updated all NavLink paths
6. **src/components/common/ProtectedRoute.jsx** - Fixed redirect paths
7. **src/context/AppDataContext.jsx** - Removed mock services
8. **src/hooks/useHashNavigation.js** - DELETED (not needed with HashRouter)

---

## Git Commits

1. `f1692f6` - feat(routing): restore hash routing with iframe persistence
2. `5eb8e81` - fix(routing): correct hash URL format to #page instead of #/page

**Total Commits:** 2  
**Branch:** develop  
**Docker Image:** pickels23/framerr:debug (pushed twice)

---

## Docker Deployments

1. **First deploy:** After initial hash routing setup
2. **Second deploy:** After route path corrections
   - Image: `pickels23/framerr:debug`
   - Digest: `sha256:789d25365ce339f7e89baae6382290cff3303df611854ffec9100c0a8f9427ce`

---

## Testing Status

- [ ] Hash format correct (`#page` not `#/page`)
- [x] Settings URL params working (`?tab=`)
- [x] Iframe persistence working
- [ ] Tab URLs correct (`#radarr` not `#/tab/radarr`)
- [ ] Login without hash (`/login` not `/#/login`)

---

## Next Steps for New Agent

1. **Investigate root cause:**
   - Research if HashRouter can truly produce `#page` without `/`
   - Check if custom hash navigation is required
   - Look at user's old minified bundle for clues
   - Consider if they used a completely different approach

2. **Possible solutions to try:**
   - Custom hash navigation without React Router
   - Different HashRouter configuration
   - Mixed routing (BrowserRouter for some, custom hash for others)
   - Manual `window.location.hash` management

3. **Reference:**
   - User's production: `https://server-nebula.com/#settings`
   - User confirmed this worked before corruption
   - Minified bundle in `docs/uploaded-from-user/index-CtslTEnJ.js`

4. **Critical question to answer:**
   How did the original implementation achieve `#page` format? Was it:
   - React Router HashRouter with special config?
   - Custom hash routing implementation?
   - Something else entirely?

---

## Lessons Learned

1. **HashRouter with `basename=""` doesn't remove the slash** - It just removes the basename, routes still get `/` prefix
2. **Need to verify routing approach** - Don't assume HashRouter is the right solution
3. **User's production example is key** - They showed `#settings` works, need to match that exactly

---

## Session End Marker

✅ **SESSION END**
- Session ended: 2025-12-02 18:07:00
- Tool calls: ~115
- Status: BLOCKED - Hash routing URLs still incorrect despite two attempts
- Summary: Implemented hash routing foundation, iframe persistence, settings URL params, but URL format still wrong. Need to investigate alternative routing approaches.
- Next agent: Research how to achieve `#page` format (no slash) or consider custom hash navigation implementation

---

## New Session Work (Dec 2, 2025)

### Hybrid Routing Implementation ✅
- **Problem:** HashRouter enforced `/#/page` format and caused URL appending bugs.
- **Solution:** Implemented hybrid routing system.
  - `BrowserRouter` for top-level routes (`/login`, `/setup`)
  - Custom Hash Logic for protected app (`/#dashboard`, `/#settings`)
  - `HashNavLink` for sidebar navigation (native `href="#..."`)
- **Status:** Deployed to `pickels23/framerr:debug`
- **Verification:** Pending user test of URL format and navigation reliability.
