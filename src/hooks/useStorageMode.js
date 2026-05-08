import { useState, useEffect } from "react";
import { detectStorageMode } from "../vault/storage.js";

export function useStorageMode() {
  const [mode, setMode] = useState(/** @type {'opfs' | 'localstorage-fallback' | 'memory-only' | 'checking'} */ ("checking"));

  useEffect(() => {
    let cancelled = false;
    void detectStorageMode().then((m) => {
      if (!cancelled) setMode(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return mode;
}
