# Phase 8 - Bug Tracking

**Created:** 2025-12-25  
**Status:** In Progress  
**Last Updated:** 2025-12-25 03:58 EST

---

## Bug Status Summary

| Bug | Description | Status |
|-----|-------------|--------|
| BUG-1 | Sensitive config handling | ✅ Fixed |
| BUG-2 | Link widget mockup overflow | ✅ Fixed |
| BUG-3 | "Update available" on first share | ✅ Fixed |
| BUG-4 | Edit vs Create mode flow | ✅ Fixed |
| BUG-5 | Duplicate save (draft + finalized) | ✅ Fixed |
| BUG-6 | Wizard snaps to Step 1 | ✅ Fixed |
| BUG-7 | Share dropdown relational state | ✅ Fixed |
| BUG-8 | Move Save/Share button to modal | ⏳ Not Started |
| BUG-9 | Default template for new users | 🔄 Partially Fixed |
| BUG-10 | Share count includes admin | ✅ Fixed |
| BUG-11 | isDefault checkbox not persisting | ⏳ Needs Fix |

---

## BUG-1: Sensitive Config Handling

**Priority:** P0  
**Status:** ✅ Fixed (2025-12-25)

**Problem:**  
When sharing templates, sensitive widget config properties (API keys, personal links) should be stripped.

**Solution Implemented:**
- Added `WIDGET_SENSITIVE_CONFIG` map to `shared/widgetIntegrations.ts`
- Supports `true` (entire config) or `string[]` (specific fields)
- Added `stripSensitiveConfig()` helper function
- Integrated stripping into template share endpoint and sync endpoint
- `link-grid` and `custom-html` marked as fully sensitive

**Files Modified:**
- `shared/widgetIntegrations.ts` - Added config map and helper
- `server/routes/templates.ts` - Integrated stripping in share/sync

---

## BUG-2: Link Widget Mockup Overflow

**Priority:** P3  
**Status:** ✅ Fixed (2025-12-25)

**Fix Applied:**  
Changed MockLinkGridWidget to use single centered 20px icon instead of multiple wrapping icons.

**File Modified:** `src/components/templates/MockWidgets.tsx`

---

## BUG-3: "Update Available" on First Share

**Priority:** P0  
**Status:** ✅ Fixed (Previous Session)

**Fix Applied:**  
Template copy now receives parent's version number so hasUpdate starts as false.

---

## BUG-4 + BUG-5: Edit Mode & Duplicate Save

**Priority:** P0  
**Status:** ✅ Fixed (Previous Session)

**Fixes Applied:**
- Edit mode skips auto-draft
- Discard in edit mode reverts changes instead of deleting
- No more duplicate draft + finalized templates

---

## BUG-6: Wizard Snaps to Step 1

**Priority:** P1  
**Status:** ✅ Fixed (Previous Session)

**Fix Applied:**  
Wizard step now only resets when modal opens, not on re-renders.

---

## BUG-7: Share Dropdown Relational State

**Priority:** P0  
**Status:** ✅ Fixed (2025-12-25)

**Fixes Applied:**
- Bidirectional auto-select: Everyone ↔ per-user mode
- User list visible in Everyone mode for deselection
- Selecting all users auto-switches to Everyone

**File Modified:** `src/components/templates/TemplateSharingDropdown.tsx`

---

## BUG-8: Move Save/Share Button to Modal

**Priority:** P1  
**Status:** ⏳ Not Started

**Problem:**  
Save/Cancel buttons are in the dropdown. Should be in the modal instead.

---

## BUG-9: Default Template for New Users

**Priority:** P2  
**Status:** 🔄 Partially Fixed / Needs Refactor

**What's Done:**
- ✅ isDefault checkbox now wired in TemplateBuilder Step 1
- ✅ setDefault API called after save if checked
- ✅ createUser attempts to apply default template

**What's Broken:**
- ❌ Dashboard widgets applied with wrong layout format (squished to left)
- ❌ isDefault checkbox doesn't persist when editing existing template
- ❌ Integration sharing not automatic
- ❌ Share count doesn't include auto-shared users

**Next Session Plan:**  
Complete refactor to use existing share infrastructure. See `PHASE9_DEFAULT_TEMPLATE.md`.

---

## BUG-10: Share Count Includes Admin

**Priority:** P1  
**Status:** ✅ Fixed (2025-12-25)

**Fix Applied:**  
Share route now excludes ALL admin-group users (not just template owner).

**File Modified:** `server/routes/templates.ts`

---

## BUG-11: isDefault Checkbox Not Persisting

**Priority:** P1  
**Status:** ⏳ Needs Fix

**Problem:**  
When editing an existing template, the isDefault checkbox doesn't show current state from database.

**Cause:**  
Initial data doesn't include isDefault status from template record.

**Files to Modify:**
- `src/components/templates/TemplateBuilder.tsx` (fetch isDefault on edit)
- `src/components/settings/TemplateSettings.tsx` (pass isDefault to builder)
