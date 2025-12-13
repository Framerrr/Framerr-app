# Architecture Reference

**Quick reference for Framerr system architecture.**

---

## Directory Structure

```
Framerr-app/
├── .agent/                 # Agent rules and workflows
│   ├── AGENT.md            # Master hub
│   ├── rules/              # Development rules
│   └── workflows/          # Workflow definitions
├── docs/                   # Documentation
│   ├── chatflow/           # Session management
│   ├── project/            # Project info
│   └── reference/          # Technical reference (this folder)
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── context/            # React context providers
│   ├── pages/              # Page components
│   ├── styles/             # CSS and themes
│   └── utils/              # Utilities
├── server/                 # Backend source
│   ├── db/                 # Database layer (SQLite)
│   ├── routes/             # API routes
│   └── utils/              # Server utilities
└── public/                 # Static assets
```

---

## Context Provider Hierarchy

```
AuthProvider
└─ ThemeProvider
   └─ SystemConfigProvider
      └─ AppDataProvider
         └─ Routes
```

**Loading Order:** Auth → Theme → SystemConfig → AppData

---

## Key Entry Points

| File | Purpose |
|------|---------|
| `src/main.jsx` | React bootstrap |
| `src/App.jsx` | Main component, routing |
| `server/index.js` | Express server entry |
| `server/db/db.js` | SQLite database connection |

---

## Routing

```
/login         → Login page (public)
/setup         → Setup wizard (public)
/*             → Protected routes with Sidebar
  ├─ /         → Dashboard
  ├─ /tab/:slug → TabView (iframe tabs)
  └─ /settings → UserSettings
```

---

## Database

**Type:** SQLite (better-sqlite3)  
**Location:** `/config/framerr.db`

**Tables:**
- `users` - User accounts
- `sessions` - User sessions
- `system_config` - System settings
- `user_preferences` - Per-user settings
- `tabs` - Tab definitions
- `widgets` - Widget configurations
- `tab_groups` - Tab group definitions
- `custom_icons` - Custom icon storage

---

## API Patterns

**Base URL:** `/api`

**Common endpoints:**
- `/api/auth/*` - Authentication
- `/api/config/*` - Configuration
- `/api/tabs/*` - Tab management
- `/api/widgets/*` - Widget management
- `/api/profile/*` - User profile

---

## Component Conventions

- Components in `src/components/`
- Settings components in `src/components/settings/`
- Widgets in `src/components/widgets/`
- Use `.jsx` extension for React components

**Naming:**
- Components: PascalCase (`MyComponent.jsx`)
- Utilities: camelCase (`myUtil.js`)
- CSS: kebab-case (`my-style.css`)
