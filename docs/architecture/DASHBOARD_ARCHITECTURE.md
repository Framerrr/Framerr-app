# Dashboard System Architecture

**Last Updated:** 2025-12-04  
**Status:** Comprehensive deep dive of all dashboard-related files  
**Purpose:** Complete documentation of how the dashboard functions

---

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [Component Hierarchy](#component-hierarchy)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Data Flow](#data-flow)
5. [Grid System Architecture](#grid-system-architecture)
6. [Widget System](#widget-system)
7. [State Management](#state-management)
8. [Key Interactions](#key-interactions)

---

## 🎯 System Overview

The Framerr dashboard is a sophisticated grid-based widget system built on top of `react-grid-layout`. It provides:

- **Drag-and-drop widget placement** - Users can position widgets anywhere on a 24-column grid
- **Responsive resizing** - Widgets can be resized while maintaining constraints
- **Mobile optimization** - Automatic stacking layout for mobile devices
- **Widget visibility control** - Widgets can hide when empty
- **Persistent layouts** - All changes saved to backend per user
- **Edit/View modes** - Toggle between arrangement and usage
- **1:1 aspect ratio cells** - Square grid cells for consistent sizing

### Technology Stack

- **react-grid-layout** - Core grid/drag functionality (with `WidthProvider` for responsive sizing)
- **React Context API** - Grid configuration and app data sharing
- **React Suspense + Lazy Loading** - Widgets loaded on-demand for performance
- **ResizeObserver** - Dynamic row height calculation for perfect squares

---

## 📊 Component Hierarchy

```
App.jsx
└── GridConfigProvider ← Grid constants and helper functions
    └── AuthProvider
        └── ThemeProvider
            └── AppDataProvider ← Widget/tab/user data
                └── Sidebar + MainContent
                    └── DashboardOrTabs ← Hash-based router
                        ├── Dashboard ← Main grid component (if #dashboard)
                        └── TabContainer ← Iframe tabs (if other hash)

Dashboard.jsx (main component)
├── ResponsiveGridLayout ← react-grid-layout wrapper
│   └── [For each widget]
│       └── WidgetWrapper ← Container with header/delete
│           └── <WidgetComponent /> ← Actual widget (lazy loaded)
├── AddWidgetModal ← Widget picker modal
└── EmptyDashboard ← Empty state view
```

---

## 📁 File-by-File Breakdown

### Core Components

#### 1. `src/App.jsx` (90 lines)
**Purpose:** Application root with provider hierarchy  
**Key Responsibilities:**
- Sets up all React contexts (Auth, Theme, SystemConfig, AppData, GridConfig)
- Applies custom colors from user config
- Defines routing structure (`/login`, `/setup`, `/*` protected)
- Wraps protected routes with Sidebar + MainContent

**Important Details:**
- `GridConfigProvider` is the outermost provider (wraps Auth)
- `CustomColorLoader` applies user's custom theme colors on mount
- Protected routes have themed background (`var(--bg-primary)`)
- Sidebar is always rendered, main content in `<main>` with bottom padding for mobile

#### 2. `src/pages/DashboardOrTabs.jsx` (52 lines)
**Purpose:** Hash-based router between Dashboard and TabContainer  
**Key Responsibilities:**
- Monitors `window.location.hash` for navigation
- Auto-redirects root (`/`) to `/#dashboard`
- Determines if showing Dashboard or TabContainer based on hash

**Hash Logic:**
- `#dashboard` or `#dashboard?...` → Show Dashboard
- `#settings` or `#settings?...` → Show Dashboard (Settings is in MainContent)
- Anything else (e.g., `#radarr`) → Show TabContainer (iframe tabs)

**Important Details:**
- Both components always mounted, use `display: none` to toggle visibility
- This preserves iframe state when switching between dashboard and tabs
- Uses `hashchange` event listener for reactivity

#### 3. `src/pages/Dashboard.jsx` (847 lines) ⭐ **MAIN COMPONENT**
**Purpose:** The grid dashboard with all widget management  
**Key Responsibilities:**
- Manages widget state (loading from API, saving layouts)
- Handles edit mode (drag/resize/delete widgets)
- Calculates dynamic rowHeight for 1:1 aspect ratio cells
- Renders widgets with `react-grid-layout`
- Widget visibility management (hide when empty)
- Integration status tracking

**State Variables (24 total):**
```javascript
- widgets: [] - Array of widget config objects
- layouts: {} - Grid layouts per breakpoint (lg, md, sm, xs, xxs)
- originalLayouts: {} - For cancel functionality
- editMode: false - Edit vs view mode
- loading: true - Initial fetch state
- saving: false - Save in progress
- showAddModal: false - AddWidgetModal visibility
- isHovering: false - Drag-over indicator
- unsavedChanges: false - Track if save needed
- integrations: {} - Available integrations from API
- widgetVisibility: {} - Track which widgets are visible
- currentBreakpoint: 'lg' - Current responsive breakpoint
- containerWidth: 0 - Measured container width
- rowHeight: 68 - Dynamically calculated
- debugOverlay: false - Show debug info
```

**Key Functions:**

***Grid & Layout Management:***
- `calculateRowHeight()` - Calculates rowHeight to make cells square (width = rowHeight)
  - Measures container width
  - Determines active columns based on breakpoint
  - Formula: `rowHeight = (containerWidth - (margin × (cols - 1))) / cols`
  - Without this, cells would be rectangles (68px width × 100px height)

- `enrichLayoutWithConstraints(widget, layoutItem)` - Applies widget size constraints
  - Gets min/max from widget metadata
  - Applies to layout `minW`, `minH`, `maxH`
  - Ensures widgets respect registry-defined sizes

- `handleLayoutChange(newLayout)` - Called on drag/resize
  - Updates layouts state for current breakpoint
  - Marks unsaved changes
  - Does NOT save to API (only on explicit Save)

- `onBreakpointChange(breakpoint)` - Responsive breakpoint handler
  - Updates currentBreakpoint state
  - Recalculates rowHeight for new column count

***Widget Management:***
- `fetchWidgets()` - Load widgets from API
  - GET `/api/widgets`
  - Migrates old format to new layouts format (if needed)
  - Generates mobile layouts (md, sm, xs, xxs)
  - Enriches layouts with widget constraints

- `handleAddWidgetFromModal(widgetType, position)` - Add new widget
  - Creates widget config with default or dropped position
  - Assigns unique ID
  - Adds to current breakpoint layout
  - Saves to API immediately

- `handleDeleteWidget(widgetId)` - Remove widget
  - Filters widget from state
  - Saves updated list to API

- `handleSave()` - Persist layout changes
  - PUT `/api/widgets/bulk` with all widgets
  - Clears unsavedChanges flag

- `handleCancel()` - Discard changes
  - Reverts layouts to originalLayouts
  - Exits edit mode

***Widget Visibility:***
- `handleWidgetVisibilityChange(widgetId, isVisible)` - Called by widgets
  - Updates widgetVisibility state
  - Widgets use this with `hideWhenEmpty` config
  - Filtered widgets still in grid but not visible

- `renderWidget(widget)` - Widget renderer
  - Lazy loads widget component from registry
  - Wraps in `<Suspense>` with LoadingSpinner fallback
  - Wraps in `WidgetWrapper` with header/delete button
  - Passes integrations, config, callbacks as props

**ResizeObserver Hook (lines 64-110):**
```javascript
useEffect(() => {
    const observer = new ResizeObserver(() => {
        if (!gridContainerRef.current) return;
        const width = gridContainerRef.current.offsetWidth;
        setContainerWidth(width);
        const rowHeight = calculateRowHeight();
        setRowHeight(rowHeight);
    });
    
    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
}, [loading]); // CRITICAL: Depends on loading, not []
```
**Why `[loading]` dependency?**
- With `[]`, effect runs BEFORE widgets render
- `gridContainerRef.current` is null at that point
- ResizeObserver never attaches!
- Changing to `[loading]` makes it run AFTER widgets load
- This fixed the non-square cell bug (Dec 4, 2025)

**Event Listeners (lines 222-272):**
- `widgets-modified` - Listens for widget updates from settings
- `widget-config-update` - Listens for individual widget config changes
- Both re-fetch widgets to stay in sync

#### 4. `src/components/widgets/WidgetWrapper.jsx` (112 lines)
**Purpose:** Standardized container for all widgets  
**Key Responsibilities:**
- Provides consistent Card styling
- Renders widget header with icon and title
- Shows delete button in edit mode (with confirmation)
- Handles flatten mode (removes glassmorphism)
- Manages header visibility (some widgets hide header)

**Props:**
```javascript
{
    id,              // Widget ID
    type,            // Widget type (e.g., 'plex')
    title,           // Display title
    icon: Icon,      // Lucide icon component
    editMode,        // Dashboard edit mode
    flatten,         // Flatten glassmorphism
    showHeader,      // Header visibility (reversed from hideHeader)
    onDelete,        // Delete callback
    children         // Widget content
}
```

**Special Cases:**
- `link-grid` widgets: Force `showHeader = false` and `padding = 'none'`
- Delete button: Always absolutely positioned in top-right
- Delete confirmation: Inline expand with Cancel/Confirm buttons

#### 5. `src/components/dashboard/AddWidgetModal.jsx` (215 lines)
**Purpose:** Modal for browsing and adding widgets  
**Key Responsibilities:**
- Displays available widgets grouped by category
- Shows integration status (available vs needs setup)
- Supports click-to-add and drag-and-drop
- Search/filter widgets by name
- Shows widget size constraints in UI

**Categories:**
- System widgets (system-status)
- Media widgets (plex, sonarr, radarr, overseerr)
- Downloads (qbittorrent)
- Utility (weather, calendar, links, clock, custom-html)

**Drag-and-Drop:**
- `handleDragStart()` - Sets `dataTransfer` with widget type
- `handleDragEnd()` - Resets drag state
- Dashboard's `handleDrop()` receives and positions widget

#### 6. `src/components/dashboard/EmptyDashboard.jsx` (57 lines)
**Purpose:** Empty state when no widgets exist  
**Key Responsibilities:**
- Shows friendly welcome message
- Large "Add Your First Widget" button
- Glassmorphism card with icon
- Quick tips for new users

---

### Grid System Files

#### 7. `src/context/GridConfigContext.jsx` (115 lines)
**Purpose:** React Context for grid configuration  
**Key Responsibilities:**
- Provides `GRID_CONFIG` constants to all components/widgets
- Exports `useGridConfig()` hook for easy access
- Memoizes `calculateAvailableSpace()` function with caching
- Supports future density modes (compact, normal, comfortable)

**Provided Values:**
```javascript
{
    // From GRID_CONFIG
    rowHeight,           // 68 (dynamic)
    colWidth,            // 68
    maxWidth,            // 2000
    cols,                // 24
    breakpoints,         // { lg, md, sm, xs, xxs }
    padding,             // { card, widgetContent, etc. }
    gap,                 // { container, card }
    
    // Dynamic values
    gridDensity,         // 'normal' (future feature)
    setGridDensity,      // Setter for density
    
    // Helper functions
    calculateAvailableSpace(w, h, hasHeader)
}
```

**Calculation Caching:**
- Stores results in `Map` keyed by `widgetCols-widgetRows-hasHeader-rowHeight`
- Clears cache when rowHeight changes
- Prevents redundant calculations for same widget size

#### 8. `src/utils/gridConfig.js` (156 lines)
**Purpose:** Single source of truth for grid constants and calculations  
**Key Exports:**

**`GRID_CONFIG` Object:**
```javascript
{
    rowHeight: 68,       // Must match colWidth for square cells
    colWidth: 68,        // Actual: (2000px - 16px×23 gaps) / 24 = 68px
    maxWidth: 2000,      // Container max-width
    cols: 24,            // Total columns
    
    breakpoints: {
        lg: 1200,        // Desktop
        md: 1024,        // Tablet landscape
        sm: 768,         // Tablet portrait
        xs: 600,         // Large phone
        xxs: 0           // Small phone
    },
    
    padding: {
        card: {
            sm: 16,      // p-4
            md: 20,      // p-5
            lg: 24,      // p-6 (default for WidgetWrapper)
            xl: 32       // p-8
        },
        widgetContent: 16,        // p-4 from WidgetWrapper
        widgetContainer: 4,       // 0.25rem from widget internals
        widgetHeader: 52          // Header height (icon + title + padding)
    },
    
    gap: {
        container: 16,   // 1rem margin between grid cells
        card: 8          // 0.5rem internal gaps
    }
}
```

**`calculateAvailableSpace(widgetCols, widgetRows, hasHeader, options)` Function:**
- Calculates exact pixel dimensions available for widget content
- Accounts for all padding layers:
  - Card padding (24px × 2 = 48px total)
  - Widget content padding (16px × 2 = 32px total)
  - Widget container padding (4px × 2 = 8px total)
  - Widget header (52px if visible)

**Example:**
```javascript
// 7×4 widget with header
calculateAvailableSpace(7, 4, true)
// Widget size: 7 × 68px = 476px wide, 4 × 68px = 272px tall
// Horizontal padding: 48 + 32 + 8 = 88px
// Vertical padding: 48 + 32 + 8 + 52 = 140px
// Available: 476-88=388px wide, 272-140=132px tall
// Returns: { width: 388, height: 132, aspectRatio: 2.94 }
```

**`GRID_PRESETS` (Future Feature):**
```javascript
{
    standard: { cols: 24, colWidth: 68, label: 'Standard (24 columns)' },
    compact: { cols: 32, colWidth: 62.5, label: 'Compact (32 columns)' },
    spacious: { cols: 16, colWidth: 125, label: 'Spacious (16 columns)' }
}
```

**`measureActualPadding(element)` Function:**
- Debugging utility to verify padding matches CSS
- Gets computed styles from DOM element
- Returns object with top/right/bottom/left and totals

#### 9. `src/utils/layoutUtils.js` (136 lines)
**Purpose:** Mobile layout generation and widget migration  
**Key Functions:**

**`generateMobileLayout(widgets, breakpoint)`:**
1. Extracts desktop (lg) layout for each widget
2. **Band Detection Algorithm** - Groups widgets into horizontal "bands":
   - Sorts widgets by Y position
   - Sweep line algorithm detects where widgets DON'T overlap vertically
   - Widgets with no vertical overlap = separate bands
   - Avoids incorrect grouping that caused stacking issues
3. Sorts each band by X (column), then Y (row)
4. Returns widgets in final stacked order
5. Assigns sequential Y positions (0, h1, h1+h2, etc.)

**Why Band Detection?**
- Original approach grouped by row (Math.floor(y / threshold))
- Failed when widgets had different heights or positions
- New algorithm finds actual non-overlapping regions
- Preserves visual left-to-right, top-to-bottom order

**`calculateMobileHeight(widget, breakpoint)`:**
- Gets widget metadata from registry
- Prefers metadata.minSize.h if defined
- Otherwise scales desktop height × 0.75
- Clamps to reasonable min/max (2-6 rows)

**`generateAllMobileLayouts(widgets)`:**
- Generates layouts for all mobile breakpoints in sequence
- Order: md → sm → xs → xxs
- Each builds on previous (preserves mobile stacking order)

**`migrateWidgetToLayouts(widget)`:**
- Converts old format `{x, y, w, h}` to new `{layouts: {lg: {...}}}`
- Ensures all widgets use modern multi-breakpoint format

---

### Widget System Files

#### 10. `src/utils/widgetRegistry.js` (233 lines)
**Purpose:** Central registry of all widget types  
**Key Export:** `WIDGET_TYPES` Object

**Widget Metadata Structure:**
```javascript
'widget-type': {
    component: LazyComponent,    // React.lazy() component
    icon: LucideIcon,            // Icon for UI
    name: 'Display Name',        // Human-readable name
    description: '...',          // Short description
    category: 'media',           // Category for grouping
    defaultSize: { w: 4, h: 3 }, // Default grid size
    minSize: { w: 3, h: 2 },     // Minimum constraints
    maxSize: { h: 6 },           // Max height (width usually unlimited)
    requiresIntegration: 'plex'  // Integration dependency
}
```

**13 Widget Types:**
1. **system-status** - CPU, memory, temperature monitoring (4×3)
2. **plex** - Now playing and activity (7×4, min 5×4)
3. **sonarr** - TV show management (4×3)
4. **radarr** - Movie management (4×3)
5. **overseerr** - Media requests (6×3)
6. **qbittorrent** - Torrent downloads (6×3)
7. **weather** - Weather and forecast (3×3)
8. **calendar** - Combined Sonarr/Radarr calendar (6×5)
9. **upcoming-media** - Upcoming TV/movies (4×3)
10. **custom-html** - User-defined HTML/CSS (4×3)
11. **link-grid** - Quick access links (4×2, min 1×1, hideHeader: true)
12. **clock** - Time display (3×2)

**Helper Functions:**
- `getWidgetComponent(type)` - Returns lazy-loaded component
- `getWidgetIcon(type)` - Returns Lucide icon
- `getWidgetMetadata(type)` - Returns full metadata object
- `getWidgetIconName(type)` - Returns icon name string
- `getWidgetsByCategory()` - Groups widgets by category

**Widget Size Constraints:**
- `minSize` - Enforced minimum when resizing
- `maxSize` - Typically just max height (width unlimited for horizontal scrolling)
- `defaultSize` - Initial size when added to dashboard
- Constraints applied by Dashboard's `enrichLayoutWithConstraints()`

---

## 🔄 Data Flow

### Widget Loading Flow
```
1. Dashboard mounts
2. useEffect runs → fetchWidgets()
3. GET /api/widgets → Returns array of widget configs
4. For each widget:
   - Migrate to new layouts format (if needed)
   - Generate mobile layouts (md, sm, xs, xxs)
   - Enrich with size constraints from registry
5. Set widgets state
6. ResponsiveGridLayout renders
7. For each widget:
   - Get component from registry (lazy loaded)
   - Wrap in Suspense → LoadingSpinner while waiting
   - Wrap in WidgetWrapper → Header + delete button
   - Render with props (integration, config, callbacks)
```

### Widget Addition Flow
```
1. User clicks "Add Widget" button
2. setShowAddModal(true)
3. AddWidgetModal opens
4. User drags widget OR clicks widget
5. handleAddWidgetFromModal(type, position) called
6. Create widget config:
   {
       id: uuid(),
       type: 'plex',
       layouts: { lg: { x, y, w, h } }
   }
7. Generate mobile layouts
8. Add to widgets state
9. POST /api/widgets → Save to database
10. Modal closes
11. Dashboard re-renders with new widget
```

### Layout Save Flow
```
1. User drags/resizes widget in edit mode
2. react-grid-layout calls onLayoutChange
3. handleLayoutChange(newLayout) updates state
4. setUnsavedChanges(true)
5. User clicks "Save Changes"
6. handleSave() called
7. PUT /api/widgets/bulk with all widgets
8. Backend saves to database
9. setUnsavedChanges(false)
10. Exit edit mode
```

### Resize Observer Flow (1:1 Aspect Ratio)
```
1. Dashboard mounts, widgets load
2. useEffect([loading]) runs AFTER widgets render
3. gridContainerRef.current now exists
4. ResizeObserver attaches to container
5. On container resize:
   - Measure actual width
   - Calculate columns for current breakpoint
   - Formula: rowHeight = (width - margin×(cols-1)) / cols
   - setRowHeight(result)
6. ResponsiveGridLayout receives new rowHeight prop
7. Grid cells are now square (width === height)
```

---

## 🎯 Grid System Architecture

### How react-grid-layout Works

**WidthProvider HOC:**
```javascript
const ResponsiveGridLayout = WidthProvider(Responsive);
```
- Wraps Responsive component
- Automatically measures container width
- Passes width prop to Responsive
- Triggers re-render on window resize

**Responsive Component:**
- Manages multiple breakpoints (lg, md, sm, xs, xxs)
- Each breakpoint has own layout configuration
- Automatically switches based on width prop
- Handles drag-and-drop and resize

**Layout Object Structure:**
```javascript
{
    lg: [
        { i: 'widget-1', x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2, maxH: 6 },
        { i: 'widget-2', x: 4, y: 0, w: 7, h: 4, minW: 5, minH: 4 }
    ],
    md: [...],  // Tablet landscape
    sm: [...],  // Tablet portrait  
    xs: [...],  // Large phone (stacked)
    xxs: [...] // Small phone (stacked)
}
```

### Column Configuration by Breakpoint

**Desktop (lg/md/sm):** 24 columns
- Full fluid grid
- Horizontal + vertical placement
- Formula: `rowHeight = (containerWidth - 16px×23 gaps) / 24 cols`
- Example: 2000px container → (2000-368)/24 = 68px

**Large Phone (xs):** 6 columns
- Narrower grid
- Vertical stacking begins
- Formula: `rowHeight = (containerWidth - 16px×5 gaps) / 6 cols`
- Example: 600px container → (600-80)/6 = 86.67px

**Small Phone (xxs):** 2 columns
- Full vertical stack
- Minimal horizontal layout
- Formula: `rowHeight = (containerWidth - 16px×1 gap) / 2 cols`
- Example: 400px container → (400-16)/2 = 192px

### Breakpoint Transition Logic

```javascript
onBreakpointChange={(breakpoint) => {
    setCurrentBreakpoint(breakpoint);
    const rowHeight = calculateRowHeight();
    setRowHeight(rowHeight);
}}
```

When viewport width changes:
1. WidthProvider detects resize
2. Responsive determines new breakpoint
3. Calls onBreakpointChange callback
4. Dashboard recalculates rowHeight for new column count
5. Grid re-renders with new layout and rowHeight

---

## 🧩 Widget System

### Widget Lifecycle

**1. Registration** (in widgetRegistry.js)
```javascript
'plex': {
    component: lazy(() => import('.../PlexWidget')),
    icon: Tv,
    name: 'Plex',
    defaultSize: { w: 7, h: 4 },
    minSize: { w: 5, h: 4 },
    maxSize: { h: 10 },
    requiresIntegration: 'plex'
}
```

**2. Addition to Dashboard**
- User selects from AddWidgetModal
- Dashboard creates config with unique ID
- Saved to database via POST /api/widgets

**3. Loading**
- Dashboard calls `getWidgetComponent(type)`
- Returns lazy-loaded component
- Wrapped in Suspense for loading state

**4. Rendering**
```javascript
<Suspense fallback={<LoadingSpinner />}>
    <WidgetWrapper
        id={widget.id}
        type={widget.type}
        title={widget.title}
        icon={getWidgetIcon(widget.type)}
        editMode={editMode}
        flatten={widget.config?.flatten}
        showHeader={!widget.config?.hideHeader}
        onDelete={handleDeleteWidget}
    >
        <WidgetComponent
            integration={integrations[type]}
            config={widget.config}
            {...widget.config}
        />
    </WidgetWrapper>
</Suspense>
```

**5. Props Received by Widget Component**
- `integration` - API config (URL, token, etc.)
- `config` - Widget-specific config object
- All config properties spread as individual props
- Example: `hideWhenEmpty`, `flatten`, custom settings

### Widget Visibility System

**Purpose:** Hide widgets when they have no data to display

**Implementation:**
1. Widget tracks internal empty state
2. Calls Dashboard's callback:
   ```javascript
   useEffect(() => {
       if (window.dispatchEvent) {
           window.dispatchEvent(new CustomEvent('widget-visibility-change', {
               detail: { widgetId, isVisible: !isEmpty }
           }));
       }
   }, [isEmpty]);
   ```

3. Dashboard listens for event:
   ```javascript
   useEffect(() => {
       const handler = (e) => {
           setWidgetVisibility(prev => ({
               ...prev,
               [e.detail.widgetId]: e.detail.isVisible
           }));
       };
       window.addEventListener('widget-visibility-change', handler);
       return () => window.removeEventListener('widget-visibility-change', handler);
   }, []);
   ```

4. Dashboard filters visible widgets:
   ```javascript
   const visibleWidgets = widgets.filter(w =>
       widgetVisibility[w.id] !== false
   );
   ```

**Note:** This system had issues after navigation. Widget components unmount/remount on route change, events may not fire properly. Consider alternative approaches (lifting state, React Context).

---

## 🔧 State Management

### Dashboard State (24 state variables)

**Widget Data:**
- `widgets: []` - Full widget configs from API
- `layouts: {}` - Grid layouts per breakpoint
- `originalLayouts: {}` - Backup for cancel
- `widgetVisibility: {}` - Visibility status per widget

**UI State:**
- `editMode: false` - Edit vs view mode
- `showAddModal: false` - Add widget modal
- `isHovering: false` - Drag-over indicator
- `debugOverlay: false` - Debug measurements

**Loading/Saving:**
- `loading: true` - Initial fetch
- `saving: false` - Save in progress
- `unsavedChanges: false` - Dirty flag

**Grid Configuration:**
- `currentBreakpoint: 'lg'` - Active breakpoint
- `containerWidth: 0` - Measured width
- `rowHeight: 68` - Dynamic for square cells

**External Data:**
- `integrations: {}` - Available integrations from API

### Context State

**GridConfigContext:**
- `gridDensity: 'normal'` - Density mode (future)
- `rowHeight: 68` - Can be overridden dynamically
- Calculation cache Map for performance

**AppDataContext:**
- User widgets (shared with settings)
- User tabs
- System config
- Permission groups

### Persistence

**Backend API Endpoints:**
- `GET /api/widgets` - Load all widgets
- `POST /api/widgets` - Create single widget
- `PUT /api/widgets/bulk` - Update all widget layouts
- `DELETE /api/widgets/:id` - Remove widget
- `PUT /api/widgets/:id/config` - Update widget config

**Storage Format:**
```json
{
    "id": "uuid-1234",
    "type": "plex",
    "title": "Now Playing",
    "layouts": {
        "lg": { "x": 0, "y": 0, "w": 7, "h": 4 },
        "md": { "x": 0, "y": 0, "w": 7, "h": 4 },
        "sm": { "x": 0, "y": 0, "w": 24, "h": 4 },
        "xs": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "xxs": { "x": 0, "y": 0, "w": 2, "h": 4 }
    },
    "config": {
        "hideWhenEmpty": true,
        "flatten": false,
        "hideHeader": false
    }
}
```

---

## 🎭 Key Interactions

### 1. Adding a Widget (Click)
```
User clicks widget in AddWidgetModal
    ↓
handleAddWidget(type) called
    ↓
Find empty space on grid (top-left scan)
    ↓
Create widget config with position
    ↓
Add to widgets state
    ↓
Generate mobile layouts
    ↓
POST /api/widgets (immediate save)
    ↓
Close modal
    ↓
Grid re-renders with new widget
```

### 2. Adding a Widget (Drag-and-Drop)
```
User drags widget from modal
    ↓
handleDragStart sets dataTransfer
    ↓
User drags over dashboard
    ↓
handleDragOver accepts drop (preventDefault)
    ↓
User releases mouse
    ↓
handleDrop(e) called
    ↓
Extract widget type from dataTransfer
    ↓
Calculate grid position from mouse X/Y
    ↓
handleAddWidgetFromModal(type, position)
    ↓
Widget added at exact drop location
```

### 3. Editing Layout
```
User clicks "Edit Dashboard"
    ↓
setEditMode(true)
    ↓
Save originalLayouts (for cancel)
    ↓
Grid enables dragging/resizing
    ↓
User drags widget
    ↓
react-grid-layout calls onLayoutChange
    ↓
handleLayoutChange updates layouts state
    ↓
setUnsavedChanges(true)
    ↓
"Save" and "Cancel" buttons appear
```

### 4. Deleting a Widget
```
User clicks X button in edit mode
    ↓
setShowDeleteConfirm(true) in WidgetWrapper
    ↓
Inline confirm UI appears
    ↓
User clicks "Confirm"
    ↓
onDelete(id) callback to Dashboard
    ↓
handleDeleteWidget(id) called
    ↓
Filter widget from state
    ↓
PUT /api/widgets/bulk (immediate save)
    ↓
Grid re-renders without widget
```

### 5. Responsive Breakpoint Change
```
User resizes window
    ↓
WidthProvider measures new width
    ↓
Responsive determines new breakpoint
    ↓
onBreakpointChange callback fires
    ↓
setCurrentBreakpoint(newBreakpoint)
    ↓
calculateRowHeight() for new column count
    ↓
setRowHeight(newHeight)
    ↓
Grid re-renders with new layout + rowHeight
    ↓
Widgets reflow to mobile layout (if needed)
```

### 6. Widget Hiding When Empty
```
Widget component detects empty state
    ↓
Dispatches 'widget-visibility-change' event
    ↓
Dashboard's event listener catches it
    ↓
Updates widgetVisibility state
    ↓
visibleWidgets filter excludes hidden widgets
    ↓
Grid re-renders without hidden widget
    ↓
Grid compacts remaining widgets upward
```

---

## 🚨 Known Issues & Gotchas

### 1. ResizeObserver Dependency
**Issue:** If useEffect dependency is `[]`, ResizeObserver fails to attach  
**Cause:** `gridContainerRef.current` is null before widgets render  
**Fix:** Use `[loading]` dependency so effect runs AFTER widgets load  
**Impact:** Fixed non-square grid cells (Dec 4, 2025)

### 2. Widget Visibility Events
**Issue:** Widgets lose visibility state on navigation  
**Cause:** Events dispatched but listeners may not catch after remount  
**Potential Fix:** Use React Context instead of window events  
**Workaround:** Widgets should re-emit visibility on mount

### 3. Mobile Layout Generation
**Issue:** Original row-based grouping caused incorrect stacking  
**Cause:** Widgets with different heights or offsets grouped incorrectly  
**Fix:** Band detection algorithm (sweep line approach)  
**Status:** Fixed in layoutUtils.js

### 4. Widget Config Updates
**Issue:** Dashboard doesn't auto-refresh when widget config changes in settings  
**Fix:** Event listeners on `widgets-modified` and `widget-config-update`  
**Status:** Working but tightly coupled

### 5. Grid Cell Aspect Ratio
**Issue:** Cells were rectangular (68×100px) instead of square  
**Root Cause:** rowHeight was static 100px, not matching colWidth 68px  
**Fix:** Dynamic rowHeight calculation via ResizeObserver  
**Formula:** `(containerWidth - marginTotal) / cols`  
**Status:** Fixed (Dec 4, 2025)

---

## 📝 Summary

The dashboard is a **multi-layered system**:

1. **App.jsx** - Provider hierarchy and routing
2. **DashboardOrTabs.jsx** - Hash-based navigation
3. **Dashboard.jsx** - Main grid controller (847 lines, 24 state variables)
4. **GridConfigContext** - Centralized configuration
5. **gridConfig.js** - Constants and calculations
6. **layoutUtils.js** - Mobile layout generation
7. **widgetRegistry.js** - Widget metadata registry
8. **WidgetWrapper** - Standardized container
9. **react-grid-layout** - Underlying grid engine

**Key Features:**
- ✅ Drag-and-drop widget placement
- ✅ Responsive resizing with constraints
- ✅ Mobile stacking with band detection
- ✅ Dynamic rowHeight for 1:1 cells
- ✅ Widget visibility management
- ✅ Edit/view modes with save/cancel
- ✅ Persistent layouts per user
- ✅ Lazy-loaded widgets for performance

**Critical Relationships:**
- Dashboard ↔ GridConfigContext (configuration)
- Dashboard ↔ widgetRegistry (component loading)
- Dashboard ↔ layoutUtils (mobile layouts)
- Dashboard ↔ react-grid-layout (grid rendering)
- WidgetWrapper ↔ All widgets (standardization)

**Next Steps for Improvement:**
1. Replace window events with React Context for widget visibility
2. Implement grid density modes (compact, comfortable)
3. Add widget presets (common sizes/positions)
4. Optimize re-renders with React.memo
5. Add widget duplication feature
6. Support widget grouping/locking
