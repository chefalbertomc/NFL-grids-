// Service Worker: Network-First + Auto Silent Update
// Siempre descarga la versión más nueva del servidor. Cuando hay una actualización,
// se activa sola y recarga todos los clientes automáticamente sin que el usuario haga nada.
const CACHE_NAME = 'dw-v107';

// Install: skip waiting to activate immediately without user action
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate: delete all old caches, claim all clients, then message them to reload
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell every open tab/window to reload with the fresh version
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      })
  );
});

// Fetch: Only handle GET requests for same-origin assets
self.addEventListener('fetch', event => {
  // Never intercept non-GET requests (e.g. POST, PUT, DELETE)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Ignore external APIs (Firebase, Google Auth, ESPN, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  const isAsset = /\.(js|css|html)(\?.*)?$/.test(url.pathname);

  // Network-First for JS, CSS, HTML
  if (isAsset || url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.includes('index') || url.pathname.includes('admin')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Same-origin Images & icons: cache-first
  if (/\.(png|jpg|jpeg|svg|webp|ico|gif)(\?.*)?$/i.test(url.pathname)) {
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
  }
});

