import { useState, useEffect, useCallback } from "react";

const INTERACTION_KEY = "silo_interactions";

export function bumpMeaningfulInteraction() {
  try {
    const n = parseInt(sessionStorage.getItem(INTERACTION_KEY) || "0", 10) || 0;
    sessionStorage.setItem(INTERACTION_KEY, String(n + 1));
  } catch {
    /* storage blocked */
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      try {
        const interactions = parseInt(sessionStorage.getItem(INTERACTION_KEY) || "0", 10) || 0;
        if (interactions >= 2) setShowBanner(true);
      } catch {
        setShowBanner(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => setShowBanner(false), []);

  return { showBanner, deferredPrompt, install, dismiss };
}
