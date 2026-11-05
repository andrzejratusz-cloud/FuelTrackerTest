'use strict';
// Increase VERSION whenever app shell files change. Never cache user records.
const VERSION = 'v36';
const ROOT = new URL('./', self.location.href);
const PREFIX = 'fuel-tracker-shell-' + encodeURIComponent(ROOT.pathname) + '-';
const CACHE = PREFIX + VERSION;
const SHELL = ['index.html', 'i18n.js', 'manifest.webmanifest', 'pwa.js', 'analytics-config.js', 'analytics.js', 'sharing-config.js', 'sharing.js', 'receipt.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'].map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map(url => new Request(url, {cache: 'reload'})));
    // Do not interrupt an open form: updates activate after all old windows close.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  // Cache-first shell: a version remains consistent until the next worker activates.
  if (request.mode === 'navigate') {
    if (url.pathname !== ROOT.pathname && url.pathname !== new URL('index.html', ROOT).pathname) return;
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(new URL('index.html', ROOT).href) || fetch(request);
    })());
  } else if (SHELL.includes(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(request) || fetch(request);
    })());
  }
});





// Activate only after the user requests the prepared update.
self.addEventListener('message', event => {
 if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
});

