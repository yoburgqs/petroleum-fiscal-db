/* ORCA Service Worker — v309 */
const CACHE_NAME = 'orca-v309';
const BASE = '/petroleum-fiscal-db';

/* Static assets that rarely change — cache-first */
const STATIC = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/countries-110m.json',
];

/* Data assets that update with each deployment — network-first, cache fallback */
const DATA = [
  BASE + '/country_data.json',
  BASE + '/reform_history.json',
  BASE + '/scenarios.json',
];

/* Install: pre-cache static assets */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC).catch(() => {
        /* Non-fatal: cache what we can */
      });
    })
  );
});

/* Activate: remove old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch: network-first for data, cache-first for static */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Only handle same-origin requests under the app's scope */
  if (!url.pathname.startsWith(BASE)) return;

  /* CDN requests: pass through, no caching (CSP restriction + SRI integrity) */
  if (event.request.url.includes('cdn.jsdelivr.net') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('unpkg.com')) {
    return;
  }

  const isData = DATA.some(d => url.pathname === d) ||
                 url.pathname.endsWith('.json');

  if (isData) {
    /* Network-first for JSON: always try to get fresh data */
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    /* Cache-first for static assets (HTML, images, etc.) */
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
