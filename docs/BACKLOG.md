# Framerr Feature Backlog

## Future Releases

### WebSocket Real-Time Progress (v1.3.0+)
**Priority:** Medium  
**Complexity:** 4-6 hours

Add WebSocket support for real-time progress updates:
- Overseerr download progress (via Radarr/Sonarr queue)
- qBittorrent download progress
- Plex "Now Playing" percentage

**Architecture:** Single WebSocket hub from Framerr server that aggregates data from external services.

---

### iOS-Style Notification Grouping (v1.3.0+)
**Priority:** Medium  
**Complexity:** 8-12 hours

Group notifications by service (Sonarr, Radarr, Overseerr) with collapse/expand:
- Collapsed headers show count
- Tap to expand group
- Smooth expand/collapse animations
- Swipe to dismiss individual items

**See also:** Session notes from 2025-12-19 for design discussion.
