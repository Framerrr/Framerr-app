---
description: Theming system compliance rules for Framerr - enforced by Antigravity
---

# Framerr Theming System Rules

**CRITICAL: These theming rules are MANDATORY and MUST be followed when creating/editing ANY UI component.**

---

## 🎨 RULE 14: Theming System Compliance (MANDATORY)

**Enforcement:** BLOCKING - Agent MUST follow theming rules when creating/editing UI

### Before Creating/Editing ANY UI Component

**MUST read theming documentation:**
1. `docs/theming/DEVELOPER_GUIDE.md` - Core guidelines and patterns
2. `docs/theming/CSS_VARIABLES.md` - Available variables reference
3. `docs/theming/COMPONENT_PATTERNS.md` - Copy-paste patterns

---

## ✅ MUST DO

### 1. Use Theme Utility Classes or CSS Variables for ALL Colors
```jsx
// ✅ CORRECT
className="bg-theme-secondary text-theme-primary border-theme"
style={{ color: 'var(--accent)' }}
```

### 2. Use Status Variables for Status Indicators
```jsx
// ✅ CORRECT
color: `var(--${isSuccess ? 'success' : 'error'})`
```

### 3. Use Glassmorphism Classes
- `.glass-card` - Strong glass effect
- `.glass-subtle` - Subtle glass effect
- Automatically respects flatten UI mode
- Adapts to all themes

### 4. Test in Light Theme BEFORE Committing
- All text must be readable
- All borders must be visible
- No white text on white backgrounds
- **THIS IS MANDATORY**

### 5. Test with Flatten UI Enabled
- Settings → Customization → Flatten UI Design
- Verify appearance acceptable both ways

---

## ❌ NEVER DO

### 1. NEVER Use Hardcoded Tailwind Color Classes
```jsx
// ❌ WRONG - Bypasses theming
className="text-white bg-slate-900 border-slate-700"
```

### 2. NEVER Use Hardcoded Hex Colors
```jsx
// ❌ WRONG - Bypasses theming
style={{ color: '#3b82f6', background: '#1f2937' }}
```

### 3. NEVER Use RGB/HSL Values Directly
```jsx
// ❌ WRONG
style={{ color: 'rgb(59, 130, 246)' }}
```

### 4. NEVER Mix Theme and Non-Theme Classes
```jsx
// ❌ WRONG - Inconsistent
className="bg-theme-secondary text-white"
```

### 5. NEVER Hardcode Glassmorphism Effects
```jsx
// ❌ WRONG - Won't respect flatten mode
style={{ backdropFilter: 'blur(20px)' }}
```

---

## Testing Checklist (BLOCKING Before Commit)

Agent MUST verify:
- [ ] Tested in Dark Pro theme
- [ ] **Tested in Light theme (CRITICAL - most important)**
- [ ] Tested with flatten UI enabled
- [ ] No hardcoded hex colors in code
- [ ] No hardcoded Tailwind color classes
- [ ] Build passes: `npm run build`

**Automated checks:**
```bash
# Check for hardcoded hex colors
grep -r "#[0-9a-fA-F]\{6\}" src/components/YourFile.jsx

# Check for hardcoded Tailwind classes
grep -E "text-(white|slate|gray)-" src/components/YourFile.jsx
```

---

## Quick Reference

### Available Utility Classes
- **Backgrounds**: `.bg-theme-primary`, `.bg-theme-secondary`, `.bg-theme-tertiary`, `.bg-theme-hover`
- **Text**: `.text-theme-primary`, `.text-theme-secondary`, `.text-theme-tertiary`
- **Borders**: `.border-theme`, `.border-theme-light`
- **Status**: `.text-success`, `.text-warning`, `.text-error`, `.text-info`
- **Accents**: `.bg-accent`, `.text-accent`, `.border-accent`

### Common Patterns
See `docs/theming/COMPONENT_PATTERNS.md` for copy-paste ready examples:
- Cards, Buttons, Forms, Inputs
- Modals, Tabs, Dropdowns
- Progress bars, Status badges
- Widget containers

---

## Exceptions

**NONE.** Every UI element MUST use the theme system.

---

## Rationale

- Ensures consistent theming across entire application
- Enables user customization (custom colors)
- Supports Light/Dark theme switching
- Maintains accessibility (WCAG AA compliance)
- Respects flatten UI mode preference

---

## Documentation Reference

- **Architecture**: `docs/theming/THEMING_ENGINE.md`
- **Developer Guide**: `docs/theming/DEVELOPER_GUIDE.md`
- **CSS Variables** (71 total): `docs/theming/CSS_VARIABLES.md`
- **Patterns**: `docs/theming/COMPONENT_PATTERNS.md`
- **Migration Guide**: `docs/theming/MIGRATION_GUIDE.md` (for reference)

---

**Last Updated:** 2025-11-30  
**Enforcement Level:** P0 Critical (BLOCKING)  
**Compatible With:** Antigravity Rules System v1.0+
