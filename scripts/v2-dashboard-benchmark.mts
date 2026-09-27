import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";

const execFileAsync = promisify(execFile);
const images = {
  before: process.env.V2_BEFORE_IMAGE ?? "homarr:v2-board-before-872e9acd",
  after: process.env.V2_AFTER_IMAGE ?? "homarr:v2-board-after-stream",
};
const rounds = Number(process.env.V2_BENCHMARK_ROUNDS ?? "5");
const outputPath = process.env.V2_BENCHMARK_OUTPUT ?? "benchmark-results/v2-dashboard-metrics.json";
if (!Number.isInteger(rounds) || rounds < 2) throw new Error("V2_BENCHMARK_ROUNDS must be at least 2");

const runId = `v2-board-bench-${randomBytes(4).toString("hex")}`;
const encryptionKey = randomBytes(32).toString("hex");
const fixtures = ["before", "after"] as const;
type Side = (typeof fixtures)[number];
const sides: readonly Side[] = process.env.V2_BENCHMARK_AFTER_ONLY === "true" ? ["after"] : fixtures;
type Runtime = { name: string; volume: string; url: string; image: string };
type Memory = { cgroupBytes: number; anonymousBytes: number; fileBytes: number; redisBytes: number | null };
type Sample = {
  ttfbMs: number;
  domContentLoadedMs: number;
  boardVisibleMs: number;
  widgetsMountedMs: number;
  appAndBookmarkDataMs: number;
  fcpMs: number | null;
  lcpMs: number | null;
  lcpElement: { tag: string | null; className: string | null; text: string | null } | null;
  widgetCount: number;
  browserTrpcRequests: number;
  browserTrpcOperations: number;
  longTaskMs: number;
};

const docker = async (...args: string[]) =>
  (await execFileAsync("docker", args, { maxBuffer: 4 * 1024 * 1024 })).stdout.trim();
const delay = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));
const median = (samples: number[]) => {
  const sorted = samples.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
};

const waitForReady = async (url: string, name: string) => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health/ready`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // The isolated instance may still be migrating and seeding its database.
    }
    await delay(1000);
  }
  throw new Error(`Demo instance ${name} did not become ready`);
};

const startRuntime = async (side: Side): Promise<Runtime> => {
  const name = `${runId}-${side}`;
  const volume = `${name}-data`;
  await docker("volume", "create", volume);
  await docker(
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "--cpus",
    "2",
    "--memory",
    "1g",
    "--publish",
    "127.0.0.1::7575",
    "--mount",
    `type=volume,src=${volume},dst=/appdata`,
    "--env",
    "DEMO_MODE=true",
    "--env",
    "DEMO_READ_ONLY=false",
    "--env",
    "UNSAFE_ENABLE_MOCK_INTEGRATION=true",
    "--env",
    "NO_EXTERNAL_CONNECTION=true",
    "--env",
    "LOG_LEVEL=warn",
    "--env",
    `SECRET_ENCRYPTION_KEY=${encryptionKey}`,
    images[side],
  );
  const port = Number((await docker("port", name, "7575/tcp")).match(/:(\d+)$/)?.[1]);
  if (!Number.isInteger(port)) throw new Error(`No published port for ${name}`);
  const url = `http://127.0.0.1:${port}`;
  await waitForReady(url, name);
  return { name, volume, url, image: images[side] };
};

const readMemory = async (name: string): Promise<Memory> => {
  const [current, stat, redisInfo] = await Promise.all([
    docker("exec", name, "cat", "/sys/fs/cgroup/memory.current"),
    docker("exec", name, "cat", "/sys/fs/cgroup/memory.stat"),
    docker("exec", name, "redis-cli", "INFO", "memory"),
  ]);
  const statValue = (field: string) => Number(stat.match(new RegExp(`^${field} (\\d+)$`, "m"))?.[1]);
  const redisValue = Number(redisInfo.match(/^used_memory:(\d+)\r?$/m)?.[1]);
  return {
    cgroupBytes: Number(current),
    anonymousBytes: statValue("anon"),
    fileBytes: statValue("file"),
    redisBytes: Number.isFinite(redisValue) ? redisValue : null,
  };
};

const installObservers = () => {
  const metrics = {
    lcp: null as number | null,
    lcpElement: null as { tag: string | null; className: string | null; text: string | null } | null,
    longTaskMs: 0,
  };
  Object.defineProperty(window, "homarrV2Benchmark", { value: metrics });
  if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
    new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1) as (PerformanceEntry & { element?: Element }) | undefined;
      if (!entry) return;
      metrics.lcp = entry.startTime;
      metrics.lcpElement = entry.element
        ? {
            tag: entry.element.tagName,
            className: entry.element.getAttribute("class"),
            text: entry.element.textContent?.trim().slice(0, 80) ?? null,
          }
        : null;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  }
  if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
    new PerformanceObserver((list) => {
      metrics.longTaskMs += list.getEntries().reduce((sum, entry) => sum + entry.duration, 0);
    }).observe({ type: "longtask", buffered: true });
  }
};

const login = async (browser: Browser, runtime: Runtime) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${runtime.url}/auth/login`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const form = document.querySelector("form");
      return form !== null && Object.keys(form).some((key) => key.startsWith("__reactProps$"));
    });
    await page.getByLabel("Username").fill("demo");
    await page.locator("#password").fill("demo");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`${runtime.url}/`, { timeout: 30_000 });
    await page.locator("[data-homarr-dev-benchmark-board]:visible").first().waitFor({
      state: "visible",
      timeout: 30_000,
    });
    return await context.storageState();
  } finally {
    await context.close();
  }
};

const measurePage = async (page: Page, url: string, reload: boolean): Promise<Sample> => {
  const errors: string[] = [];
  let browserTrpcRequests = 0;
  let browserTrpcOperations = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/trpc/")) return;
    browserTrpcRequests += 1;
    browserTrpcOperations += path.slice("/api/trpc/".length).split(",").length;
  });
  const started = performance.now();
  const response = reload
    ? await page.reload({ waitUntil: "domcontentloaded" })
    : await page.goto(url, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) throw new Error(`Dashboard returned HTTP ${String(response?.status())}`);
  const domContentLoadedMs = Math.round(performance.now() - started);
  const board = page.locator("[data-homarr-dev-benchmark-board]:visible").first();
  await board.waitFor({ state: "visible", timeout: 30_000 });
  const boardVisibleMs = Math.round(performance.now() - started);
  await page.waitForFunction(
    () => {
      const boardElement = [...document.querySelectorAll("[data-homarr-dev-benchmark-board]")].find(
        (candidate) => candidate.getClientRects().length > 0 && getComputedStyle(candidate).visibility !== "hidden",
      );
      const items = [...(boardElement?.querySelectorAll('[data-type="item"]') ?? [])];
      return items.length > 0 && items.every((item) => item.querySelector("[data-homarr-widget-ready]"));
    },
    undefined,
    { timeout: 30_000 },
  );
  const widgetsMountedMs = Math.round(performance.now() - started);
  const widgetCount = await board.locator('[data-type="item"]').count();
  await page.waitForFunction(
    () => {
      const boardElement = [...document.querySelectorAll("[data-homarr-dev-benchmark-board]")].find(
        (candidate) => candidate.getClientRects().length > 0 && getComputedStyle(candidate).visibility !== "hidden",
      );
      const apps = boardElement?.querySelectorAll('[data-homarr-widget-ready="app"] .app-title').length ?? 0;
      const bookmarks = boardElement?.querySelectorAll('[data-homarr-widget-ready="bookmarks"] a').length ?? 0;
      return apps >= 12 && bookmarks >= 6;
    },
    undefined,
    { timeout: 30_000 },
  );
  const appAndBookmarkDataMs = Math.round(performance.now() - started);
  await page.waitForTimeout(1_000);
  const entries = await page.evaluate(() => {
    const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const fcp = window.performance.getEntriesByType("paint").find(({ name }) => name === "first-contentful-paint");
    const metrics = (
      window as Window & {
        homarrV2Benchmark?: {
          lcp: number | null;
          lcpElement: { tag: string | null; className: string | null; text: string | null } | null;
          longTaskMs: number;
        };
      }
    ).homarrV2Benchmark;
    return {
      ttfbMs: Math.round(navigation?.responseStart ?? 0),
      fcpMs: fcp ? Math.round(fcp.startTime) : null,
      lcpMs: metrics?.lcp === null || metrics?.lcp === undefined ? null : Math.round(metrics.lcp),
      lcpElement: metrics?.lcpElement ?? null,
      longTaskMs: Math.round(metrics?.longTaskMs ?? 0),
    };
  });
  if (errors.length > 0) throw new Error(`Dashboard browser errors: ${errors.join("; ")}`);
  return {
    ...entries,
    domContentLoadedMs,
    boardVisibleMs,
    widgetsMountedMs,
    appAndBookmarkDataMs,
    widgetCount,
    browserTrpcRequests,
    browserTrpcOperations,
  };
};

const samples: Record<Side, { cold: Sample[]; warm: Sample[]; memory: Memory[] }> = {
  before: { cold: [], warm: [], memory: [] },
  after: { cold: [], warm: [], memory: [] },
};
const runtimes = {} as Record<Side, Runtime>;
const volumes: string[] = [];
const names: string[] = [];
let browser: Browser | undefined;

try {
  for (const side of sides) {
    const volume = `${runId}-${side}-data`;
    volumes.push(volume);
    names.push(`${runId}-${side}`);
    runtimes[side] = await startRuntime(side);
  }
  browser = await chromium.launch({ args: ["--disable-background-networking"] });
  const authStates = {} as Record<Side, Awaited<ReturnType<typeof login>>>;
  for (const side of sides) authStates[side] = await login(browser, runtimes[side]);
  for (const side of sides) samples[side].memory.push(await readMemory(runtimes[side].name));

  for (let iteration = 0; iteration < rounds; iteration += 1) {
    const order = iteration % 2 === 0 ? sides : sides.toReversed();
    for (const side of order) {
      const runtime = runtimes[side];
      // Clear the isolated Redis cache and let the 10-second process-local L1 TTL expire.
      await docker("exec", runtime.name, "redis-cli", "FLUSHDB");
      await delay(11_000);
      const context: BrowserContext = await browser.newContext({ storageState: authStates[side] });
      await context.addInitScript(installObservers);
      try {
        const page = await context.newPage();
        samples[side].cold.push(await measurePage(page, `${runtime.url}/`, false));
        samples[side].warm.push(await measurePage(page, `${runtime.url}/`, true));
        samples[side].memory.push(await readMemory(runtime.name));
        console.log(
          `${side} ${iteration + 1}/${rounds}: cold=${samples[side].cold.at(-1)?.appAndBookmarkDataMs}ms warm=${samples[side].warm.at(-1)?.appAndBookmarkDataMs}ms`,
        );
      } finally {
        await context.close();
      }
    }
  }
  await delay(15_000);
  for (const side of sides) samples[side].memory.push(await readMemory(runtimes[side].name));

  const metrics = [
    "ttfbMs",
    "domContentLoadedMs",
    "boardVisibleMs",
    "widgetsMountedMs",
    "appAndBookmarkDataMs",
    "fcpMs",
    "lcpMs",
    "longTaskMs",
    "browserTrpcRequests",
    "browserTrpcOperations",
  ] as const;
  const summary = Object.fromEntries(
    metrics.map((metric) => [
      metric,
      {
        beforeCold: samples.before.cold.length
          ? median(samples.before.cold.map((sample) => sample[metric] ?? 0))
          : null,
        afterCold: samples.after.cold.length ? median(samples.after.cold.map((sample) => sample[metric] ?? 0)) : null,
        beforeWarm: samples.before.warm.length
          ? median(samples.before.warm.map((sample) => sample[metric] ?? 0))
          : null,
        afterWarm: samples.after.warm.length ? median(samples.after.warm.map((sample) => sample[metric] ?? 0)) : null,
      },
    ]),
  );
  const memory = Object.fromEntries(
    sides.map((side) => [
      side,
      {
        first: samples[side].memory[0],
        afterWorkload: samples[side].memory.at(-2),
        settled: samples[side].memory.at(-1),
      },
    ]),
  );
  const result = {
    images,
    sides,
    rounds,
    workload:
      "fresh authenticated Chromium contexts, seeded demo board, Redis FLUSHDB and 11s L1 expiry before each cold document, same-tab reload for warm document",
    summary,
    memory,
    samples,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, summary, memory }, null, 2));
} finally {
  await browser?.close().catch(() => undefined);
  for (const name of names) await docker("rm", "--force", name).catch(() => undefined);
  for (const volume of volumes) await docker("volume", "rm", volume).catch(() => undefined);
}
