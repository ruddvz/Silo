import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Silo from "./Silo.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swPath = new URL("sw.js", import.meta.env.BASE_URL).pathname;
    navigator.serviceWorker.register(swPath, { scope: import.meta.env.BASE_URL }).catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Silo />
  </StrictMode>
);
