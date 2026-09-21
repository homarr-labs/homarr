import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface CaseResult {
  caseId: string;
  score?: number | null;
  verdict?: string;
  calledTools?: string[];
  widgets?: number;
}

interface EvaluationSummary {
  mode?: string;
  providerBaseUrl?: string;
  generatorModel?: string;
  judgeModel?: string;
  generation?: {
    runId?: string;
    experimentId?: string | null;
    generationId?: string | null;
    maxLoops?: number;
    concurrency?: number;
    requestTimeoutMs?: number;
    temperature?: number;
    reasoning?: unknown;
    requiredReasoningEffort?: string | null;
    providerPreferences?: unknown;
    maxOutputTokens?: number;
    judgeMaxOutputTokens?: number;
  };
  spend?: {
    enabled?: boolean;
    maxUsd?: number | null;
    campaignMaxUsd?: number | null;
    budgetShards?: number;
    requestReservationUsd?: number;
    campaignLedger?: { enabled?: boolean; strategy?: string | null; id?: string | null };
    ceiling?: unknown;
  };
  assistantPromptBundle?: {
    sha256?: string;
    id?: string | null;
    source?: string;
    sourceFile?: string | null;
    provenance?: unknown;
    stagingInstruction?: { sha256?: string };
    assistantPolicy?: { sha256?: string };
  } | null;
  harness?: { sha256?: string; judgePolicySha256?: string; files?: string[] };
  benchmark?: {
    suite?: string;
    split?: string;
    sha256?: string;
    caseIds?: string[];
    promotionEligible?: boolean;
    promotionIneligibilityReasons?: string[];
  };
  results: CaseResult[];
}

interface PairedSummaryInput {
  baselineSource: string;
  candidateSource: string;
  baseline: unknown;
  candidate: unknown;
}

interface RateMetric {
  count: number;
  total: number;
  rate: number;
  wilson95: { lower: number; upper: number };
}

const round = (value: number, digits = 4) => Number(value.toFixed(digits));
const mean = (values: readonly number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
};

const stableHash = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");

const parseSummary = (value: unknown, source: string): EvaluationSummary => {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error(`${source}: expected an evaluation summary with results`);
  }
  const results = value.results.map((result, index) => {
    if (!isRecord(result) || typeof result.caseId !== "string") {
      throw new Error(`${source}: result ${index + 1} is missing caseId`);
    }
    return result as unknown as CaseResult;
  });
  return { ...(value as unknown as EvaluationSummary), results };
};

const getPromptProvenance = (summary: EvaluationSummary, source: string) => {
  const bundle = summary.assistantPromptBundle;
  if (!bundle?.sha256 || !bundle.stagingInstruction?.sha256 || !bundle.assistantPolicy?.sha256) {
    throw new Error(`${source}: paired reports require full assistantPromptBundle provenance`);
  }
  return {
    sha256: bundle.sha256,
    id: bundle.id ?? null,
    source: bundle.source ?? null,
    sourceFile: bundle.sourceFile ?? null,
    provenance: bundle.provenance ?? null,
    stagingInstructionSha256: bundle.stagingInstruction.sha256,
    assistantPolicySha256: bundle.assistantPolicy.sha256,
  };
};

const immutableGitCommit = /^[0-9a-f]{40}$/u;
const releaseV2Repository = "homarr-labs/homarr";
const releaseV2Ref = "release/v2";
const approvedReleaseV2PromptBaselines: ReadonlyMap<
  string,
  {
    id: string;
    sourceFile: string;
    sha256: string;
    stagingInstructionSha256: string;
    assistantPolicySha256: string;
  }
> = new Map([
  [
    "c6da4a4366fa852e8aae67fea7137a21bae7538b",
    {
      id: "release-v2-c6da4a4366fa852e8aae67fea7137a21bae7538b",
      sourceFile: "release-v2-c6da4a4366fa852e8aae67fea7137a21bae7538b.json",
      sha256: "203482d847485d6974439177805c7be27f04b7b33dc5b2bd4443317942d1f699",
      stagingInstructionSha256: "c7a2d3b65836e46d63fdc44a5ba5b4eb5aa8becc4b53c2cb4d35142c6d0db27e",
      assistantPolicySha256: "433c928714d06f3c09bf25b7219ca2710a34b3f4652f0e4999bc8de481978b5b",
    },
  ],
]);

const hasCompleteSpendProvenance = (spend: EvaluationSummary["spend"]) => {
  if (
    spend?.enabled !== true ||
    typeof spend.maxUsd !== "number" ||
    !Number.isFinite(spend.maxUsd) ||
    spend.maxUsd <= 0 ||
    typeof spend.campaignMaxUsd !== "number" ||
    !Number.isFinite(spend.campaignMaxUsd) ||
    spend.campaignMaxUsd <= 0 ||
    typeof spend.budgetShards !== "number" ||
    !Number.isInteger(spend.budgetShards) ||
    spend.budgetShards <= 0 ||
    typeof spend.requestReservationUsd !== "number" ||
    !Number.isFinite(spend.requestReservationUsd) ||
    spend.requestReservationUsd <= 0 ||
    spend.campaignLedger?.enabled !== true ||
    spend.campaignLedger.strategy !== "shared-file-lock-v1" ||
    !spend.campaignLedger.id?.trim() ||
    !isRecord(spend.ceiling) ||
    spend.ceiling.strategy !== "openrouter-provider-max-price-v1"
  ) {
    return false;
  }
  const expectedCampaignMaxUsd = spend.maxUsd * spend.budgetShards;
  const tolerance = Math.max(1, spend.campaignMaxUsd) * 1e-9;
  return Math.abs(expectedCampaignMaxUsd - spend.campaignMaxUsd) <= tolerance;
};

const assertPairedPromptArmProvenance = (
  arm: "baseline" | "candidate",
  prompt: ReturnType<typeof getPromptProvenance>,
  source: string,
) => {
  if (arm === "baseline") {
    if (!isRecord(prompt.provenance)) {
      throw new Error(`${source}: baseline prompt bundle requires immutable release/v2 provenance`);
    }
    const commit = prompt.provenance.commit;
    if (
      prompt.provenance.repository !== releaseV2Repository ||
      prompt.provenance.ref !== releaseV2Ref ||
      typeof commit !== "string" ||
      !immutableGitCommit.test(commit) ||
      prompt.provenance.sourceFile !== "packages/custom-widgets/src/core/ai-prompt.ts"
    ) {
      throw new Error(`${source}: baseline prompt bundle must pin homarr-labs/homarr release/v2 at a full commit`);
    }
    const approvedBaseline = approvedReleaseV2PromptBaselines.get(commit);
    if (
      approvedBaseline === undefined ||
      prompt.id !== approvedBaseline.id ||
      prompt.sha256 !== approvedBaseline.sha256 ||
      prompt.stagingInstructionSha256 !== approvedBaseline.stagingInstructionSha256 ||
      prompt.assistantPolicySha256 !== approvedBaseline.assistantPolicySha256 ||
      prompt.source !== "candidate-bundle-file" ||
      typeof prompt.sourceFile !== "string" ||
      !prompt.sourceFile.endsWith(approvedBaseline.sourceFile)
    ) {
      throw new Error(`${source}: baseline arm must match an approved checked-in release/v2 prompt bundle`);
    }
    return;
  }
  const validSources = new Set(["built-in", "candidate-policy-file", "candidate-bundle-file"]);
  if (prompt.source === null || !validSources.has(prompt.source)) {
    throw new Error(`${source}: candidate prompt bundle source provenance is missing`);
  }
  if (prompt.source !== "built-in" && (typeof prompt.sourceFile !== "string" || !prompt.sourceFile.trim())) {
    throw new Error(`${source}: candidate prompt bundle file provenance is missing`);
  }
  if (
    isRecord(prompt.provenance) &&
    prompt.provenance.repository === releaseV2Repository &&
    prompt.provenance.ref === releaseV2Ref
  ) {
    throw new Error(`${source}: candidate arm must not be labeled as the release/v2 baseline`);
  }
};

const getPromotionEligibilityIssues = (summary: EvaluationSummary): string[] => {
  const issues: string[] = [];
  const generation = summary.generation;
  const benchmark = summary.benchmark;
  const spend = summary.spend;
  const reasoningEffort = isRecord(generation?.reasoning) ? generation.reasoning.effort : undefined;
  const requiredReasoningEffort = summary.generatorModel?.toLowerCase().includes("gpt-5.6-luna") ? "high" : "max";
  if (summary.mode !== "assistant-tool-loop") issues.push("promotion requires assistant-tool-loop mode");
  if (benchmark?.promotionEligible !== true) {
    issues.push(...(benchmark?.promotionIneligibilityReasons ?? ["run is not marked promotion-eligible"]));
  }
  if (!benchmark?.suite?.trim()) issues.push("missing benchmark suite provenance");
  if (!benchmark?.split?.trim()) issues.push("missing benchmark split provenance");
  if (!benchmark?.sha256?.trim() || !benchmark.caseIds?.length) issues.push("missing benchmark case provenance");
  if (generation?.maxLoops !== 1) issues.push("promotion requires maxLoops=1");
  if (!generation?.experimentId?.trim() || !generation.generationId?.trim()) {
    issues.push("missing experiment/generation provenance");
  }
  if (!summary.providerBaseUrl?.trim() || !summary.generatorModel?.trim() || !summary.judgeModel?.trim()) {
    issues.push("missing provider/model provenance");
  }
  if (generation?.requiredReasoningEffort !== requiredReasoningEffort || reasoningEffort !== requiredReasoningEffort) {
    issues.push(`promotion requires recorded ${requiredReasoningEffort} reasoning for the generator model`);
  }
  if (
    !summary.harness?.sha256?.trim() ||
    !summary.harness.judgePolicySha256?.trim() ||
    !summary.harness.files?.length
  ) {
    issues.push("missing harness/judge provenance");
  }
  if (!hasCompleteSpendProvenance(spend)) {
    issues.push("missing spend budget provenance");
  }
  return [...new Set(issues)];
};

const getConfiguration = (summary: EvaluationSummary) => ({
  suite: summary.benchmark?.suite ?? "core",
  split: summary.benchmark?.split ?? null,
  mode: summary.mode ?? null,
  benchmarkSha256: summary.benchmark?.sha256 ?? null,
  caseIds: [...(summary.benchmark?.caseIds ?? [])].toSorted(),
  providerBaseUrl: summary.providerBaseUrl ?? null,
  generatorModel: summary.generatorModel ?? null,
  judgeModel: summary.judgeModel ?? null,
  maxLoops: summary.generation?.maxLoops ?? null,
  concurrency: summary.generation?.concurrency ?? null,
  requestTimeoutMs: summary.generation?.requestTimeoutMs ?? null,
  temperature: summary.generation?.temperature ?? null,
  reasoning: summary.generation?.reasoning ?? null,
  requiredReasoningEffort: summary.generation?.requiredReasoningEffort ?? null,
  providerPreferences: summary.generation?.providerPreferences ?? null,
  maxOutputTokens: summary.generation?.maxOutputTokens ?? null,
  judgeMaxOutputTokens: summary.generation?.judgeMaxOutputTokens ?? null,
  spend: {
    enabled: typeof summary.spend?.enabled === "boolean" ? summary.spend.enabled : null,
    maxUsd: typeof summary.spend?.maxUsd === "number" ? summary.spend.maxUsd : null,
    campaignMaxUsd: typeof summary.spend?.campaignMaxUsd === "number" ? summary.spend.campaignMaxUsd : null,
    budgetShards: typeof summary.spend?.budgetShards === "number" ? summary.spend.budgetShards : null,
    requestReservationUsd:
      typeof summary.spend?.requestReservationUsd === "number" ? summary.spend.requestReservationUsd : null,
    campaignLedger: {
      enabled: summary.spend?.campaignLedger?.enabled ?? null,
      strategy: summary.spend?.campaignLedger?.strategy ?? null,
      id: summary.spend?.campaignLedger?.id ?? null,
    },
    ceiling: summary.spend?.ceiling ?? null,
  },
  harnessSha256: summary.harness?.sha256 ?? null,
  judgePolicySha256: summary.harness?.judgePolicySha256 ?? null,
  harnessFiles: [...(summary.harness?.files ?? [])].toSorted(),
});

const getResultMap = (summary: EvaluationSummary, source: string) => {
  const entries = summary.results.map((result) => [result.caseId, result] as const);
  const map = new Map(entries);
  if (map.size !== entries.length) throw new Error(`${source}: result case IDs must be unique`);
  const expected = [...(summary.benchmark?.caseIds ?? [])].toSorted();
  const actual = [...map.keys()].toSorted();
  if (expected.length === 0 || expected.join("\n") !== actual.join("\n")) {
    throw new Error(`${source}: results must exactly match benchmark.caseIds`);
  }
  return map;
};

const score = (result: CaseResult) => (typeof result.score === "number" ? result.score : 0);
const passed = (result: CaseResult) => result.verdict === "pass";
const completedLifecycle = (result: CaseResult) =>
  (result.calledTools?.includes("customWidget_createFromPreview") === true ||
    result.calledTools?.includes("customWidget_updateFromPreview") === true) &&
  (result.widgets ?? 0) > 0;

export const getWilsonInterval = (successes: number, total: number) => {
  if (total === 0) return { lower: 0, upper: 0 };
  const z = 1.959963984540054;
  const probability = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (probability + (z * z) / (2 * total)) / denominator;
  const margin =
    (z / denominator) * Math.sqrt((probability * (1 - probability)) / total + (z * z) / (4 * total * total));
  return { lower: round(center - margin), upper: round(center + margin) };
};

const rateMetric = (values: readonly boolean[]): RateMetric => {
  const count = values.filter(Boolean).length;
  return {
    count,
    total: values.length,
    rate: values.length === 0 ? 0 : round((count / values.length) * 100),
    wilson95: getWilsonInterval(count, values.length),
  };
};

const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
};

export const getStratifiedPairedBootstrapInterval = (
  deltasByCase: ReadonlyMap<string, readonly number[]>,
  iterations = 10_000,
  seed = 0x6859,
) => {
  if (deltasByCase.size === 0) return { lower: 0, upper: 0, iterations, seed };
  const random = createRandom(seed);
  const samples: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const selected: number[] = [];
    for (const deltas of deltasByCase.values()) {
      for (let index = 0; index < deltas.length; index += 1) {
        selected.push(deltas[Math.floor(random() * deltas.length)] ?? 0);
      }
    }
    samples.push(mean(selected));
  }
  const orderedSamples = samples.toSorted((left, right) => left - right);
  const lowerIndex = Math.floor((orderedSamples.length - 1) * 0.025);
  const upperIndex = Math.ceil((orderedSamples.length - 1) * 0.975);
  return {
    lower: round(orderedSamples[lowerIndex] ?? 0),
    upper: round(orderedSamples[upperIndex] ?? 0),
    iterations,
    seed,
  };
};

const binomialCoefficient = (n: number, k: number) => {
  let value = 1;
  for (let index = 1; index <= Math.min(k, n - k); index += 1) {
    value = (value * (n - index + 1)) / index;
  }
  return value;
};

export const getOneSidedDiscordantPairResult = (baseline: readonly boolean[], candidate: readonly boolean[]) => {
  if (baseline.length !== candidate.length) throw new Error("Paired pass arrays must have equal length");
  let improvements = 0;
  let regressions = 0;
  for (const [index, baselinePass] of baseline.entries()) {
    const candidatePass = candidate[index] ?? false;
    if (!baselinePass && candidatePass) improvements += 1;
    if (baselinePass && !candidatePass) regressions += 1;
  }
  const discordant = improvements + regressions;
  let oneSidedPValue = 1;
  if (discordant > 0) {
    let tail = 0;
    for (let successes = improvements; successes <= discordant; successes += 1) {
      tail += binomialCoefficient(discordant, successes);
    }
    oneSidedPValue = tail / 2 ** discordant;
  }
  return { improvements, regressions, discordant, oneSidedPValue: round(oneSidedPValue, 8) };
};

export function comparePairedRepeatedSummaries(inputs: readonly PairedSummaryInput[]) {
  if (inputs.length < 2) throw new Error("Paired repeated reports require at least two repetitions");
  const parsed = inputs.map((input) => ({
    ...input,
    baseline: parseSummary(input.baseline, input.baselineSource),
    candidate: parseSummary(input.candidate, input.candidateSource),
  }));
  const reference = parsed[0];
  if (!reference) throw new Error("Paired repeated reports require a reference repetition");
  for (const pair of parsed) {
    for (const [summary, source] of [
      [pair.baseline, pair.baselineSource],
      [pair.candidate, pair.candidateSource],
    ] as const) {
      const issues = getPromotionEligibilityIssues(summary);
      if (issues.length > 0) throw new Error(`${source}: promotion provenance incomplete: ${issues.join("; ")}`);
    }
  }
  const repetitionIdentities = new Map<string, string>();
  const summaryHashes = new Map<string, string>();
  for (const pair of parsed) {
    for (const [summary, source] of [
      [pair.baseline, pair.baselineSource],
      [pair.candidate, pair.candidateSource],
    ] as const) {
      const generation = summary.generation;
      const summaryHash = stableHash(summary);
      const previousHashSource = summaryHashes.get(summaryHash);
      if (previousHashSource) {
        throw new Error(`${source}: duplicate repetition summary also used by ${previousHashSource}`);
      }
      summaryHashes.set(summaryHash, source);

      let identity = generation?.runId?.trim();
      if (!identity) identity = `${generation?.experimentId}:${generation?.generationId}`;
      const previousIdentitySource = repetitionIdentities.get(identity);
      if (previousIdentitySource) {
        throw new Error(`${source}: duplicate repetition identity also used by ${previousIdentitySource}`);
      }
      repetitionIdentities.set(identity, source);
    }
  }
  const referenceConfiguration = getConfiguration(reference.baseline);
  const referenceConfigurationHash = stableHash(referenceConfiguration);
  const baselineProvenance = getPromptProvenance(reference.baseline, reference.baselineSource);
  const candidateProvenance = getPromptProvenance(reference.candidate, reference.candidateSource);
  assertPairedPromptArmProvenance("baseline", baselineProvenance, reference.baselineSource);
  if (baselineProvenance.sha256 === candidateProvenance.sha256) {
    throw new Error(`${reference.candidateSource}: candidate prompt bundle must differ from baseline`);
  }
  assertPairedPromptArmProvenance("candidate", candidateProvenance, reference.candidateSource);
  for (const pair of parsed) {
    for (const [summary, source] of [
      [pair.baseline, pair.baselineSource],
      [pair.candidate, pair.candidateSource],
    ] as const) {
      if (stableHash(getConfiguration(summary)) !== referenceConfigurationHash) {
        throw new Error(`${source}: evaluation configuration or benchmark provenance differs`);
      }
      getResultMap(summary, source);
    }
    if (stableHash(getPromptProvenance(pair.baseline, pair.baselineSource)) !== stableHash(baselineProvenance)) {
      throw new Error(`${pair.baselineSource}: baseline prompt bundle provenance differs`);
    }
    if (stableHash(getPromptProvenance(pair.candidate, pair.candidateSource)) !== stableHash(candidateProvenance)) {
      throw new Error(`${pair.candidateSource}: candidate prompt bundle provenance differs`);
    }
  }

  const baselineScores: number[] = [];
  const candidateScores: number[] = [];
  const baselinePasses: boolean[] = [];
  const candidatePasses: boolean[] = [];
  const baselineLifecycles: boolean[] = [];
  const candidateLifecycles: boolean[] = [];
  const perCaseValues = new Map<
    string,
    { baselineScores: number[]; candidateScores: number[]; baselinePasses: boolean[]; candidatePasses: boolean[] }
  >();
  for (const pair of parsed) {
    const baselineResults = getResultMap(pair.baseline, pair.baselineSource);
    const candidateResults = getResultMap(pair.candidate, pair.candidateSource);
    for (const caseId of referenceConfiguration.caseIds) {
      const baselineResult = baselineResults.get(caseId);
      const candidateResult = candidateResults.get(caseId);
      if (!baselineResult || !candidateResult) throw new Error(`Missing paired result for '${caseId}'`);
      baselineScores.push(score(baselineResult));
      candidateScores.push(score(candidateResult));
      baselinePasses.push(passed(baselineResult));
      candidatePasses.push(passed(candidateResult));
      baselineLifecycles.push(completedLifecycle(baselineResult));
      candidateLifecycles.push(completedLifecycle(candidateResult));
      const values = perCaseValues.get(caseId) ?? {
        baselineScores: [],
        candidateScores: [],
        baselinePasses: [],
        candidatePasses: [],
      };
      values.baselineScores.push(score(baselineResult));
      values.candidateScores.push(score(candidateResult));
      values.baselinePasses.push(passed(baselineResult));
      values.candidatePasses.push(passed(candidateResult));
      perCaseValues.set(caseId, values);
    }
  }
  const deltasByCase = new Map(
    [...perCaseValues].map(([caseId, values]) => [
      caseId,
      values.candidateScores.map((value, index) => value - (values.baselineScores[index] ?? 0)),
    ]),
  );
  const perCase = [...perCaseValues].map(([caseId, values]) => {
    const baselineMean = mean(values.baselineScores);
    const candidateMean = mean(values.candidateScores);
    return {
      caseId,
      baselineMeanScore: round(baselineMean),
      candidateMeanScore: round(candidateMean),
      meanScoreDelta: round(candidateMean - baselineMean),
      baselinePassRate: rateMetric(values.baselinePasses),
      candidatePassRate: rateMetric(values.candidatePasses),
    };
  });
  const baselinePass = rateMetric(baselinePasses);
  const candidatePass = rateMetric(candidatePasses);
  const baselineLifecycle = rateMetric(baselineLifecycles);
  const candidateLifecycle = rateMetric(candidateLifecycles);
  const meanScoreDelta = mean(candidateScores) - mean(baselineScores);
  const bootstrap95 = getStratifiedPairedBootstrapInterval(deltasByCase);
  const discordantPass = getOneSidedDiscordantPairResult(baselinePasses, candidatePasses);
  const reasons: string[] = [];
  const split = referenceConfiguration.split;
  if (candidatePass.rate < 100) reasons.push(`candidate strict pass rate is ${candidatePass.rate}%, not 100%`);
  if (candidateLifecycle.rate < 100)
    reasons.push(`candidate lifecycle completion is ${candidateLifecycle.rate}%, not 100%`);
  if (perCase.some(({ meanScoreDelta: delta }) => delta < 0)) reasons.push("at least one case mean regressed");
  if (split === "dev") {
    if (meanScoreDelta < 2) reasons.push(`mean score improvement ${round(meanScoreDelta)} is below 2`);
    if (bootstrap95.lower <= 0) reasons.push(`paired bootstrap lower bound ${bootstrap95.lower} is not above 0`);
    if (discordantPass.oneSidedPValue > 0.05) {
      reasons.push(`one-sided discordant-pair p=${discordantPass.oneSidedPValue} exceeds 0.05`);
    }
  } else if (split === "heldout") {
    if (meanScoreDelta < 0) reasons.push(`heldout mean score regressed by ${round(Math.abs(meanScoreDelta))}`);
    if (bootstrap95.lower < 0) reasons.push(`heldout paired bootstrap lower bound ${bootstrap95.lower} is below 0`);
  } else {
    reasons.push(`unsupported promotion split '${split ?? "unknown"}'`);
  }
  return {
    split,
    repetitions: parsed.length,
    pairedObservations: baselineScores.length,
    provenance: {
      configuration: referenceConfiguration,
      configurationSha256: referenceConfigurationHash,
      baselinePromptBundle: baselineProvenance,
      candidatePromptBundle: candidateProvenance,
    },
    pooled: {
      baseline: { meanScore: round(mean(baselineScores)), strictPass: baselinePass, lifecycle: baselineLifecycle },
      candidate: { meanScore: round(mean(candidateScores)), strictPass: candidatePass, lifecycle: candidateLifecycle },
      delta: {
        meanScore: round(meanScoreDelta),
        strictPassRatePoints: round(candidatePass.rate - baselinePass.rate),
        lifecycleRatePoints: round(candidateLifecycle.rate - baselineLifecycle.rate),
        pairedBootstrap95: bootstrap95,
      },
      discordantPass,
    },
    perCase,
    promotion: { promote: reasons.length === 0, reasons },
  };
}

export const renderPairedBenchmarkReport = (comparison: ReturnType<typeof comparePairedRepeatedSummaries>) => {
  const { pooled } = comparison;
  const { configuration } = comparison.provenance;
  const formatRate = (metric: RateMetric) =>
    `${metric.rate}% (${metric.count}/${metric.total}); Wilson 95% [${round(metric.wilson95.lower * 100, 2)}%, ${round(metric.wilson95.upper * 100, 2)}%]`;
  const lines = [
    "# Paired repeated Custom Widget benchmark",
    "",
    `Suite: ${configuration.suite}; split: ${comparison.split}; mode: ${configuration.mode ?? "n/a"}; required reasoning: ${configuration.requiredReasoningEffort ?? "n/a"}; concurrency: ${configuration.concurrency ?? "n/a"}; request timeout: ${configuration.requestTimeoutMs ?? "n/a"} ms; provider preferences: ${JSON.stringify(configuration.providerPreferences)}; spend: ${JSON.stringify(configuration.spend)}; harness files: ${configuration.harnessFiles.length}; repetitions: ${comparison.repetitions}; paired observations: ${comparison.pairedObservations}`,
    "",
    "| Arm | Mean score | Strict pass | Lifecycle |",
    "| --- | ---: | ---: | ---: |",
    `| Release/v2 | ${pooled.baseline.meanScore} | ${formatRate(pooled.baseline.strictPass)} | ${formatRate(pooled.baseline.lifecycle)} |`,
    `| Candidate | ${pooled.candidate.meanScore} | ${formatRate(pooled.candidate.strictPass)} | ${formatRate(pooled.candidate.lifecycle)} |`,
    "",
    `Mean paired score delta: ${pooled.delta.meanScore}; stratified bootstrap 95% CI [${pooled.delta.pairedBootstrap95.lower}, ${pooled.delta.pairedBootstrap95.upper}].`,
    `Strict-pass discordances: ${pooled.discordantPass.improvements} improvements, ${pooled.discordantPass.regressions} regressions; one-sided exact p=${pooled.discordantPass.oneSidedPValue}.`,
    "",
    `Decision: ${comparison.promotion.promote ? "promote" : "do not promote"}. ${comparison.promotion.reasons.join("; ") || "all gates passed"}`,
    "",
    "## Per-case means",
    "",
    "| Case | Release/v2 | Candidate | Delta |",
    "| --- | ---: | ---: | ---: |",
    ...comparison.perCase.map(
      (entry) =>
        `| ${entry.caseId} | ${entry.baselineMeanScore} | ${entry.candidateMeanScore} | ${entry.meanScoreDelta} |`,
    ),
  ];
  return `${lines.join("\n")}\n`;
};

const getArguments = (args: readonly string[], name: string) =>
  args.filter((value) => value.startsWith(`--${name}=`)).map((value) => value.slice(name.length + 3));

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  const baselinePaths = getArguments(args, "baseline");
  const candidatePaths = getArguments(args, "candidate");
  const output = getArguments(args, "output")[0];
  if (!output || baselinePaths.length !== candidatePaths.length || baselinePaths.length < 2) {
    throw new Error(
      "Usage: benchmark-paired-report.ts --output=<dir> --baseline=<summary> --candidate=<summary> [--baseline=... --candidate=...]",
    );
  }
  const inputs = await Promise.all(
    baselinePaths.map(async (baselineSource, index) => {
      const candidateSource = candidatePaths[index];
      if (!candidateSource) throw new Error(`Missing candidate summary for pair ${index + 1}`);
      return {
        baselineSource,
        candidateSource,
        baseline: JSON.parse(await readFile(baselineSource, "utf8")) as unknown,
        candidate: JSON.parse(await readFile(candidateSource, "utf8")) as unknown,
      };
    }),
  );
  const comparison = comparePairedRepeatedSummaries(inputs);
  await mkdir(output, { recursive: true });
  await Promise.all([
    writeFile(path.join(output, "paired-comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`, "utf8"),
    writeFile(path.join(output, "paired-report.md"), renderPairedBenchmarkReport(comparison), "utf8"),
  ]);
}
