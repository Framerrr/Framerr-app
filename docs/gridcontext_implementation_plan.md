# Implementation Plan: Grid Config Context System

**Status:** Ready for execution  
**Date:** 2025-12-03  
**Priority:** High  
**Proof of Concept Widget:** PlexWidget

---

## 📋 Overview

Implement a centralized Grid Configuration system using React Context to ensure all widgets can dynamically calculate their sizing based on available space, with automatic adaptation when configuration values change.

**Goals:**
1. Single source of truth for all grid/layout constants
2. Dynamic widget sizing that adapts to header toggle without refresh
3. Reusable calculation helpers for all widgets
4. Future-proof for user customization features (compact mode, etc.)

---

## 📁 Files to Create

### 1. `src/utils/gridConfig.js` (NEW)

**Purpose:** Static grid configuration constants

**Content:**
```javascript
/**
 * Grid Configuration Constants
 * Single source of truth for all dashboard grid/layout values
 */

export const GRID_CONFIG = {
  // Grid dimensions
  rowHeight: 100,           // Height of one grid row in pixels
  colWidth: 83.33,          // Width of one column (2000px / 24 cols)
  maxWidth: 2000,           // Maximum container width
  cols: 24,                 // Total columns in grid
  
  // Breakpoints (from react-grid-layout)
  breakpoints: {
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0
  },
  
  // Padding values (in pixels)
  padding: {
    // Card component padding (from Card.jsx)
    card: {
      sm: 16,   // p-4
      md: 20,   // p-5
      lg: 24,   // p-6 (default for WidgetWrapper)
      xl: 32    // p-8
    },
    
    // WidgetWrapper content padding (from WidgetWrapper.jsx line 103)
    widgetContent: 16,       // p-4
    
    // Widget container padding (from PlexWidget.jsx line 228)
    widgetContainer: 4,      // 0.25rem
    
    // Header approximate height (from WidgetWrapper.jsx line 88)
    widgetHeader: 52         // Includes icon + title + padding
  },
  
  // Gap values
  gap: {
    container: 16,   // 1rem
    card: 8          // 0.5rem
  }
};

/**
 * Calculate available space for widget content
 * @param {number} widgetCols - Widget width in grid columns
 * @param {number} widgetRows - Widget height in grid rows
 * @param {boolean} hasHeader - Whether widget header is shown
 * @param {object} options - Optional overrides
 * @returns {object} { width, height, aspectRatio }
 */
export const calculateAvailableSpace = (
  widgetCols, 
  widgetRows, 
  hasHeader = true,
  options = {}
) => {
  // Allow runtime overrides for future features
  const rowHeight = options.rowHeight || GRID_CONFIG.rowHeight;
  const colWidth = options.colWidth || GRID_CONFIG.colWidth;
  const cardPadding = options.cardPadding || GRID_CONFIG.padding.card.lg;
  
  // Calculate total widget dimensions in pixels
  const widgetWidth = widgetCols * colWidth;
  const widgetHeight = widgetRows * rowHeight;
  
  // Calculate total padding that consumes space
  const verticalPadding = 
    (cardPadding * 2) +                           // Card top/bottom
    (GRID_CONFIG.padding.widgetContent * 2) +     // Content wrapper top/bottom
    (GRID_CONFIG.padding.widgetContainer * 2);    // Container top/bottom
    
  const horizontalPadding = 
    (cardPadding * 2) +                           // Card left/right
    (GRID_CONFIG.padding.widgetContent * 2) +     // Content wrapper left/right
    (GRID_CONFIG.padding.widgetContainer * 2);    // Container left/right
  
  const headerHeight = hasHeader ? GRID_CONFIG.padding.widgetHeader : 0;
  
  // Calculate available space after subtracting all padding
  const availableWidth = widgetWidth - horizontalPadding;
  const availableHeight = widgetHeight - verticalPadding - headerHeight;
  
  return {
    width: Math.max(0, availableWidth),
    height: Math.max(0, availableHeight),
    aspectRatio: availableWidth / availableHeight
  };
};
```

**Rationale:** Pure functions with no React dependencies. Can be imported anywhere.

---

### 2. `src/context/GridConfigContext.jsx` (NEW)

**Purpose:** React Context Provider for grid configuration

**Content:**
```javascript
import React, { createContext, useContext, useState, useMemo } from 'react';
import { GRID_CONFIG, calculateAvailableSpace as calculateSpace } from '../utils/gridConfig';

// Create context
const GridConfigContext = createContext(null);

/**
 * Grid Configuration Provider
 * Provides grid constants and helper functions to all widgets
 */
export const GridConfigProvider = ({ children }) => {
  // State for future dynamic features
  const [gridDensity, setGridDensity] = useState('normal'); // normal | compact | comfortable
  
  // Calculate dynamic rowHeight based on density (future feature)
  const rowHeight = useMemo(() => {
    switch (gridDensity) {
      case 'compact': return 80;
      case 'comfortable': return 120;
      case 'normal':
      default: return GRID_CONFIG.rowHeight;
    }
  }, [gridDensity]);
  
  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    // Static config values
    ...GRID_CONFIG,
    
    // Dynamic values (can change at runtime)
    rowHeight,
    gridDensity,
    setGridDensity,
    
    // Helper functions
    calculateAvailableSpace: (widgetCols, widgetRows, hasHeader = true) => {
      return calculateSpace(widgetCols, widgetRows, hasHeader, { rowHeight });
    }
  }), [rowHeight, gridDensity]);
  
  return (
    <GridConfigContext.Provider value={value}>
      {children}
    </GridConfigContext.Provider>
  );
};

/**
 * Custom hook to access grid configuration
 * Must be used within GridConfigProvider
 */
export const useGridConfig = () => {
  const context = useContext(GridConfigContext);
  
  if (!context) {
    throw new Error('useGridConfig must be used within GridConfigProvider');
  }
  
  return context;
};
```

**Rationale:** Provides centralized access with future extensibility for user preferences.

---

## 📝 Files to Modify

### 3. `src/App.jsx` (MODIFY)

**Location to Change:** Around line 20-30 (where providers are wrapped)

**Current Structure:**
```jsx
<AuthProvider>
  <FaviconInjector />
  <AppTitle />
  <CustomColorLoader>
    <ThemeProvider>
      <SystemConfigProvider>
        <AppDataProvider>
          {/* Routes */}
        </AppDataProvider>
      </SystemConfigProvider>
    </ThemeProvider>
  </CustomColorLoader>
</AuthProvider>
```

**Change Required:**
Add `GridConfigProvider` wrapper. Place it **outside AuthProvider** since it doesn't depend on auth.

**New Structure:**
```jsx
<GridConfigProvider>
  <AuthProvider>
    <FaviconInjector />
    <AppTitle />
    <CustomColorLoader>
      <ThemeProvider>
        <SystemConfigProvider>
          <AppDataProvider>
            {/* Routes */}
          </AppDataProvider>
        </SystemConfigProvider>
      </ThemeProvider>
    </CustomColorLoader>
  </AuthProvider>
</GridConfigProvider>
```

**Import to Add:**
```javascript
import { GridConfigProvider } from './context/GridConfigContext';
```

---

### 4. `src/pages/Dashboard.jsx` (MODIFY)

**Change 1:** Import grid config instead of hardcoding values

**Current (lines ~60, 717):**
```javascript
rowHeight: 100,
// ...
rowHeight={100}
```

**Change to:**
```javascript
import { GRID_CONFIG } from '../utils/gridConfig';

// In gridConfig object (line 60):
rowHeight: GRID_CONFIG.rowHeight,

// In ResponsiveGridLayout (line 717):
rowHeight={GRID_CONFIG.rowHeight}
```

**Change 2:** Import breakpoints and cols

**Additional changes:**
```javascript
// If breakpoints are hardcoded, replace with:
breakpoints={GRID_CONFIG.breakpoints}

// If cols are hardcoded, replace with:
cols={{ lg: GRID_CONFIG.cols, ... }}
```

**Rationale:** Dashboard uses static values, so direct import is fine (no need for Context here).

---

### 5. `src/components/widgets/PlexWidget.jsx` (MAJOR REFACTOR)

**Purpose:** Proof of concept for dynamic widget sizing

**Current Sizing Approach (REMOVE):**
- Line 259: `width: '280px'` (hardcoded)

**New Sizing Approach:**

**Step 1:** Add imports at top
```javascript
import { useRef, useEffect } from 'react'; // Add useRef
import { useGridConfig } from '../../context/GridConfigContext';
import { getWidgetMetadata } from '../../utils/widgetRegistry';
```

**Step 2:** Inside component, before return statement (after line 18)

```javascript
// Get grid config from context
const { calculateAvailableSpace } = useGridConfig();

// Get widget metadata to find minimum size
const metadata = getWidgetMetadata('plex');
const minCols = metadata.minSize.w;  // 7
const minRows = metadata.minSize.h;  // 4

// Track header visibility
const showHeader = config?.showHeader !== false;

// Calculate available space at minimum widget size
const minAvailableSpace = calculateAvailableSpace(minCols, minRows, showHeader);

// Use ResizeObserver to detect actual container height
const containerRef = useRef(null);
const [containerHeight, setContainerHeight] = useState(null);

useEffect(() => {
  if (!containerRef.current) return;
  
  const observer = new ResizeObserver((entries) => {
    const height = entries[0].contentRect.height;
    setContainerHeight(height);
  });
  
  observer.observe(containerRef.current);
  
  return () => observer.disconnect();
}, []);

// Calculate card width from height and aspect ratio
// If container height is available, use it; otherwise use calculated minimum
const cardWidth = containerHeight 
  ? containerHeight * minAvailableSpace.aspectRatio 
  : minAvailableSpace.width;
```

**Step 3:** Update container div (line 222)

**Current:**
```javascript
<div style={{
  display: 'flex',
  gap: '1rem',
  height: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: '0.25rem',
  scrollbarWidth: 'thin'
}}>
```

**Change to:**
```javascript
<div 
  ref={containerRef}
  style={{
    display: 'flex',
    gap: '1rem',
    height: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '0.25rem',
    scrollbarWidth: 'thin'
  }}
>
```

**Step 4:** Update card div (line 259)

**Current:**
```javascript
width: '280px',
```

**Change to:**
```javascript
width: `${Math.round(cardWidth)}px`,
```

**Full Changes Summary for PlexWidget:**
- Add 3 imports (useRef, useGridConfig, getWidgetMetadata)
- Add state for containerHeight
- Add ResizeObserver effect
- Calculate cardWidth dynamically
- Add ref to container div
- Replace hardcoded width with calculated width

---

## 🧪 Testing Plan

### Phase 1: Basic Functionality
1. **Build Test**
   ```bash
   npm run build
   ```
   - Must pass without errors

2. **Visual Test - Minimum Size**
   - Create new Plex widget at w:7 h:4
   - Verify card fits perfectly with small margins
   - No overflow, no excessive whitespace

3. **Visual Test - Header Toggle**
   - Hide widget header in settings
   - Verify card automatically grows to use available space
   - Show header again
   - Verify card automatically shrinks back
   - **No page refresh required**

4. **Visual Test - Widget Resize**
   - Resize widget larger (w:10 h:4)
   - Verify card stays same size (doesn't grow)
   - Extra space appears as margin

5. **Visual Test - Multiple Streams**
   - If multiple Plex streams active
   - Verify cards scroll horizontally
   - Each card maintains same width
   - No layout breaking

### Phase 2: Edge Cases
1. **No streams** - Empty state displays correctly
2. **Single stream** - Card fills width properly  
3. **Many streams** - Horizontal scroll works smoothly
4. **Header hidden** - Width recalculates automatically
5. **Widget minimum size** - Looks good at smallest size

### Phase 3: Regression Testing
1. All other widgets still render correctly
2. Dashboard grid still functions (drag, resize)
3. No console errors
4. No performance issues

---

## 📊 Success Criteria

- [ ] Build passes with no errors
- [ ] PlexWidget adapts to header toggle without refresh
- [ ] Card width is calculated, not hardcoded
- [ ] Multiple streams scroll horizontally
- [ ] Card proportions maintain readability
- [ ] No visual glitches or overflow
- [ ] Code is documented and clean
- [ ] Pattern is reusable for other widgets

---

## 🔄 Migration Pattern for Other Widgets

Once PlexWidget proves successful, apply this pattern to:

### Similar Widgets (Horizontal Scroll)
- **OverseerrWidget** - Movie posters in horizontal carousel
- **UpcomingMediaWidget** - Media items in row
- **QBittorrentWidget** - Torrent items

### Vertical List Widgets
- **SonarrWidget** - Episode list
- **RadarrWidget** - Movie list
- Pattern: Calculate item height, enable vertical scroll

### Static Widgets
- **WeatherWidget** - Fixed layout, scale font sizes
- **ClockWidget** - Fixed layout, scale elements
- **SystemStatusWidget** - Progress bars adapt to width

---

## 📝 Documentation Updates Needed

After implementation:

### Update `docs/development/WIDGET_DEVELOPMENT_GUIDE.md`
- Add section on using `useGridConfig()`
- Document `calculateAvailableSpace()` helper
- Provide examples of dynamic sizing
- Explain ResizeObserver pattern

### Create `docs/architecture/GRID_CONFIG.md`
- Document grid configuration system
- Explain constants and their meanings
- Show how to add new configuration values
- Document future extensibility (density modes)

---

## 🎯 Next Steps After PlexWidget Success

1. **Update other media widgets** (Overseerr, Sonarr, Radarr)
2. **Document the pattern** in widget development guide
3. **Add user preferences UI** (optional, future)
   - Settings → Customization → Grid Density
   - Options: Compact, Normal, Comfortable
4. **Optimize performance** if needed
   - Memoization
   - Debounce ResizeObserver

---

## ⚠️ Important Notes

### Fallback Strategy
If any issues arise:
- Grid config constants still work via direct import
- Can revert PlexWidget to fixed width temporarily
- Context is additive, not breaking change

### Performance Considerations
- ResizeObserver is performant (native API)
- Context value is memoized (only updates when needed)
- Calculations are lightweight (simple math)

### Browser Support
- ResizeObserver: All modern browsers (2020+)
- Context API: All React 16.3+ (we're on 19.2)

---

## 📦 Commit Strategy

### Commit 1: Foundation
```
feat(config): add Grid Config Context system

- Create gridConfig.js with constants
- Create GridConfigContext.jsx with Provider
- Wrap App with GridConfigProvider
- Import config values in Dashboard.jsx
```

### Commit 2: PlexWidget Implementation
```
feat(widgets): implement dynamic sizing for PlexWidget

- Use useGridConfig hook for dynamic calculations
- Add ResizeObserver for container height tracking
- Calculate card width from aspect ratio
- Cards adapt to header toggle without refresh
```

### Commit 3: Documentation
```
docs: document Grid Config Context system

- Add widget development guide section
- Create GRID_CONFIG.md architecture doc
- Document migration pattern for other widgets
```

---

**Status:** Ready for execution  
**Estimated Time:** 2-3 hours  
**Complexity:** Medium  
**Risk:** Low (additive changes, easy to revert)
