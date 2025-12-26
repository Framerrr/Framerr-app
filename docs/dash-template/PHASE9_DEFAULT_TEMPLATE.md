# Phase 9 - Default Template System Refactor

**Created:** 2025-12-25  
**Status:** Planning Complete  
**Priority:** P0

---

## Overview

The "Set as default for new users" feature needs a complete refactor to properly integrate with existing sharing infrastructure instead of duplicating logic.

---

## Current Problems

1. **Widget layout format mismatch** - createUser uses different format than Apply route
2. **Integration sharing not automatic** - Integrations needed by template not shared
3. **Bypasses share infrastructure** - Creates template copy directly instead of using share logic
4. **Toast message not informative** - Doesn't tell admin what template/integrations were shared
5. **isDefault checkbox doesn't persist** - Can't uncheck to remove default
6. **sharedBy shows "admin"** - Instead of actual admin username

---

## Architecture Decision

**Approach:** Use existing share infrastructure for default template, not custom logic.

When new user is created:
1. Use **existing share route logic** to create template copy with proper `sharedBy`
2. Use **existing apply route logic** for correct dashboard widget format
3. **Server-side integration sharing** (new helper function)
4. Return template info to frontend for conditional toast

---

## Implementation Plan

### Step 1: Server-Side Integration Sharing Helper

Create reusable function in `server/db/integrations.ts`:

```typescript
async function shareIntegrationsForTemplate(
    templateId: string, 
    targetUserIds: string[], 
    adminId: string
): Promise<string[]>
```

- Takes template, gets required integrations from widget types
- Updates sharing config for each integration to include target users
- Returns list of integration names that were shared

### Step 2: Refactor createUser Default Template Application

Replace current custom logic with:

```typescript
// In createUser (server/db/users.ts)
if (!isAdmin && defaultTemplate) {
    // 1. Use share infrastructure to create template copy
    const userCopy = await templateDb.createTemplate({
        ownerId: newUserId,
        sharedFromId: defaultTemplate.id,
        // ... same as share route
    });
    
    // 2. Share required integrations
    const sharedIntegrations = await shareIntegrationsForTemplate(
        defaultTemplate.id,
        [newUserId],
        defaultTemplate.ownerId
    );
    
    // 3. Apply template using same logic as Apply route
    const dashboardWidgets = convertTemplateWidgetsToDashboard(defaultTemplate.widgets);
    await updateUserConfig(newUserId, { dashboard: { widgets: dashboardWidgets, ... } });
    
    // 4. Return extra info for toast
    return {
        user,
        defaultTemplate: {
            name: defaultTemplate.name,
            sharedIntegrations
        }
    };
}
```

### Step 3: Extract Widget Conversion Helper

Create shared helper in `server/db/templates.ts`:

```typescript
export function convertTemplateWidgetsToDashboard(widgets: TemplateWidget[]): DashboardWidget[] {
    return widgets.map((tw, index) => {
        const widgetId = `widget-${Date.now()}-${index}`;
        return {
            i: widgetId,
            id: widgetId,
            type: tw.type,
            x: tw.layout.x,
            y: tw.layout.y,
            w: tw.layout.w,
            h: tw.layout.h,
            layouts: { lg: tw.layout },
            config: tw.config || {},
        };
    });
}
```

Use in both Apply route and createUser.

### Step 4: Update Admin Route Response

Modify `server/routes/admin.ts` POST /users:

```typescript
res.status(201).json({ 
    user: newUser,
    defaultTemplate: result.defaultTemplate // { name, sharedIntegrations }
});
```

### Step 5: Conditional Toast in Frontend

Update `UsersSettings.tsx`:

```typescript
const response = await fetch(url, { ... });
const data = await response.json();

if (data.defaultTemplate) {
    const { name, sharedIntegrations } = data.defaultTemplate;
    let message = `User "${formData.username}" created with template "${name}"`;
    
    if (sharedIntegrations.length > 0) {
        const displayList = sharedIntegrations.slice(0, 3).join(', ');
        const extra = sharedIntegrations.length > 3 
            ? `, and ${sharedIntegrations.length - 3} more` 
            : '';
        message += ` and ${sharedIntegrations.length} integrations shared (${displayList}${extra})`;
    }
    
    showSuccess('User Created', message);
} else {
    showSuccess('User Created', `User "${formData.username}" created successfully`);
}
```

### Step 6: Fix isDefault Checkbox Persistence

In TemplateBuilder, when loading existing template for edit:
- Fetch template with isDefault status
- Pass to Step 1 as initial data

---

## Toast Message Examples

**No default template:**
```
User Created
User "johndoe" created successfully
```

**With template, 1-3 integrations:**
```
User Created
User "johndoe" created with template "Media Dashboard" and 3 integrations shared (Plex, Radarr, Sonarr)
```

**With template, 4+ integrations:**
```
User Created
User "johndoe" created with template "Full Dashboard" and 5 integrations shared (Plex, Radarr, Sonarr, and 2 more)
```

**With template, no integrations:**
```
User Created
User "johndoe" created with template "Simple Dashboard"
```

---

## Future Consideration: Server-Side Share Integration Endpoint

After this refactor, consider replacing client-side integration sharing in TemplateSharingDropdown with:

```
POST /api/templates/:id/share
Body: { sharedWith, shareIntegrations: true }
```

This would make the share route handle integration sharing server-side, eliminating client-side config manipulation.

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/db/integrations.ts` | New: shareIntegrationsForTemplate helper |
| `server/db/templates.ts` | New: convertTemplateWidgetsToDashboard helper |
| `server/db/users.ts` | Refactor createUser default template logic |
| `server/routes/admin.ts` | Return defaultTemplate info in response |
| `server/routes/templates.ts` | Use new widget conversion helper |
| `src/components/settings/UsersSettings.tsx` | Conditional toast message |
| `src/components/templates/TemplateBuilder.tsx` | Load isDefault on edit |

---

## Execution Order

1. Create `shareIntegrationsForTemplate` helper
2. Create `convertTemplateWidgetsToDashboard` helper  
3. Update Apply route to use helper (verify no regression)
4. Refactor createUser to use helpers and share infrastructure
5. Update admin route response
6. Update frontend toast
7. Fix isDefault checkbox persistence
8. Test full flow
