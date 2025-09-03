const CACHE = 'dashboard-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/data/report.json',
  '/assets/dribbble.svg',
  '/assets/instagram.svg',
  '/assets/behance.svg',
  '/assets/google.svg',
  '/assets/avatar.svg'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
