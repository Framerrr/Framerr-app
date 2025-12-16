/**
 * Framerr Service Worker
 * 
 * Handles Web Push notifications and app shell caching for faster loads.
 */

// VERSION - Update this to force new SW installation
const SW_VERSION = '1.0.4';

// Cache name for app shell resources
const CACHE_NAME = 'framerr-cache-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html'
];

console.log('[SW] Framerr Service Worker version', SW_VERSION);

// Install event - cache app shell
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((error) => {
                console.error('[SW] Failed to cache:', error);
            })
    );
    // Activate immediately
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // Skip API requests and external resources
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/') || !url.origin.includes(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request);
            })
    );
});

// Push event - Safari-robust handling
// Safari WILL REVOKE subscription if showNotification fails 3 times
self.addEventListener('push', (event) => {
    console.log('[SW v' + SW_VERSION + '] Push received');

    // Fallback notification - ALWAYS used if parsing fails
    const fallback = {
        title: 'Framerr',
        body: 'New notification'
    };

    let title = fallback.title;
    let body = fallback.body;
    let notificationData = {};

    // Try to parse push data, but gracefully fallback
    try {
        if (event.data) {
            const payload = event.data.json();
            title = payload.title || fallback.title;
            body = payload.body || payload.message || fallback.body;
            notificationData = {
                url: '/',
                notificationId: payload.id,
                type: payload.type
            };
            console.log('[SW] Parsed:', title, body);
        }
    } catch (e) {
        console.warn('[SW] Parse failed, using fallback:', e.message);
    }

    // Safari: Keep options MINIMAL - just body and data
    const options = {
        body: body,
        data: notificationData
    };

    // CRITICAL: This promise MUST resolve with a notification shown
    // Safari revokes subscription after 3 failures
    const showPromise = self.registration.showNotification(title, options)
        .then(() => {
            console.log('[SW] ✓ Notification shown');
        })
        .catch((err) => {
            console.error('[SW] Primary notification failed:', err);
            // Last resort - try with absolute minimum
            return self.registration.showNotification('Framerr', { body: 'New notification' })
                .then(() => console.log('[SW] ✓ Fallback notification shown'))
                .catch((e) => console.error('[SW] ✗ All notifications failed:', e));
        });

    event.waitUntil(showPromise);
});

// Notification click event - navigate to app
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if not already open
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Push subscription change - auto-resubscribe
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('[SW] Push subscription changed, resubscribing...');

    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: event.oldSubscription?.options?.applicationServerKey
        }).then((newSubscription) => {
            // Inform the server about the new subscription
            // This requires the app to handle it next time it loads
            console.log('[SW] Resubscribed to push notifications');
        }).catch((error) => {
            console.error('[SW] Failed to resubscribe:', error);
        })
    );
});
