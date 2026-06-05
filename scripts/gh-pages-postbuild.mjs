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

/** Match `vite.config.js`: infer Project Pages base on GitHub Actions when unset. */
function effectiveBaseRaw() {
  let raw = process.env.VITE_BASE_URL;
  if ((raw == null || raw === "") && process.env.GITHUB_REPOSITORY) {
    const name = process.env.GITHUB_REPOSITORY.split("/")[1];
    if (name) raw = `/${name}/`;
  }
  return raw;
}

const base = normalizeBase(effectiveBaseRaw());
const rootPrefix = base === "/" ? "" : base.replace(/\/$/, "");

const manifestPath = path.join(dist, "manifest.webmanifest");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.start_url = base;
  manifest.scope = base;
  manifest.id = base;
  if (manifest.icons && Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons) {
      if (typeof icon.src === "string" && icon.src.startsWith("/")) {
        icon.src = `${rootPrefix}${icon.src}`.replace(/\/{2,}/g, "/");
      }
    }
  }
  if (manifest.screenshots && Array.isArray(manifest.screenshots)) {
    for (const shot of manifest.screenshots) {
      if (typeof shot.src === "string" && shot.src.startsWith("/")) {
        shot.src = `${rootPrefix}${shot.src}`.replace(/\/{2,}/g, "/");
      }
    }
  }
  if (manifest.share_target) {
    manifest.share_target.action = `${rootPrefix}/share`.replace(/\/{2,}/g, "/");
  }
  if (manifest.file_handlers && Array.isArray(manifest.file_handlers)) {
    for (const fh of manifest.file_handlers) {
      if (typeof fh.action !== "string") continue;
      if (fh.action === "/" || fh.action === "") {
        fh.action = base;
      } else if (fh.action.startsWith("/") && rootPrefix && !fh.action.startsWith(`${rootPrefix}/`)) {
        fh.action = `${rootPrefix}${fh.action}`.replace(/\/{2,}/g, "/");
      }
    }
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const indexHtml = path.join(dist, "index.html");
const notFoundHtml = path.join(dist, "404.html");
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFoundHtml);
}
