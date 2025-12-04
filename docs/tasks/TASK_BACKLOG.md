# Task Backlog

**Last Updated:** 2025-12-02  
**Priority System:** 🔴 High | 🟡 Medium | 🟢 Low

---

## 🔴 High Priority

### Complete Documentation System Integration
**Status:** In Progress  
**Owner:** Current session  
**Description:** Finish implementing documentation system v2.0
- [x] Create directory structure
- [x] Migrate rules and workflows
- [x] Create Docker debug build
- [ ] Complete task tracking files
- [ ] Update primary documentation
- [ ] Clean up root directory

**Dependencies:** None  
**Estimated Effort:** 90 tool calls (~80% complete)

---

### Define Build Workflows with User
**Status:** Pending User Collaboration  
**Owner:** Future session  
**Description:** Work with user to complete placeholder workflows
- [ ] `/build-develop` - Dual build (develop + develop-debug)
- [ ] `/build-production` - Version bump, changelog, tag, release
- [ ] `/recover-session` - Emergency recovery procedures

**Dependencies:** Phase 11 of documentation system  
**Estimated Effort:** 1-2 sessions

---

### Build and Test Debug Docker Image
**Status:** Ready to Start  
**Owner:** Future session  
**Description:** Build and verify `develop-debug` image
- [ ] Build image: `docker build -f Dockerfile.dev -t pickels23/framerr:develop-debug .`
- [ ] Test locally with volume mounts
- [ ] Verify source maps in browser DevTools
- [ ] Push to Docker Hub (with user approval)

**Dependencies:** None (Dockerfile.dev created)  
**Estimated Effort:** 10-15 tool calls

---

## 🟡 Medium Priority

### Complete DeveloperSettings Component
**Status:** Not Started  
**Owner:** Unassigned  
**Description:** Replace DeveloperSettings stub with full implementation
- [x] `WidgetErrorBoundary.jsx` - ✅ Completed (full error boundary)
- [x] `EmptyDashboard.jsx` - ✅ Completed (rich placeholder)
- [x] `LoadingSpinner.jsx` - ✅ Completed (animated spinner)
- [x] `ColorPicker.jsx` - ✅ Completed (full color picker with presets)
- [ ] `DeveloperSettings.jsx` - Real developer tools panel

**Dependencies:** None  
**Estimated Effort:** 5-10 tool calls

---

### Comprehensive Widget Testing
**Status:** Not Started  
**Owner:** Unassigned  
**Description:** Test all 13 widgets thoroughly
- [ ] Plex Widget - API integration, media display
- [ ] Sonarr/Radarr Widgets - Upcoming media, calendar
- [ ] Overseerr Widget - Request management
- [ ] QBittorrent Widget - Torrent status
- [ ] Weather Widget - Location, forecasts
- [ ] Calendar Widget - Combined media calendar
- [ ] System Status Widget - CPU, memory, temperature
- [ ] Custom HTML Widget - Iframe embedding
- [ ] Link Grid Widget - Custom links
- [ ] Clock Widget - Time/date display
- [ ] Upcoming Media Widget - Combined upcoming

**Dependencies:** None  
**Estimated Effort:** 40-50 tool calls

---

### Bundle Size Optimization
**Status:** Not Started  
**Owner:** Unassigned  
**Description:** Reduce main bundle size (currently 1,143 KB)
- [ ] Analyze bundle composition
- [ ] Implement code splitting for routes
- [ ] Lazy load heavy dependencies
- [ ] Review and optimize widgets
- [ ] Target: <800 KB main bundle

**Dependencies:** None  
**Estimated Effort:** 15-25 tool calls

---

### Update v1.0.6 Components (If Needed)
**Status:** Monitoring  
**Owner:** Unassigned  
**Description:** Verify SystemStatusWidget and CalendarWidget match v1.1.6
- [ ] Compare with any recovered v1.1.6 versions
- [ ] Check for API changes
- [ ] Update if differences found
- [ ] Test thoroughly

**Dependencies:** None  
**Estimated Effort:** 10-15 tool calls

---

## 🟢 Low Priority

### Extended Theming Documentation
**Status:** Not Started  
**Owner:** Unassigned  
**Description:** Add theming docs to `docs/theming/` if they exist in recovery
- [ ] Check for THEMING_ENGINE.md
- [ ] Check for DEVELOPER_GUIDE.md  
- [ ] Check for CSS_VARIABLES.md
- [ ] Check for COMPONENT_PATTERNS.md
- [ ] Check for MIGRATION_GUIDE.md
- [ ] Move to `docs/theming/` if found

**Dependencies:** None  
**Estimated Effort:** 5-10 tool calls

---

### Performance Profiling
**Status:** Not Started  
**Owner:** Unassigned  
**Description:** Profile application performance
- [ ] React DevTools profiling
- [ ] Lighthouse audits
- [ ] Network performance
- [ ] Rendering optimization opportunities
- [ ] Memory leak detection

**Dependencies:** None  
**Estimated Effort:** 20-30 tool calls

---

### Extended Widget Library
**Status:** Ideas Phase  
**Owner:** Unassigned  
**Description:** Consider additional widgets
- [ ] Tautulli widget (Plex stats)
- [ ] Prowlarr widget (indexer management)
- [ ] Bazarr widget (subtitles)
- [ ] Lidarr widget (music)
- [ ] Readarr widget (books)
- [ ] Custom API widget (generic REST)

**Dependencies:** Core system stable  
**Estimated Effort:** Variable (10-20 tool calls per widget)

---

### API Documentation
**Status:** Not Started  
**Owner:** Unassigned  
**Description:** Document backend API endpoints
- [ ] Create `docs/architecture/API.md`
- [ ] Document all `/api/*` routes
- [ ] Include request/response examples
- [ ] Document authentication
- [ ] Document error codes

**Dependencies:** None  
**Estimated Effort:** 30-40 tool calls

---

### Mobile Responsive Testing
**Status:** Not Started  
**Owner:** Unassigned  
**Description:** Thoroughly test mobile layouts
- [ ] Test on actual mobile devices
- [ ] Verify mobile layout algorithm
- [ ] Test widget touch interactions
- [ ] Verify sidebar mobile behavior
- [ ] Document mobile-specific features

**Dependencies:** None  
**Estimated Effort:** 15-25 tool calls

---

## 🎯 Future Considerations

### v1.2.0 Planning
- Custom theming enhancements
- Additional integrations
- Performance improvements
- Enhanced widget system
- Plugin architecture?

### Infrastructure
- CI/CD pipeline setup
- Automated testing
- Docker Compose examples
- Kubernetes manifests

### Community
- Public Docker Hub documentation
- GitHub repository setup
- Contribution guidelines
- Issue templates

---

## Completed Items

See `TASK_COMPLETED.md` for historical work including:
- ✅ v1.1.6 Source Code Recovery
- ✅ Systematic Build Error Resolution (51 errors)
- ✅ Docker Image Deployment
- ✅ Documentation System v2.0 (In Progress)

---

**To add items to backlog:** Update this file and commit with `chore: update task backlog`  
**To start work:** Move item to `TASK_CURRENT.md` and update status to "In Progress"  
**To complete:** Move completed summary to `TASK_COMPLETED.md`
