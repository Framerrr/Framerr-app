# Session State

**Last Updated:** 2025-12-16 18:15 EST  
**Branch:** `feature/notification-integration`

---

## Version Tracking

| Field | Value |
|-------|-------|
| **Last Released Version** | `1.1.10` |
| **Release Status** | RELEASED |
| **Draft Changelog** | `docs/versions/v1.1.11-draft.md` |
| **Draft Status** | DRAFT |

> **IMPORTANT FOR AGENTS:** If "Draft Status" is "DRAFT", do NOT create a new draft. Continue updating the existing draft changelog.

---

## Current State

**Status:** 🔄 In Progress - Mobile Zoom/Scroll Investigation

**This Session Summary:**

### Dynamic Manifest & Favicon ✅
- Created `/api/config/manifest.json` endpoint for dynamic PWA name/icons
- Added `/favicon` route with fallback to default icons
- Updated `sw.js` to use `/favicon/` for notification icons
- Updated `index.html` to use dynamic manifest
- Deleted static `manifest.json`

### Mobile Zoom/Scroll Bug Investigation 🔬

**Problem identified:** iOS has two conflicting behaviors:
1. **Pinch-to-zoom** — needs to be disabled for app-like experience
2. **Double scroll** — content needs unintended extra scroll at top/bottom

**Key Test Findings:**

| CSS touch-action Setting | Zoom Prevented? | Double Scroll? |
|--------------------------|-----------------|----------------|
| `html, body, * { touch-action: pan-x pan-y !important }` | ✅ YES | ❌ BUG EXISTS |
| `html, body { touch-action: pan-x pan-y !important }` | ❌ NO | ✅ NO BUG |

**Root Cause:** Applying `touch-action: pan-x pan-y` to ALL elements (`*`) prevents zoom but causes the double-scroll bug. Applying only to `html, body` fixes double-scroll but allows zoom.

**Other Tests Performed (neither were the cause):**
- `overscroll-behavior: none` — NOT the cause
- `viewport-fit=cover` — NOT the cause

### Current State of Files

**index.html:** Has standard viewport (no `viewport-fit=cover`)
**index.css:** Has `touch-action: pan-x pan-y` on `html, body` only (no `*`)
**GridLayout.css:** No overscroll-behavior added
**UserSettings.jsx:** No test styles

### Build & Commits
- All changes committed to `feature/notification-integration`
- Build passes

---

## Next Step

**Solve zoom + scroll trade-off:** Need to find a CSS or JavaScript approach that:
1. Prevents pinch-zoom on iOS
2. Does NOT cause double-scroll bug
3. Options to investigate:
   - JavaScript `gesturechange` event prevention
   - More targeted touch-action selectors (e.g., on specific containers)
   - Alternative CSS approaches

---

## TODO (Future Sessions)

1. **Solve zoom/scroll trade-off** ← PRIORITY
2. Settings bottom gap consistency
3. Settings tab auto-scroll
4. Revert to selective routing (SSE vs Web Push)

---

**--- SESSION END ---**
