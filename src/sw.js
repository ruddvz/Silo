/* eslint-disable no-undef */
/**
 * Silo service worker — Workbox precache + custom share target, background sync, and runtime caches.
 * Built with injectManifest; `self.__WB_MANIFEST` is injected at build time.
 */
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

const RUNTIME_ORIGIN = "silo-runtime-origin-v1";
const RUNTIME_NAV = "silo-runtime-nav-v1";
const RUNTIME_HF = "silo-runtime-hf-v1";

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clientsClaim());
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

/** Share target POST — must register before generic same-origin routes. */
registerRoute(
  ({ request, url }) => request.method === "POST" && /\/share\/?$/.test(url.pathname),
  async ({ request }) => {
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
  },
  "POST",
);

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: RUNTIME_NAV,
    networkTimeoutSeconds: 5,
    plugins: [
      {
        handlerDidError: async () => {
          const scope = self.registration.scope;
          const indexUrl = new URL("index.html", scope).href;
          const cached = await caches.match(indexUrl);
          if (cached) return cached;
          return caches.match(`${scope}`).then((r) => r || Response.error());
        },
      },
    ],
  }),
);

registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    (url.hostname.includes("huggingface.co") || url.pathname.endsWith(".wasm")),
  new CacheFirst({
    cacheName: RUNTIME_HF,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ request, url }) =>
    request.method === "GET" &&
    url.origin === self.location.origin &&
    request.mode !== "navigate",
  new StaleWhileRevalidate({
    cacheName: RUNTIME_ORIGIN,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);
