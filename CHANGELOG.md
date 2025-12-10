# Changelog

All notable changes to Framerr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.8] - 2025-12-10

### Added
- **Complete Theming System:**
  - 5 built-in themes: Dark Pro, Nord, Catppuccin, Dracula, and Light
  - 71 CSS variables for complete theme customization
  - Theme utility classes (`.bg-theme-primary`, `.text-theme-secondary`, etc.)
  - Glassmorphism effects with `.glass-card` and `.glass-subtle` classes
  - Flatten UI mode to disable glassmorphism globally or per-widget
  - Custom color picker support for all theme variables
  - WCAG AA accessibility compliance across all themes
- **Developer Workflows:**
  - `/start-session`, `/end-session`, `/checkpoint` workflows
  - `/code-audit`, `/build-develop`, `/build-production` workflows
  - Comprehensive theming rules and documentation
- **UI Enhancements:**
  - Sidebar theming with smooth animations
  - IconPicker improvements using Radix UI Popover
  - Sliding indicators for settings sub-tabs
  - Enhanced modal animations (spring physics)
  - Animation test page for UI library integration

### Fixed
- **Critical Fixes:**
  - Permission system default groups missing permissions arrays
  - Auto-migration for existing installations with incomplete permissions
  - Logger browser compatibility (`process is not defined` error)
  - Auth proxy settings now take effect immediately without server restart
  - Session persistence when switching from proxy to local auth
- **Bug Fixes:**
  - Removed buggy Gridstack implementation (reverted to react-grid-layout)
  - Dashboard grid behavior now consistent with working version
  - Debug overlay restored to functional state
  - Code audit cleanup (console.log → logger.debug)

### Changed
- **Theming Migration:**
  - Sidebar migrated to theme utility classes (selective hardcoded colors kept per design)
  - Settings pages updated with consistent glassmorphism
  - All UI components now use theme system (with documented exceptions)
- **Code Quality:**
  - Removed dead code and unused imports
  - Converted console statements to structured logging
  - Cleaned up deprecated authentication code
  - Improved error handling and logging throughout

### Documentation
- Comprehensive theming documentation (`docs/theming/`)
  - THEMING_ENGINE.md - Architecture and extensibility guide
  - DEVELOPER_GUIDE.md - Quick start for developers
  - CSS_VARIABLES.md - Complete variable reference (71 variables)
  - COMPONENT_PATTERNS.md - Copy-paste component examples
- Animation sources documentation for UI library integration
- Updated development rules and Git workflows
- Session tracking improvements in HANDOFF.md and TASK_CURRENT.md

### Technical
- Merged `feat/iframe-auth-detection` branch to `develop` (110+ commits)
- Removed buggy Gridstack files: `gridConfig.js`, `GridstackWrapper.jsx`
- Restored working react-grid-layout implementation
- Build verification passing throughout development
- Squash merge to main for clean production history

---

## [1.1.7] - 2025-12-08

### Added
- **Mobile Responsiveness Improvements:**
  - Customizable application icon in sidebar and mobile menu
  - Real-time tab updates in sidebar without page refresh
  - Touch drag-and-drop support for tab and group reordering
  - Fixed mobile menu header (stays at top, doesn't scroll)

### Fixed
- **Mobile UX Enhancements:**
  - Eliminated text selection during drag operations on mobile
  - Removed drag stickiness/jitter for smooth touch interactions
  - Optimized touch sensor timing (150ms delay, 5px tolerance)
  - Auto-refresh sidebar when application name/icon changes

### Changed
- **Security:** Updated React to 19.2.1 (security patch for Server Components)
- **Cleanup:** Removed deprecated `TabsSettings.jsx` component

### Technical
- Added `TouchSensor` to @dnd-kit for mobile drag-and-drop
- Implemented event-based system for real-time UI updates (`tabsUpdated`, `systemConfigUpdated`)
- Disabled CSS transitions during drag for smoother mobile performance
- Added GPU acceleration hints (`willChange: transform`)

---

## [1.1.6-recovered] - 2025-12-02

### Recovery
This version represents the successful recovery of Framerr v1.1.6 after complete source code loss due to Git repository corruption. The application was reconstructed from:
- Docker image extraction (complete backend)
- Git blob recovery (frontend source files)
- Systematic build error resolution

### Added
- Complete backend (2,081 files) from v1.1.6 Docker image
- 95% of frontend recovered from Git blobs
- Stub components for missing files:
  - `WidgetErrorBoundary` - Basic error boundary
  - `EmptyDashboard` - Simple placeholder
  - `LoadingSpinner` - Basic spinner
  - `ColorPicker` - Simple color input
  - `DeveloperSettings` - Placeholder

### Fixed
- 51 build errors resolved systematically
- Binary corruption in CalendarWidget (267 lines removed)
- Logger module converted from CommonJS to ES6
- AppDataContext export for hook compatibility
- Missing isAdmin function added

### Documentation
- Comprehensive recovery documentation archived in `docs/recovery/`
- CHATFLOW.md documenting recovery journey
- Complete file inventories (js-inventory.csv, jsx-inventory.csv)

### Docker
- Image: `pickels23/framerr:reconstructed`
- Size: 286 MB
- Status: Fully operational
- Tested and deployed successfully

---

## [1.1.6] - 2025-12-02 (Documentation System v2.0)

### Added
- **Documentation System:** Complete restructuring
  - `docs/` directory with 6 organized subdirectories
  - Task tracking system (HANDOFF, TASK_CURRENT, STATUS, BACKLOG, COMPLETED)
  - Architecture documentation organization
  - Development guides consolidation
  
- **Rules System:** Consolidated agent rules
  - ``.agent/rules/git-rules.md`` - Git safety (after corruption incident)
  - ``.agent/rules/development-rules.md`` - Development standards
  - ``.agent/rules/theming-rules.md`` - UI theming compliance
  - ``.agent/rules.md`` - Unified quick reference

- **Workflow Automation:** 7 workflows created
  - `/start-session` - Session initialization  
  - `/end-session` - Session handoff
  - `/checkpoint` - Context maintenance (every 10 tool calls)
  - `/code-audit` - Code quality cleanup
  - `/git-workflow` - Git operations guide
  - `/build-develop`, `/build-production`, `/recover-session` - Placeholders

- **Docker Debug Build:**
  - `Dockerfile.dev` - Development build with source maps
  - Updated `vite.config.js` for conditional source maps and minification
  - `docs/development/DOCKER_BUILDS.md` - Build documentation
  - Enables debugging in browser DevTools with original source code

### Changed
- `.dockerignore` updated to exclude documentation from images
- Documentation moved from root to organized `docs/` structure
- Recovery documentation archived to `docs/recovery/`

### Documentation
- Professional README.md with quick start and features
- CHANGELOG.md (this file)
- Comprehensive task tracking system
- Cross-referenced documentation structure
- Developer guides organized in `docs/development/`
- Architecture docs in `docs/architecture/`

---

## Version History

### Pre-Recovery Timeline
- **v1.1.6** - Last stable version before corruption
- **v1.0.6** - Previous stable (still available as reference)

### Recovery Timeline
- **2025-12-01 19:20** - Git corruption discovered
- **2025-12-01 22:37** - Recovery attempts begin  
- **2025-12-02 05:37** - Active reconstruction session
- **2025-12-02 15:27** - Reconstruction complete, image deployed
- **2025-12-02 15:51** - Documentation system v2.0 implementation begins

---

## Future Versions

See `docs/tasks/TASK_BACKLOG.md` for planned features and improvements.

**Upcoming:**
- v1.2.0 - Enhanced widget system, additional integrations
- Build workflow automation
- Performance optimizations
- Bundle size reduction

---

## Notes

### On Version Numbering
- Versions follow Semantic Versioning (MAJOR.MINOR.PATCH)
- `-recovered` suffix indicates reconstruction from corrupted repository
- Development tags: `develop`, `develop-debug`

### On Recovery
The recovery process is fully documented in `docs/recovery/` for historical reference and as evidence that comprehensive code recovery is possible with systematic approaches.

---

**For detailed task tracking and current development status, see `docs/tasks/STATUS.md`**
