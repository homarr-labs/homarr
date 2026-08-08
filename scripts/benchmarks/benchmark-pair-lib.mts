import { summarize } from "./dev-benchmark-lib.mts";

type BuildResult = {
  schemaVersion: number;
  createdAt: string;
  run: { startedAt: string; finishedAt: string };
  claimEligible: boolean;
  claimIneligibleReasons: string[];
  mode: string;
  builder: string | null;
  runLabel: string | null;
  declaredRevision: string | null;
  series: { id: string | null; cacheState: string | null; repetition: number; totalRepetitions: number };
  source: {
    headSha: string;
    measuredRevision: string;
    fingerprint: string;
    baseFingerprint: string;
    syntheticSourceChange: { file: string; id: string } | null;
  };
  host: {
    architecture: string;
    dockerServer: { architecture: string; operatingSystem: string; targetPlatform: string; version: string | null };
    platform: string;
  };
  image: {
    architecture: string;
    digest: string | null;
    id: string;
    revision: string | null;
    sourceFingerprint: string | null;
    targetPlatform: string;
  };
  builderCache: {
    expected: Array<{ logicalId: string; target: string; mustIncreaseUsage: boolean }>;
    before: BuildCacheSnapshot | null;
    after: BuildCacheSnapshot | null;
    afterStability: { attempts: number; pollIntervalMs: number; stableForMs: number; timeoutMs: number } | null;
  };
  build: { nextCompileMs: number | null; wallTimeMs: number };
};

type BuildCacheSnapshot = {
  cacheMountCount: number;
  cacheMounts: Array<{
    logicalId: string | null;
    recordId: string;
    target: string | null;
    usageCount: number | null;
  }>;
  recordCount: number;
  recordsFingerprint: string;
};

type RuntimePageSample = {
  boardMountedMs: number;
  fcpMs: number;
  lcpFinalizedByInputMs: number;
  lcpMs: number;
  ttfbMs: number;
  widgetImplementationsMountedMs: number | null;
  widgetDataSettledMs: number;
};

type RuntimeResult = {
  schemaVersion: number;
  claimEligible: boolean;
  claimIneligibleReasons: string[];
  claimScope: string[];
  metricEligibility: Record<string, { claimEligible: boolean }>;
  image: {
    architecture: string;
    digest: string | null;
    id: string;
    revision: string | null;
    sourceFingerprint: string | null;
  };
  host: {
    architecture: string;
    node: { version: string; v8Version: string };
    platform: string;
    release: string;
  };
  provenance: {
    browser: {
      engine: string;
      executablePath: string;
      headless: boolean;
      httpCachePolicy: string;
      launchArguments?: string[];
      version: string;
      viewport: unknown;
    };
    container: {
      cpuLimit: number;
      memoryLimitBytes: number;
      network: { internal: boolean };
      node: { architecture: string; platform: string; version: string; v8Version: string };
    };
    docker: { engine: unknown; version: unknown };
    ingressProxy: { excludedFromMemorySamples: boolean; implementation: string };
  };
  browserNetworkIsolation: {
    active: boolean;
    canaries: {
      http: { attemptCount: number; responseHeader: string | null; status: number | null };
      webSockets: Array<{
        attemptCount: number;
        browserEventCount: number;
        closeCount: number;
        connectTarget: string;
        errorEvent: boolean;
        frameReceivedCount: number;
        frameSentCount: number;
        opened: boolean;
        socketErrorCount: number;
        timedOut: boolean;
        url: string;
      }>;
    };
    externalBrowserWebSockets: unknown[];
    unexpectedExternalResponses: unknown[];
  };
  serverNetworkIsolation: {
    active: boolean;
    canary: { directIp: { blocked: boolean }; domain: { blocked: boolean } };
    network: { internal: boolean };
  };
  checkpoints: Array<{ capturedAt: string; name: string }>;
  workload: {
    settleMs: number;
    sampleIntervalMs: number;
    settleSampleCount: number;
    lcpObservationMs: number;
    lcpStabilityMs: number;
    widgetDataQuietMs: number;
    spotlightIdleMs: number;
    spotlightIdlePolicy: string;
    interactionIterations: number;
    widgetCount: number;
    implementationMarkerPolicy: string;
    widgetImplementationMarkerCount: number;
    widgetErrorCount: number;
    startToReadyMs: number;
    coldSpotlightFeedbackMs: number | null;
    coldSpotlightReadyMs: number | null;
    postIdleWarmInteractionMs: number | null;
    routeTimings: Array<{ path: string }>;
    pageLoadSamples: RuntimePageSample[];
  };
  summary: {
    startupBytes: number | null;
    workloadBytes: number | null;
    settledBytes: number | null;
    peakBytes: number | null;
  };
};

export type BenchmarkPairInput = {
  baselineWarmup: BuildResult;
  candidateWarmup: BuildResult;
  baselineBuilds: BuildResult[];
  candidateBuilds: BuildResult[];
  baselineRuntime: RuntimeResult;
  candidateRuntime: RuntimeResult;
};

const stable = (value: unknown) => JSON.stringify(value);
const unique = <T,>(values: T[]) => [...new Set(values)];

const improvement = (baseline: number | null, candidate: number | null) => ({
  baseline,
  candidate,
  delta: baseline === null || candidate === null ? null : candidate - baseline,
  improvementPercent:
    baseline === null || candidate === null || baseline === 0 ? null : ((baseline - candidate) / baseline) * 100,
});

const validateRunWindow = (label: string, build: BuildResult, reasons: string[]) => {
  const startedAt = Date.parse(build.run.startedAt);
  const finishedAt = Date.parse(build.run.finishedAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt) || finishedAt < startedAt) {
    reasons.push(`${label} build run window is invalid`);
  }
  if (build.createdAt !== build.run.finishedAt) reasons.push(`${label} build completion timestamp is inconsistent`);
};

const validateMeasuredBuildCache = (label: string, build: BuildResult, reasons: string[]) => {
  const { after, before, expected } = build.builderCache;
  if (expected.length === 0) {
    reasons.push(`${label} build declares no expected cache mounts`);
    return;
  }
  if (!before || !after) {
    reasons.push(`${label} build cache continuity snapshots are missing`);
    return;
  }
  for (const expectedMount of expected) {
    const matches = (snapshot: BuildCacheSnapshot) =>
      snapshot.cacheMounts.filter(
        ({ logicalId, target }) => logicalId === expectedMount.logicalId && target === expectedMount.target,
      );
    const beforeMatches = matches(before);
    const afterMatches = matches(after);
    if (beforeMatches.length !== 1 || afterMatches.length !== 1) {
      reasons.push(`${label} build cache mount ${expectedMount.logicalId} cannot be traced uniquely`);
      continue;
    }
    const beforeMount = beforeMatches[0];
    const afterMount = afterMatches[0];
    if (!beforeMount || !afterMount || beforeMount.recordId !== afterMount.recordId) {
      reasons.push(`${label} build cache mount ${expectedMount.logicalId} was replaced`);
      continue;
    }
    if (
      expectedMount.mustIncreaseUsage &&
      (beforeMount.usageCount === null ||
        afterMount.usageCount === null ||
        afterMount.usageCount <= beforeMount.usageCount)
    ) {
      reasons.push(`${label} build cache mount ${expectedMount.logicalId} usage did not increase`);
    }
  }
};

const validateBuildSide = (label: string, builds: BuildResult[], reasons: string[]) => {
  if (builds.length === 0) {
    reasons.push(`${label} build series is empty`);
    return;
  }

  const first = builds[0];
  if (!first) return;
  for (const build of builds) {
    if (build.schemaVersion !== 4) reasons.push(`${label} build schema is not 4`);
    validateRunWindow(`${label} repetition ${build.series.repetition}`, build, reasons);
    if (!build.claimEligible || build.claimIneligibleReasons.length > 0) {
      reasons.push(`${label} build repetition ${build.series.repetition} is not claim eligible`);
    }
    if (build.mode !== "source-change") reasons.push(`${label} build is not a source-change rebuild`);
    if (build.runLabel !== label) reasons.push(`${label} build run label is not ${label}`);
    if (build.series.cacheState !== "warm") reasons.push(`${label} build cache is not warm`);
    if (!build.source.syntheticSourceChange) reasons.push(`${label} build has no synthetic source change`);
    if (build.source.fingerprint === build.source.baseFingerprint) {
      reasons.push(`${label} build synthetic source fingerprint did not change`);
    }
    if (build.image.sourceFingerprint !== build.source.fingerprint) {
      reasons.push(`${label} build image fingerprint does not match its immutable source snapshot`);
    }
    if (!Number.isFinite(build.build.nextCompileMs) || (build.build.nextCompileMs ?? 0) <= 0) {
      reasons.push(`${label} build has no valid Next compile timing`);
    }
    if (!Number.isFinite(build.build.wallTimeMs) || build.build.wallTimeMs <= 0) {
      reasons.push(`${label} build has no valid wall timing`);
    }
    validateMeasuredBuildCache(`${label} repetition ${build.series.repetition}`, build, reasons);
    if (!build.builderCache.afterStability || build.builderCache.afterStability.stableForMs < 10_000) {
      reasons.push(`${label} build cache snapshot did not settle for 10000ms`);
    }
    if (!Number.isFinite(Date.parse(build.createdAt))) reasons.push(`${label} build timestamp is invalid`);
  }

  const expectedRepetitions = Array.from({ length: first.series.totalRepetitions }, (_, index) => index + 1);
  const actualRepetitions = builds.map(({ series }) => series.repetition).toSorted((left, right) => left - right);
  if (first.series.totalRepetitions < 2 || stable(actualRepetitions) !== stable(expectedRepetitions)) {
    reasons.push(`${label} build repetitions are incomplete`);
  }

  const stableFields: Array<[string, unknown[]]> = [
    ["builder", builds.map(({ builder }) => builder)],
    ["series id", builds.map(({ series }) => series.id)],
    ["total repetitions", builds.map(({ series }) => series.totalRepetitions)],
    ["declared revision", builds.map(({ declaredRevision }) => declaredRevision)],
    ["head SHA", builds.map(({ source }) => source.headSha)],
    ["measured revision", builds.map(({ source }) => source.measuredRevision)],
    ["base fingerprint", builds.map(({ source }) => source.baseFingerprint)],
    ["host", builds.map(({ host }) => stable(host))],
    ["image platform", builds.map(({ image }) => `${image.architecture}:${image.targetPlatform}`)],
    ["expected cache mounts", builds.map(({ builderCache }) => stable(builderCache.expected))],
  ];
  for (const [field, values] of stableFields) {
    if (unique(values).length !== 1) reasons.push(`${label} build ${field} changes within the series`);
  }
  if (!first.builder) reasons.push(`${label} build builder is missing`);
  if (!first.series.id) reasons.push(`${label} build series id is missing`);
};

const validateWarmup = (label: string, warmup: BuildResult, builds: BuildResult[], reasons: string[]) => {
  if (warmup.schemaVersion !== 4) reasons.push(`${label} warmup schema is not 4`);
  validateRunWindow(`${label} warmup`, warmup, reasons);
  if (warmup.mode !== "cached") reasons.push(`${label} warmup mode is not cached`);
  if (warmup.runLabel !== label) reasons.push(`${label} warmup run label is not ${label}`);
  if (warmup.series.cacheState !== "cold") reasons.push(`${label} warmup cache state is not cold`);
  if (warmup.source.syntheticSourceChange !== null) reasons.push(`${label} warmup contains a synthetic source change`);
  const expectedWarmupReason = "cached mode does not force an application rebuild";
  if (
    warmup.claimEligible ||
    !warmup.claimIneligibleReasons.includes(expectedWarmupReason) ||
    warmup.claimIneligibleReasons.some((reason) => reason !== expectedWarmupReason)
  ) {
    reasons.push(`${label} warmup has unexpected claim eligibility reasons`);
  }
  if (!warmup.builderCache.before || warmup.builderCache.before.recordCount !== 0) {
    reasons.push(`${label} warmup builder did not begin empty`);
  }
  if (!warmup.builderCache.after || warmup.builderCache.after.recordCount === 0) {
    reasons.push(`${label} warmup did not populate the builder cache`);
  }
  if (!warmup.builderCache.afterStability || warmup.builderCache.afterStability.stableForMs < 10_000) {
    reasons.push(`${label} warmup cache snapshot did not settle for 10000ms`);
  }
  for (const expected of warmup.builderCache.expected) {
    const matches =
      warmup.builderCache.after?.cacheMounts.filter(
        ({ logicalId, target }) => logicalId === expected.logicalId && target === expected.target,
      ) ?? [];
    if (matches.length !== 1) {
      reasons.push(`${label} warmup did not populate cache mount ${expected.logicalId} at ${expected.target}`);
    }
  }
  if (warmup.image.sourceFingerprint !== warmup.source.baseFingerprint) {
    reasons.push(`${label} warmup image fingerprint does not match its source`);
  }
  if (warmup.source.fingerprint !== warmup.source.baseFingerprint) {
    reasons.push(`${label} warmup immutable source fingerprint does not match its base source`);
  }
  if (warmup.image.revision !== warmup.source.measuredRevision) {
    reasons.push(`${label} warmup image revision does not match its source`);
  }

  const first = builds[0];
  if (!first) return;
  const stableFields: Array<[string, unknown, unknown]> = [
    ["builder", warmup.builder, first.builder],
    ["series id", warmup.series.id, first.series.id],
    ["declared revision", warmup.declaredRevision, first.declaredRevision],
    ["head SHA", warmup.source.headSha, first.source.headSha],
    ["measured revision", warmup.source.measuredRevision, first.source.measuredRevision],
    ["base fingerprint", warmup.source.baseFingerprint, first.source.baseFingerprint],
    ["host", stable(warmup.host), stable(first.host)],
    [
      "image platform",
      `${warmup.image.architecture}:${warmup.image.targetPlatform}`,
      `${first.image.architecture}:${first.image.targetPlatform}`,
    ],
    ["expected cache mounts", stable(warmup.builderCache.expected), stable(first.builderCache.expected)],
  ];
  for (const [field, warmupValue, measuredValue] of stableFields) {
    if (warmupValue !== measuredValue) reasons.push(`${label} warmup ${field} does not match the measured series`);
  }

  let previous = warmup;
  for (const build of builds.toSorted((left, right) => left.series.repetition - right.series.repetition)) {
    if (!previous.builderCache.after || !build.builderCache.before) {
      reasons.push(`${label} cache continuity snapshot is missing before repetition ${build.series.repetition}`);
    } else if (previous.builderCache.after.recordsFingerprint !== build.builderCache.before.recordsFingerprint) {
      reasons.push(`${label} builder cache changed outside repetition ${build.series.repetition}`);
    }
    previous = build;
  }
};

const runtimeConfiguration = (runtime: RuntimeResult) => ({
  host: runtime.host,
  browser: {
    ...runtime.provenance.browser,
    launchArguments: runtime.provenance.browser.launchArguments?.map((argument) =>
      argument.startsWith("--proxy-server=") ? "--proxy-server=<ephemeral-deny-proxy>" : argument,
    ),
  },
  container: {
    cpuLimit: runtime.provenance.container.cpuLimit,
    memoryLimitBytes: runtime.provenance.container.memoryLimitBytes,
    node: runtime.provenance.container.node,
  },
  docker: runtime.provenance.docker,
  workload: {
    settleMs: runtime.workload.settleMs,
    sampleIntervalMs: runtime.workload.sampleIntervalMs,
    settleSampleCount: runtime.workload.settleSampleCount,
    lcpObservationMs: runtime.workload.lcpObservationMs,
    lcpStabilityMs: runtime.workload.lcpStabilityMs,
    widgetDataQuietMs: runtime.workload.widgetDataQuietMs,
    spotlightIdleMs: runtime.workload.spotlightIdleMs,
    interactionIterations: runtime.workload.interactionIterations,
    widgetCount: runtime.workload.widgetCount,
    implementationMarkerPolicy: runtime.workload.implementationMarkerPolicy,
    routePaths: runtime.workload.routeTimings.map(({ path }) => path),
    pageSampleCount: runtime.workload.pageLoadSamples.length,
  },
});

const validateRuntime = (label: string, runtime: RuntimeResult, reasons: string[]) => {
  const expectedClaimScope = ["pageLoads", "largestContentfulPaint", "widgetDataSettled", "settleStability"];
  if (runtime.schemaVersion !== 7) reasons.push(`${label} runtime schema is not 7`);
  if (stable(runtime.claimScope) !== stable(expectedClaimScope)) {
    reasons.push(`${label} runtime claim scope is incomplete`);
  }
  if (!runtime.claimEligible || runtime.claimIneligibleReasons.length > 0) {
    reasons.push(`${label} runtime is not claim eligible`);
  }
  for (const metric of ["pageLoads", "largestContentfulPaint", "widgetDataSettled", "settleStability"]) {
    if (runtime.metricEligibility[metric]?.claimEligible !== true) {
      reasons.push(`${label} runtime metric ${metric} is not claim eligible`);
    }
  }
  if (runtime.workload.pageLoadSamples.length < 20) reasons.push(`${label} runtime has fewer than 20 page samples`);
  if (runtime.workload.lcpObservationMs < 5_000) reasons.push(`${label} runtime LCP observation is below 5000ms`);
  if (runtime.workload.widgetDataQuietMs < 500)
    reasons.push(`${label} runtime widget-data quiet window is below 500ms`);
  if (runtime.workload.settleMs < 600_000) reasons.push(`${label} runtime settle duration is below 600000ms`);
  const actualSettleSampleCount = runtime.checkpoints.filter(({ name }) => name.startsWith("settle-")).length;
  if (runtime.workload.settleSampleCount < 20 || actualSettleSampleCount < 20) {
    reasons.push(`${label} runtime has fewer than 20 settle samples`);
  }
  if (runtime.workload.settleSampleCount !== actualSettleSampleCount) {
    reasons.push(`${label} runtime settle sample count does not match checkpoints`);
  }
  const workloadCheckpoints = runtime.checkpoints.filter(({ name }) => name === "workload");
  const settleCheckpoints = runtime.checkpoints.filter(({ name }) => name.startsWith("settle-"));
  const expectedSettleNames = Array.from({ length: actualSettleSampleCount }, (_, index) => `settle-${index + 1}`);
  if (
    workloadCheckpoints.length !== 1 ||
    stable(settleCheckpoints.map(({ name }) => name)) !== stable(expectedSettleNames) ||
    runtime.checkpoints.some(({ capturedAt }) => !Number.isFinite(Date.parse(capturedAt))) ||
    runtime.checkpoints.some(
      ({ capturedAt }, index, checkpoints) =>
        index > 0 && Date.parse(capturedAt) < Date.parse(checkpoints[index - 1]?.capturedAt ?? ""),
    )
  ) {
    reasons.push(`${label} runtime checkpoint chronology is invalid`);
  }
  const workloadCapturedAt = Date.parse(workloadCheckpoints[0]?.capturedAt ?? "");
  const finalSettleCapturedAt = Date.parse(settleCheckpoints.at(-1)?.capturedAt ?? "");
  if (
    !Number.isFinite(workloadCapturedAt) ||
    !Number.isFinite(finalSettleCapturedAt) ||
    finalSettleCapturedAt - workloadCapturedAt < runtime.workload.settleMs
  ) {
    reasons.push(`${label} runtime checkpoint span is shorter than the declared settle duration`);
  }
  for (const metric of [
    "boardMountedMs",
    "fcpMs",
    "lcpFinalizedByInputMs",
    "lcpMs",
    "ttfbMs",
    "widgetImplementationsMountedMs",
    "widgetDataSettledMs",
  ] satisfies Array<keyof RuntimePageSample>) {
    const values = runtime.workload.pageLoadSamples.map((sample) => sample[metric]);
    if (
      values.some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0) ||
      runtimeMetric(runtime, metric).count !== runtime.workload.pageLoadSamples.length
    ) {
      reasons.push(`${label} runtime metric ${metric} has invalid or missing samples`);
    }
  }
  if (
    runtime.workload.pageLoadSamples.some(
      ({ lcpFinalizedByInputMs, lcpMs }) =>
        lcpFinalizedByInputMs < runtime.workload.lcpObservationMs || lcpMs > lcpFinalizedByInputMs,
    )
  ) {
    reasons.push(`${label} runtime LCP samples were not observed and finalized for the declared window`);
  }
  if (runtime.workload.widgetErrorCount !== 0) reasons.push(`${label} runtime rendered widget errors`);
  if (runtime.workload.widgetImplementationMarkerCount !== runtime.workload.widgetCount) {
    reasons.push(`${label} runtime did not mount every widget implementation`);
  }
  const webSocketCanaryProtocols = runtime.browserNetworkIsolation.canaries.webSockets.flatMap(
    ({ connectTarget, url }) => {
      try {
        const parsed = new URL(url);
        const defaultPort = parsed.protocol === "ws:" ? "80" : parsed.protocol === "wss:" ? "443" : null;
        return defaultPort && connectTarget === `${parsed.hostname}:${parsed.port || defaultPort}`
          ? [parsed.protocol]
          : [];
      } catch {
        return [];
      }
    },
  );
  if (
    !runtime.browserNetworkIsolation.active ||
    runtime.browserNetworkIsolation.unexpectedExternalResponses.length > 0 ||
    runtime.browserNetworkIsolation.externalBrowserWebSockets.length > 0 ||
    runtime.browserNetworkIsolation.canaries.http.status !== 502 ||
    runtime.browserNetworkIsolation.canaries.http.responseHeader !== "true" ||
    runtime.browserNetworkIsolation.canaries.http.attemptCount < 1 ||
    runtime.browserNetworkIsolation.canaries.webSockets.length !== 2 ||
    stable(webSocketCanaryProtocols.toSorted()) !== stable(["ws:", "wss:"]) ||
    runtime.browserNetworkIsolation.canaries.webSockets.some(
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
        attemptCount < 1 ||
        browserEventCount < 1 ||
        closeCount < 1 ||
        !errorEvent ||
        frameReceivedCount !== 0 ||
        frameSentCount !== 0 ||
        opened ||
        socketErrorCount < 1 ||
        timedOut,
    )
  ) {
    reasons.push(`${label} browser network is not isolated`);
  }
  if (
    !runtime.serverNetworkIsolation.active ||
    !runtime.serverNetworkIsolation.network.internal ||
    !runtime.serverNetworkIsolation.canary.domain.blocked ||
    !runtime.serverNetworkIsolation.canary.directIp.blocked
  ) {
    reasons.push(`${label} server network is not isolated`);
  }
  if (!runtime.provenance.container.network.internal) reasons.push(`${label} app container network is not internal`);
  if (!runtime.provenance.ingressProxy.excludedFromMemorySamples) {
    reasons.push(`${label} ingress proxy memory accounting is ambiguous`);
  }
};

const runtimeMetric = (runtime: RuntimeResult, key: keyof RuntimePageSample) =>
  summarize(runtime.workload.pageLoadSamples.map((sample) => sample[key]));

export const compareBenchmarkPair = (input: BenchmarkPairInput) => {
  const reasons: string[] = [];
  validateBuildSide("baseline", input.baselineBuilds, reasons);
  validateBuildSide("candidate", input.candidateBuilds, reasons);
  validateWarmup("baseline", input.baselineWarmup, input.baselineBuilds, reasons);
  validateWarmup("candidate", input.candidateWarmup, input.candidateBuilds, reasons);
  validateRuntime("baseline", input.baselineRuntime, reasons);
  validateRuntime("candidate", input.candidateRuntime, reasons);

  const baselineBuild = input.baselineBuilds[0];
  const candidateBuild = input.candidateBuilds[0];
  if (baselineBuild && candidateBuild) {
    if (baselineBuild.series.id !== candidateBuild.series.id) reasons.push("build series ids do not match");
    if (baselineBuild.builder === candidateBuild.builder) reasons.push("build sides reuse the same builder cache");
    if (baselineBuild.source.measuredRevision !== candidateBuild.source.measuredRevision) {
      reasons.push("build measured revisions do not match");
    }
    if (stable(baselineBuild.host) !== stable(candidateBuild.host)) reasons.push("build hosts do not match");
    if (
      `${baselineBuild.image.architecture}:${baselineBuild.image.targetPlatform}` !==
      `${candidateBuild.image.architecture}:${candidateBuild.image.targetPlatform}`
    ) {
      reasons.push("build image platforms do not match");
    }
    if (baselineBuild.source.baseFingerprint === candidateBuild.source.baseFingerprint) {
      reasons.push("baseline and candidate source fingerprints are identical");
    }

    const candidateByRepetition = new Map(
      input.candidateBuilds.map((build) => [build.series.repetition, build.source.syntheticSourceChange?.id]),
    );
    for (const build of input.baselineBuilds) {
      if (build.source.syntheticSourceChange?.id !== candidateByRepetition.get(build.series.repetition)) {
        reasons.push(`synthetic source change differs at repetition ${build.series.repetition}`);
      }
    }

    if (baselineBuild.series.totalRepetitions !== 2 || candidateBuild.series.totalRepetitions !== 2) {
      reasons.push("balanced build order currently requires exactly two repetitions per side");
    } else {
      const chronologicalRuns = [
        { build: input.baselineWarmup, label: "baseline:warmup" },
        { build: input.candidateWarmup, label: "candidate:warmup" },
        ...input.baselineBuilds.map((build) => ({ build, label: `baseline:${build.series.repetition}` })),
        ...input.candidateBuilds.map((build) => ({ build, label: `candidate:${build.series.repetition}` })),
      ].toSorted((left, right) => Date.parse(left.build.run.startedAt) - Date.parse(right.build.run.startedAt));
      const chronologicalOrder = chronologicalRuns.map(({ label }) => label);
      if (
        stable(chronologicalOrder) !==
        stable(["baseline:warmup", "candidate:warmup", "baseline:1", "candidate:1", "candidate:2", "baseline:2"])
      ) {
        reasons.push(
          "build execution order is not cold-warmup baseline-candidate then balanced baseline-candidate-candidate-baseline",
        );
      }
      for (let index = 1; index < chronologicalRuns.length; index += 1) {
        const previous = chronologicalRuns[index - 1];
        const current = chronologicalRuns[index];
        if (
          previous &&
          current &&
          Date.parse(previous.build.run.finishedAt) > Date.parse(current.build.run.startedAt)
        ) {
          reasons.push(`build runs overlap between ${previous.label} and ${current.label}`);
        }
      }
    }

    if (input.baselineRuntime.image.sourceFingerprint !== baselineBuild.source.baseFingerprint) {
      reasons.push("baseline runtime image does not match the baseline build source");
    }
    if (input.baselineRuntime.image.sourceFingerprint !== input.baselineWarmup.image.sourceFingerprint) {
      reasons.push("baseline runtime image does not match the baseline warmup image");
    }
    if (input.candidateRuntime.image.sourceFingerprint !== input.candidateWarmup.image.sourceFingerprint) {
      reasons.push("candidate runtime image does not match the candidate warmup image");
    }
    if (
      input.baselineRuntime.image.id !== input.baselineWarmup.image.id ||
      input.baselineRuntime.image.digest !== input.baselineWarmup.image.digest
    ) {
      reasons.push("baseline runtime image identity does not match the baseline warmup image");
    }
    if (
      input.candidateRuntime.image.id !== input.candidateWarmup.image.id ||
      input.candidateRuntime.image.digest !== input.candidateWarmup.image.digest
    ) {
      reasons.push("candidate runtime image identity does not match the candidate warmup image");
    }
    if (input.candidateRuntime.image.sourceFingerprint !== candidateBuild.source.baseFingerprint) {
      reasons.push("candidate runtime image does not match the candidate build source");
    }
    if (
      input.baselineRuntime.image.revision !== baselineBuild.source.measuredRevision ||
      input.candidateRuntime.image.revision !== candidateBuild.source.measuredRevision
    ) {
      reasons.push("runtime image revisions do not match their build revisions");
    }
  }

  if (input.baselineRuntime.image.revision !== input.candidateRuntime.image.revision) {
    reasons.push("runtime image revisions do not match");
  }
  if (input.baselineRuntime.image.architecture !== input.candidateRuntime.image.architecture) {
    reasons.push("runtime image architectures do not match");
  }
  if (stable(runtimeConfiguration(input.baselineRuntime)) !== stable(runtimeConfiguration(input.candidateRuntime))) {
    reasons.push("runtime host, browser, container, or workload configuration does not match");
  }
  if (stable(input.baselineRuntime.claimScope) !== stable(input.candidateRuntime.claimScope)) {
    reasons.push("runtime claim scopes do not match");
  }
  if (input.baselineRuntime.workload.spotlightIdlePolicy !== "mounted") {
    reasons.push("baseline Spotlight idle policy is not mounted");
  }
  if (input.candidateRuntime.workload.spotlightIdlePolicy !== "preload-only") {
    reasons.push("candidate Spotlight idle policy is not preload-only");
  }

  const buildMetric = (key: "wallTimeMs" | "nextCompileMs") => {
    const baseline = summarize(input.baselineBuilds.map(({ build }) => build[key]));
    const candidate = summarize(input.candidateBuilds.map(({ build }) => build[key]));
    return { baseline, candidate, comparison: improvement(baseline.median, candidate.median) };
  };
  const pageMetric = (key: keyof RuntimePageSample) => {
    const baseline = runtimeMetric(input.baselineRuntime, key);
    const candidate = runtimeMetric(input.candidateRuntime, key);
    return { baseline, candidate, comparison: improvement(baseline.median, candidate.median) };
  };

  return {
    schemaVersion: 1,
    claimEligible: reasons.length === 0,
    claimIneligibleReasons: unique(reasons),
    claimScope: {
      build: "alternating warm incremental Docker source rebuilds",
      runtime: "fresh authenticated Chromium documents against one warmed, network-isolated app container",
    },
    limitations: [
      "build series report controlled medians, not statistical significance",
      "runtime documents share one warmed server",
      "widget settlement covers observed non-subscription tRPC requests followed by the configured quiet window",
      "startup, RAM levels, initial bundle data, and cold Spotlight timings remain single-container diagnostics",
    ],
    build: {
      seriesId: baselineBuild?.series.id ?? null,
      baselineFingerprint: baselineBuild?.source.baseFingerprint ?? null,
      candidateFingerprint: candidateBuild?.source.baseFingerprint ?? null,
      wallTimeMs: buildMetric("wallTimeMs"),
      nextCompileMs: buildMetric("nextCompileMs"),
    },
    runtime: {
      boardMountedMs: pageMetric("boardMountedMs"),
      fcpMs: pageMetric("fcpMs"),
      lcpMs: pageMetric("lcpMs"),
      ttfbMs: pageMetric("ttfbMs"),
      widgetImplementationsMountedMs: pageMetric("widgetImplementationsMountedMs"),
      widgetDataSettledMs: pageMetric("widgetDataSettledMs"),
    },
    diagnostics: {
      baseline: {
        startToReadyMs: input.baselineRuntime.workload.startToReadyMs,
        coldSpotlightFeedbackMs: input.baselineRuntime.workload.coldSpotlightFeedbackMs,
        coldSpotlightReadyMs: input.baselineRuntime.workload.coldSpotlightReadyMs,
        postIdleFirstOpenMs: input.baselineRuntime.workload.postIdleWarmInteractionMs,
        memory: input.baselineRuntime.summary,
      },
      candidate: {
        startToReadyMs: input.candidateRuntime.workload.startToReadyMs,
        coldSpotlightFeedbackMs: input.candidateRuntime.workload.coldSpotlightFeedbackMs,
        coldSpotlightReadyMs: input.candidateRuntime.workload.coldSpotlightReadyMs,
        postIdleFirstOpenMs: input.candidateRuntime.workload.postIdleWarmInteractionMs,
        memory: input.candidateRuntime.summary,
      },
    },
  };
};

export type { BuildResult, RuntimeResult };
