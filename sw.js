/* Amber's Games — service worker
 * Caches the shell + vendored libs for offline play.
 * Version bump (v2) forces update when assets change.
 */
const CACHE = 'amber-games-v2';

const SHELL = [
  './',
  './portal.html',
  './index.html',
  './hardening.js',
  './playtime.js',
  './manifest.webmanifest',
  './vendor/react/react.production.min.js',
  './vendor/react/react-dom.production.min.js',
  './vendor/babel/babel.min.js',
  './vendor/vue/vue.global.prod.js',
  './404.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        SHELL.map((url) =>
          c.add(url).catch(() => undefined)
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        // refresh cache in background
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res));
        }).catch(() => undefined);
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./404.html'));
    })
  );
});
