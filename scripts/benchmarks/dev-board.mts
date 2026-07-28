import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { Page } from "@playwright/test";
import { chromium } from "@playwright/test";

import { countDuplicateTrpcPaths, summarize, validateBrowserMeasurement } from "./dev-benchmark-lib.mts";

type BoardMeasurement = {
  boardReadyMs: number;
  domContentLoadedMs: number;
  firstInteractionMs: number;
  pageErrors: string[];
  responseStatus: number | null;
  trpcDuplicateRequestCount: number;
  trpcRequestCount: number;
};

const root = path.resolve(import.meta.dirname, "../..");
const argumentsSet = new Set(process.argv.slice(2));
const smokeOnly = argumentsSet.has("--smoke");
const iterations = Number(process.env.DEV_BENCHMARK_ITERATIONS ?? 7);
const outputDirectory = path.resolve(
  process.env.DEV_BENCHMARK_OUTPUT_DIR ?? path.join(root, "benchmark-results", "dev"),
);
const boardUrl = process.env.DEV_BENCHMARK_BOARD_URL;
const storageStatePath = process.env.DEV_BENCHMARK_STORAGE_STATE;
const readinessUrl = process.env.DEV_BENCHMARK_READINESS_URL ?? "http://127.0.0.1:3000/api/health/ready";
const boardSelector = "[data-homarr-dev-benchmark-board]";
const interactionSelector = '[data-homarr-dev-benchmark-interaction="search"]';
const spotlightSelector = "[data-homarr-dev-benchmark-spotlight]";

if (!Number.isInteger(iterations) || iterations < 7) {
  throw new Error("DEV_BENCHMARK_ITERATIONS must be an integer of at least 7");
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
    "Authenticated claim mode requires DEV_BENCHMARK_BOARD_URL and DEV_BENCHMARK_STORAGE_STATE. " +
      "Use --smoke only for the non-claimable readiness check.",
  );
}

await fs.access(storageStatePath);

const browser = await chromium.launch();
const cold: BoardMeasurement[] = [];
const warm: BoardMeasurement[] = [];

const measureBoardAsync = async (page: Page) => {
  const trpcRequests: string[] = [];
  const pageErrors: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/trpc/")) trpcRequests.push(request.url());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const startedAt = performance.now();
  const response = await page.goto(boardUrl, { waitUntil: "domcontentloaded" });
  const domContentLoadedMs = Math.round(performance.now() - startedAt);
  await page.locator(boardSelector).waitFor({ state: "visible" });
  const boardReadyMs = Math.round(performance.now() - startedAt);

  const interactionStartedAt = performance.now();
  await page.locator(interactionSelector).first().click();
  await page.locator(spotlightSelector).waitFor({ state: "visible" });
  const firstInteractionMs = Math.round(performance.now() - interactionStartedAt);

  const measurement: BoardMeasurement = {
    responseStatus: response?.status() ?? null,
    domContentLoadedMs,
    boardReadyMs,
    firstInteractionMs,
    trpcRequestCount: trpcRequests.length,
    trpcDuplicateRequestCount: countDuplicateTrpcPaths(trpcRequests),
    pageErrors,
  };
  const errors = validateBrowserMeasurement({
    responseStatus: measurement.responseStatus,
    domContentLoadedMs,
    boardHydratedMs: boardReadyMs,
    firstInteractionMs,
    error: pageErrors.length > 0 ? pageErrors.join("; ") : undefined,
  });
  if (errors.length > 0) throw new Error(errors.map((error) => `${boardUrl}: ${error}`).join("; "));

  return measurement;
};

try {
  for (let iteration = 0; iteration < iterations; iteration++) {
    const context = await browser.newContext({ storageState: storageStatePath });
    const coldPage = await context.newPage();
    cold.push(await measureBoardAsync(coldPage));
    await coldPage.close();
    const warmPage = await context.newPage();
    warm.push(await measureBoardAsync(warmPage));
    await context.close();
  }
} finally {
  await browser.close();
}

const summarizeMeasurements = (measurements: BoardMeasurement[]) => ({
  boardReady: summarize(measurements.map(({ boardReadyMs }) => boardReadyMs)),
  domContentLoaded: summarize(measurements.map(({ domContentLoadedMs }) => domContentLoadedMs)),
  firstInteraction: summarize(measurements.map(({ firstInteractionMs }) => firstInteractionMs)),
  trpcRequests: summarize(measurements.map(({ trpcRequestCount }) => trpcRequestCount)),
  duplicateTrpcRequests: summarize(measurements.map(({ trpcDuplicateRequestCount }) => trpcDuplicateRequestCount)),
});

const result = {
  kind: "authenticated-board",
  claimEligible: true,
  boardUrl,
  createdAt: new Date().toISOString(),
  environment: {
    architecture: process.arch,
    cpus: os.cpus().map(({ model }) => model),
    node: process.version,
    platform: `${process.platform} ${os.release()}`,
    sha: process.env.DEV_BENCHMARK_SHA ?? null,
  },
  iterations,
  measurements: { cold, warm },
  summary: {
    cold: summarizeMeasurements(cold),
    warm: summarizeMeasurements(warm),
  },
};
const outputPath = path.join(outputDirectory, `board-${Date.now()}.json`);
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, summary: result.summary }, null, 2));
