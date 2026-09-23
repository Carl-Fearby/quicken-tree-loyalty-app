const CACHE_NAME = 'quicken-tree-shell-v3';
const CACHE_PREFIX = 'quicken-tree-shell-';
const DISH_IMAGE_CACHE = 'quicken-tree-dish-images-v1';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const cacheName = new URL(event.request.url).pathname.startsWith('/dish-images/')
    ? DISH_IMAGE_CACHE
    : CACHE_NAME;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          event.waitUntil(caches.open(cacheName)
            .then(cache => cache.put(event.request, response.clone()))
            .catch(error => console.warn('Response could not be cached for offline use.', error)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // HTML is only a valid fallback for page navigations, never CSS or JS.
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
