# Dashboard Grid System - Implementation Plan

**Status:** 🟢 APPROVED - Ready for Implementation  
**Created:** 2025-12-04  
**Last Updated:** 2025-12-04 17:08  
**Version:** 2.0 (Final)

---

## 🎯 Vision

A fully responsive dashboard with intelligent layout syncing between desktop and mobile, supporting both automatic (synced) and manual (independent) layout modes.

---

## ✅ Confirmed Features

All features approved and ready for implementation:

1. ✅ **Editing on all breakpoints** - Mobile and desktop both editable
2. ✅ **Vertical collapse on all breakpoints** - `compactType: 'vertical'`
3. ✅ **Adaptive ordering** - Band detection algorithm
4. ✅ **Manual vs Auto mode toggle** - User choice for syncing
5. ✅ **Bidirectional sync** - Changes sync both ways in Auto mode
6. ✅ **Widget responsive variants** - Different UX per breakpoint
7. ✅ **Widget additions sync** - Even in Manual mode
8. ✅ **Collision prevention** - No overlapping widgets
9. ✅ **Improved container structure** - Better measurements

**EXCLUDED:**
- ❌ Dynamic cell calculations - Using static values instead

---

## 📐 Grid Configuration (FINAL)

### Column Layout
```javascript
cols: {
    lg: 12,    // Desktop - Maximum flexibility
    md: 12,    // Tablet landscape - Same as desktop
    sm: 6,     // Tablet portrait - Auto 2× scaling
    xs: 6,     // Mobile - Full-width stacking
    xxs: 6     // Small mobile - Same as xs
}
```

### Container Dimensions
```javascript
maxWidth: {
    lg: 2400,   // Large desktop - 20% more than old 2000px
    md: 1400,   // Tablet landscape
    sm: 900,    // Tablet portrait
    xs: '100%', // Mobile - Responsive
    xxs: '100%' // Small mobile - Responsive
}
```

### Static Values (No Dynamic Calculations)
```javascript
rowHeight: 100,   // Fixed, never changes
margin: 16,       // Gap between widgets
containerPadding: [0, 0]  // No internal padding
```

### Breakpoints
```javascript
breakpoints: {
    lg: 1200,   // Desktop
    md: 1024,   // Tablet landscape
    sm: 768,    // Tablet portrait
    xs: 600,    // Mobile
    xxs: 0      // Small mobile
}
```

---

## 🔄 Band Detection Algorithm

**Status:** ✅ Already implemented in `src/utils/layoutUtils.js`

The sweep-line band detection algorithm is complete and working:
- Lines 30-54: Horizontal band detection
- Lines 65-91: Within-band sorting and mobile stacking
- Handles overlapping widgets correctly
- Preserves left-to-right order on desktop → top-to-bottom on mobile

**No changes needed to algorithm - it works perfectly!**

---

## 📦 Widget Size Conversion (24 cols → 12 cols)

Old default sizes were based on 24 columns. New sizes for 12 columns:

```javascript
// Conversion formula: newWidth = Math.round(oldWidth × 0.5)

WIDGET_TYPES: {
    'system-status': {
        defaultSize: { w: 2, h: 3 },  // Was 3×3
        minSize: { w: 2, h: 3 }
    },
    
    'plex': {
        defaultSize: { w: 4, h: 4 },  // Was 7×4
        minSize: { w: 3, h: 4 }
    },
    
    'sonarr': {
        defaultSize: { w: 3, h: 3 },  // Was 3×3 (stays same)
        minSize: { w: 2, h: 3 }
    },
    
    'radarr': {
        defaultSize: { w: 3, h: 3 },  // Was 3×3 (stays same)
        minSize: { w: 2, h: 3 }
    },
    
    'overseerr': {
        defaultSize: { w: 4, h: 3 },  // Was 4×3 (stays same)
        minSize: { w: 3, h: 4 }
    },
    
    'qbittorrent': {
        defaultSize: { w: 4, h: 3 },  // Was 4×3 (stays same)
        minSize: { w: 3, h: 3 }
    },
    
    'weather': {
        defaultSize: { w: 2, h: 3 },  // Was 2×3 (stays same)
        minSize: { w: 2, h: 2 }
    },
    
    'calendar': {
        defaultSize: { w: 5, h: 5 },  // Was 8×5
        minSize: { w: 3, h: 5 }
    },
    
    'upcoming-media': {
        defaultSize: { w: 3, h: 3 },  // Was 3×3 (stays same)
        minSize: { w: 2, h: 2 }
    },
    
    'custom-html': {
        defaultSize: { w: 3, h: 3 },  // Was 3×3 (stays same)
        minSize: { w: 2, h: 2 }
    },
    
    'link-grid': {
        defaultSize: { w: 3, h: 2 },  // Was 3×2 (stays same)
        minSize: { w: 1, h: 1 }
    },
    
    'clock': {
        defaultSize: { w: 2, h: 2 },  // Was 3×2
        minSize: { w: 2, h: 2 }
    }
}
```

---

## 🗺️ 6-Phase Implementation Plan

### **PHASE 1: Foundation** (Week 1)
**Goal:** Solid base, nothing breaks

**Tasks:**
1. Update grid configuration to 12 columns
2. Update max container width to 2400px
3. Convert all widget default sizes
4. Add `layoutMode` state to Dashboard
5. Create Auto/Manual toggle UI (state only)
6. Change `preventCollision: false` → `true`
7. Clean up container div structure
8. Verify width measurements

**Files Modified:**
- `src/pages/Dashboard.jsx` - Grid config, state
- `src/utils/widgetRegistry.js` - Widget sizes
- `src/utils/gridConfig.js` - Constants

**Success Criteria:**
- ✅ Grid displays with 12 columns
- ✅ Widgets span more of large displays
- ✅ Can't create overlapping widgets
- ✅ Mode toggle switches state (doesn't do anything yet)

**Phase 1 Ensures:**
- Current functionality intact
- Desktop editing works
- Mobile layouts auto-generate
- No regressions

---

### **PHASE 2: Mobile Editing** (Week 2)
**Goal:** Enable editing on all breakpoints

**Tasks:**
1. Remove breakpoint lock (line 330 in Dashboard.jsx)
2. Track which breakpoint was edited
3. Store changes to correct layout object
4. Implement Manual mode behavior (no sync)
5. Keep Auto mode as downward-only for now

**Files Modified:**
- `src/pages/Dashboard.jsx` - handleLayoutChange logic

**Success Criteria:**
- ✅ Can edit widgets on mobile (xs/xxs)
- ✅ Changes save to xs layout
- ✅ Manual mode: Changes independent per breakpoint
- ✅ Auto mode: Desktop→Mobile sync still works

**Phase 2 Ensures:**
- All breakpoints editable
- Manual mode isolation works
- No corruption of layouts

---

### **PHASE 3: Widget Addition Sync** (Week 3)
**Goal:** Widget list consistent across breakpoints

**Tasks:**
1. Enhanced add widget handler
2. Create layouts for ALL breakpoints when adding
3. Widget deletion syncs to all breakpoints
4. Works in both Auto and Manual modes

**Files Modified:**
- `src/pages/Dashboard.jsx` - handleAddWidget, handleDeleteWidget

**Success Criteria:**
- ✅ Add widget on mobile → appears on desktop
- ✅ Delete on desktop → removes from mobile
- ✅ Works in both modes
- ✅ Widget list always synced

**Phase 3 Ensures:**
- Same widgets on all breakpoints
- Only positions differ in Manual mode
- No "ghost widgets"

---

### **PHASE 4: Bidirectional Sync** (Weeks 4-5)
**Goal:** Auto mode syncs both ways

**Tasks:**
1. Implement upward sync logic (Mobile → Desktop)
2. Detect widget position changes on mobile
3. Calculate target desktop positions
4. Re-run band detection after updates
5. Verify no layout divergence

**Files Modified:**
- `src/utils/layoutUtils.js` - New syncUpward function
- `src/pages/Dashboard.jsx` - Call sync in handleLayoutChange

**Success Criteria:**
- ✅ Edit on mobile → syncs to desktop
- ✅ Edit on desktop → syncs to mobile
- ✅ Order preserved correctly
- ✅ Auto mode fully bidirectional

**Phase 4 Ensures:**
- True bidirectional sync
- Order preservation
- Consistent layouts

---

### **PHASE 5: Widget Responsive Variants** (Week 6)
**Goal:** Better mobile UX

**Tasks:**
1. Create useResponsiveConfig hook
2. Provide breakpoint info to widgets
3. Update widgets one-by-one:
   - Plex: Smaller cards, less info on mobile
   - Sonarr/Radarr: Compact list items
   - Weather: Vertical layout on mobile
   - etc.
4. Touch-optimized interactions

**Files Created:**
- `src/hooks/useResponsiveConfig.js`

**Files Modified:**
- All widget components (gradual)

**Success Criteria:**
- ✅ Widgets adapt to breakpoint
- ✅ Better mobile UX
- ✅ Touch targets large enough
- ✅ Existing functionality unchanged

**Phase 5 Ensures:**
- Professional mobile experience
- Widgets use space efficiently
- No functionality lost

---

### **PHASE 6: Polish & Edge Cases** (Week 7)
**Goal:** Production-ready

**Tasks:**
1. Warning dialogs for mode switching
2. Error handling for sync failures
3. Edge case testing
4. Documentation updates
5. User guide

**Files Modified:**
- Various - error handling
- `docs/` - user documentation

**Success Criteria:**
- ✅ All edge cases handled
- ✅ Clear user warnings
- ✅ Comprehensive testing
- ✅ Documentation complete

**Phase 6 Ensures:**
- Production quality
- No surprises for users
- Maintainable code

---

## 📋 Current System Analysis

### What Works (Don't Touch!)
- ✅ Band detection algorithm (`layoutUtils.js`)
- ✅ Desktop editing and saving
- ✅ Mobile layout generation (downward sync)
- ✅ Widget registry system
- ✅ Widget loading and rendering

### What Needs Changing
- ❌ Column count: 24 → 12
- ❌ Max width: 2000px → 2400px
- ❌ Widget sizes: Scale by 50%
- ❌ Mobile editing: Currently blocked
- ❌ Collision prevention: Currently false
- ❌ Layout mode: Doesn't exist yet

### What Gets Added
- ➕ Manual/Auto mode toggle
- ➕ Upward sync logic
- ➕ Widget responsive behavior
- ➕ Enhanced error handling

---

## 🔌 Integration Points

### Phase Dependencies
```
Phase 1 (Foundation)
    ↓ Must complete first
Phase 2 (Mobile Editing) + Phase 3 (Widget Sync)
    ↓ Can do in parallel
    ↓ Both must complete
Phase 4 (Bidirectional Sync)
    ↓ Must complete next
Phase 5 (Responsive Variants)
    ↓ Independent, can run parallel to Phase 6
Phase 6 (Polish)
    ↓ Final
Production Ready
```

### Data Flow
```
User Action
    ↓
Edit Handler (Dashboard.jsx)
    ↓
Mode Check (Auto or Manual?)
    ↓
Auto Mode: Sync Engine (layoutUtils.js)
Manual Mode: Direct save to breakpoint
    ↓
State Update
    ↓
Re-render Grid
    ↓
Save to API (on user click "Save")
```

---

## 📁 File Structure

### Core Files
```
src/
├── pages/
│   └── Dashboard.jsx          # Main dashboard, grid config
├── utils/
│   ├── layoutUtils.js         # Band detection, sync logic
│   ├── widgetRegistry.js      # Widget metadata, sizes
│   └── gridConfig.js          # Grid constants
├── hooks/
│   └── useResponsiveConfig.js # (Phase 5) Breakpoint helpers
└── components/
    └── widgets/               # Individual widget components
```

### Documentation
```
docs/
├── dashboard/
│   ├── IMPLEMENTATION_PLAN.md   # This file (master plan)
│   ├── ALGORITHM_DEEP_DIVE.md   # Band detection theory
│   ├── PHASE_*.md               # Detailed phase specs (create as needed)
│   └── archived/                # Old planning docs
├── tasks/
│   ├── HANDOFF.md               # Session handoff (links here)
│   └── TASK_CURRENT.md          # Current work status
└── architecture/
    └── DASHBOARD_ARCHITECTURE.md # System overview
```

---

## 🚀 Getting Started (Next Chat)

**Step 1:** Read this document completely

**Step 2:** Read current state:
- `docs/tasks/HANDOFF.md` - Overall project context
- `docs/tasks/TASK_CURRENT.md` - Where last session left off

**Step 3:** Determine current phase:
- Check git commits to see what's been implemented
- Verify grid configuration values
- Check if layoutMode state exists

**Step 4:** Begin next phase:
- Follow phase checklist exactly
- Test after each change
- Commit frequently
- Update TASK_CURRENT.md

---

## ⚠️ Critical Rules

### DO:
- ✅ Follow phases in order
- ✅ Test after every change
- ✅ Commit after every feature
- ✅ Use static rowHeight: 100
- ✅ Keep band detection algorithm intact

### DON'T:
- ❌ Skip phases
- ❌ Implement dynamic cell calculations
- ❌ Change column counts mid-phase
- ❌ Modify layoutUtils.js algorithm without review
- ❌ Break existing desktop editing

---

## 📞 Questions?

If implementation details are unclear:
1. Read `ALGORITHM_DEEP_DIVE.md` for band detection theory
2. Read `GRID_SYSTEM_ADDENDUM.md` for edge cases
3. Check `FINAL_DESIGN_DECISION.md` for design rationale
4. Ask user for clarification

---

**Status:** Ready to begin Phase 1
**Next Steps:** Update grid configuration and widget sizes
**Expected Duration:** 6-7 weeks total (can be split across multiple chats)

---

**Last Updated:** 2025-12-04 17:08  
**Version:** 2.0 (Final Approved Plan)
