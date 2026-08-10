import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";
import type { BrowserContext, BrowserContextOptions, Page, Request } from "@playwright/test";

import {
  getBrowserNetworkIsolationLaunchArgs,
  getSpotlightIdleMountFailure,
  getSpotlightIdleNetworkFailure,
  getRuntimeClaimIneligibleReasons,
  getRuntimeMetricEligibility,
  getTrpcProcedures,
  getTrpcRequestIdentities,
  getUnrecoveredWidgetDataRequests,
  hasBlockingWidgetDataAborts,
  inspectTrpcBatchStreamResponse,
  isRuntimeWidgetDataRequest,
  parseRuntimeMemorySnapshot,
  recordWidgetDataRequestOutcome,
  summarizeRuntimeMemory,
} from "./docker-runtime-lib.mts";
import type { RuntimeMemoryCheckpoint, TrpcBatchInspection, TrpcRequestIdentity } from "./docker-runtime-lib.mts";
import { summarize } from "./dev-benchmark-lib.mts";

const execFileAsync = promisify(execFile);
const image = process.env.RUNTIME_BENCHMARK_IMAGE;
if (!image) throw new Error("RUNTIME_BENCHMARK_IMAGE is required");

const expectedSha = process.env.RUNTIME_BENCHMARK_SHA?.trim() || null;
const expectedSourceFingerprint = process.env.RUNTIME_BENCHMARK_SOURCE_FINGERPRINT?.trim() || null;
const settleMs = Number(process.env.RUNTIME_BENCHMARK_SETTLE_MS ?? 10 * 60 * 1_000);
const sampleIntervalMs = Number(process.env.RUNTIME_BENCHMARK_SAMPLE_INTERVAL_MS ?? 30_000);
const lcpObservationMs = Number(process.env.RUNTIME_BENCHMARK_LCP_OBSERVATION_MS ?? 5_000);
const lcpStabilityMs = 500;
const widgetDataQuietMs = Number(process.env.RUNTIME_BENCHMARK_WIDGET_DATA_QUIET_MS ?? 500);
const spotlightIdleMs = Number(process.env.RUNTIME_BENCHMARK_SPOTLIGHT_IDLE_MS ?? 2_500);
const spotlightIdlePolicy = process.env.RUNTIME_BENCHMARK_SPOTLIGHT_IDLE_POLICY;
const interactionIterations = Number(process.env.RUNTIME_BENCHMARK_INTERACTION_ITERATIONS ?? 7);
const pageIterations = Number(process.env.RUNTIME_BENCHMARK_PAGE_ITERATIONS ?? 20);
const readyMarkerPolicy = process.env.RUNTIME_BENCHMARK_REQUIRE_READY_MARKERS;
const requireImplementationMarkers = readyMarkerPolicy === "true";
const outputDirectory = path.resolve(process.env.RUNTIME_BENCHMARK_OUTPUT_DIR ?? "benchmark-results/docker-runtime");
const routePaths = (
  process.env.RUNTIME_BENCHMARK_ROUTES ?? "/manage,/manage/apps,/manage/integrations,/manage/settings"
)
  .split(",")
  .filter(Boolean);
const viewport = { height: 720, width: 1280 } as const;

const safeUrlDetails = (rawUrl: string) => {
  const parsed = new URL(rawUrl);
  return {
    origin: parsed.origin,
    pathname: parsed.pathname,
    protocol: parsed.protocol,
    urlHash: createHash("sha256").update(parsed.href).digest("hex"),
  };
};

if (!Number.isFinite(settleMs) || settleMs < 0) throw new Error("RUNTIME_BENCHMARK_SETTLE_MS must be non-negative");
if (!Number.isFinite(sampleIntervalMs) || sampleIntervalMs <= 0) {
  throw new Error("RUNTIME_BENCHMARK_SAMPLE_INTERVAL_MS must be positive");
}
if (!Number.isFinite(lcpObservationMs) || lcpObservationMs < 1_000) {
  throw new Error("RUNTIME_BENCHMARK_LCP_OBSERVATION_MS must be at least 1000");
}
if (!Number.isFinite(spotlightIdleMs) || spotlightIdleMs < 0) {
  throw new Error("RUNTIME_BENCHMARK_SPOTLIGHT_IDLE_MS must be non-negative");
}
if (spotlightIdlePolicy !== "mounted" && spotlightIdlePolicy !== "preload-only") {
  throw new Error('RUNTIME_BENCHMARK_SPOTLIGHT_IDLE_POLICY must be "mounted" or "preload-only"');
}
if (!Number.isFinite(widgetDataQuietMs) || widgetDataQuietMs < 0) {
  throw new Error("RUNTIME_BENCHMARK_WIDGET_DATA_QUIET_MS must be non-negative");
}
if (!Number.isInteger(interactionIterations) || interactionIterations < 7) {
  throw new Error("RUNTIME_BENCHMARK_INTERACTION_ITERATIONS must be an integer of at least 7");
}
if (!Number.isInteger(pageIterations) || pageIterations < 1) {
  throw new Error("RUNTIME_BENCHMARK_PAGE_ITERATIONS must be a positive integer");
}
if (readyMarkerPolicy !== "true" && readyMarkerPolicy !== "false") {
  throw new Error("RUNTIME_BENCHMARK_REQUIRE_READY_MARKERS must be true or false");
}

const startExternalDenyProxyAsync = async () => {
  const attempts = new Map<string, { count: number; method: string; origin: string | null; target: string }>();
  const recordAttempt = (method: string, target: string) => {
    let origin: string | null = null;
    try {
      origin = new URL(method === "CONNECT" ? `https://${target}` : target).origin;
    } catch {
      // Keep the raw target when Chromium sends a non-URL proxy request.
    }
    const key = `${method} ${target}`;
    const existing = attempts.get(key);
    attempts.set(key, { count: (existing?.count ?? 0) + 1, method, origin, target });
  };
  const server = createServer((request, response) => {
    recordAttempt(request.method ?? "GET", request.url ?? "");
    response.writeHead(502, {
      "cache-control": "no-store",
      connection: "close",
      "x-homarr-benchmark-blocked": "true",
    });
    response.end("External network disabled by Homarr runtime benchmark\n");
  });
  server.on("connect", (request, socket) => {
    recordAttempt("CONNECT", request.url ?? "");
    socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
  });
  server.on("upgrade", (request, socket) => {
    const rawTarget = request.url ?? "";
    const target = /^wss?:\/\//.test(rawTarget) ? rawTarget : `ws://${request.headers.host ?? "unknown"}${rawTarget}`;
    recordAttempt("UPGRADE", target);
    socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nX-Homarr-Benchmark-Blocked: true\r\n\r\n");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  return {
    closeAsync: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
    getAttempts: () => [...attempts.values()].toSorted((left, right) => left.target.localeCompare(right.target)),
    host: address.address,
    port: address.port,
    url: `http://127.0.0.1:${address.port}`,
  };
};

const memoryScript = String.raw`
echo "memory_current=$(cat /sys/fs/cgroup/memory.current)"
memory_peak="$(cat /sys/fs/cgroup/memory.peak 2>/dev/null || true)"
case "$memory_peak" in ''|'max') ;; *) echo "memory_peak=$memory_peak" ;; esac
awk '/^anon / { print "cgroup_anon=" $2 } /^file / { print "cgroup_file=" $2 }' /sys/fs/cgroup/memory.stat
awk '/^usage_usec / { print "cpu_usage_usec=" $2 } /^user_usec / { print "cpu_user_usec=" $2 } /^system_usec / { print "cpu_system_usec=" $2 } /^nr_throttled / { print "cpu_nr_throttled=" $2 } /^throttled_usec / { print "cpu_throttled_usec=" $2 }' /sys/fs/cgroup/cpu.stat
for status_file in /proc/[0-9]*/status; do
  process_dir="\${status_file%/status}"
  process_values="$(awk '/^Name:/ { name=$2 } /^Pid:/ { pid=$2 } /^PPid:/ { ppid=$2 } /^VmRSS:/ { rss=$2 } END { print pid "|" ppid "|" rss "|" name }' "$status_file")"
  process_pss="$(awk '/^Pss:/ { print $2 }' "$process_dir/smaps_rollup" 2>/dev/null || echo 0)"
  echo "process=$process_values|$process_pss"
done
redis_info="$(redis-cli INFO memory 2>/dev/null | tr -d '\r' || true)"
redis_used="$(printf '%s\n' "$redis_info" | awk -F: '/^used_memory:/ { print $2 }')"
redis_peak="$(printf '%s\n' "$redis_info" | awk -F: '/^used_memory_peak:/ { print $2 }')"
if [ -n "$redis_used" ] && [ -n "$redis_peak" ]; then
  echo "redis_used_memory=$redis_used"
  echo "redis_used_memory_peak=$redis_peak"
fi
`;

const waitForReadyAsync = async (baseUrl: string) => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health/ready`);
      if (response.ok) return;
    } catch {
      // The socket is not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Container did not become ready at ${baseUrl}`);
};

const captureCheckpointAsync = async (containerId: string, name: string): Promise<RuntimeMemoryCheckpoint> => {
  const { stdout } = await execFileAsync("docker", ["exec", containerId, "sh", "-c", memoryScript], {
    maxBuffer: 4 * 1024 * 1024,
  });
  await writeFile(path.join(outputDirectory, `${name}.txt`), stdout);
  return parseRuntimeMemorySnapshot(name, stdout);
};

const waitForBoardWidgetsAsync = async (page: Page) => {
  const boardSelector = "[data-homarr-dev-benchmark-board]";
  await page.locator(boardSelector).waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction((selector) => {
    const board = document.querySelector(selector);
    const items = [...(board?.querySelectorAll('[data-type="item"]') ?? [])];
    return items.length > 0 && items.every((item) => item.querySelector(".grid-stack-item-content") !== null);
  }, boardSelector);

  if (requireImplementationMarkers) {
    await page.waitForFunction((selector) => {
      const board = document.querySelector(selector);
      const items = [...(board?.querySelectorAll('[data-type="item"]') ?? [])];
      return (
        items.length > 0 &&
        items.every(
          (item) =>
            item.querySelector("[data-homarr-widget-ready]") !== null ||
            item.querySelector('[data-homarr-widget-error], a[href*="/manage/tools/logs"]') !== null,
        )
      );
    }, boardSelector);
  } else {
    await page.waitForLoadState("networkidle");
  }
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
  return await readBoardWidgetStateAsync(page);
};

const waitForSpotlightIdlePreparationAsync = async (page: Page) => {
  const startedAt = performance.now();
  const marker =
    spotlightIdlePolicy === "preload-only"
      ? "[data-homarr-dev-benchmark-spotlight-preloaded]"
      : "[data-homarr-dev-benchmark-spotlight-mounted]";
  await page.locator(marker).waitFor({
    state: "attached",
    timeout: Math.max(30_000, spotlightIdleMs + 5_000),
  });
  const remainingIdleMs = Math.max(0, spotlightIdleMs - (performance.now() - startedAt));
  if (remainingIdleMs > 0) await page.waitForTimeout(remainingIdleMs);
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
  await page.waitForTimeout(100);
  const mountFailure = getSpotlightIdleMountFailure(
    spotlightIdlePolicy,
    await page.locator("[data-homarr-dev-benchmark-spotlight-mounted]").count(),
  );
  if (mountFailure) throw new Error(mountFailure);
};

const readBoardWidgetStateAsync = async (page: Page) =>
  await page.evaluate((selector) => {
    const board = document.querySelector(selector);
    return {
      widgetCount: board?.querySelectorAll('[data-type="item"]').length ?? 0,
      implementationMarkerCount: board?.querySelectorAll("[data-homarr-widget-ready]").length ?? 0,
      widgetErrorCount:
        board?.querySelectorAll('[data-homarr-widget-error], a[href*="/manage/tools/logs"]').length ?? 0,
    };
  }, "[data-homarr-dev-benchmark-board]");

const assertBoardWidgetState = (state: Awaited<ReturnType<typeof readBoardWidgetStateAsync>>, scope: string) => {
  if (requireImplementationMarkers && state.implementationMarkerCount !== state.widgetCount) {
    throw new Error(`${scope} has incomplete widget implementation markers`);
  }
  if (state.widgetErrorCount > 0) {
    throw new Error(`${scope} rendered ${state.widgetErrorCount} widget errors`);
  }
};

type WidgetDataRequestTracker = {
  activeRequests: Map<Request, { operationCount: number; widgetOperations: TrpcRequestIdentity[] }>;
  completedOperationCount: number;
  failedRequests: string[];
  lastActivityAtMs: number;
  observedOperationCount: number;
  recoveryBalance: Map<string, number>;
};

const trackWidgetDataRequests = (page: Page): WidgetDataRequestTracker => {
  const tracker: WidgetDataRequestTracker = {
    activeRequests: new Map(),
    completedOperationCount: 0,
    failedRequests: [],
    lastActivityAtMs: performance.now(),
    observedOperationCount: 0,
    recoveryBalance: new Map(),
  };
  page.on("request", (request) => {
    if (request.method() !== "GET") return;
    try {
      const operations = getTrpcRequestIdentities(request.url());
      const widgetOperations = operations.filter(({ procedure }) =>
        isRuntimeWidgetDataRequest(request.method(), procedure),
      );
      if (widgetOperations.length === 0) return;
      tracker.activeRequests.set(request, { operationCount: operations.length, widgetOperations });
      tracker.observedOperationCount += widgetOperations.length;
      tracker.lastActivityAtMs = performance.now();
    } catch {
      if (getTrpcProcedures(request.url()).length === 0) return;
      tracker.failedRequests.push("malformed serialized tRPC request input");
      tracker.lastActivityAtMs = performance.now();
    }
  });
  const takeRequest = (request: Request) => {
    const trackedRequest = tracker.activeRequests.get(request);
    if (!trackedRequest) return null;
    tracker.activeRequests.delete(request);
    tracker.lastActivityAtMs = performance.now();
    return trackedRequest;
  };
  const settleTransportFailure = (request: Request, failure: string) => {
    const trackedRequest = takeRequest(request);
    if (!trackedRequest) return;
    const identities = trackedRequest.widgetOperations.map(({ identity }) => identity);
    if (failure === "net::ERR_ABORTED") {
      recordWidgetDataRequestOutcome(tracker.recoveryBalance, identities, "aborted");
    } else {
      tracker.failedRequests.push(`transport failure ${failure}: ${identities.join(",")}`);
    }
  };
  const settleInspection = (request: Request, inspection: TrpcBatchInspection) => {
    const trackedRequest = takeRequest(request);
    if (!trackedRequest) return;
    const failuresByIndex = new Map(inspection.failures.map((failure) => [failure.batchIndex, failure]));
    const successfulIndexes = new Set(inspection.successfulIndexes);
    for (const operation of trackedRequest.widgetOperations) {
      const failure = failuresByIndex.get(operation.batchIndex);
      if (failure) {
        tracker.failedRequests.push(`${JSON.stringify(failure)}: ${operation.identity}`);
      } else if (successfulIndexes.has(operation.batchIndex)) {
        tracker.completedOperationCount += 1;
        recordWidgetDataRequestOutcome(tracker.recoveryBalance, [operation.identity], "completed");
      } else {
        tracker.failedRequests.push(`missing tRPC response outcome: ${operation.identity}`);
      }
    }
  };
  page.on("requestfinished", (request) => {
    const trackedRequest = tracker.activeRequests.get(request);
    if (!trackedRequest) return;
    void (async () => {
      try {
        const response = await request.response();
        if (!response) {
          settleTransportFailure(request, "missing HTTP response");
          return;
        }
        settleInspection(
          request,
          await inspectTrpcBatchStreamResponse(response.status(), await response.text(), trackedRequest.operationCount),
        );
      } catch {
        settleTransportFailure(request, "unable to inspect response");
      }
    })();
  });
  page.on("requestfailed", (request) =>
    settleTransportFailure(request, request.failure()?.errorText ?? "request failed"),
  );
  return tracker;
};

const waitForWidgetDataSettledAsync = async (
  page: Page,
  tracker: WidgetDataRequestTracker,
  { allowUnrecoveredAborts = false } = {},
) => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (tracker.failedRequests.length > 0) {
      throw new Error(`Widget data requests failed: ${tracker.failedRequests.join("; ")}`);
    }
    const unrecoveredRequests = getUnrecoveredWidgetDataRequests(tracker.recoveryBalance);
    const remainingQuietMs = widgetDataQuietMs - (performance.now() - tracker.lastActivityAtMs);
    if (
      tracker.observedOperationCount > 0 &&
      tracker.activeRequests.size === 0 &&
      !hasBlockingWidgetDataAborts(allowUnrecoveredAborts, unrecoveredRequests.length) &&
      remainingQuietMs <= 0
    ) {
      const lastActivityAtMs = tracker.lastActivityAtMs;
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      );
      if (tracker.activeRequests.size === 0 && tracker.lastActivityAtMs === lastActivityAtMs) {
        return {
          completedOperationCount: tracker.completedOperationCount,
          observedOperationCount: tracker.observedOperationCount,
          quietWindowObserved: true,
          unrecoveredAbortedRequests: unrecoveredRequests,
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, Math.max(10, Math.min(50, remainingQuietMs))));
  }
  const unrecoveredRequests = getUnrecoveredWidgetDataRequests(tracker.recoveryBalance);
  throw new Error(
    `Widget data did not settle: observed=${tracker.observedOperationCount} active=${tracker.activeRequests.size} unrecoveredAborts=${unrecoveredRequests.join(",") || "none"}`,
  );
};

const deferIdleCallbacksForInitialMeasurement = () => {
  const originalRequest = window.requestIdleCallback?.bind(window);
  const originalCancel = window.cancelIdleCallback?.bind(window);
  const queued = new Map<number, { callback: IdleRequestCallback; options?: IdleRequestOptions }>();
  let nextId = 1;
  Object.defineProperty(window, "requestIdleCallback", {
    configurable: true,
    value: (callback: IdleRequestCallback, options?: IdleRequestOptions) => {
      const id = nextId++;
      queued.set(id, { callback, options });
      return id;
    },
  });
  Object.defineProperty(window, "cancelIdleCallback", {
    configurable: true,
    value: (id: number) => {
      queued.delete(id);
    },
  });
  Object.defineProperty(window, "homarrReleaseBenchmarkIdleCallbacks", {
    configurable: true,
    value: () => {
      if (originalRequest)
        Object.defineProperty(window, "requestIdleCallback", { configurable: true, value: originalRequest });
      if (originalCancel)
        Object.defineProperty(window, "cancelIdleCallback", { configurable: true, value: originalCancel });
      for (const { callback, options } of queued.values()) {
        if (originalRequest) originalRequest(callback, options);
        else window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
      }
      queued.clear();
    },
  });
};

const initializeBrowserVitals = () => {
  const state = {
    cls: 0,
    lcpElement: null as null | {
      className: string | null;
      id: string | null;
      origin: string | null;
      pathname: string | null;
      size: number | null;
      tagName: string | null;
      text: string | null;
    },
    lcpMs: null as number | null,
    lcpFinalizedByInputMs: null as number | null,
    lcpUpdatedAtMs: null as number | null,
    longTaskCount: 0,
    longTaskTotalMs: 0,
  };
  Object.defineProperty(window, "homarrBenchmarkVitals", { value: state, configurable: true });
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.isTrusted && state.lcpFinalizedByInputMs === null) state.lcpFinalizedByInputMs = performance.now();
    },
    { capture: true },
  );
  if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
    new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1);
      if (!entry) return;
      const lcp = entry as PerformanceEntry & { element?: Element; size?: number; url?: string };
      const element = lcp.element;
      state.lcpMs = entry.startTime;
      state.lcpUpdatedAtMs = performance.now();
      state.lcpElement = {
        className: element?.getAttribute("class") ?? null,
        id: element?.id || null,
        origin: lcp.url ? new URL(lcp.url, window.location.href).origin : null,
        pathname: lcp.url ? new URL(lcp.url, window.location.href).pathname : null,
        size: lcp.size ?? null,
        tagName: element?.tagName ?? null,
        text: element?.textContent?.trim().slice(0, 120) || null,
      };
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

const installMeasurementScriptsAsync = async (context: BrowserContext, options?: { deferIdle?: boolean }) => {
  if (options?.deferIdle) await context.addInitScript(deferIdleCallbacksForInitialMeasurement);
  await context.addInitScript(initializeBrowserVitals);
};

const waitForFinalLcpAsync = async (page: Page) => {
  await page.waitForFunction(
    () =>
      typeof (window as Window & { homarrBenchmarkVitals?: { lcpMs: number | null } }).homarrBenchmarkVitals?.lcpMs ===
      "number",
    undefined,
    { timeout: Math.max(10_000, lcpObservationMs + 5_000) },
  );
  while (true) {
    const { elapsedMs, lastCandidateAtMs } = await page.evaluate(() => {
      const vitals = (window as Window & { homarrBenchmarkVitals?: { lcpUpdatedAtMs: number | null } })
        .homarrBenchmarkVitals;
      return { elapsedMs: performance.now(), lastCandidateAtMs: vitals?.lcpUpdatedAtMs ?? null };
    });
    if (lastCandidateAtMs === null) throw new Error("LCP candidate timestamp is missing");
    const remainingMs = Math.max(0, lcpObservationMs - elapsedMs, lcpStabilityMs - (elapsedMs - lastCandidateAtMs));
    if (remainingMs === 0) break;
    await page.waitForTimeout(remainingMs);
  }

  // LCP remains open to later candidates until the first trusted input. End
  // the declared observation window with an inert key so the recorded value
  // is final, while leaving application state and layout untouched.
  await page.keyboard.press("Shift");
  await page.waitForFunction(
    () =>
      typeof (window as Window & { homarrBenchmarkVitals?: { lcpFinalizedByInputMs: number | null } })
        .homarrBenchmarkVitals?.lcpFinalizedByInputMs === "number",
  );
  await page.waitForTimeout(100);
};

const readBrowserMetricsAsync = async (page: Page) =>
  await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const firstContentfulPaint = performance
      .getEntriesByType("paint")
      .find(({ name }) => name === "first-contentful-paint");
    const vitals = (
      window as Window & {
        homarrBenchmarkVitals?: {
          cls: number;
          lcpElement: {
            className: string | null;
            id: string | null;
            origin: string | null;
            pathname: string | null;
            size: number | null;
            tagName: string | null;
            text: string | null;
          } | null;
          lcpMs: number | null;
          lcpFinalizedByInputMs: number | null;
          lcpUpdatedAtMs: number | null;
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
        .reduce((sum, resource) => sum + resource.decodedBodySize, 0),
      domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd) : null,
      fcpMs: firstContentfulPaint ? Math.round(firstContentfulPaint.startTime) : null,
      jsHeapBytes: memory.memory?.usedJSHeapSize ?? null,
      lcpElement: vitals?.lcpElement ?? null,
      lcpFinalizedByInputMs:
        vitals?.lcpFinalizedByInputMs === null || vitals?.lcpFinalizedByInputMs === undefined
          ? null
          : Math.round(vitals.lcpFinalizedByInputMs),
      lcpMs: vitals?.lcpMs === null || vitals?.lcpMs === undefined ? null : Math.round(vitals.lcpMs),
      lcpUpdatedAtMs:
        vitals?.lcpUpdatedAtMs === null || vitals?.lcpUpdatedAtMs === undefined
          ? null
          : Math.round(vitals.lcpUpdatedAtMs),
      loadMs: navigation?.loadEventEnd ? Math.round(navigation.loadEventEnd) : null,
      longTaskCount: vitals?.longTaskCount ?? 0,
      longTaskTotalMs: Math.round(vitals?.longTaskTotalMs ?? 0),
      largestScripts: resources
        .filter((resource) => resource.initiatorType === "script")
        .toSorted((left, right) => right.decodedBodySize - left.decodedBodySize)
        .slice(0, 10)
        .map(({ decodedBodySize, name, transferSize }) => {
          const url = new URL(name, window.location.href);
          return { decodedBodySize, origin: url.origin, pathname: url.pathname, transferSize };
        }),
      resourceCount: resources.length,
      slowestResources: resources
        .toSorted((left, right) => right.duration - left.duration)
        .slice(0, 10)
        .map(({ duration, initiatorType, name, transferSize }) => {
          const url = new URL(name, window.location.href);
          return {
            durationMs: Math.round(duration),
            initiatorType,
            origin: url.origin,
            pathname: url.pathname,
            transferSize,
          };
        }),
      ttfbMs: navigation ? Math.round(navigation.responseStart) : null,
      transferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
    };
  });

await mkdir(outputDirectory, { recursive: true });
const appDataDirectory = await mkdtemp(path.join(os.tmpdir(), "homarr-runtime-benchmark-"));
const containerName = `homarr-runtime-benchmark-${process.pid}`;
const proxyContainerName = `${containerName}-proxy`;
const isolationNetworkName = `${containerName}-internal`;
let containerId: string | undefined;
let proxyContainerId: string | undefined;
let isolationNetworkId: string | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let denyProxy: Awaited<ReturnType<typeof startExternalDenyProxyAsync>> | undefined;
let cleanupPromise: Promise<void> | undefined;
let lifecycleMutation: ReturnType<typeof execFileAsync> | undefined;
let shutdownRequested = false;

const execDockerLifecycleAsync = async (args: string[]) => {
  const mutation = execFileAsync("docker", args);
  lifecycleMutation = mutation;
  try {
    const result = await mutation;
    if (shutdownRequested) throw new Error("Runtime benchmark interrupted");
    return result;
  } finally {
    if (lifecycleMutation === mutation) lifecycleMutation = undefined;
  }
};

const cleanupAsync = () => {
  cleanupPromise ??= (async () => {
    const activeLifecycleMutation = lifecycleMutation;
    if (activeLifecycleMutation) await activeLifecycleMutation.catch(() => undefined);
    await browser?.close().catch(() => undefined);
    await denyProxy?.closeAsync().catch(() => undefined);
    await execFileAsync("docker", ["rm", "--force", proxyContainerName]).catch(() => undefined);
    await execFileAsync("docker", ["rm", "--force", containerName]).catch(() => undefined);
    await execFileAsync("docker", ["network", "rm", isolationNetworkName]).catch(() => undefined);
    await rm(appDataDirectory, { recursive: true, force: true }).catch(() => undefined);
  })();
  return cleanupPromise;
};

const handleSignal = (signal: "SIGINT" | "SIGTERM") => {
  shutdownRequested = true;
  console.error(`Received ${signal}; cleaning up runtime benchmark resources`);
  void cleanupAsync().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
};
const handleSigint = () => handleSignal("SIGINT");
const handleSigterm = () => handleSignal("SIGTERM");
process.once("SIGINT", handleSigint);
process.once("SIGTERM", handleSigterm);

try {
  const imageInspect = JSON.parse((await execFileAsync("docker", ["image", "inspect", image])).stdout)[0] as {
    Architecture: string;
    Config?: { Labels?: Record<string, string> };
    Id: string;
    RepoDigests?: string[];
    Size: number;
  };
  const revision = imageInspect.Config?.Labels?.["org.opencontainers.image.revision"] ?? null;
  const sourceFingerprint = imageInspect.Config?.Labels?.["dev.homarr.source-fingerprint"] ?? null;
  const dockerVersion = JSON.parse(
    (await execFileAsync("docker", ["version", "--format", "{{json .}}"])).stdout,
  ) as Record<string, unknown>;
  const dockerInfo = JSON.parse((await execFileAsync("docker", ["info", "--format", "{{json .}}"])).stdout) as {
    Architecture?: string;
    CgroupDriver?: string;
    CgroupVersion?: string;
    Driver?: string;
    KernelVersion?: string;
    MemTotal?: number;
    NCPU?: number;
    OSType?: string;
    OperatingSystem?: string;
    ServerVersion?: string;
  };

  const containerStartedAt = performance.now();
  isolationNetworkId = (
    await execDockerLifecycleAsync(["network", "create", "--driver", "bridge", "--internal", isolationNetworkName])
  ).stdout.trim();
  const runResult = await execDockerLifecycleAsync([
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "--cpus",
    "2",
    "--memory",
    "1g",
    "--network",
    isolationNetworkName,
    "--volume",
    `${appDataDirectory}:/appdata`,
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
    `SECRET_ENCRYPTION_KEY=${"0".repeat(64)}`,
    imageInspect.Id,
  ]);
  containerId = runResult.stdout.trim();
  proxyContainerId = (
    await execDockerLifecycleAsync([
      "run",
      "--detach",
      "--rm",
      "--name",
      proxyContainerName,
      "--publish",
      "127.0.0.1::7575",
      "--env",
      `UPSTREAM_HOST=${containerName}`,
      "--entrypoint",
      "node",
      imageInspect.Id,
      "-e",
      `const net = require("node:net");
net.createServer((client) => {
  const upstream = net.connect(7575, process.env.UPSTREAM_HOST);
  client.pipe(upstream).pipe(client);
  const close = () => { client.destroy(); upstream.destroy(); };
  client.on("error", close);
  upstream.on("error", close);
}).listen(7575, "0.0.0.0");`,
    ])
  ).stdout.trim();
  await execDockerLifecycleAsync(["network", "connect", isolationNetworkName, proxyContainerId]);
  const portOutput = (await execFileAsync("docker", ["port", proxyContainerId, "7575/tcp"])).stdout;
  const port = Number(portOutput.trim().match(/:(\d+)$/)?.[1]);
  if (!Number.isInteger(port)) throw new Error(`Unable to resolve mapped port from ${portOutput}`);
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReadyAsync(baseUrl);
  const startToReadyMs = Math.round(performance.now() - containerStartedAt);
  const containerNode = JSON.parse(
    (
      await execFileAsync("docker", [
        "exec",
        containerId,
        "node",
        "-p",
        "JSON.stringify({architecture:process.arch,platform:process.platform,version:process.version,v8Version:process.versions.v8})",
      ])
    ).stdout,
  ) as { architecture: string; platform: string; version: string; v8Version: string };
  const serverNetworkIsolationCanary = JSON.parse(
    (
      await execFileAsync("docker", [
        "exec",
        containerId,
        "node",
        "-e",
        `Promise.all([
  fetch("https://example.com", { signal: AbortSignal.timeout(3000) }).then((response) => ({ blocked: false, status: response.status }), (error) => ({ blocked: true, code: error.cause?.code ?? error.name })),
  fetch("http://1.1.1.1", { signal: AbortSignal.timeout(3000) }).then((response) => ({ blocked: false, status: response.status }), (error) => ({ blocked: true, code: error.cause?.code ?? error.name })),
]).then((result) => console.log(JSON.stringify({ domain: result[0], directIp: result[1] })));`,
      ])
    ).stdout,
  ) as {
    directIp: { blocked: boolean; code?: string; status?: number };
    domain: { blocked: boolean; code?: string; status?: number };
  };
  const serverNetworkIsolated =
    serverNetworkIsolationCanary.domain.blocked && serverNetworkIsolationCanary.directIp.blocked;
  if (!serverNetworkIsolated) {
    throw new Error(`Server external network isolation canary failed: ${JSON.stringify(serverNetworkIsolationCanary)}`);
  }

  const checkpoints: RuntimeMemoryCheckpoint[] = [];
  checkpoints.push(await captureCheckpointAsync(containerId, "startup"));

  denyProxy = await startExternalDenyProxyAsync();
  const browserLaunchArguments = getBrowserNetworkIsolationLaunchArgs(denyProxy.url);
  browser = await chromium.launch({ args: browserLaunchArguments });
  const isolationCanaryUrl = "http://homarr-benchmark.invalid/__network-isolation-canary__";
  const canaryAttemptsBefore = denyProxy
    .getAttempts()
    .filter(({ method, target }) => method === "GET" && target === isolationCanaryUrl)
    .reduce((total, { count }) => total + count, 0);
  const canaryContext = await browser.newContext({ viewport });
  const canaryPage = await canaryContext.newPage();
  const canaryWebSocketUrls: string[] = [];
  const canaryWebSocketEvents = new Map<
    string,
    { closeCount: number; frameReceivedCount: number; frameSentCount: number; socketErrorCount: number }
  >();
  canaryPage.on("websocket", (webSocket) => {
    const url = webSocket.url();
    canaryWebSocketUrls.push(url);
    const events = { closeCount: 0, frameReceivedCount: 0, frameSentCount: 0, socketErrorCount: 0 };
    canaryWebSocketEvents.set(url, events);
    webSocket.on("close", () => {
      events.closeCount += 1;
    });
    webSocket.on("framereceived", () => {
      events.frameReceivedCount += 1;
    });
    webSocket.on("framesent", () => {
      events.frameSentCount += 1;
    });
    webSocket.on("socketerror", () => {
      events.socketErrorCount += 1;
    });
  });
  const canaryResponse = await canaryPage.goto(isolationCanaryUrl, { waitUntil: "domcontentloaded" });
  const canaryAttemptsAfter = denyProxy
    .getAttempts()
    .filter(({ method, target }) => method === "GET" && target === isolationCanaryUrl)
    .reduce((total, { count }) => total + count, 0);
  const browserNetworkIsolationCanary = {
    attemptCount: canaryAttemptsAfter - canaryAttemptsBefore,
    responseHeader: canaryResponse?.headers()["x-homarr-benchmark-blocked"] ?? null,
    status: canaryResponse?.status() ?? null,
    url: isolationCanaryUrl,
  };
  const runWebSocketIsolationCanaryAsync = async (url: string, connectTarget: string) => {
    const getAttemptCount = () =>
      denyProxy
        ?.getAttempts()
        .filter(
          ({ method, target }) =>
            (method === "CONNECT" && target === connectTarget) || (method === "UPGRADE" && target === url),
        )
        .reduce((total, { count }) => total + count, 0) ?? 0;
    const attemptsBefore = getAttemptCount();
    const result = await canaryPage.evaluate(
      (canaryUrl) =>
        new Promise<{ closeCode: number | null; errorEvent: boolean; opened: boolean; timedOut: boolean }>(
          (resolve) => {
            const webSocket = new WebSocket(canaryUrl);
            let settled = false;
            const finish = (value: {
              closeCode: number | null;
              errorEvent: boolean;
              opened: boolean;
              timedOut: boolean;
            }) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timeout);
              if (webSocket.readyState === WebSocket.OPEN) webSocket.close();
              resolve(value);
            };
            const timeout = window.setTimeout(
              () => finish({ closeCode: null, errorEvent: false, opened: false, timedOut: true }),
              5_000,
            );
            webSocket.addEventListener("open", () =>
              finish({ closeCode: null, errorEvent: false, opened: true, timedOut: false }),
            );
            webSocket.addEventListener("error", () =>
              finish({ closeCode: null, errorEvent: true, opened: false, timedOut: false }),
            );
            webSocket.addEventListener("close", (event) =>
              finish({ closeCode: event.code, errorEvent: false, opened: false, timedOut: false }),
            );
          },
        ),
      url,
    );
    const eventsDeadline = Date.now() + 2_000;
    while (Date.now() < eventsDeadline) {
      const events = canaryWebSocketEvents.get(url);
      if ((events?.closeCount ?? 0) > 0 && (events?.socketErrorCount ?? 0) > 0) break;
      await canaryPage.waitForTimeout(25);
    }
    const events = canaryWebSocketEvents.get(url) ?? {
      closeCount: 0,
      frameReceivedCount: 0,
      frameSentCount: 0,
      socketErrorCount: 0,
    };
    return {
      ...result,
      ...events,
      attemptCount: getAttemptCount() - attemptsBefore,
      browserEventCount: canaryWebSocketUrls.filter((observedUrl) => observedUrl === url).length,
      connectTarget,
      url,
    };
  };
  const browserWebSocketIsolationCanaries = await Promise.all([
    runWebSocketIsolationCanaryAsync(
      "ws://homarr-benchmark-ws.invalid/__websocket-network-isolation-canary__",
      "homarr-benchmark-ws.invalid:80",
    ),
    runWebSocketIsolationCanaryAsync(
      "wss://homarr-benchmark-wss.invalid/__websocket-network-isolation-canary__",
      "homarr-benchmark-wss.invalid:443",
    ),
  ]);
  await canaryContext.close();
  const browserNetworkIsolated =
    browserNetworkIsolationCanary.status === 502 &&
    browserNetworkIsolationCanary.responseHeader === "true" &&
    browserNetworkIsolationCanary.attemptCount > 0 &&
    browserWebSocketIsolationCanaries.every(
      ({
        attemptCount,
        browserEventCount,
        closeCount,
        errorEvent,
        frameReceivedCount,
        frameSentCount,
        opened,
        socketErrorCount,
        timedOut,
      }) =>
        attemptCount > 0 &&
        browserEventCount > 0 &&
        closeCount > 0 &&
        errorEvent &&
        frameReceivedCount === 0 &&
        frameSentCount === 0 &&
        !opened &&
        socketErrorCount > 0 &&
        !timedOut,
    );
  if (!browserNetworkIsolated) {
    throw new Error(
      `Browser network isolation canary failed: ${JSON.stringify({ http: browserNetworkIsolationCanary, webSockets: browserWebSocketIsolationCanaries })}`,
    );
  }
  const browserNetworkObservations = new Map<
    string,
    {
      failedCount: number;
      failureTexts: Set<string>;
      methods: Set<string>;
      origin: string;
      pathname: string;
      protocol: string;
      requestCount: number;
      resourceTypes: Set<string>;
      responseStatuses: Set<number>;
      urlHash: string;
    }
  >();
  const browserWebSocketObservations = new Map<
    string,
    {
      closeCount: number;
      frameReceivedCount: number;
      frameSentCount: number;
      origin: string;
      pathname: string;
      protocol: string;
      requestCount: number;
      socketErrorCount: number;
      urlHash: string;
    }
  >();
  const allowedBrowserOrigin = new URL(baseUrl).origin;
  const allowedBrowserWebSocketUrl = new URL(baseUrl);
  allowedBrowserWebSocketUrl.protocol = allowedBrowserWebSocketUrl.protocol === "https:" ? "wss:" : "ws:";
  const allowedBrowserWebSocketOrigin = allowedBrowserWebSocketUrl.origin;
  const getNetworkObservation = (url: string) => {
    const safeUrl = safeUrlDetails(url);
    const existing = browserNetworkObservations.get(safeUrl.urlHash);
    if (existing) return existing;
    const observation = {
      failedCount: 0,
      failureTexts: new Set<string>(),
      methods: new Set<string>(),
      ...safeUrl,
      requestCount: 0,
      resourceTypes: new Set<string>(),
      responseStatuses: new Set<number>(),
    };
    browserNetworkObservations.set(safeUrl.urlHash, observation);
    return observation;
  };
  const observeBrowserNetwork = (browserContext: BrowserContext) => {
    browserContext.on("request", (request) => {
      const observation = getNetworkObservation(request.url());
      observation.requestCount += 1;
      observation.methods.add(request.method());
      observation.resourceTypes.add(request.resourceType());
    });
    browserContext.on("requestfailed", (request) => {
      const observation = getNetworkObservation(request.url());
      observation.failedCount += 1;
      const failureText = request.failure()?.errorText;
      if (failureText) observation.failureTexts.add(failureText);
    });
    browserContext.on("response", (response) => {
      getNetworkObservation(response.url()).responseStatuses.add(response.status());
    });
    browserContext.on("page", (observedPage) => {
      observedPage.on("websocket", (webSocket) => {
        const url = webSocket.url();
        const safeUrl = safeUrlDetails(url);
        const observation = browserWebSocketObservations.get(safeUrl.urlHash) ?? {
          closeCount: 0,
          frameReceivedCount: 0,
          frameSentCount: 0,
          ...safeUrl,
          requestCount: 0,
          socketErrorCount: 0,
        };
        observation.requestCount += 1;
        browserWebSocketObservations.set(safeUrl.urlHash, observation);
        webSocket.on("close", () => {
          observation.closeCount += 1;
        });
        webSocket.on("framereceived", () => {
          observation.frameReceivedCount += 1;
        });
        webSocket.on("framesent", () => {
          observation.frameSentCount += 1;
        });
        webSocket.on("socketerror", () => {
          observation.socketErrorCount += 1;
        });
      });
    });
  };
  const createBenchmarkContextAsync = async (options: BrowserContextOptions = {}) => {
    if (!browser) throw new Error("Chromium is not running");
    const browserContext = await browser.newContext({
      deviceScaleFactor: 1,
      viewport,
      ...options,
    });
    observeBrowserNetwork(browserContext);
    return browserContext;
  };
  const browserProvenance = {
    engine: "chromium",
    executablePath: chromium.executablePath(),
    headless: true,
    httpCachePolicy: "Chromium default cache enabled within each browser context",
    launchArguments: browserLaunchArguments,
    version: browser.version(),
    viewport: { deviceScaleFactor: 1, ...viewport },
  };
  const context = await createBenchmarkContextAsync();
  await installMeasurementScriptsAsync(context, { deferIdle: true });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => {
      const form = document.querySelector("form");
      return form !== null && Object.keys(form).some((key) => key.startsWith("__reactProps$"));
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.getByLabel("Username").fill("demo");
  await page.locator("#password").fill("demo");
  const loginWidgetDataTracker = trackWidgetDataRequests(page);

  const pageErrors: string[] = [];
  let legacyQueryCacheWriteBytes = 0;
  let legacyQueryCacheWriteCount = 0;
  let trpcRequestCount = 0;
  let nonWidgetTrpcRequestCount = 0;
  let widgetRequestCount = 0;
  let webSocketCount = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("websocket", () => {
    webSocketCount += 1;
  });
  page.on("request", (request) => {
    const procedures = getTrpcProcedures(request.url());
    const widgetProcedures = procedures.filter((procedure) => procedure.startsWith("widget."));
    const legacyQueryCacheWrites = procedures.filter((procedure) => procedure === "queryCache.setItem");
    trpcRequestCount += procedures.length;
    widgetRequestCount += widgetProcedures.length;
    nonWidgetTrpcRequestCount += procedures.length - widgetProcedures.length;
    if (legacyQueryCacheWrites.length > 0) {
      legacyQueryCacheWriteCount += legacyQueryCacheWrites.length;
      legacyQueryCacheWriteBytes += request.postDataBuffer()?.byteLength ?? 0;
    }
  });

  const loginJourneyBoardStartedAt = performance.now();
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${baseUrl}/`, { timeout: 30_000, waitUntil: "domcontentloaded" });
  await page.locator("[data-homarr-dev-benchmark-board]").waitFor({ state: "visible", timeout: 30_000 });
  const loginJourneyBoardMountedMs = Math.round(performance.now() - loginJourneyBoardStartedAt);
  const loginBoardState = await waitForBoardWidgetsAsync(page);
  const { widgetCount, implementationMarkerCount, widgetErrorCount } = loginBoardState;
  if (requireImplementationMarkers && implementationMarkerCount !== widgetCount) {
    throw new Error(`Only ${implementationMarkerCount} of ${widgetCount} widget implementations mounted`);
  }
  if (widgetErrorCount > 0) throw new Error(`Representative board rendered ${widgetErrorCount} widget errors`);
  const loginJourneyWidgetImplementationsMountedMs = requireImplementationMarkers
    ? Math.round(performance.now() - loginJourneyBoardStartedAt)
    : null;
  const loginJourneyWidgetData = await waitForWidgetDataSettledAsync(page, loginWidgetDataTracker, {
    allowUnrecoveredAborts: true,
  });
  const loginJourneyWidgetDataSettledMs =
    loginJourneyWidgetData.completedOperationCount > 0 && loginJourneyWidgetData.unrecoveredAbortedRequests.length === 0
      ? Math.round(performance.now() - loginJourneyBoardStartedAt)
      : null;
  assertBoardWidgetState(await readBoardWidgetStateAsync(page), "Representative board after widget data settled");
  const authenticatedStorageState = await context.storageState();
  const loginJourneyNetworkCounts = {
    trpcRequestCount,
    widgetRequestCount,
    webSocketCount,
    legacyQueryCacheWriteCount,
    legacyQueryCacheWriteBytes,
  };
  const pageLoadSamples = [] as Array<{
    boardMountedMs: number;
    fcpMs: number;
    lcpFinalizedByInputMs: number;
    lcpMs: number;
    ttfbMs: number;
    widgetImplementationsMountedMs: number | null;
    widgetDataObservedOperationCount: number;
    widgetDataSettledMs: number;
  }>;

  // Login uses a soft navigation whose LCP is terminated by the submit click.
  // Keep that journey timing separate and measure browser vitals in a fresh,
  // naturally scheduled authenticated document.
  const initialContext = await createBenchmarkContextAsync({ storageState: authenticatedStorageState });
  await installMeasurementScriptsAsync(initialContext);
  const initialPage = await initialContext.newPage();
  const initialWidgetDataTracker = trackWidgetDataRequests(initialPage);
  const initialPageErrors: string[] = [];
  const initialNetworkCounts = {
    legacyQueryCacheWriteBytes: 0,
    legacyQueryCacheWriteCount: 0,
    trpcRequestCount: 0,
    webSocketCount: 0,
    widgetRequestCount: 0,
  };
  initialPage.on("pageerror", (error) => initialPageErrors.push(error.message));
  initialPage.on("websocket", () => {
    initialNetworkCounts.webSocketCount += 1;
  });
  initialPage.on("request", (request) => {
    const procedures = getTrpcProcedures(request.url());
    const legacyQueryCacheWrites = procedures.filter((procedure) => procedure === "queryCache.setItem");
    initialNetworkCounts.trpcRequestCount += procedures.length;
    initialNetworkCounts.widgetRequestCount += procedures.filter((procedure) => procedure.startsWith("widget.")).length;
    if (legacyQueryCacheWrites.length > 0) {
      initialNetworkCounts.legacyQueryCacheWriteCount += legacyQueryCacheWrites.length;
      initialNetworkCounts.legacyQueryCacheWriteBytes += request.postDataBuffer()?.byteLength ?? 0;
    }
  });
  const initialDashboardStartedAt = performance.now();
  const initialDashboardResponse = await initialPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  if (!initialDashboardResponse?.ok()) {
    throw new Error(`Initial authenticated dashboard returned HTTP ${String(initialDashboardResponse?.status())}`);
  }
  const initialAuthenticatedBoardState = await waitForBoardWidgetsAsync(initialPage);
  if (
    requireImplementationMarkers &&
    initialAuthenticatedBoardState.implementationMarkerCount !== initialAuthenticatedBoardState.widgetCount
  ) {
    throw new Error("Initial authenticated dashboard has incomplete widget implementation markers");
  }
  if (initialAuthenticatedBoardState.widgetErrorCount > 0) {
    throw new Error(
      `Initial authenticated dashboard rendered ${initialAuthenticatedBoardState.widgetErrorCount} widget errors`,
    );
  }
  const initialWidgetData = await waitForWidgetDataSettledAsync(initialPage, initialWidgetDataTracker);
  const initialWidgetDataSettledMs = Math.round(performance.now() - initialDashboardStartedAt);
  assertBoardWidgetState(
    await readBoardWidgetStateAsync(initialPage),
    "Initial authenticated dashboard after widget data settled",
  );
  await waitForFinalLcpAsync(initialPage);
  const initialBrowserMetrics = await readBrowserMetricsAsync(initialPage);
  if (initialBrowserMetrics.lcpFinalizedByInputMs === null) {
    throw new Error("Initial authenticated dashboard did not finalize LCP with trusted input");
  }
  if (initialPageErrors.length > 0) {
    throw new Error(`Initial authenticated dashboard page errors: ${initialPageErrors.join("; ")}`);
  }
  await initialContext.close();

  const trpcRequestCountBeforeIdleSpotlight = trpcRequestCount;
  const nonWidgetTrpcRequestCountBeforeIdleSpotlight = nonWidgetTrpcRequestCount;
  await page.evaluate(() => {
    (window as Window & { homarrReleaseBenchmarkIdleCallbacks?: () => void }).homarrReleaseBenchmarkIdleCallbacks?.();
  });
  await waitForSpotlightIdlePreparationAsync(page);
  const idleSpotlightNetworkCounts = {
    trpcRequestCount: trpcRequestCount - trpcRequestCountBeforeIdleSpotlight,
    nonWidgetTrpcRequestCount: nonWidgetTrpcRequestCount - nonWidgetTrpcRequestCountBeforeIdleSpotlight,
  };
  const idleSpotlightNetworkFailure = getSpotlightIdleNetworkFailure(
    spotlightIdlePolicy,
    idleSpotlightNetworkCounts.nonWidgetTrpcRequestCount,
  );
  if (idleSpotlightNetworkFailure) throw new Error(idleSpotlightNetworkFailure);

  const warmInteractionSamplesMs: number[] = [];
  for (let iteration = 0; iteration < interactionIterations; iteration += 1) {
    const warmInteractionStartedAt = performance.now();
    await page.locator('[data-homarr-dev-benchmark-interaction="search"]:visible').click();
    await page.locator("[data-homarr-dev-benchmark-spotlight]").waitFor({ state: "visible" });
    warmInteractionSamplesMs.push(Math.round(performance.now() - warmInteractionStartedAt));
    await page.keyboard.press("Escape");
    await page.locator("[data-homarr-dev-benchmark-spotlight]").waitFor({ state: "hidden" });
  }
  const postIdleWarmInteractionMs = warmInteractionSamplesMs[0] ?? null;
  const postIdleWarmInteractionSummary = summarize(warmInteractionSamplesMs);

  const websocketStartedAt = performance.now();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(
          `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/websockets`,
        );
        const timeout = window.setTimeout(() => {
          socket.close();
          reject(new Error("WebSocket readiness probe timed out"));
        }, 10_000);
        socket.addEventListener("open", () => {
          window.clearTimeout(timeout);
          socket.close();
          resolve();
        });
        socket.addEventListener("error", () => {
          window.clearTimeout(timeout);
          reject(new Error("WebSocket readiness probe failed"));
        });
      }),
  );
  const websocketReadyMs = Math.round(performance.now() - websocketStartedAt);

  checkpoints.push(await captureCheckpointAsync(containerId, "first-board"));

  for (let iteration = 0; iteration < pageIterations; iteration += 1) {
    const iterationContext = await createBenchmarkContextAsync({ storageState: authenticatedStorageState });
    await installMeasurementScriptsAsync(iterationContext);
    const iterationPage = await iterationContext.newPage();
    const iterationWidgetDataTracker = trackWidgetDataRequests(iterationPage);
    const iterationErrors: string[] = [];
    iterationPage.on("pageerror", (error) => iterationErrors.push(error.message));
    const iterationStartedAt = performance.now();
    const response = await iterationPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
    if (!response?.ok()) {
      throw new Error(`Board iteration ${iteration + 1} returned HTTP ${String(response?.status() ?? "none")}`);
    }
    await iterationPage.locator("[data-homarr-dev-benchmark-board]").waitFor({ state: "visible", timeout: 30_000 });
    const iterationBoardMountedMs = Math.round(performance.now() - iterationStartedAt);
    const iterationBoardState = await waitForBoardWidgetsAsync(iterationPage);
    if (
      requireImplementationMarkers &&
      iterationBoardState.implementationMarkerCount !== iterationBoardState.widgetCount
    ) {
      throw new Error(`Board iteration ${iteration + 1} has incomplete widget implementation markers`);
    }
    if (iterationBoardState.widgetErrorCount > 0) {
      throw new Error(
        `Board iteration ${iteration + 1} rendered ${iterationBoardState.widgetErrorCount} widget errors`,
      );
    }
    const iterationWidgetImplementationsMountedMs = requireImplementationMarkers
      ? Math.round(performance.now() - iterationStartedAt)
      : null;
    const iterationWidgetData = await waitForWidgetDataSettledAsync(iterationPage, iterationWidgetDataTracker);
    const iterationWidgetDataSettledMs = Math.round(performance.now() - iterationStartedAt);
    assertBoardWidgetState(
      await readBoardWidgetStateAsync(iterationPage),
      `Board iteration ${iteration + 1} after widget data settled`,
    );
    await waitForFinalLcpAsync(iterationPage);
    const iterationMetrics = await readBrowserMetricsAsync(iterationPage);
    if (iterationMetrics.fcpMs === null) throw new Error(`Board iteration ${iteration + 1} has no FCP sample`);
    if (iterationMetrics.lcpFinalizedByInputMs === null) {
      throw new Error(`Board iteration ${iteration + 1} did not finalize LCP with trusted input`);
    }
    if (iterationMetrics.lcpMs === null) throw new Error(`Board iteration ${iteration + 1} has no LCP sample`);
    if (iterationMetrics.ttfbMs === null) throw new Error(`Board iteration ${iteration + 1} has no TTFB sample`);
    pageLoadSamples.push({
      boardMountedMs: iterationBoardMountedMs,
      fcpMs: iterationMetrics.fcpMs,
      lcpFinalizedByInputMs: iterationMetrics.lcpFinalizedByInputMs,
      lcpMs: iterationMetrics.lcpMs,
      ttfbMs: iterationMetrics.ttfbMs,
      widgetImplementationsMountedMs: iterationWidgetImplementationsMountedMs,
      widgetDataObservedOperationCount: iterationWidgetData.observedOperationCount,
      widgetDataSettledMs: iterationWidgetDataSettledMs,
    });
    if (iterationErrors.length > 0) {
      throw new Error(`Board iteration ${iteration + 1} page errors: ${iterationErrors.join("; ")}`);
    }
    await iterationContext.close();
  }

  const coldContext = await createBenchmarkContextAsync({ storageState: authenticatedStorageState });
  await coldContext.addInitScript(() => {
    // Keep the cold-interaction probe cold instead of racing the application's
    // intentional requestIdleCallback prefetch.
    Object.defineProperty(window, "requestIdleCallback", { value: () => 0, configurable: true });
    Object.defineProperty(window, "cancelIdleCallback", { value: () => undefined, configurable: true });
  });
  const coldPage = await coldContext.newPage();
  const coldPageErrors: string[] = [];
  coldPage.on("pageerror", (error) => coldPageErrors.push(error.message));
  const coldResponse = await coldPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  if (!coldResponse?.ok()) {
    throw new Error(`Cold-interaction board returned HTTP ${String(coldResponse?.status() ?? "none")}`);
  }
  await coldPage.locator("[data-homarr-dev-benchmark-board]").waitFor({ state: "visible", timeout: 30_000 });
  await coldPage.evaluate(() => {
    const state = {
      clickedAtMs: null as number | null,
      feedbackAtMs: null as number | null,
      observer: null as MutationObserver | null,
    };
    const recordFeedback = () => {
      const element = document.querySelector("[data-homarr-dev-benchmark-spotlight-feedback]");
      if (
        state.clickedAtMs !== null &&
        state.feedbackAtMs === null &&
        element instanceof HTMLElement &&
        element.getClientRects().length > 0 &&
        window.getComputedStyle(element).visibility !== "hidden"
      ) {
        state.feedbackAtMs = performance.now();
      }
    };
    document.addEventListener(
      "click",
      (event) => {
        if (
          !(event.target instanceof Element) ||
          !event.target.closest('[data-homarr-dev-benchmark-interaction="search"]')
        )
          return;
        state.clickedAtMs = performance.now();
        state.observer = new MutationObserver(recordFeedback);
        state.observer.observe(document.documentElement, {
          attributes: true,
          childList: true,
          subtree: true,
        });
        recordFeedback();
      },
      { capture: true, once: true },
    );
    Object.defineProperty(window, "homarrColdSpotlightProbe", { configurable: true, value: state });
  });
  const coldInteractionStartedAt = performance.now();
  await coldPage.locator('[data-homarr-dev-benchmark-interaction="search"]:visible').click();
  await coldPage.locator("[data-homarr-dev-benchmark-spotlight]").waitFor({ state: "visible" });
  const coldSpotlightReadyMs = Math.round(performance.now() - coldInteractionStartedAt);
  const coldSpotlightFeedbackMs = await coldPage.evaluate(() => {
    const state = (
      window as Window & {
        homarrColdSpotlightProbe?: {
          clickedAtMs: number | null;
          feedbackAtMs: number | null;
          observer: MutationObserver | null;
        };
      }
    ).homarrColdSpotlightProbe;
    state?.observer?.disconnect();
    return state?.clickedAtMs !== null && state?.clickedAtMs !== undefined && state.feedbackAtMs !== null
      ? Math.round(state.feedbackAtMs - state.clickedAtMs)
      : null;
  });
  if (coldPageErrors.length > 0) throw new Error(`Cold-interaction page errors: ${coldPageErrors.join("; ")}`);
  await coldPage.close();
  await coldContext.close();

  const routeContext = await createBenchmarkContextAsync({ storageState: authenticatedStorageState });
  await installMeasurementScriptsAsync(routeContext);
  const routePage = await routeContext.newPage();
  const routePageErrors: string[] = [];
  routePage.on("pageerror", (error) => routePageErrors.push(error.message));
  const routeTimings = [] as Array<{ path: string; durationMs: number; status: number | null }>;
  for (const routePath of routePaths) {
    const startedAt = performance.now();
    const response = await routePage.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded" });
    await routePage.locator("main:visible").waitFor({ state: "visible", timeout: 30_000 });
    if (!response?.ok()) throw new Error(`Route ${routePath} returned HTTP ${String(response?.status() ?? "none")}`);
    routeTimings.push({
      path: routePath,
      durationMs: Math.round(performance.now() - startedAt),
      status: response.status(),
    });
  }

  await routePage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  const finalBoardState = await waitForBoardWidgetsAsync(routePage);
  if (requireImplementationMarkers && finalBoardState.implementationMarkerCount !== finalBoardState.widgetCount) {
    throw new Error("Final board load has incomplete widget implementation markers");
  }
  if (finalBoardState.widgetErrorCount > 0) {
    throw new Error(`Final board load rendered ${finalBoardState.widgetErrorCount} widget errors`);
  }
  await waitForSpotlightIdlePreparationAsync(routePage);
  if (routePageErrors.length > 0) throw new Error(`Route browser page errors: ${routePageErrors.join("; ")}`);
  checkpoints.push(await captureCheckpointAsync(containerId, "workload"));

  const settleDeadline = Date.now() + settleMs;
  let sample = 0;
  while (Date.now() < settleDeadline) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(sampleIntervalMs, settleDeadline - Date.now())));
    sample += 1;
    checkpoints.push(await captureCheckpointAsync(containerId, `settle-${sample}`));
  }

  if (pageErrors.length > 0) throw new Error(`Browser page errors: ${pageErrors.join("; ")}`);
  if (widgetRequestCount === 0) throw new Error("Representative board made no widget requests");
  if (webSocketCount === 0) throw new Error("WebSocket readiness was not observed by the browser");

  const containerLogs = await execFileAsync("docker", ["logs", containerId]);
  const startupErrors = `${containerLogs.stdout}\n${containerLogs.stderr}`
    .split("\n")
    .filter((line) => /Failed to (?:load|start) embedded/.test(line));
  if (startupErrors.length > 0) throw new Error(`Embedded service startup failed: ${startupErrors.join("; ")}`);

  const browserNetworkRequests = [...browserNetworkObservations.values()]
    .map((observation) => ({
      failedCount: observation.failedCount,
      failureTexts: [...observation.failureTexts].toSorted(),
      methods: [...observation.methods].toSorted(),
      origin: observation.origin,
      pathname: observation.pathname,
      protocol: observation.protocol,
      requestCount: observation.requestCount,
      resourceTypes: [...observation.resourceTypes].toSorted(),
      responseStatuses: [...observation.responseStatuses].toSorted((left, right) => left - right),
      urlHash: observation.urlHash,
    }))
    .toSorted((left, right) => left.urlHash.localeCompare(right.urlHash));
  const browserWebSockets = [...browserWebSocketObservations.values()].toSorted((left, right) =>
    left.urlHash.localeCompare(right.urlHash),
  );
  const externalBrowserWebSockets = browserWebSockets.filter(({ origin }) => origin !== allowedBrowserWebSocketOrigin);
  if (externalBrowserWebSockets.length > 0) {
    throw new Error(
      `Application pages attempted external WebSockets: ${externalBrowserWebSockets
        .map(({ origin, pathname, urlHash }) => `${origin}${pathname}#${urlHash.slice(0, 12)}`)
        .join("; ")}`,
    );
  }
  const externalBrowserRequests = browserNetworkRequests.filter(
    ({ origin, protocol }) => (protocol === "http:" || protocol === "https:") && origin !== allowedBrowserOrigin,
  );
  const unexpectedExternalResponses = externalBrowserRequests.flatMap(
    ({ origin, pathname, responseStatuses, urlHash }) =>
      responseStatuses.filter((status) => status !== 502).map((status) => ({ origin, pathname, status, urlHash })),
  );
  if (unexpectedExternalResponses.length > 0) {
    throw new Error(
      `External browser responses bypassed the deny proxy: ${unexpectedExternalResponses
        .map(({ origin, pathname, status, urlHash }) => `${status} ${origin}${pathname}#${urlHash.slice(0, 12)}`)
        .join("; ")}`,
    );
  }
  const proxyAttempts = denyProxy
    .getAttempts()
    .filter(({ method, target }) => !(method === "GET" && target === isolationCanaryUrl));
  const safeProxyAttempts = proxyAttempts.map(({ count, method, target }) => {
    const targetHash = createHash("sha256").update(target).digest("hex");
    try {
      const safeUrl = safeUrlDetails(method === "CONNECT" ? `https://${target}` : target);
      return { count, method, ...safeUrl, targetHash };
    } catch {
      return { count, method, origin: null, pathname: null, protocol: null, targetHash, urlHash: null };
    }
  });
  const observedOrigins = [...new Set(browserNetworkRequests.map(({ origin }) => origin))].toSorted();

  const settleSampleCount = checkpoints.filter(({ name }) => name.startsWith("settle-")).length;
  const pageLoadSummary = {
    boardMountedMs: summarize(pageLoadSamples.map((measurement) => measurement.boardMountedMs)),
    fcpMs: summarize(pageLoadSamples.map((measurement) => measurement.fcpMs)),
    lcpFinalizedByInputMs: summarize(pageLoadSamples.map((measurement) => measurement.lcpFinalizedByInputMs)),
    lcpMs: summarize(pageLoadSamples.map((measurement) => measurement.lcpMs)),
    ttfbMs: summarize(pageLoadSamples.map((measurement) => measurement.ttfbMs)),
    widgetImplementationsMountedMs: summarize(
      pageLoadSamples.flatMap((measurement) =>
        measurement.widgetImplementationsMountedMs === null ? [] : [measurement.widgetImplementationsMountedMs],
      ),
    ),
    widgetDataSettledMs: summarize(pageLoadSamples.map((measurement) => measurement.widgetDataSettledMs)),
  };
  const eligibilityInput = {
    expectedSha,
    expectedSourceFingerprint,
    browserNetworkIsolated,
    serverNetworkIsolated,
    imageArchitecture: imageInspect.Architecture,
    lcpObservationMs,
    lcpSampleCount: pageLoadSummary.lcpMs.count,
    nodeArchitecture: process.arch,
    revision,
    sourceFingerprint,
    pageSampleCount: pageLoadSamples.length,
    requireImplementationMarkers,
    settleMs,
    settleSampleCount,
    widgetDataQuietMs,
    widgetDataSampleCount: pageLoadSummary.widgetDataSettledMs.count,
  };
  const metricEligibility = getRuntimeMetricEligibility(eligibilityInput);
  const claimIneligibleReasons = getRuntimeClaimIneligibleReasons(eligibilityInput);
  const claimEligible = claimIneligibleReasons.length === 0;
  const result = {
    schemaVersion: 7,
    claimEligible,
    claimIneligibleReasons,
    claimScope: ["pageLoads", "largestContentfulPaint", "widgetDataSettled", "settleStability"],
    metricEligibility,
    createdAt: new Date().toISOString(),
    image: {
      requested: image,
      id: imageInspect.Id,
      digest: imageInspect.RepoDigests?.[0] ?? null,
      revision,
      sourceFingerprint,
      architecture: imageInspect.Architecture,
      localUncompressedBytes: imageInspect.Size,
    },
    host: {
      architecture: process.arch,
      cpus: os.cpus().map(({ model }) => model),
      node: { executable: process.execPath, version: process.version, v8Version: process.versions.v8 },
      platform: os.platform(),
      release: os.release(),
      totalMemoryBytes: os.totalmem(),
    },
    provenance: {
      browser: browserProvenance,
      container: {
        cpuLimit: 2,
        memoryLimitBytes: 1024 ** 3,
        network: { id: isolationNetworkId, internal: true, name: isolationNetworkName },
        node: containerNode,
      },
      ingressProxy: {
        containerId: proxyContainerId,
        excludedFromMemorySamples: true,
        implementation: "Node.js TCP proxy",
      },
      docker: {
        engine: {
          architecture: dockerInfo.Architecture ?? null,
          cgroupDriver: dockerInfo.CgroupDriver ?? null,
          cgroupVersion: dockerInfo.CgroupVersion ?? null,
          cpuCount: dockerInfo.NCPU ?? null,
          kernelVersion: dockerInfo.KernelVersion ?? null,
          memoryBytes: dockerInfo.MemTotal ?? null,
          operatingSystem: dockerInfo.OperatingSystem ?? null,
          osType: dockerInfo.OSType ?? null,
          serverVersion: dockerInfo.ServerVersion ?? null,
          storageDriver: dockerInfo.Driver ?? null,
        },
        version: dockerVersion,
      },
    },
    browserNetworkIsolation: {
      active: browserNetworkIsolated,
      allowedOrigins: [allowedBrowserOrigin, allowedBrowserWebSocketOrigin],
      blockedProxyAttemptCount: proxyAttempts.reduce((total, { count }) => total + count, 0),
      externalBrowserRequests,
      externalBrowserWebSockets,
      hostResolverPolicy: "deny all DNS except localhost and 127.0.0.1",
      httpCachePolicy: browserProvenance.httpCachePolicy,
      observedOrigins,
      proxy: { host: denyProxy.host, port: denyProxy.port, policy: "deny", attempts: safeProxyAttempts },
      canaries: { http: browserNetworkIsolationCanary, webSockets: browserWebSocketIsolationCanaries },
      observedWebSockets: browserWebSockets,
      unexpectedExternalResponses,
    },
    serverNetworkIsolation: {
      active: serverNetworkIsolated,
      canary: serverNetworkIsolationCanary,
      network: { id: isolationNetworkId, internal: true, name: isolationNetworkName },
      policy: "application container attached only to an internal Docker network",
    },
    workload: {
      baseUrl,
      startToReadyMs,
      settleMs,
      sampleIntervalMs,
      settleSampleCount,
      lcpObservationMs,
      lcpStabilityMs,
      widgetDataQuietMs,
      spotlightIdleMs,
      spotlightIdlePolicy,
      interactionIterations,
      widgetCount,
      implementationMarkerPolicy: readyMarkerPolicy,
      widgetImplementationMarkerCount: implementationMarkerCount,
      widgetErrorCount,
      loginJourneyBoardMountedMs,
      loginJourneyWidgetImplementationsMountedMs,
      loginJourneyWidgetData,
      loginJourneyWidgetDataSettledMs,
      pageLoadSamples,
      pageLoadSummary,
      coldSpotlightFeedbackMs,
      coldSpotlightReadyMs,
      idleSpotlightNetworkCounts,
      postIdleWarmInteractionMs,
      postIdleWarmInteractionSummary,
      warmInteractionSamplesMs,
      routeTimings,
      trpcRequestCount,
      widgetRequestCount,
      webSocketCount,
      websocketReadyMs,
      legacyQueryCacheWriteCount,
      legacyQueryCacheWriteBytes,
      initialNetworkCounts,
      loginJourneyNetworkCounts,
      initialBrowserMetrics,
      initialWidgetData,
      initialWidgetDataSettledMs,
    },
    checkpoints,
    summary: summarizeRuntimeMemory(checkpoints),
  };
  const outputPath = path.join(outputDirectory, `runtime-${Date.now()}.json`);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    JSON.stringify({ outputPath, claimEligible, summary: result.summary, workload: result.workload }, null, 2),
  );

  await page.close();
  await context.close();
  await routeContext.close();
} catch (error) {
  if (containerId) {
    const logs = await execFileAsync("docker", ["logs", "--tail", "100", containerId]).catch(() => null);
    if (logs?.stdout) console.error(logs.stdout);
    if (logs?.stderr) console.error(logs.stderr);
  }
  throw error;
} finally {
  process.off("SIGINT", handleSigint);
  process.off("SIGTERM", handleSigterm);
  await cleanupAsync();
}
