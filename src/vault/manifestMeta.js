/** @typedef {"pdf" | "text" | "audio" | "file" | "image"} VaultKind */
/** @typedef {"opfs" | "linked"} VaultStorage */
/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   tag: string,
 *   kind: VaultKind,
 *   createdAt: string,
 *   sizeBytes: number,
 *   mimeType?: string,
 *   storage?: VaultStorage,
 *   linkedPath?: string,
 *   contentHash?: string,
 *   textFingerprint?: string,
 *   extractionStatus?: string,
 *   extractionError?: string,
 * }} VaultManifestEntry
 */

/** @param {object} raw @returns {VaultManifestEntry} */
export function normalizeEntry(raw) {
  const id = String(raw.id);
  let kind = raw.kind;
  if (!kind) {
    const n = String(raw.name || "").toLowerCase();
    if (n.endsWith(".pdf")) kind = "pdf";
    else if (/\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(n)) kind = "image";
    else if (/\.(m4a|aac|mp3|wav|webm|ogg|opus|flac)$/i.test(n)) kind = "audio";
    else if (/\.(txt|md)$/i.test(n)) kind = "text";
    else kind = "file";
  }
  return {
    id,
    name: raw.name,
    tag: raw.tag,
    kind,
    createdAt: raw.createdAt,
    sizeBytes: Number(raw.sizeBytes) || 0,
    mimeType: raw.mimeType,
    storage: raw.storage === "linked" ? "linked" : "opfs",
    linkedPath: typeof raw.linkedPath === "string" ? raw.linkedPath : undefined,
    contentHash: typeof raw.contentHash === "string" ? raw.contentHash : undefined,
    textFingerprint: typeof raw.textFingerprint === "string" ? raw.textFingerprint : undefined,
    extractionStatus: typeof raw.extractionStatus === "string" ? raw.extractionStatus : undefined,
    extractionError: typeof raw.extractionError === "string" ? raw.extractionError : undefined,
  };
}

export const CURRENT_MANIFEST_VERSION = 6;
const MANIFEST = "manifest.json";

/** @param {FileSystemDirectoryHandle} vault @returns {Promise<object | null>} */
export async function loadRawManifest(vault) {
  try {
    const handle = await vault.getFileHandle(MANIFEST);
    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

/** @param {FileSystemDirectoryHandle} vault @param {object} data */
export async function saveManifestRaw(vault, data) {
  const json = JSON.stringify(data, null, 0);
  const blob = new Blob([json], { type: "application/json" });
  const handle = await vault.getFileHandle(MANIFEST, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @returns {Promise<VaultManifestEntry[]>}
 */
export async function loadManifestEntries(vault) {
  const raw = await loadRawManifest(vault);
  if (!raw?.entries || !Array.isArray(raw.entries)) return [];
  return raw.entries.map(normalizeEntry);
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {VaultManifestEntry[]} entries
 */
export async function saveManifestEntries(vault, entries) {
  await saveManifestRaw(vault, { version: CURRENT_MANIFEST_VERSION, entries });
}
