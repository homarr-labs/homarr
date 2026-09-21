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
  providerBaseUrl?: string;
  generatorModel?: string;
  judgeModel?: string;
  generation?: {
    maxLoops?: number;
    concurrency?: number;
    requestTimeoutMs?: number;
    temperature?: number;
    reasoning?: unknown;
    maxOutputTokens?: number;
    judgeMaxOutputTokens?: number;
  };
  assistantPromptBundle?: {
    sha256?: string;
    id?: string | null;
    provenance?: unknown;
    stagingInstruction?: { sha256?: string };
    assistantPolicy?: { sha256?: string };
  } | null;
  harness?: { sha256?: string; judgePolicySha256?: string };
  benchmark?: { suite?: string; split?: string; sha256?: string; caseIds?: string[] };
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
    provenance: bundle.provenance ?? null,
    stagingInstructionSha256: bundle.stagingInstruction.sha256,
    assistantPolicySha256: bundle.assistantPolicy.sha256,
  };
};

const getConfiguration = (summary: EvaluationSummary) => ({
  suite: summary.benchmark?.suite ?? "core",
  split: summary.benchmark?.split ?? null,
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
  maxOutputTokens: summary.generation?.maxOutputTokens ?? null,
  judgeMaxOutputTokens: summary.generation?.judgeMaxOutputTokens ?? null,
  harnessSha256: summary.harness?.sha256 ?? null,
  judgePolicySha256: summary.harness?.judgePolicySha256 ?? null,
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
  const referenceConfiguration = getConfiguration(reference.baseline);
  const referenceConfigurationHash = stableHash(referenceConfiguration);
  const baselineProvenance = getPromptProvenance(reference.baseline, reference.baselineSource);
  const candidateProvenance = getPromptProvenance(reference.candidate, reference.candidateSource);
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
    `Suite: ${configuration.suite}; split: ${comparison.split}; concurrency: ${configuration.concurrency ?? "n/a"}; request timeout: ${configuration.requestTimeoutMs ?? "n/a"} ms; repetitions: ${comparison.repetitions}; paired observations: ${comparison.pairedObservations}`,
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
