const CACHE_NAME = "oralyn-portal-shell-__ORALYN_BUILD_ID__";
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/oralyn-pwa-192.png",
  "/oralyn-pwa-512.png",
  "/oralyn-logo-approved.webp",
  "/oralyn-app-icon-approved.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("oralyn-portal-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(v1|auth\/v1|rest\/v1|storage\/v1|functions\/v1)(\/|$)/i.test(url.pathname)) return;
  if (request.headers.has("authorization")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
        }
        return response;
      }).catch(() => caches.match("/"))
    );
    return;
  }

  if (request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "image" ||
      request.destination === "font") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok && response.type === "basic" && !response.headers.has("set-cookie")) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch((error) => {
          if (cached) return cached;
          throw error;
        });
        return cached || network;
      })
    );
  }
});
