// The dictionary moved to https://kiribati-dictionary.github.io/.
// Replaces the old offline service worker: deletes its saved copy of the site,
// unregisters, and reloads open pages so they reach the redirect.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
  })());
});
