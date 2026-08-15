/**
 * Counts React commits and per-component re-renders on an idle board.
 *
 * The 650 MB browser heap was mostly transient allocation, i.e. re-render churn rather
 * than retention, so the number that matters is how often components re-render while
 * nobody is touching the page. Hooks into the devtools commit callback and attributes
 * each commit to the components that actually re-rendered in it.
 *
 *   STRESS_BASE_URL=http://127.0.0.1:PORT \
 *   node --experimental-strip-types scripts/benchmarks/measure-rerenders.mts
 */
import { chromium } from "@playwright/test";

const baseUrl = process.env.STRESS_BASE_URL;
if (!baseUrl) throw new Error("STRESS_BASE_URL is required");
const username = process.env.STRESS_USERNAME ?? "demo";
const password = process.env.STRESS_PASSWORD ?? "demodemo";
const boardName = process.env.STRESS_BOARD ?? "default";
const observeMs = Number(process.env.RERENDER_OBSERVE_MS ?? 60_000);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

await context.addInitScript(() => {
  const state = {
    commits: 0,
    byComponent: new Map<string, number>(),
    roots: new Map<string, number>(),
    started: 0,
    /**
     * Whether any fiber carried `actualDuration`. React only populates it in a profiling
     * build, so on a production build every fiber fails the re-render test and the
     * attribution comes back empty — which reads as "nothing re-rendered" rather than
     * "this build cannot tell you". Tracked so the report can say which it is.
     */
    sawTimings: false,
  };
  (globalThis as unknown as Record<string, unknown>).__homarrRenderStats = state;

  const nameOf = (fiber: { type?: unknown; elementType?: unknown }) => {
    const type = (fiber.type ?? fiber.elementType) as
      | string
      | { displayName?: string; name?: string }
      | null
      | undefined;
    if (typeof type === "string") return `<${type}>`;
    if (typeof type === "function" || (type && typeof type === "object")) {
      return (
        (type as { displayName?: string; name?: string }).displayName ??
        (type as { name?: string }).name ??
        "(anonymous)"
      );
    }
    return null;
  };

  (globalThis as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    supportsFiber: true,
    inject: () => 1,
    onCommitFiberUnmount: () => undefined,
    onPostCommitFiberRoot: () => undefined,
    onCommitFiberRoot: (_id: unknown, root: { current?: unknown }) => {
      if (!state.started) return;
      state.commits++;
      // Walk only fibers React flagged as updated in this commit.
      const seen = new Set<unknown>();
      // Shallowest re-rendering component in this commit — i.e. where the update
      // entered the tree. Everything below it re-rendered as a consequence.
      let shallowest: { name: string; depth: number; fiber: Record<string, unknown> } | null = null;
      const walk = (fiber: Record<string, unknown> | null | undefined, depth: number) => {
        if (!fiber || seen.has(fiber) || depth > 2000) return;
        seen.add(fiber);
        const alternate = fiber.alternate as Record<string, unknown> | null;
        if (fiber.actualDuration !== undefined) state.sawTimings = true;
        // A fiber re-rendered if it committed new work over a previous version.
        if (alternate && fiber.actualDuration !== undefined && (fiber.actualDuration as number) > 0) {
          const name = nameOf(fiber as never);
          if (name) {
            state.byComponent.set(name, (state.byComponent.get(name) ?? 0) + 1);
            if (!shallowest || depth < shallowest.depth) shallowest = { name, depth, fiber };
          }
        }
        walk(fiber.child as never, depth + 1);
        walk(fiber.sibling as never, depth);
      };
      walk((root.current ?? null) as never, 0);
      if (shallowest) {
        const found = shallowest as { name: string; depth: number; fiber?: Record<string, unknown> };
        // Anonymous components are common; the ancestor chain identifies them.
        const chain: string[] = [];
        let up = found.fiber?.return as Record<string, unknown> | undefined;
        for (let i = 0; i < 8 && up; i++, up = up.return as Record<string, unknown> | undefined) {
          const name = nameOf(up as never);
          if (name) chain.push(name);
        }
        // At the very top the ancestor chain is empty, so describe it by what it
        // renders and which props it takes instead.
        const descendants: string[] = [];
        let down = found.fiber?.child as Record<string, unknown> | undefined;
        for (let i = 0; i < 6 && down; i++, down = down.child as Record<string, unknown> | undefined) {
          const name = nameOf(down as never);
          if (name) descendants.push(name);
        }
        const props = Object.keys((found.fiber?.memoizedProps as object) ?? {}).slice(0, 8);
        // For a Context.Provider the value's shape names the context far better
        // than a minified component name does.
        const rawValue = (found.fiber?.memoizedProps as { value?: unknown } | undefined)?.value;
        const valueShape =
          rawValue && typeof rawValue === "object"
            ? `value{${Object.keys(rawValue).slice(0, 10).join(",")}}`
            : `value:${typeof rawValue}`;
        const key =
          `${found.name} @depth${found.depth}` +
          ` props[${props.join(",")}] ${valueShape}` +
          ` > ${descendants.join(" > ")}` +
          (chain.length ? ` < ${chain.join(" < ")}` : "");
        state.roots.set(key, (state.roots.get(key) ?? 0) + 1);
      }
    },
    __start: () => {
      state.started = Date.now();
      state.commits = 0;
      state.byComponent.clear();
      state.roots.clear();
    },
  };
});

const page = await context.newPage();
await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
await page.getByLabel("Username").fill(username);
await page.locator("#password").fill(password);
await page.locator("css=button[type='submit']").click();
await page.waitForFunction(() => !window.location.pathname.includes("/auth/login"), undefined, { timeout: 60_000 });

await page.goto(`${baseUrl}/boards/${boardName}`, { waitUntil: "domcontentloaded" });
// Attached, not visible: a board with zero items renders this container hidden, and the
// empty-board case is exactly the control needed to tell shell churn from widget churn.
await page.locator("[data-homarr-dev-benchmark-board]").waitFor({ state: "attached", timeout: 120_000 });
await page
  .waitForFunction(
    () => {
      const items = [...document.querySelectorAll('[data-type="item"]')];
      // An empty board legitimately has zero items; only require settling if any exist.
      return items.every((item) => item.querySelector("[data-homarr-widget-ready],[data-homarr-widget-error]"));
    },
    undefined,
    { timeout: 120_000 },
  )
  .catch(() => console.log("warn: widgets did not all settle"));

// Let the initial render storm finish before counting steady-state churn.
await page.waitForTimeout(5_000);
await page.evaluate(() => {
  (globalThis as unknown as Record<string, { __start: () => void }>).__REACT_DEVTOOLS_GLOBAL_HOOK__.__start();
});

console.log(`observing an idle board for ${observeMs / 1000}s (no interaction)...`);
await page.waitForTimeout(observeMs);

const stats = await page.evaluate(() => {
  const state = (
    globalThis as unknown as Record<string, { commits: number; byComponent: Map<string, number>; started: number }>
  ).__homarrRenderStats as unknown as {
    commits: number;
    byComponent: Map<string, number>;
    roots: Map<string, number>;
    started: number;
    sawTimings: boolean;
  };
  return {
    commits: state.commits,
    sawTimings: (state as unknown as { sawTimings: boolean }).sawTimings,
    elapsedMs: Date.now() - state.started,
    top: [...state.byComponent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    roots: [...state.roots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
  };
});

const perMinute = (stats.commits / stats.elapsedMs) * 60_000;
console.log(
  `\ncommits while idle: ${stats.commits} over ${(stats.elapsedMs / 1000).toFixed(0)}s (${perMinute.toFixed(1)}/min)`,
);
if (!stats.sawTimings) {
  // Without this the empty tables below read as "nothing re-rendered", which is the
  // opposite of the truth when the commit count is high.
  console.log(
    `\nNO PER-COMPONENT ATTRIBUTION: this is a production React build, which does not populate` +
      `\nfiber.actualDuration. The commit count above is still valid. For attribution, build with` +
      `\n  docker build --build-arg HOMARR_PROFILING=true . -t homarr:performance`,
  );
} else {
  console.log("\nupdate entered the tree at (commit roots):");
  for (const [name, count] of stats.roots) console.log(String(count).padStart(8), ` ${name}`);
  console.log("\nre-renders by component:");
  for (const [name, count] of stats.top) console.log(String(count).padStart(8), ` ${name}`);
}
console.log(`\n${JSON.stringify({ commits: stats.commits, perMinute: Number(perMinute.toFixed(1)) })}`);
await browser.close();
