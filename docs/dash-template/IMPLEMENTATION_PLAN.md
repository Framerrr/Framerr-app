# Template Engine - Implementation Plan

**Project:** Dashboard Template Engine  
**Status:** PLANNING  
**Created:** 2025-12-23  
**Priority:** Medium  
**Estimated Sessions:** 8-12

---

## Overview

Multi-session implementation of the dashboard template system. This document provides phase-by-phase instructions for agents to follow using the chatflow system (`/start-session`, `/end-session`).

**Prerequisites:**
- Read `TEMPLATE_ENGINE.md` - Feature specification
- Read `TEMPLATE_BUILDER.md` - Builder UI specification
- Read `DASHBOARD_ANALYSIS.md` - Parity requirements

---

## Implementation Phases

### Phase 1: Database Schema & API Foundation

**Sessions:** 2-3  
**Goal:** Database tables, migrations, and basic CRUD API

#### 1.1 Database Migration

**File:** `server/database/migrations/XXX_add_templates.sql`

```sql
-- Template Categories (admin-managed)
CREATE TABLE IF NOT EXISTS template_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Dashboard Templates
CREATE TABLE IF NOT EXISTS dashboard_templates (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT,
    widgets TEXT NOT NULL DEFAULT '[]',     -- JSON array of widget objects
    thumbnail TEXT,                          -- Base64 or null (generated client-side)
    is_draft INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,           -- Default for new users (only one)
    shared_from_id TEXT,                    -- Original template ID if shared copy
    user_modified INTEGER DEFAULT 0,        -- User edited their shared copy
    version INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES template_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (shared_from_id) REFERENCES dashboard_templates(id) ON DELETE SET NULL
);

-- Template Sharing (many-to-many)
CREATE TABLE IF NOT EXISTS template_shares (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    shared_with TEXT NOT NULL,              -- User ID or 'everyone'
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (template_id) REFERENCES dashboard_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
);

-- Dashboard Backup (for revert)
CREATE TABLE IF NOT EXISTS dashboard_backups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,           -- One backup per user
    widgets TEXT NOT NULL,
    mobile_layout_mode TEXT DEFAULT 'linked',
    mobile_widgets TEXT,
    backed_up_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_templates_owner ON dashboard_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON dashboard_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_shared_from ON dashboard_templates(shared_from_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_template ON template_shares(template_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_user ON template_shares(shared_with);
```

#### 1.2 API Routes

**File:** `server/routes/templates.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List user's templates + shared |
| GET | `/api/templates/:id` | Get template details |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/templates/:id/apply` | Apply to dashboard |
| POST | `/api/templates/:id/share` | Share template (admin) |
| DELETE | `/api/templates/:id/share/:userId` | Revoke share |
| POST | `/api/templates/:id/revert-to-shared` | Resync with original |
| POST | `/api/templates/draft` | Auto-save draft |
| GET | `/api/templates/categories` | List categories |
| POST | `/api/templates/categories` | Create category (admin) |
| DELETE | `/api/templates/categories/:id` | Delete category (admin) |

#### 1.3 Verification

- [ ] Migration runs without errors
- [ ] All tables created with correct schema
- [ ] CRUD operations work via API tests
- [ ] Share/unshare notifications send correctly

---

### Phase 2: Template Builder UI - Step 1 & 3

**Sessions:** 2  
**Goal:** Setup wizard (Step 1) and Review screen (Step 3)

#### 2.1 Components

**New Files:**
- `src/components/templates/TemplateBuilder.tsx` - Main wizard container
- `src/components/templates/TemplateBuilderStep1.tsx` - Setup form
- `src/components/templates/TemplateBuilderStep3.tsx` - Review screen
- `src/components/templates/CategoryDropdown.tsx` - Category selector

#### 2.2 Step 1 Implementation

- Template name input (required)
- Category dropdown with admin "+ New Category" option
- Description textarea (optional)
- Default for New Users toggle (admin only)
- Next button validation

#### 2.3 Step 3 Implementation

- Thumbnail preview (CSS-scaled)
- Info display (name, category, description, widget count)
- Action buttons: Cancel, Save, Save & Apply, Save & Share
- Share dropdown with widget conflict detection

#### 2.4 Verification

- [ ] Form validation works correctly
- [ ] Category creation works (admin)
- [ ] Save actions call correct API
- [ ] Widget conflict modal appears when needed

---

### Phase 3: Template Builder UI - Step 2 (Grid Editor)

**Sessions:** 2-3  
**Goal:** Visual grid editor with widget sidebar

#### 3.1 Critical Parity

**MUST use same grid configuration as Dashboard.tsx:**
```typescript
import { LAYOUT } from '../constants/layout';
import { generateMobileLayout } from '../utils/layoutUtils';
import { WIDGET_TYPES, getWidgetMetadata } from '../utils/widgetRegistry';
```

#### 3.2 Components

**New Files:**
- `src/components/templates/TemplateBuilderStep2.tsx` - Grid editor
- `src/components/templates/WidgetSidebar.tsx` - Widget selection
- `src/components/templates/WidgetPreview.tsx` - Reusable mock widget
- `src/components/templates/BuilderToolbar.tsx` - Undo/Redo/Preview

#### 3.3 Widget Sidebar

- All widget types from registry
- Scaled preview with mock data
- Click to add at top of grid
- Drag to specific position

#### 3.4 Undo/Redo System

```typescript
interface BuilderHistoryState {
  widgets: TemplateWidget[];
  name: string;
  category: string;
  description: string;
}

const [undoStack, setUndoStack] = useState<BuilderHistoryState[]>([]);
const [redoStack, setRedoStack] = useState<BuilderHistoryState[]>([]);
```

#### 3.5 Verification

- [ ] Grid matches dashboard exactly (visual comparison)
- [ ] Widget sizes respect registry constraints
- [ ] Undo/Redo works correctly
- [ ] Mobile preview uses layoutUtils

---

### Phase 4: Template List & Preview Modal

**Sessions:** 1-2  
**Goal:** Template list in settings and preview modal

#### 4.1 Components

**New Files:**
- `src/components/templates/TemplateList.tsx` - Settings section
- `src/components/templates/TemplateCard.tsx` - Horizontal card
- `src/components/templates/TemplatePreviewModal.tsx` - View-only preview
- `src/components/templates/CategoryFilter.tsx` - Filter dropdown

#### 4.2 Template Card Features

- Left: Clickable thumbnail
- Center: Name, shared info, category
- Right: Edit, Share, Delete buttons
- Badges: Draft, Shared by, Updated, Deprecated

#### 4.3 Preview Modal Features

- Desktop/Mobile toggle tabs
- Read-only grid layout
- Apply Template button
- Edit button (desktop only)

#### 4.4 Verification

- [ ] Cards display correctly
- [ ] Preview modal shows correct layout
- [ ] Apply template creates backup
- [ ] Mobile hides edit buttons

---

### Phase 5: Auto-Save Draft System

**Sessions:** 1  
**Goal:** Persistent draft saving

#### 5.1 Implementation

- Debounced save (every 5-10 seconds)
- Draft flag in database
- Draft badge on cards
- Continue/Delete draft options

#### 5.2 Mobile Breakpoint Handling

- Detect breakpoint change
- Show error overlay
- Preserve wizard state (hidden, not destroyed)
- Resume on breakpoint restore

#### 5.3 Verification

- [ ] Drafts persist on browser close
- [ ] Drafts appear in template list
- [ ] Mobile breakpoint shows error
- [ ] Resize to desktop resumes editing

---

### Phase 6: Sharing System

**Sessions:** 1-2  
**Goal:** Admin sharing with notifications

#### 6.1 Sharing Flow

- Share dropdown (everyone, specific users)
- Widget conflict detection modal
- "Share Widget Access" option integration
- Notification on share

#### 6.2 Dynamic Copy Model

- Create copy for recipient
- Track original via `shared_from_id`
- Update badge when original changes
- Revert to Shared button

#### 6.3 Verification

- [ ] Share creates copy for recipients
- [ ] Widget conflicts detected
- [ ] Notifications sent
- [ ] Revert to Shared works

---

### Phase 7: Default Template & New User Setup

**Sessions:** 1  
**Goal:** Default template application for new users

#### 7.1 Implementation

- Only one template can be default
- Apply on user creation
- Admin toggle in builder Step 1

#### 7.2 Verification

- [ ] Only one default at a time
- [ ] New users get default template
- [ ] Default badge shows correctly

---

### Phase 8: Polish & Edge Cases

**Sessions:** 1-2  
**Goal:** Handle all edge cases

#### 8.1 Edge Cases

- Deprecated widget handling (skip + badge)
- Empty template saving
- Template name conflicts
- Apply same template twice
- Category deletion (move to uncategorized)

#### 8.2 Animations (Optional)

- Step transitions
- Widget add/remove
- Sidebar collapse
- Modal open/close

#### 8.3 Verification

- [ ] All edge cases handled gracefully
- [ ] Deprecated widgets show warning
- [ ] Category deletion works

---

## Chatflow Integration

### Session File Updates

Each session MUST update `docs/chatflow/TASK_CURRENT.md` with:

```markdown
## Template Engine Progress

### Current Phase: [Phase N]
### Current Step: [Step X.Y]
### Next Action: [Explicit step]

### Completed Phases
- [x] Phase 1: Database Schema
- [ ] Phase 2: Builder Steps 1 & 3
- [ ] Phase 3: Builder Step 2 (Grid)
...
```

### Handoff Requirements

End each session with:
1. Phase and step completed
2. Explicit next action
3. Any blockers discovered
4. Files changed list

---

## Testing Strategy

### Automated Tests

Currently no automated tests exist for templates (new feature).

**Recommend adding:**
- API integration tests for CRUD
- Component tests for form validation

### Manual Verification

| Test | Steps |
|------|-------|
| Grid Parity | Create template, apply, compare visually to original dashboard |
| Widget Constraints | Resize widgets in builder, verify min/max respected |
| Mobile Layout | Toggle mobile preview, verify matches real mobile |
| Draft Persistence | Close browser mid-edit, verify draft exists on return |
| Share Flow | Share template, verify recipient sees copy |

---

## File Structure

```
src/
├── components/
│   └── templates/
│       ├── TemplateBuilder.tsx
│       ├── TemplateBuilderStep1.tsx
│       ├── TemplateBuilderStep2.tsx
│       ├── TemplateBuilderStep3.tsx
│       ├── TemplateList.tsx
│       ├── TemplateCard.tsx
│       ├── TemplatePreviewModal.tsx
│       ├── WidgetSidebar.tsx
│       ├── WidgetPreview.tsx
│       ├── BuilderToolbar.tsx
│       ├── CategoryDropdown.tsx
│       └── CategoryFilter.tsx
├── hooks/
│   └── useTemplateBuilder.ts
└── types/
    └── template.ts

server/
├── routes/
│   └── templates.ts
├── db/
│   └── templates.ts
└── database/
    └── migrations/
        └── XXX_add_templates.sql

docs/
└── dash-template/
    ├── TEMPLATE_ENGINE.md
    ├── TEMPLATE_BUILDER.md
    ├── DASHBOARD_ANALYSIS.md
    └── IMPLEMENTATION_PLAN.md (this file)
```

---

## Version Tracking

| Phase | Status | Sessions | Notes |
|-------|--------|----------|-------|
| 1 | Pending | 0/2-3 | Database & API |
| 2 | Pending | 0/2 | Steps 1 & 3 |
| 3 | Pending | 0/2-3 | Step 2 Grid |
| 4 | Pending | 0/1-2 | List & Preview |
| 5 | Pending | 0/1 | Draft System |
| 6 | Pending | 0/1-2 | Sharing |
| 7 | Pending | 0/1 | Default Template |
| 8 | Pending | 0/1-2 | Polish |

---

## Changelog

| Date | Update |
|------|--------|
| 2025-12-23 | Initial plan created |
