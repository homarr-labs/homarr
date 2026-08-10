/**
 * Rendered rows versus visible rows, per widget.
 *
 * A dashboard tile shows a handful of rows at a time, but a widget that maps over its whole result
 * set renders every row into the DOM regardless. Those off-screen rows cost nodes, fibers and heap
 * while painting nothing, and totals like "9,293 DOM nodes" never reveal it — only the ratio does.
 *
 * Rows are found by looking for the deepest container whose children are numerous and similarly
 * sized, rather than by guessing at the markup: widgets nest differently and a fixed selector finds
 * nothing.
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
await page.waitForTimeout(8_000);

const result = await page.evaluate(() => {
  const report = [];
  for (const item of document.querySelectorAll('[data-type="item"]')) {
    const kind = item.getAttribute("data-kind") ?? "?";
    const tile = item.getBoundingClientRect();

    // The repeated-row container is whichever element has the most children that are all roughly
    // the same height — that is what a mapped list looks like regardless of wrapper markup.
    let best = null;
    for (const element of item.querySelectorAll("*")) {
      const children = [...element.children];
      if (children.length < 4) continue;
      const heights = children.map((c) => c.getBoundingClientRect().height).filter((h) => h > 4);
      if (heights.length < 4) continue;
      const min = Math.min(...heights);
      const max = Math.max(...heights);
      if (max > min * 3) continue; // not a uniform list
      if (!best || children.length > best.rows) {
        best = { rows: children.length, container: element };
      }
    }
    if (!best) continue;

    const rows = [...best.container.children];
    const visible = rows.filter((row) => {
      const r = row.getBoundingClientRect();
      return r.bottom > tile.top && r.top < tile.bottom && r.height > 0;
    });
    const nodes = item.querySelectorAll("*").length;
    report.push({
      kind,
      rows: rows.length,
      visibleRows: visible.length,
      nodes,
      nodesPerRow: Math.round(nodes / rows.length),
      wastedNodes: Math.round((nodes / rows.length) * (rows.length - visible.length)),
    });
  }
  return report.sort((a, b) => b.wastedNodes - a.wastedNodes);
});

console.log(
  `${"nodes".padStart(6)} ${"rows".padStart(5)} ${"vis".padStart(4)} ${"n/row".padStart(6)} ${"offscreen".padStart(10)}  kind`,
);
let wasted = 0;
for (const r of result) {
  wasted += r.wastedNodes;
  console.log(
    `${String(r.nodes).padStart(6)} ${String(r.rows).padStart(5)} ${String(r.visibleRows).padStart(4)} ${String(r.nodesPerRow).padStart(6)} ${String(r.wastedNodes).padStart(10)}  ${r.kind}`,
  );
}
console.log(`\nDOM elements rendered for rows that are scrolled out of view: ~${wasted}`);
await browser.close();
