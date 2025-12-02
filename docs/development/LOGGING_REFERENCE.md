# Logging Reference

**Complete inventory of all logging in Framerr application**

This document provides a line-by-line reference for all logging instances across frontend and backend code. Use this as a checklist for implementing logging changes.

---

## Architecture Overview

### Frontend Logger (`src/utils/logger.js`)
- **Production:** Only `error` and `warn` output to browser console
- **Development:** All levels output (`debug`, `info`, `warn`, `error`)

### Backend Logger (`server/utils/logger.js`)
- **All Environments:** Respect `LOG_LEVEL` setting (controllable via UI)
- **Output:** Docker logs / Unraid logs

---

## Frontend Logging Instances

### Core Logger Implementation

**File:** `src/utils/logger.js`

| Line | Action | Current Code | New Code | Notes |
|------|--------|--------------|----------|-------|
| 82-86 | MODIFY | `info(message, ...args) { if (this.shouldLog('info')) { console.log(...) } }` | Add production check: `if (this.shouldLog('info') && !this.isProduction())` | Filter info in production |
| 112-116 | MODIFY | `debug(message, ...args) { if (this.shouldLog('debug')) { console.log(...) } }` | Add production check: `if (this.shouldLog('debug') && !this.isProduction())` | Filter debug in production |
| - | ADD | N/A | `isProduction() { return import.meta.env.PROD; }` | Add new method after line 116 |

### Dashboard Component

**File:** `src/pages/Dashboard.jsx`

| Line | Action | Current | New | Notes |
|------|--------|---------|-----|-------|
| 386 | CHANGE LEVEL | `logger.info('Widgets saved successfully');` | `logger.debug('Widgets saved successfully');` | Routine operation, not user-facing |
| 133 | ✅ KEEP | `logger.warn('Widget not found in response:', widgetId);` | - | Correct level |
| 139 | ✅ KEEP | `logger.warn('Updated widget missing layouts, keeping existing');` | - | Correct level |
| 159 | ✅ KEEP | `logger.debug('Widget refreshed:', widgetId);` | - | Correct level |
| 161 | ✅ KEEP | `logger.error('Failed to refresh widget:', error);` | - | Correct level |
| 196 | ✅ KEEP | `logger.debug('Visibility recompaction triggered', { breakpoint: currentBreakpoint });` | - | Correct level |
| 202 | ✅ KEEP | `logger.debug('Recompacting layouts', { breakpoint, cols, visibility: widgetVisibility });` | - | Correct level |
| 218 | ✅ KEEP | `logger.debug(\`Widget recompaction: ${widget.type}\`, { hidden: isHidden, originalY: layout.y, newY: currentY, height });` | - | Correct level |
| 225 | ✅ KEEP | `logger.debug('Layouts compacted', { breakpoint, order: compactedLayouts.map(l => widgets.find(w => w.id === l.i)?.type), count: compactedLayouts.length });` | - | Correct level |
| 249 | ✅ KEEP | `logger.error('Failed to load user preferences:', error);` | - | Correct level |
| 262 | ✅ KEEP | `logger.debug('Failed to load debug overlay setting:', error);` | - | Correct level |
| 271 | ✅ KEEP | `logger.error('Failed to fetch integrations:', error);` | - | Correct level |
| 307 | ✅ KEEP | `logger.error('Failed to load widgets:', error);` | - | Correct level |
| 388 | ✅ KEEP | `logger.error('Failed to save widgets:', error);` | - | Correct level |
| 498 | ✅ KEEP | `logger.error('Failed to add widget:', error);` | - | Correct level |

### LinkGrid Widget

**File:** `src/components/widgets/LinkGridWidget_v2.jsx`

| Line | Action | Current | New | Notes |
|------|--------|---------|-----|-------|
| 285 | CHANGE LEVEL | `logger.info(\`Executing ${method} action:\`, url);` | `logger.debug(\`Executing ${method} action:\`, url);` | Routine HTTP action |
| 298 | CHANGE LEVEL | `logger.info(\`Action successful:\`, response.status);` | `logger.debug(\`Action successful:\`, response.status);` | Routine success |
| 350 | ✅ KEEP | `logger.debug(\`Link ${editingLinkId ? 'updated' : 'added'}\`);` | - | Already debug |
| 276 | ✅ KEEP | `logger.error('No action configured for link', link);` | - | Correct level |
| 306 | ✅ KEEP | `logger.error(\`Action failed:\`, error);` | - | Correct level |
| 374 | ✅ KEEP | `logger.error('Failed to save link:', error);` | - | Correct level |
| 375 | ✅ KEEP | `logger.error('Error details:', error.response?.data);` | - | Correct level |
| 424 | ✅ KEEP | `logger.error('Failed to delete link:', error);` | - | Correct level |
| 519 | ✅ KEEP | `logger.error('Failed to reorder links:', error);` | - | Correct level |

### Other Frontend Files (All Correct)

**File:** `src/pages/TabContainer.jsx`
- Line 26: ✅ `logger.debug('Hash changed to:', hash);` - Correct
- Line 69: ✅ `logger.error('Error fetching tabs:', err);` - Correct
- Line 77: ✅ `logger.debug('Iframe loaded:', slug);` - Correct
- Line 82: ✅ `logger.info('Reloading tab:', slug);` - Correct (user action)

**File:** `src/pages/TabView.jsx`
- Line 51: ✅ `logger.error('Error fetching tab:', err);` - Correct

**File:** `src/context/ThemeContext.jsx`
- Line 50: ✅ `logger.error('Failed to load theme:', error);` - Correct
- Line 71: ✅ `logger.error('Failed to save theme:', error);` - Correct

**File:** `src/context/AuthContext.jsx`
- Line 44: ✅ `logger.error('Setup status check failed:', err);` - Correct
- Line 60: ✅ `logger.error('Initial check failed:', err);` - Correct
- Line 102: ✅ `logger.error('Logout failed', err);` - Correct

**File:** `src/components/widgets/PlexWidget.jsx`
- Line 64: ✅ `logger.error('Failed to fetch Plex machine ID', {...});` - Correct
- Line 111: ✅ `logger.debug('Plex session termination data', {...});` - Correct
- Line 137: ✅ `logger.error('Failed to stop Plex playback', {...});` - Correct
- Line 191: ✅ `logger.debug('Plex hideWhenEmpty updated', {...});` - Correct
- Line 198: ✅ `logger.error('Failed to update Plex hideWhenEmpty', {...});` - Correct
- Line 213: ✅ `logger.debug('Plex widget visibility state', {...});` - Correct

**All other widget files have correct logging levels** ✅

---

## Backend Logging Instances

### Widget Routes

**File:** `server/routes/widgets.js`

| Line | Action | Current | New | Notes |
|------|--------|---------|-----|-------|
| 98 | CHANGE LEVEL | `logger.info('Widgets reset', { userId: req.user.id });` | `logger.debug('Widgets reset', { userId: req.user.id });` | Rare admin action, not critical |
| 25 | ✅ KEEP | `logger.error('Failed to get widgets', { userId: req.user.id, error: error.message });` | - | Correct level |
| 61 | ✅ KEEP | `logger.debug('Widgets updated', { userId: req.user.id, widgetCount: widgets.length });` | - | Already debug |
| 72 | ✅ KEEP | `logger.error('Failed to update widgets', { userId: req.user.id, error: error.message });` | - | Correct level |
| 106 | ✅ KEEP | `logger.error('Failed to reset widgets', { userId: req.user.id, error: error.message });` | - | Correct level |

### Theme Routes

**File:** `server/routes/theme.js`

| Line | Action | Current | New | Notes |
|------|--------|---------|-----|-------|
| 79 | CHANGE LEVEL | `logger.info('Theme updated', { userId: req.user.id, mode: theme.mode });` | `logger.debug('Theme updated', { userId: req.user.id, mode: theme.mode });` | Frequent user preference |
| 115 | CHANGE LEVEL | `logger.info('Theme reset to defaults', { userId: req.user.id });` | `logger.debug('Theme reset to defaults', { userId: req.user.id });` | Routine operation |
| 29 | ✅ KEEP | `logger.error('Failed to get theme', { userId: req.user.id, error: error.message });` | - | Correct level |
| 91 | ✅ KEEP | `logger.error('Failed to update theme', { userId: req.user.id, error: error.message });` | - | Correct level |
| 123 | ✅ KEEP | `logger.error('Failed to reset theme', { userId: req.user.id, error: error.message });` | - | Correct level |

### Diagnostics Routes - **CRITICAL MISSING LOGS**

**File:** `server/routes/diagnostics.js`

| Line | Action | Current | New | Notes |
|------|--------|---------|-----|-------|
| 41-50 | ADD | No logging in catch block | Add: `logger.error('Database diagnostic failed', { error: error.message });` | After line 42, before res.json |
| 78-80 | ADD | No logging in catch block | Add: `logger.error('Download speed test failed', { error: error.message });` | After line 78, before res.status |
| 95-97 | ADD | No logging in catch block | Add: `logger.error('Upload speed test failed', { error: error.message });` | After line 95, before res.status |

**Exact implementation:**
```javascript
// Line 41-50 current:
} catch (error) {
    const latency = Date.now() - startTime;
    res.json({
        success: false,
        status: 'error',
        latency,
        error: error.message
    });
}

// Line 41-50 new:
} catch (error) {
    logger.error('Database diagnostic failed', { error: error.message });
    const latency = Date.now() - startTime;
    res.json({
        success: false,
        status: 'error',
        latency,
        error: error.message
    });
}
```

### Auth Routes (All Correct)

**File:** `server/routes/auth.js`
- Line 32: ✅ `logger.warn('Login failed: User not found', { username });` - Correct
- Line 38: ✅ `logger.warn('Login failed: Invalid password', { username });` - Correct
- Line 57: ✅ `logger.info('User logged in: ${username}');` - Correct (important event)
- Line 69: ✅ `logger.error('Login error', { error: error.message });` - Correct
- Line 99: ✅ `logger.error('Logout error', { error: error.message });` - Correct

### Backup Routes (All Correct)

**File:** `server/routes/backup.js`
- Line 51: ✅ `logger.info('User config exported', { userId, username });` - Correct (important operation)
- Line 57: ✅ `logger.error('Failed to export user config', { userId, error });` - Correct
- Line 99: ✅ `logger.info('User config imported', { userId, fields });` - Correct (important operation)
- Line 111: ✅ `logger.error('Failed to import user config', { userId, error });` - Correct
- Line 140: ✅ `logger.warn('Failed to load config for user ${user.username}', err);` - Correct
- Line 159: ✅ `logger.info('System backup exported', { admin, userCount });` - Correct (critical admin operation)
- Line 165: ✅ `logger.error('Failed to export system backup', { userId, error });` - Correct
- Line 195: ✅ `logger.warn('System restore initiated', { admin, userCount });` - Correct (dangerous operation)
- Line 212: ✅ `logger.error('Failed to restore system backup', { userId, error });` - Correct

### Proxy Routes (Already Fixed)

**File:** `server/routes/proxy.js`
- Line 43: ✅ `logger.debug('Raw Plex session sample:', {...});` - Already changed to debug
- All error logs correct ✅

### System Routes (All Correct)

**File:** `server/routes/system.js`
- Line 19: ✅ `logger.error('Failed to get system config', { error: error.message });` - Correct
- Line 42: ✅ `logger.info('System config updated', { keys: Object.keys(updates) });` - Correct (important)
- Line 52: ✅ `logger.error('Failed to update system config', { error: error.message });` - Correct

### User Config DB (Already Fixed)

**File:** `server/db/userConfig.js`
- Line 135: ✅ `logger.debug('Configuration updated for user ${user.username}');` - Already changed to debug
- Line 138: ✅ `logger.error('Failed to update config for user ${userId}', { error: error.message });` - Correct

---

## Summary of Changes

### Total Changes Required: **9 modifications**

**Frontend (4 changes):**
1. `src/utils/logger.js` Line 82-86: Add production check to `info()`
2. `src/utils/logger.js` Line 112-116: Add production check to `debug()`
3. `src/utils/logger.js` After 116: Add `isProduction()` method
4. `src/pages/Dashboard.jsx` Line 386: Change `info` → `debug`
5. `src/components/widgets/LinkGridWidget_v2.jsx` Line 285: Change `info` → `debug`
6. `src/components/widgets/LinkGridWidget_v2.jsx` Line 298: Change `info` → `debug`

**Backend (6 changes):**
1. `server/routes/widgets.js` Line 98: Change `info` → `debug`
2. `server/routes/theme.js` Line 79: Change `info` → `debug`
3. `server/routes/theme.js` Line 115: Change `info` → `debug`
4. `server/routes/diagnostics.js` Line 42: Add error log
5. `server/routes/diagnostics.js` Line 78: Add error log
6. `server/routes/diagnostics.js` Line 95: Add error log

### Files with Correct Logging (No Changes Needed): **100+ instances** ✅
- All context files
- All widget files (except LinkGrid as noted)
- Auth routes
- Backup routes
- System routes
- Tab routes
- Setup routes
- Proxy routes (already fixed)

---

## Verification Checklist

After implementing changes:

- [ ] Frontend production build has clean console (only errors/warns)
- [ ] Frontend development build shows all levels
- [ ] Backend logs respect LOG_LEVEL setting
- [ ] UI log level control works correctly
- [ ] All error cases are logged
- [ ] No routine operations at `info` level
- [ ] Critical operations (login, backup, system config) still at `info`
