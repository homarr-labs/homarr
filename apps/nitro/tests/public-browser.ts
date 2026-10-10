import { chromium, expect } from "@playwright/test";

const origin = "http://127.0.0.1:3200";
const browser = await chromium.launch({ headless: true });

try {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const failures: string[] = [];
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
  await expect(page.getByText("Product features are not installed yet.", { exact: false })).toBeVisible();
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
  expect(failures).toEqual([]);
  await Promise.all(contexts.map((context) => context.close()));
  console.log("Public browser SSR, hydration, navigation, denial and request isolation passed");
} finally {
  await browser.close();
}
