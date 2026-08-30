// Service Worker: Network-First + Auto Silent Update (v215.3)
const CACHE_NAME = 'dw-v215-3';

// Install: skip waiting immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate: flush old caches and claim all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      })
  );
});

// Fetch: Always Network-First for HTML, JS, CSS, and root navigation
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore external APIs (Firebase, Google Auth, ESPN, etc.)
  if (url.origin !== self.location.origin) return;

  // Images & fonts: Cache-First
  if (/\.(png|jpg|jpeg|svg|webp|ico|gif|woff2?|ttf)(\?.*)?$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      }).catch(() => fetch(event.request))
    );
    return;
  }

  // All HTML, JS, CSS, Manifest, and PWA root navigation: Network-First with no-store
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => caches.match(event.request))
  );
});

