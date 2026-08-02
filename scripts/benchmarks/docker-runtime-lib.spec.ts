import { describe, expect, it } from "vitest";

import {
  getBrowserNetworkIsolationLaunchArgs,
  getSpotlightIdleMountFailure,
  getSpotlightIdleNetworkFailure,
  getTrpcRequestIdentities,
  getUnrecoveredWidgetDataRequests,
  getTrpcProcedures,
  getRuntimeClaimIneligibleReasons,
  getRuntimeMetricEligibility,
  hasBlockingWidgetDataAborts,
  normalizeDockerArchitecture,
  isRuntimeWidgetDataProcedure,
  isRuntimeWidgetDataRequest,
  inspectTrpcBatchStreamResponse,
  parseRuntimeMemorySnapshot,
  recordWidgetDataRequestOutcome,
  summarizeRuntimeMemory,
} from "./docker-runtime-lib.mts";

const snapshot = (current: number, peak: number, cpuUsageUsec = 1_000) => `memory_current=${current}
memory_peak=${peak}
cgroup_anon=100
cgroup_file=20
cpu_usage_usec=${cpuUsageUsec}
cpu_user_usec=${cpuUsageUsec - 300}
cpu_system_usec=300
cpu_nr_throttled=2
cpu_throttled_usec=50
process=42|1|200|next-server|180
process=7|1|10|redis-server|8
redis_used_memory=30
redis_used_memory_peak=40`;

const trpcRequestUrl = (input: string) =>
  `https://homarr.test/api/trpc/widget.weather.atLocation,app.byIds?batch=1&input=${input}`;

describe("Docker runtime memory parsing", () => {
  it("classifies every procedure in batched tRPC requests", () => {
    expect(getTrpcProcedures("https://homarr.test/api/trpc/widget.foo,queryCache.setItem?batch=1")).toEqual([
      "widget.foo",
      "queryCache.setItem",
    ]);
    expect(getTrpcProcedures("https://homarr.test/api/trpc/widget.foo%2Csearch.query?batch=1")).toEqual([
      "widget.foo",
      "search.query",
    ]);
    expect(getTrpcProcedures("https://homarr.test/api/health/ready")).toEqual([]);
    expect(isRuntimeWidgetDataProcedure("widget.calendar.findAllEvents")).toBe(true);
    expect(isRuntimeWidgetDataProcedure("app.byIds")).toBe(true);
    expect(isRuntimeWidgetDataProcedure("integration.byIds")).toBe(true);
    expect(isRuntimeWidgetDataProcedure("docker.getContainers")).toBe(true);
    expect(isRuntimeWidgetDataProcedure("widget.beszel.getSystemStats")).toBe(true);
    expect(isRuntimeWidgetDataProcedure("widget.beszel.subscribeSystemStats")).toBe(false);
    expect(isRuntimeWidgetDataProcedure("widget.app.ping")).toBe(false);
    expect(isRuntimeWidgetDataProcedure("board.getBoardByName")).toBe(false);
    expect(isRuntimeWidgetDataRequest("GET", "widget.weather.atLocation")).toBe(true);
    expect(isRuntimeWidgetDataRequest("POST", "widget.options.saveItemOptions")).toBe(false);
  });

  it("normalizes Node's x64 architecture to Docker's amd64 name", () => {
    expect(normalizeDockerArchitecture("x64")).toBe("amd64");
    expect(normalizeDockerArchitecture("arm64")).toBe("arm64");
  });

  it("keys batched tRPC operations by procedure and canonical serialized input", () => {
    const first = encodeURIComponent(
      JSON.stringify({
        0: { json: { location: "Paris", units: "metric" } },
        1: { json: { ids: ["app-1"] } },
      }),
    );
    const reordered = encodeURIComponent(
      JSON.stringify({
        0: { json: { units: "metric", location: "Paris" } },
        1: { json: { ids: ["app-1"] } },
      }),
    );
    const different = encodeURIComponent(
      JSON.stringify({
        0: { json: { location: "Lyon", units: "metric" } },
        1: { json: { ids: ["app-1"] } },
      }),
    );
    const identities = getTrpcRequestIdentities(trpcRequestUrl(first));
    expect(identities.map(({ procedure }) => procedure)).toEqual(["widget.weather.atLocation", "app.byIds"]);
    expect(identities.map(({ batchIndex }) => batchIndex)).toEqual([0, 1]);
    expect(identities).toEqual(getTrpcRequestIdentities(trpcRequestUrl(reordered)));
    expect(getTrpcRequestIdentities(trpcRequestUrl(different))[0]?.identity).not.toBe(identities[0]?.identity);
    expect(getTrpcRequestIdentities(trpcRequestUrl(different))[1]?.identity).toBe(identities[1]?.identity);
    expect(identities.every(({ identity }) => /^[^.]+(?:\.[^#]+)+#[a-f0-9]{64}$/.test(identity))).toBe(true);
    expect(JSON.stringify(identities)).not.toContain("Paris");
    expect(() =>
      getTrpcRequestIdentities("https://homarr.test/api/trpc/widget.weather.atLocation?batch=1&input=%7Bmalformed"),
    ).toThrow("Malformed serialized tRPC request input");
  });

  it("requires every aborted widget-data request identity to be recovered by an exact successful request", () => {
    const recoveryBalance = new Map<string, number>();
    recordWidgetDataRequestOutcome(recoveryBalance, ["weather#paris", "app#1"], "aborted");
    recordWidgetDataRequestOutcome(recoveryBalance, ["app#1", "weather#lyon"], "completed");

    expect(getUnrecoveredWidgetDataRequests(recoveryBalance)).toEqual(["weather#paris"]);

    recordWidgetDataRequestOutcome(recoveryBalance, ["weather#paris"], "completed");
    expect(getUnrecoveredWidgetDataRequests(recoveryBalance)).toEqual([]);
  });

  it("credits an earlier successful response when a superseding refetch is aborted", () => {
    const recoveryBalance = new Map<string, number>();
    recordWidgetDataRequestOutcome(recoveryBalance, ["widget.weather.atLocation"], "completed");
    recordWidgetDataRequestOutcome(recoveryBalance, ["widget.weather.atLocation"], "aborted");

    expect(getUnrecoveredWidgetDataRequests(recoveryBalance)).toEqual([]);
  });

  it("allows unrecovered aborts only for the non-claim login transition", () => {
    expect(hasBlockingWidgetDataAborts(true, 2)).toBe(false);
    expect(hasBlockingWidgetDataAborts(false, 0)).toBe(false);
    expect(hasBlockingWidgetDataAborts(false, 1)).toBe(true);
  });

  it("allows eager baseline Spotlight work but keeps preload-only preparation network-free", () => {
    expect(getSpotlightIdleNetworkFailure("mounted", 1)).toBeNull();
    expect(getSpotlightIdleNetworkFailure("preload-only", 0)).toBeNull();
    expect(getSpotlightIdleNetworkFailure("preload-only", 1)).toBe(
      "Idle Spotlight preload-only preparation made 1 non-widget tRPC requests",
    );
    expect(getSpotlightIdleMountFailure("mounted", 1)).toBeNull();
    expect(getSpotlightIdleMountFailure("preload-only", 0)).toBeNull();
    expect(getSpotlightIdleMountFailure("preload-only", 1)).toBe(
      "Idle Spotlight preload mounted the UI before user intent",
    );
  });

  it("fails closed on HTTP, malformed, missing, and per-operation streamed tRPC errors", async () => {
    const errorShape = {
      code: -32603,
      data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
      message: "boom",
    };
    const head = `${JSON.stringify({ json: { 0: [[0], [null, 0, 0]] } })}\n`;
    const errorBody = `${head}${JSON.stringify({ json: [0, 0, [[{ error: errorShape }]]] })}\n`;
    const rejectedBody = `${head}${JSON.stringify({ json: [0, 1, errorShape] })}\n`;
    const rejectedDataBody = [
      head.trimEnd(),
      JSON.stringify({ json: [0, 0, [[{ result: 0 }], ["result", 0, 1]]] }),
      JSON.stringify({ json: [1, 0, [[{ data: 0 }], ["data", 0, 2]]] }),
      JSON.stringify({ json: [2, 1, errorShape] }),
      "",
    ].join("\n");
    const successfulUserDataBody = [
      head.trimEnd(),
      JSON.stringify({ json: [0, 0, [[{ result: 0 }], ["result", 0, 1]]] }),
      JSON.stringify({ json: [1, 0, [[{ data: 0 }], ["data", 0, 2]]] }),
      JSON.stringify({ json: [2, 0, [[{ error: errorShape }]]] }),
      "",
    ].join("\n");
    const mixedBody = [
      JSON.stringify({ json: { 0: [[0], [null, 0, 0]], 1: [[0], [null, 0, 1]] } }),
      JSON.stringify({ json: [0, 0, [[{ result: 0 }], ["result", 0, 2]]] }),
      JSON.stringify({ json: [1, 0, [[{ error: errorShape }]]] }),
      JSON.stringify({ json: [2, 0, [[{ data: "ok" }]]] }),
      "",
    ].join("\n");

    await expect(inspectTrpcBatchStreamResponse(500, errorBody, 2)).resolves.toEqual({
      failures: [
        { batchIndex: 0, kind: "http-status", status: 500 },
        { batchIndex: 1, kind: "http-status", status: 500 },
      ],
      successfulIndexes: [],
    });
    for (const body of ["", "not-json\n", "{}\n", head.trimEnd()]) {
      await expect(inspectTrpcBatchStreamResponse(200, body, 1)).resolves.toEqual({
        failures: [{ batchIndex: 0, kind: "invalid-jsonl" }],
        successfulIndexes: [],
      });
    }
    await expect(inspectTrpcBatchStreamResponse(200, head, 2)).resolves.toEqual({
      failures: [
        { batchIndex: 0, kind: "index-mismatch" },
        { batchIndex: 1, kind: "index-mismatch" },
      ],
      successfulIndexes: [],
    });
    await expect(inspectTrpcBatchStreamResponse(200, errorBody, 1)).resolves.toEqual({
      failures: [
        {
          batchIndex: 0,
          httpStatus: 500,
          jsonRpcCode: -32603,
          kind: "trpc-error",
          trpcCode: "INTERNAL_SERVER_ERROR",
        },
      ],
      successfulIndexes: [],
    });
    for (const body of [rejectedBody, rejectedDataBody]) {
      await expect(inspectTrpcBatchStreamResponse(200, body, 1)).resolves.toEqual({
        failures: [{ batchIndex: 0, kind: "stream-error" }],
        successfulIndexes: [],
      });
    }
    await expect(inspectTrpcBatchStreamResponse(200, successfulUserDataBody, 1)).resolves.toEqual({
      failures: [],
      successfulIndexes: [0],
    });
    await expect(inspectTrpcBatchStreamResponse(200, mixedBody, 2)).resolves.toEqual({
      failures: [
        {
          batchIndex: 1,
          httpStatus: 500,
          jsonRpcCode: -32603,
          kind: "trpc-error",
          trpcCode: "INTERNAL_SERVER_ERROR",
        },
      ],
      successfulIndexes: [0],
    });
  });

  it("isolates external browser traffic without disabling Chromium's HTTP cache", () => {
    expect(getBrowserNetworkIsolationLaunchArgs("http://127.0.0.1:43123")).toEqual([
      "--proxy-server=http://127.0.0.1:43123",
      "--proxy-bypass-list=127.0.0.1;localhost",
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
    ]);
    expect(getBrowserNetworkIsolationLaunchArgs("http://127.0.0.1:43123").join(" ")).not.toContain("disable-cache");
  });

  it("only permits claims with native, SHA-pinned images and enough settle samples", () => {
    expect(
      getRuntimeClaimIneligibleReasons({
        expectedSha: "abc123",
        expectedSourceFingerprint: "source-hash",
        browserNetworkIsolated: true,
        serverNetworkIsolated: true,
        imageArchitecture: "amd64",
        lcpObservationMs: 5_000,
        lcpSampleCount: 20,
        nodeArchitecture: "x64",
        pageSampleCount: 20,
        requireImplementationMarkers: true,
        revision: "abc123",
        sourceFingerprint: "source-hash",
        settleMs: 10 * 60 * 1_000,
        settleSampleCount: 20,
        widgetDataQuietMs: 500,
        widgetDataSampleCount: 20,
      }),
    ).toEqual([]);

    expect(
      getRuntimeClaimIneligibleReasons({
        expectedSha: "abc123",
        expectedSourceFingerprint: "source-hash",
        browserNetworkIsolated: false,
        serverNetworkIsolated: false,
        imageArchitecture: "arm64",
        lcpObservationMs: 1_000,
        lcpSampleCount: 1,
        nodeArchitecture: "x64",
        pageSampleCount: 1,
        requireImplementationMarkers: false,
        revision: null,
        sourceFingerprint: null,
        settleMs: 0,
        settleSampleCount: 0,
        widgetDataQuietMs: 100,
        widgetDataSampleCount: 1,
      }),
    ).toEqual([
      "image architecture arm64 is not host amd64",
      "image revision label is missing",
      "image source fingerprint label is missing",
      "browser external network isolation is not active",
      "server external network isolation is not active",
      "widget implementation markers are not required",
      "page sample count 1 is below 20",
      "LCP observation 1000ms is below 5000ms",
      "LCP sample count 1 is below 20",
      "widget data quiet window 100ms is below 500ms",
      "widget data sample count 1 is below 20",
      "settle duration 0ms is below 600000ms",
      "settle sample count 0 is below 20",
    ]);
  });

  it("scopes repeatable, within-run, and single-sample metrics separately", () => {
    const eligibility = getRuntimeMetricEligibility({
      expectedSha: "abc123",
      expectedSourceFingerprint: "source-hash",
      browserNetworkIsolated: true,
      serverNetworkIsolated: true,
      imageArchitecture: "amd64",
      lcpObservationMs: 5_000,
      lcpSampleCount: 20,
      nodeArchitecture: "x64",
      pageSampleCount: 20,
      requireImplementationMarkers: true,
      revision: "abc123",
      sourceFingerprint: "source-hash",
      settleMs: 10 * 60 * 1_000,
      settleSampleCount: 20,
      widgetDataQuietMs: 500,
      widgetDataSampleCount: 20,
    });

    expect(eligibility.pageLoads).toMatchObject({
      claimEligible: true,
      kind: "comparative",
      requiredSampleCount: 20,
      sampleCount: 20,
    });
    expect(eligibility.largestContentfulPaint).toMatchObject({
      claimEligible: true,
      kind: "comparative",
      requiredSampleCount: 20,
      sampleCount: 20,
    });
    expect(eligibility.widgetDataSettled).toMatchObject({
      claimEligible: true,
      kind: "comparative",
      requiredSampleCount: 20,
      sampleCount: 20,
    });
    expect(eligibility.settleStability).toMatchObject({
      claimEligible: true,
      kind: "within-run",
      requiredSampleCount: 20,
      sampleCount: 20,
    });
    expect(eligibility.settleStability.limitations).toContain("one container instance");
    expect(eligibility.startup).toMatchObject({ claimEligible: false, kind: "diagnostic", sampleCount: 1 });
    expect(eligibility.memoryLevels).toMatchObject({ claimEligible: false, kind: "diagnostic", sampleCount: 1 });
    expect(eligibility.coldSpotlightInteraction).toMatchObject({
      claimEligible: false,
      kind: "diagnostic",
      sampleCount: 1,
    });
  });

  it("normalizes cgroup, process, and Redis values", () => {
    expect(parseRuntimeMemorySnapshot("startup", snapshot(1_000, 2_000))).toMatchObject({
      name: "startup",
      container: { currentBytes: 1_000, peakBytes: 2_000, anonymousBytes: 100, fileBytes: 20 },
      cpu: { usageUsec: 1_000, userUsec: 700, systemUsec: 300, nrThrottled: 2, throttledUsec: 50 },
      processes: [
        { pid: 42, parentPid: 1, rssBytes: 200 * 1024, pssBytes: 180 * 1024, command: "next-server" },
        { pid: 7, parentPid: 1, rssBytes: 10 * 1024, pssBytes: 8 * 1024, command: "redis-server" },
      ],
      redis: { usedMemoryBytes: 30, peakMemoryBytes: 40 },
    });
  });

  it("keeps a failed Redis collection absent instead of reporting zero bytes", () => {
    const withoutRedis = snapshot(1_000, 2_000)
      .split("\n")
      .filter((line) => !line.startsWith("redis_"))
      .join("\n");

    expect(parseRuntimeMemorySnapshot("startup", withoutRedis).redis).toBeNull();
  });

  it("reports workload-to-settled growth and the largest sample", () => {
    const checkpoints = [
      parseRuntimeMemorySnapshot("startup", snapshot(1_000, 2_000)),
      parseRuntimeMemorySnapshot("workload", snapshot(1_100, 2_500, 1_500)),
      parseRuntimeMemorySnapshot("settle-1", snapshot(1_200, 2_500, 1_800)),
    ];
    checkpoints.forEach((checkpoint, index) => {
      checkpoint.capturedAt = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
    });

    expect(summarizeRuntimeMemory(checkpoints)).toEqual({
      startupBytes: 1_000,
      workloadBytes: 1_100,
      settledBytes: 1_200,
      maximumSampleBytes: 1_200,
      peakBytes: 2_500,
      growthBytes: 100,
      growthPercent: 100 / 11,
      settle: {
        count: 1,
        minBytes: 1_200,
        medianBytes: 1_200,
        p95Bytes: 1_200,
        maxBytes: 1_200,
        standardDeviationBytes: 0,
        trendBytesPerHour: null,
        anonymous: {
          count: 1,
          minBytes: 100,
          medianBytes: 100,
          p95Bytes: 100,
          maxBytes: 100,
          standardDeviationBytes: 0,
          trendBytesPerHour: null,
        },
        file: {
          count: 1,
          minBytes: 20,
          medianBytes: 20,
          p95Bytes: 20,
          maxBytes: 20,
          standardDeviationBytes: 0,
          trendBytesPerHour: null,
        },
      },
      cpu: {
        startupToWorkload: { usageUsec: 500, userUsec: 500, systemUsec: 0, nrThrottled: 0, throttledUsec: 0 },
        workloadToSettled: { usageUsec: 300, userUsec: 300, systemUsec: 0, nrThrottled: 0, throttledUsec: 0 },
      },
    });
  });

  it("derives memory trends from observed checkpoint timestamps", () => {
    const first = parseRuntimeMemorySnapshot("settle-1", snapshot(1_000, 2_000));
    const second = parseRuntimeMemorySnapshot("settle-2", snapshot(1_100, 2_000));
    first.capturedAt = "2026-01-01T00:00:00.000Z";
    second.capturedAt = "2026-01-01T02:00:00.000Z";

    expect(summarizeRuntimeMemory([first, second]).settle?.trendBytesPerHour).toBe(50);
  });
});
