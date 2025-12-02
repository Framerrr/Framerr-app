# Framerr Documentation System Integration - COMPREHENSIVE PLAN v2.0

**Objective:** Create an airtight, comprehensive documentation and workflow system with Docker dev/debug builds, code auditing, and seamless chat-to-chat continuity.

> [!IMPORTANT]
> **Agent Execution Guide:** This plan contains the FULL SCOPE of the integration. When executing, follow phases sequentially, verify at each checkpoint, and refer back to this plan for context. All file paths, structures, and cross-references are defined here.

---

## Core Principles

1. **Seamless Continuity:** Any agent can pick up work across sessions
2. **Comprehensive Tracking:** Detailed logs of all work, decisions, progress
3. **Tight Integration:** Workflows and docs work hand-in-hand
4. **Code Quality:** Automated auditing for production readiness
5. **Docker/Git Separation:**
   - `/docs`, `/.agent`, `/.olddocs` → Git tracked, Docker ignored
   - Dual Docker builds: production (minified) + debug (source maps)

---

## Target Directory Structure

```
Framerr-app/
├── .agent/                         # DOCKER-IGNORE, GIT-TRACK
│   ├── rules.md                    # Master rules (quick reference)
│   ├── rules/
│   │   ├── git-rules.md           # Git safety (detailed)
│   │   ├── development-rules.md   # Code standards, testing
│   │   └── theming-rules.md       # UI/theming compliance
│   └── workflows/
│       ├── start-session.md       # Session initialization
│       ├── end-session.md         # Session handoff
│       ├── checkpoint.md          # Context maintenance (every 10 calls)
│       ├── git-workflow.md        # Git operations guide (EXISTS)
│       ├── build-develop.md       # Docker: develop + debug deployment
│       ├── build-production.md    # Docker: production release
│       ├── code-audit.md          # Code cleanup (logs, deprecated code)
│       └── recover-session.md     # Emergency recovery
│
├── docs/                           # DOCKER-IGNORE, GIT-TRACK
│   ├── README.md                   # Documentation index
│   ├── CHATFLOW.md                 # Quick start guide (primary entry)
│   │
│   ├── tasks/                      # Task tracking system
│   │   ├── HANDOFF.md              # Current state & critical context
│   │   ├── TASK_CURRENT.md         # Active work (this session)
│   │   ├── STATUS.md               # Overall progress dashboard
│   │   ├── TASK_BACKLOG.md         # Future work queue
│   │   └── TASK_COMPLETED.md       # Historical log
│   │
│   ├── architecture/               # System design docs
│   │   ├── ARCHITECTURE.md         # File structure, organization
│   │   ├── PROJECT_SCOPE.md        # Vision, features, tech stack
│   │   ├── API.md                  # API reference (if exists)
│   │   └── SIDEBAR_IFRAME_ARCHITECTURE.md  # Tab system design (if exists)
│   │
│   ├── development/                # Developer guides
│   │   ├── WIDGET_DEVELOPMENT_GUIDE.md
│   │   ├── LOGGING_REFERENCE.md
│   │   ├── DOCKER_BUILDS.md        # Docker dev/debug guide (NEW)
│   │   └── MOBILE_LAYOUT_ALGORITHM.md (if exists)
│   │
│   ├── theming/                    # Theming system docs (if exists)
│   │   ├── THEMING_ENGINE.md
│   │   ├── DEVELOPER_GUIDE.md
│   │   ├── CSS_VARIABLES.md
│   │   ├── COMPONENT_PATTERNS.md
│   │   └── MIGRATION_GUIDE.md
│   │
│   ├── recovery/                   # Archive: Recovery documentation
│   │   ├── README.md               # Recovery process overview (NEW)
│   │   ├── RECONSTRUCTION_STATUS.md
│   │   ├── FILE_MANIFEST.md
│   │   ├── GIT_BLOB_RECOVERY.md
│   │   ├── BUILD_ERRORS.md
│   │   └── ... (all recovery .md files)
│   │
│   └── versions/                   # Version-specific docs
│       └── 1.1.6-recovered.md      # Current version doc
│
├── .olddocs/                       # DOCKER-IGNORE, GIT-TRACK
│   └── ... (unused root MD files that don't fit system)
│
├── Dockerfile                      # Production build
├── Dockerfile.dev                  # Debug build (NEW)
├── docker-compose.yml              # Production deployment
├── docker-compose.dev.yml          # Hot reload dev (NEW)
├── .dockerignore                   # UPDATED
├── .gitignore                      # Minimal changes
│
├── CHANGELOG.md                    # NEW
├── README.md                       # REWRITTEN
├── package.json                    # Updated with version
│
├── src/                            # Source code
├── server/                         # Backend code
├── public/                         # Static assets
├── dist/                           # DOCKER-IGNORE, GIT-IGNORE
└── node_modules/                   # DOCKER-IGNORE, GIT-IGNORE
```

---

## File Audit: Root MD Files (20 files)

| File | Decision | Destination | Action |
|------|----------|-------------|--------|
| **ARCHITECTURE.md** | ✅ Use | `docs/architecture/ARCHITECTURE.md` | Move + update refs |
| **HANDOFF.md** | ✅ Use | `docs/tasks/HANDOFF.md` | Move + **major restructure** |
| **CHATFLOW.md** | ✅ Use | `docs/CHATFLOW.md` | Move + **update paths** |
| **README.md** | ✅ Use | `README.md` | **Complete rewrite** (stays at root) |
| **BUILD_ERRORS.md** | 📦 Archive | `docs/recovery/BUILD_ERRORS.md` | Move as-is |
| **BUILD_ERRORS_PROGRESS.md** | 📦 Archive | `docs/recovery/BUILD_ERRORS_PROGRESS.md` | Move as-is |
| **COPY_LOG.md** | 📦 Archive | `docs/recovery/COPY_LOG.md` | Move as-is |
| **DECOMPRESSION_PLAN.md** | 📦 Archive | `docs/recovery/DECOMPRESSION_PLAN.md` | Move as-is |
| **FILE_MANIFEST.md** | 📦 Archive | `docs/recovery/FILE_MANIFEST.md` | Move as-is |
| **FILE_POOL_ORGANIZATION.md** | 📦 Archive | `docs/recovery/FILE_POOL_ORGANIZATION.md` | Move as-is |
| **FILE_VERSION_ANALYSIS.md** | 📦 Archive | `docs/recovery/FILE_VERSION_ANALYSIS.md` | Move as-is |
| **FINAL_FILE_SELECTION.md** | 📦 Archive | `docs/recovery/FINAL_FILE_SELECTION.md` | Move as-is |
| **GIT_BLOB_RECOVERY.md** | 📦 Archive | `docs/recovery/GIT_BLOB_RECOVERY.md` | Move as-is |
| **NO_EXTENSION_ANALYSIS.md** | 📦 Archive | `docs/recovery/NO_EXTENSION_ANALYSIS.md` | Move as-is |
| **RECONSTRUCTION_STATUS.md** | 📦 Archive | `docs/recovery/RECONSTRUCTION_STATUS.md` | Move as-is |
| **STRATEGY_REVISED.md** | 📦 Archive | `docs/recovery/STRATEGY_REVISED.md` | Move as-is |
| **THEMECONTEXT_SEARCH.md** | 📦 Archive | `docs/recovery/THEMECONTEXT_SEARCH.md` | Move as-is |
| **js-inventory.csv** | 📦 Archive | `docs/recovery/js-inventory.csv` |Move as-is |
| **jsx-inventory.csv** | 📦 Archive | `docs/recovery/jsx-inventory.csv` | Move as-is |
| **build-errors.log** | ❌ Delete | N/A | Stale |
| **build-output.log** | ❌ Delete | N/A | Stale |

---

## Docker & Git Ignore Configuration

### .dockerignore (Complete File)

```dockerfile
# Dependencies
node_modules
npm-debug.log
yarn-error.log

# Development
.git
.gitignore
.env
.env.local
.vscode
.idea

# Build artifacts (will be built in Docker)
dist

# User data (must not be copied into image)
server/data
server/public/profile-pictures
server/public/favicon

# Documentation (DOCKER-IGNORE, but GIT-TRACKED)
docs/
.agent/
.olddocs/
*.md
!README.md

# Config files
.editorconfig
.eslintrc*
.prettierrc

# OS files
.DS_Store
Thumbs.db

# Logs
*.log

# Test files
**/*.test.js
**/*.spec.js
__tests__
coverage

# CSV files (inventories, temp data)
*.csv
```

### .gitignore (No changes needed)

Current `.gitignore` is correct - keeps docs/, .agent/, .olddocs/ tracked.

---

## Docker Build Strategy

### Production Dockerfile (Existing)

**Purpose:** Optimized production builds (minified, no source maps)
**Images:** `develop`, `latest`, version tags (e.g., `1.1.7`)
**File:** `Dockerfile` (already exists)

### Debug Dockerfile (New)

**Purpose:** Development builds with source maps for debugging
**Images:** `develop-debug`
**File:** `Dockerfile.dev` (will create)

**Content:**
```dockerfile
# Stage 1: Build frontend WITH SOURCE MAPS
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build with source maps (development mode)
RUN npm run build -- --mode development --sourcemap

# Stage 2: Runtime (same as production)
FROM node:20-alpine

RUN apk add --no-cache dumb-init su-exec shadow
RUN addgroup -g 10000 framerr && adduser -D -u 10000 -G framerr framerr

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=frontend-builder /app/dist ./dist

COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

RUN mkdir -p /config && chown -R framerr:framerr /config /app

VOLUME ["/config"]

ENV NODE_ENV=development \
    PORT=3001 \
    PUID=99 \
    PGID=100 \
    TZ=UTC \
    DATA_DIR=/config

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dumb-init", "node", "server/index.js"]

LABEL org.opencontainers.image.title="Framerr (Development/Debug)" \
    org.opencontainers.image.description="Development build with source maps for debugging" \
    org.opencontainers.image.authors="pickels23" \
    org.opencontainers.image.version="1.1.6-dev"
```

### Vite Config Update

**File:** `vite.config.js`
**Change:** Enable source maps based on NODE_ENV

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 5173,
  },
})
```

### Docker Image Matrix

| Tag | Purpose | Minified | Source Maps | Size | Use Case |
|-----|---------|----------|-------------|------|----------|
| `develop` | Dev testing | ✅ Yes | ❌ No | ~150MB | Test production-like build |
| `develop-debug` | Dev debugging | ❌ No | ✅ Yes | ~250MB | Debug with browser DevTools |
| `1.1.7` | Production | ✅ Yes | ❌ No | ~150MB | Versioned release |
| `latest` | Production | ✅ Yes | ❌ No | ~150MB | Latest production |

---

## Workflow Specifications

### `/code-audit` Workflow (NEW)

**Purpose:** Clean up code before production releases

**Algorithm:**
```
1. Find last production tag:
   git describe --tags --abbrev=0  # e.g., v1.1.6-recovered

2. Get changed files since tag:
   git diff --name-only <tag>..HEAD --diff-filter=ACMR  # Only added, changed, modified, renamed

3. For each changed file:
   IF file is .js or .jsx:
     a. Scan for console.* calls:
        - console.log
        - console.warn
        - console.error
        - console.debug
        - console.info
     
     b. Analyze context of each console call:
        - Is it debug info? → logger.debug()
        - Is it user action? → logger.info()
        - Is it warning? → logger.warn()
        - Is it error handling? → logger.error()
     
     c. Convert to logger format:
        OLD: console.log('User logged in:', user);
        NEW: logger.info('User login successful', { 
               userId: user.id,
               username: user.username,
               timestamp: new Date().toISOString()
             });
     
     d. Scan for deprecated code:
        - Commented code blocks (/* ... */ or // ...)
        - Unused imports
        - Unreachable code (after return)
        - Duplicate functions
     
     e. Remove deprecated code
     
     f. Check for sensitive data in logs:
        - password, token, apiKey, secret
        - If found, redact or remove

4. Test build after each file cleanup:
   npm run build

5. If build fails:
   Restore file and alert user

6. Create summary report

7. Commit changes:
   git add .
   git commit -m "chore: code audit - convert console to logger, remove deprecated code"
```

**File Structure:**
```markdown
---
description: Audit code for production readiness
---

# Code Audit Workflow

## When to Use
- Before production releases
- Periodically (monthly) for code cleanup
- After major feature development

## Steps

1. **Find baseline (last production tag)**
   ```bash
   git describe --tags --abbrev=0
   ```

2. **Get changed files**
   ```bash
   git diff --name-only <tag>..HEAD --diff-filter=ACMR
  ``` 

3. **For each .js/.jsx file:**
   - Scan for console.* calls
   - Convert to logger.* with proper levels
   - Format with structured data
   - Remove sensitive info from logs
   - Remove commented code blocks
   - Remove unused imports
   - Remove unreachable code

4. **Logging conversion rules:**
   - `console.log(...)` → Analyze context:
     - Debug/diagnostic → `logger.debug(...)`
     - User actions → `logger.info(...)`
     - Unexpected behavior → `logger.warn(...)`
   - `console.warn(...)` → `logger.warn(...)`
   - `console.error(...)` → `logger.error(...)`
   - `console.debug(...)` → `logger.debug(...)`

5. **Format guidelines:**
   ```javascript
   // ❌ BEFORE
   console.log('User logged in:', user);
   console.log('API call failed', error);
   
   // ✅ AFTER
   logger.info('User authentication successful', {
     userId: user.id,
     username: user.username,
     loginMethod: 'password'
   });
   
   logger.error('API request failed', {
     endpoint: '/api/users',
     error: error.message,
     statusCode: error.response?.status
   });
   ```

6. **Sensitive data check:**
   - Never log: passwords, tokens, API keys, secrets
   - Redact if necessary: `token: '<redacted>'`

7. **Build verification:**
   ```bash
   npm run build
   ```

8. **Review & commit:**
   - Show summary to user
   - Get approval
   - Commit: `chore: code audit - logging cleanup and dead code removal`

## Output Example
```
Code Audit Report
=================
Baseline: v1.1.6-recovered
Files scanned: 23

Changes:
- Converted 12 console.log → logger.info
- Converted 3 console.log → logger.debug
- Converted 5 console.error → logger.error
- Removed 4 unused imports
- Removed 87 lines of commented code
- Removed 1 unreachable function

Files modified: 8
Build status: ✅ Passed

Ready to commit?
```
```

---

## Task Tracking System - Document Templates

### docs/tasks/HANDOFF.md Template

```markdown
# Framerr Development Handoff

**Last Updated:** [Auto-filled by workflows]
**Current Phase:** Phase 8 - Polish & Enhancement
**Development Branch:** `develop`
**Production Version:** v1.1.6-recovered

---

## 🔥 CRITICAL CONTEXT (Read First)

### Current State
[What's the immediate situation? What was just completed?]

- Latest commit: [hash]
- Build status: ✅ Passing / ❌ Failing
- Docker images:
  - Development: `pickels23/framerr:develop` (pushed: [timestamp])
  - Debug: `pickels23/framerr:develop-debug` (pushed: [timestamp])
  - Production: `pickels23/framerr:1.1.6-recovered`

### Critical Decisions
[Important choices made that affect ongoing work]

### Known Issues & Blockers
[Anything blocking progress or causing problems]

---

## 📊 Quick Reference

| Aspect | Status | Details |
|--------|--------|---------|
| Build | ✅ Passing | Last: [timestamp] |
| Git Branch | `develop` | Clean / [X] uncommitted files |
| Docker (Dev) | `develop` | Digest: sha256:... |
| Docker (Debug) | `develop-debug` | Digest: sha256:... |
| Production | `1.1.6-recovered` | Deployed: [date] |

---

## 🎯 Current Task

**Active:** See [TASK_CURRENT.md](./TASK_CURRENT.md)

**In Progress:**
- [Feature/task name]

**Next Up:**
- [Next planned work]

---

## 📝 Recent Work (Last 3 Sessions)

### [Date] - Session: [Title]
**Duration:** [X tool calls]
**Branch:** develop
**Commits:** `abc1234`, `def5678`

**Completed:**
- [What was done]

**Files:**
- `src/components/Widget.jsx`
- `server/routes/api.js`

---

## 🏗️ Active Features

None currently / [Feature in progress]

---

## 🐛 Known Bugs

None currently / [List of bugs]

---

## 📚 Important Context

### Theming System
- Must use theme utilities (`.bg-theme-*`, etc.)
- Test in Light theme before commit
- See `docs/theming/DEVELOPER_GUIDE.md`

### Widget System
- 13 widgets implemented
- Sizing guide: `docs/development/WIDGET_DEVELOPMENT_GUIDE.md`

### Docker Builds
- `/build-develop` creates 2 images: `develop` + `develop-debug`
- Debug build has source maps for debugging
- See `docs/development/DOCKER_BUILDS.md`

### Logging
- Use `logger.*` not `console.*`
- Run `/code-audit` before production releases
- See `docs/development/LOGGING_REFERENCE.md`

---

## 🔗 Quick Links

- [TASK_CURRENT.md](./TASK_CURRENT.md) - Active session work
- [CHATFLOW.md](../CHATFLOW.md) - Getting started guide
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) - Code structure
- [PROJECT_SCOPE.md](../architecture/PROJECT_SCOPE.md) - Vision & features
- [Workflow Reference](#) - What each workflow does

---

**For new agents:** Read this entire document, especially CRITICAL CONTEXT. Then read TASK_CURRENT.md to see active work.
```

### docs/tasks/TASK_CURRENT.md Template

```markdown
# Current Task - [Session Date]

**Status:** No Active Session / In Progress / Blocked
**Started:** [Timestamp]
**Checkpoint:** 0 (Next: #10)
**Tool Calls:** 0

---

## Task Description

[What are we working on this session?]

---

## Subtasks

- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

---

## Progress Log

### [Timestamp] - Started Session
- Read HANDOFF.md ✅
- Initialized checkpoint tracking
- Starting work on: [task]

---

## Files Modified

None yet / [List of files]

---

## Decisions Made

None yet / [List of decisions]

---

## Blockers / Issues

None currently / [List of blockers]

---

## Testing Performed

- [ ] Build passes
- [ ] Light theme tested (if UI changes)
- [ ] Docker build tested

---

## Next Steps

1. [Next immediate action]
2. [Following action]

---

## Session End Marker
(Added by `/end-session` workflow - DO NOT ADD MANUALLY)

✅ **SESSION END**
- Session ended: [timestamp]
- Tool calls: [total]
- Status: Ready for next session
- Summary: [brief summary]
```

---

## Implementation Phases (Updated)

### Phase 1: Directory Structure (5 tool calls)
1. Create all directories (docs/tasks, docs/architecture, docs/development, docs/recovery, docs/versions, .agent/rules/, .olddocs/)
2. Create empty placeholder files (README.md in each subdir)
3. Update `.dockerignore` (add docs/, .agent/, .olddocs/)
4. Verify `.gitignore` (ensure docs/, .agent/, .olddocs/ are NOT ignored)
5. Commit: "chore: create documentation structure"

### Phase 2: Move Recovery Docs (3 tool calls)
1. Create `docs/recovery/README.md` (explain recovery process)
2. Move all 15 recovery .md files + .csv files from root to `docs/recovery/`
3. Commit: "docs: archive recovery documentation"

### Phase 3: Rules Migration (10 tool calls)
1. Create `.agent/rules/git-rules.md` (extract from current `.agent/rules.md`)
2. Review `OLDDOCS/rules/framerr_rules.md` - adapt for new paths
3. Create `.agent/rules/development-rules.md` (from framerr_rules.md, adapted)
4. Create `.agent/rules/theming-rules.md` (from `OLDDOCS/rules/framerr_theming_rules.md`)
5. Rewrite `.agent/rules.md` (unified quick reference, links to subdocs)
6. Verify all Git safety rules preserved (forbidden commands list)
7. Update references to new paths
8. Test rule links
9. Commit: "docs: consolidate rules system"

### Phase 4: Workflow Migration (15 tool calls)
1. Create `.agent/workflows/start-session.md` (from `OLDDOCS/workflows/start_session.md`, adapt paths)
2. Create `.agent/workflows/end-session.md` (from `OLDDOCS/workflows/end_session.md`, adapt paths)
3. Create `.agent/workflows/checkpoint.md` (from `OLDDOCS/workflows/execute_checkpoint.md`, adapt)
4. Verify `.agent/workflows/git-workflow.md` (already exists, check content)
5. Create `.agent/workflows/code-audit.md` (NEW - from spec above)
6. Create placeholder `.agent/workflows/build-develop.md` (will complete later with user)
7. Create placeholder `.agent/workflows/build-production.md` (will complete later with user)
8. Create placeholder `.agent/workflows/recover-session.md` (will complete later with user)
9. Update CHATFLOW.md workflow list (once CHATFLOW is created)
10. Test workflow file loading
11. Commit: "docs: migrate and create workflows"

### Phase 5: Docker Build Files (8 tool calls)
1. Create `Dockerfile.dev` (debug build with source maps)
2. Update `vite.config.js` (add source map configuration)
3. Create `docs/development/DOCKER_BUILDS.md` (explain dev vs debug vs production)
4. Update `.dockerignore` if needed
5. Test build: `npm run build -- --mode development --sourcemap`
6. Verify source maps generated
7. Commit: "build: add development Docker build with source maps"

### Phase 6: Architecture Docs (6 tool calls)
1. Move `ARCHITECTURE.md` → `docs/architecture/ARCHITECTURE.md`
2. Move `OLDDOCS/docs/PROJECT_SCOPE.md` → `docs/architecture/PROJECT_SCOPE.md`
3. Create `docs/architecture/README.md` (index of architecture docs)
4. Update internal links in moved files
5. Verify all cross-references
6. Commit: "docs: organize architecture documentation"

### Phase 7: Development Guides (5 tool calls)
1. Move `OLDDOCS/docs/WIDGET_DEVELOPMENT_GUIDE.md` → `docs/development/WIDGET_DEVELOPMENT_GUIDE.md`
2. Move `OLDDOCS/docs/LOGGING_REFERENCE.md` → `docs/development/LOGGING_REFERENCE.md`
3. Create `docs/development/README.md` (index)
4. Update links
5. Commit: "docs: organize development guides"

### Phase 8: Task System Foundation (15 tool calls)
1. Merge root `HANDOFF.md` + structure from plan → `docs/tasks/HANDOFF.md`
2. Populate with v1.1.6-recovered current state
3. Create `docs/tasks/TASK_CURRENT.md` (from template, mark "No Active Session")
4. Add session end marker to TASK_CURRENT.md
5. Create `docs/tasks/STATUS.md` (populate with current progress)
6. Create `docs/tasks/TASK_BACKLOG.md` (template)
7. Move `OLDDOCS/docs/TASK_COMPLETED.md` → `docs/tasks/TASK_COMPLETED.md`
8. Add historical entry to TASK_COMPLETED.md (v1.1.6 recovery)
9. Create cross-references between all task docs
10. Link workflows → task docs
11. Test all task doc links
12. Commit: "docs: create task tracking system"

### Phase 9: Primary Documentation (10 tool calls)
1. Merge root `CHATFLOW.md` + `OLDDOCS/docs/CHATFLOW.md` → ` docs/CHATFLOW.md`
2. Update all paths in CHATFLOW.md to new structure
3. Update workflow list in CHATFLOW.md
4. Create `docs/README.md` (documentation index, navigation)
5. Move `OLDDOCS/docs/1.1.6.md` → `docs/versions/1.1.6-recovered.md`
6. Rewrite root `README.md` (project overview, installation, Docker deployment)
7. Create `CHANGELOG.md` (start with v1.1.6-recovered)
8. Update all cross-references
9. Verify all links work
10. Commit: "docs: finalize primary documentation"

### Phase 10: Cleanup & Archive (4 tool calls)
1. Delete `build-errors.log`, `build-output.log`
2. Create `.olddocs/` directory
3. Move any remaining unused root .md files to `.olddocs/`
4. Commit: "chore: cleanup root directory"

### Phase 11: Build Workflow Creation (User Collaboration)
Work with user to recreate:
1. `/build-develop` - Docker develop + debug builds
2. `/build-production` - Production releases
3. `/recover-session` - Emergency recovery

### Phase 12: Verification & Testing (8 tool calls)
1. Run `/start-session` workflow (test workflow execution)
2. Verify HANDOFF.md reads correctly
3. Run `/checkpoint` manually (test context verification)
4. Run `/end-session` workflow (test doc updates)
5. Verify all documentation cross-references
6. Check for broken links
7. Verify Git repository state
8. Final commit: "docs: verify system integration complete"

**Total Estimated Tool Calls:** ~90 (includes checkpoints at #10, #20, #30, etc.)

---

## Execution Guidelines for Agent

### Before Starting
- [ ] Read this ENTIRE plan
- [ ] Understand directory structure
- [ ] Understand file audit decisions
- [ ] Know which files to move, archive, or delete
- [ ] Understand workflow integration

### During Execution
- [ ] Follow phases sequentially
- [ ] Verify each file move/creation
- [ ] Test cross-references immediately
- [ ] Commit after each phase
- [ ] Run checkpoint every 10 tool calls
- [ ] Refer back to plan for context

### At Checkpoints (#10, #20, etc.)
- [ ] Re-read CRITICAL CONTEXT (when HANDOFF.md exists)
- [ ] Verify still on track with plan
- [ ] Check no errors or broken links
- [ ] Confirm phase completions

### Quality Checks
- [ ] All paths updated correctly
- [ ] No broken links
- [ ] Cross-references work
- [ ] Git safety rules preserved
- [ ] Build still passes
- [ ] No file corruption

---

## File Path Mapping (Complete Reference)

### Rules System
```
.agent/rules.md               → Unified quick reference (NEW/REWRITTEN)
OLDDOCS/rules/framerr_rules.md → .agent/rules/development-rules.md (ADAPTED)
OLDDOCS/rules/framerr_theming_rules.md → .agent/rules/theming-rules.md (COPY)
[Current .agent/rules.md Git safety section] → .agent/rules/git-rules.md (EXTRACT)
```

### Workflows
```
OLDDOCS/workflows/start_session.md → .agent/workflows/start-session.md (ADAPTED)
OLDDOCS/workflows/end_session.md → .agent/workflows/end-session.md (ADAPTED)
OLDDOCS/workflows/execute_checkpoint.md → .agent/workflows/checkpoint.md (ADAPTED)
.agent/workflows/git-workflow.md → KEEP AS-IS
[NEW] → .agent/workflows/code-audit.md (CREATE from spec)
[TBD with user] → .agent/workflows/build-develop.md
[TBD with user] → .agent/workflows/build-production.md
[TBD with user] → .agent/workflows/recover-session.md
```

### Task Docs
```
HANDOFF.md (root) + [template] → docs/tasks/HANDOFF.md (MERGE + POPULATE)
[template] → docs/tasks/TASK_CURRENT.md (CREATE)
[template] → docs/tasks/STATUS.md (CREATE)
[template] → docs/tasks/TASK_BACKLOG.md (CREATE)
OLDDOCS/docs/TASK_COMPLETED.md → docs/tasks/TASK_COMPLETED.md (MOVE)
```

### Architecture
```
ARCHITECTURE.md (root) → docs/architecture/ARCHITECTURE.md (MOVE)
OLDDOCS/docs/PROJECT_SCOPE.md → docs/architecture/PROJECT_SCOPE.md (MOVE)
```

### Development
```
OLDDOCS/docs/WIDGET_DEVELOPMENT_GUIDE.md → docs/development/WIDGET_DEVELOPMENT_GUIDE.md (MOVE)
OLDDOCS/docs/LOGGING_REFERENCE.md → docs/development/LOGGING_REFERENCE.md (MOVE)
[NEW] → docs/development/DOCKER_BUILDS.md (CREATE)
```

### Primary Docs
```
CHATFLOW.md (root) + OLDDOCS/docs/CHATFLOW.md → docs/CHATFLOW.md (MERGE)
README.md (root) → README.md (REWRITE in place)
OLDDOCS/docs/1.1.6.md → docs/versions/1.1.6-recovered.md (MOVE + RENAME)
[NEW] → CHANGELOG.md (CREATE)
[NEW] → docs/README.md (CREATE)
```

### Recovery Archive
```
BUILD_ERRORS.md → docs/recovery/BUILD_ERRORS.md
BUILD_ERRORS_PROGRESS.md → docs/recovery/BUILD_ERRORS_PROGRESS.md
COPY_LOG.md → docs/recovery/COPY_LOG.md
DECOMPRESSION_PLAN.md → docs/recovery/DECOMPRESSION_PLAN.md
FILE_MANIFEST.md → docs/recovery/FILE_MANIFEST.md
FILE_POOL_ORGANIZATION.md → docs/recovery/FILE_POOL_ORGANIZATION.md
FILE_VERSION_ANALYSIS.md → docs/recovery/FILE_VERSION_ANALYSIS.md
FINAL_FILE_SELECTION.md → docs/recovery/FINAL_FILE_SELECTION.md
GIT_BLOB_RECOVERY.md → docs/recovery/GIT_BLOB_RECOVERY.md
NO_EXTENSION_ANALYSIS.md → docs/recovery/NO_EXTENSION_ANALYSIS.md
RECONSTRUCTION_STATUS.md → docs/recovery/RECONSTRUCTION_STATUS.md
STRATEGY_REVISED.md → docs/recovery/STRATEGY_REVISED.md
THEMECONTEXT_SEARCH.md → docs/recovery/THEMECONTEXT_SEARCH.md
js-inventory.csv → docs/recovery/js-inventory.csv
jsx-inventory.csv → docs/recovery/jsx-inventory.csv
[NEW] → docs/recovery/README.md (CREATE - explain recovery)
```

### Docker Files
```
Dockerfile → KEEP (production build)
[NEW] → Dockerfile.dev (debug build)
[NEW] → docker-compose.dev.yml (hot reload development)
vite.config.js → UPDATE (add source map config)
```

---

## Success Criteria

### Must Have ✅
- [ ] All rules preserved and categorized
- [ ] All workflows functional with new paths
- [ ] HANDOFF.md comprehensive and accurate
- [ ] Task tracking system complete (5 docs)
- [ ] Cross-references all work
- [ ] Build still passes
- [ ] No Git safety regressions
- [ ] Docker dev/debug builds work
- [ ] `/code-audit` workflow complete

### Should Have ⚠️
- [ ] All recovery docs archived properly
- [ ] Documentation easily navigable
- [ ] Workflows tested (at least /start-session, /checkpoint, /end-session)
- [ ] README.md professional

### Nice to Have 💡
- [ ] Architecture diagrams
- [ ] Workflow diagrams (mermaid)
- [ ] Complete API documentation

---

## Risk Mitigation

### Risk 1: Path Mismatches
**Mitigation:** Test each cross-reference immediately after creation

### Risk 2: Workflow Breakage
**Mitigation:** Keep OLDDOCS intact as backup until verified

### Risk 3: Git Safety Loss
**Mitigation:** Explicitly check forbidden commands list after rules merge

### Risk 4: Build Failure
**Mitigation:** Run `npm run build` after Phase 5 (vite config change)

### Risk 5: Context Loss
**Mitigation:** Checkpoint (#10, #20, #30) re-reads this plan

---

## Post-Implementation: Next Steps

After all phases complete:

1. **User creates missing workflows** (`/build-develop`, `/build-production`, `/recover-session`)
2. **User reviews** workflow reference guide
3. **Agent tests** full session workflow (`/start-session` → work → `/end-session`)
4. **Deploy** first develop-debug build to test Docker
5. **Begin normal development** using new system

---

**This plan is comprehensive and ready for execution. Agent should bookmark this and refer back during implementation for full scope and context.**
