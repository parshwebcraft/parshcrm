// Self-destruct service worker for local/dev cleanup.
// Removes old app-shell caches and unregisters any previously installed worker.
const clearStorage = async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  await self.registration.unregister();
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(clearStorage());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    clearStorage().then(async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      windows.forEach((client) => {
        if ("navigate" in client) client.navigate(client.url);
      });
    }),
  );
});

self.addEventListener("fetch", () => {
  return;
});
