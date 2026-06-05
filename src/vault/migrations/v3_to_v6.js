/**
 * v3 → v6: add extraction metadata fields; preserve all blobs/text.
 * Skips v4/v5 — historical gap consolidated into v6 schema.
 * @param {FileSystemDirectoryHandle} _vault
 * @param {object} data
 */
export async function migrateV3ToV6(_vault, data) {
  const entries = (Array.isArray(data.entries) ? data.entries : []).map((raw) => ({
    ...raw,
    id: String(raw.id),
    extractionStatus: raw.extractionStatus || "unknown",
    extractionError: typeof raw.extractionError === "string" ? raw.extractionError : undefined,
  }));
  return { ...data, version: 6, entries };
}
