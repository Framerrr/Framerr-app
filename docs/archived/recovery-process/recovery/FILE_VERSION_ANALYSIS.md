# File Version Analysis & Selection Log

**Project:** framerr-1 Reconstruction  
**Date:** 2025-12-02  
**Status:** In Progress

---

## Selection Criteria

1. **Largest file size** - indicates most complete version
2. **Code quality analysis** - if sizes are equal/similar
3. **Import compatibility** - matches expected directory structure
4. **Timestamp inference** - newer is better (if determinable)

---

## Critical Missing Files

### Context Files NOT in Git Recovery

| File | Status | Source | Action |
|------|--------|--------|--------|
| AuthContext.jsx | ❌ MISSING | Working v1.1.6 | Copy from `/framerr/framerr/src/contexts/` |
| ThemeContext.jsx | ❌ MISSING | Working v1.1.6 | Copy from `/framerr/framerr/src/contexts/` |

**Impact:** CRITICAL - App.jsx imports these files. Application will not build without them.

**Solution:** Copy from working v1.1.6 installation at:  
`C:\Users\Jonathan\Documents\Antigravity\Framerr\framerr\framerr\src\contexts\`

**Verification:** Compare sizes with recovered AppDataContext and SystemConfigContext to ensure consistency.

| Context File | Git Recovery | Working Install | Match? |
|--------------|--------------|-----------------|--------|
| AppDataContext.jsx | 3,176 bytes | 3,337 bytes | ⚠️ Similar but different |
| SystemConfigContext.jsx | 1,527 bytes (v2/base) | 1,617 bytes | ⚠️ Similar but different |
| AuthContext.jsx | - | 5,564 bytes | ❌ Not recovered |
| ThemeContext.jsx | - | 3,202 bytes | ❌ Not recovered |

**Decision:** Use working installation versions for ALL context files to ensure consistency.

---

## Duplicate File Analysis

### JSX Files with Multiple Versions

#### main.jsx
| Version | Size | Selection |
|---------|------|-----------|
| main.jsx | 347 bytes | ✅ SELECTED |
| main_1.jsx | 347 bytes | ❌ IDENTICAL |

**Reason:** Files are identical. Choosing base name.

#### AppDataContext.jsx
| Version | Size | Selection |
|---------|------|-----------|
| AppDataContext.jsx | 3,176 bytes | ⚠️ Use working install |
| AppDataContext_1.jsx | 3,015 bytes | ❌ Smaller |

**Reason:** Working installation has 3,337 bytes - more complete. Use that instead.

**Analysis:** 
- Recovered version: 3,176 bytes
- Smaller recovered: 3,015 bytes  
- Working install: 3,337 bytes
- **Imports:**
  - `'./AuthContext'` - uses `context/` folder structure
  - `/api/config/user` - matches backend
  - `/api/config/system` - matches backend
  - `/api/widgets` - matches backend

#### SystemConfigContext.jsx
| Version | Size | Selection |
|---------|------|-----------|
| SystemConfigContext_1.jsx | 1,564 bytes | ❌ Larger but... |
| SystemConfigContext.jsx | 1,527 bytes | ⚠️ Use working install |
| SystemConfigContext_2.jsx | 1,527 bytes | ❌ Identical to base |

**Reason:** Working installation has 1,617 bytes. Use that for consistency with other contexts.

**Analysis Required:** Need to compare `_1` version with working install to see if it has features not in working version.

---

## Selection Strategy Update

### Original Plan
Choose largest file size from git recovery.

### Revised Plan
Given missing critical files (AuthContext, ThemeContext) and size discrepancies:

**Use working v1.1.6 installation as PRIMARY source** for contexts:
- More complete (has ALL 4 context files)
- Known good (runs successfully)
- Consistent versions
- Matches v1.1.6 exactly

**Use git recovery for:**
- Components (widgets, UI elements)
- Pages
- Utilities (if not in working install)
- Any files not in working installation

---

## Files to Copy from Working Installation

### Priority 1: Context Files (ALL 4)
```
Source: C:\Users\Jonathan\Documents\Antigravity\Framerr\framerr\framerr\src\contexts\
Destination: C:\Users\Jonathan\Documents\Antigravity\Framerr\RECONSTRUCTION\framerr-1\src\contexts\

Files:
- AuthContext.jsx (5,564 bytes)
- ThemeContext.jsx (3,202 bytes)
- AppDataContext.jsx (3,337 bytes)
- SystemConfigContext.jsx (1,617 bytes)
```

### Next: Check Working Installation for Other Complete Files

Need to compare:
1. Components directory
2. Pages directory  
3. Utils directory
4. Widgets directory

---

## Action Items

- [ ] Copy all 4 context files from working installation
- [ ] Compare working installation `src/` structure with git recovery
- [ ] Identify which files to use from git recovery vs. working install
- [ ] Create master file manifest with source attribution
- [ ] Document any file conflicts or version mismatches

---

## Import Path Analysis

### Discovered Import Patterns

#### From App.jsx:
```javascript
'./context/AuthContext'          // Uses 'context' folder (singular)
'./context/ThemeContext'
'./context/SystemConfigContext'
'./context/AppDataContext'
```

#### From AppDataContext.jsx:
```javascript
'./AuthContext'                   // Relative import (same folder)
```

**Conclusion:** Contexts should be in `src/context/` (singular) OR `src/contexts/` (plural).

**Working Installation Uses:** `src/contexts/` (plural)

**Decision:** Use `src/contexts/` and update imports in App.jsx to match:
- Change `'./context/XxxContext'` → `'./contexts/XxxContext'`

**Alternative:** Keep `context` (singular) to match App.jsx imports.

**CRITICAL:** Need to check which pattern App.jsx actually uses in working installation!

---

## To Be Determined

1. **Directory naming:** `context/` vs `contexts/`
2. **Full component inventory** from working installation
3. **File-by-file comparison** for duplicates
4. **Missing files** from git recovery that exist in working install

---

## Next Phase

**Phase 1.2:** Compare working installation structure with git recovery to create master file manifest.
