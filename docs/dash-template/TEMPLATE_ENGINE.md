# Dashboard Template Engine - Feature Specification

**Status:** DRAFT - In Discussion  
**Created:** 2025-12-23  
**Last Updated:** 2025-12-23  
**Priority:** Medium

> **Related:** See [TEMPLATE_BUILDER.md](./TEMPLATE_BUILDER.md) for detailed builder UI specification.

---

## Overview

A system that allows admins (and users) to create, save, share, and apply dashboard layout templates. Templates define widget selection and positioning, enabling quick dashboard setup for new users and consistent layouts across an organization.

---

## Core Concepts

### What is a Template?

A template is a **snapshot of dashboard structure**, containing:
- **Widget Types**: Which widgets are included (e.g., Plex, Sonarr, Calendar)
- **Layout Positions**: x, y, width, height for desktop (lg) breakpoint
- **Widget Order**: Relative positioning
- **Category**: For organization (admin-creatable categories)
- **Description** (optional): Text explaining template purpose
- **Thumbnail**: CSS-scaled miniature preview (generated on save/update)
- **Version**: Schema version for compatibility checking

A template does **NOT** contain:
- Service configurations (API keys, URLs)
- User-specific data
- Mobile layouts (auto-generated from desktop using existing `layoutUtils`)

When a template is applied, widgets use the **user's existing service connections**. If a user doesn't have a service configured, that widget appears as disabled/unconfigured.

---

## User Roles & Permissions

| Action | Admin | User |
|--------|-------|------|
| Create templates | ✅ | ✅ |
| Save current dashboard as template | ✅ | ✅ |
| Use template builder | ✅ | ✅ |
| Edit own templates | ✅ | ✅ |
| Delete own templates | ✅ | ✅ |
| Share templates with users | ✅ | ❌ |
| Set default template for new users | ✅ | ❌ |
| View shared templates | ✅ | ✅ |
| Apply templates to own dashboard | ✅ | ✅ |
| Export/Import templates | ✅ | ✅ |

---

## Settings Restructure

### Current Structure
```
Settings
├── Integrations (main tab)
│   └── Dashboard (sub-tab)
│       ├── Mobile Layout Mode
│       ├── Reset Mobile Dashboard
│       └── Reset to Default Widgets
```

### New Structure
```
Settings
├── Integrations (main tab)
│   └── ... (services only)
├── Dashboard (NEW main tab)
│   ├── Templates Section
│   │   ├── [Create Template] button → opens Builder (desktop only)
│   │   ├── [Save Current as Template] button
│   │   ├── [Import Template] button
│   │   └── Template List (with thumbnails)
│   │       ├── Thumbnail preview (iOS folder style)
│   │       ├── Template Name (editable inline)
│   │       ├── Category badge
│   │       ├── [Set as Current] button
│   │       ├── [Edit] button → opens Builder
│   │       ├── [Duplicate] button
│   │       ├── [Export] button
│   │       ├── [Share ▼] dropdown (admin only)
│   │       ├── [Delete] button
│   │       └── Badges: "Shared from {name}", "Default", "Updated"
│   └── Layout Section
│       ├── Mobile Layout Mode toggle
│       ├── Reset Mobile Dashboard
│       ├── Reset to Default Widgets
│       └── [Revert to Previous Dashboard] button
```

---

## Template List Display

### Template Card Design (with Thumbnail)

```
┌──────────────────────────────────────────────────────────┐
│  ┌─────────────┐                                         │
│  │ ┌──┐ ┌────┐ │  Media Server Setup          [Edit]    │
│  │ └──┘ └────┘ │  Category: Media                       │
│  │ ┌────────┐  │  [Shared icon] Shared by @admin        │
│  │ └────────┘  │                                         │
│  └─────────────┘  [Set] [Duplicate] [Export] [Delete]   │
└──────────────────────────────────────────────────────────┘
```

The thumbnail shows a **CSS-scaled miniaturized view** of the template layout:
- Square preview window showing scaled-down dashboard
- Uses CSS transform/scale for miniaturization
- Shows actual widget positions with widget icons
- Generated/updated when template is saved or updated (always current)
- Click on card to expand details

### Badges (React Icons, no emojis)
- **"Shared from @{username}"** - Template was shared with you (with share icon)
- **"Default for New Users"** - Admin-set default (admin only sees this, with star icon)
- **"Updated"** - Shared template has been modified since you last applied it (with refresh icon)
- Category tag badge (colored by category)

---

## Template Builder

> **Full Specification:** See [TEMPLATE_BUILDER.md](./TEMPLATE_BUILDER.md) for complete UI details.

### Overview

The builder is a **3-step wizard**:

| Step | Name | Purpose |
|------|------|--------|
| 1 | Setup | Name, category, description |
| 2 | Build | Visual grid editor with widget sidebar |
| 3 | Review | Preview, confirm, and save actions |

### Key Features

- **Desktop Only**: Mobile users see message directing to desktop
- **Widget Sidebar**: Left-side panel with full widget previews (exact replica with mock data)
- **Desktop/Mobile Toggle**: Preview auto-generated mobile layout (read-only)
- **Undo/Redo**: Unlimited within builder session, cleared on save/cancel
- **Same RGL Grid**: Identical to actual dashboard editing
- **Widget Previews**: Exact same design as real widgets with placeholder/mock data

### Entry Points

| Action | Behavior |
|--------|----------|
| Create New Template | Opens wizard at Step 1 (empty) |
| Save Current Dashboard | Opens wizard at Step 1, Step 2 pre-filled with current layout |
| Edit Template | Opens wizard at Step 1, Step 2 pre-filled with template layout |
| Duplicate Template | Opens wizard at Step 1 with "[Name] (Copy)", layout duplicated |

### Step 3 Actions

| Button | Behavior |
|--------|----------|
| Cancel | Discards changes (with confirmation if unsaved) |
| Save | Saves template to user's list |
| Save & Apply | Saves and applies to current dashboard |
| Save & Share | (Admin only) Saves and opens share options |

---

## Template Categories

### Admin-Creatable Categories

Categories are **managed by admins**, not hardcoded:

- **Default**: "Uncategorized" (always available)
- **Admin creation**: In category dropdown, admins see "+ New Category" option
- **Inline creation**: Type new category name, saved to system for all users
- **Persistence**: Categories stored in system config, available to all users

### Category Dropdown Behavior

**For regular users:**
- Shows list of existing categories created by admins
- Cannot create new categories

**For admins:**
```
┌─────────────────────────┐
│ Uncategorized           │
│ Media                   │
│ Monitoring              │
│ Personal                │
│ ─────────────────────── │
│ + New Category...       │  ← Admin only
└─────────────────────────┘
```

### Display
- Displayed as colored badge on template cards
- Badge color can be category-specific or accent color

---

## Template Sharing Flow (Admin Only)

### Share Dropdown Options
- **Share with Everyone**: All users receive template
- **Share with Specific Users**: Opens user picker modal
- **Manage Sharing**: View/modify current shares

### Widget Sharing Conflict Detection

When sharing a template, system checks if all widgets are shared with target users.

**Conflict Modal:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Some widgets in this template aren't shared             │
│                                                             │
│  The following widgets are not shared with selected users:  │
│  • Plex Widget                                              │
│  • Sonarr Widget                                            │
│                                                             │
│  Choose how to proceed:                                     │
│                                                             │
│  [Share All Widgets]   - Share widgets + template           │
│  [Continue Anyway]     - Template shared, widgets disabled  │
│  [Cancel]              - Don't share template               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Notifications

### Notification Types

All template notifications appear as **both**:
1. **Toast** - Immediate visual feedback
2. **Persistent Notification** - In notification center for later viewing

**Note:** Use React icons instead of emojis in actual implementation.

| Event | Toast Message | Persistent Notification |
|-------|--------------|------------------------|
| Template shared with you | "New template shared: {name}" | "{Admin} shared template '{name}' with you" |
| Shared template updated | "Template updated: {name}" | "{Admin} updated template '{name}'" |
| Shared template deleted | "Template removed: {name}" | "{Admin} deleted template '{name}'. Your current dashboard is unchanged." |
| Template applied | "Template applied successfully" | (no persistent) |
| Export successful | "Template exported" | (no persistent) |
| Import successful | "Template imported: {name}" | (no persistent) |

---

## Applying Templates

### Set as Current Flow

1. User clicks "Set as Current" on a template
2. **Warning Modal:**
   ```
   ⚠️ Override Current Dashboard?
   
   This will replace your current dashboard layout with the
   template "{Template Name}".
   
   Your current dashboard will be saved and can be restored
   using "Revert to Previous Dashboard" in settings.
   
   [Apply Template]  [Cancel]
   ```
3. Current dashboard saved as "previous" (for revert)
4. Template layout applied
5. User can freely edit dashboard after

### What Happens on Apply
1. **Current dashboard backed up** (single previous state)
2. Current widgets cleared
3. Template widgets added with template positions
4. Each widget inherits user's service configuration
5. Unconfigured services show "Not Configured" state
6. Mobile layout auto-generated (linked mode reset)
7. Toast: "Template applied successfully"

---

## Dashboard Revert System

### Single Previous State
- System stores **one previous dashboard state** before template application
- Located in Settings → Dashboard → "Revert to Previous Dashboard"

### Revert Flow
```
Revert to Previous Dashboard?

This will restore your dashboard to the state before the
last template was applied.

[Revert]  [Cancel]
```

### Future Expansion
- This backup infrastructure can later support:
  - Normal editing undo (not just template application)
  - Multiple restore points
  - Version history

---

## Template Updates

### Admin Updates a Shared Template
1. Admin edits template in builder → Save
2. Template definition updated **in place**
3. All users with template in their list see **"Updated"** badge
4. Toast + persistent notification sent to affected users
5. Update does **NOT** auto-apply to dashboards

### User Applies Update
- Click "Set as Current" on updated template
- Same warning modal about override
- Same backup/apply flow
- "Updated" badge clears after applying

### Update Detection Logic
```typescript
// Compare timestamps
if (template.lastModified > userTemplateRef.lastApplied) {
  showUpdatedBadge = true;
}
```

---

## Template Deletion

### Deletion Behavior
- Deleting a template **always removes it for all users** (if shared)
- Admin cannot selectively delete from just themselves

### Deletion Flow
```
Delete Template?

"{Template Name}" will be permanently deleted.

If this template is shared with other users, it will be
removed from their template list. Their current dashboards
will not be affected.

[Delete]  [Cancel]
```

### After Deletion
- Template removed from all users' lists
- Toast to admin: "Template deleted"
- Toast + persistent notification to affected users: "{Admin} deleted template '{name}'. Your current dashboard is unchanged."
- If user wants to keep the layout, they can save their current dashboard as a new template

---

## Export/Import

### Export
- Exports template as JSON file
- Filename: `{template-name}.framerr-template.json`
- Includes version field for compatibility

### Import
- Accepts `.framerr-template.json` files
- Validates structure and version
- Creates new template in user's list

### Version Compatibility

```typescript
interface ExportedTemplate {
  version: string;           // Schema version (e.g., "1.0.0")
  exportedFrom: string;      // Framerr version (e.g., "1.4.0")
  exportedAt: string;        // ISO timestamp
  template: DashboardTemplate;
}
```

**Compatibility Logic:**
- **Same major version**: Import directly
- **Newer major version**: Show warning "This template was created in a newer version of Framerr. Some features may not work correctly."
- **Older major version**: Attempt migration (if migration exists)
- **Unknown structure**: Reject with error "Invalid template file"

**When would incompatibility occur?**
- Major changes to widget types (new required fields)
- Fundamental changes to layout system (unlikely - RGL is stable)
- Complete dashboard system overhaul (very unlikely)

For now, we store version but implement graceful degradation - skip unrecognized widget types with warning.

---

## Deprecated Widget Handling

When a template contains a widget type that no longer exists:

### At Import Time
```
⚠️ Template Contains Deprecated Widgets

The following widget types are no longer supported and
will be skipped when applying this template:

• LegacyWidget
• OldMonitorWidget

[Import Anyway]  [Cancel]
```

### At Apply Time
Toast: "⚠️ Some widgets in this template are deprecated and were not added."

Widgets are simply skipped, rest of template applies normally.

---

## Default Template for New Users

### Admin Setting
- Toggle on template card: "Set as default for new users"
- Only one template can be default at a time
- Visual indicator: 🟢 "Default for New Users" badge

### New User Experience
1. User account created
2. System checks for default template
3. If exists: Template auto-applied (no backup needed - fresh user)
4. Template also appears in user's template list
5. User can freely modify their dashboard

---

## Data Model

### Template Object
```typescript
interface DashboardTemplate {
  id: string;                       // Unique identifier
  name: string;                     // Display name
  description?: string;             // Optional description
  category: string;                 // Category ID (admin-creatable)
  thumbnail?: string;               // CSS-scaled thumbnail data (generated on save)
  createdBy: string;                // User ID of creator
  createdAt: string;                // ISO timestamp
  lastModified: string;             // ISO timestamp
  version: string;                  // Schema version for compatibility
  widgets: TemplateWidget[];        // Widget definitions
  isDefault: boolean;               // Default for new users (admin only)
  sharedWith: 'all' | string[];     // User IDs or 'all' for global
}

interface TemplateWidget {
  type: string;                     // Widget type (e.g., 'plex', 'sonarr')
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

// Categories are admin-creatable, stored separately
interface TemplateCategory {
  id: string;
  name: string;
  color?: string;                   // Optional badge color
  createdBy: string;
  createdAt: string;
}
```

### User Template Reference
```typescript
interface UserTemplateRef {
  templateId: string;               // Reference to template
  sharedBy?: string;                // User ID who shared (if shared)
  sharedAt?: string;                // ISO timestamp
  lastApplied?: string;             // ISO timestamp
}
```

### Previous Dashboard Backup
```typescript
interface DashboardBackup {
  userId: string;
  savedAt: string;                  // ISO timestamp
  widgets: Widget[];                // Full widget data
  mobileLayoutMode: 'linked' | 'independent';
  mobileWidgets?: Widget[];
}
```

### Storage Locations
| Data | Location |
|------|----------|
| Templates | `templates` collection/table |
| User's template list | `user.preferences.templates[]` |
| Dashboard backup | `user.preferences.dashboardBackup` |
| Default template ID | `systemConfig.defaultTemplateId` |

---

## Mobile Considerations

### Builder Availability
- Template builder **desktop only**
- Settings page shows all template management features
- On mobile, "Create Template" and "Edit" buttons show tooltip: "Available on desktop"

### Alternative for Mobile Users
- "Save Current Dashboard as Template" works on mobile
- Users can apply templates on mobile
- All list management (delete, duplicate, etc.) works on mobile

---

## Implementation Phases (Suggested)

### Phase 1: Foundation & Data Model
- [ ] Database schema for templates
- [ ] API endpoints (CRUD)
- [ ] Previous dashboard backup storage
- [ ] Settings tab restructure

### Phase 2: Basic Template Management
- [ ] Template list UI with thumbnails
- [ ] Save current dashboard as template
- [ ] Apply template (with backup)
- [ ] Revert to previous dashboard
- [ ] Delete template
- [ ] Duplicate template
- [ ] Inline name/category editing

### Phase 3: Template Builder
- [ ] Full-screen modal builder
- [ ] Same RGL grid as dashboard
- [ ] Widget picker integration
- [ ] Drag/drop/resize in builder
- [ ] Undo/Redo system
- [ ] Widget preview components
- [ ] Save/Cancel flow

### Phase 4: Sharing System
- [ ] Share globally/individually UI
- [ ] Widget sharing conflict detection
- [ ] Shared template badges
- [ ] Default for new users
- [ ] Notification system integration (toast + persistent)

### Phase 5: Export/Import
- [ ] Export template to JSON
- [ ] Import template from JSON
- [ ] Version validation
- [ ] Deprecated widget handling

### Phase 6: Thumbnails & Polish
- [ ] iOS-style thumbnail generation
- [ ] Category badges/filtering
- [ ] Mobile messaging improvements
- [ ] Edge case handling
- [ ] Animation polish

---

## Open Items for Further Discussion

1. ~~**Thumbnail Generation**: Canvas-based rendering or CSS miniaturization?~~ **RESOLVED: CSS miniaturization**
2. **Category Filtering**: Should template list be filterable by category?
3. **Template Search**: Search by name? (Maybe for Phase 6+)
4. **Multi-select Actions**: Select multiple templates for bulk delete/export?
5. **Widget Preview Reuse**: Integrate builder's mock-data previews into main Add Widget modal?

---

## Related Documentation

- [TEMPLATE_BUILDER.md](./TEMPLATE_BUILDER.md) - Detailed builder UI specification
- `docs/reference/widgets.md` - Widget type definitions
- `docs/reference/architecture.md` - Component structure
- `docs/reference/database.md` - Database schema (to be updated)

---

## Design Guidelines

- **No emojis**: Use React Icons throughout the UI
- **Widget previews**: Must look identical to real widgets with mock/placeholder data
- **Animations**: Consistent with existing app animation patterns
- **Theming**: All UI must follow Framerr theming system

---

## Changelog

| Date | Changes |
|------|---------|
| 2025-12-23 | Initial draft |
| 2025-12-23 | Added: Undo/redo, thumbnails, categories, export/import, notifications, version compatibility, deletion behavior, revert system |
| 2025-12-23 | Finalized: Admin-creatable categories, CSS thumbnails, description field, wizard-style builder, no emojis (React icons). Split builder details to TEMPLATE_BUILDER.md |
