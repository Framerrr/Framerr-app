# Current Task - OAuth Auto-Close Auth Tab Implementation

**Status:** 🔄 IN PROGRESS - OAuth flow working, tab restoration needs fix  
**Started:** 2025-12-08 19:30:00  
**Last Updated:** 2025-12-08 20:06:00  
**Tool Calls This Session:** ~90  
**Last Checkpoint:** #1

---

## Task Description

Implementing auto-close authentication tab functionality using OAuth callback and postMessage. This builds on the existing manual auth flow to provide seamless auto-close and tab restoration after authentication.

### Objectives:
1. ✅ Create OAuth provider in Authentik for callback
2. ✅ Create `/login-complete` callback page
3. ✅ Implement postMessage communication
4. ✅ Auto-close auth tab after login
5. ⚠️ **BLOCKED:** Restore correct iframe tab after auth (currently goes to dashboard)

---

## Work Completed This Session

### 1. OAuth Provider Setup ✅

**Authentik Configuration:**
- Created OAuth2/OpenID Provider: "Framerr Callback"
- **Client ID:** `RFved8RMgr1c4fERztGfzLLm2mu9zyy9DKXFn7Z7`
- **Client Type:** Public (correct for frontend apps)
- **Redirect URI:** `https://server-nebula.com/login-complete`
- **Scopes:** `openid profile email`

**Result:** ✅ OAuth provider configured and tested

---

### 2. Login Complete Callback Page ✅

**File:** `public/login-complete.html`

**Features:**
- Beautiful success animation with checkmark
- Parses `state` parameter to get tab slug
- Sends `postMessage` to Framerr with tab info
- Auto-closes tab after 500ms
- Fallback redirects to correct tab if no opener
- Manual close button if auto-close fails

**Result:** ✅ Callback page created and tested

---

### 3. OAuth Flow Implementation ✅

**File:** `src/pages/TabContainer.jsx`

**Changes:**
- Updated `handleOpenAuth` to use proper Authentik OAuth endpoint
- Added `state` parameter with tab slug (`{"tab":"radarr"}`)
- Full OAuth authorize URL with all required parameters
- postMessage listener to receive auth-complete events
- Tab restoration logic from state parameter

**OAuth URL Format:**
```
https://auth.server-nebula.com/application/o/authorize/
  ?client_id=RFved8RMgr1c4fERztGfzLLm2mu9zyy9DKXFn7Z7
  &redirect_uri=https://server-nebula.com/login-complete
  &response_type=code
  &scope=openid%20profile%20email
  &state={"tab":"radarr"}
```

**Result:** ✅ OAuth flow working, redirects to callback

---

## Current State

**What Works:**
- ✅ OAuth provider configured in Authentik
- ✅ Auth flow redirects to `/login-complete` with state parameter
- ✅ Callback page receives and parses state (`{"tab":"radarr"}`)
- ✅ postMessage communication implemented
- ✅ Tab auto-closes (via postMessage + polling backup)

**What Doesn't Work:**
- ❌ **Tab restoration is broken** - always goes to dashboard instead of correct tab
- ❌ Hash navigation (`window.location.hash = '#radarr'`) not working as expected
- ❌ The `handleAuthComplete` might be interfering with hash change

**Testing Evidence:**
- URL: `https://server-nebula.com/login-complete?code=...&state=%7B%22tab%22%3A%22radarr%22%7D`
- State decodes to: `{"tab":"radarr"}`
- Expected: Navigate to `/#radarr`
- Actual: Goes to `/#dashboard`

---

## Technical Issue: Tab Restoration

**The Problem:**
```javascript
// In TabContainer.jsx postMessage handler
if (tab) {
    window.location.hash = `#${tab}`;  // Sets hash
    setTimeout(() => {
        handleAuthComplete(tab);  // Reloads iframe
    }, 100);
}
```

**Why it's not working:**
1. `window.location.hash` is being set correctly
2. But `handleAuthComplete` might be causing issues
3. Or the hash change event isn't firing in time
4. Or there's a redirect happening that overwrites the hash

**Attempted Fixes (reverted):**
- Added setTimeout delay before handleAuthComplete
- Added debug logging (never merged)
- These were experimental and reverted

---

## Next Immediate Steps

**For Next Session:**

1. **Debug tab restoration issue**
   - Add console logging to see what's happening
   - Check if hash is actually being set
   - Verify handleAuthComplete isn't redirecting
   - Test if postMessage is being received

2. **Possible Solutions:**
   - Use `window.location.replace` instead of hash assignment
   - Store tab in sessionStorage and read on page load
   - Ensure handleAuthComplete doesn't interfere with hash
   - Check if there's a React routing issue

3. **Test Scenarios:**
   - Direct access to `/login-complete?state={"tab":"radarr"}`
   - Popup flow from Lock button
   - Different browsers (Chrome, Firefox, Safari)

---

## Files Modified This Session

**Created:**
1. `public/login-complete.html` - OAuth callback page
2. `auth_autoclose_test_guide.md` - Testing documentation (artifact)

**Modified:**
3. `src/pages/TabContainer.jsx` - OAuth flow, postMessage listener, state parameter

**Commits:**
- `feat(auth): implement auto-close auth tab with postMessage callback`
- `fix(auth): use proper Authentik OAuth endpoint for auto-close`
- `fix(auth): restore correct tab after OAuth login via state parameter`

**Build Status:** ✅ All builds passed  
**Docker Image:** `pickels23/framerr:develop`  
**Digest:** `sha256:2dfdd1b008c103e3134f6c8f3621f1d9dd91d9a14d32f5d5752c390e50f51e09`

---

## Blockers

**Primary Blocker:**
- Tab restoration after OAuth callback not working
- Hash navigation to correct tab (`/#radarr`) goes to dashboard instead
- Need to debug why `window.location.hash = '#radarr'` isn't restoring the tab

**No blocking dependencies** - just a logic/timing issue to debug

---

## Session End Marker

🔄 **SESSION END**
- Session ended: 2025-12-08 20:06:00
- Status: OAuth flow working, auto-close working, tab restoration broken
- Next: Debug why hash navigation isn't restoring correct tab after OAuth
- Ready for next session: Yes
- Clean state: Uncommitted experimental changes reverted
- Last working commit: `fix(auth): restore correct tab after OAuth login via state parameter`
