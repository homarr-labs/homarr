import { chromium, expect } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";

function readOrigin() {
  const args = process.argv.slice(2);
  const argument = args[0];
  const diagnostic =
    "Provide exactly one --homarr-origin=http://127.0.0.1:<port> with a canonical port excluding 3100/3200";
  if (args.length !== 1 || !argument?.startsWith("--homarr-origin=")) throw new Error(diagnostic);
  const origin = argument.slice("--homarr-origin=".length);
  if (!/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(origin)) throw new Error(diagnostic);
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error(diagnostic);
  }
  const port = Number(url.port);
  if (
    url.origin !== origin ||
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username !== "" ||
    url.password !== "" ||
    !/^[0-9]+$/.test(url.port) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    port === 3100 ||
    port === 3200
  ) {
    throw new Error(diagnostic);
  }
  return origin;
}

const origin = readOrigin();
const failures: string[] = [];
const errors: unknown[] = [];
const contexts: BrowserContext[] = [];
const browser = await chromium.launch({ headless: true });

try {
  try {
    for (let index = 0; index < 2; index++) {
      const context = await browser.newContext({ serviceWorkers: "block" });
      contexts.push(context);
      await context.route("**/*", async (route) => {
        let url: URL | undefined;
        try {
          url = new URL(route.request().url());
        } catch {
          failures.push("Blocked malformed request URL");
        }
        if (url && url.protocol === "http:" && url.origin === origin && !url.username && !url.password) {
          try {
            await route.continue();
          } catch {
            failures.push("Approved-origin request continuation failed");
          }
          return;
        }
        if (url) failures.push("Blocked request outside the approved credential-free HTTP origin");
        try {
          await route.abort("blockedbyclient");
        } catch {
          failures.push("Blocked request abort failed");
        }
      });
      await context.routeWebSocket("**/*", async (socket) => {
        failures.push("Blocked WebSocket attempt: public browser fixture denies all WebSockets");
        try {
          await socket.close({ code: 1008, reason: "Public browser fixture denies WebSockets" });
        } catch {
          failures.push("Blocked WebSocket close failed");
        }
      });
    }
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    for (const page of pages) {
      page.on("pageerror", (error) => failures.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" && /hydration|react error|mismatch/i.test(message.text()))
          failures.push(message.text());
      });
    }
    const responses = await Promise.all(
      pages.map((page, index) => page.goto(`${origin}/about/runtime/foundation?view=${index ? "details" : "summary"}`)),
    );
    for (const response of responses) expect(response?.status()).toBe(200);
    for (const page of pages) await expect(page.locator("html")).toHaveAttribute("data-hydration", "ready");
    await expect(pages[0].locator("[data-runtime-view]")).toHaveAttribute("data-runtime-view", "summary");
    await expect(pages[1].locator("[data-runtime-view]")).toHaveAttribute("data-runtime-view", "details");
    const requestIds = await Promise.all(
      pages.map((page) => page.locator("[data-request-id]").getAttribute("data-request-id")),
    );
    expect(requestIds[0]).not.toBe(requestIds[1]);
    const page = pages[0];
    await page.getByRole("link", { name: "Switch view" }).click();
    await expect(page.locator("[data-runtime-view]")).toHaveAttribute("data-runtime-view", "details");
    expect(await page.locator("[data-request-id]").getAttribute("data-request-id")).toBe(requestIds[0]);
    await page.getByRole("link", { name: "Application status", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Application status", exact: true })).toBeVisible();
    await expect(page.locator("[data-about-layout]")).toHaveCount(0);
    await page.getByRole("link", { name: "About", exact: true }).click();
    await expect(page.getByRole("heading", { name: "About Homarr" })).toBeVisible();
    await expect(page.locator("[data-about-layout]")).toHaveCount(1);
    await page.getByRole("link", { name: "Management", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    await page.getByRole("link", { name: "Return home", exact: true }).click();
    await expect(page.getByText("Disposable display preview", { exact: true })).toBeVisible();
    const reloaded = await page.reload();
    expect(reloaded?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("data-hydration", "ready");
    const denied = await page.goto(`${origin}/manage`);
    expect(denied?.status()).toBe(401);
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-hydration", "ready");
    const missing = await page.goto(`${origin}/about/runtime/missing`);
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-hydration", "ready");
  } catch (error) {
    errors.push(error);
  } finally {
    const closures = await Promise.allSettled(contexts.map((context) => context.close()));
    for (const closure of closures) {
      if (closure.status === "rejected") errors.push(closure.reason);
    }
  }
} finally {
  try {
    await browser.close();
  } catch (error) {
    errors.push(error);
  }
}

try {
  expect(failures).toEqual([]);
} catch (error) {
  errors.push(error);
}
if (errors.length > 0) throw new AggregateError(errors, "Public browser validation or cleanup failed");
console.log("Public browser SSR, hydration, navigation, denial and request isolation passed");
