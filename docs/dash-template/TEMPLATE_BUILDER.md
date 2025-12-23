# Template Builder - UI Specification

**Status:** DRAFT - In Discussion  
**Created:** 2025-12-23  
**Last Updated:** 2025-12-23  
**Related:** [TEMPLATE_ENGINE.md](./TEMPLATE_ENGINE.md)

---

## Overview

The Template Builder is a **wizard-style interface** for creating and editing dashboard templates. It provides a visual grid editor identical to the main dashboard, with a widget sidebar for adding components.

**Platform:** Desktop only. Mobile users see a message directing them to desktop.

---

## Wizard Flow

The builder uses a **3-step wizard**:

| Step | Name | Purpose |
|------|------|---------|
| 1 | Setup | Name, category, description |
| 2 | Build | Visual grid editor with widget sidebar |
| 3 | Review | Preview, confirm, and save actions |

### Navigation

- **Bottom navigation bar** with Back/Next buttons
- **Step indicators** always visible (dots showing 1, 2, 3)
- Step indicators are clickable to jump between steps
- Jumping backward from Step 2 with unsaved changes triggers confirmation

---

## Step 1: Setup

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Create New Template                                    [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     Template Name *                                         │
│     ┌─────────────────────────────────────────────────┐    │
│     │ My Media Dashboard                              │    │
│     └─────────────────────────────────────────────────┘    │
│                                                             │
│     Category *                                              │
│     ┌─────────────────────────────────────────────────┐    │
│     │ Media                                        v  │    │
│     └─────────────────────────────────────────────────┘    │
│                                                             │
│     Description (optional)                                  │
│     ┌─────────────────────────────────────────────────┐    │
│     │ A setup for media monitoring with Plex,        │    │
│     │ Sonarr, and Radarr widgets.                    │    │
│     └─────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Cancel]                          * * o           [Next >] │
└─────────────────────────────────────────────────────────────┘
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| Template Name | Yes | Display name for the template |
| Category | Yes | Dropdown with admin-defined categories |
| Description | No | Optional text explaining the template purpose |

### Category Dropdown

For **regular users**:
- Shows list of existing categories
- Default selection: "Uncategorized"

For **admins**:
- Shows existing categories + "+ New Category" option at bottom
- Selecting "+ New Category" reveals inline text input
- New category is saved to system for future use by all users

```
┌─────────────────────────────┐
│ Uncategorized               │
│ Media                       │
│ Monitoring                  │
│ Personal                    │
│ ───────────────────         │
│ + New Category...           │  ← Admin only
└─────────────────────────────┘
```

### Validation

- Name required (minimum 1 character)
- Category required (has default)
- Next button disabled until valid

---

## Step 2: Build

### Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│  Template Builder    [Undo] [Redo]  [Desktop] [Mobile]            [X] │
├──────────────┬────────────────────────────────────────────────────────┤
│  Add Widget  │                                                        │
│ ─────────────│                                                        │
│ ┌──────────┐ │   ┌─────────────┐  ┌─────────────┐  ┌────────────┐    │
│ │  Plex    │ │   │    Plex     │  │   Sonarr    │  │  Calendar  │    │
│ │ Widget   │ │   │   (mock) [X]│  │   (mock) [X]│  │  (mock) [X]│    │
│ │ Preview  │ │   └─────────────┘  └─────────────┘  └────────────┘    │
│ └──────────┘ │                                                        │
│ ┌──────────┐ │   ┌───────────────────────────────┐                    │
│ │  Sonarr  │ │   │       System Status           │                    │
│ │ Widget   │ │   │       (mock data)        [X]  │                    │
│ │ Preview  │ │   └───────────────────────────────┘                    │
│ └──────────┘ │                                                        │
│     ...      │                                                        │
│              │                                                        │
│ [< Collapse] │                                                        │
├──────────────┴────────────────────────────────────────────────────────┤
│  [< Back]                          o * o                     [Next >] │
└───────────────────────────────────────────────────────────────────────┘
```

### Toolbar

Located at top of builder:

| Element | Icon | Description |
|---------|------|-------------|
| Undo | React Icon (undo arrow) | Reverts last action |
| Redo | React Icon (redo arrow) | Re-applies undone action |
| Desktop View | React Icon (monitor) | Active when editing desktop layout |
| Mobile View | React Icon (smartphone) | Shows read-only mobile preview |
| Close | React Icon (X) | Closes builder with confirmation if unsaved |

### Desktop/Mobile Toggle

- **Desktop mode** (default): Full editing capability on the grid
- **Mobile mode**: Read-only preview showing auto-generated mobile layout
  - Uses existing `layoutUtils` generation logic
  - Banner displayed: "Mobile layout is auto-generated. You can customize it later from your dashboard."
  - No editing allowed in mobile preview

### Widget Sidebar

**Position:** Left side, approximately 280-320px width

**Content:**
- Header: "Add Widget"
- Scrollable list of all available widget types
- Each widget shows **exact replica design with mock data**
- Widgets are scaled down to fit sidebar (approximately 50-60% scale)

**Interactions:**
- Hover: Subtle highlight effect
- Click: Adds widget to grid at y:0 (top of canvas)
- Drag: Drop widget at specific grid position
- Collapse button: Hides sidebar to maximize grid space

**Widget Availability:**
- All widget types shown regardless of service configuration
- Same widget can be added multiple times (like main dashboard)

### Grid Canvas

- Uses same `react-grid-layout` as actual dashboard
- Same grid columns, row height, and behavior
- Widgets show **exact same design as real widgets** with mock/placeholder data
- Each widget has:
  - Drag handle (move)
  - Resize handles (corners)
  - Remove button [X] (same position as edit mode)

### Widget Preview Components

Widgets in the builder must look **identical to production widgets**:

| Widget | Mock Data Examples |
|--------|-------------------|
| Plex | Fake movie posters, "Now Playing: Mock Movie" |
| Sonarr | Fake show queue items, sample episode names |
| Radarr | Fake movie queue items |
| Calendar | Future dates with placeholder events |
| System Status | Fake CPU/RAM/Disk percentages |
| qBittorrent | Fake torrent list with progress bars |
| Overseerr | Fake request items |

**Implementation Note:** Create reusable `<WidgetPreview type="widget-type" />` component that can also be used in Add Widget modal.

### Empty State

When no widgets are added:

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│           [Widget icon - React Icon]                       │
│                                                            │
│           Start building your template                     │
│                                                            │
│     Click or drag widgets from the sidebar to add them     │
│     to your dashboard layout.                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Undo/Redo System

**Scope:** Within current builder session only

**Tracked Actions:**
- Add widget
- Remove widget
- Move widget (position change)
- Resize widget
- Name/category/description changes (from Step 1)

**Behavior:**
- Unlimited undo/redo within session
- Undo: Ctrl+Z or click Undo button
- Redo: Ctrl+Y or click Redo button
- History cleared on Save, Cancel, or Close

**Data Structure:**
```typescript
interface BuilderHistoryState {
  widgets: TemplateWidget[];
  name: string;
  category: string;
  description: string;
}

// Managed by builder
undoStack: BuilderHistoryState[]
redoStack: BuilderHistoryState[]
currentState: BuilderHistoryState
```

---

## Step 3: Review & Save

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Review Template                                                [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                                                            │    │
│  │              Thumbnail Preview of Template                 │    │
│  │              (CSS-scaled miniature of grid)                │    │
│  │                                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Name: My Media Dashboard                                           │
│  Category: Media                                                    │
│  Description: A setup for media monitoring...                       │
│  Widgets: Plex, Sonarr, Calendar, System Status (4 total)          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [Cancel]    [Save]    [Save & Apply]    [Save & Share v]           │
│                                          (admin only)               │
├─────────────────────────────────────────────────────────────────────┤
│  [< Back]                          o o *                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Thumbnail Preview

- CSS-scaled miniature showing template layout
- Same technique used for template cards in list view
- Shows widget positions as colored rectangles with widget icons

### Summary Information

- Template name
- Category
- Description (if provided)
- Widget count and list of widget types

### Action Buttons

| Button | Behavior |
|--------|----------|
| Cancel | Discards all changes, closes builder (with confirmation if changes made) |
| Save | Saves template to user's template list, closes builder |
| Save & Apply | Saves template, then applies it to current dashboard (with backup) |
| Save & Share | (Admin only) Saves template, opens share options modal |

### Save & Share Dropdown (Admin Only)

```
┌─────────────────────────┐
│ Share with Everyone     │
│ Share with Users...     │  → Opens user picker
│ Set as Default          │  → For new users
└─────────────────────────┘
```

---

## Entry Points

### Create New Template

- Button in Settings → Dashboard → Templates section
- Opens wizard at Step 1 (empty)

### Save Current Dashboard as Template

- Button in Settings → Dashboard → Templates section
- Opens wizard at Step 1 for naming
- Step 2 grid is **pre-filled with current dashboard layout**
- User can modify layout before saving

### Edit Existing Template

- Edit button on template card
- Opens wizard at Step 1 (allows changing name/category/description)
- Step 2 grid pre-filled with existing template layout

### Duplicate Template

- Duplicate button on template card
- Opens wizard at Step 1 with name "[Original Name] (Copy)"
- Step 2 grid pre-filled with duplicated layout

---

## Close/Cancel Behavior

### Close Button [X]

Located in top-right of all steps.

**Behavior:**
- **No changes made:** Closes immediately
- **Unsaved changes:** Shows confirmation modal

### Cancel Button

Available on all steps.

**Behavior:**
- Same as Close button - confirmation if unsaved changes

### Confirmation Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Discard Changes?                                           │
│                                                             │
│  Your template progress will be lost.                       │
│                                                             │
│                           [Keep Editing]    [Discard]       │
└─────────────────────────────────────────────────────────────┘
```

---

## Mobile Handling

When accessing template builder on mobile:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     [Monitor icon - React Icon]                             │
│                                                             │
│     Template Builder requires desktop                       │
│                                                             │
│     The template builder is only available on larger        │
│     screens. You can still browse and apply templates       │
│     from this device.                                       │
│                                                             │
│     [Got It]                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Icons Reference

All UI elements use **React Icons** (no emojis):

| Element | Icon Library Suggestion |
|---------|------------------------|
| Close (X) | `RiCloseLine` or `IoClose` |
| Undo | `RiArrowGoBackLine` |
| Redo | `RiArrowGoForwardLine` |
| Desktop | `RiComputerLine` |
| Mobile | `RiSmartphoneLine` |
| Collapse sidebar | `RiArrowLeftSLine` |
| Expand sidebar | `RiArrowRightSLine` |
| Add/New | `RiAddLine` |
| Widget icons | Existing widget icons from app |

---

## Animations & Transitions

Should be **consistent with existing app animations**:

- Step transitions: Smooth slide or fade
- Sidebar collapse: Smooth width transition
- Widget add: Fade in with slight scale
- Undo/redo: No animation (instant state change)
- Modal open/close: Match existing modal animations

---

## Changelog

| Date | Changes |
|------|---------|
| 2025-12-23 | Initial draft based on design discussion |
