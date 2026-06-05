import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:3456/Silo/";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(3000);
const rootHtml = await page.$eval("#root", (el) => el.innerHTML);
  const visible = await page.evaluate(() => {
    const root = document.querySelector("#root");
    if (!root || !root.firstElementChild) return false;
    if (root.querySelector(".silo-boot-fallback") && !root.querySelector(".silo-app-shell, .app-shell")) return false;
    return root.innerText.trim().length > 20;
  });
  const pageErrors = errors.filter((e) => !e.startsWith("console:"));
  const hasFatal = pageErrors.length > 0;
  console.log(JSON.stringify({ url, rootLen: rootHtml.length, visible, preview: rootHtml.slice(0, 400), errors }, null, 2));
  await browser.close();
  process.exit(visible && !hasFatal ? 0 : 1);
