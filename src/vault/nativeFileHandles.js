const DB_NAME = "silo-native-handles";
const DB_VER = 1;
const STORE = "handles";

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

/** @returns {boolean} */
export function supportsNativeFileSystemLink() {
  return typeof window !== "undefined" && !!window.showOpenFilePicker;
}

/**
 * @param {string} id vault item id
 * @param {FileSystemFileHandle} handle
 */
export async function storeLinkedFileHandle(id, handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put({ id, handle });
  });
}

/** @param {string} id @returns {Promise<FileSystemFileHandle | null>} */
export async function getLinkedFileHandle(id) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result?.handle ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** @param {string} id */
export async function removeLinkedFileHandle(id) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(id);
    });
  } catch {
    /* ignore */
  }
}

/**
 * @param {FileSystemFileHandle} handle
 * @returns {Promise<boolean>}
 */
export async function ensureReadPermission(handle) {
  if (!handle?.queryPermission) return true;
  let p = await handle.queryPermission({ mode: "read" });
  if (p === "granted") return true;
  if (handle.requestPermission) {
    p = await handle.requestPermission({ mode: "read" });
  }
  return p === "granted";
}

/**
 * @param {string} id
 * @returns {Promise<File | null>}
 */
export async function getLinkedFile(id) {
  const handle = await getLinkedFileHandle(id);
  if (!handle) return null;
  const ok = await ensureReadPermission(handle);
  if (!ok) return null;
  try {
    return await handle.getFile();
  } catch {
    return null;
  }
}

/** Opens system file picker (Chromium). */
export async function pickFilesFromDisk() {
  return window.showOpenFilePicker({ multiple: false });
}
