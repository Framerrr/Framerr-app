# Mobile Dashboard System - Complete Technical Analysis

**Created:** 2025-12-21  
**Purpose:** Deep understanding of all components and their interactions  
**Branch:** `feature/mobile-dashboard-editing`

---

## Part 1: The Big Picture

### User Flow (What Should Happen)

```
1. Fresh Install (Linked Mode)
   ├── Desktop: User arranges widgets
   ├── Mobile: Auto-generated from desktop via band detection
   └── Both layouts sync automatically

2. User Wants Custom Mobile
   ├── Goes to mobile, taps Edit
   ├── Sees disclaimer: "Changes will create custom mobile layout"
   ├── Drags/resizes widgets
   ├── Taps Save → Modal: "Create custom layout?"
   ├── Confirms → Now "Independent" mode
   └── Mobile layout saved separately

3. Independent Mode
   ├── Desktop edits: Only affect desktop
   ├── Mobile edits: Only affect mobile  
   └── Each has separate saved layouts

4. Reconnect (Optional)
   ├── Settings > Dashboard > Reconnect
   ├── Confirms warning about losing mobile customization
   └── Returns to Linked mode
```

### Data Model

```typescript
// Desktop widgets (always exists)
widgets: Widget[] = [
  { id, type, layouts: { lg: {x,y,w,h}, sm: {x,y,w,h} }, config }
]

// Mobile widgets (only when independent)
mobileWidgets: Widget[] = [
  { id, type, layouts: { lg: {x,y,w,h}, sm: {x,y,w,h} }, config }
]

// Mode tracking
mobileLayoutMode: 'linked' | 'independent'

// During edit session
pendingUnlink: boolean  // True if user made changes that will trigger unlink
```

---

## Part 2: React-Grid-Layout Deep Dive

### How react-grid-layout Works

**Inputs:**
- `layouts`: Object with layout arrays per breakpoint `{ lg: [...], sm: [...] }`
- `children`: React elements with `key` and `data-grid` props
- `compactType`: 'vertical' | 'horizontal' | null

**Behavior with `compactType: 'vertical'`:**
1. Sorts items by Y position, then by X
2. Places each item at the earliest available Y position
3. Uses **DOM order as tiebreaker** when Y positions are equal

**Key Insight: DOM Order Matters**
```tsx
// If two items both have y: 0, DOM order determines who goes first
<GridItem key="a" data-grid={{x:0, y:0, w:2, h:2}} />  // Renders first
<GridItem key="b" data-grid={{x:0, y:0, w:2, h:2}} />  // Renders second

// Result: A above B (because A is first in DOM)
```

### How to Control Order

**Option 1: Use Unique Y Positions (Current Approach)**
```tsx
// Band detection assigns sequential Y: 0, 2, 4, 6...
layouts.sm = [
  { i: 'a', y: 0, h: 2 },
  { i: 'b', y: 2, h: 2 },  // After 'a'
  { i: 'c', y: 4, h: 2 },  // After 'b'
]
```
- ✅ Works with any compactType
- ✅ Order preserved

**Option 2: Control DOM Order**
```tsx
// Render children in the order you want
const orderedWidgets = [...widgets].sort((a,b) => a.layouts.sm.y - b.layouts.sm.y);
{orderedWidgets.map(w => <GridItem key={w.id} ... />)}
```
- ✅ Works as fallback
- ⚠️ Must keep DOM order consistent between edit/non-edit

**Option 3: compactType: null (No Auto-Compaction)**
```tsx
compactType={null}
```
- ✅ Items stay at exact positions you set
- ❌ No automatic gap filling during drag
- ❌ Items can overlap

### The Current Problem

We're mixing approaches:
1. Band detection assigns unique Y positions ✅
2. But we change compactType between edit/non-edit modes ❌
3. And we change DOM order between edit/non-edit modes ❌

When compactType changes from null→vertical, the grid recompacts using its algorithm. If DOM order doesn't match Y order, result is wrong.

---

## Part 3: The Solution

### Principle: Single Source of Truth

**Order is determined by:**
1. **Linked mode**: Band detection algorithm (from desktop layout)
2. **Independent mode**: Stored `mobileWidgets[].layouts.sm.y` positions

**This order must be consistent in:**
- The `layouts.sm` array passed to grid
- The DOM order (children rendered in order)
- Both edit mode and non-edit mode

### Implementation

**1. Always use compactType: 'vertical'**
```tsx
compactType="vertical"  // Never change based on mode
```

**2. Ensure layouts.sm has sequential Y positions**
```tsx
// After band detection or after user drops widget
const orderedLayouts = [...layouts.sm].sort((a,b) => a.y - b.y);
let newY = 0;
const compactedLayouts = orderedLayouts.map(item => {
  const result = { ...item, y: newY };
  newY += item.h;
  return result;
});
setLayouts(prev => ({ ...prev, sm: compactedLayouts }));
```

**3. Render children in layout.sm Y order (always)**
```tsx
// Sort widgets by their sm layout Y position
const widgetsInOrder = [...(mobileLayoutMode === 'independent' ? mobileWidgets : widgets)]
  .sort((a, b) => (a.layouts?.sm?.y ?? 0) - (b.layouts?.sm?.y ?? 0));

{widgetsInOrder.map(widget => <GridItem key={widget.id} ... />)}
```

**4. Don't change anything on edit mode toggle**
- Same compactType
- Same layouts
- Same DOM order
- Only difference: isDraggable and isResizable become true

---

## Part 4: Linked vs Unlinked Logic

### State Machine

```
┌──────────────────────────────────────────────────────────┐
│                     LINKED MODE                          │
│  - Desktop layout is source of truth                     │
│  - Mobile layout auto-generated via band detection       │
│  - Editing on mobile triggers pendingUnlink              │
└────────────────────────┬─────────────────────────────────┘
                         │
                         │ User edits on mobile + saves + confirms
                         ▼
┌──────────────────────────────────────────────────────────┐
│                   INDEPENDENT MODE                        │
│  - Desktop layout: widgets[].layouts.lg                  │
│  - Mobile layout: mobileWidgets[].layouts.sm             │
│  - Each edits independently                              │
└────────────────────────┬─────────────────────────────────┘
                         │
                         │ User clicks "Reconnect to Desktop"
                         ▼
┌──────────────────────────────────────────────────────────┐
│         BACK TO LINKED MODE                              │
│  - mobileWidgets[] cleared                               │
│  - Mobile layout regenerated from desktop                │
│  - Custom mobile layout is LOST                          │
└──────────────────────────────────────────────────────────┘
```

### Unlink Flow (Critical Details)

**During Edit (Before Save):**
```tsx
// User makes any change on mobile while linked
if (editMode && isMobile && mobileLayoutMode === 'linked') {
  setPendingUnlink(true);  // Flag, but don't unlink yet
}
```

**On Save Button Click:**
```tsx
if (pendingUnlink && mobileLayoutMode === 'linked') {
  setShowUnlinkConfirmation(true);  // Show modal
  return;  // Don't save yet
}
```

**On Modal Confirm:**
```tsx
// Call backend to unlink
await axios.post('/api/widgets/unlink');
// mobileWidgets now populated on backend
// Save the edited layout to mobileWidgets
await axios.put('/api/widgets', { mobileWidgets: editedLayout });
setMobileLayoutMode('independent');
setPendingUnlink(false);
```

**On Modal Cancel:**
```tsx
// Revert to original layout
setLayouts(originalLayout);
setWidgets(originalWidgets);
setPendingUnlink(false);
setEditMode(false);
```

---

## Part 5: Save Logic

### What Gets Saved Where

| Mode | Viewport | What's Saved | Endpoint |
|------|----------|--------------|----------|
| Linked | Desktop | `widgets[].layouts.lg` | `PUT /api/widgets { widgets }` |
| Linked | Mobile | Nothing (auto-generated) | N/A |
| Linked | Mobile + Edit + Save | Triggers unlink | `POST /api/widgets/unlink` then `PUT /api/widgets { mobileWidgets }` |
| Independent | Desktop | `widgets[].layouts.lg` | `PUT /api/widgets { widgets }` |
| Independent | Mobile | `mobileWidgets[].layouts.sm` | `PUT /api/widgets { mobileWidgets }` |

### Backend Endpoints

```
GET /api/widgets
  Returns: { widgets, mobileLayoutMode, mobileWidgets }

PUT /api/widgets
  Body: { widgets?, mobileWidgets?, mobileLayoutMode? }
  Saves whatever is provided

POST /api/widgets/unlink
  Copies widgets[] to mobileWidgets[]
  Sets mobileLayoutMode: 'independent'

POST /api/widgets/reconnect
  Clears mobileWidgets[]
  Sets mobileLayoutMode: 'linked'
```

---

## Part 6: What Needs to Be Fixed

### Current Issues

1. **compactType toggle** - Causes recompaction with wrong order
2. **DOM order changes on edit toggle** - Causes visual jump
3. **Manual recompaction in handleLayoutChange** - Fights with grid
4. **Layout array sorting in render** - Creates new array every render
5. **Visibility effect complexity** - May trigger at wrong times

### Required Changes

| File | Change |
|------|--------|
| Dashboard.tsx:1138 | `compactType="vertical"` (always) |
| Dashboard.tsx:1146 | Remove sorting, pass layouts directly |
| Dashboard.tsx:1150-1152 | Always sort widgets by sm.y, not conditionally |
| Dashboard.tsx:562-570 | Remove manual recompaction, let grid handle |
| Dashboard.tsx:343-405 | Simplify visibility effect, remove editMode dep |

---

## Part 7: Testing Requirements

After fixes:

- [ ] **Linked mode, mobile view**: Shows band-sorted order
- [ ] **Linked mode, mobile edit**: Same order as view
- [ ] **Linked mode, drag widget**: Neighbors shift, drop works
- [ ] **Linked mode, save → unlink modal**: Shows on confirm
- [ ] **Linked mode, cancel**: Reverts changes
- [ ] **Independent mode, mobile edit**: Works normally
- [ ] **Independent mode, save**: Saves to mobileWidgets
- [ ] **Desktop edit**: Never affected by mobile logic
- [ ] **Viewport resize**: Seamless switch between layouts
- [ ] **Viewport resize during edit**: See Part 8

---

## Part 8: Breakpoint Transitions (Viewport Resize)

### The Problem

When user is editing on mobile and resizes viewport to desktop width:
- Grid switches from `sm` breakpoint to `lg` breakpoint
- Current code uses mobile layout positions (2-col) on desktop grid (24-col)
- Result: Widgets get squished to 2/24 of the width

### How react-grid-layout Breakpoint Change Works

```tsx
// onBreakpointChange fires when viewport crosses breakpoint threshold
onBreakpointChange={(newBreakpoint) => {
  // Grid automatically uses layouts[newBreakpoint]
  // If layouts[newBreakpoint] doesn't exist or is wrong, problems occur
}}
```

**What SHOULD happen:**
1. User on mobile (sm), enters edit mode
2. Makes changes to layouts.sm
3. Resizes viewport to desktop (lg)
4. Grid should switch to layouts.lg (desktop layout - unchanged)
5. Resizes back to mobile (sm)
6. Grid should switch to layouts.sm (with edit changes intact)

**What IS happening:**
- The layouts.lg might be getting overwritten or not properly maintained
- OR handleLayoutChange is modifying the wrong breakpoint

### Root Cause Investigation

The issue is likely in how we handle breakpoint changes during edit mode:

```tsx
// Current code at line 1147
onBreakpointChange={(breakpoint) => setCurrentBreakpoint(breakpoint as Breakpoint)}
```

This just sets state. But we need to ensure:
1. Both `layouts.lg` and `layouts.sm` are maintained independently
2. When breakpoint changes, the grid uses the correct layout
3. Edit changes are applied to the CURRENT breakpoint only

### Solution

**1. Track which breakpoint was edited**
```tsx
const [editedBreakpoints, setEditedBreakpoints] = useState<Set<string>>(new Set());

// In handleLayoutChange
setEditedBreakpoints(prev => new Set([...prev, currentBreakpoint]));
```

**2. Keep layouts independent**
```tsx
// handleLayoutChange should ONLY update the current breakpoint
const handleLayoutChange = (newLayout: Layout[]) => {
  if (!editMode) return;
  
  setLayouts(prev => ({
    ...prev,
    [currentBreakpoint]: newLayout as GridLayoutItem[]  // Only update current breakpoint
  }));
  
  // Update widget objects for the current breakpoint only
  // ... update widgets[].layouts[currentBreakpoint]
};
```

**3. Ensure proper layouts prop**
```tsx
// Pass BOTH layouts to the grid, let it pick based on breakpoint
layouts={layouts}  // Contains both { lg: [...], sm: [...] }

// NOT this (which forces mobile only)
layouts={isMobile ? { sm: layouts.sm } : layouts}
```

**4. Handle linked mode during resize**
```tsx
// When in linked mode, mobile layout is auto-generated from desktop
// If user starts editing on mobile, they're editing layouts.sm
// Resizing to desktop shows layouts.lg (unchanged)
// This is correct behavior!
```

### Expected Behavior After Fix

| Scenario | Result |
|----------|--------|
| Edit on mobile, resize to desktop | Desktop layout shows (unchanged) |
| Edit on mobile, resize to desktop, resize back | Mobile layout shows (with edits) |
| Edit on desktop, resize to mobile | Mobile layout shows (unchanged if linked) |
| Edit on desktop, resize to mobile, resize back | Desktop layout shows (with edits) |

### Linked Mode Complication

In linked mode, editing on mobile + resizing to desktop is tricky:
- Desktop layout should be unchanged (user didn't edit it)
- Mobile layout has pending edits
- If user then tries to save on desktop... what happens?

**Answer:** The `pendingUnlink` flag indicates mobile was edited. If user saves from desktop:
- Only desktop layout should save (no unlink triggered)
- Mobile edits are preserved in state but not saved
- If user goes back to mobile and saves, then unlink triggers

### Updated Required Changes

| File | Change |
|------|--------|
| Dashboard.tsx | Pass full `layouts` object, not filtered by isMobile |
| Dashboard.tsx | handleLayoutChange updates only current breakpoint |
| Dashboard.tsx | Add editedBreakpoints tracking (optional but useful) |

---

## Part 9: Package Evaluation

### Current Stack

| Package | Version | Purpose |
|---------|---------|---------|
| react-grid-layout | 1.5.2 | Grid layout with drag/resize |
| @dnd-kit/core | 6.3.1 | Modern drag-and-drop toolkit |
| @dnd-kit/sortable | 10.0.0 | Sortable lists |
| framer-motion | 12.23.25 | Animations |

### react-grid-layout v1.5 Known Issues

Research reveals these documented issues in v1.5:

1. **Mobile drag interferes with scroll** - Vertical dragging conflicts with page scrolling
2. **compactType changes cause reorder** - Switching compactType triggers unexpected recomputation
3. **DOM order affects compaction** - Tiebreaker uses DOM order when Y positions equal
4. **"Drag from outside" broken on mobile** - Feature doesn't work on mobile resolutions
5. **Regression since v1.4.0** - Unexpected reordering when dragging

### Alternatives Considered

| Library | Pros | Cons |
|---------|------|------|
| **Gridstack.js** | Native touch support, TypeScript, explicit mobile-first design | Not React-native, requires DOM manipulation after React render |
| **@dnd-kit** (already have it) | Modern, flexible, great touch support | Not a grid layout - just drag/drop primitives |
| **Muuri** | Advanced layouts, animations | Complex, not React-native |

### Recommendation: Stay with react-grid-layout

**Why:**
1. We already have it working for 95% of use cases
2. The issues are **implementation problems**, not library limitations
3. Switching would require significant refactoring
4. Our fixes (documented above) address the specific issues

**The real problems are:**
- Changing compactType between modes (we stop doing this)
- Changing DOM order between modes (we stop doing this)
- Manual recompaction fighting the grid (we stop doing this)

### If react-grid-layout Proves Insufficient

**Fallback Plan: Hybrid @dnd-kit + Custom Grid**

We already have @dnd-kit installed. If react-grid-layout can't deliver smooth mobile editing:

1. Use react-grid-layout for **view mode** (layout rendering)
2. Use @dnd-kit for **edit mode** (drag/drop with custom handling)
3. Sync positions between the two systems

This gives us full control over drag behavior while keeping RGL's responsive layout benefits.

### Touch-Specific Improvements (If Needed)

If mobile touch still feels janky after fixes:

```tsx
// Add touch delay to distinguish drag from scroll
const TOUCH_DELAY = 150; // ms before drag starts

// Use framer-motion for smoother drag animations
// (We already have framer-motion installed)
```

### Performance Considerations

| Aspect | Status |
|--------|--------|
| React 19 | ✅ Compatible |
| TypeScript | ✅ Types available (@types/react-grid-layout) |
| Bundle size | ✅ RGL is ~50KB gzipped |
| Memory | ⚠️ Avoid creating new arrays in render |

---

## Summary of Required Actions

### Immediate (Before Implementation)

- [ ] Update analysis doc with any remaining gaps
- [ ] Get user approval to proceed

### Phase 1: Foundation Fixes

1. Remove compactType toggle → always 'vertical'
2. Remove layout sorting in render
3. Remove widget array sorting in render  
4. Remove manual recompaction in handleLayoutChange
5. Pass full layouts object (both lg and sm)

### Phase 2: Test Core Functionality

- Verify drag/drop works on mobile
- Verify breakpoint transitions work
- Verify order is preserved

### Phase 3: Integration Fixes

- Verify linked/unlinked logic still works
- Verify save flow with unlink confirmation
- Verify desktop editing unaffected

### Phase 4: Polish (If Needed)

- Add touch delay for mobile
- Consider framer-motion for animations
- Consider @dnd-kit fallback if needed

---

## Part 10: Order Injection Strategy

### React-Grid-Layout's Internal Ordering

When `compactType: 'vertical'`, RGL's compaction algorithm:

1. Sorts items by Y position (ascending)
2. Then by X position (ascending)  
3. Then by ID (for stable ordering when Y and X are equal)
4. Places each item at the earliest available Y position

**Key insight:** RGL WILL maintain order if Y positions are distinct and sequential.

### When Order Gets Applied

| Event | Who Controls Order |
|-------|-------------------|
| Initial load | **Us** (band detection) |
| User drag/drop | **RGL** (compaction) |
| User resize | **RGL** (compaction) |
| Save | **Us** (store current state) |
| Fetch after save | **Us** (band detection if linked, stored order if independent) |

### The Critical Question: When to Inject vs Let Grid Handle

**INJECT our order:**
- ✅ Initial fetch (generate mobile layout from desktop via band detection)
- ✅ After reconnecting to desktop (regenerate from desktop)
- ✅ When visibility changes (recompact, closing gaps)

**LET GRID HANDLE:**
- ✅ During drag/drop (user is actively moving things)
- ✅ During resize (user is changing widget size)
- ✅ Any time editMode is true and user is interacting

### Current Problem: Fighting the Grid

We're currently:
1. ❌ Manually recompacting during drag (handleLayoutChange)
2. ❌ Sorting layout before passing to grid (render)
3. ❌ Changing compactType which triggers recompaction

This means we're overriding what the grid is trying to do.

### Proper Integration Strategy

**Step 1: Band detection sets initial Y positions**
```tsx
// In fetchWidgets, after band detection:
// Widgets now have layouts.sm = { y: 0, h: 2 }, { y: 2, h: 3 }, { y: 5, h: 2 }...
// These Y values encode our desired order
```

**Step 2: Pass to grid unchanged**
```tsx
// Grid receives layout with our Y positions
layouts={layouts}  // Contains sequential Y values from band detection
```

**Step 3: Grid compacts using our Y order**
```tsx
// compactType: 'vertical' means grid will:
// 1. Sort by Y (our band order)
// 2. Compact upward to fill gaps
// 3. Result matches our intended order ✅
```

**Step 4: During edit, ACCEPT what grid gives us**
```tsx
const handleLayoutChange = (newLayout: Layout[]) => {
  if (!editMode) return;
  
  // DON'T manually recompact! Just store what grid gives us
  setLayouts(prev => ({
    ...prev,
    [currentBreakpoint]: newLayout
  }));
  
  // Update widget objects for persistence
  // ... (store positions for save)
};
```

**Step 5: On SAVE, persist current order**
```tsx
// Current Y positions from grid become the new "truth"
// Next fetch will use these positions (if independent)
// Or regenerate from band detection (if linked)
```

### Making Band Detection "Smarter"

The band detection algorithm is correct. What needs to be smarter is **when it runs**:

| Scenario | Should Band Detection Run? |
|----------|---------------------------|
| Fresh install | ✅ Yes - generate from desktop |
| Linked mode, refresh | ✅ Yes - always regenerate from desktop |
| Independent mode, refresh | ❌ No - use stored mobile layout |
| Reconnect to desktop | ✅ Yes - regenerate from desktop |
| During editing | ❌ No - let grid handle |
| After save (linked→independent) | ❌ No - use what user arranged |

### Current Code Issue

Looking at `fetchWidgets()`:
```tsx
// Lines 504-511 and 514-520
// BOTH linked and independent cases regenerate mobile layouts!
fetchedWidgets = generateAllMobileLayouts(fetchedWidgets);
```

**This is wrong for independent mode** - we should use stored `mobileWidgets` layouts, not regenerate.

### Fixed Logic

```tsx
if (fetchedMobileMode === 'independent' && fetchedMobileWidgets.length > 0) {
    // Independent: Use stored mobile widgets AS-IS
    // DO NOT regenerate from desktop
    setMobileWidgets(fetchedMobileWidgets);
    
    // Layouts come from mobileWidgets, not regenerated
    const mobileLayouts = fetchedMobileWidgets.map(w => ({
        i: w.id,
        ...w.layouts.sm
    }));
    setLayouts(prev => ({ ...prev, sm: mobileLayouts }));
} else {
    // Linked: Generate from desktop
    const widgetsWithMobile = generateAllMobileLayouts(fetchedWidgets);
    setWidgets(widgetsWithMobile);
    
    const mobileLayouts = widgetsWithMobile.map(w => ({
        i: w.id,
        ...w.layouts.sm
    }));
    setLayouts(prev => ({ ...prev, sm: mobileLayouts }));
}
```

### Order Persistence Summary

```
LINKED MODE:
  Desktop Layout → Band Detection → Mobile Layout
  ↓
  Every refresh regenerates mobile from desktop
  
INDEPENDENT MODE:
  Mobile Layout (user arranged) → Stored in mobileWidgets
  ↓
  Every refresh loads stored mobile layout
  ↓
  Band detection NOT called (user's order is truth)
```

### Visual Flow

```
┌─────────────────────────────────────────────────────────┐
│                    INITIAL LOAD                         │
│                                                         │
│  Desktop widgets from API                               │
│         ↓                                               │
│  Band Detection Algorithm                               │
│         ↓                                               │
│  Y positions assigned (0, 2, 5, 7...)                  │
│         ↓                                               │
│  React-grid-layout renders with these Y positions       │
│         ↓                                               │
│  compactType:'vertical' respects Y order               │
│         ↓                                               │
│  ✅ Correct order displayed                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    DURING EDIT                          │
│                                                         │
│  User drags widget                                      │
│         ↓                                               │
│  React-grid-layout handles drag                         │
│         ↓                                               │
│  onLayoutChange fires with new positions               │
│         ↓                                               │
│  We STORE new positions (don't recompact)              │
│         ↓                                               │
│  Grid compacts using new Y order                        │
│         ↓                                               │
│  ✅ Widget in new position, others shifted              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    ON SAVE                              │
│                                                         │
│  Current layouts.sm has user's arrangement              │
│         ↓                                               │
│  Save to API (mobileWidgets if independent)            │
│         ↓                                               │
│  Next fetch loads these positions directly              │
│         ↓                                               │
│  ✅ User's arrangement persisted                        │
└─────────────────────────────────────────────────────────┘
```

---

## Part 11: Clarified Behaviors (Q&A Summary)

### Core Principles

1. **Cascade down, never up** - Desktop→Mobile, never Mobile→Desktop
2. **Tentative until save** - Link doesn't break until user confirms
3. **Real-time injection** - Layout updates as viewport changes
4. **Widgets never hide** - Show "integration disabled" message instead

### Widget Operations

| Action | Behavior |
|--------|----------|
| Add widget (any viewport) | Goes to **top** of layout |
| Add on mobile (linked) | Tentative unlink, goes to top |
| Remove on mobile (independent) | Only removes from mobile |
| Remove on desktop (linked) | Cascades to mobile |
| Config edit on mobile (linked) | Does NOT trigger unlink |
| Position/size change on mobile (linked) | DOES trigger unlink |

### Edit Mode

| Aspect | Behavior |
|--------|----------|
| Visual indicator | Dashed border, background highlight on drag |
| Drag animation | Neighbors shift during drag, not just on drop |
| Cancel | Reverts ALL changes since entering edit mode |
| Memory of canceled unlink | None - fully reverts, link persists |

### Viewport Transitions

| Scenario | Behavior |
|----------|----------|
| Resize during edit mode | Modal prompts: "Save & Switch" / "Discard & Switch" / "Cancel" |
| Modal open | Dashboard blurs but layout still updates behind |
| Modal timeout | None - stays open until user chooses |
| Linked mode resize | Band detection runs in real-time |

### Linked vs Independent

| Scenario | Behavior |
|----------|----------|
| Edit desktop (linked) | Mobile updates in real-time via band detection |
| Edit mobile (linked) | Triggers tentative unlink |
| Save mobile edit (linked) | Shows unlink confirmation modal |
| Cancel mobile edit (linked) | Reverts, stays linked |
| Independent mode | Fully separate - no cascading |
| Reconnect | Wipes mobile, regenerates from desktop |

### Widget Configs

| Aspect | Behavior |
|--------|----------|
| Widget settings (e.g., tabs, links) | Separate per widget instance |
| On unlink | Existing configs persist |
| New widget after unlink | Blank config (future: templates) |

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Save fails | Rollback to pre-edit state |
| Partial save (unlink OK, widget fail) | Rollback all |
| Backup system | Store 1 previous version |
| Future: Edit history | Per-action tracking for undo |

### Concurrent Access

| Scenario | Behavior (V1) |
|----------|---------------|
| Multiple devices editing | Last-write-wins |
| Future: Conflict detection | Warning on save if server version changed |

---

## Part 12: Architecture Summary

### Function Separation

```tsx
// layoutUtils.ts - Clean separation

// 1. Pure order calculation
export function calculateMobileOrder(widgets: Widget[]): string[] {
  // Band detection algorithm
  return ['widget-1', 'widget-3', 'widget-2'];
}

// 2. Apply positions based on order
export function applyMobilePositions(widgets: Widget[], order: string[]): Widget[] {
  let currentY = 0;
  // Map order to positions...
}

// 3. Convenience wrapper (unchanged API)
export function generateMobileLayout(widgets: Widget[]): Widget[] {
  const order = calculateMobileOrder(widgets);
  return applyMobilePositions(widgets, order);
}
```

### State Management

```tsx
// Dashboard.tsx - Key state

// Persistent state
const [widgets, setWidgets] = useState<Widget[]>([]);           // Desktop
const [mobileWidgets, setMobileWidgets] = useState<Widget[]>([]); // Mobile (if independent)
const [mobileLayoutMode, setMobileLayoutMode] = useState<'linked' | 'independent'>('linked');

// Edit session state
const [editMode, setEditMode] = useState(false);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [pendingUnlink, setPendingUnlink] = useState(false);
const [originalLayout, setOriginalLayout] = useState<Widget[]>([]);  // For cancel/revert

// Layouts for react-grid-layout
const [layouts, setLayouts] = useState<{ lg: Layout[], sm: Layout[] }>({ lg: [], sm: [] });
```

### Key Code Changes Summary

| Location | Current | Change |
|----------|---------|--------|
| Line 1138 | `compactType` toggles | Always `'vertical'` |
| Line 1146 | Layout sorting in render | Remove - pass as-is |
| Line 1150 | Widget sorting conditional | Always sort by sm.y |
| handleLayoutChange | Manual recompaction | Just store what grid gives |
| fetchWidgets | Regenerates even for independent | Only regenerate for linked |
| onBreakpointChange | Just sets state | Add breakpoint switch modal |

---

## Implementation Checklist

**Last Updated:** 2025-12-22

- [x] **Phase 1: Core Fixes** ✅ COMPLETE
  - [x] compactType always 'vertical'
  - [x] Remove layout sorting in render (pass layouts as-is)
  - [x] Widget sorting uses layouts.sm state during edit mode
  - [x] Remove manual recompaction (use onDragStop/onResizeStop)
  - [x] Deterministic sort with ID tiebreaker in layoutUtils.ts
  - [x] data-grid uses correct breakpoint layout (not hardcoded lg)
  - [x] Height preservation - mobile uses desktop height in linked mode

- [x] **Phase 2: Breakpoint Handling** ✅ MOSTLY COMPLETE
  - [x] handleBreakpointChange restores independent layouts on resize
  - [x] Track current breakpoint state
  - [ ] Add breakpoint switch modal (optional polish)
  - [ ] Implement blur effect during modal (optional polish)

- [x] **Phase 3: Order Injection** ✅ COMPLETE
  - [x] fetchWidgets uses stored layouts for independent mode
  - [x] Band detection only runs for linked mode
  - [x] Order correctly applied visually via data-grid fix

- [/] **Phase 4: Save Flow** - PARTIAL
  - [x] Save to localStorage (dev dashboard isolation)
  - [x] pendingUnlink state management
  - [ ] Unlink confirmation modal (exists but may need polish)
  - [ ] Rollback on failure (basic exists)

- [ ] **Phase 5: Polish** - NOT STARTED
  - [ ] Drag animation smoothness
  - [ ] Touch delay for mobile
  - [ ] Backup system (1 version)
  - [ ] Port fixes to production Dashboard.tsx

---

## Session Notes (2025-12-22)

### Key Fixes Applied to DevDashboard.tsx

1. **Deterministic Sort** (`layoutUtils.ts`)
   - Added widget ID as tiebreaker for consistent order across browsers

2. **Snap-Back Prevention** (`DevDashboard.tsx`)
   - Moved state updates from `onLayoutChange` to `onDragStop`/`onResizeStop`
   - `onLayoutChange` now only sets `hasUnsavedChanges` flag

3. **Independent Mode Persistence** (`DevDashboard.tsx`)
   - Added `handleBreakpointChange` to restore `mobileWidgets` layouts on resize

4. **Visual Order Application** (`DevDashboard.tsx`)
   - Fixed `data-grid` to use current breakpoint layout instead of always `lg`

5. **Height Preservation** (`layoutUtils.ts`)
   - Changed `calculateMobileHeight` to use desktop height directly

### Files Modified

| File | Status |
|------|--------|
| `src/pages/DevDashboard.tsx` | Primary beta dashboard with all fixes |
| `src/utils/layoutUtils.ts` | Deterministic sort, height preservation |
| `src/components/dev/DevDebugOverlay.tsx` | Header-only drag, text selection |

### Next Steps for Production

1. Thoroughly test DevDashboard in linked and independent modes
2. Port working fixes to production `Dashboard.tsx`
3. Remove `/dev/dashboard` route when complete
4. Consider adding breakpoint switch modal for polish
