/** @returns {Promise<FileSystemDirectoryHandle | null>} */
export async function getVaultRoot() {
  if (!navigator.storage?.getDirectory) return null;
  try {
    const root = await navigator.storage.getDirectory();
    await root.getDirectoryHandle("vault", { create: true });
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
 * @typedef {{ id: string, name: string, tag: string, createdAt: string, sizeBytes: number }} VaultManifestEntry
 */

/** @param {FileSystemDirectoryHandle} vault */
export async function loadManifest(vault) {
  try {
    const handle = await vault.getFileHandle(MANIFEST);
    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data?.entries || !Array.isArray(data.entries)) return [];
    return data.entries;
  } catch {
    return [];
  }
}

/** @param {FileSystemDirectoryHandle} vault @param {VaultManifestEntry[]} entries */
export async function saveManifest(vault, entries) {
  const json = JSON.stringify({ version: 1, entries }, null, 0);
  const blob = new Blob([json], { type: "application/json" });
  const handle = await vault.getFileHandle(MANIFEST, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {Blob} blob
 * @param {{ id: string, name: string, tag: string }} meta
 */
export async function persistUploadedPdf(vault, blob, meta) {
  await writeFileInVault(vault, "files", meta.id, blob);
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

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {string} id
 */
export async function deleteVaultItem(vault, id) {
  await deleteFileInVault(vault, "files", id);
  await deleteFileInVault(vault, "text", `${id}.txt`);
}

/** @param {FileSystemDirectoryHandle} vault @param {string} id @returns {Promise<File | null>} */
export async function readVaultPdfFile(vault, id) {
  try {
    const dir = await vault.getDirectoryHandle("files", { create: false });
    const fh = await dir.getFileHandle(id);
    return await fh.getFile();
  } catch {
    return null;
  }
}
