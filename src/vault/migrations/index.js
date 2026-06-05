import { loadRawManifest, saveManifestRaw, CURRENT_MANIFEST_VERSION } from "../manifestMeta.js";
import { migrateV1ToV2 } from "./v1_to_v2.js";
import { migrateV2ToV3 } from "./v2_to_v3.js";
import { migrateV3ToV6 } from "./v3_to_v6.js";

/** @type {Record<number, (vault: FileSystemDirectoryHandle, data: object) => Promise<object>>} */
const STEPS = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV6,
};

/**
 * Run idempotent vault manifest migrations. Snapshots raw manifest before changes.
 * @param {FileSystemDirectoryHandle} vault
 * @returns {Promise<{ version: number, entries: import("../opfs.js").VaultManifestEntry[], migrated: boolean }>}
 */
export async function runVaultMigrations(vault) {
  const raw = await loadRawManifest(vault);
  if (!raw) {
    return { version: CURRENT_MANIFEST_VERSION, entries: [], migrated: false };
  }

  let data = { ...raw };
  let version = Number(data.version) || 1;
  let migrated = false;

  if (version < CURRENT_MANIFEST_VERSION) {
    await snapshotManifestBeforeMigration(vault, raw);
  }

  while (version < CURRENT_MANIFEST_VERSION) {
    const step = STEPS[version];
    if (!step) {
      version += 1;
      data.version = version;
      migrated = true;
      continue;
    }
    const next = await step(vault, data);
    const nextVersion = Number(next.version) || version + 1;
    if (nextVersion <= version) {
      throw new Error(`Migration stuck at version ${version}`);
    }
    data = next;
    version = nextVersion;
    migrated = true;
  }

  if (migrated) {
    await saveManifestRaw(vault, data);
  }

  const entries = Array.isArray(data.entries) ? data.entries : [];
  return { version, entries, migrated };
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {object} raw
 */
async function snapshotManifestBeforeMigration(vault, raw) {
  try {
    const dir = await vault.getDirectoryHandle("snapshots", { create: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const name = `manifest-pre-migration-${stamp}.json`;
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(new Blob([JSON.stringify(raw, null, 2)], { type: "application/json" }));
    await writable.close();
  } catch (err) {
    console.warn("Could not write manifest snapshot", err);
  }
}

export { CURRENT_MANIFEST_VERSION };
