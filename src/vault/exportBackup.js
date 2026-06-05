import { zipSync, unzipSync, strFromU8 } from "fflate";
import {
  readTextSidecar,
  persistVaultBlob,
  persistExtractedText,
  mergeManifestDeviceWins,
  loadManifest,
} from "./opfs.js";
import { loadRawManifest } from "./manifestMeta.js";

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {Array<import("./opfs.js").VaultManifestEntry>} entries
 * @param {(id: string) => Promise<File | null>} getFileForEntry
 * @returns {Promise<Uint8Array>}
 */
export async function buildVaultZip(vault, entries, getFileForEntry) {
  /** @type {Record<string, Uint8Array>} */
  const files = {};

  const manifestText = JSON.stringify({
    exportSchemaVersion: 1,
    siloManifestVersion: 6,
    exportedAt: new Date().toISOString(),
    entries,
  }, null, 2);
  files["manifest.json"] = new TextEncoder().encode(manifestText);

  for (const e of entries) {
    const id = String(e.id);
    const f = await getFileForEntry(id);
    if (f) {
      const buf = new Uint8Array(await f.arrayBuffer());
      files[`blobs/${id}_${sanitizeName(e.name)}`] = buf;
    } else if (e.storage === "linked") {
      files[`blobs/${id}_LINKED.txt`] = new TextEncoder().encode(
        `Linked file (not copied): ${e.linkedPath || e.name}\n`,
      );
    }
    const txt = await readTextSidecar(vault, `${id}.txt`);
    if (txt != null) files[`text/${id}.txt`] = new TextEncoder().encode(txt);
    const emb = await readTextSidecar(vault, `${id}.emb.json`);
    if (emb != null) files[`text/${id}.emb.json`] = new TextEncoder().encode(emb);
  }

  return zipSync(files, { level: 6 });
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {Record<string, Uint8Array>} zipFiles from unzipSync
 * @param {Array<import("./opfs.js").VaultManifestEntry>} entries from manifest.entries
 */
export async function applyVaultZipToOpfs(vault, zipFiles, entries) {
  for (const e of entries) {
    const id = String(e.id);
    const blobKey = Object.keys(zipFiles).find((k) => k.startsWith(`blobs/${id}_`) && !k.endsWith("_LINKED.txt"));
    if (blobKey && zipFiles[blobKey]) {
      await persistVaultBlob(vault, id, new Blob([zipFiles[blobKey]]));
    }
    const txtKey = `text/${id}.txt`;
    if (zipFiles[txtKey]) {
      await persistExtractedText(vault, id, strFromU8(zipFiles[txtKey]));
    }
    const embKey = `text/${id}.emb.json`;
    if (zipFiles[embKey]) {
      const raw = strFromU8(zipFiles[embKey]);
      await writeTextRaw(vault, `${id}.emb.json`, raw);
    }
  }
  await mergeManifestDeviceWins(vault, entries);
}

async function writeTextRaw(vault, filename, text) {
  const dir = await vault.getDirectoryHandle("text", { create: true });
  const handle = await dir.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(new Blob([text], { type: "application/json" }));
  await writable.close();
}

function sanitizeName(name) {
  return String(name).replace(/[/\\?%*:|"<>]/g, "_").slice(0, 120);
}

/**
 * @param {Uint8Array} zipBytes
 * @returns {{ manifest: object | null, files: Record<string, Uint8Array> }}
 */
export function parseVaultZip(zipBytes) {
  const u = unzipSync(zipBytes);
  const manifestRaw = u["manifest.json"];
  let manifest = null;
  if (manifestRaw) {
    try {
      const parsed = JSON.parse(strFromU8(manifestRaw));
      if (parsed.entries && Array.isArray(parsed.entries)) manifest = parsed;
      else if (parsed.version && parsed.entries) manifest = parsed;
    } catch {
      manifest = null;
    }
  }
  return { manifest, files: u };
}

/**
 * @param {{ manifest: object | null, files: Record<string, Uint8Array> }} parsed
 */
export function validateVaultZip(parsed) {
  if (!parsed?.manifest) {
    return { ok: false, error: "Not a Silo backup — manifest.json missing or invalid." };
  }
  const entries = parsed.manifest.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, error: "Backup manifest has no entries." };
  }
  const hasBlob = Object.keys(parsed.files || {}).some((k) => k.startsWith("blobs/"));
  if (!hasBlob) {
    return { ok: false, error: "Backup contains no file blobs." };
  }
  return { ok: true, entryCount: entries.length };
}

/**
 * Snapshot manifest before destructive import (rollback reference).
 * @param {FileSystemDirectoryHandle} vault
 */
export async function createPreImportSnapshot(vault) {
  const raw = await loadRawManifest(vault);
  const entries = await loadManifest(vault);
  const payload = raw || { version: 6, entries };
  try {
    const dir = await vault.getDirectoryHandle("snapshots", { create: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const name = `manifest-pre-import-${stamp}.json`;
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    await writable.close();
    return name;
  } catch (err) {
    console.warn("Pre-import snapshot failed", err);
    return null;
  }
}
