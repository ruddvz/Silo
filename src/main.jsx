import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Silo from "./Silo.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/{2,}/g, "/");
    const scope = base.endsWith("/") ? base : `${base}/`;
    const swPath = `${scope}sw.js`.replace(/\/{2,}/g, "/");
    navigator.serviceWorker.register(swPath, { scope }).catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Silo />
  </StrictMode>
);
