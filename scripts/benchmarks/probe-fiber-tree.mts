/**
 * Walks the live React tree in a running Homarr board and reports which component
 * types are mounted most, what DOM they render and which props they take.
 *
 * Minified builds give heap snapshots useless names like `y`, and source maps do
 * not help because the snapshot records runtime function names. Props shape plus
 * rendered DOM identifies a component far more reliably than its mangled name.
 *
 *   STRESS_BASE_URL=http://127.0.0.1:32800 \
 *   node --experimental-strip-types scripts/benchmarks/probe-fiber-tree.mts
 */
import { chromium } from "@playwright/test";

const baseUrl = process.env.STRESS_BASE_URL;
if (!baseUrl) throw new Error("STRESS_BASE_URL is required");
const username = process.env.STRESS_USERNAME ?? "demo";
const password = process.env.STRESS_PASSWORD ?? "demodemo";
const boardName = process.env.STRESS_BOARD ?? "default";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

// React only registers its roots if the DevTools hook exists *before* it loads, so
// inject a minimal stub. Climbing from one DOM node's fiber misses roots rendered
// into separate containers (portals, modals), which undercounts the tree badly.
await context.addInitScript(() => {
  const roots = new Set();
  (globalThis as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    supportsFiber: true,
    inject: () => 1,
    onCommitFiberRoot: (_id: unknown, root: unknown) => roots.add(root),
    onCommitFiberUnmount: () => undefined,
    onPostCommitFiberRoot: () => undefined,
    __homarrRoots: roots,
  };
});

const page = await context.newPage();

await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
await page.getByLabel("Username").fill(username);
await page.locator("#password").fill(password);
await page.locator("css=button[type='submit']").click();
await page.waitForFunction(() => !window.location.pathname.includes("/auth/login"), undefined, { timeout: 60_000 });

await page.goto(`${baseUrl}/boards/${boardName}`, { waitUntil: "domcontentloaded" });
await page.locator("[data-homarr-dev-benchmark-board]").waitFor({ state: "visible", timeout: 120_000 });
await page
  .waitForFunction(
    () => {
      const items = [...document.querySelectorAll('[data-type="item"]')];
      return (
        items.length > 0 &&
        items.every(
          (i) => i.querySelector("[data-homarr-widget-ready]") || i.querySelector("[data-homarr-widget-error]"),
        )
      );
    },
    undefined,
    { timeout: 120_000 },
  )
  .catch(() => console.log("warning: not all widgets settled"));

const report = await page.evaluate(() => {
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const roots = [...(hook?.__homarrRoots ?? [])].map((root) => root.current).filter(Boolean);
  if (roots.length === 0) {
    // Fall back to climbing from a DOM node if the hook was installed too late.
    const host = document.querySelector("[data-homarr-dev-benchmark-board]") ?? document.body;
    const fiberKey = Object.keys(host).find((k) => k.startsWith("__reactFiber$"));
    if (!fiberKey) return { error: "no React fiber and no registered roots" };
    let node = host[fiberKey];
    while (node.return) node = node.return;
    roots.push(node);
  }

  const stats = new Map();
  const seen = new Set();
  const walk = (fiber, depth) => {
    if (!fiber || seen.has(fiber) || depth > 3000) return;
    seen.add(fiber);
    const type = fiber.type;
    let key;
    if (typeof type === "string") key = `<${type}>`;
    else if (typeof type === "function") key = `fn:${type.displayName || type.name || "(anonymous)"}`;
    else if (type && typeof type === "object")
      key = `obj:${type.displayName || type.$$typeof?.toString?.() || "(object)"}`;
    else key = String(type);

    let entry = stats.get(key);
    if (!entry) {
      entry = { count: 0, propKeys: new Map(), domTags: new Map(), sampleHtml: null, ownerChain: null };
      stats.set(key, entry);
    }
    entry.count++;
    if (fiber.memoizedProps && entry.count <= 60) {
      for (const p of Object.keys(fiber.memoizedProps)) entry.propKeys.set(p, (entry.propKeys.get(p) ?? 0) + 1);
    }
    // Nearest host element this component produced.
    let host = fiber;
    for (let i = 0; i < 6 && host && !(host.stateNode instanceof Element); i++) host = host.child;
    if (host?.stateNode instanceof Element) {
      const tag = host.stateNode.tagName.toLowerCase();
      entry.domTags.set(tag, (entry.domTags.get(tag) ?? 0) + 1);
      if (!entry.sampleHtml) entry.sampleHtml = host.stateNode.outerHTML.slice(0, 220);
    }
    if (!entry.ownerChain) {
      const chain = [];
      let up = fiber.return;
      for (let i = 0; i < 8 && up; i++, up = up.return) {
        const t = up.type;
        if (typeof t === "function") chain.push(t.displayName || t.name || "(anon)");
        else if (typeof t === "string") chain.push(t);
      }
      entry.ownerChain = chain;
    }

    walk(fiber.child, depth + 1);
    walk(fiber.sibling, depth);
  };
  for (const root of roots) walk(root, 0);

  const top = [...stats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 18)
    .map(([key, v]) => ({
      key,
      count: v.count,
      topProps: [...v.propKeys.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([p]) => p),
      domTags: [...v.domTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      sampleHtml: v.sampleHtml,
      ownerChain: v.ownerChain,
    }));
  return { rootCount: roots.length, totalFibers: seen.size, top };
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
