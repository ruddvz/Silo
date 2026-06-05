/** @typedef {"pdf" | "text" | "audio" | "file" | "image"} VaultKind */

export const MAX_VAULT_FILE_BYTES = 100 * 1024 * 1024;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i;
const AUDIO_EXT = /\.(m4a|aac|mp3|wav|webm|ogg|opus|flac)$/i;

/** @param {string} name */
export function inferKindFromName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (IMAGE_EXT.test(lower)) return "image";
  if (AUDIO_EXT.test(lower)) return "audio";
  if (/\.(txt|md)$/i.test(lower)) return "text";
  return "file";
}

/** @param {string} name */
export function isHeicFile(name) {
  return /\.(heic|heif)$/i.test(String(name || ""));
}

/**
 * @param {File} file
 * @returns {{ ok: boolean, kind?: VaultKind, error?: string, warning?: string }}
 */
export function validateVaultFile(file) {
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size <= 0) {
    return { ok: false, error: "File is empty." };
  }
  if (file.size > MAX_VAULT_FILE_BYTES) {
    return { ok: false, error: `File exceeds ${Math.round(MAX_VAULT_FILE_BYTES / (1024 * 1024))} MB limit.` };
  }
  const kind = inferKindFromName(file.name);
  let warning;
  if (isHeicFile(file.name)) {
    warning = "HEIC stored safely; preview/OCR may be limited on this browser.";
  }
  return { ok: true, kind, warning };
}

/** Safari/iOS does not support File System Access linking. */
export function supportsLinkFromDisk() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return false;
  return typeof window.showOpenFilePicker === "function";
}
