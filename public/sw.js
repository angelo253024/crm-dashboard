self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  // Pass-through fetch (no caching) to avoid breaking Vite SPA routing and dynamic chunks
  event.respondWith(fetch(event.request));
});
