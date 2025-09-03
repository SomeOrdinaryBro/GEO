const CACHE = 'geo-cache-v1';
const ROOT = self.location.pathname.replace(/\/[^\/]*$/, '/');
const ASSETS = [
  ROOT,
  ROOT + 'index.html',
  ROOT + 'assets/style.css',
  ROOT + 'assets/app.js',
  ROOT + 'data/report.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
