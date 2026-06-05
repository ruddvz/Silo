import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/{2,}/g, "/");
    const scope = base.endsWith("/") ? base : `${base}/`;
    const swPath = `${scope}sw.js`.replace(/\/{2,}/g, "/");
    navigator.serviceWorker.register(swPath, { scope }).catch(() => {});
  });
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
}
