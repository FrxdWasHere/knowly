const VERSION = new URL(self.location.href).searchParams.get("v") ?? "dev";
const STATIC_CACHE = `knowly-static-${VERSION}`;
const PAGE_CACHE = `knowly-pages-${VERSION}`;
const PRECACHE_URL = `/knowly-precache.json?v=${encodeURIComponent(VERSION)}`;
const CORE_ASSETS = ["/manifest.webmanifest", "/knowly-icon.png", "/favicon.png"];
const CORE_PAGES = ["/", "/dashboard"];
const CACHES_TO_KEEP = new Set([STATIC_CACHE, PAGE_CACHE]);

function isSensitivePath(pathname) {
  return (
    pathname === "/login" ||
    pathname === "/account" ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/share-preview/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/auth"
  );
}

function pageCacheKey(requestUrl) {
  const url = new URL(requestUrl);
  url.search = "";
  url.hash = "";
  return url.href;
}

function isCacheablePage(pathname, response) {
  if (!response.ok || isSensitivePath(pathname)) return false;
  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return !/(?:^|,)\s*(?:no-store|private)\b/i.test(cacheControl);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const manifestResponse = await fetch(PRECACHE_URL, { cache: "no-store" });
      if (!manifestResponse.ok) {
        throw new Error(`Could not load the offline asset list: ${manifestResponse.status}`);
      }

      const manifest = await manifestResponse.json();
      if (
        !Array.isArray(manifest.assets) ||
        manifest.assets.some((asset) => typeof asset !== "string")
      ) {
        throw new Error("The offline asset list is invalid.");
      }

      const staticCache = await caches.open(STATIC_CACHE);
      const assetUrls = [...new Set([...CORE_ASSETS, ...manifest.assets])];
      for (let index = 0; index < assetUrls.length; index += 20) {
        await Promise.all(
          assetUrls.slice(index, index + 20).map(async (url) => {
            const response = await fetch(url, { cache: "reload" });
            if (!response.ok) throw new Error(`Could not cache ${url}: ${response.status}`);
            await staticCache.put(url, response);
          }),
        );
      }

      const pageCache = await caches.open(PAGE_CACHE);
      for (const path of CORE_PAGES) {
        const response = await fetch(path, { cache: "reload" });
        if (isCacheablePage(path, response)) await pageCache.put(path, response);
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith("knowly-") && !CACHES_TO_KEEP.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isSensitivePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (isCacheablePage(url.pathname, response)) {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(pageCacheKey(request.url), response.clone());
          }
          return response;
        } catch (error) {
          const cache = await caches.open(PAGE_CACHE);
          const cachedPage = await cache.match(pageCacheKey(request.url));
          const fallback = cachedPage ?? (await cache.match("/"));
          if (fallback) return fallback;
          throw error;
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || CORE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
