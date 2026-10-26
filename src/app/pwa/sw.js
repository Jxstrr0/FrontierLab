/*
 * Offline service worker (docs/DEPLOYMENT.md, Stage 10 PWA).
 *
 * This file is a template: at build time `swPlugin.ts` fills in the version and
 * the list of built files, and writes the result to dist/sw.js. It is never
 * bundled into the app and never runs in dev or tests.
 *
 * - Install: download every file of this build into a cache named after the
 *   build, so the game loads offline after the first visit.
 * - Fetch: answer the site's own GET requests from that cache first (page loads
 *   get the cached index.html); anything missing is fetched and added.
 * - Updates: a new deploy has a new version, so its worker installs alongside
 *   the old one and waits. The page asks it to take over (a 'skipWaiting'
 *   message) only while no game is loaded, then reloads (src/app/pwa/register.ts);
 *   otherwise it takes over on the next launch. Either way it then deletes the
 *   old caches. No game is ever switched to new files halfway through.
 *
 * Only the site's own files are ever requested; there are no other network calls.
 */
const VERSION = '__VS_VERSION__';
const PRECACHE = ['__VS_PRECACHE__'];
const CACHE = `frontierlab-${VERSION}`;
const PREFIX = 'frontierlab-';
const scope = self.registration.scope;
const INDEX = new URL('./index.html', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `reload` skips the HTTP cache so a new version never stores stale files.
      .then((cache) => cache.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' })))),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(scope)) return;
  if (req.mode === 'navigate') {
    event.respondWith(fromCache(INDEX).then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(fromCache(req).then((hit) => hit || fetchAndKeep(req)));
});

function fromCache(req) {
  return caches.open(CACHE).then((cache) => cache.match(req, { ignoreVary: true }));
}

/** Files outside the precache list (e.g. rarely used font subsets) are kept once fetched. */
function fetchAndKeep(req) {
  return fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy));
    }
    return res;
  });
}
