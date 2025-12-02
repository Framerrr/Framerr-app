# File Manifest - Framerr v1.1.6 Reconstruction

**Generated:** 2025-12-02  
**Purpose:** Master list of all files needed, their sources, and selection status

---

## Legend

- ✅ Found and selected
- ⚠️ Found with multiple versions (largest selected)
- ❌ NOT FOUND in git recovery
- 🔧 Needs to be created/reconstructed

---

## Entry Points

| Target Path | Source File | Size | Status | Notes |
|-------------|-------------|------|--------|-------|
| `src/main.jsx` | sorted-git-extracted/JSX/main.jsx | 347 | ✅ | Identical to main_1.jsx |
| `src/App.jsx` | sorted-git-extracted/JSX/App.jsx | 4,298 | ✅ | Single version, complete |
| `src/index.css` | sorted-git-extracted/CSS/index.css | 366 | ✅ | Identical to index_1.css |

---

## Context Files (src/context/)

| File | Git Recovery | Size | Working v1.0.6 | Status | Selected |
|------|--------------|------|----------------|--------|----------|
| AuthContext.jsx | ❌ NOT FOUND | - | 5,564 bytes | ❌ MISSING | 🔧 Use v1.0.6 template |
| ThemeContext.jsx | ❌ NOT FOUND | - | 3,202 bytes | ❌ MISSING | 🔧 Use v1.0.6 template |
| AppDataContext.jsx | ✅ Found (2 versions) | 3,176 | 3,337 bytes | ⚠️ Multiple | **AppDataContext.jsx** (3,176) |
| SystemConfigContext.jsx | ✅ Found (3 versions) | 1,564 | 1,617 bytes | ⚠️ Multiple | **SystemConfigContext_1.jsx** (1,564) |

**Directory:** `src/context/` (singular - per App.jsx imports)

**Action Required:**
- Copy AppDataContext.jsx (3,176 bytes)
- Copy SystemConfigContext_1.jsx (1,564 bytes) → rename to SystemConfigContext.jsx
- Use v1.0.6 AuthContext as template, verify compatibility with v1.1.6
- Use v1.0.6 ThemeContext as template, verify compatibility with v1.1.6

---

## Page Components (src/pages/)

| Page | Found | Versions | Largest | Size | Status |
|------|-------|----------|---------|------|--------|
| Login.jsx | ❌ | 0 | - | - | 🔧 CREATE |
| Setup.jsx | ❌ | 0 | - | - | 🔧 CREATE |
| Dashboard.jsx | ✅ | 2 | **Dashboard.jsx** | 28,833 | ⚠️ Select largest |
| UserSettings.jsx | ✅ | 3 | **UserSettings.jsx** | 4,496 | ⚠️ Select largest |
| TabView.jsx | ❌ | 0 | - | - | 🔧 CREATE |
| TailwindTest.jsx | ❌ | 0 | - | - | 🔧 CREATE (dev only) |

**Missing Pages:**
- `Login.jsx` - Authentication page
- `Setup.jsx` - Initial setup wizard
- `TabView.jsx` - iFrame tab viewer (CRITICAL for main feature)
- `TailwindTest.jsx` - Development/testing page (can skip)

**Action Required:**
- Check v1.0.6 for Login/Setup patterns
- Search more extensively in git recovery
- May need to reconstruct based on backend `/api/auth` routes

---

## Common Components (src/components/common/)

| Component | Found | Versions | Largest | Size | Status |
|-----------|-------|----------|---------|------|--------|
| ProtectedRoute.jsx | ✅ | 4 | All identical | 1,204 | ✅ Use any |

**Note:** All 4 versions are identical (1,204 bytes). Choose base: `ProtectedRoute.jsx`

---

## Components (src/components/)

| Component | Found | Versions | Largest | Size | Status | Notes |
|-----------|-------|----------|---------|------|--------|-------|
| Sidebar.jsx | ✅ | 4 | **Sidebar_old.jsx** | 29,162 | ⚠️ Choose | sidebar_old = 29K, sidebar = 25K |
| FaviconInjector.jsx | ✅ | 2 | **FaviconInjector_1.jsx** | 3,676 | ⚠️ Larger | _1 version 2x larger |
| AppTitle.jsx | ✅ | 2 | Both identical | 1,175 | ✅ Use base |

**Sidebar Decision Needed:**
- `Sidebar_old.jsx` / `Sidebar_old_1.jsx`: 29,162 bytes (both identical)
- `Sidebar.jsx`: 25,399 bytes (4K smaller)
- `Sidebar_1.jsx`: 23,452 bytes (smallest)

**Strategy:** Check imports in App.jsx - does it import from `Sidebar` or specific path? Use largest (Sidebar_old.jsx) and test.

---

## Utilities (src/utils/)

| Utility | Found | Versions | Largest | Size | Status |
|---------|-------|----------|---------|------|--------|
| logger.js | ✅ | 4 | **logger_1.js** | 4,190 | ⚠️ Largest |

**Logger versions:**
- `logger_1.js`: 4,190 bytes **(SELECT)**
- `logger.js` / `logger_3.js`: 3,490 bytes (identical)
- `logger_2.js`: 1,049 bytes (minimal)

---

## Styles (src/styles/)

| File | Source | Size | Status | Notes |
|------|--------|------|--------|-------|
| index.css | CSS/index.css | 366 | ✅ | Main stylesheet |
| GridLayout.css | CSS/GridLayout.css | 3,461 | ✅ | Widget layout |
| premium-effects.css | CSS/premium-effects.css | 5,769 | ✅ | Visual effects |

**Theme Files (optional):**
- dark-pro.css, dracula.css, light.css, nord.css
- Multiple versions of each - select largest

---

## Widgets (src/components/widgets/)

**TODO:** Need to catalog all widget files from JSX recovery.

From Docker dist/assets, we know these widgets exist:
- CalendarWidget
- ClockWidget
- CustomHTMLWidget
- LinkGridWidget_v2
- OverseerrWidget
- PlexWidget
- QBittorrentWidget
- RadarrWidget
- SonarrWidget
- SystemStatusWidget
- WeatherWidget

---

## Critical Missing Files

### Pages (High Priority)
1. **Login.jsx** - Required for authentication flow
2. **Setup.jsx** - Required for initial app setup
3. **TabView.jsx** - CRITICAL - core iFrame functionality

### Contexts (Critical)
4. **AuthContext.jsx** - App won't build without it
5. **ThemeContext.jsx** - App won't build without it

### Strategy for Missing Files

#### Option 1: Extensive Search
- Check NO_EXTENSION folder (2,525 files)
- Search by file size range (Login/Setup likely 2-10KB)
- Search by content patterns

#### Option 2: Use v1.0.6 Templates
- v1.0.6 has AuthContext, ThemeContext
- Update for v1.1.6 features based on usage in App.jsx
- Check backend routes to understand requirements

#### Option 3: Reconstruct
- Analyze App.jsx routing and imports
- Check backend `/api/auth`, `/api/setup` routes
- Build minimal working versions

---

## File Selection Summary

### Ready to Copy (Confirmed)
- main.jsx (347 bytes)
- App.jsx (4,298 bytes)
- index.css (366 bytes)
- ProtectedRoute.jsx (1,204 bytes)
- AppTitle.jsx (1,175 bytes)
- GridLayout.css (3,461 bytes)
- premium-effects.css (5,769 bytes)

### Need Version Selection
- AppDataContext.jsx vs AppDataContext_1.jsx
- SystemConfigContext (3 versions)
- Sidebar (4 versions - recommend Sidebar_old.jsx)
- FaviconInjector (2 versions - recommend _1)
- logger (4 versions - recommend logger_1.js)
- Dashboard (2 versions - recommend Dashboard.jsx)
- UserSettings (3 versions - recommend UserSettings.jsx)

### Missing - Need Action
- AuthContext.jsx
- ThemeContext.jsx
- Login.jsx
- Setup.jsx
- TabView.jsx
- All widget components (need to catalog)

---

## Next Actions

1. ✅ Catalog widget components from JSX folder
2. 🔍 Search NO_EXTENSION for missing pages
3. 📋 Finalize version selections
4. 📁 Create directory structure in framerr-1/src/
5. 📄 Copy confirmed files
6. 🔧 Handle missing files (search/reconstruct/template)
7. 🧪 Test build

---

## Progress

**Located:** ~25/239 files  
**Selected:** ~7/239 files  
**Copied:** 0/239 files

**Status:** File discovery phase - most core files located, missing pages identified
