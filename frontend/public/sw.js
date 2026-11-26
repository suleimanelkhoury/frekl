/*
 * Minimal service worker — exists only to make frekl installable as a
 * PWA (Android Chrome requires a registered service worker with a
 * fetch handler before it offers the install prompt).
 *
 * It deliberately does NOT cache anything: every request passes
 * straight through to the network, so behavior is identical to running
 * without a service worker — no offline mode, no stale UI, no cache
 * invalidation problems. If offline support is ever wanted, this is
 * the place to add a proper cache strategy.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through: no caching, no interception logic.
self.addEventListener('fetch', () => {});
