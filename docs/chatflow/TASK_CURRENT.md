# Session State

**Last Updated:** 2025-12-16 22:42 EST  
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

**Status:** ✅ iOS Scroll/Zoom Fixed — Ready for remaining backlog items

**This Session Summary:**

### iOS Mobile Scroll/Zoom Fix ✅

**Problem:** iOS Safari had scroll issues (content not reaching edges) and zoom wasn't properly prevented.

**Root Cause:** `h-screen` uses `100vh` which on iOS equals the MAXIMUM viewport (toolbar hidden), not the current visible area.

**Solution Applied:**
1. **`100dvh`** instead of `h-screen` in `App.jsx` — dynamic viewport height that adapts to visible area
2. **Viewport meta** with `maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
3. **Safe-area-inset padding** for notch/home indicator
4. **`min-h-0 h-full`** on main for Safari flexbox fix
5. **`overscroll-behavior: none`** to prevent iOS bounce

**All tests pass:**
- ✅ Zoom prevented
- ✅ Scroll bleeding between pages fixed
- ✅ Scroll reaches full top/bottom
- ✅ Build passes

---

## Remaining TODO for v1.1.11

1. ~~Solve zoom/scroll trade-off~~ ✅ DONE
2. Settings bottom gap consistency
3. Settings tab auto-scroll
4. Revert to selective routing (SSE vs Web Push)

---

**--- SESSION END ---**
