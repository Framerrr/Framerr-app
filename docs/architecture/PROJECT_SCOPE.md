# 🎯 PROJECT SCOPE - Framerr

**Vision:** A premium, customizable dashboard application inspired by Organizr, with modern design, powerful widgets, and comprehensive user management.

**Target Platform:** Self-hosted (Docker/Unraid)  
**Technology:** React + Node.js/Express + SQLite

---

## 📖 Overview

Framerr is a next-generation dashboard application that combines:
- **Dashboard Management:** Customizable grid layout with draggable/resizable widgets
- **Tab System:** Organizr-style iframe tabs for quick access to services
- **Widget System:** Pre-built integrations (Plex, Sonarr, Radarr, Overseerr, etc.)
- **User Management:** Multi-user support with permission groups
- **Customization:** Themes, colors, icons, layout control
- **Premium Design:** Modern glassmorphism, animations, responsive UI

---

## 🎨 Design Philosophy

1. **Premium First:** Every UI element should feel polished and modern
2. **User Control:** Maximum customization without complexity
3. **Performance:** Fast, responsive, optimized
4. **Self-Hosted:** No cloud dependencies, complete privacy
5. **Docker-Friendly:** Easy deployment on Unraid and similar platforms

---

## 🏗️ Architecture

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router
- **State:** React Context API
-  **Grid:** react-grid-layout
- **Styling:** CSS with theme system

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (Sequelize ORM)
- **Auth:** Session-based with bcrypt
- **File Upload:** Multer

### Deployment
- **Container:** Docker (multi-stage build)
- **Platform:** Unraid-optimized
- **Volumes:** Persistent data in `/config`
- **Permissions:** PUID/PGID support

---

## ✨ Core Features

### 1. Dashboard System
- Drag-and-drop widget placement
- Resize widgets
- Save layouts per user
- Multiple widget types
- Edit mode / View mode
- Empty state with quick setup

### 2. Widget System (13 Widgets)
- **Plex:** Session monitoring, media info, playback control
- **Calendar:** Upcoming events
- **Links:** Quick links with icons
- **Weather:** Current conditions
- **System Status:** Server health monitoring
- **QBittorrent:** Torrent management
- **Radarr:** Movie library
- **Sonarr:** TV library
- **Overseerr:** Media requests
- And more...

### 3. Tab System
- Create custom tabs
- Organize into groups
- Icon customization
- Iframe embedding
- Quick access navigation

### 4. User Management
- Multi-user support
- Permission groups
- Individual user settings
- Profile customization
- Avatar uploads

### 5. Customization
- 5 Built-in themes
- Custom color picker
- Favicon upload
- Application name
- Greeting messages
- Tab icons
- Widget icons

### 6. Premium Design
- Glassmorphism effects
- Smooth animations
- Hover interactions
- Responsive layout
- Dark mode optimized
- Mobile-friendly

---

## 🔌 Integrations

### Current Integrations
- Plex Media Server
- Sonarr (TV)
- Radarr (Movies)
- Overseerr (Requests)
- QBittorrent
- Weather API
- Calendar services
- System monitoring

### Integration Architecture
- Backend proxy for security
- Per-widget configuration
- Token/API key storage
- HTTPS support
- Self-signed certificate handling

---

## 👥 User Roles & Permissions

### Permission Groups
- **Admin:** Full access
- **User:** Standard access
- **Guest:** Limited access
- **Custom:** Configurable permissions

### Permissions
- View tabs
- Edit tabs
- Manage users
- Change settings
- Configure widgets
- Access admin features

---

## 🎨 Theme System

### Built-in Themes
1. **Default:** Clean, modern blue
2. **Dracula:** Popular dark theme
3. **Nord:** Cool, minimalist
4. **Gruvbox:** Warm, retro
5. **Catppuccin:** Pastel, soothing

### Theme Features
- CSS variable-based
- Hot-swappable
- Custom color overrides
- Persistent per user
- Premium design variables

---

## 📦 Data Structure

### Key Models
- **User:** Accounts and profiles
- **Widget:** Dashboard widgets with config
- **Tab:** User tabs and iframe content
- **TabGroup:** Tab organization
- **PermissionGroup:** Role definitions
- **UserConfig:** Per-user settings
- **SystemConfig:** Global settings

### Data Persistence
- SQLite database in `/config`
- File uploads in `/config/uploads`
- Favicon in `/config/favicon`
- Logs in `/config/logs` (planned)
- Backups in `/config/backups` (planned)

---

## 🚀 Deployment

### Docker Image
- Multi-stage build
- Alpine Linux base
- Non-root user
- PUID/PGID mapping
- Health checks
- Restart policies

### Volume Mounts
```yaml
volumes:
  - /path/to/config:/config
```

### Environment Variables
- `PUID` - User ID
- `PGID` - Group ID
- `TZ` - Timezone
- `NODE_ENV` - Environment

---

## 📊 Current Status

**Phase:** 8 - Polish & Enhancement  
**Completion:** ~95%  
**Production Ready:** Yes (core features)  

**What's Complete:**
- ✅ All 7 core phases
- ✅ 13 functional widgets
- ✅ Premium design system
- ✅ User management
- ✅ Tab system
- ✅ Customization
- ✅ Docker deployment

**What's Next (Phase 8):**
- Bug fixes (Calendar, Links)
- UI enhancements (Profile icon, widget icons)
- New features (Speed test, backup, logs, images, notifications)
- Code cleanup

---

## 🎯 Success Criteria

### Must Have
- [x] Multi-user support
- [x] Permission system
- [x] Dashboard with widgets
- [x] Tab system
- [x] Theme customization
- [x] Docker deployment
- [x] Mobile responsive

### Should Have
- [x] Premium design
- [x] Widget integrations
- [x] User profiles
- [x] Icon customization
- [ ] Backup/restore (Phase 8)
- [ ] Logs UI (Phase 8)

### Nice to Have
- [ ] Speed test
- [ ] Image manager
- [ ] Notification system
- [ ] Advanced analytics
- [ ] Plugin system

---

## 🔮 Future Vision

### Post-1.0 Ideas
- Plugin API for custom widgets
- Marketplace for themes/widgets
- Mobile app
- Widget sharing
- Advanced analytics
- Multi-server support
- SSO integration
- Webhook system

---

## 📚 Documentation

### For Users
- README.md (deployment guide)
- Settings documentation
- Widget configuration guides
- Theme customization

### For Developers
- ARCHITECTURE.md (code structure)
- EXECUTION_RULES.md (development rules)
- API documentation
- Component patterns

---

## 🤝 Contribution Guidelines

### Code Standards
- Follow existing patterns
- Test thoroughly
- Document changes
- Use conventional commits
- Check for file corruption
- Update relevant docs

### Review Process
1. Read CHATFLOW.md
2. Read EXECUTION_RULES.md
3. Check TASK_BACKLOG.md
4. Make changes incrementally
5. Test after each change
6. Update TASK_CURRENT.md
7. Get user approval

---

## 📝 License & Credits

**License:** (To be determined)  
**Author:** Jonathan  
**Built With:** React, Node.js, Express, SQLite, Vite

**Inspired By:** Organizr, Heimdall, Homer

---

**Links:**
- [docs/workflows/CHATFLOW.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/docs/workflows/CHATFLOW.md) - Start here
- [docs/architecture/ARCHITECTURE.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/docs/architecture/ARCHITECTURE.md) - Code structure
- [docs/tasks/HANDOFF.md](file:///c:/Users/Jonathan/Documents/Antigravity/Developer/dashboard2/docs/tasks/HANDOFF.md) - Current progress
