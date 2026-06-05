/**
 * Full-blob encryption scaffold (AES-GCM). Used when vault passphrase is active
 * and blob encryption is enabled for new writes.
 */
import { encryptString, decryptString } from "./cryptoVault.js";

export const BLOB_ENCRYPTION_MAGIC = "SILOENC1";

/**
 * @param {Blob} blob
 * @param {string} passphrase
 * @returns {Promise<Blob>}
 */
export async function encryptBlob(blob, passphrase) {
  const buf = await blob.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const payload = await encryptString(b64, passphrase);
  const wrapped = `${BLOB_ENCRYPTION_MAGIC}:${payload}`;
  return new Blob([wrapped], { type: "application/octet-stream" });
}

/**
 * @param {Blob} blob
 * @param {string} passphrase
 * @returns {Promise<Blob>}
 */
export async function decryptBlob(blob, passphrase) {
  const text = await blob.text();
  if (!text.startsWith(`${BLOB_ENCRYPTION_MAGIC}:`)) {
    throw new Error("Not an encrypted Silo blob");
  }
  const payload = text.slice(BLOB_ENCRYPTION_MAGIC.length + 1);
  const b64 = await decryptString(payload, passphrase);
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes]);
}

/** @param {Blob} blob */
export function isEncryptedBlob(blob) {
  return blob.type === "application/octet-stream" && blob.size > BLOB_ENCRYPTION_MAGIC.length;
}

/** @param {string} text */
export async function isEncryptedBlobPayload(text) {
  return text.startsWith(`${BLOB_ENCRYPTION_MAGIC}:`);
}
