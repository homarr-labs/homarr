/**
 * Measures what off-screen rendering actually costs the browser: image requests, bytes fetched,
 * and time spent in style, layout and paint.
 *
 * DOM node counts and JS heap do not move when `content-visibility` is applied — nothing leaves the
 * DOM — so measuring those says nothing about it. What changes is whether the browser fetches,
 * decodes and rasterises content that is scrolled out of view, and decoded bitmaps are far larger
 * in memory than the files they came from.
 *
 *   STRESS_BASE_URL=http://127.0.0.1:PORT STRESS_BOARD=default \
 *   node --experimental-strip-types scripts/benchmarks/measure-board-paint.mts
 */
import { chromium } from "@playwright/test";

const baseUrl = process.env.STRESS_BASE_URL;
if (!baseUrl) throw new Error("STRESS_BASE_URL is required");
const boardName = process.env.STRESS_BOARD ?? "default";
const settleMs = Number(process.env.PAINT_SETTLE_MS ?? 10_000);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
await page.getByLabel("Username").fill(process.env.STRESS_USERNAME ?? "demo");
await page.locator("#password").fill(process.env.STRESS_PASSWORD ?? "demodemo");
await page.locator("css=button[type='submit']").click();
await page.waitForFunction(() => !window.location.pathname.includes("/auth/login"), undefined, { timeout: 60_000 });

// Count image traffic only for the board navigation, not the login page.
const images: { url: string; bytes: number }[] = [];
page.on("response", (response) => {
  const type = response.request().resourceType();
  if (type !== "image") return;
  const length = Number(response.headers()["content-length"] ?? 0);
  images.push({ url: response.url(), bytes: Number.isFinite(length) ? length : 0 });
});

const client = await context.newCDPSession(page);
await client.send("Performance.enable");

const startedAt = Date.now();
await page.goto(`${baseUrl}/boards/${boardName}`, { waitUntil: "domcontentloaded" });
await page.locator("[data-homarr-dev-benchmark-board]").waitFor({ state: "attached", timeout: 120_000 });
await page
  .waitForFunction(
    () => {
      const items = [...document.querySelectorAll('[data-type="item"]')];
      return items.length > 0 && items.every((i) => i.querySelector("[data-homarr-widget-ready],[data-homarr-widget-error]"));
    },
    undefined,
    { timeout: 120_000 },
  )
  .catch(() => console.log("warn: widgets did not all settle"));
const settledMs = Date.now() - startedAt;

// Give lazy loading and raster a chance to do (or skip) their work.
await page.waitForTimeout(settleMs);

const metrics = await client.send("Performance.getMetrics");
const metric = (name: string) => metrics.metrics.find((entry) => entry.name === name)?.value ?? 0;

const totalBytes = images.reduce((sum, image) => sum + image.bytes, 0);
const mediaImages = images.filter((image) => /image|poster|backdrop|tmdb|thetvdb|fanart|_next\/image/i.test(image.url));

console.log(`\n=== board "${boardName}" ===`);
console.log(`  all widgets settled        ${settledMs} ms`);
console.log(`  image requests             ${images.length}`);
console.log(`  of those, media artwork    ${mediaImages.length}`);
console.log(`  image bytes (declared)     ${(totalBytes / 1048576).toFixed(2)} MiB`);
console.log(`\n  time in style recalc       ${(metric("RecalcStyleDuration") * 1000).toFixed(0)} ms`);
console.log(`  time in layout             ${(metric("LayoutDuration") * 1000).toFixed(0)} ms`);
console.log(`  script duration            ${(metric("ScriptDuration") * 1000).toFixed(0)} ms`);
console.log(`  task duration              ${(metric("TaskDuration") * 1000).toFixed(0)} ms`);
console.log(`  JS heap used               ${(metric("JSHeapUsedSize") / 1048576).toFixed(1)} MiB`);
console.log(`  DOM nodes                  ${metric("Nodes")}`);
console.log(`  layout objects             ${metric("LayoutObjects")}`);

await browser.close();
