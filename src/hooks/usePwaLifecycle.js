import { useCallback, useEffect, useState } from "react";

/**
 * Service worker lifecycle: update detection and standalone display mode.
 */
export function usePwaLifecycle() {
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState(/** @type {ServiceWorkerRegistration | null} */ (null));

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const applyMode = () => {
      const standalone = mq.matches || (window.navigator).standalone === true;
      document.documentElement.dataset.displayMode = standalone ? "standalone" : "browser";
    };
    applyMode();
    mq.addEventListener("change", applyMode);
    return () => mq.removeEventListener("change", applyMode);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const onControllerChange = () => {
      setUpdateReady(false);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      if (reg.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
      }
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const reloadToUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  }, [registration]);

  const dismissUpdate = useCallback(() => setUpdateReady(false), []);

  return { updateReady, reloadToUpdate, dismissUpdate };
}
