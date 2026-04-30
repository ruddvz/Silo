/**
 * @param {ArrayBuffer} buf
 * @returns {Promise<string>} hex sha-256
 */
export async function sha256Hex(buf) {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @param {File | Blob} blob
 */
export async function sha256HexFromBlob(blob) {
  return sha256Hex(await blob.arrayBuffer());
}
