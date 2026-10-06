import { describe, expect, it } from "vitest";

import type { BenchmarkPairInput, BuildResult, RuntimeResult } from "./benchmark-pair-lib.mts";
import { compareBenchmarkPair } from "./benchmark-pair-lib.mts";

const runWindow = (index: number) => {
  const startedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index * 2)).toISOString();
  const finishedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index * 2 + 1)).toISOString();
  return { startedAt, finishedAt };
};

const expectedCache = [{ logicalId: "pnpm-store", target: "/pnpm/store", mustIncreaseUsage: true }];
const cacheStability = { attempts: 6, pollIntervalMs: 2_000, stableForMs: 10_000, timeoutMs: 30_000 };
const cacheSnapshot = (side: "baseline" | "candidate", stage: "empty" | "warm" | "r1" | "r2") => ({
  cacheMountCount: stage === "empty" ? 0 : 1,
  cacheMounts:
    stage === "empty"
      ? []
      : [
          {
            logicalId: "pnpm-store",
            recordId: `${side}-pnpm-record`,
            target: "/pnpm/store",
            usageCount: { warm: 1, r1: 2, r2: 3 }[stage],
          },
        ],
  recordCount: stage === "empty" ? 0 : { warm: 10, r1: 12, r2: 14 }[stage],
  recordsFingerprint: `${side}-${stage}`,
});

const build = (side: "baseline" | "candidate", repetition: number): BuildResult => ({
  schemaVersion: 4,
  createdAt: runWindow(side === "baseline" ? (repetition === 1 ? 2 : 5) : repetition === 1 ? 3 : 4).finishedAt,
  run: runWindow(side === "baseline" ? (repetition === 1 ? 2 : 5) : repetition === 1 ? 3 : 4),
  claimEligible: true,
  claimIneligibleReasons: [],
  mode: "source-change",
  builder: `${side}-builder`,
  runLabel: side,
  declaredRevision: "head+worktree",
  series: { id: "series", cacheState: "warm", repetition, totalRepetitions: 2 },
  source: {
    headSha: "head",
    measuredRevision: "head+worktree",
    fingerprint: `${side}-change-${repetition}`,
    baseFingerprint: `${side}-fingerprint`,
    syntheticSourceChange: { file: "layout.tsx", id: `change-${repetition}` },
  },
  host: {
    architecture: "arm64",
    dockerServer: { architecture: "arm64", operatingSystem: "linux", targetPlatform: "linux/arm64", version: "1" },
    platform: "darwin",
  },
  image: {
    architecture: "arm64",
    digest: null,
    id: `${side}-build-${repetition}`,
    revision: "head+worktree",
    sourceFingerprint: `${side}-change-${repetition}`,
    targetPlatform: "linux/arm64",
  },
  builderCache: {
    expected: expectedCache,
    before: cacheSnapshot(side, repetition === 1 ? "warm" : "r1"),
    after: cacheSnapshot(side, repetition === 1 ? "r1" : "r2"),
    afterStability: cacheStability,
  },
  build: { nextCompileMs: side === "baseline" ? 200 : 100, wallTimeMs: side === "baseline" ? 300 : 150 },
});

const warmup = (side: "baseline" | "candidate"): BuildResult => {
  const run = runWindow(side === "baseline" ? 0 : 1);
  return {
    schemaVersion: 4,
    createdAt: run.finishedAt,
    run,
    claimEligible: false,
    claimIneligibleReasons: ["cached mode does not force an application rebuild"],
    mode: "cached",
    builder: `${side}-builder`,
    runLabel: side,
    declaredRevision: "head+worktree",
    series: { id: "series", cacheState: "cold", repetition: 1, totalRepetitions: 2 },
    source: {
      headSha: "head",
      measuredRevision: "head+worktree",
      fingerprint: `${side}-fingerprint`,
      baseFingerprint: `${side}-fingerprint`,
      syntheticSourceChange: null,
    },
    host: {
      architecture: "arm64",
      dockerServer: {
        architecture: "arm64",
        operatingSystem: "linux",
        targetPlatform: "linux/arm64",
        version: "1",
      },
      platform: "darwin",
    },
    image: {
      architecture: "arm64",
      digest: null,
      id: `${side}-runtime-image`,
      revision: "head+worktree",
      sourceFingerprint: `${side}-fingerprint`,
      targetPlatform: "linux/arm64",
    },
    builderCache: {
      expected: expectedCache,
      before: cacheSnapshot(side, "empty"),
      after: cacheSnapshot(side, "warm"),
      afterStability: cacheStability,
    },
    build: { nextCompileMs: side === "baseline" ? 400 : 300, wallTimeMs: side === "baseline" ? 500 : 400 },
  };
};

const runtimeSample = (value: number) => ({
  boardMountedMs: value,
  fcpMs: value,
  lcpFinalizedByInputMs: 5_100,
  lcpMs: value,
  ttfbMs: value,
  widgetImplementationsMountedMs: value,
  widgetDataSettledMs: value,
});

const runtime = (side: "baseline" | "candidate"): RuntimeResult => {
  return {
    schemaVersion: 7,
    claimEligible: true,
    claimIneligibleReasons: [],
    claimScope: ["pageLoads", "largestContentfulPaint", "widgetDataSettled", "settleStability"],
    metricEligibility: Object.fromEntries(
      ["pageLoads", "largestContentfulPaint", "widgetDataSettled", "settleStability"].map((key) => [
        key,
        { claimEligible: true },
      ]),
    ),
    image: {
      architecture: "arm64",
      digest: null,
      id: `${side}-runtime-image`,
      revision: "head+worktree",
      sourceFingerprint: `${side}-fingerprint`,
    },
    host: { architecture: "arm64", node: { version: "24", v8Version: "13" }, platform: "darwin", release: "1" },
    provenance: {
      browser: {
        engine: "chromium",
        executablePath: "/chromium",
        headless: true,
        httpCachePolicy: "default",
        launchArguments: [`--proxy-server=http://127.0.0.1:${side === "baseline" ? "31001" : "32002"}`],
        version: "1",
        viewport: { width: 1280, height: 720 },
      },
      container: {
        cpuLimit: 2,
        memoryLimitBytes: 1024,
        network: { internal: true },
        node: { architecture: "arm64", platform: "linux", version: "24", v8Version: "13" },
      },
      docker: { engine: { version: "1" }, version: { version: "1" } },
      ingressProxy: { excludedFromMemorySamples: true, implementation: "Node.js TCP proxy" },
    },
    browserNetworkIsolation: {
      active: true,
      canaries: {
        http: { attemptCount: 1, responseHeader: "true", status: 502 },
        webSockets: [
          { connectTarget: "browser-ws.invalid:80", url: "ws://browser-ws.invalid/canary" },
          { connectTarget: "browser-wss.invalid:443", url: "wss://browser-wss.invalid/canary" },
        ].map((canary) => ({
          ...canary,
          attemptCount: 1,
          browserEventCount: 1,
          closeCount: 1,
          errorEvent: true,
          frameReceivedCount: 0,
          frameSentCount: 0,
          opened: false,
          socketErrorCount: 1,
          timedOut: false,
        })),
      },
      externalBrowserWebSockets: [],
      unexpectedExternalResponses: [],
    },
    serverNetworkIsolation: {
      active: true,
      canary: { directIp: { blocked: true }, domain: { blocked: true } },
      network: { internal: true },
    },
    workload: {
      settleMs: 600_000,
      sampleIntervalMs: 30_000,
      settleSampleCount: 20,
      lcpObservationMs: 5_000,
      lcpStabilityMs: 500,
      widgetDataQuietMs: 500,
      spotlightIdleMs: 2_500,
      spotlightIdlePolicy: side === "baseline" ? "mounted" : "preload-only",
      interactionIterations: 7,
      widgetCount: 32,
      implementationMarkerPolicy: "true",
      widgetImplementationMarkerCount: 32,
      widgetErrorCount: 0,
      startToReadyMs: 1_000,
      coldSpotlightFeedbackMs: 20,
      coldSpotlightReadyMs: 200,
      postIdleWarmInteractionMs: 30,
      routeTimings: [{ path: "/manage" }],
      pageLoadSamples: Array.from({ length: 20 }, () => runtimeSample(side === "baseline" ? 200 : 100)),
    },
    checkpoints: [
      { capturedAt: new Date(0).toISOString(), name: "startup" },
      { capturedAt: new Date(1_000).toISOString(), name: "workload" },
      ...Array.from({ length: 20 }, (_, index) => ({
        capturedAt: new Date(1_000 + (index + 1) * 30_000).toISOString(),
        name: `settle-${index + 1}`,
      })),
    ],
    summary: { startupBytes: 1, workloadBytes: 2, settledBytes: 2, peakBytes: 3 },
  };
};

const validInput = (): BenchmarkPairInput => ({
  baselineWarmup: warmup("baseline"),
  candidateWarmup: warmup("candidate"),
  baselineBuilds: [build("baseline", 1), build("baseline", 2)],
  candidateBuilds: [build("candidate", 1), build("candidate", 2)],
  baselineRuntime: runtime("baseline"),
  candidateRuntime: runtime("candidate"),
});

describe("benchmark pair validation", () => {
  it("accepts a complete, isolated, provenance-matched comparison", () => {
    const result = compareBenchmarkPair(validInput());

    expect(result.claimEligible).toBe(true);
    expect(result.claimIneligibleReasons).toEqual([]);
    expect(result.runtime.lcpMs.comparison).toMatchObject({ baseline: 200, candidate: 100, improvementPercent: 50 });
  });

  it("rejects an incomplete build series", () => {
    const input = validInput();
    input.candidateBuilds.pop();

    expect(compareBenchmarkPair(input).claimIneligibleReasons).toContain("candidate build repetitions are incomplete");
  });

  it("rejects runtime source drift and uncontrolled server egress", () => {
    const input = validInput();
    input.candidateRuntime.image.sourceFingerprint = "wrong";
    input.candidateRuntime.serverNetworkIsolation.canary.directIp.blocked = false;

    const result = compareBenchmarkPair(input);
    expect(result.claimEligible).toBe(false);
    expect(result.claimIneligibleReasons).toContain(
      "candidate runtime image does not match the candidate build source",
    );
    expect(result.claimIneligibleReasons).toContain("candidate server network is not isolated");
  });

  it("rejects runtime evidence without blocked HTTP, WS, and WSS browser canaries", () => {
    const input = validInput();
    const wssCanary = input.candidateRuntime.browserNetworkIsolation.canaries.webSockets[1];
    if (!wssCanary) throw new Error("Missing WSS canary fixture");
    wssCanary.opened = true;

    expect(compareBenchmarkPair(input).claimIneligibleReasons).toContain("candidate browser network is not isolated");
  });

  it("requires one WS and one WSS browser isolation canary", () => {
    const input = validInput();
    const wssCanary = input.candidateRuntime.browserNetworkIsolation.canaries.webSockets[1];
    if (!wssCanary) throw new Error("Missing WSS canary fixture");
    wssCanary.url = "ws://second-browser-ws.invalid/canary";
    wssCanary.connectTarget = "second-browser-ws.invalid:80";

    expect(compareBenchmarkPair(input).claimIneligibleReasons).toContain("candidate browser network is not isolated");
  });

  it("recomputes runtime claim minima instead of trusting embedded eligibility flags", () => {
    const input = validInput();
    input.candidateRuntime.claimScope = [];
    input.candidateRuntime.workload.lcpObservationMs = 1_000;
    input.candidateRuntime.workload.widgetDataQuietMs = 100;
    input.candidateRuntime.workload.settleMs = 1_000;
    input.candidateRuntime.workload.settleSampleCount = 19;
    input.candidateRuntime.checkpoints.pop();
    const firstSample = input.candidateRuntime.workload.pageLoadSamples[0];
    if (!firstSample) throw new Error("Missing runtime sample fixture");
    firstSample.lcpMs = Number.POSITIVE_INFINITY;

    const reasons = compareBenchmarkPair(input).claimIneligibleReasons;
    expect(reasons).toContain("candidate runtime claim scope is incomplete");
    expect(reasons).toContain("candidate runtime LCP observation is below 5000ms");
    expect(reasons).toContain("candidate runtime widget-data quiet window is below 500ms");
    expect(reasons).toContain("candidate runtime settle duration is below 600000ms");
    expect(reasons).toContain("candidate runtime has fewer than 20 settle samples");
    expect(reasons).toContain("candidate runtime metric lcpMs has invalid or missing samples");
  });

  it("recomputes measured cache-mount use instead of trusting build eligibility flags", () => {
    const input = validInput();
    const firstBuild = input.candidateBuilds[0];
    const beforeMount = firstBuild?.builderCache.before?.cacheMounts[0];
    const afterMount = firstBuild?.builderCache.after?.cacheMounts[0];
    if (!beforeMount || !afterMount) throw new Error("Missing cache mount fixture");
    afterMount.usageCount = beforeMount.usageCount;

    expect(compareBenchmarkPair(input).claimIneligibleReasons).toContain(
      "candidate repetition 1 build cache mount pnpm-store usage did not increase",
    );
  });

  it("verifies actual settle chronology, LCP finalization, and immutable build fingerprints", () => {
    const input = validInput();
    const finalSettle = input.candidateRuntime.checkpoints.at(-1);
    const firstSample = input.candidateRuntime.workload.pageLoadSamples[0];
    const firstBuild = input.candidateBuilds[0];
    if (!finalSettle || !firstSample || !firstBuild) throw new Error("Missing evidence fixture");
    finalSettle.capturedAt = new Date(500_000).toISOString();
    firstSample.lcpFinalizedByInputMs = 4_999;
    firstBuild.image.sourceFingerprint = "wrong-fingerprint";

    const reasons = compareBenchmarkPair(input).claimIneligibleReasons;
    expect(reasons).toContain("candidate runtime checkpoint span is shorter than the declared settle duration");
    expect(reasons).toContain("candidate runtime LCP samples were not observed and finalized for the declared window");
    expect(reasons).toContain("candidate build image fingerprint does not match its immutable source snapshot");
  });

  it("rejects a contaminated warmup or cache use outside the measured chain", () => {
    const input = validInput();
    if (input.candidateWarmup.builderCache.before) input.candidateWarmup.builderCache.before.recordCount = 1;
    if (input.baselineBuilds[0]?.builderCache.before) {
      input.baselineBuilds[0].builderCache.before.recordsFingerprint = "unrecorded-cache-use";
    }

    const result = compareBenchmarkPair(input);
    expect(result.claimIneligibleReasons).toContain("candidate warmup builder did not begin empty");
    expect(result.claimIneligibleReasons).toContain("baseline builder cache changed outside repetition 1");
  });

  it("rejects overlapping builds and a stale runtime image with copied labels", () => {
    const input = validInput();
    const candidateFirst = input.candidateBuilds[0];
    if (candidateFirst) candidateFirst.run.startedAt = input.baselineBuilds[0]?.run.startedAt ?? "";
    input.candidateRuntime.image.id = "stale-image-with-matching-labels";

    const result = compareBenchmarkPair(input);
    expect(result.claimIneligibleReasons).toContain("build runs overlap between baseline:1 and candidate:1");
    expect(result.claimIneligibleReasons).toContain(
      "candidate runtime image identity does not match the candidate warmup image",
    );
  });
});
