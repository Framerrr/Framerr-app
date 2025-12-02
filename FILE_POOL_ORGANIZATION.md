# File Pool Organization - Framerr v1.1.6 Reconstruction

**Last Updated:** 2025-12-02  
**Purpose:** Master reference for all file locations across the reconstruction effort

---

## Directory Structure Overview

```
C:\Users\Jonathan\Documents\Antigravity\Framerr\
├── RECONSTRUCTION/                    # Main reconstruction workspace
│   ├── framerr-1/                    # 🎯 ACTIVE: Reconstruction target
│   ├── docker-extracted/             # 📦 POOL: Docker v1.1.6 extraction
│   ├── sorted-git-extracted/         # 📦 POOL: Git recovery files
│   └── recovered-from-docker/        # 📦 POOL: Earlier Docker extraction
├── framerr/framerr/                  # ⚠️  v1.0.6 (outdated reference)
├── check-develop/                    # 🔧 Development check
└── check-predevelop/                 # 🔧 Pre-dev check
```

---

## 🎯 Active Reconstruction: `/RECONSTRUCTION/framerr-1/`

**Purpose:** Where we're building the final v1.1.6 application  
**Status:** In progress - collecting files  
**Rule:** ✅ Safe to modify - this is our working copy

### Current Structure
```
framerr-1/
├── server/                  ✅ Complete v1.1.6 backend (from Docker)
├── src/                     ⏸️  Empty - awaiting file organization
├── public/                  ✅ Created
├── package.json             ✅ v1.1.6 frontend dependencies
├── vite.config.js           ✅ Build config
├── tailwind.config.js       ✅ CSS framework
├── postcss.config.js        ✅ PostCSS
├── Dockerfile               ✅ Build instructions
└── [Documentation files]    📋 Planning & tracking docs
```

### Documentation Files in framerr-1/
- `ARCHITECTURE.md` - App structure analysis
- `FILE_MANIFEST.md` - File inventory
- `FILE_VERSION_ANALYSIS.md` - Version selection decisions  
- `STRATEGY_REVISED.md` - v1.0.6 vs v1.1.6 strategy
- `HANDOFF.md` - Continuation guide
- `RECONSTRUCTION_STATUS.md` - Overall status
- `DECOMPRESSION_PLAN.md` - Git blob extraction plan
- `GIT_BLOB_RECOVERY.md` - Decompression results
- `NO_EXTENSION_ANALYSIS.md` - Git object analysis
- `jsx-inventory.csv` - JSX files catalog
- `js-inventory.csv` - JS files catalog

---

## 📦 File Pools (Read-Only Sources)

### Pool 1: `/RECONSTRUCTION/docker-extracted/`

**Source:** Docker image `pickels23/framerr:1.1.6`  
**Extracted:** 2025-12-02  
**Files:** 2,102 files (20.2 MB)  
**Rule:** ❌ DO NOT MODIFY - reference only

#### Contents
```
docker-extracted/
├── server/              ✅ Complete v1.1.6 backend source
│   ├── auth/           2 files
│   ├── db/             6 files
│   ├── middleware/     5 files
│   ├── routes/         16 files
│   ├── utils/          7 files
│   ├── node_modules/   ~2,000 files
│   └── index.js        Main server entry
└── dist/               ⚠️  Compiled frontend (not source)
    ├── assets/         13 JS/CSS bundles
    └── index.html      Entry point
```

**What to use:**
- ✅ `server/**/*` - ALL backend files  
- ❌ `dist/**/*` - Skip (compiled, not source)

---

### Pool 2: `/RECONSTRUCTION/sorted-git-extracted/`

**Source:** Git blob recovery from corrupted repository  
**Extracted:** Manual git object extraction  
**Files:** Organized by extension  
**Rule:** ❌ DO NOT MODIFY - reference only

#### Top-Level Structure
```
sorted-git-extracted/
├── JSX/                156 JSX files (React components)
├── JS/                 83 JS files (utilities, configs)
├── CSS/                22 CSS files (stylesheets)
├── JSON/               31 JSON files (configs)
├── MD/                 23 Markdown files (docs)
├── HTML/               1 HTML file
├── PNG/, ICO/          10 image files
├── WEBMANIFEST/        6 manifest files
├── NO_EXTENSION/       2,525 files (git objects + Dockerfile)
│   └── decompressed/   🆕 Extracted git blobs
└── [Other extensions]  ~15 misc files
```

#### What to use:
- ✅ `JSX/**/*` - React components (v1.1.6)
- ✅ `JS/**/*` - JavaScript modules (v1.1.6)
- ✅ `CSS/**/*` - Stylesheets
- ✅ `JSON/package.json` - Frontend dependencies
- ✅ `NO_EXTENSION/Dockerfile` - Build config
- ✅ `NO_EXTENSION/decompressed/` - Recovered files

---

### Pool 2.1: `/sorted-git-extracted/NO_EXTENSION/decompressed/`

**Source:** Decompressed git blob objects  
**Created:** 2025-12-02 (this session)  
**Files:** 659 files extracted from 2,517 git objects  
**Rule:** ❌ DO NOT MODIFY - reference only

#### Structure
```
decompressed/
├── jsx/                345 JSX files (React components)
├── js/                 83 JS files
├── css/                18 CSS files
├── json/               41 JSON files
├── txt/                170 text files
├── html/               0 files
├── unknown/            2 files
├── candidates/         🎯 Organized candidate files
│   ├── Login/          Login page candidates
│   ├── Setup/          Setup page candidates
│   ├── TabView/        Tab viewer candidates
│   ├── AuthContext/    Auth context candidates
│   └── ThemeContext/   Theme context candidates
├── decompression.log   Extraction log
└── stats.json          Statistics
```

#### What to use:
- ✅ `candidates/**/*` - Organized candidates for missing files
- ✅ `jsx/**/*` - All React components
- ✅ `js/**/*` - All JavaScript modules  
- ✅ `css/**/*` - All stylesheets

---

### Pool 2.2: `/sorted-git-extracted/NO_EXTENSION/decompressed/candidates/`

**Purpose:** 🎯 Organized candidates for easy comparison  
**Created:** 2025-12-02 (this session)  
**Format:** Files renamed as `[Component]_candidate_N.jsx`

#### Candidate Files

| Target File | Candidates | Location | Status |
|-------------|------------|----------|--------|
| **Login.jsx** | 1 | `candidates/Login/` | ✅ Single confirmed match |
| **TabView.jsx** | 2 | `candidates/TabView/` | ⚠️  Need to compare versions |
| **AuthContext.jsx** | 7 | `candidates/AuthContext/` | ⚠️  Need to select best |
| **ThemeContext.jsx** | 9 | `candidates/ThemeContext/` | ⚠️  Need to identify correct |
| **Setup.jsx** | 0-10 | `candidates/Setup/` | 🔍 Search results (need verification) |

**File Naming:**
- `Login_candidate_1.jsx` - Primary/largest match
- `TabView_candidate_1.jsx` - First version
- `TabView_candidate_2.jsx` - Second version
- etc.

---

### Pool 3: `/RECONSTRUCTION/recovered-from-docker/`

**Source:** Earlier Docker extraction attempt  
**Status:** ⚠️  May have duplicates of docker-extracted  
**Rule:** ❌ DO NOT MODIFY - reference only

```
recovered-from-docker/
├── server/              Backend (check if same as docker-extracted)
└── dist/                Compiled frontend
```

**Usage:** Check if different from `docker-extracted/`, otherwise skip

---

## ⚠️ Reference (Outdated): `/framerr/framerr/`

**Version:** v1.0.6 (pre-corruption)  
**Purpose:** Template reference only  
**Rule:** ❌ DO NOT USE as primary source (outdated)

```
framerr/framerr/
├── src/
│   ├── components/
│   ├── contexts/       Has AuthContext, ThemeContext (v1.0.6)
│   └── ...
├── package.json        v1.0.6 dependencies
└── ...
```

**When to use:**
- 📋 Template for missing files (update to v1.1.6)
- 📋 Understanding basic structure
- ❌ NOT for direct copying (wrong version)

---

## Decision Matrix: Which Pool to Use?

| Need | Primary Source | Secondary Source | Notes |
|------|---------------|------------------|-------|
| **Backend files** | docker-extracted/server/ | - | 100% complete v1.1.6 |
| **Frontend JSX** | sorted-git-extracted/JSX/ | decompressed/jsx/ | Use git recovery |
| **Frontend JS** | sorted-git-extracted/JS / | decompressed/js/ | Use git recovery |
| **Missing pages** | decompressed/candidates/ | Reconstruct | Check candidates first |
| **Contexts** | decompressed/candidates/ | framerr/framerr (v1.0.6) | Git recovery preferred |
| **CSS files** | sorted-git-extracted/CSS/ | decompressed/css/ | Use git recovery |
| **Build configs** | sorted-git-extracted/ | framerr/framerr | Dockerfile, vite, etc. |

---

## Workflow: File Selection Process

### Step 1: Check Candidates First
Look in `decompressed/candidates/[Component]/` for organized options

### Step 2: If Multiple Versions
Compare versions:
1. Check file size (larger usually = more features)
2. View first 50 lines
3. Check imports for v1.1.6 patterns
4. Select most complete version

### Step 3: If Not in Candidates
Search pools in order:
1. `sorted-git-extracted/JSX/` or `JS/`
2. `decompressed/jsx/` or `js/`
3. Check if needs reconstruction

### Step 4: Copy to framerr-1
```powershell
Copy-Item [source] "C:\...\framerr-1\src\[proper-path]\[Component].jsx"
```

---

## Quick Reference: Common Paths

### Backend (Ready to Use)
```
Source: C:\...\RECONSTRUCTION\docker-extracted\server\
Target: C:\...\RECONSTRUCTION\framerr-1\server\
Status: ✅ Already copied
```

### Frontend Candidates
```
Source: C:\...\sorted-git-extracted\NO_EXTENSION\decompressed\candidates\
Files:
  - Login/Login_candidate_1.jsx
  - TabView/TabView_candidate_1.jsx, TabView_candidate_2.jsx
  - AuthContext/AuthContext_candidate_1.jsx (through 7)
  - ThemeContext/ThemeContext_candidate_1.jsx (through 9)
  - Setup/Setup_candidate_[1-N].jsx
```

### Frontend Source Pool (JSX)
```
Source: C:\...\sorted-git-extracted\JSX\
Files: 156 JSX files with version suffixes (_1, _2, etc.)
Target: C:\...\framerr-1\src\[components|pages|contexts]\
```

### Frontend Source Pool (Decompressed)
```
Source: C:\...\sorted-git-extracted\NO_EXTENSION\decompressed\jsx\
Files: 345 JSX files (hash-named)
Use: When file not in sorted-git-extracted/JSX/
```

---

## Status Summary

### ✅ Complete
- Backend server files
- Build configuration files
- Directory structure

### ⏸️ In Progress
- Frontend component organization
- Candidate file selection
- Missing file identification

### 📋 Next Steps
1. Review candidates in `/decompressed/candidates/`
2. Select best version of each file
3. Copy to framerr-1/src/ with proper structure
4. Verify imports and dependencies

---

## File Modification Rules

| Location | Status | Rule |
|----------|--------|------|
| `/framerr-1/**` | 🟢 Active | ✅ Safe to modify |
| `/docker-extracted/**` | 🔴 Pool | ❌ Read-only |
| `/sorted-git-extracted/**` | 🔴 Pool | ❌ Read-only |
| `/decompressed/**` | 🔴 Pool | ❌ Read-only |
| `/candidates/**` | 🟡 Staging | ❌ Read-only (copy from here) |
| `/framerr/framerr/**` | 🟠 Reference | ❌ Read-only (v1.0.6) |
