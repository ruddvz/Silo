/**
 * Derive AES-GCM key from user passphrase (PBKDF2).
 * @param {string} passphrase
 * @param {Uint8Array} salt
 */
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * @param {string} plaintext
 * @param {string} passphrase
 * @returns {Promise<string>} base64url(salt).base64url(iv+ciphertext)
 */
export async function encryptString(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext)),
  );
  const combined = new Uint8Array(salt.length + iv.length + ct.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ct, salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * @param {string} payload from encryptString
 * @param {string} passphrase
 */
export async function decryptString(payload, passphrase) {
  const combined = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ct = combined.slice(28);
  const key = await deriveKey(passphrase, salt);
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(dec);
}
