/* Offline cache for Lock In (static assets only). */
const CACHE_NAME = 'lock-in-static-v1';
const APP_ASSETS = [
  'index.html',
  'month.html',
  'april.html',
  'analytics.html',
  'manifest.json',
  'icon.png',
  'style.css',
  'calendar-picker.js',
  'daily-habits.js',
  'analytics-render.js',
  'revenue-milestones.js',
  'april-revenue.js',
  'dashboard-money.js',
  'menu.js',
  'month.js',
  'month-revenue.js',
  'april.js',
  'analytics.js',
  'revenue.js',
  'tasks.js',
  'dashboard.js',
  'revenue-milestone-user.mp3'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        APP_ASSETS.map(function (url) {
          return cache.add(url).catch(function () {
            return undefined;
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        return response;
      });
    })
  );
});
