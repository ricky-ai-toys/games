/* Amber's Games — service worker
 * Caches the shell + vendored libs for offline play.
 * v5: bounded runtime cache, visible precache failures, real 404 status.
 */
const CACHE = 'amber-games-v5';
const MAX_ENTRIES = 200;

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
  // Game files (shark/, castle/, farm/, ...) are NOT listed: they are picked up by
  // the runtime cache below on first visit, by design.
];

// Only cache same-origin game assets — never dotfiles, API responses or listings.
const CACHEABLE_RE = /\.(?:html|css|js|mjs|json|woff2?|png|jpe?g|gif|svg|webp|ico|mp3|ogg|wav|webmanifest)$/i;

function cachable(url) {
  try {
    const u = new URL(url);
    if (u.origin !== self.location.origin) return false;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.some((p) => p.startsWith('.'))) return false;
    return CACHEABLE_RE.test(u.pathname) || u.pathname === '/';
  } catch (e) {
    return false;
  }
}

async function trimCache(c) {
  const keys = await c.keys();
  if (keys.length <= MAX_ENTRIES) return;
  for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) await c.delete(k);
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      const results = await Promise.allSettled(SHELL.map((url) => c.add(url)));
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn('[sw] precache failed:', SHELL[i]);
      });
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
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
          if (res && res.ok && cachable(req.url)) {
            caches.open(CACHE).then((c) => c.put(req, res).then(() => trimCache(c)));
          }
        }).catch(() => undefined);
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && cachable(req.url)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy).then(() => trimCache(c)));
        }
        return res;
      }).catch(async () => {
        // audit L-4 fix: offline fallback must not masquerade as a 200 page
        const r = await caches.match('./404.html');
        if (!r) return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        return new Response(await r.text(), { status: 404, headers: { 'Content-Type': 'text/html' } });
      });
    })
  );
});
