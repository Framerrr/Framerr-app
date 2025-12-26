# Task Backlog

**Priority:** 🔴 High | 🟡 Medium | 🟢 Low  
**Last Updated:** 2025-12-26

---

## 🔴 High Priority

### 1. Security: Integration Proxy Architecture
- [ ] Refactor integration API calls to route through backend
- [ ] Users should USE integrations without SEEING credentials
- [ ] Current issue: `/api/integrations/shared` exposes apiKey, token, password
- [ ] Widgets call backend → backend calls external service with credentials
- **Priority:** P1 Security - NEXT UP

### 2. Dashboard Undo/Redo System
- [ ] Port undo/redo functionality from Template Builder to main Dashboard
- [ ] Track widget add/remove/move/resize operations
- [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- [ ] Visual undo/redo buttons in edit mode toolbar
- [ ] History limit (e.g., last 50 operations)
- **Priority:** P2 UX - After Integration Proxy

### 3. Overseerr Download Progress Integration
- [ ] Show real-time download progress in Overseerr widget
- [ ] Integrate with Radarr/Sonarr APIs for download status
- [ ] Progress bars for active downloads
- [ ] ETA and speed indicators
- **Priority:** P3 Feature - After Undo/Redo

### ~~Bug: Popovers Activating in Edit Mode~~ ✅
- [x] Widget popovers should not activate when dashboard is in edit mode

### ~~Navigation Improvements (Mobile)~~ ✅
- [x] Dashboard button press → scroll to top if already on dashboard
- [x] Tapping safe area top → scroll to top of page

---

## 🟡 Medium Priority

### ~~Dashboard Template Engine~~ ✅ (v1.4.0)
- [x] Admin creates skeleton dashboard layouts
- [x] Templates can be assigned to users
- [x] Template activation applies layout to user dashboard

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

## 🔮 Far-Off Development

Large features for future consideration:

### Multi-Dashboard Tabs
- Multiple dashboards per user (Media, System, Home Automation)
- Quick-switch via swipe or tabs
- Each dashboard has own layout and widgets

### Dashboard Sharing / Export
- Export dashboard as shareable config
- Import dashboards from others
- Community sharing

### Scheduled Dashboard Views
- Auto-switch layout based on time of day
- Morning: Weather, Calendar / Evening: Media widgets
- User-configurable schedules

### Command Center / Quick Actions
- Floating action button or swipe-up panel
- "Request movie", "Pause downloads", "Scan library"
- User-configurable quick actions

### Widget Alerts & Notification Rules
- "Alert me when disk usage > 90%"
- "Notify when download completes"
- Visual indicators on widgets

### Home Automation Integration
- Home Assistant widget
- IoT device status
- Scene activation ("Movie Mode")

### Activity Feed Widget
- Unified activity stream
- Downloads, new media, requests
- Chronological/filterable view

### User Analytics Dashboard (Admin)
- Widget usage analytics
- Template popularity
- Login activity tracking

### Widget Grouping / Folders
- Collapsible widget groups
- "Media" folder expands to show Plex/Sonarr/Radarr
- Clean up cluttered dashboards

### Public/Guest Mode Dashboard
- Read-only unauthenticated view
- Status page / "now playing" display

### Plugin/Extension System
- Custom widget development spec
- Load widgets from folder
- Community plugin repository

### Backup & Disaster Recovery
- Scheduled automatic backups
- One-click restore points
- Export/import entire Framerr config

### AI-Powered Features
- Natural language queries
- Smart suggestions
- Auto-arrange based on usage patterns
