# Framerr v1.1.6 Architecture Analysis

**Date:** 2025-12-02  
**Project:** framerr-1 Reconstruction  
**Status:** In Progress - Phase 1: Architecture Discovery

---

## Application Entry Points

### 1. main.jsx
**Location:** `src/main.jsx`  
**Purpose:** React application bootstrap  
**Size:** 347 bytes  
**Versions:** main.jsx, main_1.jsx (identical - choosing main.jsx)

**Dependencies:**
- `React` - Core React library
- `ReactDOM` - React DOM renderer
- `react-router-dom` → `BrowserRouter` - Client-side routing
- `./App` - Main application component
- `./index.css` - Global styles

**Architecture Notes:**
- Uses React 19.2.0 (from package.json)
- Renders into `#root` div
- Wrapped in `React.StrictMode` for development warnings
- Single-page application with client-side routing

### 2. App.jsx
**Location:** `src/App.jsx`  
**Purpose:** Main application component and routing
**Size:** 4,298 bytes  
**Versions:** Single version found

**Dependencies - Context Providers:**
```javascript
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { AppDataProvider } from './context/AppDataContext';
```

**Dependencies - Components:**
```javascript
import ProtectedRoute from './components/common/ProtectedRoute';
import Sidebar from './components/Sidebar';
import FaviconInjector from './components/FaviconInjector';
import AppTitle from './components/AppTitle';
```

**Dependencies - Pages:**
```javascript
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import UserSettings from './pages/UserSettings';
import TabView from './pages/TabView';
import TailwindTest from './pages/TailwindTest';
```

**Dependencies - Utilities:**
```javascript
import logger from './utils/logger';
import axios from 'axios';  // External
```

**Context Provider Hierarchy:**
```
AuthProvider
  └─ FaviconInjector
  └─ AppTitle
  └─ CustomColorLoader
      └─ ThemeProvider
          └─ SystemConfigProvider
              └─ AppDataProvider
                  └─ Routes
```

**Routing Structure:**
```
/login         → Login page (public)
/setup         → Setup page (public)
/*             → Protected routes with Sidebar
  ├─ /         → Dashboard
  ├─ /test     → TailwindTest (development)
  ├─ /tab/:slug → TabView (iframe tabs)
  └─ /settings → UserSettings
```

**Architecture Notes:**
- Authentication-first design (AuthProvider wraps everything)
- Custom color theming loaded per-user from `/api/config/user`
- Responsive layout with sidebar (hidden on mobile)
- Protected routes require authentication
- Dynamic tab system with slug-based routing

---

## Required Directory Structure

Based on imports discovered in App.jsx and main.jsx:

```
src/
├── context/               # React Context providers
│   ├── AuthContext.jsx/js
│   ├── ThemeContext.jsx/js
│   ├── SystemConfigContext.jsx/js
│   └── AppDataContext.jsx/js
├── components/
│   ├── common/
│   │   └── ProtectedRoute.jsx/js
│   ├── Sidebar.jsx/js
│   ├── FaviconInjector.jsx/js
│   └── AppTitle.jsx/js
├── pages/
│   ├── Login.jsx/js
│   ├── Setup.jsx/js
│   ├── Dashboard.jsx/js
│   ├── UserSettings.jsx/js
│   ├── TabView.jsx/js
│   └── TailwindTest.jsx/js
├── utils/
│   └── logger.js
├── App.jsx
├── main.jsx
└── index.css
```

---

## API Endpoints Discovered

From App.jsx analysis:

### User Configuration
- `GET /api/config/user` - Fetch user configuration and custom theme colors
  - Returns: `{ theme: { mode, customColors } }`
  - Used for: Loading custom CSS variables per user

---

## Context System Architecture

### 1. AuthContext
**Purpose:** User authentication state and session management  
**Provides:** `user` object, authentication methods  
**Required by:** All protected routes, CustomColorLoader

### 2. ThemeContext
**Purpose:** Theme management (light/dark/custom)  
**Dependencies:** Requires AuthContext (loaded after auth)

### 3. SystemConfigContext
**Purpose:** System-wide configuration  
**Dependencies:** Requires ThemeContext

### 4. AppDataContext
**Purpose:** Application data state (tabs, widgets, etc.)  
**Dependencies:** Requires SystemConfigContext

**Loading Order:** Auth → Theme → SystemConfig → AppData

---

## Next Steps for Architecture Discovery

### Phase 1.1: Context Analysis ✅ Started
- [x] Identify main entry points
- [x] Document App.jsx structure
- [ ] Analyze all 4 context files
- [ ] Map context data flow

### Phase 1.2: Component Discovery
- [ ] Analyze Sidebar component
- [ ] Analyze common components
- [ ] Identify widget components
- [ ] Map component dependencies

### Phase 1.3: Page Analysis
- [ ] Analyze each page component
- [ ] Document page-specific dependencies
- [ ] Identify sub-components per page

### Phase 1.4: Utility & Service Layer
- [ ] Analyze logger utility
- [ ] Identify all utility files
- [ ] Map service layer connections to backend

---

## File Version Decisions

| File | Versions | Selected | Reason |
|------|----------|----------|--------|
| main.jsx | main.jsx, main_1.jsx | main.jsx | Identical files (347 bytes) |

---

## Notes & Observations

### Missing Files from Recovery
- None identified yet - all imports in App.jsx should exist in recovered files

### Potential Issues
- TailwindTest page - likely development only, may remove in production
- CustomColorLoader uses axios directly - should check for API consistency
- Path alias `@` configured in vite.config.js - ensure all files use correct imports

### Backend Integration Points
- `/api/config/user` - User configuration endpoint
- Authentication system (session-based from backend analysis)
- Custom favicon loading
- Tab management API (inferred from TabView component)

---

## Progress Tracking

**Files Analyzed:** 2/239 (0.8%)  
**Contexts Mapped:** 0/4 (0%)  
**Components Mapped:** 0/~50 (0%)  
**Pages Mapped:** 0/6 (0%)  

**Status:** Architecture discovery in progress
