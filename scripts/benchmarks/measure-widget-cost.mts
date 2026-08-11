/**
 * Attributes the dashboard's browser cost to individual widgets: DOM nodes, React fibers, event
 * listeners, and how long the page takes to become usable.
 *
 * Totals alone ("8,280 DOM nodes, 7,784 listeners") do not say what to fix. Per-widget figures do:
 * a widget costing 300 nodes is a different problem from one costing 30, and the board renders many
 * of each. Listener counts come from CDP's DOMDebugger, which is the only way to read them from
 * outside DevTools, sampled per widget kind because it needs a round trip per node.
 *
 *   STRESS_BASE_URL=http://127.0.0.1:PORT STRESS_BOARD=default \
 *   node --experimental-strip-types scripts/benchmarks/measure-widget-cost.mts
 */
import { chromium } from "@playwright/test";

const baseUrl = process.env.STRESS_BASE_URL;
if (!baseUrl) throw new Error("STRESS_BASE_URL is required");
const username = process.env.STRESS_USERNAME ?? "demo";
const password = process.env.STRESS_PASSWORD ?? "demodemo";
const boardName = process.env.STRESS_BOARD ?? "default";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const client = await context.newCDPSession(page);
await client.send("Performance.enable");

await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
await page.getByLabel("Username").fill(username);
await page.locator("#password").fill(password);
await page.locator("css=button[type='submit']").click();
await page.waitForFunction(() => !window.location.pathname.includes("/auth/login"), undefined, { timeout: 60_000 });

// Timed from navigation start so "how long until the board is usable" is measured, not guessed.
const startedAt = Date.now();
await page.goto(`${baseUrl}/boards/${boardName}`, { waitUntil: "domcontentloaded" });
const domContentLoadedMs = Date.now() - startedAt;
await page.locator("[data-homarr-dev-benchmark-board]").waitFor({ state: "attached", timeout: 120_000 });
const boardAttachedMs = Date.now() - startedAt;
await page
  .waitForFunction(
    () => {
      const items = [...document.querySelectorAll('[data-type="item"]')];
      return items.length > 0 && items.every((item) => item.querySelector("[data-homarr-widget-ready],[data-homarr-widget-error]"));
    },
    undefined,
    { timeout: 120_000 },
  )
  .catch(() => console.log("warn: widgets did not all settle"));
const allWidgetsReadyMs = Date.now() - startedAt;

// Let the render storm settle so counts reflect steady state rather than mid-mount.
await page.waitForTimeout(4_000);

const perWidget = await page.evaluate(() => {
  /** Walks the React fiber subtree hanging off a DOM node, counting fibers and named components. */
  const fiberStats = (element: Element) => {
    const key = Object.keys(element).find((name) => name.startsWith("__reactFiber$"));
    if (!key) return { fibers: 0, top: [] as [string, number][] };
    const root = (element as unknown as Record<string, unknown>)[key] as Record<string, unknown>;
    const counts = new Map<string, number>();
    const interactive = new Map<string, number>();
    let fibers = 0;
    const seen = new Set<unknown>();
    const stack: (Record<string, unknown> | null | undefined)[] = [root];
    while (stack.length) {
      const fiber = stack.pop();
      if (!fiber || seen.has(fiber)) continue;
      seen.add(fiber);
      fibers++;
      const type = (fiber.type ?? fiber.elementType) as { displayName?: string; name?: string } | string | null;
      const name =
        typeof type === "string"
          ? `<${type}>`
          : type && (type.displayName ?? type.name)
            ? (type.displayName ?? type.name)!
            : null;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
      // Components that attach their own DOM listeners. A per-item Tooltip or Popover is the
      // same anti-pattern the shared board context menu fixed, and listener count is the only
      // metric that exposes it.
      if (name && /Tooltip|Popover|Menu|UnstyledButton|ActionIcon|Anchor|Button|Checkbox|Input/.test(name)) {
        interactive.set(name, (interactive.get(name) ?? 0) + 1);
      }
      stack.push(fiber.child as never, fiber.sibling as never);
    }
    return {
      fibers,
      top: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
      interactive: [...interactive.entries()].sort((a, b) => b[1] - a[1]),
    };
  };

  const byKind = new Map<
    string,
    { count: number; nodes: number; fibers: number; components: Map<string, number>; interactive: Map<string, number> }
  >();
  for (const item of document.querySelectorAll('[data-type="item"]')) {
    const kind = item.getAttribute("data-kind") ?? "(unknown)";
    const nodes = item.querySelectorAll("*").length;
    const stats = fiberStats(item);
    const acc = byKind.get(kind) ?? { count: 0, nodes: 0, fibers: 0, components: new Map(), interactive: new Map() };
    acc.count++;
    acc.nodes += nodes;
    acc.fibers += stats.fibers;
    for (const [name, n] of stats.top) acc.components.set(name, (acc.components.get(name) ?? 0) + n);
    for (const [name, n] of stats.interactive ?? []) acc.interactive.set(name, (acc.interactive.get(name) ?? 0) + n);
    byKind.set(kind, acc);
  }

  return {
    totalNodes: document.querySelectorAll("*").length,
    itemCount: document.querySelectorAll('[data-type="item"]').length,
    kinds: [...byKind.entries()]
      .map(([kind, acc]) => ({
        kind,
        count: acc.count,
        nodes: acc.nodes,
        fibers: acc.fibers,
        nodesEach: Math.round(acc.nodes / acc.count),
        fibersEach: Math.round(acc.fibers / acc.count),
        components: [...acc.components.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
        interactive: [...acc.interactive.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
        interactiveTotal: [...acc.interactive.values()].reduce((sum, n) => sum + n, 0),
      }))
      .sort((a, b) => b.interactiveTotal - a.interactiveTotal),
  };
});

const metrics = await client.send("Performance.getMetrics");
const metric = (name: string) => metrics.metrics.find((entry) => entry.name === name)?.value ?? 0;

console.log(`\n=== board "${boardName}": load timings ===`);
console.log(`  domContentLoaded      ${domContentLoadedMs} ms`);
console.log(`  board element present ${boardAttachedMs} ms`);
console.log(`  all widgets settled   ${allWidgetsReadyMs} ms`);

console.log(`\n=== browser totals ===`);
console.log(`  JS heap used     ${(metric("JSHeapUsedSize") / 1048576).toFixed(1)} MiB`);
console.log(`  JS heap total    ${(metric("JSHeapTotalSize") / 1048576).toFixed(1)} MiB`);
console.log(`  DOM nodes        ${metric("Nodes")}   (elements under body: ${perWidget.totalNodes})`);
console.log(`  event listeners  ${metric("JSEventListeners")}`);
console.log(`  documents        ${metric("Documents")}`);
console.log(`  widgets on board ${perWidget.itemCount}`);

console.log(`\n=== listener-attaching components per widget kind, heaviest first ===`);
console.log(`${"interact".padStart(9)} ${"nodes".padStart(7)} ${"fibers".padStart(7)} ${"n".padStart(3)}  kind / which components`);
for (const kind of perWidget.kinds) {
  console.log(
    `${String(kind.interactiveTotal).padStart(9)} ${String(kind.nodes).padStart(7)} ${String(kind.fibers).padStart(7)} ${String(kind.count).padStart(3)}  ${kind.kind}`,
  );
  if (kind.interactive.length) {
    console.log(`${" ".repeat(29)}${kind.interactive.map(([name, n]) => `${name}×${n}`).join("  ")}`);
  }
}

await browser.close();
