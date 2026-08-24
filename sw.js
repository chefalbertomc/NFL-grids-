// Service Worker: Network-First + Auto Silent Update
// Siempre descarga la versión más nueva del servidor. Cuando hay una actualización,
// se activa sola y recarga todos los clientes automáticamente sin que el usuario haga nada.
const CACHE_NAME = 'dw-v92';

// Install: skip waiting to activate immediately without user action
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate right away, no waiting
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

// Fetch: Network-First for JS/CSS/HTML so they are ALWAYS fresh from the server
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isAsset = /\.(js|css|html)(\?.*)?$/.test(url.pathname);

  if (isAsset || url.pathname === '/' || url.pathname.includes('index.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Images: cache-first for performance
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
