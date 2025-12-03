# Version 1.1.5
**Released:** 2025-11-30  
**Type:** Patch (Bug Fixes)
---
## Fixed
### Mobile Tab Bar - Profile Button Highlight State
- Added `source=profile` query parameter to profile icon link
- Profile icon highlights only when `location.pathname === '/settings' && tab === 'profile' && source === 'profile'`
- Settings icon excludes `source=profile` from highlighting logic
- Ensures highlighting follows the navigation path, not just the current tab
**Files Modified:**
- `src/components/Sidebar.jsx`
---
### Log Viewer - Mobile Layout Responsiveness
- Added `flex-wrap` to log level buttons container (prevents overflow)
- Added `overflow-x-auto` to logs display container (horizontal scroll when needed)
- Changed log entries to use `flex-wrap` for proper line breaking
- Changed `break-all` to `break-words` for better readability
- Added `min-w-0` and `flex-1` for proper text truncation within flex containers
**Result:**
- Log level buttons now wrap properly on narrow screens
- Log text wraps properly instead of rendering vertically
- Horizontal scroll available for long lines
- Maintains monospace font for readability
- Fully responsive across all mobile viewport sizes (390px-640px+)
**Files Modified:**
- `src/components/settings/advanced/DebugSettings.jsx`
---
### Debug Page - Auto-Scroll Behavior
- Added `isInitialMount` ref to track first render
- Skip scroll on initial mount (page loads at top)
- Keep auto-scroll for new log entries (existing feature preserved)
**Result:**
- Page now loads at top with user-controlled initial scroll position
- Auto-scroll still works when new logs arrive
- Better UX - no more unexpected page jumps
**Files Modified:**
- `src/components/settings/advanced/DebugSettings.jsx`
---
### Health Check Duplication + Tab Reorganization
- Merged Diagnostics tab into System tab
- Reorganized System tab into two sections:
  - **Information**: System details, Node.js info, platform, uptime, resource usage (memory, RSS)
  - **Diagnostics**: System health checks, database test, network speed test, API health checks
- Removed duplicate Diagnostics tab from navigation
- Deleted DiagnosticsSettings.jsx file
**New Structure:**
```
Advanced Settings
├── Debug
├── System (Information + Diagnostics)  ← MERGED!
├── Experimental
└── Developer
```
**Result:**
- Cleaner UI with better organization
- No redundant health checks
- Reduced UI clutter
**Files Modified:**
- `src/components/settings/advanced/SystemSettings.jsx` (reorganized into 2 sections)
- `src/components/settings/AdvancedSettings.jsx` (removed Diagnostics tab)
**Files Deleted:**
- `src/components/settings/advanced/DiagnosticsSettings.jsx`
---
### Profile Picture Persistence Issue
- Moved profile picture storage from `server/public/profile-pictures` to `/config/upload/profile-pictures`
- Updated static file serving to serve from persistent volume
- Added legacy location fallback for existing profile pictures
- Consolidated all uploads under `/config/upload/` for better organization:
  - Profile pictures: `/config/upload/profile-pictures`
  - Custom icons: `/config/upload/custom-icons` (migrated from `/config/custom-icons`)
  - Temp uploads: `/config/upload/temp`
- Added automatic custom icons migration in docker-entrypoint.sh
**Result:**
- Profile pictures now persist across container restarts
- Better upload organization
- Automatic migration for existing data
**Files Modified:**
- `server/middleware/profileUpload.js`
- `server/routes/profile.js`
- `server/index.js`
- `server/db/customIcons.js`
- `server/middleware/iconUpload.js`
- `docker-entrypoint.sh`
---
## Deployment
**Commit:** 6d57089  
**Docker Images:**
- `pickels23/framerr:1.1.5`
- `pickels23/framerr:latest`
**Digest:** sha256:9de9917a69e8498db015440e0d2749891c3b97520c73fac5af371719a40ddc11  
**Released:** 2025-11-30 13:24 EST