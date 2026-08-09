/**
 * Functional gate for the shared board context menu.
 *
 * A fiber count alone is not enough: an earlier attempt at this optimisation cut the
 * idle tree *and* broke right-click, which looked like a win until this ran. So the
 * saving is only reported if the menu still opens, shows real actions, closes, and
 * works on a second, different widget.
 *
 *   STRESS_BASE_URL=http://127.0.0.1:PORT \
 *   node --experimental-strip-types scripts/benchmarks/verify-context-menu.mts
 */
import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";

const baseUrl = process.env.STRESS_BASE_URL;
if (!baseUrl) throw new Error("STRESS_BASE_URL is required");
const username = process.env.STRESS_USERNAME ?? "demo";
const password = process.env.STRESS_PASSWORD ?? "demodemo";
const boardName = process.env.STRESS_BOARD ?? "default";

const failures: string[] = [];
const check = (ok: boolean, description: string) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${description}`);
  if (!ok) failures.push(description);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
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

const countFibers = (target: Page) =>
  target.evaluate(() => {
    const hook = (globalThis as unknown as Record<string, { __homarrRoots?: Set<{ current: unknown }> }>)
      .__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const roots = [...(hook?.__homarrRoots ?? [])].map((root) => root.current);
    const seen = new Set();
    const walk = (fiber: { child?: unknown; sibling?: unknown } | null, depth: number) => {
      if (!fiber || seen.has(fiber) || depth > 3000) return;
      seen.add(fiber);
      walk(fiber.child as never, depth + 1);
      walk(fiber.sibling as never, depth);
    };
    for (const root of roots) walk(root as never, 0);
    return seen.size;
  });

const dropdown = page.locator('[role="menu"]:visible, .mantine-Menu-dropdown:visible').first();

/**
 * Playwright's `click({ button: "right" })` does not produce a `contextmenu` event in
 * this setup, so it reports every build as broken — including shipped code. Dispatch
 * the event the app actually listens for instead.
 */
const rightClickItem = (index: number) =>
  page.evaluate((itemIndex) => {
    const items = [...document.querySelectorAll('[data-homarr-dev-benchmark-board] [data-type="item"]')];
    const item = items[itemIndex];
    if (!item) return false;
    const rect = item.getBoundingClientRect();
    const target = (item.querySelector("*") as HTMLElement | null) ?? (item as HTMLElement);
    target.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
        button: 2,
      }),
    );
    return true;
  }, index);

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
        items.every((item) => item.querySelector("[data-homarr-widget-ready],[data-homarr-widget-error]"))
      );
    },
    undefined,
    { timeout: 120_000 },
  )
  .catch(() => console.log("  warn: widgets did not all settle"));

const items = page.locator('[data-homarr-dev-benchmark-board] [data-type="item"]');
const itemCount = await items.count();
console.log(`board items: ${itemCount}`);

const idleFibers = await countFibers(page);
console.log(`fibers with board idle: ${idleFibers}\n`);

console.log("right-click behaviour:");
check(!(await dropdown.isVisible().catch(() => false)), "no menu is open before interacting");

await rightClickItem(0);
const openedFirst = await dropdown
  .waitFor({ state: "visible", timeout: 8_000 })
  .then(() => true)
  .catch(() => false);
check(openedFirst, "right-click opens the context menu");

const actionCount = await page.locator('[role="menu"]:visible [role="menuitem"], .mantine-Menu-item:visible').count();
check(actionCount > 0, `menu contains actions (found ${actionCount})`);

await page.keyboard.press("Escape");
const closed = await dropdown
  .waitFor({ state: "hidden", timeout: 5_000 })
  .then(() => true)
  .catch(() => false);
check(closed, "Escape closes the menu");

// A shared menu has to re-target; a per-item menu would trivially pass the first case.
if (itemCount > 1) {
  await rightClickItem(1);
  const openedSecond = await dropdown
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  check(openedSecond, "right-click on a second widget re-opens the menu");
  await page.keyboard.press("Escape").catch(() => undefined);
  await dropdown.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
}

const afterFibers = await countFibers(page);
console.log(
  `\nfibers after opening/closing menus: ${afterFibers} (delta ${afterFibers - idleFibers >= 0 ? "+" : ""}${afterFibers - idleFibers})`,
);
check(afterFibers < idleFibers * 1.5, "tree did not balloon after using the menu");

console.log(`\n${failures.length === 0 ? "ALL CHECKS PASSED" : `${failures.length} CHECK(S) FAILED`}`);
console.log(JSON.stringify({ itemCount, idleFibers, afterFibers, failures }, null, 2));
await browser.close();
if (failures.length > 0) process.exitCode = 1;
