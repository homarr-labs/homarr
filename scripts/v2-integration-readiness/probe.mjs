import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const run = promisify(execFile);
const docker = async (...args) =>
  (
    await run("docker", args, { maxBuffer: 1024 * 1024, env: { ...process.env, SECRET_ENCRYPTION_KEY: key } })
  ).stdout.trim();
const sleep = (ms) => new Promise((finish) => setTimeout(finish, ms));
const supportDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.env.V2_READINESS_OUTPUT ?? "benchmark-results/v2-integration-readiness");
await mkdir(root, { recursive: true });
const rounds = Number(process.env.V2_READINESS_ROUNDS ?? "3");
if (!Number.isInteger(rounds) || rounds < 2) throw new Error("V2_READINESS_ROUNDS must be at least 2");
const prefix = `v2-data-readiness-${randomBytes(4).toString("hex")}`;
const key = randomBytes(32).toString("hex");
const images = {
  before: process.env.V2_BEFORE_IMAGE ?? "homarr:v2-board-stable-assistant",
  after: process.env.V2_AFTER_IMAGE ?? "homarr:v2-board-client-primer",
};
const runtimes = [];
const samples = [];
let browser;
const fixtureFetch = async (runtime, path) =>
  JSON.parse(
    await docker(
      "exec",
      runtime.name,
      "node",
      "-e",
      `fetch('http://127.0.0.1:9077${path}').then(r=>r.text()).then(t=>process.stdout.write(t))`,
    ),
  );
try {
  for (const [side, image] of Object.entries(images)) {
    const name = `${prefix}-${side}`;
    const volume = `${name}-data`;
    const runtime = { side, image, name, volume };
    runtimes.push(runtime);
    runtime.imageId = await docker("image", "inspect", "--format", "{{.Id}}", image);
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
      "SECRET_ENCRYPTION_KEY",
      image,
    );
    runtime.url = `http://127.0.0.1:${(await docker("port", name, "7575/tcp")).match(/:(\d+)$/)[1]}`;
    let ready = false;
    for (let i = 0; i < 120; i++) {
      try {
        if ((await fetch(`${runtime.url}/api/health/ready`, { signal: AbortSignal.timeout(2000) })).ok) {
          ready = true;
          break;
        }
      } catch {}
      await sleep(1000);
    }
    if (!ready) throw new Error(`${side} not ready`);
    await docker("cp", `${supportDir}/fixture.cjs`, `${name}:/tmp/readiness-fixture.cjs`);
    await docker("cp", `${supportDir}/configure.cjs`, `${name}:/tmp/readiness-configure.cjs`);
    await docker("exec", "--detach", name, "node", "/tmp/readiness-fixture.cjs");
    console.log(side, await docker("exec", name, "node", "/tmp/readiness-configure.cjs"));
    await docker("cp", `${supportDir}/release-cycle.cjs`, `${name}:/tmp/readiness-release-cycle.cjs`);
    await docker("exec", name, "node", "/tmp/readiness-release-cycle.cjs", "login");
  }
  browser = await chromium.launch({ args: ["--disable-background-networking", "--no-sandbox"] });
  for (const runtime of runtimes) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${runtime.url}/auth/login`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const form = document.querySelector("form");
      return form && Object.keys(form).some((k) => k.startsWith("__reactProps$"));
    });
    await page.getByLabel("Username").fill("demo");
    await page.locator("#password").fill("demo");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`${runtime.url}/`);
    await page.locator("[data-homarr-dev-benchmark-board]:visible").first().waitFor();
    await page
      .locator('[data-homarr-widget-ready="dnsHoleSummary"] section.summary-card')
      .first()
      .waitFor({ timeout: 30000 });
    runtime.auth = await context.storageState();
    await context.close();
  }
  // This is a new metric and controlled slow HTTP workload, not a repeat of the fast-mock benchmarks.
  for (const delayMs of [0, 1500]) {
    for (let round = 0; round < rounds; round++) {
      let order = runtimes;
      if (round % 2) order = runtimes.toReversed();
      for (const runtime of order) {
        await docker("exec", runtime.name, "node", "/tmp/readiness-release-cycle.cjs", `cold-${delayMs}-${round}`);
        await docker("exec", runtime.name, "redis-cli", "FLUSHDB");
        await sleep(11000);
        await fixtureFetch(runtime, `/probe/reset?delay=${delayMs}`);
        const context = await browser.newContext({ storageState: runtime.auth });
        await context.addInitScript(() => {
          const timings = {
            dnsMs: null,
            appMs: null,
            allWidgetsHydratedMs: null,
            genericLoadersClearedMs: null,
            initialQueriesSettledDomMs: null,
            queryStates: [],
            widgetCount: 0,
          };
          let queryClient;
          let stableReadyFrames = 0;
          const poll = () => {
            const board = [...document.querySelectorAll("[data-homarr-dev-benchmark-board]")].find(
              (b) => b.getClientRects().length && getComputedStyle(b).visibility !== "hidden",
            );
            const items = [...(board?.querySelectorAll('[data-type="item"]') ?? [])];
            if (
              timings.allWidgetsHydratedMs === null &&
              items.length === 63 &&
              items.every((item) => {
                const ready = item.querySelector("[data-homarr-widget-ready]");
                return ready && Object.keys(ready).some((k) => k.startsWith("__reactProps$"));
              })
            ) {
              timings.allWidgetsHydratedMs = performance.now();
              timings.widgetCount = items.length;
            }
            if (
              timings.allWidgetsHydratedMs !== null &&
              timings.genericLoadersClearedMs === null &&
              timings.dnsMs !== null &&
              timings.appMs !== null &&
              !board.querySelector('output[aria-live="polite"], [data-homarr-widget-ready] .mantine-Loader-root')
            )
              timings.genericLoadersClearedMs = performance.now();
            if (board && !queryClient) {
              const fiberKey = Object.keys(board).find((k) => k.startsWith("__reactFiber$"));
              let fiber = board[fiberKey];
              for (let depth = 0; fiber && depth < 150; depth++, fiber = fiber.return) {
                const value = fiber.memoizedProps?.value;
                let candidate = value;
                if (value && typeof value === "object") {
                  const descriptor = Object.getOwnPropertyDescriptor(value, "queryClient");
                  if (descriptor && "value" in descriptor) candidate = descriptor.value;
                }
                if (
                  candidate &&
                  typeof candidate === "object" &&
                  typeof Object.getOwnPropertyDescriptor(Object.getPrototypeOf(candidate) ?? {}, "getQueryCache")
                    ?.value === "function"
                ) {
                  queryClient = candidate;
                  break;
                }
              }
            }
            timings.queryClientFound = Boolean(queryClient);
            if (queryClient && timings.allWidgetsHydratedMs !== null) {
              const queries = queryClient
                .getQueryCache()
                .getAll()
                .filter((q) => {
                  const path = q.queryKey[0];
                  return (
                    Array.isArray(path) &&
                    (path[0] === "widget" || path[0] === "app" || path[0] === "integration" || path[0] === "docker") &&
                    (q.isActive() || q.state.fetchStatus === "fetching")
                  );
                });
              const initialPending = queries.filter((q) => q.state.data === undefined && q.state.status === "pending");
              const errors = queries.filter((q) => q.state.status === "error");
              const fetching = queries.filter((q) => q.state.fetchStatus !== "idle");
              timings.queryStates = queries.map((q) => ({
                path: q.queryKey[0].join("."),
                status: q.state.status,
                fetchStatus: q.state.fetchStatus,
                hasData: q.state.data !== undefined,
              }));
              const release = board.querySelector('[data-homarr-widget-ready="releases"]');
              const chartPending = board.querySelector(
                '[data-homarr-widget-ready="beszelSystemStats"] .mantine-Skeleton-root',
              );
              const genericPending = board.querySelector(
                'output[aria-live="polite"], [data-homarr-widget-ready] .mantine-Loader-root',
              );
              timings.chartPendingCount = board.querySelectorAll(
                '[data-homarr-widget-ready="beszelSystemStats"] .mantine-Skeleton-root',
              ).length;
              timings.releaseDataRendered = Boolean(release?.textContent?.includes("1.0.0"));
              if (
                queries.length > 0 &&
                initialPending.length === 0 &&
                errors.length === 0 &&
                fetching.length === 0 &&
                !chartPending &&
                !genericPending &&
                timings.dnsMs !== null &&
                timings.appMs !== null &&
                release?.textContent?.includes("1.0.0")
              )
                stableReadyFrames++;
              else stableReadyFrames = 0;
              if (stableReadyFrames >= 2 && timings.initialQueriesSettledDomMs === null) {
                timings.initialQueriesSettledDomMs = performance.now();
                timings.queryStates = queries.map((q) => ({
                  path: q.queryKey[0].join("."),
                  status: q.state.status,
                  fetchStatus: q.state.fetchStatus,
                  hasData: q.state.data !== undefined,
                }));
              }
            }
            if (timings.initialQueriesSettledDomMs === null) requestAnimationFrame(poll);
          };
          requestAnimationFrame(poll);
          Object.defineProperty(window, "v2Readiness", { value: timings });
          const observer = new MutationObserver(() => {
            const board = [...document.querySelectorAll("[data-homarr-dev-benchmark-board]")].find(
              (b) => b.getClientRects().length && getComputedStyle(b).visibility !== "hidden",
            );
            if (!board) return;
            if (timings.dnsMs === null) {
              const widget = board.querySelector('[data-homarr-widget-ready="dnsHoleSummary"]');
              const cards = [...(widget?.querySelectorAll("section.summary-card") ?? [])];
              const values = cards.map((c) => c.querySelector(".summary-card-value")?.textContent?.trim());
              if (
                cards.length === 4 &&
                values.some((v) => Number(v) === 123) &&
                values.some((v) => Number(v) === 456) &&
                values.some((v) => Number(v) === 17) &&
                values.some((v) => v?.endsWith("%"))
              )
                timings.dnsMs = performance.now();
            }
            if (
              timings.appMs === null &&
              board.querySelectorAll('[data-homarr-widget-ready="app"] .app-title').length >= 12 &&
              board.querySelectorAll('[data-homarr-widget-ready="bookmarks"] a').length >= 6
            )
              timings.appMs = performance.now();
            if (timings.dnsMs !== null && timings.appMs !== null) observer.disconnect();
          });
          observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
        });
        const page = await context.newPage();
        const requests = [];
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("request", (r) => {
          const path = new URL(r.url()).pathname;
          if (path.startsWith("/api/trpc/")) requests.push({ path, startEpochMs: Date.now() });
        });
        const startedEpochMs = Date.now();
        await page.goto(`${runtime.url}/`, { waitUntil: "domcontentloaded" });
        const domContentLoadedMs = Date.now() - startedEpochMs;
        const board = page.locator("[data-homarr-dev-benchmark-board]:visible").first();
        await board.waitFor();
        const boardVisibleMs = Date.now() - startedEpochMs;
        await page
          .waitForFunction(
            () =>
              window.v2Readiness.dnsMs !== null &&
              window.v2Readiness.appMs !== null &&
              window.v2Readiness.initialQueriesSettledDomMs !== null,
            undefined,
            { timeout: 30000 },
          )
          .catch(async (error) => {
            const diagnostics = await page.evaluate(() => ({
              timings: window.v2Readiness,
              boards: [...document.querySelectorAll("[data-homarr-dev-benchmark-board]")].map((b) => ({
                visible: Boolean(b.getClientRects().length),
                items: b.querySelectorAll('[data-type="item"]').length,
              })),
            }));
            diagnostics.browserErrors = errors;
            await writeFile(`${root}/completion-marker-diagnostics.json`, JSON.stringify(diagnostics, null, 2));
            throw error;
          });
        const {
          dnsMs,
          appMs,
          allWidgetsHydratedMs,
          initialQueriesSettledDomMs,
          genericLoadersClearedMs,
          queryStates,
          widgetCount,
          navigationEpochMs,
        } = await page.evaluate(() => ({ ...window.v2Readiness, navigationEpochMs: performance.timeOrigin }));
        const dnsDataReadyMs = Math.round(dnsMs);
        const appAndBookmarkDataMs = Math.round(appMs);
        const upstream = await fixtureFetch(runtime, "/probe/entries");
        const dnsRequests = requests.filter((r) => r.path.includes("widget.dnsHole.summary"));
        const labels = await board
          .locator('[data-homarr-widget-ready="dnsHoleSummary"] section.summary-card')
          .evaluateAll((cards) => cards.map((c) => c.getAttribute("aria-label")));
        if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
        if (
          upstream.filter((e) => e.path.startsWith("/control/")).length !== 3 ||
          upstream.filter((e) => e.path.endsWith("/v2-readiness-release")).length !== 1 ||
          upstream.some((e) => !e.finishEpochMs)
        )
          throw new Error(`Unexpected fixture request count/completion: ${JSON.stringify(upstream)}`);
        const sample = {
          allWidgetsHydratedMs,
          initialQueriesSettledDomMs,
          genericLoadersClearedMs,
          queryStates,
          widgetCount,
          side: runtime.side,
          delayMs,
          round: round + 1,
          domContentLoadedMs,
          boardVisibleMs,
          dnsDataReadyMs,
          appAndBookmarkDataMs,
          dnsQueryDispatchedMs: dnsRequests.map((r) => r.startEpochMs - navigationEpochMs),
          upstream: upstream.map((e) => ({
            path: e.path,
            startMs: e.startEpochMs - navigationEpochMs,
            finishMs: e.finishEpochMs - navigationEpochMs,
          })),
          labels,
          browserTrpcRequests: requests.length,
        };
        samples.push(sample);
        const releaseText = await board.locator('[data-homarr-widget-ready="releases"]').innerText();
        if (!releaseText.includes("1.0.0")) throw new Error("Releases fixture data not rendered");
        console.log(JSON.stringify({ ...sample, queryStates: undefined, queryCount: queryStates.length }));
        await context.close();
      }
    }
  }
  await writeFile(
    `${root}/results.json`,
    JSON.stringify(
      {
        sourceCommit: await run("git", ["rev-parse", "HEAD"], { cwd: resolve(supportDir, "../..") }).then((r) =>
          r.stdout.trim(),
        ),
        sourceDirty: await run("git", ["status", "--porcelain"], { cwd: resolve(supportDir, "../..") }).then((r) =>
          Boolean(r.stdout.trim()),
        ),
        rounds,
        baseline: "retained stable Assistant/app-bookmark streaming image compared to bounded client DNS query primer",
        workload:
          "Synthetic AdGuard-compatible HTTP fixture through production integration adapter; 0/1500 ms delay on each of 3 concurrent endpoints. Seeded 63-widget board with DNS controls/summary relinked only. Fresh authenticated browser context per cold document; FLUSHDB + 11 s L1 expiry. Configured paired rounds per condition, alternating image order. An init-script MutationObserver captures first populated card/fixture values independent of decimal formatting from navigation timeOrigin. Actual DNS card values validated. No real-service or RAM claim.",
        images: runtimes.map(({ side, image, imageId }) => ({ side, image, imageId })),
        samples,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  try {
    // Save completed samples even if the next observation fails.
    await writeFile(`${root}/partial-results.json`, JSON.stringify({ samples }, null, 2) + "\n");
  } finally {
    await browser?.close().catch(() => {});
    for (const runtime of runtimes) {
      await docker("rm", "--force", runtime.name).catch(() => {});
      await docker("volume", "rm", runtime.volume).catch(() => {});
    }
  }
}
