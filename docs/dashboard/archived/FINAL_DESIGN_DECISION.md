# Dashboard Grid System - Final Design Decision

**Created:** 2025-12-04  
**Status:** Comprehensive pressure testing of user's vision  
**Goal:** Validate bidirectional sync + auto/manual modes + responsive widget variants

---

## 🎯 The Vision: Intelligent Bidirectional Sync

### Core Concept

**Desktop is "master" but mobile is "smart derivative"**
- Desktop creates layout → Mobile auto-generated via band detection
- But mobile layouts are NOT just "squished desktop"
- Mobile uses same widgets with **mobile-optimized behavior**
- Edits on EITHER breakpoint sync via **bidirectional band detection**
- User can toggle **Auto** (synced) vs **Manual** (independent) mode

---

## 🔄 Component 1: Bidirectional Band Detection

### How It Works

**Current Band Detection (Downward Only):**
```
Desktop Layout:
[Clock    ] [Weather  ]  ← Row 1 (band)
[Plex_______________  ]  ← Row 2 (band)
[Radarr   ] [Sonarr  ]  ← Row 3 (band)

Mobile Generated (sorted by bands):
[Clock    ]  ← From band 1
[Weather  ]  ← From band 1
[Plex     ]  ← From band 2
[Radarr   ]  ← From band 3
[Sonarr   ]  ← From band 3
```

**New: Upward Band Detection (Mobile → Desktop)**

**Scenario:** User adds Calendar widget on mobile

```
Mobile Layout (before):
[Clock    ]
[Weather  ]
[Plex     ]
  ← USER ADDS CALENDAR HERE (between Plex and Radarr)
[Radarr   ]
[Sonarr   ]

Mobile Layout (after):
[Clock    ]
[Weather  ]
[Plex     ]
[Calendar ]  ← Y position: 3
[Radarr   ]
[Sonarr   ]
```

**Algorithm Must Determine:** Where does Calendar go on desktop?

**Upward Sync Logic:**
```javascript
// On mobile, Calendar is between Plex (y:2) and Radarr (y:4)
// This means Calendar's "visual position" is y:3

// Find what's on desktop at similar positions:
Desktop widgets by Y:
  Y:0 → Clock, Weather (band 1)
  Y:1 → Plex (band 2)
  Y:2 → Radarr, Sonarr (band 3)

// Calendar inserted at mobile Y:3 (after Plex, before Radarr)
// Desktop equivalent: Insert after band 2, before band 3
// New desktop position: Y:1.5 (between Plex and Radarr row)
// After grid compaction: Y:2, X:auto (finds empty space)

Desktop Layout (after sync):
[Clock    ] [Weather  ]  ← Y:0 (band 1)
[Plex_______________  ]  ← Y:1 (band 2)
[Calendar ] [Empty     ]  ← Y:2 (NEW - inserted between)
[Radarr   ] [Sonarr   ]  ← Y:3 (band 3, pushed down)
```

### Band Detection Algorithm (Enhanced)

```javascript
/**
 * Bidirectional Band Detection
 * Works both desktop→mobile AND mobile→desktop
 */

// STEP 1: Detect bands on source breakpoint
const detectBands = (widgets, breakpoint) => {
    const sorted = widgets.sort((a, b) => {
        const aLayout = a.layouts[breakpoint];
        const bLayout = b.layouts[breakpoint];
        
        // Sort by Y, then X
        if (aLayout.y !== bLayout.y) return aLayout.y - bLayout.y;
        return aLayout.x - bLayout.x;
    });
    
    // Group into bands (horizontal rows that don't overlap vertically)
    const bands = [];
    let currentBand = [];
    let currentBandMaxY = -1;
    
    sorted.forEach(widget => {
        const layout = widget.layouts[breakpoint];
        const widgetTop = layout.y;
        const widgetBottom = layout.y + layout.h;
        
        // Check if this widget overlaps with current band
        const overlapsCurrentBand = widgetTop < currentBandMaxY;
        
        if (overlapsCurrentBand && currentBand.length > 0) {
            // Part of current band
            currentBand.push(widget);
            currentBandMaxY = Math.max(currentBandMaxY, widgetBottom);
        } else {
            // Start new band
            if (currentBand.length > 0) bands.push(currentBand);
            currentBand = [widget];
            currentBandMaxY = widgetBottom;
        }
    });
    
    if (currentBand.length > 0) bands.push(currentBand);
    
    return bands;
};

// STEP 2: Sync downward (desktop → mobile)
const syncDownward = (desktopWidgets) => {
    const bands = detectBands(desktopWidgets, 'lg');
    
    let mobileY = 0;
    const mobileLayouts = [];
    
    bands.forEach(band => {
        // Sort band items by X position (left to right)
        const sortedBand = band.sort((a, b) => 
            a.layouts.lg.x - b.layouts.lg.x
        );
        
        sortedBand.forEach(widget => {
            mobileLayouts.push({
                ...widget,
                layouts: {
                    ...widget.layouts,
                    xs: {
                        x: 0,  // Full width on mobile
                        y: mobileY,
                        w: 6,  // 6 cols (full width on mobile)
                        h: calculateMobileHeight(widget)
                    }
                }
            });
            
            mobileY += mobileLayouts[mobileLayouts.length - 1].layouts.xs.h;
        });
    });
    
    return mobileLayouts;
};

// STEP 3: Sync upward (mobile → desktop)
const syncUpward = (mobileWidgets, desktopWidgets) => {
    // Find widgets that exist on mobile but positions changed
    const mobileOrder = mobileWidgets.map(w => ({
        id: w.id,
        mobileY: w.layouts.xs.y
    })).sort((a, b) => a.mobileY - b.mobileY);
    
    // Detect desktop bands (current state)
    const desktopBands = detectBands(desktopWidgets, 'lg');
    
    // For each mobile widget, find its "target band" on desktop
    const updatedDesktop = mobileWidgets.map(mobileWidget => {
        const currentDesktop = desktopWidgets.find(d => d.id === mobileWidget.id);
        if (!currentDesktop) {
            // New widget added on mobile → place at bottom of desktop
            return {
                ...mobileWidget,
                layouts: {
                    ...mobileWidget.layouts,
                    lg: {
                        x: 0,
                        y: Infinity,  // Auto-place at bottom
                        w: getWidgetMetadata(mobileWidget.type).defaultSize.w,
                        h: getWidgetMetadata(mobileWidget.type).defaultSize.h
                    }
                }
            };
        }
        
        // Widget exists on both - check if mobile position changed
        const mobileIndex = mobileOrder.findIndex(m => m.id === mobileWidget.id);
        
        // Find which widgets are immediately before/after on mobile
        const mobileBefore = mobileIndex > 0 ? mobileOrder[mobileIndex - 1].id : null;
        const mobileAfter = mobileIndex < mobileOrder.length - 1 ? mobileOrder[mobileIndex + 1].id : null;
        
        // Find those widgets on desktop
        const desktopBeforeWidget = desktopWidgets.find(d => d.id === mobileBefore);
        const desktopAfterWidget = desktopWidgets.find(d => d.id === mobileAfter);
        
        // Calculate target Y position on desktop
        let targetY;
        if (desktopBeforeWidget && desktopAfterWidget) {
            // Between two widgets
            const beforeY = desktopBeforeWidget.layouts.lg.y + desktopBeforeWidget.layouts.lg.h;
            const afterY = desktopAfterWidget.layouts.lg.y;
            targetY = (beforeY + afterY) / 2;
        } else if (desktopBeforeWidget) {
            // After a widget
            targetY = desktopBeforeWidget.layouts.lg.y + desktopBeforeWidget.layouts.lg.h;
        } else if (desktopAfterWidget) {
            // Before a widget
            targetY = Math.max(0, desktopAfterWidget.layouts.lg.y - currentDesktop.layouts.lg.h);
        } else {
            // Keep current position
            targetY = currentDesktop.layouts.lg.y;
        }
        
        return {
            ...currentDesktop,
            layouts: {
                ...currentDesktop.layouts,
                lg: {
                    ...currentDesktop.layouts.lg,
                    y: targetY  // Update Y, keep X/W/H
                }
            }
        };
    });
    
    return updatedDesktop;
};
```

### Pressure Test: Bidirectional Sync

**Scenario 1: Add Widget on Mobile**
```
Initial State:
  Desktop: [A] [B]  [C] [D]
  Mobile:  [A] [B] [C] [D]

User adds [E] on mobile between [B] and [C]:
  Mobile:  [A] [B] [E] [C] [D]

Sync to desktop:
  - E's mobile neighbors: before=B, after=C
  - Find B on desktop: Y=0
  - Find C on desktop: Y=1
  - Place E at Y between them: Y=0.5
  - Grid compaction adjusts to: Y=1 (new row)
  
  Desktop: [A] [B]
           [E] [Empty]  ← E inserted
           [C] [D]       ← Pushed down

Sync back to mobile:
  - Bands: {A,B}, {E}, {C,D}
  - Mobile: [A] [B] [E] [C] [D]  ✓ Matches!
```

**Scenario 2: Reorder on Mobile**
```
Initial:
  Desktop: [A] [B]
           [C] [D]
  Mobile:  [A] [B] [C] [D]

User drags [D] above [A] on mobile:
  Mobile:  [D] [A] [B] [C]

Sync to desktop:
  - D's new neighbors: before=null, after=A
  - A on desktop: Y=0
  - Place D before A: Y=-1 (above A)
  - Grid compaction: D moves to Y=0, pushes A/B/C down
  
  Desktop: [D] [Empty]  ← D moved to top
           [A] [B]
           [C] [Empty]

Sync back to mobile:
  - Bands: {D}, {A,B}, {C}
  - Mobile: [D] [A] [B] [C]  ✓ Matches!
```

**Scenario 3: Side-by-Side on Desktop, Stacked on Mobile**
```
Initial:
  Desktop: [A] [B] [C]  ← All in one band (side-by-side)
  Mobile:  [A] [B] [C]  ← Stacked

User moves [B] down on mobile:
  Mobile:  [A] [C] [B]  ← B now after C

Sync to desktop:
  - B's neighbors: before=C, after=null
  - C on desktop: Y=0, X=16
  - Place B after C: Need same Y (same row) or Y+1 (new row)?
  
  PROBLEM: B could fit next to C (same row) OR below (new row)
  
  DECISION RULE: If widget can fit in same band, keep it there
  - Check if B fits at X after C: X=24 (C.x + C.w)
  - B width: 6 cols
  - Total: 24 + 6 = 30 > 24 (grid max)
  - Doesn't fit → Place on new row
  
  Desktop: [A] [B] [C]  ← Actually, this is ambiguous!
```

**ISSUE IDENTIFIED:** Mobile reorder might not cleanly map to desktop when multiple items are side-by-side.

**Solution:** Preserve horizontal groupings (bands) when syncing upward
```javascript
// Enhanced rule: Only reorder WITHIN bands
const syncUpwardPreservingBands = (mobileOrder, desktopWidgets) => {
    const desktopBands = detectBands(desktopWidgets, 'lg');
    
    // For each mobile widget, find which band it SHOULD be in
    // based on its neighbors
    
    // If mobile order matches band order, keep band structure
    // If mobile reorder crosses bands, CREATE NEW BAND
    
    // This prevents breaking desktop side-by-side layouts
};
```

---

## ⚙️ Component 2: Auto/Manual Layout Mode

### User Setting

```javascript
// In user preferences
dashboardSettings: {
    layoutMode: 'auto' | 'manual',  // DEFAULT: 'auto'
    
    // Per-breakpoint override (advanced)
    breakpointModes: {
        lg: 'auto',    // Desktop syncs to mobile
        xs: 'auto'     // Mobile syncs to desktop
    }
}
```

### Behavior by Mode

**Auto Mode (Default):**
- Edits on desktop → Sync to mobile (downward)
- Edits on mobile → Sync to desktop (upward)
- Band detection maintains order
- Changes propagate immediately

**Manual Mode:**
- Each breakpoint is independent
- No automatic syncing
- User can edit each breakpoint separately
- Existing layouts preserved, just disconnected

### Switching Modes

**User toggles from Auto → Manual:**
```javascript
// Snapshot current layouts (they're already generated)
// Just stop propagating changes

const switchToManualMode = () => {
    // No layout changes needed
    // Just update flag
    setLayoutMode('manual');
    
    // Future edits won't sync
};
```

**User toggles from Manual → Auto:**
```javascript
// Regenerate mobile from desktop (or keep current?)

const switchToAutoMode = () => {
    // Option A: Regenerate mobile from desktop
    const newMobileLayouts = syncDownward(desktopWidgets);
    setMobileLayouts(newMobileLayouts);
    
    // Option B: Keep current layouts, just re-enable syncing
    // (Might be surprising if layouts are very different)
    
    setLayoutMode('auto');
    
    // Show warning: "Switching to Auto mode will sync layouts. Current mobile layout will be replaced with desktop-generated version. Continue?"
};
```

### UI Indicator

```jsx
// In dashboard header
<div className="layout-mode-indicator">
    <button onClick={toggleLayoutMode}>
        {layoutMode === 'auto' ? (
            <><Shuffle /> Auto Sync</>
        ) : (
            <><Lock /> Manual (Independent)</>
        )}
    </button>
    
    {layoutMode === 'auto' && (
        <span className="text-xs text-theme-tertiary">
            Changes sync between desktop and mobile
        </span>
    )}
</div>
```

---

## 📱 Component 3: Widget Responsive Variants

### Concept: Same Widget, Different Behavior

**NOT separate components, just responsive behavior within one component.**

```javascript
// In each widget component
const PlexWidget = ({ config, widgetId }) => {
    const { currentBreakpoint } = useGridConfig();
    const isMobile = currentBreakpoint === 'xs' || currentBreakpoint === 'xxs';
    
    // Mobile-optimized behavior
    const padding = isMobile ? 'p-2' : 'p-4';
    const textSize = isMobile ? 'text-sm' : 'text-base';
    const showExtendedInfo = !isMobile;
    
    return (
        <div className={`plex-widget ${padding}`}>
            <StreamCard
                stream={stream}
                textSize={textSize}
                showExtendedInfo={showExtendedInfo}
                compactMode={isMobile}
            />
        </div>
    );
};
```

### Mobile-Specific Optimizations

**1. Reduced Padding**
```javascript
const PADDING_BY_BREAKPOINT = {
    lg: 24,   // p-6 (desktop: spacious)
    md: 20,   // p-5 (tablet: comfortable)
    sm: 16,   // p-4 (small tablet: compact)
    xs: 12,   // p-3 (mobile: tight)
    xxs: 8    // p-2 (small mobile: minimal)
};
```

**2. Font Scaling**
```javascript
const TEXT_SIZE_BY_BREAKPOINT = {
    lg: 'text-base',    // 16px
    md: 'text-base',    // 16px
    sm: 'text-sm',      // 14px
    xs: 'text-sm',      // 14px
    xxs: 'text-xs'      // 12px
};
```

**3. Conditional Features**
```javascript
const shouldShowFeature = (feature, breakpoint) => {
    const mobileHidden = ['extended-info', 'detailed-stats', 'hover-tooltips'];
    const isMobile = breakpoint === 'xs' || breakpoint === 'xxs';
    
    if (isMobile && mobileHidden.includes(feature)) {
        return false;
    }
    
    return true;
};
```

**4. Touch-Optimized Interactions**
```javascript
const getInteractionStyle = (breakpoint) => {
    const isMobile = breakpoint === 'xs' || breakpoint === 'xxs';
    
    return {
        // Larger tap targets on mobile
        minTapHeight: isMobile ? 44 : 32,
        
        // No hover states on mobile (no mouse)
        enableHover: !isMobile,
        
        // Swipe gestures on mobile
        enableSwipe: isMobile,
        
        // Click vs tap behavior
        clickDelay: isMobile ? 0 : 200  // No hover delay on mobile
    };
};
```

### Example: Plex Widget variants

**Desktop (lg):**
```jsx
<div className="p-6">
    <div className="flex gap-4">
        <img src={poster} className="w-48 h-72" />  {/* Large */}
        <div className="flex-1">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-base text-theme-secondary">{year} • {runtime}</p>
            <p className="text-sm">{summary}</p>  {/* Extended info */}
            <div className="flex gap-2">
                {genres.map(g => <Badge key={g}>{g}</Badge>)}
            </div>
        </div>
    </div>
</div>
```

**Mobile (xs):**
```jsx
<div className="p-2">  {/* Tighter padding */}
    <div className="flex gap-2">  {/* Smaller gap */}
        <img src={poster} className="w-20 h-30" />  {/* Smaller image */}
        <div className="flex-1">
            <h3 className="text-sm font-bold">{title}</h3>  {/* Smaller text */}
            <p className="text-xs text-theme-tertiary">{year}</p>  {/* Less info */}
            {/* No summary, no genres - too cluttered */}
        </div>
    </div>
</div>
```

### Implementation Pattern

```javascript
// Shared between all widgets
const useResponsiveConfig = () => {
    const { currentBreakpoint } = useGridConfig();
    
    return {
        padding: PADDING_BY_BREAKPOINT[currentBreakpoint],
        textSize: TEXT_SIZE_BY_BREAKPOINT[currentBreakpoint],
        isMobile: currentBreakpoint === 'xs' || currentBreakpoint === 'xxs',
        isTablet: currentBreakpoint === 'md' || currentBreakpoint === 'sm',
        isDesktop: currentBreakpoint === 'lg',
        
        // Helpers
        showFeature: (feature) => shouldShowFeature(feature, currentBreakpoint),
        getSpacing: (desktop, mobile) => isMobile ? mobile : desktop,
        getTextSize: (sizes) => sizes[currentBreakpoint] || sizes.lg
    };
};

// Use in widgets
const PlexWidget = () => {
    const responsive = useResponsiveConfig();
    
    return (
        <div className={`plex-widget ${responsive.padding}`}>
            {/* Responsive content */}
        </div>
    );
};
```

---

## 🧪 Comprehensive Pressure Testing

### Test 1: Desktop Edit → Mobile Sync

**Action:** User resizes Plex widget on desktop from 7×4 to 10×6

**Auto Mode:**
```
Desktop:
  - Plex: 7×4 → 10×6
  - Save to database
  
Trigger sync to mobile:
  - Detect bands on desktop
  - Plex is still in same band
  - Regenerate mobile keeping band order
  
Mobile:
  - Plex: x:0, y:2, w:6, h:4 → x:0, y:2, w:6, h:5 (scaled height)
  - Widget re-renders with SAME mobile-optimized UI
  - Just more vertical space for content
```

**Manual Mode:**
```
Desktop:
  - Plex: 7×4 → 10×6
  - Save to database
  
Mobile:
  - NO CHANGE (independent)
  - Plex stays at original 6×4
```

✅ **Result:** Auto mode syncs intelligently, Manual mode isolates

---

### Test 2: Mobile Edit → Desktop Sync

**Action:** User adds Calendar widget on mobile between Plex and Radarr

**Auto Mode:**
```
Mobile:
  - Add Calendar at y:3 (between Plex at y:2 and Radarr at y:4)
  - Save to database
  
Trigger sync to desktop:
  - Find Calendar's mobile neighbors: Plex (before), Radarr (after)
  - Find Plex on desktop: Y=1, X=0
  - Find Radarr on desktop: Y=2, X=0
  - Place Calendar between: Y=1.5
  - Grid compacts: Calendar Y=2, Radarr pushed to Y=3
  
Desktop:
  - Calendar appears in new row between Plex and Radarr
  - Uses desktop-optimized UI (more padding, larger)
```

**Manual Mode:**
```
Mobile:
  - Add Calendar at y:3
  - Save to database
  
Desktop:
  - NO CHANGE (independent)
  - Calendar doesn't appear on desktop
  - User must manually add it on desktop too
```

⚠️ **Issue:** In Manual mode, adding widget on one breakpoint doesn't add to others. Is this desirable?

**Alternative:** Widget additions ALWAYS sync (across all breakpoints), but POSITIONS are independent in Manual mode.

---

### Test 3: Reorder on Mobile

**Action:** User drags Radarr above Plex on mobile

**Auto Mode:**
```
Mobile Before:
  [Plex] (y:2)
  [Radarr] (y:4)

Mobile After (user drags):
  [Radarr] (y:2)
  [Plex] (y:4)

Desktop Before:
  [Plex] [Sonarr]  (y:1, same band)
  [Radarr] [Weather] (y:2, same band)

Sync to desktop:
  - Radarr new neighbors: before=null, after=Plex
  - Place Radarr before Plex: Y=0
  - Reorder within band OR create new band?
  
  Option A: Create new band (safer)
    [Radarr] (y:0, new band)
    [Plex] [Sonarr] (y:1)
    [Weather] (y:2)
  
  Option B: Reorder in band (complex)
    [Radarr] [Sonarr] (y:1, reordered)
    [Plex] (y:2, moved down)
    [Weather] (y:3)
```

**Decision:** Option A is safer and more predictable.

---

### Test 4: Widget Addition in Manual Mode

**Action:** User in Manual mode adds new widget on mobile

**Proposed Behavior:**
```
Manual Mode (widget additions still sync):
  - Add Calendar on mobile
  - Calendar appears on desktop too (default position/size)
  - But FUTURE edits to position don't sync
  
Alternative (strict independence):
  - Add Calendar on mobile
  - Calendar ONLY on mobile
  - Must manually add on desktop
```

**Recommendation:** Widget list syncs (same widgets on all breakpoints), but positions are independent.

---

### Test 5: Switch Auto → Manual with Diverged Layouts

**Setup:** User been in Auto mode, then customized mobile manually

**Action:** User switches to Manual mode

**Expected:**
```
Current state:
  - Desktop: [A] [B] [C]
  - Mobile: [C] [A] [B]  (reordered)

Switch to Manual:
  - Layouts snapshot as-is
  - Future edits independent
  - No regeneration
```

✅ **Correct:** Preserves current state, just stops syncing

---

### Test 6: Switch Manual → Auto with Very Different Layouts

**Setup:** User in Manual mode, heavily customized both breakpoints

**Action:** User switches back to Auto mode

**Expected:**
```
Current state:
  - Desktop: [A] [B] [C] [D]
  - Mobile: [D] [B] [A]  (C deleted on mobile, different order)

Switch to Auto:
  - Warning: "This will regenerate mobile from desktop. Continue?"
  
  If user confirms:
    - Mobile becomes: [A] [B] [C] [D] (regenerated from desktop)
    - C reappears
    - Order matches desktop
```

⚠️ **Potential Data Loss:** User's manual mobile customization is lost.

**Solution:** Add "Backup Current Mobile Layout" option before switching.

---

## 📊 Final Assessment

### ✅ What Works Great

1. **Bidirectional sync in Auto mode** - Intelligent and useful
2. **Manual mode escape hatch** - Power users can customize
3. **Widget responsive variants** - Better mobile UX
4. **Band detection preservation** - Maintains visual structure

### ⚠️ Edge Cases to Handle

1. **Mobile reorders of side-by-side desktop widgets** - Ambiguous mapping
2. **Widget additions in Manual mode** - Should widget list sync?
3. **Auto → Manual → Auto round-trip** - Potential data loss
4. **Band detection across very different column counts** - Complex math

### 🎯 Recommendations

#### Recommendation 1: Simple First, Complex Later

**Phase 1 (MVP):**
- Auto mode only (no Manual mode yet)
- Desktop edit only (mobile read-only)
- Downward sync only (desktop → mobile)
- Widget responsive variants

**Phase 2 (Advanced):**
- Add mobile editing
- Add upward sync
- Test thoroughly

**Phase 3 (Power Users):**
- Add Manual mode toggle
- Add layout backup/restore
- Add advanced customization

#### Recommendation 2: Clear Rules for Band Detection

**Establish Priority:**
1. **Widget additions:** Always sync across all breakpoints
2. **Position changes in Auto mode:** Sync via band detection
3. **Reorders across bands:** Create new bands, don't reorder within
4. **Ambiguous mappings:** Default to new row (safer)

#### Recommendation 3: Widget Additions Sync Everywhere

**Even in Manual Mode:**
- Adding/deleting widgets syncs across all breakpoints
- Only POSITIONS are independent
- This prevents layouts from having completely different widgets

```javascript
// Widget list is ALWAYS synced
const syncWidgetList = (sourceBreakpoint, widgets) => {
    // Ensure all breakpoints have same widget IDs
    // Only positions differ in Manual mode
};
```

---

## 🚀 Implementation Complexity

### Complexity Rating by Feature

| Feature | Complexity | Time Estimate |
|---------|-----------|---------------|
| Widget responsive variants | Low | 1 week |
| Desktop-only editing | Low | 1 week |
| Downward sync (desktop→mobile) | Medium | 2 weeks |
| Manual mode toggle | Medium | 1 week |
| Upward sync (mobile→desktop) | **High** | 3 weeks |
| Bidirectional sync | **Very High** | 4 weeks |
| Band detection edge cases | **High** | 2 weeks |

**Total for Full Vision:** ~10-14 weeks

**MVP (Phase 1):** ~4 weeks

---

## 💬 Questions for You

1. **Do you want to start with MVP** (Desktop-only, Auto mode, downward sync)?
   - Or go straight for full vision?

2. **Widget additions in Manual mode** - should they sync or not?
   - Option A: Widget list always syncs (same widgets everywhere)
   - Option B: Complete independence (different widgets per breakpoint)

3. **Priority features?**
   - Most important: Responsive widgets, Downward sync, Manual mode, or Upward sync?

4. **Acceptable tradeoffs?**
   - Can we sacrifice some mobile→desktop sync complexity for faster delivery?

---

**I understand your vision completely. It's ambitious but achievable! What do you think?**
