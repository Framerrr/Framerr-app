# Band Detection Algorithm - Deep Dive & Enhancement Plan

**Created:** 2025-12-04  
**Purpose:** Explain current algorithm, propose enhancements, identify edge cases  
**Audience:** Developer & User understanding

---

## 🧠 Current Algorithm Explained (Simple Terms)

### What is "Band Detection"?

Think of your desktop dashboard as **horizontal stripes** (bands). Widgets in the same stripe are "in the same band."

**Example:**
```
Desktop:
┌─────┬─────┬─────┐
│  A  │  B  │  C  │  ← Band 1 (all at Y:0)
├─────┴─────┴─────┤
│       D         │  ← Band 2 (at Y:1)
├─────┬───────────┤
│  E  │     F     │  ← Band 3 (both start at Y:2)
└─────┴───────────┘
```

**Mobile conversion:**
```
Mobile (stacked):
┌──────────────┐
│      A       │  ← From band 1
├──────────────┤
│      B       │  ← From band 1
├──────────────┤
│      C       │  ← From band 1
├──────────────┤
│      D       │  ← From band 2
├──────────────┤
│      E       │  ← From band 3
├──────────────┤
│      F       │  ← From band 3
└──────────────┘
```

**Key insight:** Order is preserved! Left-to-right on desktop → top-to-bottom on mobile.

---

## 🔍 Current Algorithm Step-by-Step

### Step 1: Sort Widgets by Position

```javascript
// Line 21-24 in layoutUtils.js
const ySorted = desktopWidgets.sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;  // Sort by Y first
    return a.x - b.x;                    // Then by X
});
```

**What this does:**
- Sorts widgets top-to-bottom (Y)
- If same Y, sorts left-to-right (X)

**Example:**
```
Unsorted: [C(x:8,y:0), A(x:0,y:0), D(x:0,y:1), B(x:4,y:0)]
Sorted:   [A(x:0,y:0), B(x:4,y:0), C(x:8,y:0), D(x:0,y:1)]
           ↑ Y:0, X:0  ↑ Y:0, X:4  ↑ Y:0, X:8  ↑ Y:1, X:0
```

---

### Step 2: Sweep Line Algorithm (Band Detection)

**Analogy:** Imagine a horizontal line sweeping DOWN the screen, grouping widgets.

```javascript
// Lines 30-54
ySorted.forEach((widget) => {
    // Check if widget is BELOW current band
    if (widget.y >= currentBandMaxY) {
        // Start NEW band
        bands.push(currentBand);
        currentBand = [widget];
        currentBandMaxY = widget.yEnd;  // Bottom of this widget
    } else {
        // Widget OVERLAPS current band, add to it
        currentBand.push(widget);
        currentBandMaxY = Math.max(currentBandMaxY, widget.yEnd);
    }
});
```

**Visual Example:**

```
Widgets:
A: Y:0, Height:2 → yEnd:2
B: Y:0, Height:3 → yEnd:3
C: Y:1, Height:2 → yEnd:3  ← Starts INSIDE band (y:1 < bandMaxY:2)
D: Y:3, Height:1 → yEnd:4  ← Starts AFTER band (y:3 >= bandMaxY:3)

Processing:
1. A: First widget → Band 1 = [A], currentBandMaxY = 2
2. B: y:0 < 2 → Add to Band 1 = [A,B], currentBandMaxY = 3
3. C: y:1 < 3 → Add to Band 1 = [A,B,C], currentBandMaxY = 3
4. D: y:3 >= 3 → NEW Band 2 = [D], currentBandMaxY = 4

Result:
  Band 1: [A, B, C]  ← All overlap vertically
  Band 2: [D]        ← Separate from band 1
```

**Key Rule:** Widgets are in the same band if they **overlap vertically** (not necessarily side-by-side!)

---

### Step 3: Sort Within Each Band

```javascript
// Lines 65-69
const sorted = bands.flatMap(band => {
    return band.sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;  // Left to right
        return a.y - b.y;                    // If same X, top to bottom
    });
});
```

**What this does:**
- Within each band, sort left-to-right (X position)
- If widgets are at same X, sort top-to-bottom

**Example:**
```
Band 1 before: [B(x:4), A(x:0), C(x:8)]
Band 1 after:  [A(x:0), B(x:4), C(x:8)]  ← Left to right!
```

---

### Step 4: Stack on Mobile

```javascript
// Lines 74-91
let currentY = 0;
return sorted.map((item) => {
    const mobileLayoutItem = {
        x: 0,          // Full width
        y: currentY,   // Current position
        w: cols,       // 6 cols (full width on xs)
        h: mobileHeight
    };
    currentY += mobileHeight;  // Move down for next widget
    return { ...widget, layouts: { [breakpoint]: mobileLayoutItem }};
});
```

**Result:** Widgets stacked top-to-bottom in the order determined by bands + X position.

---

## 🎯 What Makes a "Good" Algorithm?

### Criteria for "Best" Algorithm:

1. **Predictable** - Same input → same output, every time
2. **Intuitive** - Results match user's mental model
3. **Reversible** - Mobile → Desktop → Mobile = Same result
4. **Safe** - Doesn't destroy layouts or create conflicts
5. **Robust** - Handles edge cases gracefully

---

## 🔄 Upward Sync Algorithm (Mobile → Desktop)

### The Challenge: Reverse Band Detection

**Problem:** Mobile is linear (stacked). Desktop is 2D (X and Y positions).

**Question:** Where does a widget go on desktop when its mobile order changes?

### Example Scenario:

```
Desktop:            Mobile (before):
[A][B]             [A]
[C]                [B]
                   [C]

User moves C above B on mobile:
Mobile (after):
[A]
[C]  ← Moved up
[B]
```

**Question:** Where does C go on desktop?

**Options:**

#### Option 1: Preserve Band Structure (Conservative)
```
Desktop (after):
[A][B]  ← Keep A/B together
[C]     ← C moves to after A/B (new band)

Logic: C was moved up on mobile, so put it in its own band before B
```

**Pros:**
- ✅ Safe - doesn't break existing desktop layout
- ✅ Predictable - mobile order = desktop row order
- ✅ Reversible - sync back to mobile gives same order

**Cons:**
- ⚠️ C and B were side-by-side, now they're not
- ⚠️ Might not match user's intent

---

#### Option 2: Swap Positions (Aggressive)
```
Desktop (after):
[A][C]  ← C takes B's spot
[B]     ← B pushed down

Logic: C and B swapped on mobile, so swap their positions on desktop
```

**Pros:**
- ✅ Preserves side-by-side relationships
- ✅ More intuitive (swap on mobile = swap on desktop)

**Cons:**
- ⚠️ What if C and B are different widths?
- ⚠️ Complex to calculate if they fit

---

#### Option 3: Smart Hybrid (Recommended ⭐)

**Algorithm:**

```javascript
const syncMobileToDesktop = (mobileOrder, desktopWidgets) => {
    // 1. Detect which widgets changed position
    const changes = detectPositionChanges(mobileOrder, currentMobileOrder);
    
    // 2. For each changed widget
    changes.forEach(change => {
        const { widgetId, oldIndex, newIndex, mobileBefore, mobileAfter } = change;
        
        // 3. Find desktop equivalents of neighbors
        const desktopBefore = findDesktopWidget(mobileBefore);
        const desktopAfter = findDesktopWidget(mobileAfter);
        
        // 4. Determine target band on desktop
        const targetBand = calculateTargetBand(desktopBefore, desktopAfter);
        
        // 5. Check if widget can fit in target band
        if (canFitInBand(widget, targetBand)) {
            // SWAP: Place widget in target band
            placeInBand(widget, targetBand, 'swap-position');
        } else {
            // SAFE FALLBACK: Create new band
            createNewBand(widget, targetBand.y);
        }
    });
};

const canFitInBand = (widget, targetBand) => {
    // Check if widget's width fits in available X space
    const bandWidgets = getBandWidgets(targetBand);
    const occupiedColumns = bandWidgets.reduce((sum, w) => sum + w.w, 0);
    const availableColumns = 12 - occupiedColumns;  // 12-column grid
    
    return widget.w <= availableColumns;
};
```

**Decision Flow:**

```
Mobile: [A] [C] [B]  (C moved up)

Step 1: Detect change
  - C moved from position 2 → position 1
  - C's new neighbors: before=A, after=B

Step 2: Find desktop positions
  - A on desktop: Band 1, X:0
  - B on desktop: Band 1, X:6

Step 3: Can C fit in Band 1?
  - Band 1 occupancy: A(w:6) + B(w:6) = 12 cols FULL
  - C needs: w:4
  - Available: 0 cols
  - Result: NO, can't fit

Step 4: Safe fallback - NEW BAND
  Desktop (after):
  [A][B]      ← Band 1 unchanged
  [C]         ← Band 2 (new)

Step 5: Sync back to mobile
  - Bands: [A,B], [C]
  - Mobile order: [A] [B] [C]
  - ⚠️ Not same as user's edit [A] [C] [B]!
```

**Issue Detected!** User's edit was overridden. This is an **edge case** that needs a warning.

---

## ⚠️ Edge Cases & Warning System

### Edge Case #1: Reorder Within Full Band

**Scenario:** Mobile reorders widgets, but desktop band is full (no room for swap)

**Example:**
```
Desktop: [A(w:6)][B(w:6)]  ← 12/12 cols used
Mobile: [B] [A]  ← User swaps

Problem: Can't swap positions (both are 6 cols wide, take full band)
```

**Solutions:**

**Option A: Resize & Swap**
```
Desktop: [B(w:6)][A(w:6)]  ← Just swap X positions
```
✅ **Best if:** Widgets are SAME width

**Option B: Create New Bands**
```
Desktop: [B(w:6)]  ← Band 1
         [A(w:6)]  ← Band 2 (new)
```
✅ **Best if:** Widgets are DIFFERENT widths

**Option C: Show Warning**
```
⚠️ Warning: Can't swap [A] and [B] on desktop (band is full).
Options:
  - Create new bands (recommended)
  - Resize widgets to fit
  - Keep original desktop layout
```

**Recommended:** **Option C** - Let user decide!

---

### Edge Case #2: Widget Added on Mobile (No Desktop Equivalent)

**Scenario:** User adds new widget on mobile

**Example:**
```
Mobile: [A] [B] [E] [C]  ← E is new

Desktop: [A][B]
         [C]
```

**Solution:**
```javascript
const syncNewWidget = (newWidget, mobileBefore, mobileAfter) => {
    // 1. Find desktop neighbors
    const desktopBefore = findDesktopWidget(mobileBefore);  // B
    const desktopAfter = findDesktopWidget(mobileAfter);    // C
    
    // 2. Calculate target Y position
    const targetY = (desktopBefore.y + desktopBefore.h + desktopAfter.y) / 2;
    // B at Y:0, height 1 → ends at Y:1
    // C at Y:1
    // Target: (1 + 1) / 2 = 1 (between them, will compact to Y:1)
    
    // 3. Use widget's default size
    const metadata = getWidgetMetadata(newWidget.type);
    
    // 4. Place widget
    return {
        x: 0,
        y: targetY,
        w: metadata.defaultSize.w,
        h: metadata.defaultSize.h
    };
};
```

**Result:**
```
Desktop (after):
[A][B]
[E___]  ← New widget, full width (default)
[C]
```

✅ **Safe and predictable!**

---

### Edge Case #3: Different Widget Widths in Band

**Scenario:** Widgets in same band have different widths

**Example:**
```
Desktop: [A(w:4)][B(w:8)]  ← Same band, different widths
Mobile: [B] [A]  ← User swaps

Question: Can we swap?
```

**Check:**
```javascript
const canSwap = (widgetA, widgetB, band) => {
    // Remove both widgets from band
    const otherWidgets = band.filter(w => w !== widgetA && w !== widgetB);
    const otherWidth = otherWidgets.reduce((sum, w) => sum + w.w, 0);
    
    // Check if swapped positions fit
    const totalWidth = widgetA.w + widgetB.w + otherWidth;
    
    if (totalWidth <= 12) {
        // Can swap! Just swap X positions
        return {
            canSwap: true,
            newPositions: {
                A: { x: B.x, y: B.y },
                B: { x: A.x, y: A.y }
            }
        };
    } else {
        // Can't fit
        return {
            canSwap: false,
            reason: 'Total width exceeds grid (12 cols)',
            suggestion: 'Create new bands'
        };
    }
};
```

**Result:**
```
If A(w:4) + B(w:8) = 12 cols (fits):
  Desktop: [B(w:8)][A(w:4)]  ← Swapped X positions

If doesn't fit:
  Desktop: [B(w:8)]  ← Band 1
           [A(w:4)]  ← Band 2
```

---

### Edge Case #4: Widget Spans Multiple Bands

**Scenario:** Tall widget spans multiple bands

**Example:**
```
Desktop:
[A(h:1)][B(h:3)]  ← B is 3 cells tall
[C(h:1)]

Band detection:
  Band 1: [A, B]  ← A and B start at Y:0
  Band 2: [C]     ← C starts at Y:1, but B already extended here!
```

**Current algorithm handles this:**
- Line 40: `if (widget.y >= currentBandMaxY)` - Hard cut check
- Band 1 maxY = 3 (B's bottom)
- C at y:1 < 3 → C joins Band 1
- **Correct!**  Band 1: [A, B, C all overlap]

✅ **Already handled correctly!**

---

## 🎯 Recommended Enhancement: Warning System

### When to Show Warnings:

**Warning Type 1: Swap Failed**
```javascript
if (!canSwap(widgetA, widgetB, band)) {
    showWarning({
        type: 'swap-failed',
        message: `Can't swap [${widgetA.type}] and [${widgetB.type}] on desktop`,
        reason: 'Widgets don't fit side-by-side',
        actions: [
            { label: 'Create new bands (recommended)', value: 'new-bands' },
            { label: 'Resize widgets', value: 'resize' },
            { label: 'Undo mobile change', value: 'undo' }
        ]
    });
}
```

**Warning Type 2: Layout Divergence**
```javascript
if (mobileOrderAfterSync !== mobileOrderBeforeSync) {
    showWarning({
        type: 'layout-divergence',
        message: 'Mobile and desktop layouts don't match after sync',
        details: {
            expected: mobileOrderBeforeSync,
            actual: mobileOrderAfterSync,
            diff: calculateDiff()
        },
        actions: [
            { label: 'Accept desktop layout', value: 'accept' },
            { label: 'Manually fix on desktop', value: 'manual' },
            { label: 'Switch to Manual mode', value: 'manual-mode' }
        ]
    });
}
```

**Warning Type 3: Band Overflow**
```javascript
if (totalWidth > 12) {
    showWarning({
        type: 'band-overflow',
        message: `Widgets in band exceed 12 columns (current: ${totalWidth})`,
        affected: band.map(w => w.type),
        actions: [
            { label: 'Split into multiple bands', value: 'split' },
            { label: 'Resize widgets proportionally', value: 'resize' },
            { label: 'Keep mobile layout only', value: 'mobile-only' }
        ]
    });
}
```

---

## 📊 Default Widget Sizing Strategy

### Question: New widget default size?

**Your Answer:** "Edge to edge for safety"

**Analysis:**

**Option A: Full-Width (12 cols)**
```
Pros:
  ✅ Safe - won't break desktop layout
  ✅ Visible - hard to miss
  ✅ Easy to resize down

Cons:
  ⚠️ Takes entire row
  ⚠️ Might be too big for some widgets
```

**Option B: Widget-Specific (From Registry)**
```javascript
// widgetRegistry.js
'plex': {
    defaultSize: { w: 7, h: 4 },  // Balanced size
    minSize: { w: 5, h: 4 }
}

'clock': {
    defaultSize: { w: 3, h: 2 },  // Small widget
    minSize: { w: 2, h: 1 }
}
```

**Pros:**
  ✅ Optimized per widget type
  ✅ Better initial layout
  ✅ Room for other widgets

**Cons:**
  ⚠️ Might still cause conflicts
  ⚠️ More complex

**Recommended: Hybrid Approach ⭐**

```javascript
const getDefaultSize = (widgetType, addedOn) => {
    const metadata = getWidgetMetadata(widgetType);
    
    if (addedOn === 'mobile') {
        // Full-width on mobile for safety
        return {
            w: 6,   // Full width (xs breakpoint)
            h: metadata.defaultSize.h
        };
    } else {
        // Use widget-specific size on desktop
        return metadata.defaultSize;
    }
};
```

**Result:**
- Desktop: Widget gets its optimal size (e.g., Plex = 7×4)
- Mobile: Widget gets full width (6 cols on xs)
- Safe on both!

---

## ✅ Final Recommendations

### 1. Swap Algorithm: **Smart Hybrid**

```
Step 1: Try to swap X positions
Step 2: If doesn't fit → Create new bands
Step 3: Show warning if layout diverges
```

### 2. Default Widget Size: **Widget-Specific with Safety**

```
Desktop: Use registry default (e.g., 7×4 for Plex)
Mobile: Full-width (6 cols on xs)
```

### 3. Warning System: **Proactive Alerts**

```
- Swap failed → Show options
- Layout diverged → Explain why
- Band overflow → Suggest fixes
```

### 4. Edge Cases Handled:

✅ Full bands - Create new bands or warn  
✅ Different widths - Check fit before swap  
✅ New widgets - Place between neighbors  
✅ Tall widgets - Already handled by sweep line  

---

## 🎯 Implementation Priority

### Phase 1: Fix Current Issues
1. ✅ Keep current band detection (it's good!)
2. ✅ Add widget-specific default sizes
3. ✅ Full-width safety on mobile additions

### Phase 2: Add Upward Sync
4. Implement smart hybrid swap algorithm
5. Add "canFit" validation
6. Fallback to new bands if needed

### Phase 3: Warning System
7. Detect swap failures
8. Detect layout divergence
9. Show user-friendly warnings with options

### Phase 4: Polish
10. Fine-tune per-widget responsive behavior
11. Add layout backup/restore
12. Add Manual mode toggle

---

**This algorithm is SOLID. We just need to enhance it for bidirectional sync and add safety warnings!**
