# Dashboard System Analysis - Template Parity Reference

**Purpose:** Ensure template builder uses identical systems as the real dashboard.

---

## Critical Parity Points

### 1. Grid Configuration

**Location:** `Dashboard.tsx` + react-grid-layout

```typescript
// Breakpoints
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480 };
const COLS = { lg: 24, md: 24, sm: 2, xs: 2 };

// Row height
const ROW_HEIGHT = 50; // pixels per grid row
```

**Template Builder must use:** Same breakpoints, columns, and row height.

---

### 2. Widget Size Constraints

**Location:** `src/utils/widgetRegistry.ts`

Each widget defines:
```typescript
{
  defaultSize: { w: number, h: number },
  minSize?: { w?: number, h?: number },
  maxSize?: { w?: number, h?: number }
}
```

| Widget | Default W×H | Min W×H | Max H |
|--------|-------------|---------|-------|
| system-status | 4×3 | 4×3 | 4 |
| plex | 6×3 | 4×4 | 6 |
| sonarr | 4×3 | 3×3 | 6 |
| radarr | 4×3 | 3×3 | 6 |
| overseerr | 6×3 | 4×4 | 6 |
| qbittorrent | 6×3 | 4×3 | 8 |
| weather | 3×3 | 3×1 | 4 |
| calendar | 6×5 | 5×5 | 8 |
| custom-html | 4×3 | 2×2 | 10 |
| link-grid | 4×2 | 1×1 | 8 |
| clock | 3×2 | 3×2 | 2 |

**Template Builder must:** Enforce same constraints when resizing.

---

### 3. Layout Generation (Mobile)

**Location:** `src/utils/layoutUtils.ts`

Functions:
- `generateMobileLayout(widgets, breakpoint)` - Band detection algorithm
- `generateAllMobileLayouts(widgets)` - Wrapper for sm breakpoint
- `migrateWidgetToLayouts(widget)` - Legacy format migration

**Algorithm:**
1. Extract desktop layout info with Y range
2. Band detection: Separate widgets into horizontal bands
3. Sort each band by X position
4. Stack vertically for mobile

**Template Builder must:** Use same `generateMobileLayout` for mobile preview.

---

### 4. Widget Data Structure

**Location:** `shared/types/widget.ts`

```typescript
interface Widget {
  i: string;           // Unique ID
  type: string;        // Widget type (matches registry key)
  layouts: {
    lg: { x, y, w, h },
    sm?: { x, y, w, h }
  };
  config?: object;     // Widget-specific settings
}
```

**Template stores:** Same structure, but config is placeholder/mock data.

---

### 5. Dashboard State Storage

**Location:** `user_preferences.dashboard_config` (JSON)

```typescript
{
  widgets: Widget[],
  mobileLayoutMode: 'linked' | 'independent',
  mobileWidgets?: Widget[]  // Only if independent
}
```

**API:** `server/routes/widgets.ts`
- `GET /api/widgets` - Fetch user's widgets
- `PUT /api/widgets` - Update widgets
- `POST /api/widgets/reset` - Clear all
- `POST /api/widgets/unlink` - Enable independent mobile
- `POST /api/widgets/reconnect` - Return to linked mobile

---

### 6. Grid Behavior

**Location:** `Dashboard.tsx`

| Behavior | Implementation |
|----------|----------------|
| Drag | `onDragStart`, `onDrag`, `onDragStop` handlers |
| Resize | `onResizeStart`, `onResize`, `onResizeStop` handlers |
| Collision | RGL compaction (vertical compaction by default) |
| Breakpoint change | `handleBreakpointChange` callback |
| Layout change | `handleLayoutChange` callback |

**Template Builder must:** Use same handlers and callbacks.

---

### 7. Touch Interactions

**Location:** `src/hooks/useTouchDragDelay.ts`

Mobile editing requires hold-to-drag:
- `HOLD_DELAY_MS = 170`
- `AUTO_RESET_MS = 250`

**Template Builder:** Desktop only, but should disable if accidentally accessed on mobile.

---

## Files to Reuse

| Purpose | File | Reuse Level |
|---------|------|-------------|
| Grid config | `constants/layout.ts` | 100% |
| Widget metadata | `utils/widgetRegistry.ts` | 100% |
| Mobile layout gen | `utils/layoutUtils.ts` | 100% |
| Widget types | `shared/types/widget.ts` | 100% |
| Widget components | `components/widgets/*.tsx` | Render with mock data |

---

## Mock Data Requirements

For builder widget previews, each widget needs static mock data:

| Widget | Mock Data |
|--------|-----------|
| plex | 2 fake "Now Playing" cards |
| sonarr | 3 fake upcoming episodes |
| radarr | 3 fake upcoming movies |
| overseerr | 3 fake request cards |
| qbittorrent | 2 fake active torrents |
| system-status | Fake CPU 45%, RAM 62%, Disk 78% |
| weather | Fake "72°F, Sunny" |
| calendar | 5 fake upcoming events |
| clock | Real time (no mock needed) |
| link-grid | 6 fake link icons |
| custom-html | Placeholder text |

---

## Changes to Avoid

**DO NOT:**
- Create separate grid implementation
- Hardcode widget sizes different from registry
- Skip mobile layout generation logic
- Create incompatible widget structure
- Use different breakpoints or columns

**ALWAYS:**
- Import from existing utilities
- Use shared types
- Follow existing patterns
