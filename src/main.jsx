import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Silo from "./Silo.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Silo />
  </StrictMode>
);
