import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { BrowserContext, Page } from "@playwright/test";
import { chromium } from "@playwright/test";

import { countDuplicateTrpcPaths, summarize, validateBrowserMeasurement } from "./dev-benchmark-lib.mts";

type BoardMeasurement = {
  boardMountedMs: number;
  domContentLoadedMs: number;
  postIdleWarmInteractionMs: number;
  widgetCount: number;
  widgetsReadyMs: number;
  pageErrors: string[];
  responseStatus: number | null;
  trpcDuplicateRequestCount: number;
  trpcRequestCount: number;
  webSocketCount: number;
  performance: {
    cls: number;
    decodedScriptBytes: number;
    jsHeapBytes: number | null;
    lcpMs: number | null;
    longTaskCount: number;
    longTaskTotalMs: number;
    resourceCount: number;
    transferBytes: number;
  };
};

const root = path.resolve(import.meta.dirname, "../..");
const argumentsSet = new Set(process.argv.slice(2));
const smokeOnly = argumentsSet.has("--smoke");
const iterations = Number(process.env.DEV_BENCHMARK_ITERATIONS ?? 10);
const spotlightIdleMs = Number(process.env.DEV_BENCHMARK_SPOTLIGHT_IDLE_MS ?? 2_500);
const outputDirectory = path.resolve(
  process.env.DEV_BENCHMARK_OUTPUT_DIR ?? path.join(root, "benchmark-results", "dev"),
);
const boardUrl = process.env.DEV_BENCHMARK_BOARD_URL;
const storageStatePath = process.env.DEV_BENCHMARK_STORAGE_STATE;
const readinessUrl = process.env.DEV_BENCHMARK_READINESS_URL ?? "http://127.0.0.1:3000/api/health/ready";
const boardSelector = "[data-homarr-dev-benchmark-board]";
const interactionSelector = '[data-homarr-dev-benchmark-interaction="search"]';
const spotlightSelector = "[data-homarr-dev-benchmark-spotlight]";
const spotlightFeedbackSelector =
  "[data-homarr-dev-benchmark-spotlight-feedback], [data-homarr-dev-benchmark-spotlight]";

if (!Number.isInteger(iterations) || iterations < 7) {
  throw new Error("DEV_BENCHMARK_ITERATIONS must be an integer of at least 7");
}
if (!Number.isFinite(spotlightIdleMs) || spotlightIdleMs < 0) {
  throw new Error("DEV_BENCHMARK_SPOTLIGHT_IDLE_MS must be non-negative");
}

await fs.mkdir(outputDirectory, { recursive: true });

if (smokeOnly) {
  const measurements: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    const startedAt = performance.now();
    const response = await fetch(readinessUrl);
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`Readiness smoke received HTTP ${response.status}`);
    measurements.push(Math.round(performance.now() - startedAt));
  }

  const result = {
    kind: "readiness-smoke",
    claimEligible: false,
    reason: "Readiness checks do not exercise the browser or dashboard graph",
    url: readinessUrl,
    iterations,
    summary: summarize(measurements),
  };
  const outputPath = path.join(outputDirectory, `smoke-${Date.now()}.json`);
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, result }, null, 2));
  process.exit(0);
}

if (!boardUrl || !storageStatePath) {
  throw new Error(
    "Authenticated mode requires DEV_BENCHMARK_BOARD_URL and DEV_BENCHMARK_STORAGE_STATE. " +
      "Use --smoke only for the non-claimable readiness check.",
  );
}

await fs.access(storageStatePath);

const installPerformanceObservers = () => {
  const state = { cls: 0, lcpMs: null as number | null, longTaskCount: 0, longTaskTotalMs: 0 };
  Object.defineProperty(window, "homarrBenchmarkVitals", { value: state, configurable: true });

  if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
    new PerformanceObserver((list) => {
      const latest = list.getEntries().at(-1);
      if (latest) state.lcpMs = latest.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  }
  if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput) state.cls += shift.value ?? 0;
      }
    }).observe({ type: "layout-shift", buffered: true });
  }
  if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.longTaskCount += 1;
        state.longTaskTotalMs += entry.duration;
      }
    }).observe({ type: "longtask", buffered: true });
  }
};

const createContextAsync = async (): Promise<BrowserContext> => {
  const context = await browser.newContext({ storageState: storageStatePath });
  await context.addInitScript(installPerformanceObservers);
  return context;
};

const browser = await chromium.launch();
const freshContext: BoardMeasurement[] = [];
const warmPage: BoardMeasurement[] = [];
const coldInteractionSamples: Array<{ feedbackMs: number; readyMs: number }> = [];

const measureBoardAsync = async (page: Page) => {
  const trpcRequests: string[] = [];
  const pageErrors: string[] = [];
  let webSocketCount = 0;

  page.on("request", (request) => {
    if (request.url().includes("/api/trpc/")) trpcRequests.push(request.url());
  });
  page.on("websocket", () => {
    webSocketCount += 1;
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const startedAt = performance.now();
  const response = await page.goto(boardUrl, { waitUntil: "domcontentloaded" });
  const domContentLoadedMs = Math.round(performance.now() - startedAt);
  await page.locator(boardSelector).waitFor({ state: "visible" });
  const boardMountedMs = Math.round(performance.now() - startedAt);

  await page.waitForFunction(
    (selector) => {
      const board = document.querySelector(selector);
      if (!board) return false;
      const widgetCount = board.querySelectorAll('[data-type="item"]').length;
      return widgetCount > 0 && board.querySelectorAll("[data-homarr-widget-ready]").length === widgetCount;
    },
    boardSelector,
    { timeout: 30_000 },
  );
  const widgetsReadyMs = Math.round(performance.now() - startedAt);
  const widgetCount = await page.locator(`${boardSelector} [data-type="item"]`).count();

  await page.waitForTimeout(spotlightIdleMs);
  const warmInteractionStartedAt = performance.now();
  await page.locator(`${interactionSelector}:visible`).click();
  await page.locator(spotlightSelector).waitFor({ state: "visible" });
  const postIdleWarmInteractionMs = Math.round(performance.now() - warmInteractionStartedAt);
  await page.keyboard.press("Escape");
  await page.locator(spotlightSelector).waitFor({ state: "hidden" });

  const browserPerformance = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const vitals = (
      window as Window & {
        homarrBenchmarkVitals?: {
          cls: number;
          lcpMs: number | null;
          longTaskCount: number;
          longTaskTotalMs: number;
        };
      }
    ).homarrBenchmarkVitals;
    const memory = performance as Performance & { memory?: { usedJSHeapSize: number } };
    return {
      cls: Number((vitals?.cls ?? 0).toFixed(4)),
      decodedScriptBytes: resources
        .filter((resource) => resource.initiatorType === "script")
        .reduce((total, resource) => total + resource.decodedBodySize, 0),
      jsHeapBytes: memory.memory?.usedJSHeapSize ?? null,
      lcpMs: vitals?.lcpMs === null || vitals?.lcpMs === undefined ? null : Math.round(vitals.lcpMs),
      longTaskCount: vitals?.longTaskCount ?? 0,
      longTaskTotalMs: Math.round(vitals?.longTaskTotalMs ?? 0),
      resourceCount: resources.length,
      transferBytes: resources.reduce((total, resource) => total + resource.transferSize, 0),
    };
  });

  const measurement: BoardMeasurement = {
    responseStatus: response?.status() ?? null,
    domContentLoadedMs,
    boardMountedMs,
    widgetsReadyMs,
    widgetCount,
    postIdleWarmInteractionMs,
    trpcRequestCount: trpcRequests.length,
    trpcDuplicateRequestCount: countDuplicateTrpcPaths(trpcRequests),
    webSocketCount,
    performance: browserPerformance,
    pageErrors,
  };
  const errors = validateBrowserMeasurement({
    responseStatus: measurement.responseStatus,
    domContentLoadedMs,
    boardHydratedMs: boardMountedMs,
    widgetsReadyMs,
    widgetCount,
    postIdleWarmInteractionMs,
    error: pageErrors.length > 0 ? pageErrors.join("; ") : undefined,
  });
  if (errors.length > 0) throw new Error(errors.map((error) => `${boardUrl}: ${error}`).join("; "));

  return measurement;
};

const measureColdInteractionAsync = async (page: Page) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(boardUrl, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) {
    throw new Error(`Cold-interaction board returned HTTP ${String(response?.status() ?? "none")}`);
  }
  await page.locator(boardSelector).waitFor({ state: "visible" });
  const interactionStartedAt = performance.now();
  await page.locator(`${interactionSelector}:visible`).click();
  await page.locator(spotlightFeedbackSelector).waitFor({ state: "visible" });
  const feedbackMs = Math.round(performance.now() - interactionStartedAt);
  await page.locator(spotlightSelector).waitFor({ state: "visible" });
  const readyMs = Math.round(performance.now() - interactionStartedAt);
  if (pageErrors.length > 0) throw new Error(`Cold-interaction page errors: ${pageErrors.join("; ")}`);
  return { feedbackMs, readyMs };
};

try {
  for (let iteration = 0; iteration < iterations; iteration++) {
    const context = await createContextAsync();
    const firstPage = await context.newPage();
    freshContext.push(await measureBoardAsync(firstPage));
    await firstPage.close();
    const secondPage = await context.newPage();
    warmPage.push(await measureBoardAsync(secondPage));
    await context.close();

    const coldContext = await createContextAsync();
    await coldContext.addInitScript(() => {
      // Measure the actual first-open path instead of racing the intentional
      // requestIdleCallback prefetch used during normal idle time.
      Object.defineProperty(window, "requestIdleCallback", { value: () => 0, configurable: true });
      Object.defineProperty(window, "cancelIdleCallback", { value: () => undefined, configurable: true });
    });
    const coldPage = await coldContext.newPage();
    coldInteractionSamples.push(await measureColdInteractionAsync(coldPage));
    await coldContext.close();
  }
} finally {
  await browser.close();
}

const summarizeMeasurements = (measurements: BoardMeasurement[]) => ({
  boardMountedMs: summarize(measurements.map(({ boardMountedMs }) => boardMountedMs)),
  widgetsReadyMs: summarize(measurements.map(({ widgetsReadyMs }) => widgetsReadyMs)),
  domContentLoadedMs: summarize(measurements.map(({ domContentLoadedMs }) => domContentLoadedMs)),
  postIdleWarmInteractionMs: summarize(measurements.map(({ postIdleWarmInteractionMs }) => postIdleWarmInteractionMs)),
  lcpMs: summarize(measurements.map(({ performance: browserPerformance }) => browserPerformance.lcpMs)),
  cls: summarize(measurements.map(({ performance: browserPerformance }) => browserPerformance.cls)),
  longTaskTotalMs: summarize(
    measurements.map(({ performance: browserPerformance }) => browserPerformance.longTaskTotalMs),
  ),
  decodedScriptBytes: summarize(
    measurements.map(({ performance: browserPerformance }) => browserPerformance.decodedScriptBytes),
  ),
  transferBytes: summarize(measurements.map(({ performance: browserPerformance }) => browserPerformance.transferBytes)),
  jsHeapBytes: summarize(measurements.map(({ performance: browserPerformance }) => browserPerformance.jsHeapBytes)),
  trpcRequests: summarize(measurements.map(({ trpcRequestCount }) => trpcRequestCount)),
  duplicateTrpcRequests: summarize(measurements.map(({ trpcDuplicateRequestCount }) => trpcDuplicateRequestCount)),
});

const sha = process.env.DEV_BENCHMARK_SHA ?? null;
const image = process.env.DEV_BENCHMARK_IMAGE ?? null;
const runtime = process.env.DEV_BENCHMARK_RUNTIME ?? "development";
const claimEligible = false;
const result = {
  kind: "authenticated-board",
  claimEligible,
  claimIneligibleReasons: [
    "served revision and production runtime are self-reported, not independently verified",
    ...(runtime === "production" ? [] : ["runtime is not production"]),
    ...(sha ? [] : ["DEV_BENCHMARK_SHA is missing"]),
    ...(image ? [] : ["DEV_BENCHMARK_IMAGE is missing"]),
  ],
  boardUrl,
  createdAt: new Date().toISOString(),
  environment: {
    architecture: process.arch,
    cpus: os.cpus().map(({ model }) => model),
    image,
    node: process.version,
    platform: `${process.platform} ${os.release()}`,
    runtime,
    sha,
  },
  iterations,
  spotlightIdleMs,
  measurements: { freshContext, warmPage, coldInteractionSamples },
  summary: {
    coldInteractionFeedbackMs: summarize(coldInteractionSamples.map(({ feedbackMs }) => feedbackMs)),
    coldInteractionReadyMs: summarize(coldInteractionSamples.map(({ readyMs }) => readyMs)),
    freshContext: summarizeMeasurements(freshContext),
    warmPage: summarizeMeasurements(warmPage),
  },
};
const outputPath = path.join(outputDirectory, `board-${Date.now()}.json`);
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, claimEligible, summary: result.summary }, null, 2));
