/**
 * After `vite build` with VITE_BASE_URL set for GitHub Project Pages:
 * - Patch manifest start_url + share_target.action
 * - Add 404.html (SPA fallback for client-side routing on static hosts)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");

function normalizeBase(raw) {
  let b = raw == null || raw === "" ? "/" : String(raw);
  if (!b.startsWith("/")) b = `/${b}`;
  if (!b.endsWith("/")) b = `${b}/`;
  return b;
}

const base = normalizeBase(process.env.VITE_BASE_URL);
const rootPrefix = base === "/" ? "" : base.replace(/\/$/, "");

const manifestPath = path.join(dist, "manifest.webmanifest");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.start_url = base;
  if (manifest.icons && Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons) {
      if (typeof icon.src === "string" && icon.src.startsWith("/")) {
        icon.src = `${rootPrefix}${icon.src}`.replace(/\/{2,}/g, "/");
      }
    }
  }
  if (manifest.share_target) {
    manifest.share_target.action = `${rootPrefix}/share`.replace(/\/{2,}/g, "/");
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const indexHtml = path.join(dist, "index.html");
const notFoundHtml = path.join(dist, "404.html");
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFoundHtml);
}
