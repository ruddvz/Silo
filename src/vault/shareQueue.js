const DB_NAME = "silo-share-queue";
const STORE = "pending";
const DB_VER = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

/** @returns {Promise<Array<Record<string, unknown>>>} */
export async function getAllPendingShares() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** @param {string} id */
export async function removePendingShare(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
}

/**
 * @param {string} id
 * @param {string} errorMessage
 * @returns {Promise<number>} new attempt count
 */
export async function recordShareImportFailure(id, errorMessage) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    const g = st.get(id);
    g.onerror = () => reject(g.error);
    g.onsuccess = () => {
      const cur = g.result;
      if (!cur) {
        resolve(0);
        return;
      }
      const n = (cur.importAttempts || 0) + 1;
      st.put({
        ...cur,
        importAttempts: n,
        lastError: String(errorMessage || "error").slice(0, 400),
      });
      resolve(n);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Clear all pending shares (e.g. after repeated failures user gives up). */
export async function clearAllPendingShares() {
  const all = await getAllPendingShares();
  await Promise.all(all.map((r) => removePendingShare(r.id)));
}

/**
 * @returns {Promise<{ total: number, failed: number }>}
 * `failed` = rows that failed at least once and are still queued (user-visible retry surface).
 */
export async function getShareQueueStats() {
  const all = await getAllPendingShares();
  const failed = all.filter((r) => {
    const attempts = Number(r.importAttempts) || 0;
    const err = String(r.lastError || "").trim();
    return attempts > 0 || err.length > 0;
  }).length;
  return { total: all.length, failed };
}

/**
 * Best-effort: ask the browser to run a sync pass later (Chrome/Android; no-op if unsupported).
 * Call after enqueueing a share or after a failed import so a reopened tab can drain the queue.
 */
export async function requestShareQueueBackgroundSync() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.sync || typeof reg.sync.register !== "function") return;
    await reg.sync.register("silo-share-queue");
  } catch {
    /* quota, permission, or browser without Background Sync */
  }
}
