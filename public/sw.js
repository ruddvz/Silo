/* Silo service worker — offline shell, model-friendly caching, share target */
const CACHE_VERSION = "silo-v4-static";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope;
      const cache = await caches.open(CACHE_VERSION);
      const shell = [`${scope}`, new URL("index.html", scope).href, new URL("manifest.webmanifest", scope).href];
      await cache.addAll(shell).catch(() => {});
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Wake open Silo tabs so they can drain IndexedDB → OPFS (Background Sync, Chromium). */
self.addEventListener("sync", (event) => {
  if (event.tag !== "silo-share-queue") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        try {
          c.postMessage({ type: "SILO_PROCESS_SHARE_QUEUE" });
        } catch {
          /* client gone */
        }
      }
    }),
  );
});

const SHARE_DB = "silo-share-queue";
const SHARE_STORE = "pending";

function openShareDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) {
        db.createObjectStore(SHARE_STORE, { keyPath: "id" });
      }
    };
  });
}

function putPendingShare(record) {
  return openShareDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(SHARE_STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(SHARE_STORE).put(record);
      }),
  );
}

function redirectToAppQuery(query) {
  const base = new URL("./", self.registration.scope);
  return Response.redirect(new URL(`?${query}`, base).href, 303);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Share target POST */
  if (request.method === "POST" && /\/share\/?$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const ct = request.headers.get("content-type") || "";
          const id = `share-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          let title = "";
          let text = "";
          let shareUrl = "";
          const fileMetas = [];

          if (ct.includes("multipart/form-data")) {
            const form = await request.formData();
            title = String(form.get("title") || "");
            text = String(form.get("text") || "");
            shareUrl = String(form.get("url") || "");
            const files = form.getAll("files");
            for (let i = 0; i < files.length; i++) {
              const f = files[i];
              if (!(f instanceof File)) continue;
              const buf = await f.arrayBuffer();
              fileMetas.push({
                name: f.name,
                type: f.type || "application/octet-stream",
                buffer: Array.from(new Uint8Array(buf)),
              });
            }
          } else {
            const t = await request.text();
            text = t;
          }

          await putPendingShare({
            id,
            createdAt: new Date().toISOString(),
            title,
            text,
            url: shareUrl,
            files: fileMetas,
            importAttempts: 0,
            lastError: "",
          });

          const reg = self.registration;
          if (reg && "sync" in reg) {
            try {
              await reg.sync.register("silo-share-queue");
            } catch {
              /* Background Sync unavailable */
            }
          }

          return redirectToAppQuery(`shareImport=${encodeURIComponent(id)}`);
        } catch (err) {
          console.error("share-target", err);
          return redirectToAppQuery("shareError=1");
        }
      })(),
    );
    return;
  }

  /* Navigation: network-first, fallback to cached shell */
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const scope = self.registration.scope;
          const cached = await caches.match(new URL("index.html", scope).href);
          if (cached) return cached;
          return caches.match(`${scope}`).then((r) => r || fetch(request));
        }
      })(),
    );
    return;
  }

  /* Huggingface / WASM: cache-first */
  if (url.hostname.includes("huggingface.co") || url.pathname.endsWith(".wasm")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
          return res;
        });
      }),
    );
    return;
  }

  /* Same-origin GET assets: stale-while-revalidate */
  if (request.method === "GET" && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
          }
          return res;
        });
        return cached || fetched;
      }),
    );
  }
});
