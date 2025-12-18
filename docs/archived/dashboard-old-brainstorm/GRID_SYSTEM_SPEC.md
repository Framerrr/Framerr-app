# Dashboard Grid System - Technical Specification

**Created:** 2025-12-04  
**Status:** Technical Analysis & Scenario Testing  
**Goal:** Design bulletproof grid system with consistent sizing and intelligent responsive behavior

---

## 🎯 Design Decisions (Based on User Input)

### ✅ Confirmed Decisions

1. **Cell Aspect Ratio:** Not fixed to 1:1, but must be **consistent and intentional**
   - Can be different per breakpoint (e.g., 1:1 on lg, 4:3 on md)
   - Must scale predictably
   - Math must be explicit and documented

2. **Editing Flow:** **Downward inheritance with selective override**
   - Desktop (lg) is the "source of truth"
   - Edits on lg trickle down to md/sm/xs/xxs
   - Edits on smaller breakpoints DON'T affect larger ones
   - Adding widget on ANY breakpoint adds to ALL breakpoints

3. **Column Configuration:** **Developer-configurable, not end-user**
   - Not tied to 24 (can change)
   - Changeable in codebase with minimal edits
   - Breakpoint-specific column counts
   - Auto-scaling of existing layouts

4. **Priority:** **All problems are equally critical** (they're interconnected)

---

## 🔍 Root Cause Analysis: "Cells Are Taller Than Wide"

### Current ResizeObserver Logic

```javascript
// Lines 64-85 in Dashboard.jsx
const calculateRowHeight = () => {
    const containerWidth = gridContainerRef.current.offsetWidth;
    const calculatedColWidth = (containerWidth - (16 * (GRID_CONFIG.cols - 1))) / GRID_CONFIG.cols;
    setDynamicRowHeight(calculatedColWidth);
};
```

**Expected Result:** If container is 2000px:
- Column width: `(2000 - 16×23) / 24 = (2000 - 368) / 24 = 68px`
- Row height: `68px` (set equal to column width)
- **Should produce 1:1 squares**

### Problem: Why Are Cells Taller?

**Hypothesis 1: The calculation is actually working backwards**

The formula subtracts margins from container width:
```
colWidth = (containerWidth - margins) / cols
```

But react-grid-layout might be doing:
```
cellWidth = containerWidth / cols
// Then adding margins BETWEEN cells
```

This would mean:
- Our calculation: 68px (accounts for margins)
- Actual cell: `2000 / 24 = 83.33px` (doesn't account for margins)
- Our rowHeight: 68px (matches our wrong calculation)
- **Result: Cells are 83.33px wide × 68px tall = NOT square**

**Hypothesis 2: Container width measurement is wrong**

`gridContainerRef.current.offsetWidth` might not be 2000px:
- Could be viewport width (e.g., 1920px on full HD screen)
- Could be affected by parent padding
- Could be measured before layout settles

**Hypothesis 3: Margins are applied differently**

react-grid-layout's `margin: [16, 16]` might work differently than we think:
- `[horizontal, vertical]` spacing
- Applied INSIDE cells, not between?
- Different formula for cell dimensions?

### Investigation Plan

**Step 1: Measure actual values**
```javascript
const calculateRowHeight = () => {
    const containerWidth = gridContainerRef.current.offsetWidth;
    
    // DEBUG: Log everything
    console.log('━━━ GRID MEASUREMENTS ━━━');
    console.log('Container offsetWidth:', containerWidth);
    console.log('Container clientWidth:', gridContainerRef.current.clientWidth);
    console.log('Container scrollWidth:', gridContainerRef.current.scrollWidth);
    console.log('Max-width CSS:', window.getComputedStyle(gridContainerRef.current).maxWidth);
    
    // Try different formulas
    const formulaA = (containerWidth - (16 * 23)) / 24;
    const formulaB = containerWidth / 24;
    const formulaC = (containerWidth - (16 * 24)) / 24;
    
    console.log('Formula A (current):', formulaA);
    console.log('Formula B (no margin subtract):', formulaB);
    console.log('Formula C (margin per cell):', formulaC);
    
    // Measure actual first cell
    setTimeout(() => {
        const firstCell = document.querySelector('.react-grid-item');
        if (firstCell) {
            const rect = firstCell.getBoundingClientRect();
            console.log('First cell actual dimensions:', rect.width, '×', rect.height);
            console.log('Aspect ratio:', (rect.width / rect.height).toFixed(3));
        }
    }, 100);
};
```

**Step 2: Fix based on findings**
- Use correct formula for react-grid-layout
- Account for actual margin behavior
- Ensure rowHeight matches actual cell width

---

## 🏗️ Proposed Architecture

### 1. Centralized Grid Configuration

```javascript
// src/config/gridSystem.js
export const GRID_SYSTEM = {
    // Column configuration per breakpoint
    columns: {
        lg: 24,    // Desktop: 24 columns
        md: 24,    // Tablet landscape: 24 columns
        sm: 24,    // Tablet portrait: 24 columns  
        xs: 6,     // Large phone: 6 columns (partial stacking)
        xxs: 2     // Small phone: 2 columns (full stack)
    },
    
    // Container constraints
    container: {
        maxWidth: 2000,      // Maximum container width
        padding: [0, 0],     // Container padding [horizontal, vertical]
        margin: 16           // Gap between cells
    },
    
    // Cell sizing strategy per breakpoint
    cellSizing: {
        lg: {
            mode: 'dynamic',           // 'dynamic' | 'fixed' | 'aspect-ratio'
            aspectRatio: 1,            // Target aspect ratio (1 = square)
            formula: 'match-width',    // How to calculate rowHeight
            minCellWidth: 60,          // Minimum cell width
            maxCellWidth: 120          // Maximum cell width
        },
        md: {
            mode: 'dynamic',
            aspectRatio: 1,
            formula: 'match-width'
        },
        sm: {
            mode: 'dynamic',
            aspectRatio: 4/3,          // Slightly wider cells on small tablets
            formula: 'aspect-ratio'
        },
        xs: {
            mode: 'fixed',
            rowHeight: 100,            // Fixed height for stacked layout
            formula: 'fixed'
        },
        xxs: {
            mode: 'fixed',
            rowHeight: 120,
            formula: 'fixed'
        }
    },
    
    // Padding consumed by widget chrome (Card, WidgetWrapper, etc.)
    chrome: {
        card: 24,              // Card padding (p-6)
        widgetContent: 16,     // Widget content padding (p-4)
        widgetContainer: 4,    // Widget internal container
        widgetHeader: 52       // Widget header height
    }
};
```

### 2. Enhanced GridConfigContext

```javascript
// src/context/GridConfigContext.jsx
import { GRID_SYSTEM } from '../config/gridSystem';

export const GridConfigProvider = ({ children }) => {
    const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
    const [measuredDimensions, setMeasuredDimensions] = useState({});
    const gridContainerRef = useRef(null);
    
    // Calculate cell dimensions for current breakpoint
    const calculateCellDimensions = useCallback((breakpoint, containerWidth) => {
        const cols = GRID_SYSTEM.columns[breakpoint];
        const margin = GRID_SYSTEM.container.margin;
        const sizing = GRID_SYSTEM.cellSizing[breakpoint];
        
        // Calculate column width
        // react-grid-layout formula: cellWidth = (containerWidth - margin × (cols - 1)) / cols
        const cellWidth = (containerWidth - (margin * (cols - 1))) / cols;
        
        // Calculate row height based on strategy
        let rowHeight;
        switch (sizing.mode) {
            case 'dynamic':
                if (sizing.formula === 'match-width') {
                    rowHeight = cellWidth;  // 1:1 squares
                } else if (sizing.formula === 'aspect-ratio') {
                    rowHeight = cellWidth / sizing.aspectRatio;  // e.g., 4:3
                }
                break;
            case 'fixed':
                rowHeight = sizing.rowHeight;
                break;
            case 'aspect-ratio':
                rowHeight = cellWidth / sizing.aspectRatio;
                break;
        }
        
        // Validate against min/max
        const validatedCellWidth = Math.max(
            sizing.minCellWidth || 0,
            Math.min(cellWidth, sizing.maxCellWidth || Infinity)
        );
        
        return {
            cellWidth: validatedCellWidth,
            rowHeight,
            actualAspectRatio: validatedCellWidth / rowHeight,
            targetAspectRatio: sizing.aspectRatio,
            isWithinTolerance: Math.abs(
                (validatedCellWidth / rowHeight) - sizing.aspectRatio
            ) < 0.01
        };
    }, []);
    
    // ResizeObserver to dynamically update
    useEffect(() => {
        if (!gridContainerRef.current) return;
        
        const updateDimensions = () => {
            const containerWidth = gridContainerRef.current.offsetWidth;
            const dimensions = calculateCellDimensions(currentBreakpoint, containerWidth);
            
            setMeasuredDimensions(prev => ({
                ...prev,
                [currentBreakpoint]: {
                    ...dimensions,
                    containerWidth,
                    measuredAt: Date.now()
                }
            }));
        };
        
        const observer = new ResizeObserver(updateDimensions);
        observer.observe(gridContainerRef.current);
        updateDimensions(); // Initial measurement
        
        return () => observer.disconnect();
    }, [currentBreakpoint, calculateCellDimensions]);
    
    // Calculate available content space (accounting for chrome)
    const calculateContentSpace = useCallback((w, h, hasHeader = true) => {
        const dims = measuredDimensions[currentBreakpoint];
        if (!dims) return { width: 0, height: 0 };
        
        const { cellWidth, rowHeight } = dims;
        const margin = GRID_SYSTEM.container.margin;
        const chrome = GRID_SYSTEM.chrome;
        
        // Total widget dimensions (including inter-cell margins)
        const widgetWidth = (cellWidth * w) + (margin * (w - 1));
        const widgetHeight = (rowHeight * h) + (margin * (h - 1));
        
        // Subtract chrome (padding layers)
        const horizontalChrome = (chrome.card * 2) + (chrome.widgetContent * 2) + (chrome.widgetContainer * 2);
        const verticalChrome = (chrome.card * 2) + (chrome.widgetContent * 2) + (chrome.widgetContainer * 2) + (hasHeader ? chrome.widgetHeader : 0);
        
        return {
            width: widgetWidth - horizontalChrome,
            height: widgetHeight - verticalChrome,
            aspectRatio: (widgetWidth - horizontalChrome) / (widgetHeight - verticalChrome),
            debug: {
                widgetWidth,
                widgetHeight,
                horizontalChrome,
                verticalChrome
            }
        };
    }, [currentBreakpoint, measuredDimensions]);
    
    const value = {
        system: GRID_SYSTEM,
        currentBreakpoint,
        setCurrentBreakpoint,
        measuredDimensions,
        gridContainerRef,
        calculateCellDimensions,
        calculateContentSpace,
        
        // Convenience accessors
        get currentColumns() {
            return GRID_SYSTEM.columns[currentBreakpoint];
        },
        get currentRowHeight() {
            return measuredDimensions[currentBreakpoint]?.rowHeight || 68;
        },
        get currentCellWidth() {
            return measuredDimensions[currentBreakpoint]?.cellWidth || 68;
        }
    };
    
    return (
        <GridConfigContext.Provider value={value}>
            {children}
        </GridConfigContext.Provider>
    );
};
```

### 3. Layout Inheritance System

```javascript
// src/utils/layoutInheritance.js

/**
 * Layout metadata tracks inheritance relationships
 */
export const LAYOUT_META_INITIAL = {
    lg: { isCustom: false, isSource: true, inheritsFrom: null },
    md: { isCustom: false, isSource: false, inheritsFrom: 'lg' },
    sm: { isCustom: false, isSource: false, inheritsFrom: 'lg' },
    xs: { isCustom: false, isSource: false, inheritsFrom: 'lg' },
    xxs: { isCustom: false, isSource: false, inheritsFrom: 'lg' }
};

/**
 * Determine which breakpoints need regeneration when a breakpoint is edited
 * 
 * @param {string} editedBreakpoint - The breakpoint that was edited
 * @param {object} layoutMeta - Current layout metadata
 * @returns {string[]} Array of breakpoints to regenerate
 */
export const getAffectedBreakpoints = (editedBreakpoint, layoutMeta) => {
    const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const editedIndex = breakpoints.indexOf(editedBreakpoint);
    
    // Downward inheritance: only affect smaller breakpoints
    const affectedBreakpoints = breakpoints
        .slice(editedIndex + 1)  // All breakpoints smaller than edited one
        .filter(bp => {
            // Only regenerate if:
            // 1. Not custom (still inheriting)
            // 2. Inherits from edited breakpoint (directly or indirectly)
            return !layoutMeta[bp].isCustom && 
                   isInheritedFrom(bp, editedBreakpoint, layoutMeta);
        });
    
    return affectedBreakpoints;
};

/**
 * Check if a breakpoint inherits from another (direct or indirect)
 */
const isInheritedFrom = (breakpoint, source, layoutMeta) => {
    let current = breakpoint;
    while (current) {
        const meta = layoutMeta[current];
        if (meta.inheritsFrom === source) return true;
        if (meta.inheritsFrom === null) return false;
        current = meta.inheritsFrom;
    }
    return false;
};

/**
 * Generate layout for a breakpoint based on its source
 */
export const generateInheritedLayout = (widgets, targetBreakpoint, sourceBreakpoint, layoutMeta) => {
    const targetCols = GRID_SYSTEM.columns[targetBreakpoint];
    const sourceCols = GRID_SYSTEM.columns[sourceBreakpoint];
    
    // If same column count, copy directly with potential aspect ratio adjustment
    if (targetCols === sourceCols) {
        return widgets.map(w => ({
            ...w,
            layouts: {
                ...w.layouts,
                [targetBreakpoint]: { ...w.layouts[sourceBreakpoint] }
            }
        }));
    }
    
    // Different column counts: scale proportionally
    const scaleFactor = targetCols / sourceCols;
    
    return widgets.map(w => {
        const sourceLayout = w.layouts[sourceBreakpoint];
        return {
            ...w,
            layouts: {
                ...w.layouts,
                [targetBreakpoint]: {
                    x: Math.round(sourceLayout.x * scaleFactor),
                    y: sourceLayout.y,  // Y position unchanged
                    w: Math.round(sourceLayout.w * scaleFactor),
                    h: calculateScaledHeight(sourceLayout.h, sourceBreakpoint, targetBreakpoint)
                }
            }
        };
    });
};

/**
 * Calculate scaled height accounting for different cell aspect ratios
 */
const calculateScaledHeight = (sourceHeight, sourceBp, targetBp) => {
    const sourceAspect = GRID_SYSTEM.cellSizing[sourceBp].aspectRatio;
    const targetAspect = GRID_SYSTEM.cellSizing[targetBp].aspectRatio;
    
    // If aspect ratios are the same, height doesn't change
    if (sourceAspect === targetAspect) return sourceHeight;
    
    // Scale height to maintain similar visual proportion
    const scaleFactor = sourceAspect / targetAspect;
    return Math.max(1, Math.round(sourceHeight * scaleFactor));
};

/**
 * Handle widget addition across all breakpoints
 */
export const addWidgetToAllBreakpoints = (widget, currentBreakpoint, allWidgets, layoutMeta) => {
    const breakpoints = ['lg', 'md', 'sm', 'xs', 'xxs'];
    const newWidget = { ...widget, layouts: {} };
    
    // Add to current breakpoint first (where user added it)
    newWidget.layouts[currentBreakpoint] = {
        x: widget.x || 0,
        y: widget.y || Infinity,  // Place at bottom
        w: widget.w,
        h: widget.h
    };
    
    // Propagate to all other breakpoints based on inheritance
    breakpoints.forEach(bp => {
        if (bp === currentBreakpoint) return; // Already done
        
        // Determine source breakpoint for this target
        const source = bp > currentBreakpoint ? currentBreakpoint : 'lg';
        
        // Generate layout for this breakpoint
        const sourceCols = GRID_SYSTEM.columns[source];
        const targetCols = GRID_SYSTEM.columns[bp];
        const scaleFactor = targetCols / sourceCols;
        
        newWidget.layouts[bp] = {
            x: Math.round((newWidget.layouts[source]?.x || 0) * scaleFactor),
            y: newWidget.layouts[source]?.y || Infinity,
            w: Math.round((newWidget.layouts[source]?.w || widget.w) * scaleFactor),
            h: calculateScaledHeight(
                newWidget.layouts[source]?.h || widget.h,
                source,
                bp
            )
        };
    });
    
    return newWidget;
};
```

---

## 🧪 Scenario Testing

### Scenario 1: Add Widget on Desktop

**User Action:** Adds Plex widget (7×4) on desktop (lg)

**Expected Behavior:**
```
1. Widget created with lg layout: { x: 0, y: 0, w: 7, h: 4 }
2. System checks inheritance:
   - md inherits from lg → Generate md layout (7×4, same cols)
   - sm inherits from lg → Generate sm layout (7×4, same cols)
   - xs inherits from lg → Generate xs layout (6 cols total, scale down)
   - xxs inherits from lg → Generate xxs layout (2 cols, full width)

3. xs scaling calculation:
   - Source: 24 cols, widget is 7 wide (29% of grid)
   - Target: 6 cols, 29% = 1.75 cols → Round to 2 cols
   - Height: Adjust for 100px fixed rowHeight

4. xxs scaling:
   - 2 cols total → Widget takes full width (2 cols)
   - Height: 120px fixed rowHeight

5. All layouts have layoutMeta.isCustom = false
```

**Result:**
- Widget appears on all breakpoints
- Properly scaled for each
- All inherit from lg

---

### Scenario 2: Edit Widget on Tablet

**User Action:** Resizes widget from 7×4 → 10×6 on tablet (md)

**Expected Behavior:**
```
1. md layout updated: { x: 0, y: 0, w: 10, h: 6 }
2. md layoutMeta.isCustom set to true
3. md layoutMeta.inheritsFrom set to null

4. System checks which breakpoints are affected:
   - lg: Not affected (edit on smaller doesn't affect larger)
   - sm: Check if inherits from md → No, inherits from lg → Not affected
   - xs: Check if inherits from md → No, inherits from lg → Not affected
   - xxs: Check if inherits from md → No, inherits from lg → Not affected

5. UI shows badge: "Custom MD layout" with "Reset to Desktop" button
```

**Result:**
- lg stays 7×4 (downward-only inheritance)
- md is now 10×6 (custom)
- sm/xs/xxs still inherit from lg (not md)
- User can reset md to match lg if desired

---

### Scenario 3: Edit Widget on Desktop After Making Tablet Custom

**User Action:** After scenario 2, user goes to desktop and changes lg from 7×4 → 12×8

**Expected Behavior:**
```
1. lg layout updated: { x: 0, y: 0, w: 12, h: 8 }

2. System checks affected breakpoints:
   - md: Has isCustom = true → Skip (user wants it different)
   - sm: Has isCustom = false, inheritsFrom = 'lg' → Regenerate as 12×8
   - xs: Has isCustom = false, inheritsFrom = 'lg' → Regenerate (scaled)
   - xxs: Has isCustom = false, inheritsFrom = 'lg' → Regenerate (scaled)

3. md remains 10×6 (custom, unaffected)
4. sm becomes 12×8 (same cols, direct copy)
5. xs becomes scaled version of 12×8
6. xxs becomes scaled version of 12×8
```

**Result:**
- lg: 12×8 (edited)
- md: 10×6 (custom, unchanged) ← Different from lg!
- sm: 12×8 (inherited from lg)
- xs: Scaled from lg
- xxs: Scaled from lg

---

### Scenario 4: Add Widget on Mobile

**User Action:** Adds Calendar widget (6×5) on mobile (xs)

**Expected Behavior:**
```
1. Widget created with xs layout: { x: 0, y: Infinity, w: 6, h: 5 }
   (6 cols on xs = full width)

2. System propagates:
   a) To lg (upward): Scale from 6 cols → 24 cols
      - 6 cols (full width on xs) → 24 cols (full width on lg)? No.
      - Better: Use widget's default size (6×5 from registry)
   
   b) To md/sm: Inherit from lg (6×5)
   
   c) To xxs: Scale from xs
      - 6 cols → 2 cols (still full width)
      - Height: Adjust for fixed 120px

3. Result:
   - lg: 6×5 (from default, not scaled from xs)
   - md: 6×5 (inherited from lg)
   - sm: 6×5 (inherited from lg)
   - xs: 6×5 (where it was added, full width on 6-col grid)
   - xxs: 2×5 (full width on 2-col grid)
```

**Edge Case Handling:**
- xs full-width (6 cols) should NOT scale to lg full-width (24 cols)
- Instead, use widget's default size from registry
- This prevents mobile additions from creating giant desktop widgets

---

### Scenario 5: Change Column Count (Developer)

**User Action:** Developer changes `GRID_SYSTEM.columns.lg` from 24 → 12

**Expected Behavior:**
```
1. System detects column count change
2. Migration function runs:
   - All lg widgets scaled: x, w divided by 2
   - y, h unchanged
   
3. Affected widgets:
   - Widget at x:12, w:6 → x:6, w:3
   - Widget at x:0, w:10 → x:0, w:5
   
4. Inheritance regeneration:
   - All breakpoints inheriting from lg regenerate
   - Custom breakpoints (isCustom = true) are NOT regenerated
   - User warned: "Column count changed, custom layouts may need adjustment"
   
5. UI prompt:
   "Column count changed from 24 to 12. Regenerate all layouts? 
    - Yes: Reset all to defaults (clears custom flags)
    - No: Keep custom layouts as-is, regenerate inherited only
    - Review: See affected widgets"
```

**Safety Checks:**
- Validate new column count (min: 1, max: 48)
- Check if any widgets would exceed new grid width
- Offer to resize oversized widgets
- Create backup before migration

---

### Scenario 6: Breakpoint with Different Aspect Ratio

**User Action:** View dashboard on sm (tablet portrait) with 4:3 cells

**Expected Behavior:**
```
1. sm cellSizing.aspectRatio = 4/3 (from GRID_SYSTEM)
2. Container width: 800px

3. Cell calculation:
   - Cols: 24
   - Margin: 16px
   - cellWidth = (800 - 16×23) / 24 = (800 - 368) / 24 = 18px
   - rowHeight = cellWidth / aspectRatio = 18 / (4/3) = 13.5px

4. Widget 7×4:
   - Width: (18 * 7) + (16 * 6) = 126 + 96 = 222px
   - Height: (13.5 * 4) + (16 * 3) = 54 + 48 = 102px
   - Visual aspect ratio: 222/102 = 2.18:1 (wider than tall)

5. Content space (with header):
   - Available width: 222 - 88 (chrome) = 134px
   - Available height: 102 - 140 (chrome + header) = -38px ❌ PROBLEM!
```

**Issue Found:**
- 4:3 cells with small screen = very short cells
- Widget chrome (140px vertical) exceeds total widget height!
- Need minimum heights or different chrome strategy

**Solution:**
- Set `minCellHeight` for each breakpoint
- Reduce chrome on smaller breakpoints
- Or use fixed heights on sm/xs/xxs (not aspect ratios)

---

### Scenario 7: Widget Visibility (Hide When Empty)

**User Action:** Plex widget is empty, hideWhenEmpty = true

**Expected Behavior:**
```
1. Widget fires visibility event: isVisible = false
2. Dashboard updates widgetVisibility[widgetId] = false

3. Grid behavior:
   - Widget stays in layouts array (maintains position)
   - CSS sets height to 0.001px (minimum to stay in DOM)
   - Other widgets compact upward (compactType: 'vertical')

4. On all breakpoints:
   - lg: Height = 0.001, widgets compact
   - md: Same (if inheriting) or custom (if independent)
   - xs/xxs: Stacked layout, widget effectively hidden

5. Widget remounts (data arrives):
   - Fires isVisible = true
   - Grid restores original height
   - Other widgets shift down to make room
```

**Edge Case:**
- What if ALL widgets are hidden?
- Show empty dashboard placeholder
- But keep grid mounted (so widgets can unhide)

---

### Scenario 8: Rapid Breakpoint Switching

**User Action:** User resizes browser window quickly: lg → md → sm → md → lg

**Expected Behavior:**
```
1. Each breakpoint change triggers:
   - onBreakpointChange(newBreakpoint)
   - ResizeObserver fires
   - New dimensions calculated
   - Layouts switched via react-grid-layout

2. Performance considerations:
   - Debounce dimension calculations (100ms)
   - Memoize layout generation
   - Don't regenerate if already have layout
   
3. State consistency:
   - currentBreakpoint updated
   - measuredDimensions[bp] cached
   - No layout regeneration needed (all exist)

4. Edit mode:
   - If in edit mode, stay in edit mode
   - Unsaved changes persist across breakpoint switches
   - Save applies to ALL breakpoints
```

**Optimization:**
- Cache calculated dimensions per breakpoint
- Only recalculate if container width actually changed
- Use RAF for smoother transitions

---

## 🛡️ Edge Cases & Safeguards

### Edge Case 1: Widget Larger Than Grid

**Scenario:** Widget is 30 cols wide, but grid is only 24 cols

**Safeguard:**
```javascript
const clampToGrid = (layout, breakpoint) => {
    const maxCols = GRID_SYSTEM.columns[breakpoint];
    return {
        ...layout,
        x: Math.min(layout.x, maxCols - 1),
        w: Math.min(layout.w, maxCols),
        // Adjust x if widget extends beyond
        x: layout.x + layout.w > maxCols 
            ? Math.max(0, maxCols - layout.w)
            : layout.x
    };
};
```

### Edge Case 2: Negative Dimensions

**Scenario:** After chrome subtraction, content space is negative

**Safeguard:**
```javascript
const calculateContentSpace = (w, h, hasHeader) => {
    const raw = calculateRaw(w, h, hasHeader);
    return {
        width: Math.max(50, raw.width),    // Minimum 50px
        height: Math.max(50, raw.height),
        isConstrained: raw.width < 50 || raw.height < 50
    };
};

// Warn developers
if (isConstrained) {
    console.warn(
        `Widget ${widgetType} at ${w}×${h} has insufficient space. ` +
        `Consider increasing minSize in widgetRegistry.`
    );
}
```

### Edge Case 3: Zero-Width Container

**Scenario:** Container measured before visible

**Safeguard:**
```javascript
const calculateRowHeight = () => {
    const width = gridContainerRef.current?.offsetWidth || 0;
    if (width === 0) {
        // Retry after layout settles
        requestAnimationFrame(() => calculateRowHeight());
        return;
    }
    // ... proceed with calculation
};
```

### Edge Case 4: Concurrent Edits (Multi-Tab)

**Scenario:** User has dashboard open in 2 tabs, edits in both

**Safeguard:**
```javascript
// Optimistic locking
const handleSave = async (widgets) => {
    const response = await axios.put('/api/widgets', {
        widgets,
        lastModified: localLastModified
    });
    
    if (response.status === 409) {
        // Conflict detected
        alert('Dashboard was modified in another tab. Reload to see changes?');
        // Offer to merge or reload
    }
};

// Backend checks lastModified timestamp
```

### Edge Case 5: Layout Inheritance Loop

**Scenario:** Somehow md inheritsFrom sm, sm inheritsFrom md (cyclic)

**Safeguard:**
```javascript
const validateLayoutMeta = (layoutMeta) => {
    const breakpoints = Object.keys(layoutMeta);
    
    breakpoints.forEach(bp => {
        const visited = new Set();
        let current = bp;
        
        while (current && layoutMeta[current].inheritsFrom) {
            if (visited.has(current)) {
                throw new Error(`Cyclic inheritance detected: ${bp} → ${current}`);
            }
            visited.add(current);
            current = layoutMeta[current].inheritsFrom;
        }
    });
};

// Run on load and before save
```

---

## 📐 Mathematical Formulas

### Formula 1: Cell Width Calculation

```
cellWidth = (containerWidth - margin × (columns - 1)) / columns

Example (lg, 2000px container):
= (2000 - 16 × 23) / 24
= (2000 - 368) / 24
= 1632 / 24
= 68px
```

### Formula 2: Row Height Calculation (Dynamic 1:1)

```
rowHeight = cellWidth

For 1:1 squares: rowHeight = 68px
```

### Formula 3: Row Height Calculation (Aspect Ratio)

```
rowHeight = cellWidth / aspectRatio

For 4:3 cells: rowHeight = 68 / 1.333 = 51px
For 16:9 cells: rowHeight = 68 / 1.778 = 38px
```

### Formula 4: Widget Dimensions

```
widgetWidth = (cellWidth × cols) + (margin × (cols - 1))
widgetHeight = (rowHeight × rows) + (margin × (rows - 1))

Example (7×4 widget, 1:1 cells):
widgetWidth = (68 × 7) + (16 × 6) = 476 + 96 = 572px
widgetHeight = (68 × 4) + (16 × 3) = 272 + 48 = 320px
Aspect ratio: 572/320 = 1.79:1 (wider than tall, due to margins)
```

### Formula 5: Content Space

```
contentWidth = widgetWidth - horizontalChrome
contentHeight = widgetHeight - verticalChrome - headerHeight

horizontalChrome = cardPadding×2 + contentPadding×2 + containerPadding×2
verticalChrome = cardPadding×2 + contentPadding×2 + containerPadding×2

Example (same 7×4 widget with header):
horizontalChrome = 24×2 + 16×2 + 4×2 = 88px
verticalChrome = 24×2 + 16×2 + 4×2 = 88px
headerHeight = 52px

contentWidth = 572 - 88 = 484px
contentHeight = 320 - 88 - 52 = 180px
Content aspect: 484/180 = 2.69:1
```

### Formula 6: Proportional Scaling

```
newValue = oldValue × (newColumns / oldColumns)

Example (scale from 24 → 12 columns):
Widget x:12, w:8 → x:6, w:4
```

---

## 🎯 Recommended Implementation Order

1. **Fix Current Cell Sizing Issue** (Week 1)
   - Add comprehensive debugging
   - Identify correct formula for react-grid-layout
   - Fix rowHeight calculation
   - Validate with measurements

2. **Implement GRID_SYSTEM Config** (Week 1-2)
   - Create gridSystem.js
   - Migrate all hardcoded values
   - Test column count changes

3. **Enhance GridConfigContext** (Week 2)
   - Add measurement tracking
   - Add helper functions
   - Integrate with Dashboard

4. **Layout Inheritance System** (Week 3)
   - Add layoutMeta to widgets
   - Implement downward inheritance
   - Add UI indicators
   - Test all scenarios

5. **Safeguards & Edge Cases** (Week 3-4)
   - Add all safeguard functions
   - Handle widget addition across breakpoints
   - Test rapid breakpoint switching
   - Validate layout integrity

6. **Developer Tools** (Week 4)
   - Widget sizing calculator
   - Debug overlay
   - Documentation
   - Migration helpers

---

**This specification is ready for user review and approval before implementation.**
