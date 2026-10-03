import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "@playwright/test";

const baseUrl = process.env.DEV_PM_URL!;
const workspace = process.env.DEV_PM_WORKSPACE!;
const output = process.env.DEV_PM_BROWSER_OUTPUT!;
const source = path.join(workspace, "apps/nextjs/src/app/[locale]/boards/(content)/_client.tsx");
const original = await fs.readFile(source, "utf8");
const marker = "data-homarr-dev-benchmark-board";
if (!original.includes(`${marker}\n`)) throw new Error("Expected the unchanged board marker");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(180_000);
page.setDefaultNavigationTimeout(300_000);
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
let documentLoads = 0;
page.on("request", (request) => {
  if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentLoads++;
});
try {
  const firstPageStart = performance.now();
  const response = await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) throw new Error(`Login page status ${response?.status()}`);
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return form !== null && Object.keys(form).some((key) => key.startsWith("__reactProps$"));
  });
  const firstLoginPageMs = performance.now() - firstPageStart;
  await page.getByLabel("Username").fill("demo");
  await page.locator("#password").fill("demo");
  const boardStart = performance.now();
  await page.locator('button[type="submit"]').click();
  await page.locator(`[${marker}]:visible`).waitFor();
  await page.waitForFunction(() => document.querySelectorAll("[data-homarr-widget-ready]").length >= 8);
  const firstBoardImplementationsMountedMs = performance.now() - boardStart;
  await page.waitForLoadState("networkidle");
  const firstBoardNetworkIdleMs = performance.now() - boardStart;
  const widgetCount = await page.locator("[data-homarr-widget-ready]").count();
  const widgetErrorCount = await page.locator("[data-homarr-widget-error]").count();
  if (widgetCount !== 8 || widgetErrorCount !== 0) throw new Error("Incomplete or failed demo board");
  const originalMarkerValue = await page.locator(`[${marker}]`).getAttribute(marker);
  const hmr: { elapsedMs: number; documentReloads: number }[] = [];
  for (let iteration = 0; iteration < 5; iteration++) {
    const token = `pm-benchmark-${iteration}`;
    const loadsBefore = documentLoads;
    const start = performance.now();
    await fs.writeFile(source, original.replace(`${marker}\n`, `${marker}="${token}"\n`));
    await page.waitForFunction(
      ({ marker, token }) => document.querySelector(`[${marker}]`)?.getAttribute(marker) === token,
      { marker, token },
    );
    hmr.push({ elapsedMs: performance.now() - start, documentReloads: documentLoads - loadsBefore });
    await fs.writeFile(source, original);
    await page.waitForFunction(
      ({ marker, originalMarkerValue }) =>
        document.querySelector(`[${marker}]`)?.getAttribute(marker) === originalMarkerValue,
      { marker, originalMarkerValue },
    );
  }
  await fs.writeFile(
    output,
    JSON.stringify(
      {
        firstLoginPageMs,
        firstBoardImplementationsMountedMs,
        firstBoardNetworkIdleMs,
        widgetCount,
        widgetErrorCount,
        hmr,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
} finally {
  await fs.writeFile(source, original);
  await browser.close();
}
