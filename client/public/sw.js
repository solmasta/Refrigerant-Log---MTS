// Intentionally minimal: this app is compliance data (refrigerant logs),
// so we never want to serve cached/stale responses. This service worker
// exists only so browsers recognize the app as installable — it doesn't
// intercept or cache anything.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op: let every request pass through to the network as normal.
});
