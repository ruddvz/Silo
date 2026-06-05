import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * GitHub Project Pages: https://<user>.github.io/<repo>/ — assets must live under /repo/.
 * Prefer explicit VITE_BASE_URL in CI; if unset, infer from GITHUB_REPOSITORY (always set on GitHub Actions).
 */
function viteBase() {
  let raw = process.env.VITE_BASE_URL;
  if ((raw == null || raw === "") && process.env.GITHUB_REPOSITORY) {
    const name = process.env.GITHUB_REPOSITORY.split("/")[1];
    if (name) raw = `/${name}/`;
  }
  if (raw == null || raw === "") return "/";
  let b = String(raw);
  if (!b.startsWith("/")) b = `/${b}`;
  if (!b.endsWith("/")) b = `${b}/`;
  return b;
}

export default defineConfig({
  base: viteBase(),
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "prompt",
      injectRegister: null,
      manifest: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,webmanifest,wasm,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["@xenova/transformers"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return "react-vendor";
          if (id.includes("node_modules/framer-motion")) return "framer";
          if (id.includes("node_modules/@orama")) return "orama";
          if (id.includes("node_modules/pdfjs-dist")) return "pdf";
          if (id.includes("node_modules/tesseract.js")) return "ocr";
          if (id.includes("node_modules/@tanstack/react-virtual")) return "virtual";
          if (id.includes("node_modules/@xenova/transformers")) return "transformers";
        },
      },
    },
  },
});
