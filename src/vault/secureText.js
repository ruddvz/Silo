import { persistExtractedText } from "./opfs.js";
import { encryptString, decryptString } from "./cryptoVault.js";

const ENC_PREFIX = "ENC1:";

/**
 * @param {string | null | undefined} passphrase
 */
function active(passphrase) {
  return typeof passphrase === "string" && passphrase.length >= 8;
}

/**
 * @param {FileSystemDirectoryHandle} vault
 * @param {string} id
 * @param {string} text
 * @param {string | null | undefined} passphrase
 */
export async function persistSecureText(vault, id, text, passphrase) {
  if (!active(passphrase)) {
    await persistExtractedText(vault, id, text);
    return;
  }
  const enc = await encryptString(text, passphrase);
  await persistExtractedText(vault, id, `${ENC_PREFIX}${enc}`);
}

/**
 * @param {string | null} raw
 * @param {string | null | undefined} passphrase
 */
export async function decodeStoredText(raw, passphrase) {
  if (raw == null) return "";
  if (!active(passphrase) || !raw.startsWith(ENC_PREFIX)) return raw;
  try {
    return await decryptString(raw.slice(ENC_PREFIX.length), passphrase);
  } catch {
    return "[Unlock failed — wrong passphrase?]";
  }
}
