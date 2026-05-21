import { useState, useEffect, useCallback } from "react";

const KEY = "silo_lists_theme";

/** @returns {'light' | 'dark' | 'system'} */
function readStored() {
  const v = localStorage.getItem(KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function useTheme() {
  const [mode, setModeState] = useState(readStored);

  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;

  useEffect(() => {
    document.documentElement.dataset.listsTheme = resolved;
    return () => {
      delete document.documentElement.dataset.listsTheme;
    };
  }, [resolved]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => {
      if (mode === "system") {
        document.documentElement.dataset.listsTheme = mq.matches ? "dark" : "light";
      }
    };
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [mode]);

  const setMode = useCallback((next) => {
    setModeState(next);
    localStorage.setItem(KEY, next);
  }, []);

  return { mode, setMode, resolved };
}
