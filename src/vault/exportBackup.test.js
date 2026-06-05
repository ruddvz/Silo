import { describe, it, expect } from "vitest";
import { validateVaultZip } from "../vault/exportBackup.js";

describe("validateVaultZip", () => {
  it("rejects missing manifest", () => {
    expect(validateVaultZip({ manifest: null, files: {} }).ok).toBe(false);
  });

  it("rejects empty entries", () => {
    expect(validateVaultZip({ manifest: { entries: [] }, files: { "blobs/x": new Uint8Array([1]) } }).ok).toBe(false);
  });

  it("accepts valid structure", () => {
    const r = validateVaultZip({
      manifest: { entries: [{ id: "1", name: "a.pdf" }] },
      files: { "blobs/1_a.pdf": new Uint8Array([1, 2]) },
    });
    expect(r.ok).toBe(true);
    expect(r.entryCount).toBe(1);
  });
});
