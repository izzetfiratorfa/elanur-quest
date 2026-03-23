const CACHE_NAME = 'elanur-v3.1';
const ASSETS_TO_CACHE = [
  '/elanur-quest/',
  '/elanur-quest/index.html',
  '/elanur-quest/manifest.json',
  '/elanur-quest/icons/icon-192.png',
  '/elanur-quest/icons/icon-512.png'
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
  // Skip non-GET and Supabase API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, return cached index
          if (event.request.mode === 'navigate') {
            return caches.match('/elanur-quest/index.html');
          }
        });
      })
  );
});
