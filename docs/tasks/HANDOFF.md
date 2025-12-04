# HANDOFF DOCUMENT - Framerr v1.1.6

**Last Updated:** 2025-12-04 04:05:00  
**Status:** ✅ Operational - Dashboard Grid Redesign Planned  
**Current Version:** v1.1.6-recovered  
**Branch:** `develop`  
**Docker Image:** `pickels23/framerr:debug`

---

## 📌 CRITICAL CONTEXT

### What Framerr Is
Modern, self-hosted homelab dashboard with iframe tab system and customizable widgets. Successfully recovered from complete source code loss (Git corruption incident on 2025-12-01).

### Current State
- **Backend:** ✅ Complete (2,081 files from v1.1.6 Docker image)
- **Frontend:** ✅ 95% recovered + recovered hash navigation
- **Build:** ✅ Passing, deployed to Docker
- **Documentation:** ✅ Fully restructured (v2.0 system) + comprehensive dashboard redesign
- **Status:** Production-ready, operational; dashboard grid redesign planned

### Last Major Work
**Dashboard Grid System Planning** (2025-12-04 04:05)
- ✅ Complete architecture deep dive (10 core files analyzed)
- ✅ Identified root cause of "cells taller than wide" bug (container padding structure)
- ✅ Designed comprehensive bidirectional sync system (Auto/Manual modes)
- ✅ Created Smart Hybrid Swap algorithm for mobile→desktop sync
- ✅ Pressure tested 6 scenarios, identified 4 edge cases with solutions
- ✅ Organized documentation (~6,400 lines across 8 files)
- **Next:** Implement Phase 1 (12-column grid, desktop-only editing, downward sync)
- **See:** `docs/dashboard/` for all design docs (start with README.md)


---

## 🚀 Quick Start for New Agents

1. **Read this section first** - Critical context
2. **Check current work:** `docs/tasks/TASK_CURRENT.md`
3. **Review status:** `docs/tasks/STATUS.md`
4. **Follow rules:** `.agent/rules.md`
5. **Use workflows:** `.agent/workflows/` (start with `/start-session`)

---

## 📊 System Architecture

### Technology Stack
- **Frontend:** React 19.2, Tailwind CSS 4.1, Vite 7.2
- **Backend:** Node.js 20 (Express), SQLite
- **Deployment:** Docker (Alpine Linux)

### Directory Structure
```
Framerr-app/
├── .agent/              # Agent rules and workflows (Git-tracked, Docker-ignored)
├── docs/                # All documentation (Git-tracked, Docker-ignored)
│   ├── tasks/          # Task tracking system
│   ├── architecture/   # System design
│   ├── development/    # Developer guides
│   ├── recovery/       # Historical recovery docs
│   ├── theming/        # Theming system (if added)
│   └── versions/       # Version-specific docs
├── src/                # Frontend source
├── server/             # Backend code
├── public/             # Static assets
├── dist/               # Build output (Git-ignored)
├── Dockerfile          # Production build
├── Dockerfile.dev      # Debug build (with source maps)
└── Standard configs    # package.json, vite.config.js, etc.
```

### Key Files
- **Entry:** `src/main.jsx` → `src/App.jsx`
- **Config:** `vite.config.js`, `tailwind.config.js`
- **Rules:** `.agent/rules/` (git, development, theming)
- **Workflows:** `.agent/workflows/` (7 workflows)
- **Docs:** `docs/CHATFLOW.md` (start here for overview)

---

## ⚠️ Known Issues & Limitations

### Components Needing Review
- `DeveloperSettings.jsx` - Placeholder implementation pending

### v1.0.6 Components
2 components from older version (functional, monitor for differences):
- `SystemStatusWidget.jsx`
- `CalendarWidget.jsx`

### Outstanding Documentation Updates
- `docs/CHATFLOW.md` - Works but references some old paths
- `/build-develop`, `/build-production`, `/recover-session` - Placeholder workflows awaiting user input

---

## 🎯 Current Priorities

See `docs/tasks/TASK_BACKLOG.md` for full list.

### High Priority
1. Define build workflows with user (placeholders exist)
2. Build and test `develop-debug` Docker image
3. Test workflows (`/start-session`, `/checkpoint`, `/end-session`)

### Medium Priority
4. Replace stub components with full implementations
5. Comprehensive widget testing
6. Bundle size optimization

### Low Priority
7. Extended theming documentation
8. Performance profiling
9. Mobile responsive testing

---

## 🔧 Development Workflow

### Session Management
**Always use workflows:**
1. Start: `/start-session`
2. Every 10 tool calls: `/checkpoint`  
3. End: `/end-session`

### Code Changes
**Required process:**
1. View file before editing (Rule 2)
2. Make small, precise edits (Rule 3)
3. Run `npm run build` after changes (Rule 1)
4. Commit if passing (conventional commits)
5. Push to `develop` branch

### Git Safety Rules
**NEVER run:**
- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `git gc`

**See:** `.agent/rules/git-rules.md` for complete list

### Theming Compliance
**Before editing ANY UI component:**
1. Read `.agent/rules/theming-rules.md`
2. Use ONLY theme utility classes
3. Test in Light theme
4. Test with flatten UI enabled
5. NEVER hardcode colors

---

## 📦 Docker Images

### Available Tags
| Tag | Purpose | Size | Build Type |
|-----|---------|------|------------|
| `reconstructed` | Current stable | ~286MB | Production |
| `develop` | Dev testing | ~150MB | Production (not yet rebuilt) |
| `develop-debug` | Debugging | ~250MB | Debug (not yet built) |

### Building Images

**Production:**
```bash
docker build -t pickels23/framerr:develop .
```

**Debug (with source maps):**
```bash
docker build -f Dockerfile.dev -t pickels23/framerr:develop-debug .
```

**See:** `docs/development/DOCKER_BUILDS.md` for details

---

## 📚 Documentation System

### Task Tracking
- **HANDOFF.md** (this file) - Critical context and current state
- **TASK_CURRENT.md** - Active session work tracking
- **STATUS.md** - Overall project dashboard
- **TASK_BACKLOG.md** - Prioritized future work
- **TASK_COMPLETED.md** - Historical accomplishments

### Developer Guides
- **CHATFLOW.md** - Quick start and workflow overview
- **WIDGET_DEVELOPMENT_GUIDE.md** - Create custom widgets
- **LOGGING_REFERENCE.md** - Logging system usage
- **DOCKER_BUILDS.md** - Build types and debugging

### Architecture
- **ARCHITECTURE.md** - File structure, entry points, context hierarchy
- **PROJECT_SCOPE.md** - Vision, features, tech stack

### Recovery Archive
- **docs/recovery/** - Historical v1.1.6 recovery documentation (reference only)

---

## 🛡️ Critical Development Rules

### P0 (BLOCKING - Must Follow)
1. **Always test builds** - Run `npm run build` after code changes
2. **Execute checkpoints** - Every 10 tool calls
3. **Never commit corruption** - Verify file integrity first
4. **Session protocols** - Use `/start-session` and `/end-session`
5. **Git safety** - Follow forbidden command list strictly
6. **Deployment approval** - User must confirm Docker builds
7. **Theming compliance** - Use theme system for all UI

### Workflow Integration
- `/start-session` → Initialize work, read docs, set checkpoint counter
- `/checkpoint` → Every 10 tool calls, verify context alignment
- `/end-session` → Update docs, add session marker, commit summary
- `/code-audit` → Clean up console.*, remove dead code
- `/build-develop` → Deploy to develop (placeholder, needs definition)
- `/build-production` → Production release (placeholder, needs definition)

**See:** `.agent/rules/development-rules.md` for complete rules

---

## 🔄 Version History

### v1.1.6-recovered (Current)
- **Date:** 2025-12-02
- **State:** Fully operational, deployed
- **Recovery:** Successfully rebuilt from Docker extraction + Git recovery
- **Build:** 51 systematic error resolutions
- **Docker:** `pickels23/framerr:reconstructed`

### v1.1.6 (Original - Lost)
- **Date:** Pre-2025-12-01
- **State:** Lost to Git corruption
- **Source:** Recovered 95% from Git blobs

### v1.0.6 (Previous Stable)
- Available as reference in older working directory

---

## 🚨 Important Notes

### Git Corruption Incident
On 2025-12-01, the repository suffered complete corruption. All source code was successfully recovered through:
1. Docker image extraction (backend)
2. Git blob recovery (frontend)
3. Systematic reconstruction

**Result:** Strict Git safety rules now enforced. See `.agent/rules/git-rules.md`.

### Documentation System Evolution
- **v1.0:** Scattered root markdown files
- **v2.0:** Organized `docs/` structure (implemented 2025-12-02)

### Recovery Documentation
Full recovery process documented in `docs/recovery/` for:
- Historical reference
- Evidence of systematic recovery approach
- Future recovery scenarios

**Current development:** Does NOT need to reference recovery docs unless studying the recovery process itself.

---

## 📞 For Questions or Issues

1. **Getting started:** Read `docs/CHATFLOW.md`
2. **Current status:** Check `docs/tasks/STATUS.md`
3. **Active work:** See `docs/tasks/TASK_CURRENT.md`
4. **Rules:** Review `.agent/rules.md`
5. **Stuck?** Ask user for clarification (don't assume)

---

## ✅ Session Handoff Checklist

When starting a new session:
- [ ] Read this HANDOFF.md CRITICAL CONTEXT section
- [ ] Check TASK_CURRENT.md for "SESSION END" marker
- [ ] Review STATUS.md for current state
- [ ] Read applicable rules before coding
- [ ] Use `/start-session` workflow
- [ ] Initialize checkpoint counter to 0

When ending a session:
- [ ] Complete current subtask or reach clean stopping point
- [ ] Run `/end-session` workflow
- [ ] Update TASK_CURRENT.md with session end marker
- [ ] Update this HANDOFF.md if major changes occurred
- [ ] Update STATUS.md timestamp
- [ ] Commit session summary

---

**Next Agent:** Review `docs/tasks/TASK_CURRENT.md` and `docs/tasks/TASK_BACKLOG.md` to decide what to work on next. High priority items are defining build workflows and testing the new workflow system.

**Status:** ✅ Ready for next session
