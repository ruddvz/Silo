import { describe, it, expect } from "vitest";
import { inferKindFromName, validateVaultFile, isHeicFile, MAX_VAULT_FILE_BYTES } from "./fileTypeRules.js";

describe("fileTypeRules", () => {
  it("infers image kind for heic", () => {
    expect(inferKindFromName("photo.HEIC")).toBe("image");
    expect(isHeicFile("photo.heic")).toBe(true);
  });

  it("rejects empty files", () => {
    const f = new File([], "empty.pdf", { type: "application/pdf" });
    expect(validateVaultFile(f).ok).toBe(false);
  });

  it("accepts valid pdf", () => {
    const f = new File([new Uint8Array([1, 2, 3])], "doc.pdf", { type: "application/pdf" });
    const r = validateVaultFile(f);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe("pdf");
  });

  it("rejects oversize files", () => {
    const big = { size: MAX_VAULT_FILE_BYTES + 1, name: "huge.pdf" };
    expect(validateVaultFile(big).ok).toBe(false);
  });
});
