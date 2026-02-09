const CACHE_NAME = '3d-printing-manager-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './orders.html',
  './quotes.html',
  './materials.html',
  './models.html',
  './clients.html',
  './financials.html',
  './history.html',
  './accessories.html',
  './login.html',
  './common.js',
  './manifest.json',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
