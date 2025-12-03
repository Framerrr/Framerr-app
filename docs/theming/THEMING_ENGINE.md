# Framerr Theming Engine - Architecture & Extensibility Guide
**Last Updated**: 2025-11-30  
**Version**: 2.0 (Post-Refactor)  
**Status**: Architecture Documentation
---
## Table of Contents
1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [CSS Variable System](#css-variable-system)
4. [Theme Definition](#theme-definition)
5. [Component Integration](#component-integration)
6. [Custom Colors](#custom-colors)
7. [Extensibility Guidelines](#extensibility-guidelines)
8. [Common Patterns](#common-patterns)
---
## System Overview
### Design Philosophy
**Goal**: Every UI element must respect the active theme and custom colors with zero hardcoded values.
**Principles**:
1. **Single Source of Truth**: CSS variables defined in theme files
2. **Semantic Naming**: Variables describe purpose, not color (`--text-primary` not `--gray-900`)
3. **Layered System**: Themes → Custom Colors → Component Usage
4. **Graceful Degradation**: Fallbacks to Tailwind if variables fail
### Data Flow
```
User Action → Theme Selection
     ↓
ThemeContext updates
     ↓
<html data-theme="themeName"> attribute set
     ↓
Theme CSS file loads (e.g., dark-pro.css)
     ↓
30+ CSS variables defined on :root
     ↓
Custom colors override variables (if set)
     ↓
Components use variables via utility classes
     ↓
UI updates with theme colors
```
---
## Core Architecture
### File Structure
```
src/
├── context/
│   └── ThemeContext.jsx         # Theme state management
├── styles/
│   ├── design-system.css        # Utility classes (theme-aware)
│   ├── premium-effects.css      # Glassmorphism, animations
│   └── themes/
│       ├── dark-pro.css         # Default dark theme
│       ├── nord.css             # Arctic frost theme
│       ├── catppuccin.css       # Pastel theme
│       ├── dracula.css          # Purple theme
│       └── light.css            # Light theme
└── components/
    └── settings/
        └── CustomizationSettings.jsx  # Theme selector + custom colors
```
### Component Roles
#### 1. ThemeContext (`src/context/ThemeContext.jsx`)
**Responsibilities**:
- Maintain current theme state
- Persist theme to backend (`/api/theme`)
- Apply `data-theme` attribute to `<html>`
- Provide theme list and change function
**API**:
```jsx
const { theme, themes, changeTheme, loading } = useTheme();
// theme: string - Current theme ID ('dark-pro', 'nord', etc.)
// themes: array - Available themes with metadata
// changeTheme: function - Switch theme
// loading: boolean - Loading state
```
**Important**: This component works correctly and needs NO changes.
#### 2. Theme CSS Files (`src/styles/themes/*.css`)
**Responsibilities**:
- Define CSS variables for ONE theme
- Scoped to `:root[data-theme="themeName"]`
- Provide all 30+ required variables
**Structure**:
```css
:root[data-theme="dark-pro"] {
    /* Backgrounds (4) */
    --bg-primary: #0a0e1a;
    --bg-secondary: #151922;
    --bg-tertiary: #1f2937;
    --bg-hover: #374151;
    /* Accents (4) */
    --accent: #3b82f6;
    --accent-hover: #2563eb;
    --accent-light: #60a5fa;
    --accent-secondary: #06b6d4;
    /* Text (3) */
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-tertiary: #64748b;
    /* Borders (2) */
    --border: #374151;
    --border-light: #1f2937;
    /* Status (4) */
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --info: #3b82f6;
    /* Premium (10+) */
    --glass-start: rgba(30, 41, 59, 0.9);
    --glass-end: rgba(15, 23, 42, 0.95);
    --border-glass: rgba(71, 85, 105, 0.5);
    --accent-glow: rgba(59, 130, 246, 0.3);
    --gradient-1: #0a0e1a;
    /* ... etc */
}
```
#### 3. Design System (`src/styles/design-system.css`)
**Responsibilities**:
- Provide utility classes that use CSS variables
- Enable theme-aware styling without inline styles
- Replace Tailwind color classes
**Current utilities** (10 classes):
```css
.bg-accent { background-color: var(--accent) !important; }
.text-accent { color: var(--accent) !important; }
.border-accent { border-color: var(--accent) !important; }
/* ... 7 more */
```
**Required expansion** (40+ classes):
```css
/* Backgrounds */
.bg-theme-primary { background-color: var(--bg-primary); }
.bg-theme-secondary { background-color: var(--bg-secondary); }
.bg-theme-tertiary { background-color: var(--bg-tertiary); }
.bg-theme-hover { background-color: var(--bg-hover); }
/* Text */
.text-theme-primary { color: var(--text-primary); }
.text-theme-secondary { color: var(--text-secondary); }
.text-theme-tertiary { color: var(--text-tertiary); }
/* Borders */
.border-theme { border-color: var(--border); }
.border-theme-light { border-color: var(--border-light); }
/* Status */
.text-success { color: var(--success); }
.text-warning { color: var(--warning); }
.text-error { color: var(--error); }
.text-info { color: var(--info); }
.bg-success { background-color: var(--success); }
.bg-warning { background-color: var(--warning); }
.bg-error { background-color: var(--error); }
.bg-info { background-color: var(--info); }
/* Hover states */
.hover\:bg-theme-hover:hover { background-color: var(--bg-hover); }
.hover\:text-theme-primary:hover { color: var(--text-primary); }
/* ... etc */
```
#### 4. CustomizationSettings (`src/components/settings/CustomizationSettings.jsx`)
**Responsibilities**:
- Display theme selector (preset themes)
- Provide custom color pickers
- Override CSS variables with user values
- Persist custom colors to backend
**Current support**: 7 colors  
**Planned support**: 23 colors (all non-premium variables)
---
## CSS Variable System
### Complete Variable Reference
#### Core Variables (Required in ALL themes)
| Variable | Purpose | Example (Dark Pro) | Example (Light) |
|----------|---------|-------------------|-----------------|
| `--bg-primary` | Page background | `#0a0e1a` | `#ffffff` |
| `--bg-secondary` | Card background | `#151922` | `#f8fafc` |
| `--bg-tertiary` | Elevated elements | `#1f2937` | `#f1f5f9` |
| `--bg-hover` | Hover state background | `#374151` | `#e2e8f0` |
| `--accent` | Primary accent | `#3b82f6` | `#3b82f6` |
| `--accent-hover` | Accent hover | `#2563eb` | `#2563eb` |
| `--accent-light` | Accent subtle | `#60a5fa` | `#60a5fa` |
| `--accent-secondary` | Secondary accent | `#06b6d4` | `#06b6d4` |
| `--text-primary` | Primary text | `#f1f5f9` | `#0f172a` |
| `--text-secondary` | Secondary text | `#94a3b8` | `#475569` |
| `--text-tertiary` | Tertiary text | `#64748b` | `#64748b` |
| `--border` | Border color | `#374151` | `#cbd5e1` |
| `--border-light` | Subtle border | `#1f2937` | `#e2e8f0` |
| `--success` | Success state | `#10b981` | `#10b981` |
| `--warning` | Warning state | `#f59e0b` | `#f59e0b` |
| `--error` | Error state | `#ef4444` | `#ef4444` |
| `--info` | Info state | `#3b82f6` | `#3b82f6` |
#### Premium Variables (Optional but recommended)
| Variable | Purpose |
|----------|---------|
| `--glass-start` | Glassmorphism gradient start |
| `--glass-end` | Glassmorphism gradient end |
| `--border-glass` | Glass border color |
| `--accent-glow` | Glow effect color |
| `--accent-glow-soft` | Soft glow effect |
| `--gradient-1/2/3/4` | Animated background gradient stops |
| `--blur-strong` | Strong blur value (20px) |
| `--blur-medium` | Medium blur value (12px) |
| `--blur-subtle` | Subtle blur value (8px) |
| `--shadow-sm/md/lg/xl` | Shadow definitions |
### Variable Naming Conventions
**Pattern**: `--{category}-{variant}`
**Categories**:
- `bg`: Backgrounds
- `text`: Text colors
- `border`: Border colors
- `accent`: Accent colors
- `success/warning/error/info`: Status colors
- `glass`: Glassmorphism effects
- `gradient`: Gradient stops
- `blur`: Blur values
- `shadow`: Shadow definitions
**Variants**:
- `primary`: Main/most important
- `secondary`: Less important
- `tertiary`: Least important
- `hover`: Hover state
- `light`: Lighter version
- `start/end`: Gradient endpoints
---
## Theme Definition
### Creating a New Theme
**Step 1**: Create theme file at `src/styles/themes/mytheme.css`
```css
/* My Custom Theme - Description */
:root[data-theme="mytheme"] {
    /* Define all 17 core variables */
    --bg-primary: #...;
    --bg-secondary: #...;
    /* ... (see Complete Variable Reference) */
    
    /* Define premium variables (optional) */
    --glass-start: rgba(...);
    /* ... */
}
```
**Step 2**: Import in `ThemeContext.jsx`
```jsx
// Add to imports
import '../styles/themes/mytheme.css';
// Add to themes array
const themes = [
    // ... existing themes
    { 
        id: 'mytheme', 
        name: 'My Custom Theme', 
        description: 'Beautiful custom colors' 
    }
];
```
**Step 3**: Update `CustomizationSettings.jsx` color preview
```jsx
// In theme color preview section
backgroundColor: t.id === 'mytheme' ? '#your-bg-color' : /* ... */
```
**Done!** Theme is now available in selector.
### Theme Testing Checklist
When creating a new theme, verify:
- [ ] All 17 core variables defined
- [ ] Text contrast passes WCAG AA (4.5:1 for small text)
- [ ] Accent color has good visibility on backgrounds
- [ ] Border colors visible but not harsh
- [ ] Status colors distinct from each other
- [ ] Premium variables defined for glassmorphism
- [ ] Test on all pages: Dashboard, Settings, Widgets
- [ ] Test with custom colors enabled/disabled
---
## Component Integration
### The Three Ways to Use Theme Colors
#### 1. Utility Classes (RECOMMENDED)
Use pre-defined classes from `design-system.css`:
```jsx
<div className="bg-theme-secondary border border-theme">
    <h1 className="text-theme-primary">Title</h1>
    <p className="text-theme-secondary">Description</p>
</div>
```
**Pros**: Clean, reusable, no inline styles  
**Cons**: Limited to defined utilities
#### 2. CSS Variables in Inline Styles
For dynamic or computed values:
```jsx
<div style={{ 
    backgroundColor: `var(--bg-${level})`,
    color: isActive ? 'var(--success)' : 'var(--text-tertiary)'
}}>
    Content
</div>
```
**Pros**: Flexible, still theme-aware  
**Cons**: Inline styles, harder to maintain
#### 3. CSS Modules with Variables
For component-specific styling:
```css
/* Component.module.css */
.container {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
}
.title {
    color: var(--text-primary);
}
```
**Pros**: Scoped, clean separation  
**Cons**: More files to manage
### Migration Patterns
#### Pattern 1: Simple Class Replacement
```jsx
// BEFORE ❌
<h1 className="text-white">Title</h1>
// AFTER ✅
<h1 className="text-theme-primary">Title</h1>
```
#### Pattern 2: Complex Conditional Classes
```jsx
// BEFORE ❌
<button className={`px-4 py-2 ${
    isActive 
        ? 'bg-blue-600 text-white' 
        : 'bg-slate-700 text-slate-300'
}`}>
// AFTER ✅
<button className={`px-4 py-2 ${
    isActive 
        ? 'bg-accent text-white' 
        : 'bg-theme-tertiary text-theme-secondary'
}`}>
```
#### Pattern 3: Inline Hex to Variable
```jsx
// BEFORE ❌
<div style={{ color: '#4ade80' }}>Success</div>
// AFTER ✅
<div style={{ color: 'var(--success)' }}>Success</div>
```
#### Pattern 4: Status Color Logic
```jsx
// BEFORE ❌
const getColor = (value) => {
    if (value < 50) return '#4caf50';  // green
    if (value < 75) return '#ffc107';  // yellow
    return '#f44336';  // red
};
// AFTER ✅
const getColor = (value) => {
    if (value < 50) return 'var(--success)';
    if (value < 75) return 'var(--warning)';
    return 'var(--error)';
};
```
---
## Custom Colors
### Architecture
**User Flow**:
1. User selects "Custom Colors" in Customization settings
2. Picks 23 custom colors via color pickers
3. Clicks "Apply Custom Colors"
4. System overrides CSS variables on `<html>` element
5. Changes persist to backend and apply on reload
### Implementation
**Frontend** (`CustomizationSettings.jsx`):
```jsx
const handleSaveCustomColors = async () => {
    // Apply to DOM immediately
    Object.entries(customColors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
    });
    
    // Save to backend
    await axios.put('/api/config/user', {
        theme: {
            mode: 'custom',
            customColors: customColors
        }
    });
};
```
**Backend** (`/api/config/user`):
```json
{
    "theme": {
        "mode": "custom",
        "customColors": {
            "bg-primary": "#0a0e1a",
            "accent": "#ff00ff",
            // ... 21 more
        }
    }
}
```
**On Page Load**:
```jsx
// ThemeContext loads user config
// If mode === 'custom', apply customColors to DOM
if (userConfig.theme.mode === 'custom') {
    Object.entries(userConfig.theme.customColors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
    });
}
```
### Supported Colors (23 total)
**7 Current**:
- `bg-primary`, `bg-secondary`
- `accent`, `accent-secondary`
- `text-primary`, `text-secondary`
- `border`
**16 New**:
- `bg-tertiary`, `bg-hover`
- `accent-hover`, `accent-light`
- `text-tertiary`
- `border-light`
- `success`, `warning`, `error`, `info` (4)
- Premium: `glass-start`, `glass-end`, `border-glass`, `accent-glow`, `accent-glow-soft` (5)
---
## Flatten UI Mode
### What is Flatten UI?
**Flatten UI** is a visual mode that removes glassmorphism effects (blur, transparency, shadows) for a simpler, more traditional flat design.
**Two levels**:
1. **Global Flatten** - Affects entire application
2. **Per-Widget Flatten** - Affects individual widgets only
### Architecture
**Global Mode**:
```jsx
// User toggles in Settings → Customization
// Adds class to <html> element
document.documentElement.classList.add('flatten-ui');
```
**Per-Widget Mode**:
```jsx
// Widget config has flatten property
<WidgetWrapper flatten={widget.config?.flatten || false}>
```
### CSS Implementation
**In `premium-effects.css`** (lines 241-271):
```css
/* Global Flatten UI Mode */
.flatten-ui .glass-card,
.flatten-ui .glass-subtle {
    background: var(--bg-secondary);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.flatten-ui .glass-card::before,
.flatten-ui .glass-subtle::before {
    display: none;
}
/* Per-Widget Flatten Mode */
.flatten-mode.glass-card,
.flatten-mode.glass-subtle,
.flatten-mode .glass-card,
.flatten-mode .glass-subtle {
    background: var(--bg-secondary);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.flatten-mode.glass-card::before,
.flatten-mode.glass-subtle::before,
.flatten-mode .glass-card::before,
.flatten-mode .glass-subtle::before {
    display: none;
}
```
### User Controls
**Global Flatten** (`CustomizationSettings.jsx` lines 423-444):
```jsx
<input
    type="checkbox"
    checked={flattenUI}
    onChange={(e) => handleToggleFlattenUI(e.target.checked)}
/>
```
**Saves to backend**:
```json
{
    "ui": {
        "flattenUI": true
    }
}
```
**Per-Widget Flatten** (`ActiveWidgets.jsx` lines 264-284):
```jsx
<input
    type="checkbox"
    checked={widget.config?.flatten || false}
    onChange={(e) => {
        const updatedWidgets = widgets.map(w =>
            w.id === widget.id
                ? { ...w, config: { ...w.config, flatten: e.target.checked } }
                : w
        );
        // Save to backend
    }}
/>
```
### Theme Integration
**Flatten mode MUST use theme variables**:
```css
/* ❌ WRONG - Hardcoded background */
.flatten-ui .glass-card {
    background: #151922;  /* Hardcoded! */
}
/* ✅ CORRECT - Theme-aware */
.flatten-ui .glass-card {
    background: var(--bg-secondary);  /* Uses theme */
}
```
**Why**: When user switches themes with flatten mode enabled, backgrounds must still adapt.
### Testing Flatten Mode
**Checklist for new components**:
- [ ] Component uses `.glass-card` or `.glass-subtle` classes
- [ ] Test with global flatten enabled (Settings → Customization)
- [ ] If widget: Test per-widget flatten toggle
- [ ] Verify background uses `var(--bg-secondary)` in flatten mode
- [ ] Verify shadows remain theme-appropriate (subtle)
- [ ] Test in all 5 themes with flatten enabled
---
## Extensibility Guidelines
### For New Components
When creating a new component, follow this checklist:
#### ✅ DO:
1. **Use utility classes for colors**
   ```jsx
   <div className="bg-theme-secondary text-theme-primary">
   ```
2. **Use CSS variables for inline styles**
   ```jsx
   <div style={{ borderColor: 'var(--border)' }}>
   ```
3. **Use status variables for states**
   ```jsx
   <span style={{ color: `var(--${isError ? 'error' : 'success'})` }}>
   ```
4. **Test in all 5 themes**
   - Dark Pro, Nord, Catppuccin, Dracula, Light
5. **Test with custom colors enabled**
#### ❌ DON'T:
1. **Use hardcoded Tailwind colors**
   ```jsx
   // ❌ BAD
   <div className="bg-slate-900 text-white">
   ```
2. **Use hardcoded hex colors**
   ```jsx
   // ❌ BAD
   <div style={{ color: '#3b82f6' }}>
   ```
3. **Use RGB/HSL directly**
   ```jsx
   // ❌ BAD
   <div style={{ background: 'rgb(59, 130, 246)' }}>
   ```
4. **Mix theme and non-theme classes**
   ```jsx
   // ❌ BAD
   <div className="bg-theme-primary text-slate-400">
   ```
### For New Widgets
Widgets have additional considerations:
**Widget-specific colors** (progress bars, charts, etc.):
- Use `--success`, `--warning`, `--error` for status indicators
- Use `--accent` and `--accent-secondary` for highlights
- Use `--info` for neutral information
**Example - Progress Bar**:
```jsx
const ProgressBar = ({ value, max }) => {
    const percentage = (value / max) * 100;
    const color = percentage < 50 
        ? 'var(--success)' 
        : percentage < 75 
            ? 'var(--warning)' 
            : 'var(--error)';
    
    return (
        <div className="bg-theme-tertiary rounded-full h-2">
            <div 
                style={{ 
                    width: `${percentage}%`,
                    backgroundColor: color 
                }}
                className="h-2 rounded-full transition-all"
            />
        </div>
    );
};
```
### For New Settings Pages
Settings pages should be pristine examples of theming:
**Required checklist**:
- [ ] All text uses `text-theme-primary/secondary/tertiary`
- [ ] All backgrounds use `bg-theme-primary/secondary/tertiary`
- [ ] All borders use `border-theme` or `border-theme-light`
- [ ] All buttons use `bg-accent` or utility classes
- [ ] All hover states use theme variables
- [ ] All inputs have theme-aware borders and backgrounds
- [ ] Tested in Light theme (most important!)
---
## Common Patterns
### Pattern Library
#### Card with Border
```jsx
<div className="rounded-xl p-6 border border-theme bg-theme-secondary">
    <h3 className="text-lg font-semibold text-theme-primary mb-4">
        Card Title
    </h3>
    <p className="text-sm text-theme-secondary">
        Card description
    </p>
</div>
```
#### Button (Primary)
```jsx
<button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-all">
    Click Me
</button>
```
#### Button (Secondary)
```jsx
<button className="px-4 py-2 bg-theme-tertiary hover:bg-theme-hover text-theme-primary border border-theme rounded-lg transition-all">
    Cancel
</button>
```
#### Input Field
```jsx
<input 
    type="text"
    className="w-full px-4 py-3 bg-theme-primary border border-theme text-theme-primary rounded-lg focus:border-accent focus:outline-none transition-all"
    placeholder="Enter text..."
/>
```
#### Status Badge
```jsx
<span className="px-3 py-1 rounded-full text-sm font-medium" 
      style={{ 
          backgroundColor: `var(--${status === 'success' ? 'success' : status === 'pending' ? 'warning' : 'error'})`,
          color: '#ffffff'
      }}>
    {status}
</span>
```
#### Divider
```jsx
<div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />
```
#### Hover Card
```jsx
<div className="p-4 rounded-lg bg-theme-secondary hover:bg-theme-hover border border-theme transition-all cursor-pointer">
    Hoverable content
</div>
```
---
## Workflow Integration
### Development Workflow (Future)
**When starting a new feature**:
1. Read `/docs/theme/DEVELOPER_GUIDE.md`
2. Use component patterns from this doc
3. Test in all 5 themes before committing
4. Include "Theme Tested: ✅" in commit message
**When reviewing code**:
1. Check for hardcoded colors (search for `#[0-9a-f]`, `slate-`, `gray-`)
2. Verify utility classes used correctly
3. Test PR in Light theme specifically
**When adding to workflows**:
- `/start_session` will include theming reminder
- `/add_component` will include theming checklist
---
## Troubleshooting
### Common Issues
**Issue**: Component doesn't change with theme  
**Solution**: Check if using hardcoded Tailwind classes instead of theme utilities
**Issue**: Custom colors don't apply to element  
**Solution**: Element likely uses hardcoded value, replace with `var(--variable-name)`
**Issue**: Light theme has white text on white background  
**Solution**: Element uses `text-white` instead of `text-theme-primary`
**Issue**: Variable not defined in theme  
**Solution**: Add variable to all 5 theme CSS files
**Issue**: Hover state doesn't match theme  
**Solution**: Use `hover:bg-theme-hover` instead of `hover:bg-slate-700`
---
## Next Steps
1. **Execute Migration**: See `/docs/theme/MIGRATION_GUIDE.md`
2. **Learn Patterns**: See `/docs/theme/COMPONENT_PATTERNS.md`
3. **Reference Variables**: See `/docs/theme/CSS_VARIABLES.md`
4. **For Developers**: See `/docs/theme/DEVELOPER_GUIDE.md`
---
**This is the foundation for a fully theme-aware UI. Every element, every color, every border - all controllable through themes and custom colors.**
