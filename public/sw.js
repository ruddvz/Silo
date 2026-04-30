/* Silo service worker — share target + offline shell */
const SHARE_DB = "silo-share-queue";
const SHARE_STORE = "pending";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
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
    (db) => new Promise((resolve, reject) => {
      const tx = db.transaction(SHARE_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(SHARE_STORE).put(record);
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share") return;

  event.respondWith(
    (async () => {
      try {
        const ct = event.request.headers.get("content-type") || "";
        const id = `share-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        let title = "";
        let text = "";
        let shareUrl = "";
        const fileMetas = [];

        if (ct.includes("multipart/form-data")) {
          const form = await event.request.formData();
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
          const t = await event.request.text();
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
            /* Background Sync unavailable or denied */
          }
        }

        return Response.redirect(`/?shareImport=${encodeURIComponent(id)}`, 303);
      } catch (err) {
        console.error("share-target", err);
        return Response.redirect("/?shareError=1", 303);
      }
    })(),
  );
});
