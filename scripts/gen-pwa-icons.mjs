/**
 * Rasterize public/icons/icon.svg to PNGs for PWA manifest.
 * Run: node scripts/gen-pwa-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "icons", "icon.svg");
const outDir = path.join(root, "public", "icons");

const svg = fs.readFileSync(svgPath);

async function png(size, name) {
  await sharp(svg, { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 15, g: 15, b: 16, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, name));
}

/** Maskable: same icon scaled to ~72% safe zone in square */
async function maskable(size, name) {
  const inner = Math.round(size * 0.72);
  await sharp(svg, { density: 300 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: Math.floor((size - inner) / 2),
      bottom: Math.ceil((size - inner) / 2),
      left: Math.floor((size - inner) / 2),
      right: Math.ceil((size - inner) / 2),
      background: { r: 15, g: 15, b: 16, alpha: 1 },
    })
    .png()
    .toFile(path.join(outDir, name));
}

async function screenshot(w, h, name) {
  const svgBuf = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#161618"/><stop offset="100%" stop-color="#0f0f10"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="42%" text-anchor="middle" fill="#f0eff4" font-family="Georgia,serif" font-size="${Math.round(w / 14)}">Silo</text>
      <text x="50%" y="54%" text-anchor="middle" fill="#8b8a94" font-family="system-ui,sans-serif" font-size="${Math.round(w / 28)}">Private vault</text>
    </svg>`,
  );
  await sharp(svgBuf).png().toFile(path.join(root, "public", "screenshots", name));
}

await fs.promises.mkdir(path.join(root, "public", "screenshots"), { recursive: true });

await png(192, "icon-192.png");
await png(512, "icon-512.png");
await maskable(192, "icon-192-mask.png");
await maskable(512, "icon-512-mask.png");
await screenshot(1280, 800, "desktop.png");
await screenshot(390, 844, "mobile.png");

console.log("Wrote PNG icons and screenshots under public/");
