const CACHE_NAME = 'jiyoo-catalog-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.jpg',
  '/og-image.png',
  '/robots.txt',
  '/sitemap.xml'
];

// Install Event - Pre-cache critical static assets.
// Cache each asset individually (not cache.addAll) so one missing/failed
// file can't silently abort caching for every other asset -- addAll is
// all-or-nothing, which previously meant NOTHING got pre-cached whenever a
// single referenced file (e.g. a since-deleted image) 404'd.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Pre-caching failed for', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Self-contained fallback for any image that fails to load while offline.
// Never depends on a file existing on disk (that's what broke before: the
// fallback pointed at /logo.jpg, and if that file was ever missing or
// corrupted, the fallback itself failed and the image just vanished).
const OFFLINE_IMAGE_FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
    '<rect width="400" height="400" fill="#FAF9F5"/>' +
    '<rect x="40" y="40" width="320" height="320" rx="16" fill="#F3F0E6"/>' +
    '<text x="200" y="208" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#8A8170">Image unavailable offline</text>' +
    '</svg>'
  );

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate / Cache First for assets & product images
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Don't intercept analytics or third-party non-HTTP
  if (!url.protocol.startsWith('http')) return;

  // For API / Firebase auth or POST requests, pass through
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firestore.googleapis.com')) {
    return;
  }

  // Handle navigation requests (HTML pages).
  // Network-only, no caching: index.html references hashed JS/CSS bundle
  // filenames that change on every Vite build. Caching the HTML (or falling
  // back to a previously-cached copy) can serve a page pointing at asset
  // files a newer deploy has already deleted, producing 404s that keep
  // React from ever mounting -- only the static loader markup in that stale
  // HTML remains visible. Only fall back to a cached copy if the network is
  // truly unreachable (offline), and only if one happens to exist.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cachedResponse) => cachedResponse || caches.match('/index.html'));
      })
    );
    return;
  }

  // Cache-first for images, fonts, scripts, and CSS
  const isAsset = 
    event.request.destination === 'image' ||
    event.request.destination === 'style' ||
    event.request.destination === 'script' ||
    event.request.destination === 'font' ||
    url.pathname.match(/\.(jpg|jpeg|png|webp|svg|gif|css|js|ts|tsx|woff2?)$/i);

  if (isAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {/* Ignore background fetch failure when offline */});
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch((err) => {
          // Fallback image if image request fails offline
          if (event.request.destination === 'image') {
            return new Response(
              decodeURIComponent(OFFLINE_IMAGE_FALLBACK.split(',')[1]),
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          throw err;
        });
      })
    );
    return;
  }

  // Default Stale-While-Revalidate for other GET requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
