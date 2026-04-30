import { readVaultBlobFile, loadExtractedText, readTextSidecar } from "./opfs.js";

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {Array<import("./opfs.js").VaultManifestEntry>} entries
 * @returns {Promise<Array<{ id: string, code: string, detail: string }>>}
 */
export async function checkVaultIntegrity(vault, entries) {
  /** @type {Array<{ id: string, code: string, detail: string }>} */
  const issues = [];
  for (const e of entries) {
    const id = String(e.id);
    const storage = e.storage === "linked" ? "linked" : "opfs";
    if (storage === "opfs") {
      const blob = await readVaultBlobFile(vault, id);
      if (!blob || blob.size === 0) {
        issues.push({ id, code: "missing_blob", detail: "No file blob in OPFS" });
      }
    }
    const txt = await loadExtractedText(vault, id);
    if (txt == null || txt === "") {
      issues.push({ id, code: "missing_text", detail: "No extracted text sidecar" });
    }
    const emb = await readTextSidecar(vault, `${id}.emb.json`);
    if (emb == null || emb === "") {
      issues.push({ id, code: "missing_embedding", detail: "No embedding sidecar" });
    }
  }
  return issues;
}
