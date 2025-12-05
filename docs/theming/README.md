# Theming Documentation

complete guide to the Framerr theming system.

## Quick Links

- **[Theming Engine Architecture](./THEMING_ENGINE.md)** - Complete theming system documentation
- **[CSS Variables Reference](./CSS_VARIABLES.md)** - All available CSS variables
- **Development Rules** - See `/.agent/rules/theming-rules.md`

## Overview

Framerr uses a sophisticated theming engine with:
- **5 Built-in Themes:** Dark Pro, Nord, Catppuccin, Dracula, Light
- **Custom Colors:** 23+ customizable color variables
- **CSS Variables:** 70+ variables for complete theme control
- **Flatten UI Mode:** Optional glassmorphism disable

## For Developers

### Must Read Before Creating UI

1. **[/.agent/rules/theming-rules.md](../../.agent/rules/theming-rules.md)** - BLOCKING rules for UI development
2. **[THEMING_ENGINE.md](./THEMING_ENGINE.md)** - System architecture and patterns
3. **[CSS_VARIABLES.md](./CSS_VARIABLES.md)** - Variable reference

### Quick Start

**Use theme utility classes:**
```jsx
<div className="bg-theme-secondary text-theme-primary border-theme">
    Content
</div>
```

**Never use hardcoded colors:**
```jsx
// ❌ WRONG
<div className="bg-slate-800 text-white">

// ✅ CORRECT
<div className="bg-theme-secondary text-theme-primary">
```

## Key Principles

1. **Every UI element must respect the active theme**
2. **No hardcoded colors** (Tailwind classes, hex, RGB)
3. **Use semantic variable names** (`--text-primary` not `--gray-900`)
4. **Test in Light theme** before committing

## Available Themes

| Theme | Description | Accents |
|-------|-------------|---------|
| Dark Pro | Modern dark (default) | Blue |
| Nord | Arctic frost | Cyan/teal |
| Catppuccin | Pastel dark | Lavender |
| Dracula | Purple dark | Purple/pink |
| Light | Clean light | Blue |

## Files

```
/docs/theming/
├── README.md                 (this file)
├── THEMING_ENGINE.md         (architecture & patterns)
└── CSS_VARIABLES.md          (variable reference)

/.agent/rules/
└── theming-rules.md          (MANDATORY development rules)

/src/styles/
├── design-system.css         (utility classes)
├── premium-effects.css       (glassmorphism)
└── themes/
    ├── dark-pro.css
    ├── nord.css
    ├── catppuccin.css
    ├── dracula.css
    └── light.css
```

## Testing Checklist

Before committing any UI code:

- [ ] Uses theme utilities or CSS variables
- [ ] No hardcoded colors (check with grep)
- [ ] Tested in Light theme (most important!)
- [ ] Tested with flatten UI enabled
- [ ] Build passes

## Support

For questions or issues with theming:
1. Check `THEMING_ENGINE.md` for patterns
2. Reference `CSS_VARIABLES.md` for available variables
3. Review `/.agent/rules/theming-rules.md` for rules

---

**Last Updated:** 2025-12-03  
**System Version:** 2.0 (Post-Recovery)
