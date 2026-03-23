const CACHE_NAME = 'elanur-v3.1';
const ASSETS_TO_CACHE = [
  '/elanur-quest/',
  '/elanur-quest/index.html',
  '/elanur-quest/manifest.json',
  '/elanur-quest/icons/icon-192.png',
  '/elanur-quest/icons/icon-512.png'
];

// ============================================================
// INSTALL — Cache core assets for offline support
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE — Clean old caches
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — Network first, cache fallback (OFFLINE SUPPORT)
// ============================================================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/elanur-quest/index.html');
          }
        });
      })
  );
});

// ============================================================
// BACKGROUND SYNC — Retry failed Supabase saves when online
// ============================================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_NOW' });
        });
      })
    );
  }
});

// ============================================================
// PERIODIC BACKGROUND SYNC — Refresh data periodically
// ============================================================
self.addEventListener('periodicsync', event => {
  if (event.tag === 'refresh-data') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'PERIODIC_REFRESH' });
        });
      })
    );
  }
});

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
self.addEventListener('push', event => {
  let data = { title: 'Elanur Komuta Merkezi', body: 'Yeni bir bildirim var!', icon: '/elanur-quest/icons/icon-192.png' };
  
  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/elanur-quest/icons/icon-192.png',
      badge: '/elanur-quest/icons/icon-96.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      data: { url: data.url || '/elanur-quest/' }
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/elanur-quest/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes('/elanur-quest/'));
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
