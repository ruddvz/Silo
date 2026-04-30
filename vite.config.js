import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** GitHub Project Pages: https://<user>.github.io/<repo>/ — set VITE_BASE_URL in CI */
function viteBase() {
  const raw = process.env.VITE_BASE_URL;
  if (raw == null || raw === "") return "/";
  let b = String(raw);
  if (!b.startsWith("/")) b = `/${b}`;
  if (!b.endsWith("/")) b = `${b}/`;
  return b;
}

export default defineConfig({
  base: viteBase(),
  plugins: [react()],
  optimizeDeps: {
    exclude: ["@xenova/transformers"],
  },
});
