import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:4173/Silo/";
const VIEWPORTS = [
  { name: "iphone-se", width: 375, height: 812 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "iphone-15-pro", width: 393, height: 852 },
  { name: "iphone-14-pro-max", width: 430, height: 932 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "desktop-wide", width: 1440, height: 900 },
];

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "artifacts", "visual-qa");
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const results = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "load", timeout: 30000 });
  await page.waitForSelector(".silo-app-shell, .app-shell", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const visible = await page.evaluate(() => {
    const root = document.querySelector("#root");
    if (!root) return false;
    return !!(root.querySelector(".silo-app-shell, .app-shell") && root.innerText.trim().length > 30);
  });
  const file = path.join(OUT_DIR, `${vp.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  results.push({ viewport: vp.name, visible, errors, screenshot: file });
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.visible || r.errors.length);
console.log(JSON.stringify({ base: BASE, results, failed: failed.length }, null, 2));
process.exit(failed.length ? 1 : 0);
