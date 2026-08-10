/**
 * Attributes idle re-render churn to individual widgets, on a production build.
 *
 * `measure-rerenders.mts` counts React commits but cannot say which component caused them:
 * attribution needs `fiber.actualDuration`, which only a React profiling build populates.
 * DOM mutations need no such thing. Every re-render that changes anything observable shows up
 * as a mutation, and the mutated node's nearest `[data-type="item"]` ancestor names the widget.
 *
 * This is what established that idle churn is widget-driven rather than app-shell driven: a
 * board with 3 items commits 0 times per minute while a 28-item board commits 76.
 *
 *   STRESS_BASE_URL=http://127.0.0.1:PORT STRESS_BOARD=default \
 *   node --experimental-strip-types scripts/benchmarks/measure-widget-churn.mts
 */
import { chromium } from "@playwright/test";

const baseUrl = process.env.STRESS_BASE_URL;
if (!baseUrl) throw new Error("STRESS_BASE_URL is required");
const username = process.env.STRESS_USERNAME ?? "demo";
const password = process.env.STRESS_PASSWORD ?? "demodemo";
const boardName = process.env.STRESS_BOARD ?? "default";
const observeMs = Number(process.env.CHURN_OBSERVE_MS ?? 45_000);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
await page.getByLabel("Username").fill(username);
await page.locator("#password").fill(password);
await page.locator("css=button[type='submit']").click();
await page.waitForFunction(() => !window.location.pathname.includes("/auth/login"), undefined, { timeout: 60_000 });

await page.goto(`${baseUrl}/boards/${boardName}`, { waitUntil: "domcontentloaded" });
await page.locator("[data-homarr-dev-benchmark-board]").waitFor({ state: "attached", timeout: 120_000 });
await page
  .waitForFunction(
    () => {
      const items = [...document.querySelectorAll('[data-type="item"]')];
      return items.every((item) => item.querySelector("[data-homarr-widget-ready],[data-homarr-widget-error]"));
    },
    undefined,
    { timeout: 120_000 },
  )
  .catch(() => console.log("warn: widgets did not all settle"));

// Let the initial render storm finish before counting steady-state churn.
await page.waitForTimeout(5_000);

const result = await page.evaluate(async (durationMs) => {
  /** Names a widget from whatever the item element carries, falling back to its classes. */
  const describe = (item: Element | null) => {
    if (!item) return "(outside any widget)";
    const attributes = [...item.attributes]
      .filter((attribute) => /kind|widget|type|id/i.test(attribute.name) && attribute.value.length < 60)
      .map((attribute) => `${attribute.name}=${attribute.value}`);
    const marker = item.querySelector("[class*='-widget'],[class*='widget-']");
    const className = marker?.className;
    const hint = typeof className === "string" ? className.split(/\s+/).find((part) => part.includes("widget")) : "";
    return `${hint ?? ""} ${attributes.join(" ")}`.trim() || "(unidentified item)";
  };

  const counts = new Map<string, number>();
  let total = 0;
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      total++;
      const node = record.target.nodeType === 1 ? (record.target as Element) : record.target.parentElement;
      const key = describe(node?.closest('[data-type="item"]') ?? null);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });

  await new Promise((resolve) => setTimeout(resolve, durationMs));
  observer.disconnect();

  return {
    total,
    itemCount: document.querySelectorAll('[data-type="item"]').length,
    byWidget: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
  };
}, observeMs);

console.log(`\nboard "${boardName}": ${result.itemCount} items, observed idle for ${observeMs / 1000}s`);
console.log(`DOM mutations while idle: ${result.total} (${((result.total / observeMs) * 60_000).toFixed(0)}/min)\n`);
console.log(`${"mutations".padStart(10)}  widget`);
for (const [name, count] of result.byWidget) console.log(`${String(count).padStart(10)}  ${name.slice(0, 100)}`);

await browser.close();
