/**
 * Detect how Silo can persist data in this browser.
 * @returns {Promise<'opfs' | 'localstorage-fallback' | 'memory-only'>}
 */
export async function detectStorageMode() {
  try {
    const root = await navigator.storage?.getDirectory?.();
    if (root) return "opfs";
  } catch {
    /* unsupported or denied */
  }
  try {
    localStorage.setItem("__silo_test", "1");
    localStorage.removeItem("__silo_test");
    return "localstorage-fallback";
  } catch {
    /* private mode, blocked */
  }
  return "memory-only";
}
