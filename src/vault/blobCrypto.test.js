import { describe, it, expect } from "vitest";
import { encryptBlob, decryptBlob, BLOB_ENCRYPTION_MAGIC } from "./blobCrypto.js";

describe("blobCrypto", () => {
  it("round-trips blob encryption with passphrase", async () => {
    const original = new Blob(["hello vault"], { type: "text/plain" });
    const encrypted = await encryptBlob(original, "test-passphrase-123");
    const text = await encrypted.text();
    expect(text.startsWith(`${BLOB_ENCRYPTION_MAGIC}:`)).toBe(true);

    const decrypted = await decryptBlob(encrypted, "test-passphrase-123");
    expect(await decrypted.text()).toBe("hello vault");
  });

  it("rejects wrong passphrase", async () => {
    const original = new Blob(["secret"], { type: "application/pdf" });
    const encrypted = await encryptBlob(original, "correct-pass");
    await expect(decryptBlob(encrypted, "wrong-pass")).rejects.toThrow();
  });
});
