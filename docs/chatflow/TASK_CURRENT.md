# Session State

**Last Updated:** 2025-12-13 04:03 EST  
**Branch:** `develop`

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

**Status:** ✅ Bug fixes completed, session ending

**This Session:**
- Fixed profile picture reactivity (sidebar updates immediately on upload/remove)
- Added cache-busting timestamps to prevent stale cached images
- Made upload button dynamic ("Upload Photo" vs "Change Photo")
- Fixed "unknown group admin" warning spam (permissions.js group lookup)
- Fixed scroll position bleeding between pages (separate scroll containers)
- Reverted animation-related changes (kept scroll fix only)
- Default application name changed to "Framerr"
- Dashboard greeting now updates reactively

**Pending Known Issues:**
- Widget animation on navigation (react-grid-layout re-measuring) - left as-is per user preference

---

## ✅ SESSION END

- **Session ended:** 2025-12-13 04:03 EST
- **Branch:** `develop`
- **Next action:** Deploy to production when ready, or continue with next bug fixes
- **Build status:** ✅ Passing

