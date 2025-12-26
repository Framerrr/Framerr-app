# Mobile Dashboard Layout System - Technical Analysis

**Created:** 2025-12-21  
**Status:** Reference document for refactoring  
**Branch:** `feature/mobile-dashboard-editing`

---

## Problem Summary

Mobile dashboard editing is broken. Multiple systems in Dashboard.tsx are fighting over widget layout positions, causing:
- Widgets don't drop in new positions (snap back)
- Order changes when entering/exiting edit mode
- compactType changes cause recompaction with wrong order

---

## Competing Systems (6 Total)

### 1. `layoutUtils.ts` - Band-Sort Algorithm

**Location:** `src/utils/layoutUtils.ts` lines 28-119

**Purpose:** Generate mobile stacked layout from desktop 24-column layout

**What it does:**
- Reads desktop `layouts.lg` positions
- Groups widgets into horizontal "bands" based on Y overlap
- Sorts each band left-to-right (by X), then flattens
- Assigns sequential Y positions (0, h1, h1+h2, ...)

**Called from:** `fetchWidgets()` via `generateAllMobileLayouts()`

**Conflict:** Overwrites user-customized mobile layouts on every fetch

---

### 2. Visibility Recompaction useEffect

**Location:** `Dashboard.tsx` lines 343-405

**Purpose:** Collapse gaps when widgets hide (e.g., disconnected integrations)

**What it does:**
- Watches `widgetVisibility` state
- Sorts by current layout Y
- Reassigns sequential Y positions to collapse gaps

**Dependency array:** `[widgetVisibility, currentBreakpoint, widgets, editMode]`

**Conflict:** 
- Runs when `widgets` state changes (even during editing)
- Has complex ref-based guard to detect "true" visibility changes
- Still triggers on edge cases

---

### 3. `handleLayoutChange()` - Manual Recompaction

**Location:** `Dashboard.tsx` lines 548-621

**Purpose:** Process drag/resize events from react-grid-layout

**What it does (mobile path):**
1. Receives `newLayout` from grid
2. Sorts by Y and reassigns sequential positions  
3. Updates both `widgets` and `layouts` state

**Conflict:** 
- Manual recompaction fights with grid's compaction
- Setting widgets state triggers visibility effect
- Grid may already have compacted the layout

---

### 4. `compactType` Prop Toggle

**Location:** `Dashboard.tsx` line 1138

**Current code:**
```tsx
compactType={effectiveBreakpoint === 'sm' ? (editMode ? 'vertical' : null) : 'vertical'}
```

**Behavior:**
- View mode mobile: `null` (no compaction)
- Edit mode mobile: `'vertical'` (auto-compact)
- Desktop: Always `'vertical'`

**Conflict:**
- Changing compactType causes grid to recompact ALL widgets
- Grid uses its own algorithm, not respecting our Y positions
- Results in order changes when toggling edit mode

---

### 5. Widget DOM Order Sorting

**Location:** `Dashboard.tsx` lines 1150-1153

**Current code:**
```tsx
{(isMobile && editMode
    ? [...widgets].sort((a, b) => (a.layouts?.sm?.y ?? 0) - (b.layouts?.sm?.y ?? 0))
    : widgets
).map(widget => ...)}
```

**Conflict:**
- Only sorts during mobile edit mode
- Creates different DOM order between view/edit modes
- Grid may use DOM order for compaction priority

---

### 6. Layout Prop Sorting

**Location:** `Dashboard.tsx` line 1146

**Current code:**
```tsx
layouts={isMobile ? { sm: [...layouts.sm].sort((a, b) => a.y - b.y) } : layouts}
```

**Conflict:**
- Creates new sorted array every render
- May conflict with grid's internal state tracking
- Adds yet another layer of sorting logic

---

## Root Cause

**The core issue:** These 6 systems were built independently for different purposes:
- Band-sort: Initial mobile generation
- Visibility effect: Gap collapsing
- handleLayoutChange: Edit handling  
- compactType: Grid behavior control
- DOM sorting: Render order
- Layout sorting: Grid input

Now they're all trying to control widget positions simultaneously.

---

## Expected Behavior

1. **View mode and edit mode must look identical** - Same positions, same order
2. **Widgets always snap/compact vertically** - No floating, no gaps
3. **Drag/drop works** - Widget stays where user drops it
4. **Viewport switching works** - Desktop↔mobile transitions seamlessly

---

## Solution Direction

1. **Use compactType:'vertical' always** - No toggling
2. **Remove manual recompaction in handleLayoutChange** - Let grid handle it
3. **Remove DOM sorting** - Consistent order always
4. **Remove layout sorting in render** - Pass as-is
5. **Simplify visibility effect** - Only truly visibility-based triggers
6. **Keep band-sort for initial generation only** - Don't overwrite custom layouts

---

## Files to Modify

| File | Changes Needed |
|------|----------------|
| `src/pages/Dashboard.tsx` | Major refactoring of layout handling |
| `src/utils/layoutUtils.ts` | No changes needed |
