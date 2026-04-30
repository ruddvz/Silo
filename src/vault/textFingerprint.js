import { sha256Hex } from "./fileHash.js";

/**
 * Normalize note / OCR / transcript text for fuzzy duplicate detection.
 * @param {string} text
 */
export function normalizeTextForFingerprint(text) {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 12000);
}

/**
 * @param {string} text
 * @returns {Promise<string>} hex sha-256 of normalized text
 */
export async function textContentFingerprint(text) {
  const n = normalizeTextForFingerprint(text);
  const enc = new TextEncoder();
  return sha256Hex(enc.encode(n));
}
