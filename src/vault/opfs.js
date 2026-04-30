/** @returns {Promise<FileSystemDirectoryHandle | null>} */
export async function getVaultRoot() {
  if (!navigator.storage?.getDirectory) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const vault = await root.getDirectoryHandle("vault", { create: true });
    await vault.getDirectoryHandle("files", { create: true });
    await vault.getDirectoryHandle("text", { create: true });
    return vault;
  } catch {
    return null;
  }
}

/** @param {FileSystemDirectoryHandle} vault */
async function writeFileInVault(vault, subdir, name, blob) {
  const dir = await vault.getDirectoryHandle(subdir, { create: true });
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** @param {FileSystemDirectoryHandle} vault */
async function readTextFile(vault, subdir, name) {
  try {
    const dir = await vault.getDirectoryHandle(subdir, { create: false });
    const fileHandle = await dir.getFileHandle(name);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

/** @param {FileSystemDirectoryHandle} vault */
async function deleteFileInVault(vault, subdir, name) {
  try {
    const dir = await vault.getDirectoryHandle(subdir, { create: false });
    await dir.removeEntry(name);
  } catch {
    /* ignore */
  }
}

const MANIFEST = "manifest.json";

/**
 * @typedef {"pdf" | "text" | "audio" | "file" | "image"} VaultKind
 * @typedef {{
 *   id: string,
 *   name: string,
 *   tag: string,
 *   kind: VaultKind,
 *   createdAt: string,
 *   sizeBytes: number,
 *   mimeType?: string,
 * }} VaultManifestEntry
 */

/** @param {object} raw @returns {VaultManifestEntry} */
function normalizeEntry(raw) {
  const id = String(raw.id);
  let kind = raw.kind;
    if (!kind) {
      const n = String(raw.name || "").toLowerCase();
      if (n.endsWith(".pdf")) kind = "pdf";
      else if (/\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(n)) kind = "image";
      else if (/\.(m4a|aac|mp3|wav|webm|ogg|opus|flac)$/i.test(n)) kind = "audio";
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
  };
}

/** @param {FileSystemDirectoryHandle} vault */
export async function loadManifest(vault) {
  try {
    const handle = await vault.getFileHandle(MANIFEST);
    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data?.entries || !Array.isArray(data.entries)) return [];
    return data.entries.map(normalizeEntry);
  } catch {
    return [];
  }
}

/** @param {FileSystemDirectoryHandle} vault @param {VaultManifestEntry[]} entries */
export async function saveManifest(vault, entries) {
  const json = JSON.stringify({ version: 3, entries }, null, 0);
  const blob = new Blob([json], { type: "application/json" });
  const handle = await vault.getFileHandle(MANIFEST, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {string} id
 * @param {Blob} blob
 */
export async function persistVaultBlob(vault, id, blob) {
  await writeFileInVault(vault, "files", id, blob);
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {string} id
 * @param {string} text
 */
export async function persistExtractedText(vault, id, text) {
  await writeFileInVault(vault, "text", `${id}.txt`, new Blob([text], { type: "text/plain;charset=utf-8" }));
}

/** @param {FileSystemDirectoryHandle} vault @param {string} id */
export async function loadExtractedText(vault, id) {
  return readTextFile(vault, "text", `${id}.txt`);
}

/** @param {FileSystemDirectoryHandle} vault @param {string} id @param {Float32Array} vec */
export async function persistEmbedding(vault, id, vec) {
  const arr = Array.from(vec);
  await writeFileInVault(
    vault,
    "text",
    `${id}.emb.json`,
    new Blob([JSON.stringify({ dim: vec.length, v: arr })], { type: "application/json" }),
  );
}

/** @param {FileSystemDirectoryHandle} vault @param {string} id @returns {Promise<Float32Array | null>} */
export async function loadEmbedding(vault, id) {
  const raw = await readTextFile(vault, "text", `${id}.emb.json`);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (o?.v && Array.isArray(o.v)) return Float32Array.from(o.v);
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {string} id
 */
export async function deleteVaultItem(vault, id) {
  await deleteFileInVault(vault, "files", id);
  await deleteFileInVault(vault, "text", `${id}.txt`);
  await deleteFileInVault(vault, "text", `${id}.emb.json`);
}

/** @param {FileSystemDirectoryHandle} vault @param {string} id @returns {Promise<File | null>} */
export async function readVaultBlobFile(vault, id) {
  try {
    const dir = await vault.getDirectoryHandle("files", { create: false });
    const fh = await dir.getFileHandle(id);
    return await fh.getFile();
  } catch {
    return null;
  }
}

/** @deprecated use readVaultBlobFile */
export const readVaultPdfFile = readVaultBlobFile;
