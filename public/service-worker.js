const CACHE_NAME = "our-family-reunion-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/signup.html",
  "/nickname.html",
  "/family-group.html",
  "/relationships.html",
  "/dashboard.html",
  "/css/theme.css",
  "/css/index.css",
  "/css/auth.css",
  "/css/app.css",
  "/js/theme.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // Never cache API calls
  if (req.url.includes("/api/")) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      });
    })
  );
});
