# Web Push Notification System

> Last Updated: 2025-12-15

## Overview

Framerr supports Web Push notifications that work across all modern browsers including Chrome, Firefox, Safari (macOS/iOS), and Edge. The system uses VAPID (Voluntary Application Server Identification) for authentication.

## Architecture

```
┌─────────────┐     ┌───────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  Framerr API  │────▶│  Push Service   │
│  (Browser)  │◀────│   (Node.js)   │◀────│ (FCM/APNs/etc)  │
└─────────────┘     └───────────────┘     └─────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌───────────────┐
│   Service   │     │   SQLite DB   │
│   Worker    │     │ (subscriptions)│
└─────────────┘     └───────────────┘
```

## Key Components

### Frontend

| File | Purpose |
|------|---------|
| `src/context/NotificationContext.jsx` | Push subscription management, SSE connection |
| `src/components/settings/NotificationSettings.jsx` | User-facing push settings UI |
| `public/sw.js` | Service Worker - handles incoming push events |
| `public/manifest.json` | PWA manifest with icons |
| `index.html` | PWA meta tags for iOS |

### Backend

| File | Purpose |
|------|---------|
| `server/services/notificationEmitter.js` | Core notification routing (SSE + Web Push) |
| `server/routes/notifications.js` | Push subscription API endpoints |
| `server/db/pushSubscriptions.js` | SQLite storage for subscriptions |
| `server/db/systemConfig.js` | VAPID keys storage |

## How It Works

### 1. VAPID Key Generation
- On first startup, server generates VAPID key pair
- Stored in SQLite `system_config` table
- Public key served via `/api/notifications/push/vapid-key`

### 2. Subscription Flow
1. User clicks "Enable" button in Settings
2. Browser prompts for notification permission
3. Browser creates push subscription with VAPID public key
4. Subscription sent to `/api/notifications/push/subscribe`
5. Server stores in `push_subscriptions` table

### 3. Notification Delivery
```javascript
// Current routing (both for testing):
if (hasSSEConnection) sendSSE(notification);
sendWebPush(notification);  // Always sent during testing
```

### 4. Service Worker Push Handler
```javascript
self.addEventListener('push', (event) => {
    const payload = event.data ? event.data.json() : {};
    const options = {
        body: payload.body || payload.message || 'New notification',
        icon: '/favicon-default/web-app-manifest-192x192.png',
        vibrate: [100, 50, 100],
        data: { url: '/', notificationId: payload.id, type: payload.type }
    };
    event.waitUntil(
        self.registration.showNotification(payload.title || 'Framerr', options)
    );
});
```

## Critical Safari/iOS Requirements

> [!CAUTION]
> Safari is very strict about Web Push. Failing any of these will cause silent failures.

### VAPID Subject Email (CRITICAL)

```javascript
// ❌ WRONG - Safari rejects .local domains
webpush.setVapidDetails('mailto:admin@framerr.local', ...)

// ✅ CORRECT - Use valid domain
webpush.setVapidDetails('mailto:noreply@framerr.app', ...)
```

The VAPID `subject` field MUST use a valid email domain. Safari's push service rejects requests with `.local` or localhost-style domains with a `BadJwtToken` error.

### iOS PWA Requirements

| Requirement | Details |
|-------------|---------|
| iOS Version | 16.4+ required |
| Installation | Must be added to home screen from Safari |
| HTTPS | Required for all push functionality |
| User Gesture | Permission request must be triggered by user click |
| Manifest | Must have `display: "standalone"` |

### Manifest Icon Configuration

Icons must have SEPARATE entries for `any` and `maskable`:

```json
{
    "icons": [
        { "src": "/icon.png", "sizes": "192x192", "purpose": "any" },
        { "src": "/icon.png", "sizes": "192x192", "purpose": "maskable" },
        { "src": "/icon.png", "sizes": "512x512", "purpose": "any" },
        { "src": "/icon.png", "sizes": "512x512", "purpose": "maskable" }
    ]
}
```

### Service Worker Pattern

Match Overseerr's proven working pattern:

```javascript
self.addEventListener('push', (event) => {
    const payload = event.data ? event.data.json() : {};
    const options = {
        body: payload.body || 'New notification',
        icon: '/path/to/icon.png',
        vibrate: [100, 50, 100],
        data: { /* custom data */ }
    };
    event.waitUntil(
        self.registration.showNotification(payload.title || 'App', options)
    );
});
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/push/vapid-key` | GET | Get VAPID public key |
| `/api/notifications/push/subscribe` | POST | Subscribe to push |
| `/api/notifications/push/subscriptions` | GET | List user's subscriptions |
| `/api/notifications/push/subscriptions/:id` | DELETE | Remove subscription |
| `/api/notifications/push/test` | POST | Send test push |

## Troubleshooting

### Push Not Working on Safari

1. **Check VAPID email** - Must not use `.local` domain
2. **Check iOS version** - Must be 16.4+
3. **Check installation** - Must be added to home screen
4. **Check permissions** - iOS Settings → Notifications → App Name
5. **Check manifest** - Must have valid icons with correct paths

### Push Working on Chrome but Not Safari

Almost always the VAPID subject email issue. Change from `.local` to valid domain.

### Subscription Created But No Notifications

1. Check server logs for `[WebPush] Push sent successfully`
2. If 201 status but no notification, issue is in Service Worker
3. Check SW version in console - may be cached old version
4. Hard refresh or unregister old SW

## Future Improvements

- [ ] Global admin toggle to enable/disable Web Push feature
- [ ] Device list shows "this device" indicator
- [ ] Proper device removal matching by endpoint
- [ ] Revert to selective SSE/Push routing after testing
