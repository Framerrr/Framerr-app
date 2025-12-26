# Task Backlog

**Priority:** 🔴 High | 🟡 Medium | 🟢 Low  
**Last Updated:** 2025-12-26

---

## 🔴 High Priority

### Security: Integration Proxy Architecture
- [ ] Refactor integration API calls to route through backend
- [ ] Users should USE integrations without SEEING credentials
- [ ] Current issue: `/api/integrations/shared` exposes apiKey, token, password
- [ ] Widgets call backend → backend calls external service with credentials
- **Priority:** P1 Security

### ~~Bug: Popovers Activating in Edit Mode~~ ✅
- [x] Widget popovers should not activate when dashboard is in edit mode
- ~~Affects: Sonarr, Radarr, qBittorrent, Calendar widgets~~ + System Status

### ~~Navigation Improvements (Mobile)~~ ✅
- [x] Dashboard button press → scroll to top if already on dashboard
- [x] Tapping safe area top → scroll to top of page

---

## 🟡 Medium Priority

### ~~Dashboard Template Engine~~ ✅ (v1.4.0)
- [x] Admin creates skeleton dashboard layouts
- [x] Cool/professional UI for template creation
- [x] Templates can be assigned to users
- [x] Admins can use templates themselves
- [x] Template activation applies layout to user dashboard

### ~~Integrations Settings Tab Reorder~~ ✅
- [x] Widget Gallery
- [x] Active Widgets
- [x] Service Settings
- [x] Dashboard
- [x] Shared Widgets
- [x] My Linked Accounts

### ~~User Management Responsive Fix~~ ✅
- [x] CRUD table should squish more before horizontal scroll kicks in

### ~~Overseerr + Radarr/Sonarr Webhook Integration~~ ✅
- [x] Show download progress in Overseerr widget
- [x] Use webhooks from Radarr/Sonarr to track status

### ~~Modal Layout Consistency~~ ✅
- [x] Spacing consistency across modals
- [x] Indentation consistency
- [x] Wording/copy consistency

### ~~Link Grid Widget Refinements~~ ✅
- [x] Spacing refinements

### Widget Minimum Sizing Audit
- [ ] Determine best minimum sizes per widget type
- [ ] Document sizing rationale

---

## 🟢 Low Priority

### Extended Widget Library
- Tautulli, Prowlarr, Bazarr, Lidarr, Readarr

### API Documentation
- Document all `/api/*` endpoints

### Mobile Responsive Testing
- Thorough mobile layout testing

### Theming - Login/Setup/Loading States
- Login page theming refinements
- Setup page theming refinements
- Page loading states theming (spinners, skeletons)

### Download Progress Websockets
- Overseerr/Radarr/Sonarr websocket integration
- Real-time download progress in widgets
- Live status updates without polling

---

## 🔮 Future Ideas

### New Widget Brainstorming
- [ ] Research and identify new useful widgets
- [ ] Community requests review

### New Feature Brainstorming
- [ ] UX improvements
- [ ] Power user features
- [ ] Mobile-specific enhancements
