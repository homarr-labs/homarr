/**
 * Rendered rows versus visible rows, per widget.
 *
 * A dashboard tile shows a handful of rows at a time, but a widget that maps over its whole result
 * set renders every row into the DOM regardless. Those off-screen rows cost nodes, fibers and heap
 * while painting nothing, and totals like "9,293 DOM nodes" never reveal it — only the ratio does.
 *
 * The row container is found as the element with the most children, which is what a mapped list
 * looks like whatever the surrounding markup. An earlier version required children to be of similar
 * height; that reported a chart's SVG groups as rows and missed the worst widget entirely, because
 * its cards vary in height.
 *
 *   STRESS_BASE_URL=http://127.0.0.1:PORT node scripts/benchmarks/measure-widget-overdraw.mjs
 */
import { chromium } from "@playwright/test";

const baseUrl = process.env.STRESS_BASE_URL;
if (!baseUrl) throw new Error("STRESS_BASE_URL is required");
const boardName = process.env.STRESS_BOARD ?? "default";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
await page.getByLabel("Username").fill(process.env.STRESS_USERNAME ?? "demo");
await page.locator("#password").fill(process.env.STRESS_PASSWORD ?? "demodemo");
await page.locator("css=button[type='submit']").click();
await page.waitForFunction(() => !window.location.pathname.includes("/auth/login"), undefined, { timeout: 60_000 });
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
await page.waitForTimeout(6_000);

const rows = await page.evaluate(() => {
  const report = [];
  for (const item of document.querySelectorAll('[data-type="item"]')) {
    const tile = item.getBoundingClientRect();
    let container = null;
    for (const element of item.querySelectorAll("*")) {
      if (!container || element.children.length > container.children.length) container = element;
    }
    if (!container || container.children.length < 4) continue;

    const children = [...container.children];
    const visible = children.filter((child) => {
      const rect = child.getBoundingClientRect();
      return rect.height > 0 && rect.bottom > tile.top && rect.top < tile.bottom;
    });
    const nodes = item.querySelectorAll("*").length;
    const perRow = nodes / children.length;
    report.push({
      kind: item.getAttribute("data-kind") ?? "?",
      rendered: children.length,
      visible: visible.length,
      nodes,
      offscreenNodes: Math.round(perRow * (children.length - visible.length)),
      images: item.querySelectorAll("img").length,
      contentPx: Math.round(container.scrollHeight),
      tilePx: Math.round(tile.height),
      contained: getComputedStyle(children[0]).contentVisibility ?? "",
    });
  }
  return report.sort((a, b) => b.offscreenNodes - a.offscreenNodes);
});

console.log(
  `\n${"nodes".padStart(6)} ${"rows".padStart(5)} ${"vis".padStart(4)} ${"offscr".padStart(7)} ${"imgs".padStart(5)} ${"tile".padStart(6)} ${"content".padStart(8)}  kind`,
);
let offscreen = 0;
for (const row of rows) {
  offscreen += row.offscreenNodes;
  console.log(
    `${String(row.nodes).padStart(6)} ${String(row.rendered).padStart(5)} ${String(row.visible).padStart(4)} ${String(row.offscreenNodes).padStart(7)} ${String(row.images).padStart(5)} ${String(row.tilePx).padStart(6)} ${String(row.contentPx).padStart(8)}  ${row.kind}${row.contained === "auto" ? "  [content-visibility: auto]" : ""}`,
  );
}
console.log(`\nDOM elements rendered for rows scrolled out of view: ~${offscreen}`);
await browser.close();
