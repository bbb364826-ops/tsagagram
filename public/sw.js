// Tsagagram Service Worker - Push Notifications
const CACHE_NAME = "tsagagram-v1";
const STATIC_ASSETS = ["/", "/manifest.json", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Tsagagram", body: event.data.text() }; }

  const options = {
    body: data.body || "შეტყობინება",
    icon: "/logo.png",
    badge: "/logo.png",
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "გახსნა" },
      { action: "close", title: "დახურვა" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Tsagagram", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Background sync for offline messages
self.addEventListener("sync", (event) => {
  if (event.tag === "send-message") {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Sync queued messages when back online
}
