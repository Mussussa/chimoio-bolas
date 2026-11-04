const cacheName = "chimoio-boladas-shell-v1";
const appShell = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg"];
const worker = self as unknown as ServiceWorkerGlobalScope;

worker.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(appShell)).then(() => worker.skipWaiting()));
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
      .then(() => worker.clients.claim())
  );
});

worker.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== worker.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      void caches.open(cacheName).then((cache) => cache.put("/index.html", copy));
      return response;
    }).catch(async () => (await caches.match("/index.html")) ?? Response.error()));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(cacheName).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
  }
});
