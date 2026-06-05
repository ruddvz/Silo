/**
 * v1 → v2: ensure manifest has explicit version and entries array.
 * Idempotent — safe to run on already-v2+ manifests.
 * @param {FileSystemDirectoryHandle} _vault
 * @param {object} data
 */
export async function migrateV1ToV2(_vault, data) {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return {
    ...data,
    version: 2,
    entries,
    migratedAt: data.migratedAt || new Date().toISOString(),
  };
}
