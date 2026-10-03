import { createHash } from "node:crypto";
import { jsonlStreamConsumer } from "@trpc/server/unstable-core-do-not-import";
import { deserialize } from "superjson";
import type { SuperJSONResult } from "superjson";

import { isWidgetDataTrpcPath } from "../../packages/api/src/query-cache.ts";

export type RuntimeMemoryCheckpoint = {
  name: string;
  capturedAt: string;
  container: {
    currentBytes: number;
    peakBytes: number | null;
    anonymousBytes: number;
    fileBytes: number;
  };
  cpu: {
    usageUsec: number;
    userUsec: number;
    systemUsec: number;
    nrThrottled: number;
    throttledUsec: number;
  };
  processes: Array<{
    command: string;
    parentPid: number;
    pid: number;
    pssBytes: number;
    rssBytes: number;
  }>;
  redis: { usedMemoryBytes: number; peakMemoryBytes: number } | null;
};

export const minimumClaimSettleMs = 10 * 60 * 1_000;
export const minimumClaimSettleSamples = 20;
export const minimumClaimPageSamples = 20;
export const minimumClaimLcpObservationMs = 5_000;
export const minimumClaimWidgetDataQuietMs = 500;

export const getBrowserNetworkIsolationLaunchArgs = (denyProxyUrl: string) => [
  `--proxy-server=${denyProxyUrl}`,
  "--proxy-bypass-list=127.0.0.1;localhost",
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
];

export const normalizeDockerArchitecture = (nodeArchitecture: string) =>
  nodeArchitecture === "x64" ? "amd64" : nodeArchitecture;

export const getTrpcProcedures = (requestUrl: string) => {
  const pathname = new URL(requestUrl).pathname;
  const prefix = "/api/trpc/";
  const index = pathname.indexOf(prefix);
  if (index < 0) return [];

  return decodeURIComponent(pathname.slice(index + prefix.length))
    .split(",")
    .filter(Boolean);
};

const canonicalizeJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;

  return `{${Object.entries(value)
    .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, nestedValue]) => `${JSON.stringify(key)}:${canonicalizeJson(nestedValue)}`)
    .join(",")}}`;
};

const hashRequestInput = (value: unknown) => createHash("sha256").update(canonicalizeJson(value)).digest("hex");

export type TrpcRequestIdentity = { batchIndex: number; identity: string; inputHash: string; procedure: string };

export const getTrpcRequestIdentities = (requestUrl: string): TrpcRequestIdentity[] => {
  const url = new URL(requestUrl);
  const procedures = getTrpcProcedures(requestUrl);
  if (procedures.length === 0) return [];
  const rawInput = url.searchParams.get("input");
  let parsedInput: unknown = null;
  if (rawInput !== null) {
    try {
      parsedInput = JSON.parse(rawInput) as unknown;
    } catch {
      throw new Error("Malformed serialized tRPC request input");
    }
  }

  const isBatch = url.searchParams.get("batch") === "1";
  return procedures.map((procedure, index) => {
    const input =
      isBatch && parsedInput !== null && typeof parsedInput === "object" && !Array.isArray(parsedInput)
        ? (parsedInput as Record<string, unknown>)[String(index)]
        : parsedInput;
    const inputHash = hashRequestInput(input);
    return { batchIndex: index, procedure, inputHash, identity: `${procedure}#${inputHash}` };
  });
};

export const isRuntimeWidgetDataProcedure = (procedure: string) => {
  if (procedure.split(".").some((part) => part.startsWith("subscribe"))) return false;
  if (procedure.startsWith("widget.")) return procedure !== "widget.app.ping";
  return isWidgetDataTrpcPath(procedure);
};

export const isRuntimeWidgetDataRequest = (method: string, procedure: string) =>
  method === "GET" && isRuntimeWidgetDataProcedure(procedure);

export const recordWidgetDataRequestOutcome = (
  recoveryBalance: Map<string, number>,
  requestIdentities: string[],
  outcome: "aborted" | "completed",
) => {
  const delta = outcome === "aborted" ? 1 : -1;
  for (const requestIdentity of requestIdentities) {
    recoveryBalance.set(requestIdentity, (recoveryBalance.get(requestIdentity) ?? 0) + delta);
  }
};

export const getUnrecoveredWidgetDataRequests = (recoveryBalance: Map<string, number>) =>
  [...recoveryBalance.entries()]
    .filter(([, balance]) => balance > 0)
    .flatMap(([requestIdentity, balance]) => Array.from({ length: balance }, () => requestIdentity))
    .toSorted();

export const hasBlockingWidgetDataAborts = (allowUnrecoveredAborts: boolean, unrecoveredProcedureCount: number) =>
  !allowUnrecoveredAborts && unrecoveredProcedureCount > 0;

export const getSpotlightIdleNetworkFailure = (policy: string, nonWidgetTrpcRequestCount: number) =>
  policy === "preload-only" && nonWidgetTrpcRequestCount > 0
    ? `Idle Spotlight preload-only preparation made ${nonWidgetTrpcRequestCount} non-widget tRPC requests`
    : null;

export const getSpotlightIdleMountFailure = (policy: string, mountedCount: number) =>
  policy === "preload-only" && mountedCount > 0 ? "Idle Spotlight preload mounted the UI before user intent" : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export type TrpcOperationFailure = {
  batchIndex: number;
  kind: "http-status" | "invalid-jsonl" | "index-mismatch" | "invalid-envelope" | "trpc-error" | "stream-error";
  httpStatus?: number;
  jsonRpcCode?: number;
  status?: number;
  trpcCode?: string;
};

export type TrpcBatchInspection = { failures: TrpcOperationFailure[]; successfulIndexes: number[] };

const failEveryOperation = (
  operationCount: number,
  failure: Omit<TrpcOperationFailure, "batchIndex">,
): TrpcBatchInspection => ({
  failures: Array.from({ length: operationCount }, (_, batchIndex) => ({ batchIndex, ...failure })),
  successfulIndexes: [],
});

const safeTrpcError = (batchIndex: number, error: unknown): TrpcOperationFailure => {
  const record = isRecord(error) ? error : {};
  const data = isRecord(record.data) ? record.data : {};
  return {
    batchIndex,
    kind: "trpc-error",
    ...(typeof data.httpStatus === "number" ? { httpStatus: data.httpStatus } : {}),
    ...(typeof record.code === "number" ? { jsonRpcCode: record.code } : {}),
    ...(typeof data.code === "string" ? { trpcCode: data.code } : {}),
  };
};

export const inspectTrpcBatchStreamResponse = async (
  status: number,
  responseBody: string,
  expectedOperationCount: number,
): Promise<TrpcBatchInspection> => {
  if (!Number.isInteger(expectedOperationCount) || expectedOperationCount < 1) {
    throw new Error("expectedOperationCount must be a positive integer");
  }
  if (status < 200 || status >= 300) {
    return failEveryOperation(expectedOperationCount, { kind: "http-status", status });
  }
  if (responseBody.trim().length === 0) return failEveryOperation(expectedOperationCount, { kind: "invalid-jsonl" });

  const physicalLines = responseBody.split("\n");
  const trailing = physicalLines.pop() ?? "";
  if (trailing.trim() !== "") return failEveryOperation(expectedOperationCount, { kind: "invalid-jsonl" });
  try {
    const records = physicalLines.filter((line) => line.trim().length > 0);
    if (records.length === 0) throw new Error("missing JSONL records");
    for (const line of records) {
      const serialized = JSON.parse(line) as unknown;
      if (!isRecord(serialized) || !Object.hasOwn(serialized, "json")) throw new Error("not SuperJSON");
      deserialize(serialized as SuperJSONResult);
    }
  } catch {
    return failEveryOperation(expectedOperationCount, { kind: "invalid-jsonl" });
  }

  const abortController = new AbortController();
  try {
    const bytes = new TextEncoder().encode(responseBody);
    const from = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    const [head] = await jsonlStreamConsumer<Record<string, Promise<unknown>>>({
      abortController,
      deserialize: (value) => deserialize(value as SuperJSONResult),
      formatError: () => new Error("tRPC stream operation error"),
      from,
    });
    if (!isRecord(head)) return failEveryOperation(expectedOperationCount, { kind: "invalid-envelope" });

    const actualIndexes = Object.keys(head);
    const expectedIndexes = Array.from({ length: expectedOperationCount }, (_, index) => String(index));
    if (
      actualIndexes.length !== expectedIndexes.length ||
      expectedIndexes.some((index) => !Object.hasOwn(head, index))
    ) {
      for (const value of Object.values(head)) void Promise.resolve(value).catch(() => undefined);
      return failEveryOperation(expectedOperationCount, { kind: "index-mismatch" });
    }

    const outcomes = await Promise.all(
      expectedIndexes.map(async (key): Promise<{ failure: TrpcOperationFailure | null; index: number }> => {
        const batchIndex = Number(key);
        try {
          const envelope = await Promise.resolve(head[key]);
          if (!isRecord(envelope)) return { failure: { batchIndex, kind: "invalid-envelope" }, index: batchIndex };
          if (Object.hasOwn(envelope, "error")) {
            return { failure: safeTrpcError(batchIndex, envelope.error), index: batchIndex };
          }
          if (!Object.hasOwn(envelope, "result")) {
            return { failure: { batchIndex, kind: "invalid-envelope" }, index: batchIndex };
          }
          const result = await Promise.resolve(envelope.result);
          if (!isRecord(result) || !Object.hasOwn(result, "data")) {
            return { failure: { batchIndex, kind: "invalid-envelope" }, index: batchIndex };
          }
          await Promise.resolve(result.data);
          return { failure: null, index: batchIndex };
        } catch {
          return { failure: { batchIndex, kind: "stream-error" }, index: batchIndex };
        }
      }),
    );
    return {
      failures: outcomes.flatMap(({ failure }) => (failure ? [failure] : [])),
      successfulIndexes: outcomes.flatMap(({ failure, index }) => (failure ? [] : [index])),
    };
  } catch {
    return failEveryOperation(expectedOperationCount, { kind: "invalid-jsonl" });
  } finally {
    abortController.abort();
  }
};

type RuntimeMetricEligibilityInput = {
  expectedSha: string | null;
  expectedSourceFingerprint: string | null;
  browserNetworkIsolated: boolean;
  serverNetworkIsolated: boolean;
  imageArchitecture: string;
  lcpObservationMs: number;
  lcpSampleCount: number;
  nodeArchitecture: string;
  pageSampleCount: number;
  requireImplementationMarkers: boolean;
  revision: string | null;
  sourceFingerprint: string | null;
  settleMs: number;
  settleSampleCount: number;
  widgetDataQuietMs: number;
  widgetDataSampleCount: number;
};

const getRuntimeProvenanceIneligibleReasons = ({
  browserNetworkIsolated,
  serverNetworkIsolated,
  expectedSha,
  expectedSourceFingerprint,
  imageArchitecture,
  nodeArchitecture,
  revision,
  sourceFingerprint,
}: Pick<
  RuntimeMetricEligibilityInput,
  | "browserNetworkIsolated"
  | "serverNetworkIsolated"
  | "expectedSha"
  | "expectedSourceFingerprint"
  | "imageArchitecture"
  | "nodeArchitecture"
  | "revision"
  | "sourceFingerprint"
>) => {
  const reasons: string[] = [];
  const expectedArchitecture = normalizeDockerArchitecture(nodeArchitecture);

  if (imageArchitecture !== expectedArchitecture) {
    reasons.push(`image architecture ${imageArchitecture} is not host ${expectedArchitecture}`);
  }
  if (!expectedSha) reasons.push("RUNTIME_BENCHMARK_SHA is missing");
  else if (!revision) reasons.push("image revision label is missing");
  else if (revision !== expectedSha) reasons.push(`image revision ${revision} does not match ${expectedSha}`);
  if (!expectedSourceFingerprint) reasons.push("RUNTIME_BENCHMARK_SOURCE_FINGERPRINT is missing");
  else if (!sourceFingerprint) reasons.push("image source fingerprint label is missing");
  else if (sourceFingerprint !== expectedSourceFingerprint) {
    reasons.push(`image source fingerprint ${sourceFingerprint} does not match ${expectedSourceFingerprint}`);
  }
  if (!browserNetworkIsolated) reasons.push("browser external network isolation is not active");
  if (!serverNetworkIsolated) reasons.push("server external network isolation is not active");

  return reasons;
};

const createEligibility = ({
  ineligibleReasons,
  kind,
  limitations,
  requiredSampleCount,
  sampleCount,
  sampleUnit,
  scope,
}: {
  ineligibleReasons: string[];
  kind: "comparative" | "diagnostic" | "within-run";
  limitations: string[];
  requiredSampleCount: number | null;
  sampleCount: number;
  sampleUnit: string;
  scope: string;
}) => ({
  claimEligible: ineligibleReasons.length === 0,
  ineligibleReasons,
  kind,
  limitations,
  requiredSampleCount,
  sampleCount,
  sampleUnit,
  scope,
});

export const getRuntimeMetricEligibility = (input: RuntimeMetricEligibilityInput) => {
  const provenanceReasons = getRuntimeProvenanceIneligibleReasons(input);
  const markerReasons = input.requireImplementationMarkers ? [] : ["widget implementation markers are not required"];
  const pageReasons = [
    ...provenanceReasons,
    ...markerReasons,
    ...(input.pageSampleCount < minimumClaimPageSamples
      ? [`page sample count ${input.pageSampleCount} is below ${minimumClaimPageSamples}`]
      : []),
  ];
  const lcpReasons = [
    ...provenanceReasons,
    ...markerReasons,
    ...(input.lcpObservationMs < minimumClaimLcpObservationMs
      ? [`LCP observation ${input.lcpObservationMs}ms is below ${minimumClaimLcpObservationMs}ms`]
      : []),
    ...(input.lcpSampleCount < minimumClaimPageSamples
      ? [`LCP sample count ${input.lcpSampleCount} is below ${minimumClaimPageSamples}`]
      : []),
  ];
  const settleReasons = [
    ...provenanceReasons,
    ...markerReasons,
    ...(input.settleMs < minimumClaimSettleMs
      ? [`settle duration ${input.settleMs}ms is below ${minimumClaimSettleMs}ms`]
      : []),
    ...(input.settleSampleCount < minimumClaimSettleSamples
      ? [`settle sample count ${input.settleSampleCount} is below ${minimumClaimSettleSamples}`]
      : []),
  ];
  const widgetDataReasons = [
    ...provenanceReasons,
    ...markerReasons,
    ...(input.widgetDataQuietMs < minimumClaimWidgetDataQuietMs
      ? [`widget data quiet window ${input.widgetDataQuietMs}ms is below ${minimumClaimWidgetDataQuietMs}ms`]
      : []),
    ...(input.widgetDataSampleCount < minimumClaimPageSamples
      ? [`widget data sample count ${input.widgetDataSampleCount} is below ${minimumClaimPageSamples}`]
      : []),
  ];

  return {
    pageLoads: createEligibility({
      ineligibleReasons: pageReasons,
      kind: "comparative",
      limitations: [
        "samples share one container instance",
        "application ingress traverses a local TCP proxy sidecar excluded from memory samples",
      ],
      requiredSampleCount: minimumClaimPageSamples,
      sampleCount: input.pageSampleCount,
      sampleUnit: "fresh authenticated Chromium document",
      scope: "fresh authenticated dashboard document load timings",
    }),
    largestContentfulPaint: createEligibility({
      ineligibleReasons: lcpReasons,
      kind: "comparative",
      limitations: [
        "samples share one container instance",
        "application ingress traverses a local TCP proxy sidecar excluded from memory samples",
      ],
      requiredSampleCount: minimumClaimPageSamples,
      sampleCount: input.lcpSampleCount,
      sampleUnit: "fresh authenticated Chromium document",
      scope: `dashboard LCP observed for at least ${minimumClaimLcpObservationMs}ms and finalized by trusted input`,
    }),
    widgetDataSettled: createEligibility({
      ineligibleReasons: widgetDataReasons,
      kind: "comparative",
      limitations: [
        "samples share one container instance",
        "covers observed widget read-side tRPC requests; excludes subscriptions and widget.app.ping",
        "application ingress traverses a local TCP proxy sidecar excluded from memory samples",
      ],
      requiredSampleCount: minimumClaimPageSamples,
      sampleCount: input.widgetDataSampleCount,
      sampleUnit: "fresh authenticated Chromium document",
      scope: `widget tRPC completion followed by a ${minimumClaimWidgetDataQuietMs}ms quiet window and two animation frames`,
    }),
    settleStability: createEligibility({
      ineligibleReasons: settleReasons,
      kind: "within-run",
      limitations: [
        "one container instance",
        "eligible only for within-run memory stability and trend, not cross-build RAM level claims",
      ],
      requiredSampleCount: minimumClaimSettleSamples,
      sampleCount: input.settleSampleCount,
      sampleUnit: "time-series checkpoint",
      scope: `one warmed container observed for at least ${minimumClaimSettleMs}ms`,
    }),
    startup: createEligibility({
      ineligibleReasons: ["single container start is diagnostic only"],
      kind: "diagnostic",
      limitations: ["n=1 container start"],
      requiredSampleCount: null,
      sampleCount: 1,
      sampleUnit: "container start",
      scope: "start-to-ready timing",
    }),
    memoryLevels: createEligibility({
      ineligibleReasons: ["memory levels have one container observation per workload stage"],
      kind: "diagnostic",
      limitations: ["n=1 container per workload stage", "settle checkpoints are correlated time samples"],
      requiredSampleCount: null,
      sampleCount: 1,
      sampleUnit: "container instance",
      scope: "startup, workload, peak, and settled RAM levels",
    }),
    coldSpotlightInteraction: createEligibility({
      ineligibleReasons: ["cold Spotlight interaction has one observation"],
      kind: "diagnostic",
      limitations: ["n=1 cold interaction"],
      requiredSampleCount: null,
      sampleCount: 1,
      sampleUnit: "cold browser interaction",
      scope: "first feedback and full-ready Spotlight latency",
    }),
  };
};

export const getRuntimeClaimIneligibleReasons = (input: RuntimeMetricEligibilityInput) => {
  const eligibility = getRuntimeMetricEligibility(input);
  return [
    ...new Set([
      ...eligibility.pageLoads.ineligibleReasons,
      ...eligibility.largestContentfulPaint.ineligibleReasons,
      ...eligibility.widgetDataSettled.ineligibleReasons,
      ...eligibility.settleStability.ineligibleReasons,
    ]),
  ];
};

const readNumericLine = (input: string, key: string) => {
  const match = input.match(new RegExp(`^${key}[=:]\\s*(\\d+)`, "m"));
  return match ? Number(match[1]) : null;
};

export const parseRuntimeMemorySnapshot = (name: string, output: string): RuntimeMemoryCheckpoint => {
  const currentBytes = readNumericLine(output, "memory_current");
  const anonymousBytes = readNumericLine(output, "cgroup_anon");
  const fileBytes = readNumericLine(output, "cgroup_file");
  if (currentBytes === null || anonymousBytes === null || fileBytes === null) {
    throw new Error(`Incomplete cgroup memory snapshot for ${name}`);
  }

  const usageUsec = readNumericLine(output, "cpu_usage_usec");
  const userUsec = readNumericLine(output, "cpu_user_usec");
  const systemUsec = readNumericLine(output, "cpu_system_usec");
  const nrThrottled = readNumericLine(output, "cpu_nr_throttled");
  const throttledUsec = readNumericLine(output, "cpu_throttled_usec");
  if (
    usageUsec === null ||
    userUsec === null ||
    systemUsec === null ||
    nrThrottled === null ||
    throttledUsec === null
  ) {
    throw new Error(`Incomplete cgroup CPU snapshot for ${name}`);
  }

  const processes = output
    .split("\n")
    .filter((line) => line.startsWith("process="))
    .flatMap((line) => {
      const [pid, parentPid, rssKiB, command, pssKiB] = line.slice("process=".length).split("|");
      if (!pid || !parentPid || !rssKiB || !command || !pssKiB) return [];
      return [
        {
          pid: Number(pid),
          parentPid: Number(parentPid),
          rssBytes: Number(rssKiB) * 1024,
          pssBytes: Number(pssKiB) * 1024,
          command,
        },
      ];
    });
  const redisUsed = readNumericLine(output, "redis_used_memory");
  const redisPeak = readNumericLine(output, "redis_used_memory_peak");

  return {
    name,
    capturedAt: new Date().toISOString(),
    container: {
      currentBytes,
      peakBytes: readNumericLine(output, "memory_peak"),
      anonymousBytes,
      fileBytes,
    },
    cpu: { usageUsec, userUsec, systemUsec, nrThrottled, throttledUsec },
    processes,
    redis: redisUsed === null || redisPeak === null ? null : { usedMemoryBytes: redisUsed, peakMemoryBytes: redisPeak },
  };
};

const cpuDelta = (start: RuntimeMemoryCheckpoint | undefined, end: RuntimeMemoryCheckpoint | undefined) =>
  start && end
    ? {
        usageUsec: end.cpu.usageUsec - start.cpu.usageUsec,
        userUsec: end.cpu.userUsec - start.cpu.userUsec,
        systemUsec: end.cpu.systemUsec - start.cpu.systemUsec,
        nrThrottled: end.cpu.nrThrottled - start.cpu.nrThrottled,
        throttledUsec: end.cpu.throttledUsec - start.cpu.throttledUsec,
      }
    : null;

const summarizeSamples = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  const variance = sorted.reduce((total, value) => total + (value - mean) ** 2, 0) / sorted.length;
  return {
    count: sorted.length,
    minBytes: sorted[0] ?? null,
    medianBytes: median,
    p95Bytes: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? null,
    maxBytes: sorted.at(-1) ?? null,
    standardDeviationBytes: Math.round(Math.sqrt(variance)),
  };
};

const getTrendBytesPerHour = (samples: Array<{ capturedAt: string; value: number }>) => {
  if (samples.length < 2) return null;
  const originMs = Date.parse(samples[0]?.capturedAt ?? "");
  const timedSamples = samples.flatMap(({ capturedAt, value }) => {
    const capturedAtMs = Date.parse(capturedAt);
    return Number.isFinite(originMs) && Number.isFinite(capturedAtMs)
      ? [{ elapsedMs: capturedAtMs - originMs, value }]
      : [];
  });
  if (timedSamples.length < 2) return null;
  const xMean = timedSamples.reduce((total, { elapsedMs }) => total + elapsedMs, 0) / timedSamples.length;
  const yMean = timedSamples.reduce((total, { value }) => total + value, 0) / timedSamples.length;
  let numerator = 0;
  let denominator = 0;
  for (const { elapsedMs, value } of timedSamples) {
    numerator += (elapsedMs - xMean) * (value - yMean);
    denominator += (elapsedMs - xMean) ** 2;
  }
  return denominator === 0 ? null : (numerator / denominator) * 3_600_000;
};

export const summarizeRuntimeMemory = (checkpoints: RuntimeMemoryCheckpoint[]) => {
  const startup = checkpoints.find(({ name }) => name === "startup");
  const workload = checkpoints.find(({ name }) => name === "workload");
  const settled = checkpoints.at(-1);
  const settleValues = checkpoints
    .filter(({ name }) => name.startsWith("settle-"))
    .map(({ container }) => container.currentBytes);
  const settleCurrentSamples = checkpoints
    .filter(({ name }) => name.startsWith("settle-"))
    .map(({ capturedAt, container }) => ({ capturedAt, value: container.currentBytes }));
  const settleAnonymousValues = checkpoints
    .filter(({ name }) => name.startsWith("settle-"))
    .map(({ container }) => container.anonymousBytes);
  const settleAnonymousSamples = checkpoints
    .filter(({ name }) => name.startsWith("settle-"))
    .map(({ capturedAt, container }) => ({ capturedAt, value: container.anonymousBytes }));
  const settleFileValues = checkpoints
    .filter(({ name }) => name.startsWith("settle-"))
    .map(({ container }) => container.fileBytes);
  const settleFileSamples = checkpoints
    .filter(({ name }) => name.startsWith("settle-"))
    .map(({ capturedAt, container }) => ({ capturedAt, value: container.fileBytes }));
  const settle = summarizeSamples(settleValues);
  const settleAnonymous = summarizeSamples(settleAnonymousValues);
  const settleFile = summarizeSamples(settleFileValues);
  const currentValues = checkpoints.map(({ container }) => container.currentBytes);
  const peakValues = checkpoints.flatMap(({ container }) =>
    container.peakBytes === null ? [] : [container.peakBytes],
  );
  const growthBytes = workload && settle ? settle.medianBytes - workload.container.currentBytes : null;
  return {
    startupBytes: startup?.container.currentBytes ?? null,
    workloadBytes: workload?.container.currentBytes ?? null,
    settledBytes: settled?.container.currentBytes ?? null,
    maximumSampleBytes: currentValues.length > 0 ? Math.max(...currentValues) : null,
    peakBytes: peakValues.length > 0 ? Math.max(...peakValues) : null,
    growthBytes,
    growthPercent:
      workload && growthBytes !== null && workload.container.currentBytes > 0
        ? (growthBytes / workload.container.currentBytes) * 100
        : null,
    settle: settle
      ? {
          ...settle,
          trendBytesPerHour: getTrendBytesPerHour(settleCurrentSamples),
          anonymous: settleAnonymous
            ? {
                ...settleAnonymous,
                trendBytesPerHour: getTrendBytesPerHour(settleAnonymousSamples),
              }
            : null,
          file: settleFile ? { ...settleFile, trendBytesPerHour: getTrendBytesPerHour(settleFileSamples) } : null,
        }
      : null,
    cpu: {
      startupToWorkload: cpuDelta(startup, workload),
      workloadToSettled: cpuDelta(workload, settled),
    },
  };
};
