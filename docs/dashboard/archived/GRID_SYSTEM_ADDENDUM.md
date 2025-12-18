# Grid System Spec - Addendum: UX & Technical Refinements

**Created:** 2025-12-04  
**Status:** Addressing user concerns and edge cases  
**Parent Doc:** GRID_SYSTEM_SPEC.md

---

## 🎯 Question 1: Widget Addition on Small → Large Conflict

### The Problem

**Scenario:**
1. User on mobile (xs) adds Calendar widget
2. System adds widget to ALL breakpoints (including lg)
3. On lg, widget is positioned automatically (y: Infinity = bottom)
4. User switches to desktop, doesn't like position
5. User moves widget on desktop (lg)
6. **Does this trickle down and mess up the mobile layout?**

### Answer: YES, This Would Cause Issues

**Current proposed behavior would:**
- User adds on xs → Widget added to lg at bottom
- User edits lg position → Trickles down to xs
- xs layout gets regenerated, loses original mobile placement
- **UX nightmare!**

### Solution: Smart Widget Addition with Layout Context

**Better Behavior:**

```javascript
// When widget added on ANY breakpoint
const addWidgetToAllBreakpoints = (widget, addedOnBreakpoint) => {
    const newWidget = { ...widget };
    
    // 1. Add to the breakpoint where user added it (EXACT position they chose)
    newWidget.layouts[addedOnBreakpoint] = {
        x: widget.x,
        y: widget.y,  // User's chosen position
        w: widget.w,
        h: widget.h
    };
    
    // 2. Mark this breakpoint as CUSTOM (user deliberately placed it)
    newWidget.layoutMeta[addedOnBreakpoint] = {
        isCustom: true,
        isSource: false,
        placedByUser: true  // NEW FLAG
    };
    
    // 3. For LARGER breakpoints: Use widget defaults, place at bottom
    const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const addedIndex = breakpoints.indexOf(addedOnBreakpoint);
    
    breakpoints.slice(0, addedIndex).forEach(largerBp => {
        // Use widget's default size from registry
        const metadata = getWidgetMetadata(widget.type);
        
        newWidget.layouts[largerBp] = {
            x: 0,
            y: Infinity,  // Auto-place at bottom on larger screens
            w: metadata.defaultSize.w,
            h: metadata.defaultSize.h
        };
        
        // NOT custom, but also NOT inheriting (independent)
        newWidget.layoutMeta[largerBp] = {
            isCustom: false,
            isSource: largerBp === 'lg',
            placedByUser: false,
            independentPlacement: true  // NEW: Won't be affected by edits below
        };
    });
    
    // 4. For SMALLER breakpoints: Inherit from where it was added
    breakpoints.slice(addedIndex + 1).forEach(smallerBp => {
        // Generate from the breakpoint where it was added
        newWidget.layouts[smallerBp] = generateScaledLayout(
            newWidget.layouts[addedOnBreakpoint],
            addedOnBreakpoint,
            smallerBp
        );
        
        newWidget.layoutMeta[smallerBp] = {
            isCustom: false,
            inheritsFrom: addedOnBreakpoint,
            placedByUser: false
        };
    });
    
    return newWidget;
};
```

**Result:**
- Widget added on xs (mobile) → Custom on xs
- Shows on lg (desktop) at bottom, NOT custom, independent
- User edits lg → lg becomes custom, doesn't affect xs (independent)
- User edits xs → Regenerates xxs only (downward)
- **Each breakpoint independent where widget was added**

### Enhanced Inheritance Rules

**Rule 1:** Widget added on breakpoint X
- X is marked `custom` + `placedByUser`
- All smaller breakpoints inherit from X
- All larger breakpoints are `independent` (won't be affected by edits on X or below)

**Rule 2:** Editing an independent breakpoint
- Marks it as `custom`
- Affects only smaller non-custom breakpoints
- Doesn't affect the original placement breakpoint

**Example Flow:**
```
1. Add widget on xs (mobile)
   - xs: custom, placedByUser
   - xxs: inherits from xs
   - lg/md/sm: independent

2. Edit widget on lg (desktop)
   - lg: custom (was independent, now custom)
   - md/sm: regenerate from lg (they inherit from lg)
   - xs: UNCHANGED (independent)
   - xxs: UNCHANGED (inherits from xs, not lg)

3. Later edit xs
   - xs: still custom
   - xxs: regenerates from xs
   - lg/md/sm: UNCHANGED (independent)
```

---

## 🎯 Question 2: Padding & Container Structure

### Current Structure Analysis

```html
<!-- Dashboard.jsx line 682 -->
<div className="w-full min-h-screen p-8 max-w-[2000px] mx-auto">
    <!-- This is the OUTER container with padding -->
    
    <header>...</header>
    
    <div ref={gridContainerRef} className="relative min-h-[400px]">
        <!-- This is the GRID container (measured for width) -->
        
        <ResponsiveGridLayout
            containerPadding={[0, 0]}  <!-- No padding inside grid -->
            margin={[16, 16]}          <!-- Gap between cells -->
        >
            {widgets}
        </ResponsiveGridLayout>
    </div>
</div>
```

### The Padding Issue

**Current:**
- Outer container: `p-8` (32px padding all sides)
- Max-width: `2000px`
- Grid container: Direct child, no padding
- GridLayout: `containerPadding={[0, 0]}`

**Problem:**
- When we measure `gridContainerRef.current.offsetWidth`, we get:
  - Container width MINUS the 32px padding from parent? NO!
  - We get the FULL width available to grid container
  - But max-width constrains it to 2000px

**Clarification Needed:**
```javascript
// What are we actually measuring?
const containerWidth = gridContainerRef.current.offsetWidth;

// On a 2560px wide screen:
// - Outer div: 2560px - 64px (p-8 both sides) = 2496px available
// - But max-w-[2000px] caps it at 2000px
// - Grid container: 2000px (full width, no padding)
// - Available for cells: 2000px

// On a 1920px screen:
// - Outer div: 1920px - 64px = 1856px
// - Max-width doesn't apply (under 2000px)
// - Grid container: 1856px
// - Available for cells: 1856px
```

### Proposed: Cleaner Separation

```html
<div className="w-full min-h-screen p-8">
    <!-- Outer container: Just for page padding -->
    
    <div className="max-w-[2000px] mx-auto">
        <!-- Content wrapper: Handles max-width and centering -->
        
        <header>...</header>
        
        <div ref={gridContainerRef} className="relative min-h-[400px]">
            <!-- Grid container: Clean, measurable width -->
            <ResponsiveGridLayout ...>
        </div>
    </div>
</div>
```

**Benefits:**
- Clear separation: padding → max-width wrapper → grid
- `gridContainerRef.offsetWidth` = exact width for calculations
- No padding confusion
- Max-width boundary is clear

### Calculation Impact

**Before (current, potentially wrong):**
```javascript
// Assumes container is full 2000px
const cellWidth = (2000 - (16 * 23)) / 24 = 68px
```

**After (correct):**
```javascript
// Measures actual container
const actualWidth = gridContainerRef.current.offsetWidth;
// Could be 2000px, could be 1856px, could be 1200px on tablet
const cellWidth = (actualWidth - (16 * 23)) / 24;
```

**This might be why cells are taller than wide!**
- We assumed 2000px container
- Actual container is narrower (e.g., 1856px on 1920px screen)
- Cell width calculation is wrong
- Row height matches wrong cell width
- **Cells appear taller because we're using wrong dimensions**

### Solution: Always Measure, Never Assume

```javascript
const calculateCellDimensions = () => {
    // NEVER assume width, always measure
    const measuredWidth = gridContainerRef.current?.offsetWidth || 0;
    
    if (measuredWidth === 0) {
        console.warn('Grid container has no width yet');
        return null;
    }
    
    const cols = GRID_SYSTEM.columns[currentBreakpoint];
    const margin = GRID_SYSTEM.container.margin;
    
    // Use MEASURED width, not max-width
    const cellWidth = (measuredWidth - (margin * (cols - 1))) / cols;
    
    // Calculate rowHeight based on cell sizing strategy
    const rowHeight = calculateRowHeight(cellWidth, currentBreakpoint);
    
    console.log('📐 GRID MEASUREMENTS', {
        measuredWidth,
        cols,
        cellWidth: cellWidth.toFixed(2),
        rowHeight: rowHeight.toFixed(2),
        aspectRatio: (cellWidth / rowHeight).toFixed(3)
    });
    
    return { cellWidth, rowHeight };
};
```

---

## 🎯 Question 3: Widget Content Types & Minimum Sizes

### Widget Content Categories

**1. List Widgets (Vertical Scroll)**
- radarr, sonarr, qbittorrent, upcoming-media
- **Requirement:** Minimum height to show at least 1-2 items
- **Behavior:** Scroll if more items than fit

**2. Carousel Widgets (Horizontal Scroll)**
- overseerr, plex (multiple streams)
- **Requirement:** Minimum width to show 1 complete item
- **Behavior:** Horizontal scroll for more, but 1 item MUST be fully visible

**3. Single-View Widgets (No Scroll)**
- clock, weather, system-status
- **Requirement:** All content visible, no scroll
- **Behavior:** Content scales/adjusts to fit

**4. Grid Widgets (2D Scroll)**
- link-grid, calendar
- **Requirement:** Minimum size to show grid structure
- **Behavior:** Both scrolls if needed

### Enhanced Widget Metadata

```javascript
// In widgetRegistry.js
export const WIDGET_TYPES = {
    'plex': {
        component: PlexWidget,
        icon: Tv,
        name: 'Plex',
        category: 'media',
        
        // Current sizing (grid units)
        defaultSize: { w: 7, h: 4 },
        minSize: { w: 5, h: 4 },
        maxSize: { h: 10 },
        
        // NEW: Content requirements
        contentType: 'carousel-horizontal',
        contentRequirements: {
            // Minimum pixels needed to show 1 stream photo + info
            minContentWidth: 300,   // 16:9 image ~200px + text ~100px
            minContentHeight: 150,  // Image height + title
            preferredAspectRatio: 16/9,
            
            // Scrolling behavior
            scrollDirection: 'horizontal',
            itemsVisibleAtMin: 1,   // At minimum size, show 1 complete item
            
            // Responsive behavior
            respondsToWidth: true,  // More items if wider
            respondsToHeight: false // Height relatively fixed
        },
        
        requiresIntegration: 'plex'
    },
    
    'sonarr': {
        component: SonarrWidget,
        icon: MonitorPlay,
        name: 'Sonarr',
        category: 'media',
        
        defaultSize: { w: 4, h: 4 },
        minSize: { w: 3, h: 3 },
        maxSize: { h: 8 },
        
        // NEW: List widget
        contentType: 'list-vertical',
        contentRequirements: {
            minContentWidth: 200,    // Show title + status
            minContentHeight: 200,   // At least 2-3 items
            itemHeight: 60,          // Per list item
            
            scrollDirection: 'vertical',
            itemsVisibleAtMin: 3,
            
            respondsToWidth: true,   // Wider = more info
            respondsToHeight: true   // Taller = more items
        },
        
        requiresIntegration: 'sonarr'
    },
    
    'clock': {
        component: ClockWidget,
        icon: Clock,
        name: 'Clock',
        category: 'utility',
        
        defaultSize: { w: 3, h: 2 },
        minSize: { w: 2, h: 1 },
        maxSize: { h: 3 },
        
        // NEW: Single view widget
        contentType: 'single-view',
        contentRequirements: {
            minContentWidth: 120,    // Time text width
            minContentHeight: 50,    // Single line of text
            
            scrollDirection: 'none',
            respondsToWidth: true,   // Font size adjusts
            respondsToHeight: true,
            scalesContent: true      // Content zooms to fit
        },
        
        requiresIntegration: false
    }
};
```

### Minimum Size Validation

```javascript
// When calculating if widget can fit
const validateWidgetSize = (widgetType, w, h, breakpoint) => {
    const metadata = getWidgetMetadata(widgetType);
    const contentReq = metadata.contentRequirements;
    
    // Calculate available content space
    const available = calculateContentSpace(w, h, true);
    
    // Check if meets minimum requirements
    const meetsWidth = available.width >= contentReq.minContentWidth;
    const meetsHeight = available.height >= contentReq.minContentHeight;
    
    if (!meetsWidth || !meetsHeight) {
        return {
            valid: false,
            reason: `Widget too small. Need ${contentReq.minContentWidth}×${contentReq.minContentHeight}px, have ${available.width}×${available.height}px`,
            suggestion: {
                w: calculateMinGridWidth(contentReq.minContentWidth, breakpoint),
                h: calculateMinGridHeight(contentReq.minContentHeight, breakpoint)
            }
        };
    }
    
    return { valid: true };
};

// Helper to calculate grid units needed for pixel requirement
const calculateMinGridWidth = (pixelsNeeded, breakpoint) => {
    const { cellWidth } = getCellDimensions(breakpoint);
    const margin = GRID_SYSTEM.container.margin;
    const chrome = GRID_SYSTEM.chrome;
    
    // Work backwards: pixels → widget width → grid units
    const widgetWidth = pixelsNeeded + (chrome.card * 2) + (chrome.widgetContent * 2);
    
    // Solve: widgetWidth = (cellWidth × w) + (margin × (w - 1))
    // widgetWidth = cellWidth × w + margin × w - margin
    // widgetWidth + margin = w × (cellWidth + margin)
    const w = Math.ceil((widgetWidth + margin) / (cellWidth + margin));
    
    return w;
};
```

### Plex Widget Specific: Minimum for 1 Stream

```javascript
// In PlexWidget.jsx
const PlexWidget = ({ config, widgetId }) => {
    const { calculateContentSpace } = useGridConfig();
    
    // Get widget's current size from layout
    const widgetLayout = getWidgetLayout(widgetId);
    const available = calculateContentSpace(widgetLayout.w, widgetLayout.h, true);
    
    // Calculate card dimensions for 1 stream
    const STREAM_IMAGE_ASPECT = 16/9;
    const MIN_IMAGE_WIDTH = 200;
    const INFO_WIDTH = 100;
    const MIN_TOTAL_WIDTH = MIN_IMAGE_WIDTH + INFO_WIDTH;
    
    // Check if we can fit 1 complete stream
    const canFitOneStream = available.width >= MIN_TOTAL_WIDTH;
    
    if (!canFitOneStream) {
        return (
            <div className="text-warning">
                Widget too small. Resize to at least 5×4 to show streams.
            </div>
        );
    }
    
    // Calculate how many streams can fit horizontally
    const streamsVisible = Math.floor(available.width / MIN_TOTAL_WIDTH);
    
    // Calculate card dimensions
    const cardWidth = Math.min(
        MIN_TOTAL_WIDTH,
        available.width / Math.max(1, streams.length)
    );
    const cardHeight = (cardWidth * 0.7) / STREAM_IMAGE_ASPECT; // 70% for image
    
    return (
        <div className="flex gap-4 overflow-x-auto" style={{ height: available.height }}>
            {streams.map(stream => (
                <StreamCard 
                    key={stream.id}
                    stream={stream}
                    width={cardWidth}
                    height={cardHeight}
                />
            ))}
        </div>
    );
};
```

---

## 🎯 Question 4: Squishing vs Row Wrapping

### react-grid-layout Behavior

**Current Setting:**
```javascript
compactType: 'vertical'  // Items compact UPWARD, no horizontal squishing
```

**What This Means:**
- Widgets CAN overlap horizontally if you drag them there
- But `compactType: 'vertical'` pushes them upward to fill gaps
- Does NOT automatically wrap to new row when too wide

### The Problem

**Scenario:**
- 24-column grid
- Widget A: 18 cols wide at x:0
- Widget B: 10 cols wide
- User tries to place Widget B next to Widget A
- **Result:** They overlap! (18 + 10 = 28 > 24)

**react-grid-layout doesn't auto-wrap**. It just prevents the placement or allows overlap based on `preventCollision`.

### Current Setting

```javascript
preventCollision: false  // Allows overlaps
```

**This is BAD for our UX!** Users can accidentally create overlapping widgets.

### Solution: Enable Collision Prevention

```javascript
preventCollision: true  // Prevents overlaps
```

**New Behavior:**
- Widget A: 18 cols at x:0
- User drags Widget B (10 cols) next to it
- Grid detects collision (18 + 10 > 24)
- Widget B "snaps" to next available position (x:0, y after Widget A)
- **Automatically wraps to new row!**

### Responsive Squishing Behavior

**What we want:**
- Desktop (24 cols): Widgets side-by-side if they fit
- Tablet (24 cols, narrower cells): Still side-by-side
- Mobile (6 cols): Automatic stacking (not enough room for side-by-side)

**This happens automatically with breakpoints!**
- lg: `w: 12` (half width) → Shows 2 widgets per row
- xs: `w: 6` (full width on 6-col grid) → Shows 1 widget per row

**No "squishing" needed** - just different column counts per breakpoint.

### When to Force Full Row

**Some widgets should ALWAYS be full-width on mobile:**

```javascript
// In layoutUtils.js - mobile generation
const generateMobileLayout = (widgets, breakpoint) => {
    return widgets.map(w => {
        const metadata = getWidgetMetadata(w.type);
        const targetCols = GRID_SYSTEM.columns[breakpoint];
        
        // Check if widget should be full-width on this breakpoint
        const shouldBeFullWidth = 
            breakpoint === 'xs' || 
            breakpoint === 'xxs' ||
            metadata.contentRequirements?.fullWidthOnMobile;
        
        const width = shouldBeFullWidth ? targetCols : calculateScaledWidth(w, breakpoint);
        
        return {
            ...w,
            layouts: {
                ...w.layouts,
                [breakpoint]: {
                    x: 0,  // Always start at left on mobile
                    y: calculateY(w, breakpoint),
                    w: width,
                    h: calculateScaledHeight(w, breakpoint)
                }
            }
        };
    });
};
```

---

## 🎯 Question 5: Git Branch Management

### Your Situation

**Current State:**
- On `develop` branch
- Multiple commits since `209261719834b20303168bd16edd13d54f770efe`
- Want to move all those commits to a new `feat/grid-redesign` branch
- Those commits have "awful attempts" that you want to clean up

### Solution: Create Feature Branch from Specific Commit

**Step-by-Step (SAFE method):**

```bash
# 1. First, check current status
git status
git log --oneline -10  # See recent commits

# 2. Create a new branch FROM the commit BEFORE your grid work
#    (This creates the branch but doesn't switch to it yet)
git branch feat/grid-redesign 209261719834b20303168bd16edd13d54f770efe

# 3. Now you have two options:

## Option A: Keep develop as-is, work on feature branch
git checkout feat/grid-redesign
# Now your feature branch has all the commits after 20926171...
# develop still has them too (branches diverged)

## Option B: Reset develop to before your commits (DESTRUCTIVE)
# First, make sure you're on develop
git checkout develop

# Reset develop to the commit before your work (DANGER: loses commits on develop)
git reset --hard 209261719834b20303168bd16edd13d54f770efe

# But don't worry, commits are safe on feat/grid-redesign
# You can always merge them back later
```

### Recommended Approach: Clean Feature Branch

Since you said those commits are "awful attempts", let's do a CLEAN slate:

```bash
# 1. Create a new feature branch from the GOOD commit
git checkout -b feat/grid-redesign 209261719834b20303168bd16edd13d54f770efe

# This creates AND switches to the new branch
# You're now on feat/grid-redesign
# It has NONE of the "awful attempts" commits

# 2. Make sure you're on the right commit
git log --oneline -5
# Should show 20926171... as the latest commit

# 3. Now develop still has the bad commits
# Reset develop to clean state
git checkout develop
git reset --hard 209261719834b20303168bd16edd13d54f770efe

# 4. Push the reset develop (CAREFUL: force push)
git push origin develop --force

# 5. Switch back to feature branch to do new work
git checkout feat/grid-redesign

# 6. Create the branch on remote
git push origin feat/grid-redesign

# 7. Set upstream tracking
git branch --set-upstream-to=origin/feat/grid-redesign feat/grid-redesign
```

### Safer Alternative: Keep Bad Commits in Separate Branch

```bash
# 1. Rename current develop to archive branch
git branch archive/grid-attempts develop

# 2. Reset develop to good state
git checkout develop
git reset --hard 209261719834b20303168bd16edd13d54f770efe
git push origin develop --force

# 3. Create new feature branch
git checkout -b feat/grid-redesign

# 4. Push everything
git push origin archive/grid-attempts  # Save the bad commits
git push origin feat/grid-redesign      # Your new clean branch

# Now you have:
# - develop: clean at 20926171...
# - feat/grid-redesign: clean, ready for new work
# - archive/grid-attempts: has the old attempts (safe, can delete later)
```

### After Implementation

```bash
# When grid redesign is complete and tested:
git checkout develop
git merge feat/grid-redesign

# Or create a pull request on GitHub (if using)
```

### Safety First

**Before any `git reset --hard` or `git push --force`:**

```bash
# Create a backup branch
git branch backup-before-reset

# If something goes wrong, you can always:
git checkout develop
git reset --hard backup-before-reset
```

---

## 📝 Summary of Answers

### Q1: Widget Addition Conflicts
**Solution:** Independent placement flags
- Widget added on xs → xs is custom, lg is independent
- Editing lg later doesn't affect xs
- Each breakpoint maintains autonomy where widget was placed

### Q2: Padding Issues
**Solution:** Cleaner container structure
- Separate padding layer from grid container
- Always measure, never assume width
- This might be WHY cells are taller (wrong width assumption)

### Q3: Widget Content Types
**Solution:** Enhanced metadata with content requirements
- Different content types (list, carousel, single-view)
- Minimum pixel requirements
- Validation before resize

### Q4: Squishing vs Wrapping
**Solution:** Enable `preventCollision: true`
- Automatic wrap to new row when too wide
- Breakpoint-based column counts handle responsive sizing
- No "squishing" needed

### Q5: Git Branch Management
**Solution:** Create clean feature branch
- Branch from commit before "awful attempts"
- Move bad commits to archive branch (or discard)
- Start fresh on feat/grid-redesign

---

**Ready for your review. Any of these solutions need adjustment?**
