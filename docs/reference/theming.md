# Theming Reference

**Quick reference for Framerr theming system.**

For full documentation, see: `docs/theming/THEMING_ENGINE.md`

---

## Core Principle

**Every UI element must use theme variables. No hardcoded colors.**

---

## Quick Reference

### Utility Classes

```jsx
// Backgrounds
className="bg-theme-primary"     // Page background
className="bg-theme-secondary"   // Card background
className="bg-theme-tertiary"    // Elevated elements
className="bg-theme-hover"       // Hover state

// Text
className="text-theme-primary"   // Primary text
className="text-theme-secondary" // Secondary text
className="text-theme-tertiary"  // Tertiary text

// Borders
className="border-theme"         // Standard border
className="border-theme-light"   // Subtle border

// Status
className="text-success"         // Green
className="text-warning"         // Yellow
className="text-error"           // Red
className="text-info"            // Blue

// Accent
className="bg-accent"            // Primary accent
className="text-accent"          // Accent text
```

### CSS Variables (for inline styles)

```jsx
style={{ 
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-secondary)',
    borderColor: 'var(--border)'
}}
```

---

## DO vs DON'T

### ✅ DO

```jsx
<div className="bg-theme-secondary text-theme-primary border border-theme">
<button className="bg-accent hover:bg-accent-hover text-white">
<span style={{ color: 'var(--success)' }}>
```

### ❌ DON'T

```jsx
<div className="bg-slate-900 text-white border-slate-700">
<button className="bg-blue-600 hover:bg-blue-700">
<span style={{ color: '#10b981' }}>
```

---

## Testing Checklist

Before committing UI changes:
- [ ] Tested in Light theme (most important!)
- [ ] Tested with "Flatten UI" enabled
- [ ] No hardcoded hex colors
- [ ] No hardcoded Tailwind color classes

---

## Available Themes

1. Dark Pro (default)
2. Nord
3. Catppuccin
4. Dracula
5. Light

Theme files: `src/styles/themes/*.css`

---

## Common Patterns

### Card

```jsx
<div className="rounded-xl p-6 border border-theme bg-theme-secondary">
    <h3 className="text-lg font-semibold text-theme-primary">Title</h3>
    <p className="text-sm text-theme-secondary">Description</p>
</div>
```

### Button (Primary)

```jsx
<button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg">
    Click Me
</button>
```

### Input

```jsx
<input 
    className="w-full px-4 py-3 bg-theme-primary border border-theme text-theme-primary rounded-lg focus:border-accent"
/>
```

---

## Full Documentation

- **Theming Engine:** `docs/theming/THEMING_ENGINE.md`
- **CSS Variables:** `docs/theming/CSS_VARIABLES.md`
- **Component Patterns:** `docs/theming/COMPONENT_PATTERNS.md`
