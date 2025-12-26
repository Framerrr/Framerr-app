# Dashboard Edit Mode Behavior Analysis

**Purpose:** Document exact Dashboard.tsx edit mode behavior for Template Builder parity.

---

## Grid Configuration

| Property | Desktop (lg) | Mobile (sm) |
|----------|--------------|-------------|
| `cols` | 24 | 2 |
| `breakpoint` | 768+ | 0-767 |
| `rowHeight` | 100px | 100px |
| `margin` | [16, 16] | [16, 16] |
| `compactType` | vertical | vertical |
| `preventCollision` | false | false |

---

## Adding Widgets

**Behavior:**
1. Widget added at `y: 0` (TOP of page, not bottom)
2. Widget spans `w: 24` (full width) on desktop
3. All existing widgets shifted down by new widget's height
4. Same for mobile: `w: 2` (full width), `y: 0`

```typescript
// Dashboard.tsx line 844-858
const lgLayouts = withLayouts.map(w => {
    const item = createLgLayoutItem(w);
    if (w.id === newWidgetId) {
        return { ...item, x: 0, y: 0, w: 24 }; // New widget at top, full width
    }
    return { ...item, y: item.y + newLgHeight }; // Shift existing down
});
```

---

## Dragging Behavior

### Desktop
- Draggable immediately when `editMode === true`
- Drag handle: Entire widget (no `draggableHandle` prop)
- Exception: Elements with `.no-drag` class are non-draggable

### Mobile
- Uses `useTouchDragDelay()` hook for touch gesture detection
- Must hold 250ms before drag is enabled
- `dragReadyWidgetId` tracks which widget is ready to drag
- Visual feedback via `.widget-drag-ready` CSS class

**CSS Feedback (GridLayout.css line 35-42):**
```css
.react-grid-item.widget-drag-ready {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35),
        0 0 0 3px var(--accent-edit),
        inset 0 0 0 1px var(--accent-edit-soft) !important;
    z-index: 100 !important;
}
```

---

## Resize Behavior

### Desktop
- 8-direction resize handles: `['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']`
- Corner handles are 24x24px
- Edge handles span full edge (100% width/height)

### Mobile
- Only bottom resize: `['s']`

**CSS (GridLayout.css line 182-226):**
- Full-edge resize handles for all cardinal directions
- Corner handles positioned at corners
- All have `transform: none !important` for proper positioning

---

## Edit Mode CSS Classes

### Widget Container Classes (Dashboard.tsx line 1140)
```jsx
className={`${editMode ? 'edit-mode' : 'locked'} ${dragReadyWidgetId === widget.id ? 'widget-drag-ready' : ''}`}
```

### Edit Mode Styles (GridLayout.css line 65-72)
```css
.react-grid-item.edit-mode {
    border: 2px dashed var(--accent-edit-soft);
}

.react-grid-item.edit-mode:hover {
    border-color: var(--accent-edit);
    box-shadow: 0 4px 20px var(--accent-edit-soft);
}
```

### Locked Mode (GridLayout.css line 74-77)
```css
.react-grid-item.locked {
    cursor: default;
}
```

---

## Delete Widget UI

**Location:** WidgetWrapper.tsx

**Behavior:**
1. X button absolutely positioned top-right (`top-2 right-2 z-50`)
2. Has `.no-drag` class to prevent drag interference
3. Uses `onPointerDown` + `e.stopPropagation()` to prevent drag
4. Two-phase delete: Click X → Cancel/Confirm buttons appear
5. Button styling:
   - Red background: `bg-red-500/20 hover:bg-red-500/30`
   - Size: `w-10 h-10`
   - Icon color: `text-red-400 hover:text-red-300`

```jsx
<button
    className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500/30 
     flex items-center justify-center text-red-400 hover:text-red-300
     transition-all duration-200"
>
    <X size={20} />
</button>
```

---

## Placeholder Styling

**CSS (GridLayout.css line 117-125):**
```css
.react-grid-item.react-grid-placeholder {
    background: var(--accent-edit-soft) !important;
    border: 2px dashed var(--accent-edit) !important;
    border-radius: 0.75rem;
    opacity: 1 !important;
}
```

---

## Handler Callbacks

| Event | Handler | Purpose |
|-------|---------|---------|
| `onLayoutChange` | `handleLayoutChange` | No-op (detection in onDragStop) |
| `onDragStart` | `handleDragStart` | Sets `isUserDragging = true` |
| `onResizeStart` | `handleResizeStart` | Sets `isUserDragging = true` |
| `onDragStop` | `handleDragResizeStop` | Update layouts state, smart change detection |
| `onResizeStop` | `handleDragResizeStop` | Same as onDragStop |
| `onBreakpointChange` | `handleBreakpointChange` | Restore independent mobile layouts |

---

## WidgetWrapper Props

| Prop | Type | Purpose |
|------|------|---------|
| `id` | string | Widget ID for delete callback |
| `type` | string | Widget type (affects header/padding) |
| `title` | string | Header title |
| `icon` | LucideIcon | Header icon |
| `editMode` | boolean | Show delete button |
| `flatten` | boolean | Flatten styling mode |
| `showHeader` | boolean | Show/hide header |
| `onDelete` | function | Delete callback |

---

## Template Builder Discrepancies

### ❌ Current Issues

| Issue | Dashboard | Template Builder |
|-------|-----------|------------------|
| Widget placement | y:0, w:24 | y:maxY, w:defaultSize |
| Resize handles | 8-direction | None working |
| Drag handle | Entire widget | Header only (`.drag-handle`) |
| Edit mode border | Dashed themed | Solid themed |
| Hover effect | Border color + shadow | None |
| Delete button | Red X with confirm | Basic X |
| Delete prevention | `.no-drag`, `onPointerDown` | Click only |
| CSS imports | GridLayout.css | None |

### ✅ Required Changes

1. **Import GridLayout.css** in Step 2
2. **Remove `draggableHandle`** prop to allow full-widget drag
3. **Use `.edit-mode` class** on widget containers
4. **Match delete button styling** from WidgetWrapper
5. **Add y:0 placement** for new widgets + shift existing down
6. **Enable all resize handles**: `resizeHandles={['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']}`
7. **Add `.no-drag` class** to delete button

---

## Mobile Layout Generation

**Algorithm:** `generateAllMobileLayouts()` from `utils/layoutUtils`

**Behavior:**
- Stacks widgets vertically
- Full width (w: 2)
- Preserves desktop height OR uses smart height calculation
- Sorted by desktop y-position

**For Template Builder:**
- Use same algorithm for real-time mobile preview
- Mobile view is read-only (no editing)

---

## CSS Variables Required

```css
--accent-edit       /* Border/shadow color in edit mode */
--accent-edit-soft  /* Softer version for backgrounds */
```

These are defined in the theme system and used for all edit mode visuals.
