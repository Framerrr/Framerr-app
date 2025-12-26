# Mobile Dashboard Layout System - Revised Plan

## Core Requirements (from user)

1. **Always snap immediately** - Vertical compaction at all times
2. **Edit mode = View mode** - Identical appearance, only difference is draggable/resizable
3. **Seamless viewport switching** - Resize from desktop↔mobile switches layouts smoothly
4. **Linked vs Independent** - When unlinked, each has its own layout

---

## Clarified Behavior Scenarios

### Scenario A: Linked Mobile (Default)
| Viewport | Layout Source | Editable |
|----------|---------------|----------|
| Desktop | `widgets[].layouts.lg` | Yes, saves to lg |
| Mobile | Auto-generated from lg via band-sort | No editing allowed? Or triggers unlink? |

### Scenario B: Independent Mobile
| Viewport | Layout Source | Editable |
|----------|---------------|----------|
| Desktop | `widgets[].layouts.lg` | Yes, saves to lg only |
| Mobile | `mobileWidgets[].layouts.sm` | Yes, saves to sm only |

### Scenario C: Viewport Resize (Unlinked)
- User on desktop (lg) → resizes window to mobile width
- Should show: Mobile layout (`mobileWidgets[]`)
- User resizes back to desktop width
- Should show: Desktop layout (`widgets[]`)

---

## Required Technical Behaviors

### 1. Consistent compactType
```
compactType: 'vertical' always (desktop and mobile, view and edit)
```
This ensures:
- ✅ View mode and edit mode look identical
- ✅ Widgets snap into place
- ✅ No jarring reorder on edit toggle

### 2. Grid Drives Layout Order
- Let react-grid-layout handle compaction and ordering
- Stop manually sorting in render
- Stop manually recompacting in handleLayoutChange
- Trust the grid library to manage positions

### 3. Separate Widget Arrays
| Mode | Desktop Widgets | Mobile Widgets |
|------|-----------------|----------------|
| Linked | `widgets[]` (lg layout) | Generated from `widgets[]` |
| Independent | `widgets[]` (lg layout) | `mobileWidgets[]` (sm layout) |

---

## Questions to Clarify

### Q1: Editing on Linked Mobile
When user is on mobile and layout is **linked**, they currently can't edit without triggering an unlink. Should this:
- **a)** Show edit button but warn/confirm before allowing edits (current approach)
- **b)** Hide edit button entirely on linked mobile
- **c)** Allow edits that modify the desktop layout (and regenerate mobile)

### Q2: Desktop Edits When Independent
When mobile is **independent** and user edits on **desktop**, should:
- **a)** Only desktop layout changes (mobile stays as-is) - current approach
- **b)** Show a choice: "Apply to desktop only" vs "Apply to both"

### Q3: Adding/Removing Widgets When Independent
When mobile is independent and user **adds a widget** on desktop:
- **a)** Widget appears only on desktop (mobile has different widget set)
- **b)** Widget appears on both (mobile gets it too, at bottom)
- **c)** Show choice

When user **removes** a widget on desktop:
- **a)** Only removes from desktop
- **b)** Removes from both
- **c)** Show choice

### Q4: Reconnect Flow Details
When user reconnects mobile to desktop:
- Mobile widgets are replaced with auto-generated from desktop
- What happens to mobile-only widgets that don't exist on desktop?
  - **a)** Silently deleted
  - **b)** Warning shown: "X mobile-only widgets will be removed"

### Q5: Visibility System Integration
Widgets can hide when their integration is disconnected. When hidden:
- Gaps should collapse (visibility recompaction)
- Should this happen:
  - **a)** In both view and edit mode
  - **b)** Only in view mode (in edit mode, show placeholder "Disconnected" style)

---

## Proposed Implementation

### Remove the Competing Systems
1. **Remove**: compactType toggle (always 'vertical')
2. **Remove**: Manual sorting in render (trust grid)
3. **Remove**: Manual recompaction in handleLayoutChange
4. **Simplify**: Visibility effect only runs on true visibility changes

### Key Code Changes

```tsx
// 1. Always vertical compaction
compactType="vertical"

// 2. No sorting in render
layouts={isMobile ? { sm: layouts.sm } : layouts}
{widgets.map(widget => ...)} // No sorting

// 3. Simplified handleLayoutChange
const handleLayoutChange = (newLayout: Layout[]) => {
    if (!editMode) return;
    
    if (isMobile) {
        // Just save positions directly
        setLayouts(prev => ({ ...prev, sm: newLayout }));
        // Also update widget objects for persistence
        updateWidgetSmLayouts(newLayout);
        setHasUnsavedChanges(true);
    } else {
        // Desktop: existing logic
    }
};

// 4. Visibility effect - only recompact when visibility changes
// Already partially fixed, needs refinement
```

### What Stays the Same
- Band-sort algorithm for generating initial mobile layout from desktop
- Backend API structure (mobileLayoutMode, mobileWidgets)
- Modal components (disclaimer, unlink confirmation)
- Settings UI (Dashboard Management)

---

## Implementation Order (After Questions Answered)

1. **Unify compactType** - Always 'vertical'
2. **Remove render-time sorting** - Trust grid
3. **Simplify handleLayoutChange** - No manual recompaction  
4. **Test basic editing** - Drag/drop works, positions persist
5. **Fix visibility effect** - Only runs on true visibility changes
6. **Test linked/independent modes** - Full flow works
7. **Test viewport switching** - Seamless transitions
