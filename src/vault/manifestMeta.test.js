import { describe, it, expect } from "vitest";
import { normalizeEntry, CURRENT_MANIFEST_VERSION } from "./manifestMeta.js";
import { migrateV1ToV2 } from "./migrations/v1_to_v2.js";
import { migrateV2ToV3 } from "./migrations/v2_to_v3.js";
import { migrateV3ToV6 } from "./migrations/v3_to_v6.js";

describe("normalizeEntry", () => {
  it("infers pdf kind from filename", () => {
    const e = normalizeEntry({ id: 1, name: "doc.pdf", tag: "Tax", createdAt: "2024-01-01", sizeBytes: 100 });
    expect(e.kind).toBe("pdf");
    expect(e.id).toBe("1");
    expect(e.storage).toBe("opfs");
  });

  it("infers image kind including heic", () => {
    const e = normalizeEntry({ id: "x", name: "photo.HEIC", tag: "Other", createdAt: "", sizeBytes: 0 });
    expect(e.kind).toBe("image");
  });
});

describe("vault migrations", () => {
  it("v1→v2 is idempotent", async () => {
    const input = { entries: [{ id: "a", name: "f.pdf" }] };
    const once = await migrateV1ToV2(null, input);
    expect(once.version).toBe(2);
    const twice = await migrateV1ToV2(null, once);
    expect(twice.version).toBe(2);
    expect(twice.entries).toHaveLength(1);
  });

  it("v2→v3 normalizes storage and kind", async () => {
    const data = { version: 2, entries: [{ id: 5, name: "note.txt", tag: "Other" }] };
    const out = await migrateV2ToV3(null, data);
    expect(out.version).toBe(3);
    expect(out.entries[0].kind).toBe("text");
    expect(out.entries[0].id).toBe("5");
  });

  it("v3→v6 reaches current schema version", async () => {
    const data = { version: 3, entries: [{ id: "1", name: "a.pdf", kind: "pdf" }] };
    const out = await migrateV3ToV6(null, data);
    expect(out.version).toBe(CURRENT_MANIFEST_VERSION);
    expect(out.entries[0].extractionStatus).toBe("unknown");
  });
});
