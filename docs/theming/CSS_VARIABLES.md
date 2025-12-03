# CSS Variables - Complete Reference
**Quick reference for all theme CSS variables**
---
## Core Variables (17)
These must be defined in every theme file.
### Backgrounds (4)
| Variable | Purpose | Dark Pro | Light | Notes |
|----------|---------|----------|-------|-------|
| `--bg-primary` | Main page background | `#0a0e1a` | `#ffffff` | Furthest back layer |
| `--bg-secondary` | Card/panel background | `#151922` | `#f8fafc` | Elevated surfaces |
| `--bg-tertiary` | Highest elevation | `#1f2937` | `#f1f5f9` | Buttons, inputs |
| `--bg-hover` | Hover state background | `#374151` | `#e2e8f0` | Interactive elements |
### Accents (4)
| Variable | Purpose | Dark Pro | Light | Notes |
|----------|---------|----------|-------|-------|
| `--accent` | Primary accent | `#3b82f6` | `#3b82f6` | Buttons, links, active states |
| `--accent-hover` | Accent hover state | `#2563eb` | `#2563eb` | Darker accent for hover |
| `--accent-light` | Subtle accent | `#60a5fa` | `#60a5fa` | Light highlights |
| `--accent-secondary` | Alternative accent | `#06b6d4` | `#06b6d4` | Secondary highlights |
### Text (3)
| Variable | Purpose | Dark Pro | Light | Notes |
|----------|---------|----------|-------|-------|
| `--text-primary` | Main text | `#f1f5f9` | `#0f172a` | Headings, body text |
| `--text-secondary` | Secondary text | `#94a3b8` | `#475569` | Labels, descriptions |
| `--text-tertiary` | Tertiary text | `#64748b` | `#64748b` | Hints, timestamps |
### Borders (3)
| Variable | Purpose | Dark Pro | Light | Notes |
|----------|---------|----------|-------|-------|
| `--border` | Primary border | `#374151` | `#cbd5e1` | Dividers, outlines |
| `--border-light` | Subtle border | `#1f2937` | `#e2e8f0` | Light separators |
| `--border-accent` | Accent border | `rgba(59, 130, 246, 0.3)` | `rgba(59, 130, 246, 0.3)` | Highlighted borders |
### Status (4)
| Variable | Purpose | All Themes | Use For |
|----------|---------|------------|---------|  
| `--success` | Success state | `#10b981` | Confirmations, completed actions |
| `--warning` | Warning state | `#f59e0b` | Cautions, in-progress |
| `--error` | Error state | `#ef4444` | Errors, destructive actions |
| `--info` | Info state | `#3b82f6` | Informational messages |
---
## Premium Variables (40+)
Optional but recommended for full theme experience.
### Glassmorphism (6)
| Variable | Purpose | Dark Pro | Light |
|----------|---------|----------|-------|
| `--glass-start` | Glass gradient start | `rgba(30, 41, 59, 0.9)` | `rgba(248, 250, 252, 0.8)` |
| `--glass-end` | Glass gradient end | `rgba(15, 23, 42, 0.95)` | `rgba(255, 255, 255, 0.9)` |
| `--border-glass` | Glass border color | `rgba(71, 85, 105, 0.5)` | `rgba(203, 213, 225, 0.8)` |
| `--glass-bg` | Glass background | `rgba(31, 41, 55, 0.5)` | - |
| `--glass-border` | Alternative glass border | `rgba(148, 163, 184, 0.1)` | - |
| `--glass-bg-light` | Light glass background | `rgba(31, 41, 55, 0.3)` | - |
### Gradients (7)
| Variable | Purpose | Usage |
|----------|---------|-------|
| `--gradient-1` | Gradient stop 1 | Animated background |
| `--gradient-2` | Gradient stop 2 | Animated background |
| `--gradient-3` | Gradient stop 3 | Animated background |
| `--gradient-4` | Gradient stop 4 | Animated background |
| `--gradient-primary` | Primary gradient | `linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)` |
| `--gradient-primary-soft` | Soft primary gradient | With opacity |
| `--gradient-card-hover` | Card hover gradient | Subtle highlight |
| `--gradient-text` | Text gradient | For gradient text effects |
### Glow Effects (4)
| Variable | Purpose | Dark Pro | Light |
|----------|---------|----------|-------|
| `--accent-glow` | Primary glow | `rgba(59, 130, 246, 0.3)` | `rgba(59, 130, 246, 0.3)` |
| `--accent-glow-soft` | Soft glow | `rgba(59, 130, 246, 0.2)` | `rgba(59, 130, 246, 0.2)` |
| `--shadow-glow` | Glow shadow | `0 0 20px rgba(59, 130, 246, 0.15)` | - |
| `--shadow-glow-lg` | Large glow shadow | `0 0 40px rgba(59, 130, 246, 0.2)` | - |
### Shadows (6)
| Variable | Purpose | Value |
|----------|---------|-------|
| `--shadow-sm` | Small shadow | `0 1px 2px 0 rgba(0, 0, 0, 0.4)` |
| `--shadow-md` | Medium shadow | `0 4px 12px -2px rgba(0, 0, 0, 0.5)` |
| `--shadow-lg` | Large shadow | `0 10px 20px -5px rgba(0, 0, 0, 0.6)` |
| `--shadow-xl` | Extra large shadow | `0 20px 30px -8px rgba(0, 0, 0, 0.7)` |
| `--shadow-2xl` | 2X large shadow | `0 25px 50px -12px rgba(0, 0, 0, 0.8)` |
| `--shadow-card` | Card shadow | `0 8px 32px rgba(0, 0, 0, 0.4)` |
### Blur (7)
| Variable | Purpose | Value |
|----------|---------|-------|
| `--blur-strong` | Strong blur | `20px` |
| `--blur-medium` | Medium blur | `12px` |
| `--blur-subtle` | Subtle blur | `8px` |
| `--blur-sm` | Small blur | `blur(4px)` |
| `--blur-md` | Medium blur | `blur(8px)` |
| `--blur-lg` | Large blur | `blur(16px)` |
| `--blur-xl` | Extra large blur | `blur(24px)` |
---
## Design System Variables (Non-Theme)
These are defined in `design-system.css` and are NOT theme-specific.
### Typography
| Variable | Purpose | Value |
|----------|---------|-------|
| `--font-primary` | Primary font stack | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif` |
| `--font-mono` | Monospace font | `'Fira Code', 'SF Mono', 'Courier New', monospace` |
### Layout
| Variable | Purpose | Value |
|----------|---------|-------|
| `--sidebar-width` | Expanded sidebar width | `280px` |
| `--sidebar-collapsed` | Collapsed sidebar width | `80px` |
### Z-Index Scale
| Variable | Purpose | Value |
|----------|---------|-------|
| `--z-base` | Base layer | `0` |
| `--z-dropdown` | Dropdown menus | `1000` |
| `--z-sticky` | Sticky elements | `1020` |
| `--z-fixed` | Fixed positioned | `1030` |
| `--z-modal-backdrop` | Modal backdrop | `1040` |
| `--z-modal` | Modal dialog | `1050` |
| `--z-popover` | Popovers | `1060` |
| `--z-tooltip` | Tooltips | `1070` |
### Transitions
| Variable | Purpose | Value |
|----------|---------|-------|
| `--transition-fast` | Fast transition | `150ms ease` |
| `--transition-base` | Base transition | `200ms ease` |
| `--transition-slow` | Slow transition | `300ms ease` |
---
## Usage Examples
### In JSX with Utility Classes
```jsx
<div className="bg-theme-primary text-theme-secondary border border-theme">
    Content
</div>
```
### In Inline Styles
```jsx
<div style={{ backgroundColor: 'var(--bg-secondary)' }}>
    Content
</div>
```
### In CSS Files
```css
.my-component {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border);
}
```
### Dynamic Variables
```jsx
<div style={{ color: `var(--${status === 'success' ? 'success' : 'error'})` }}>
    {message}
</div>
```
---
## All 5 Themes - Complete Values
### Dark Pro
```css
--bg-primary: #0a0e1a;
--bg-secondary: #151922;
--bg-tertiary: #1f2937;
--bg-hover: #374151;
--accent: #3b82f6;
--accent-hover: #2563eb;
--accent-light: #60a5fa;
--accent-secondary: #06b6d4;
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-tertiary: #64748b;
--border: #374151;
--border-light: #1f2937;
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```
### Nord
```css
--bg-primary: #2e3440;
--bg-secondary: #3b4252;
--bg-tertiary: #434c5e;
--bg-hover: #4c566a;
--accent: #88c0d0;
--accent-hover: #81a1c1;
--accent-light: #8fbcbb;
--accent-secondary: #8fbcbb;
--text-primary: #eceff4;
--text-secondary: #d8dee9;
--text-tertiary: #e5e9f0;
--border: #4c566a;
--border-light: #434c5e;
--success: #a3be8c;
--warning: #ebcb8b;
--error: #bf616a;
--info: #5e81ac;
```
### Catppuccin
```css
--bg-primary: #1e1e2e;
--bg-secondary: #181825;
--bg-tertiary: #313244;
--bg-hover: #45475a;
--accent: #89b4fa;
--accent-hover: #74c7ec;
--accent-light: #b4befe;
--accent-secondary: #74c7ec;
--text-primary: #cdd6f4;
--text-secondary: #a6adc8;
--text-tertiary: #9399b2;
--border: #45475a;
--border-light: #313244;
--success: #a6e3a1;
--warning: #f9e2af;
--error: #f38ba8;
--info: #89b4fa;
```
### Dracula
```css
--bg-primary: #282a36;
--bg-secondary: #21222c;
--bg-tertiary: #44475a;
--bg-hover: #6272a4;
--accent: #bd93f9;
--accent-hover: #ff79c6;
--accent-light: #d6acff;
--accent-secondary: #ff79c6;
--text-primary: #f8f8f2;
--text-secondary: #e6e6e6;
--text-tertiary: #6272a4;
--border: #44475a;
--border-light: #343746;
--success: #50fa7b;
--warning: #f1fa8c;
--error: #ff5555;
--info: #8be9fd;
```
### Light Modern
```css
--bg-primary: #ffffff;
--bg-secondary: #f8fafc;
--bg-tertiary: #f1f5f9;
--bg-hover: #e2e8f0;
--accent: #3b82f6;
--accent-hover: #2563eb;
--accent-light: #60a5fa;
--accent-secondary: #06b6d4;
--text-primary: #0f172a;
--text-secondary: #475569;
--text-tertiary: #64748b;
--border: #cbd5e1;
--border-light: #e2e8f0;
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```
