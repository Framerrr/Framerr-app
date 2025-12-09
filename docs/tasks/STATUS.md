# Framerr Development Status

**Last Updated:** 2025-12-08 20:06:00  
**Current Version:** v1.1.7  
**Development Branch:** `feat/iframe-auth-detection`  
**Production Branch:** `main`  
**Production Docker:** `pickels23/framerr:1.1.7` and `:latest`  
**Development Docker:** `pickels23/framerr:develop`

---

## 🎯 Current Phase

**Phase 17:** OAuth Auto-Close Auth Tab (In Progress) 🔄

**Status:** OAuth flow working, auto-close working, tab restoration broken

---

## 📊 Quick Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Backend** | ✅ Complete | 2,081 files from v1.1.6 Docker image |
| **Frontend** | ✅ Operational | All mobile UX improvements deployed |
| **Iframe Auth** | ⚠️ Partial | Manual flow working, auto-detect blocked |
| **Docker Production** | ✅ Live | `pickels23/framerr:1.1.7` and `:latest` |
| **Docker Development** | ✅ Available | `pickels23/framerr:develop` |
| **Documentation** | ✅ Complete | Full v2.0 system + iframe auth summary |
| **Workflows** | ✅ Active | 8 workflows operational |
| **Git Safety** | ✅ Enforced | Strict rules after corruption incident |
| **Mobile UX** | ✅ Enhanced | Touch drag, auto-updates, fixed header |
| **React Security** | ✅ Patched | React 19.2.1 (CVE-2025-12-03) |

---

## 🚀 Recent Accomplishments

### OAuth Auto-Close Auth Tab (Dec 8, 2025) - IN PROGRESS 🔄
- ✅ **OAuth Provider Setup:**
  - Created Authentik OAuth2/OpenID provider
  - Client ID configured
  - Redirect URI: `https://server-nebula.com/login-complete`
- ✅ **Callback Page:**
  - Created `/login-complete.html` with postMessage
  - Beautiful success animation
  - Auto-close tab functionality
  - State parameter parsing for tab restoration
- ✅ **OAuth Flow:**
  - Proper OAuth authorize URL with state parameter
  - postMessage communication working
  - Tab auto-closes after login
- ⚠️ **Tab Restoration (BLOCKED):**
  - Hash navigation not working
  - Always goes to dashboard instead of correct tab
  - Need to debug `window.location.hash` issue
- 📝 3 commits, ~90 tool calls
- 🐳 Docker image: `pickels23/framerr:develop` (digest: sha256:2dfdd1b...)

### Iframe Authentication (Dec 8, 2025) - PARTIAL ⚠️
- ✅ **Manual Auth Flow:**
  - Lock button (🔒) in tab toolbar
  - Opens auth in new tab (bypass iframe restrictions)
  - Auto-reload after tab closure
  - Auto-refocus to Framerr
  - Supports passkeys, OAuth, SAML
- ✅ **Settings UI:**
  - Enable/disable configuration
  - Sensitivity levels
  - Custom URL patterns
- ⚠️ **Auto-Detection:**
  - Blocked by Same-Origin Policy
  - Cannot read cross-origin iframe navigation
  - Documented in `iframe_auth_summary.md`
- 📝 5 commits, ~350 tool calls
- 🐳 Docker image: `pickels23/framerr:develop`

### v1.1.7 Production Release (Dec 8, 2025) - COMPLETE ✅
- ✅ **Mobile Bug Fixes:**
  - Customizable app icon in sidebar/mobile menu
  - Real-time tab updates (no page refresh)
  - Touch drag-and-drop for tab/group reordering
  - Fixed mobile menu header (stays at top)
- ✅ **UX Improvements:**
  - No text selection during drag
  - Smooth drag performance (no jitter)
  - Optimized touch timing (150ms delay, 5px tolerance)
  - Auto-refresh on icon/name changes
- ✅ **Security:** React 19.2.1 update
- ✅ **Cleanup:** Removed deprecated TabsSettings.jsx
- 📝 11 commits, ~356 tool calls
- 🐳 Docker images pushed to Hub
- 🏷️ Git tag `v1.1.7` created and pushed

### Documentation System v2.0 (Dec 2, 2025) - COMPLETE ✅
- ✅ Created `docs/` structure with 6 subdirectories
- ✅ Archived 15 recovery documentation files
- ✅ Consolidated rules system (git, development, theming)
- ✅ Created 8 workflows
- ✅ `Dockerfile.dev` for debug builds

---

## 🔄 Active Work

**Current Task:** OAuth auto-close auth tab - debugging tab restoration  
**Branch:** `feat/iframe-auth-detection`  
**Status:** OAuth flow working, tab restoration broken  

**Next Steps:**
1. Debug why `window.location.hash = '#radarr'` goes to dashboard
2. Check if handleAuthComplete is interfering
3. Test different navigation approaches
4. Verify postMessage is being received with correct tab data

**Clean State:** ✅ Uncommitted changes reverted, ready for next session

---

## 🐛 Known Issues

None reported for v1.1.7

---

## 📦 Deployment Status

### Docker Images
- **Production:** `pickels23/framerr:1.1.7` and `:latest`
  - Size: ~286 MB
  - Status: Deployed and live
  - Last pushed: 2025-12-08
  - Features: Mobile UX improvements, React 19.2.1

### Git Status
- **Branch:** `main`
- **Tag:** `v1.1.7`
- **Status:** Clean, all changes committed and pushed
- **Latest commit:** 1e41fc0 (chore: bump version to 1.1.7)

---

## 📋 Backlog Overview

See `TASK_BACKLOG.md` for details.

**High Priority:**
- Test v1.1.7 mobile improvements in production
- User feedback collection
- Resume gridstack work (on develop branch)

**Medium Priority:**
- Bundle size optimization
- Performance profiling
- Extended widget library

**Low Priority:**
- Additional theming options
- More mobile UX refinements

---

## 🎓 For New Agents

1. **Start here:** Read `docs/CHATFLOW.md`
2. **Critical context:** Read `docs/tasks/HANDOFF.md`
3. **Current work:** Check `docs/tasks/TASK_CURRENT.md`
4. **Rules:** Review `.agent/rules.md` and `.agent/rules/*.md`
5. **Workflows:** Available in `.agent/workflows/`

---

## 📊 Metrics

**Version:** v1.1.7  
**Lines of Code:** ~50,000+ (estimated)  
**Components:** 46 files  
**Build Size:** 1.20 MB (15 files)  
**Backend Files:** 2,081  
**Documentation Files:** 40+  
**Production Releases:** 2 (v1.1.6-recovered, v1.1.7)

---

**For detailed task tracking, see `TASK_CURRENT.md`  
For historical work, see `TASK_COMPLETED.md`**
