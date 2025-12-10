# Dashboard Architecture Overview

**Version:** 2.0  
**Last Updated:** 2025-12-04  
**Status:** Planning Complete, Ready for Implementation

---

## System Purpose

The dashboard provides a responsive, customizable grid layout for widgets with:
- Intelligent responsive behavior (band detection algorithm)
- Auto/Manual layout synchronization modes
- Mobile and desktop editing capabilities
- Collision-free widget placement

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│                                                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────┐  │
│  │ Edit Toggle   │  │ Mode Toggle   │  │ Add Widget Button  │  │
│  │ (Edit/View)   │  │ (Auto/Manual) │  │                    │  │
│  └───────────────┘  └───────────────┘  └────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD COMPONENT                           │
│                   (src/pages/Dashboard.jsx)                      │
│                                                                   │
│  STATE:                                                           │
│  - widgets[]         (list of all widgets)                       │
│  - layouts           { lg, md, sm, xs, xxs }                     │
│  - editMode          (boolean)                                   │
│  - layoutMode        ('auto' | 'manual')                         │
│  - currentBreakpoint (string)                                    │
│                                                                   │
│  HANDLERS:                                                        │
│  - handleLayoutChange()  → Process drag/resize                   │
│  - handleAddWidget()     → Add new widget                        │
│  - handleDeleteWidget()  → Remove widget                         │
│  - handleSave()          → Persist to API                        │
└───────────┬──────────────────┬──────────────┬───────────────────┘
            │                  │              │
            ▼                  ▼              ▼
    ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐
    │ EDIT HANDLER  │  │ SYNC ENGINE  │  │ PERSISTENCE     │
    │               │  │              │  │                 │
    │ Detects:      │  │ Functions:   │  │ API Calls:      │
    │ - Drag        │  │ - Downward   │  │ - Save widgets  │
    │ - Resize      │  │ - Upward     │  │ - Load widgets  │
    │ - Add/Delete  │  │ - Bands      │  │ - User config   │
    │               │  │ - Mode check │  │                 │
    └───────────────┘  └──────────────┘  └─────────────────┘
            │                  │                   │
            └──────────────────┴───────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYOUT UTILITIES                              │
│                  (src/utils/layoutUtils.js)                      │
│                                                                   │
│  FUNCTIONS:                                                       │
│  - generateMobileLayout()  → Band detection + stacking           │
│  - syncUpward()            → Mobile → Desktop (Phase 4)          │
│  - migrateWidgetToLayouts() → Format conversion                  │
│                                                                   │
│  ALGORITHM:                                                       │
│  Lines 30-54: Sweep-line band detection                          │
│  Lines 65-91: Within-band sorting + mobile stacking              │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WIDGET REGISTRY                               │
│                 (src/utils/widgetRegistry.js)                    │
│                                                                   │
│  METADATA:                                                        │
│  - defaultSize: { w, h }  → Initial dimensions                   │
│  - minSize: { w, h }      → Minimum allowed                      │
│  - maxSize: { h }         → Maximum height                       │
│  - requiresIntegration    → API dependencies                     │
│                                                                   │
│  12 WIDGET TYPES with sizes optimized for 12-column grid         │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REACT-GRID-LAYOUT                              │
│              (ResponsiveGridLayout component)                    │
│                                                                   │
│  PROPS:                                                           │
│  - cols: { lg:12, md:12, sm:6, xs:6, xxs:6 }                     │
│  - rowHeight: 100 (static)                                       │
│  - layouts: { lg, md, sm, xs, xxs }                              │
│  - isDraggable, isResizable (from editMode)                      │
│  - preventCollision: true                                        │
│  - compactType: 'vertical'                                       │
│                                                                   │
│  CALLBACKS:                                                       │
│  - onLayoutChange() → Triggers sync                              │
│  - onBreakpointChange() → Updates currentBreakpoint              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### Example 1: User Drags Widget on Desktop

```
1. User drags Plex widget to new position
   ↓
2. react-grid-layout detects change
   ↓
3. Calls onLayoutChange(newLayout)
   ↓
4. Dashboard.handleLayoutChange() triggered
   ↓
5. Check currentBreakpoint === 'lg'? YES
   ↓
6. Update widgets[].layouts.lg with new positions
   ↓
7. Check layoutMode === 'auto'? YES
   ↓
8. Call generateAllMobileLayouts(widgets)
   ↓
9. layoutUtils.generateMobileLayout() runs for each breakpoint
   ↓
10. Band detection algorithm:
    - Sort widgets by Y, then X
    - Group into horizontal bands
    - Sort within each band
    - Stack for mobile
   ↓
11. Update layouts.md, .sm, .xs, .xxs
   ↓
12. React re-renders grid with new layouts
   ↓
13. User sees change immediately
   ↓
14. User clicks "Save"
   ↓
15. handleSave() → API call → Database updated
```

### Example 2: User Adds Widget on Mobile (Phase 3+)

```
1. User opens dashboard on phone (xs breakpoint)
   ↓
2. Clicks "Add Widget" → Selects "Weather"
   ↓
3. handleAddWidget('weather') triggered
   ↓
4. Create new widget object with:
   - id: widget-{timestamp}
   - type: 'weather'
   - metadata from widgetRegistry
   ↓
5. Create layouts for ALL breakpoints:
   lg: { x:0, y:Infinity, w:2, h:3 } (default size)
   md: { x:0, y:Infinity, w:2, h:3 }
   sm: auto-generated by band detection
   xs: { x:0, y:bottom, w:6, h:3 } (full width)
   xxs: { x:0, y:bottom, w:6, h:3 }
   ↓
6. Add to widgets[]
   ↓
7. If Auto mode:
   - Run band detection on lg
   - Regenerate md, sm, xs, xxs
   ↓
8. Grid re-renders
   ↓
9. Weather widget appears on mobile AND desktop
```

### Example 3: User Switches to Manual Mode

```
1. User clicks Mode Toggle
   ↓
2. layoutMode changes: 'auto' → 'manual'
   ↓
3. No layout changes (snapshot current state)
   ↓
4. Future edits:
   - Desktop edit → only updates lg
   - Mobile edit → only updates xs
   - No automatic syncing
   ↓
5. Widget additions/deletions still sync
   (same widgets everywhere, different positions)
```

---

## Key Components

### 1. Dashboard.jsx (Main Controller)
**Responsibilities:**
- Render react-grid-layout
- Manage widget state
- Handle user interactions
- Coordinate sync operations
- Save/load from API

**State:**
```javascript
{
  widgets: [
    {
      id: 'widget-123',
      type: 'plex',
      layouts: {
        lg: { x:0, y:0, w:4, h:4 },
        md: { x:0, y:0, w:4, h:4 },
        sm: { x:0, y:0, w:4, h:4 },
        xs: { x:0, y:2, w:6, h:4 },
        xxs: { x:0, y:2, w:6, h:4 }
      },
      config: { title: 'Plex', ... }
    },
    // ... more widgets
  ],
  layouts: {
    lg: [{ i:'widget-123', x:0, y:0, w:4, h:4 }, ...],
    md: [...],
    sm: [...],
    xs: [...],
    xxs: [...]
  },
  editMode: false,
  layoutMode: 'auto',
  currentBreakpoint: 'lg'
}
```

### 2. layoutUtils.js (Band Detection)
**Core Algorithm:**
```javascript
// Sweep-line band detection
ySorted.forEach((widget) => {
    if (widget.y >= currentBandMaxY) {
        // Hard cut - start new band
        bands.push(currentBand);
        currentBand = [widget];
        currentBandMaxY = widget.yEnd;
    } else {
        // Overlaps - same band
        currentBand.push(widget);
        currentBandMaxY = Math.max(currentBandMaxY, widget.yEnd);
    }
});

// Sort within bands (left to right)
bands.flatMap(band => 
    band.sort((a, b) => a.x - b.x)
);

// Stack for mobile
let y = 0;
sorted.map(widget => ({
    x: 0,
    y: y,
    w: 6,  // Full width on mobile
    h: calculateMobileHeight(widget),
    ...
}));
```

### 3. widgetRegistry.js (Widget Metadata)
**Provides:**
- Component references
- Default sizes (optimized for 12 columns)
- Minimum/maximum constraints
- Integration requirements

**Example:**
```javascript
'plex': {
    component: PlexWidget,
    icon: Tv,
    name: 'Plex',
    defaultSize: { w: 4, h: 4 },  // 33% width on 12-col grid
    minSize: { w: 3, h: 4 },
    maxSize: { h: 10 },
    requiresIntegration: 'plex'
}
```

### 4. gridConfig.js (Constants)
**Provides:**
- Column counts per breakpoint
- Max widths per breakpoint
- Padding values
- Helper functions (currently unused)

---

## Grid Mathematics

### Cell Dimensions
```
Container: 2400px (lg)
Columns: 12
Margin: 16px

Available space: 2400 - (16 × 11) = 2224px
Cell width: 2224 / 12 = 185px
Row height: 100px (static)

Example widget (w:4, h:4):
- Actual width: (185 × 4) + (16 × 3) = 788px
- Actual height: (100 × 4) + (16 × 3) = 448px
```

### Responsive Scaling
```
Desktop (lg, 12 cols):
  Plex w:4 → 4/12 = 33% of container

Tablet (sm, 6 cols):
  Plex w:4 → 4/6 = 66% of container (auto-scaled!)

Mobile (xs, 6 cols):
  Plex w:6 → 6/6 = 100% of container (full width stack)
```

---

## Implementation Phases

### Phase 1: Foundation ✅ Ready
- Update grid to 12 columns
- Change max width to 2400px
- Add layoutMode state
- Enable collision prevention

### Phase 2: Mobile Editing 🔜 Next
- Remove breakpoint lock
- Save changes per breakpoint
- Manual mode isolation

### Phase 3: Widget Sync 🔜
- Additions sync everywhere
- Deletions sync everywhere
- Same widgets, different layouts

### Phase 4: Bidirectional Sync 🔜
- Upward sync logic
- Auto mode complete
- Order preservation

### Phase 5: Responsive Variants 🔜
- useResponsiveConfig hook
- Mobile-optimized widgets
- Touch interactions

### Phase 6: Polish 🔜
- Edge cases
- Warnings
- Testing

---

## File Locations

```
src/
├── pages/
│   └── Dashboard.jsx          [Main controller, grid config]
├── utils/
│   ├── layoutUtils.js         [Band detection algorithm]
│   ├── widgetRegistry.js      [Widget metadata]
│   └── gridConfig.js          [Grid constants]
├── hooks/
│   └── useResponsiveConfig.js [Phase 5 - Not created yet]
└── components/
    └── widgets/               [Individual widget components]
```

---

## Integration with Existing Systems

### Theming System
- Dashboard respects theme variables
- Uses `.bg-theme-secondary`, `.text-theme-primary`, etc.
- See `docs/theming/THEMING_ENGINE.md`

### User Management
- Layouts saved per user
- Permissions control widget access
- See `docs/architecture/ARCHITECTURE.md`

### API Backend
- GET `/api/widgets` - Load user's widgets
- PUT `/api/widgets` - Save layout changes
- GET `/api/config/user` - Get layoutMode preference

---

## Testing Strategy

### Unit Tests (Future)
- Band detection algorithm
- Layout sync functions
- Widget addition/deletion

### Integration Tests
- Desktop editing flow
- Mobile editing flow
- Mode switching

### Manual Testing
- Each phase independently
- Breakpoint transitions
- Edge cases

---

## References

- **Implementation Plan:** `docs/dashboard/IMPLEMENTATION_PLAN.md`
- **Algorithm Theory:** `docs/dashboard/ALGORITHM_DEEP_DIVE.md`
- **Task Tracking:** `docs/tasks/TASK_CURRENT.md`
- **Theming Rules:** `.agent/rules/theming-rules.md`

---

**Last Updated:** 2025-12-04  
**Next Review:** After Phase 1 completion
