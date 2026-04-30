import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Silo from "./Silo.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Silo />
  </StrictMode>
);
