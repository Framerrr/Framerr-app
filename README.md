# Framerr v1.1.6

**Modern, self-hosted homelab dashboard** - Clean alternative to Organizr with powerful iframe tab system and customizable homelab widgets.

[![Docker Pulls](https://img.shields.io/docker/pulls/pickels23/framerr)](https://hub.docker.com/r/pickels23/framerr)
[![Docker Image Size](https://img.shields.io/docker/image-size/pickels23/framerr/latest)](https://hub.docker.com/r/pickels23/framerr)
[![License](https://img.shields.io/github/license/pickels23/framerr)](LICENSE)

---

## ✨ Features

### 🖼️ Iframe Tab System
- Embed any web application as a tab
- Persistent sessions across navigation
- Customizable tab icons and names
- Tab groups for organization

### 📊 Homelab Widgets
- **Media Server:** Plex, Sonarr, Radarr, Overseerr
- **Downloads:** qBittorrent status and management  
- **System:** CPU, Memory, Temperature monitoring
- **Utilities:** Weather, Clock, Calendar
- **Custom:** HTML/iframe widgets, Link grids

### 🎨 Theming  
- Light and Dark modes
- Multiple pre-built themes
- Custom color system
- Glassmorphism effects
- Flatten UI option

### 👥 Multi-User
- User authentication and management  
- Role-based access control (Admin/User)
- Per-user settings and customization

### 📱 Responsive Design
- Mobile-optimized layouts
- Touch-friendly widget interactions
- Adaptive navigation

---

## 🚀 Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name framerr \
  -p 3001:3001 \
  -v /path/to/config:/config \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TZ=America/New_York \
  pickels23/framerr:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  framerr:
    image: pickels23/framerr:latest
    container_name: framerr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - /path/to/config:/config
    ports:
      - 3001:3001
    restart: unless-stopped
```

### First Run

1. Navigate to `http://localhost:3001`
2. Complete the setup wizard
3. Create your admin account  
4. Start adding widgets and tabs!

---

## 📚 Documentation

**New to Framerr?** Start here: [`docs/CHATFLOW.md`](docs/CHATFLOW.md)

### Quick Links
- **[Project Overview](docs/architecture/PROJECT_SCOPE.md)** - Vision and features
- **[Architecture](docs/architecture/ARCHITECTURE.md)** - System design
- **[Widget Development](docs/development/WIDGET_DEVELOPMENT_GUIDE.md)** - Create custom widgets
- **[Docker Builds](docs/development/DOCKER_BUILDS.md)** - Production vs Debug builds
- **[Task Status](docs/tasks/STATUS.md)** - Current development status

### For Developers
- **Rules:** `.agent/rules.md` - Development standards
- **Workflows:** `.agent/workflows/` - Automated procedures
- **Logging:** `docs/development/LOGGING_REFERENCE.md`

---

## 🛠️ Technology Stack

**Frontend:**
- React 19.2
- React Router 7.9
- Tailwind CSS 4.1
- Vite 7.2
- DnD Kit (drag and drop)

**Backend:**
- Node.js 20
- Express
- SQLite

**Deployment:**
- Docker (Alpine Linux)
- Multi-stage builds
- PUID/PGID support

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Application port |
| `PUID` | `99` | User ID for file permissions |
| `PGID` | `100` | Group ID for file permissions |
| `TZ` | `UTC` | Timezone |
| `DATA_DIR` | `/config` | Configuration directory |
| `NODE_ENV` | `production` | Environment mode |

### Volumes

| Path | Purpose |
|------|---------|
| `/config` | User data, settings, database |

---

## 📦 Available Docker Images

| Tag | Purpose | Size | Use Case |
|-----|---------|------|----------|
| `latest` | Latest stable | ~150MB | Production |
| `1.1.6-recovered` | Current version | ~150MB | Stable release |
| `develop` | Development build | ~150MB | Testing |
| `develop-debug` | Debug build | ~250MB | Debugging with source maps |

---

## 🤝 Contributing

We welcome contributions! Please see our development documentation in `docs/development/`.

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Build for production: `npm run build`

### Development Workflow

- Follow the rules in `.agent/rules/development-rules.md`
- Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Test builds before committing
- Read theming rules before editing UI components

---

## 📋 Roadmap

See [`docs/tasks/TASK_BACKLOG.md`](docs/tasks/TASK_BACKLOG.md) for upcoming features.

**High Priority:**
- Enhanced widget system
- Additional integrations (Tautulli, Prowlarr, etc.)
- Performance optimizations

**Under Consideration:**
- Plugin architecture
- Mobile apps
- Kubernetes support

---

## 🐛 Known Issues

See [`docs/tasks/STATUS.md`](docs/tasks/STATUS.md#-known-issues) for current known issues.

**Minor:**
- 5 stub components may need refinement
- 2 widgets from v1.0.6 (functional, may have minor differences)

---

## 📜 License

[Your License Here]

---

## 🙏 Acknowledgments

Built for the homelab community with features inspired by Organizr and Homarr.

Special thanks to the recovery effort - this project was rebuilt from scratch after repository corruption!

---

## 📞 Support

- **Documentation:** `docs/CHATFLOW.md`
- **Issues:** GitHub Issues
- **Docker Hub:** [pickels23/framerr](https://hub.docker.com/r/pickels23/framerr)

---

**Framerr** - Your homelab, beautifully organized.
