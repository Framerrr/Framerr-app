# Feature Request: Pull-to-Refresh for PWA

**Status:** 📋 Backlog (May or may not implement)
**Priority:** Low (Nice-to-have polish)
**Effort:** Medium (5-6 hours)

---

## Description

Implement Overseerr/Seerr-style pull-to-refresh gesture for the PWA. When user pulls down from top of page on mobile, a refresh icon appears and animates. On release past threshold, page reloads.

---

## Reference Implementation

**Source:** [Overseerr PullToRefresh](https://github.com/sct/overseerr/blob/develop/src/components/Layout/PullToRefresh/index.tsx)

### How Overseerr Does It:

1. Listens to `touchstart`, `touchmove`, `touchend` on `window`
2. Checks `window.scrollY === 0` to only activate at page top
3. Tracks pull distance (Y delta from touch start)
4. Shows refresh icon at `pullChange / 3` position
5. Thresholds: 20px (show), 120px (max position), 340px (trigger reload)
6. On release past threshold: shows spin animation, calls `router.reload()`

---

## Framerr Adaptation Required

**Cannot copy/paste directly - our scroll architecture is different:**

| Overseerr | Framerr |
|-----------|---------|
| `window.scrollY === 0` | `#main-scroll.scrollTop === 0` |
| `window.addEventListener(...)` | Attach to `#main-scroll` element |
| Global on page | Needs awareness of active scroll container |

### Why?

Framerr uses:
- `#root` with `overflow: hidden` (blocks window scroll)
- `#main-scroll` is the actual scroll container (in `MainContent.tsx`)
- Settings has its own scroll container
- Tab views use iframes (should NOT get pull-to-refresh)

### Additional Considerations:

1. Must disable during Dashboard edit mode (`DashboardEditContext`)
2. May conflict with hold-to-drag on mobile (disabled in edit mode anyway)
3. iOS PWAs do NOT have native pull-to-refresh (Safari browser windows do)
4. Need to test carefully - don't break the delicate scroll architecture

---

## Implementation Plan

### Files to Create:

- `src/components/common/PullToRefresh.tsx` - Main component

### Files to Modify:

- `src/App.tsx` - Add `<PullToRefresh />` to `MainLayout`
- `src/pages/MainContent.tsx` - Possibly pass scroll container ref

### Key Changes from Overseerr:

1. Replace `window.scrollY` → get ref to `#main-scroll` and check `.scrollTop`
2. Replace `router.reload()` → `window.location.reload()`
3. Replace Heroicons → Lucide (`RefreshCw` icon)
4. Adapt styling to Framerr theme system
5. Add edit mode check via `useDashboardEdit()`
6. Only activate on Dashboard and Settings views (not tab iframes)

---

## Decision

**Deferred** - Current session focused on navigation guards. This is a polish feature that can be done later if desired.
