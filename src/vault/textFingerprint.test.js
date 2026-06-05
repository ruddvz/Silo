import { describe, it, expect } from "vitest";
import { normalizeTextForFingerprint, textContentFingerprint } from "./textFingerprint.js";
import { sha256Hex } from "./fileHash.js";

describe("textFingerprint", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeTextForFingerprint("  Hello   WORLD!  ")).toBe("hello world");
  });

  it("produces stable fingerprint", async () => {
    const a = await textContentFingerprint("Rent due April 5");
    const b = await textContentFingerprint("rent   due april 5");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe("sha256Hex", () => {
  it("hashes buffer to hex", async () => {
    const enc = new TextEncoder();
    const hash = await sha256Hex(enc.encode("silo"));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
