// Service Worker: Network-First Strategy
// Siempre intenta obtener el archivo del servidor y solo usa caché si falla la red
const CACHE_NAME = 'dw-v89';
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/img/logo.jpg',
  '/manifest.json'
];

// Install: cache minimal shell
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_RESOURCES))
  );
});

// Activate: delete ALL old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for JS/CSS/HTML, cache-first only for images
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for JS, CSS, HTML
  const isAsset = /\.(js|css|html)(\?.*)?$/.test(url.pathname);
  if (isAsset || url.pathname === '/' || url.pathname.includes('index.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Images: cache-first
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
