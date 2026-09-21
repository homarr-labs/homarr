import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface BenchmarkCaseSummary {
  caseId: string;
  score?: number | null;
  verdict?: string;
  categories?: Record<string, number> | null;
  calledTools?: string[];
  widgets?: number;
  efficiency?: {
    toolCalls?: number;
    modelInputTokens?: number;
    modelOutputTokens?: number;
    modelCostUsd?: number;
    elapsedMs?: number;
  };
  cumulativeEfficiency?: {
    modelCostUsd?: number | null;
    modelAccountedCostUsd?: number;
    modelCostExact?: boolean;
    elapsedMs?: number;
  };
}

interface GenerationSummary {
  generatedAt?: string;
  generation?:
    | string
    | number
    | {
        runId?: string;
        experimentId?: string | null;
        generationId?: string | null;
        maxLoops?: number;
        concurrency?: number;
        requestTimeoutMs?: number;
        temperature?: number | null;
        reasoning?: unknown;
        requiredReasoningEffort?: string | null;
        providerPreferences?: unknown;
        maxOutputTokens?: number | null;
        judgeMaxOutputTokens?: number | null;
      };
  mode?: string;
  spend?: {
    enabled?: boolean;
    maxUsd?: number | null;
    campaignMaxUsd?: number | null;
    budgetShards?: number;
    requestReservationUsd?: number;
    campaignLedger?: { enabled?: boolean; strategy?: string | null; id?: string | null };
    ceiling?: unknown;
  };
  assistantPrompt?: {
    sha256?: string;
  } | null;
  assistantPromptBundle?: {
    sha256?: string;
    stagingInstruction?: { sha256?: string };
    assistantPolicy?: { sha256?: string };
  } | null;
  benchmark?: {
    suite?: string;
    sha256?: string;
    split?: string;
    caseIds?: string[];
    promotionEligible?: boolean;
    promotionIneligibilityReasons?: string[];
  };
  harness?: {
    sha256?: string;
    judgePolicySha256?: string;
    files?: string[];
  };
  providerBaseUrl?: string;
  generatorModel?: string;
  judgeModel?: string;
  generatorTemperature?: number;
  generationName?: string;
  name?: string;
  id?: string;
  promptHash?: string;
  caseHash?: string;
  casesHash?: string;
  benchmarkHash?: string;
  hashes?: {
    prompt?: string;
    cases?: string;
    caseSet?: string;
  };
  results: BenchmarkCaseSummary[];
}

export interface PromotionPolicy {
  minimumMeanImprovement: number;
  maximumMinimumRegression: number;
  maximumPassRateRegression: number;
  maximumLifecycleCompletionRegression: number;
  minimumDevPassRate: number;
  minimumDevLifecycleCompletionRate: number;
}

export const DEFAULT_PROMOTION_POLICY: PromotionPolicy = {
  minimumMeanImprovement: 2,
  maximumMinimumRegression: 0,
  maximumPassRateRegression: 0,
  maximumLifecycleCompletionRegression: 0,
  minimumDevPassRate: 100,
  minimumDevLifecycleCompletionRate: 100,
};
export const EXPLORATORY_REPORT_PROMOTION_REASON =
  "single-run reports are exploratory; use the paired repeated report for promotion";

interface EfficiencyMetrics {
  measuredCases: number;
  totalToolCalls: number;
  meanToolCalls: number | null;
  totalModelInputTokens: number;
  totalModelOutputTokens: number;
  totalModelTokens: number;
  meanModelTokens: number | null;
  measuredCostCases: number;
  totalModelCostUsd: number;
  meanModelCostUsd: number | null;
  accountedCostCases: number;
  totalModelAccountedCostUsd: number;
  meanModelAccountedCostUsd: number | null;
  measuredDurationCases: number;
  totalElapsedMs: number;
  meanElapsedMs: number | null;
  scorePerToolCall: number | null;
  scorePerThousandModelTokens: number | null;
}

interface GenerationMetrics {
  cases: number;
  scoredCases: number;
  mean: number;
  median: number;
  minimum: number;
  passRate: number;
  lifecycleCompletionRate: number;
  categoryAverages: Record<string, number>;
  categoryCoverage: Record<string, { gradedCases: number; totalCases: number; rate: number }>;
  efficiency: EfficiencyMetrics;
}

export interface BenchmarkConfiguration {
  suite: string;
  split: string | null;
  mode: string | null;
  providerBaseUrl: string | null;
  generatorModel: string | null;
  judgeModel: string | null;
  maxLoops: number | null;
  concurrency: number | null;
  requestTimeoutMs: number | null;
  temperature: number | null;
  reasoning: unknown;
  requiredReasoningEffort: string | null;
  providerPreferences: unknown;
  maxOutputTokens: number | null;
  judgeMaxOutputTokens: number | null;
  spend: {
    enabled: boolean | null;
    maxUsd: number | null;
    campaignMaxUsd: number | null;
    budgetShards: number | null;
    requestReservationUsd: number | null;
    campaignLedger: unknown;
    ceiling: unknown;
  };
  harnessSha256: string | null;
  judgePolicySha256: string | null;
  harnessFiles: string[];
}

interface MetricDeltas {
  mean: number;
  median: number;
  minimum: number;
  passRate: number;
  lifecycleCompletionRate: number;
  categoryAverages: Record<string, number>;
  efficiency: {
    meanToolCalls: number | null;
    meanModelTokens: number | null;
    meanModelCostUsd: number | null;
    meanModelAccountedCostUsd: number | null;
    meanElapsedMs: number | null;
    scorePerToolCall: number | null;
    scorePerThousandModelTokens: number | null;
  };
}

interface PromotionDecision {
  promote: boolean;
  reasons: string[];
}

export interface GenerationComparison {
  name: string;
  source: string;
  generatedAt?: string;
  promptHash?: string;
  caseHash?: string;
  caseIds: string[];
  configuration: BenchmarkConfiguration;
  configurationHash: string;
  metrics: GenerationMetrics;
  deltas: MetricDeltas;
  promotion: PromotionDecision;
}

export interface BenchmarkComparison {
  baseline: string;
  policy: PromotionPolicy;
  generations: GenerationComparison[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const roundTo = (value: number, digits: number) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};
const round = (value: number) => roundTo(value, 2);

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
};

const getConfigurationHash = (configuration: BenchmarkConfiguration) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(configuration)), "utf8")
    .digest("hex");

const mean = (values: readonly number[]) => {
  if (values.length === 0) return 0;
  return round(values.reduce((total, value) => total + value, 0) / values.length);
};

const median = (values: readonly number[]) => {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
};

const subtractOptional = (value: number | null, baseline: number | null, digits = 2) => {
  if (value === null || baseline === null) return null;
  return roundTo(value - baseline, digits);
};

const getGenerationName = (summary: GenerationSummary, source: string) => {
  let nestedGeneration: string | number | undefined;
  if (isRecord(summary.generation)) {
    nestedGeneration = summary.generation.generationId ?? summary.generation.runId;
  } else {
    nestedGeneration = summary.generation;
  }
  const configured = summary.generationName ?? summary.name ?? summary.id ?? nestedGeneration;
  if (configured !== undefined && String(configured).trim()) return String(configured);
  return path.basename(path.dirname(source));
};

const getPromptHash = (summary: GenerationSummary) =>
  summary.assistantPromptBundle?.sha256 ??
  summary.assistantPrompt?.sha256 ??
  summary.promptHash ??
  summary.hashes?.prompt;

const getCaseHash = (summary: GenerationSummary) =>
  summary.benchmark?.sha256 ??
  summary.caseHash ??
  summary.casesHash ??
  summary.benchmarkHash ??
  summary.hashes?.cases ??
  summary.hashes?.caseSet;

const hasCompleteSpendProvenance = (spend: GenerationSummary["spend"]) => {
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

const getPromotionEligibilityIssues = (summary: GenerationSummary): string[] => {
  // Legacy summaries remain readable, but incomplete historical provenance
  // must never be interpreted as promotion evidence.
  const assistantSummary = summary.mode === "assistant-tool-loop" || summary.benchmark?.promotionEligible !== undefined;
  if (!assistantSummary) return ["run is not marked promotion-eligible"];
  const issues: string[] = [];
  const generation = isRecord(summary.generation) ? summary.generation : null;
  const benchmark = summary.benchmark;
  const spend = summary.spend;
  const assistantPromptBundle = summary.assistantPromptBundle;
  const reasoningEffort = isRecord(generation?.reasoning) ? generation.reasoning.effort : undefined;
  const requiredReasoningEffort = summary.generatorModel?.toLowerCase().includes("gpt-5.6-luna") ? "high" : "max";
  if (summary.mode !== "assistant-tool-loop") issues.push("promotion requires assistant-tool-loop mode");
  if (benchmark?.promotionEligible !== true) {
    issues.push(...(benchmark?.promotionIneligibilityReasons ?? ["run is not marked promotion-eligible"]));
  }
  if (!benchmark?.suite?.trim()) issues.push("missing benchmark suite provenance");
  if (!benchmark?.split?.trim()) issues.push("missing benchmark split provenance");
  if (!benchmark?.sha256?.trim() || !benchmark.caseIds?.length) issues.push("missing benchmark case provenance");
  if (!generation || generation.maxLoops !== 1) issues.push("promotion requires maxLoops=1");
  if (
    typeof generation?.experimentId !== "string" ||
    !generation.experimentId.trim() ||
    typeof generation.generationId !== "string" ||
    !generation.generationId.trim()
  ) {
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
  if (
    !assistantPromptBundle?.sha256?.trim() ||
    !assistantPromptBundle.stagingInstruction?.sha256?.trim() ||
    !assistantPromptBundle.assistantPolicy?.sha256?.trim()
  ) {
    issues.push("missing assistant prompt provenance");
  }
  return [...new Set(issues)];
};

const getBenchmarkConfiguration = (summary: GenerationSummary): BenchmarkConfiguration => {
  const generation = isRecord(summary.generation) ? summary.generation : null;
  const generationTemperature = typeof generation?.temperature === "number" ? generation.temperature : null;
  return {
    suite: summary.benchmark?.suite ?? "core",
    split: summary.benchmark?.split ?? null,
    mode: summary.mode ?? null,
    providerBaseUrl: summary.providerBaseUrl ?? null,
    generatorModel: summary.generatorModel ?? null,
    judgeModel: summary.judgeModel ?? null,
    maxLoops: typeof generation?.maxLoops === "number" ? generation.maxLoops : null,
    concurrency: typeof generation?.concurrency === "number" ? generation.concurrency : null,
    requestTimeoutMs: typeof generation?.requestTimeoutMs === "number" ? generation.requestTimeoutMs : null,
    temperature: generationTemperature ?? summary.generatorTemperature ?? null,
    reasoning: generation && "reasoning" in generation ? (generation.reasoning ?? null) : null,
    requiredReasoningEffort:
      generation && typeof generation.requiredReasoningEffort === "string" ? generation.requiredReasoningEffort : null,
    providerPreferences:
      generation && "providerPreferences" in generation ? (generation.providerPreferences ?? null) : null,
    maxOutputTokens: typeof generation?.maxOutputTokens === "number" ? generation.maxOutputTokens : null,
    judgeMaxOutputTokens: typeof generation?.judgeMaxOutputTokens === "number" ? generation.judgeMaxOutputTokens : null,
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
  };
};

const hasCompletedLifecycle = (result: BenchmarkCaseSummary) => {
  const persistedFromPreview =
    result.calledTools?.includes("customWidget_createFromPreview") === true ||
    result.calledTools?.includes("customWidget_updateFromPreview") === true;
  if (!persistedFromPreview) return false;
  return (result.widgets ?? 0) > 0;
};

export function aggregateGenerationMetrics(results: readonly BenchmarkCaseSummary[]): GenerationMetrics {
  const scores = results.map((result) => (typeof result.score === "number" ? result.score : 0));
  const scoredCases = results.filter((result) => typeof result.score === "number").length;
  const passedCases = results.filter((result) => result.verdict === "pass").length;
  const lifecycleCompletions = results.filter(hasCompletedLifecycle).length;
  const categoryValues = new Map<string, number[]>();
  for (const result of results) {
    for (const [category, score] of Object.entries(result.categories ?? {})) {
      if (!Number.isFinite(score)) continue;
      const values = categoryValues.get(category) ?? [];
      values.push(score);
      categoryValues.set(category, values);
    }
  }
  const categoryAverages = Object.fromEntries(
    [...categoryValues.entries()]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([category, values]) => [category, mean(values)]),
  );
  const categoryCoverage = Object.fromEntries(
    [...categoryValues.entries()]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([category, values]) => [
        category,
        {
          gradedCases: values.length,
          totalCases: results.length,
          rate: results.length > 0 ? round((values.length / results.length) * 100) : 0,
        },
      ]),
  );
  const measuredEfficiency = results.flatMap((result) => (result.efficiency ? [result.efficiency] : []));
  const totalToolCalls = measuredEfficiency.reduce((total, value) => total + (value.toolCalls ?? 0), 0);
  const totalModelInputTokens = measuredEfficiency.reduce((total, value) => total + (value.modelInputTokens ?? 0), 0);
  const totalModelOutputTokens = measuredEfficiency.reduce((total, value) => total + (value.modelOutputTokens ?? 0), 0);
  const totalModelTokens = totalModelInputTokens + totalModelOutputTokens;
  const cumulativeEfficiency: NonNullable<BenchmarkCaseSummary["cumulativeEfficiency"]>[] = [];
  for (const result of results) {
    if (result.cumulativeEfficiency) {
      cumulativeEfficiency.push(result.cumulativeEfficiency);
      continue;
    }
    if (result.efficiency) {
      cumulativeEfficiency.push({
        modelCostUsd: result.efficiency.modelCostUsd,
        elapsedMs: result.efficiency.elapsedMs,
      });
    }
  }
  const measuredCosts = cumulativeEfficiency.flatMap((value) =>
    value.modelCostExact !== false && typeof value.modelCostUsd === "number" && Number.isFinite(value.modelCostUsd)
      ? [value.modelCostUsd]
      : [],
  );
  const measuredDurations = cumulativeEfficiency.flatMap((value) =>
    typeof value.elapsedMs === "number" && Number.isFinite(value.elapsedMs) ? [value.elapsedMs] : [],
  );
  const accountedCosts = cumulativeEfficiency.flatMap((value) => {
    if (typeof value.modelAccountedCostUsd === "number" && Number.isFinite(value.modelAccountedCostUsd)) {
      return [value.modelAccountedCostUsd];
    }
    if (typeof value.modelCostUsd === "number" && Number.isFinite(value.modelCostUsd)) return [value.modelCostUsd];
    return [];
  });
  const totalModelCostUsd = measuredCosts.reduce((total, value) => total + value, 0);
  const totalModelAccountedCostUsd = accountedCosts.reduce((total, value) => total + value, 0);
  const totalElapsedMs = measuredDurations.reduce((total, value) => total + value, 0);
  const totalScore = scores.reduce((total, score) => total + score, 0);
  const averageScore = mean(scores);
  const measuredCases = measuredEfficiency.length;
  let meanToolCalls: number | null = null;
  let meanModelTokens: number | null = null;
  if (measuredCases > 0) {
    meanToolCalls = round(totalToolCalls / measuredCases);
    meanModelTokens = round(totalModelTokens / measuredCases);
  }
  return {
    cases: results.length,
    scoredCases,
    mean: averageScore,
    median: median(scores),
    minimum: scores.length > 0 ? Math.min(...scores) : 0,
    passRate: results.length > 0 ? round((passedCases / results.length) * 100) : 0,
    lifecycleCompletionRate: results.length > 0 ? round((lifecycleCompletions / results.length) * 100) : 0,
    categoryAverages,
    categoryCoverage,
    efficiency: {
      measuredCases,
      totalToolCalls,
      meanToolCalls,
      totalModelInputTokens,
      totalModelOutputTokens,
      totalModelTokens,
      meanModelTokens,
      measuredCostCases: measuredCosts.length,
      totalModelCostUsd: roundTo(totalModelCostUsd, 6),
      meanModelCostUsd: measuredCosts.length > 0 ? roundTo(totalModelCostUsd / measuredCosts.length, 6) : null,
      accountedCostCases: accountedCosts.length,
      totalModelAccountedCostUsd: roundTo(totalModelAccountedCostUsd, 6),
      meanModelAccountedCostUsd:
        accountedCosts.length > 0 ? roundTo(totalModelAccountedCostUsd / accountedCosts.length, 6) : null,
      measuredDurationCases: measuredDurations.length,
      totalElapsedMs,
      meanElapsedMs: measuredDurations.length > 0 ? round(totalElapsedMs / measuredDurations.length) : null,
      scorePerToolCall: totalToolCalls > 0 ? round(totalScore / totalToolCalls) : null,
      scorePerThousandModelTokens: totalModelTokens > 0 ? round((totalScore * 1_000) / totalModelTokens) : null,
    },
  };
}

const getDeltas = (metrics: GenerationMetrics, baseline: GenerationMetrics): MetricDeltas => {
  const categories = new Set([...Object.keys(metrics.categoryAverages), ...Object.keys(baseline.categoryAverages)]);
  const categoryAverages = Object.fromEntries(
    [...categories]
      .toSorted((left, right) => left.localeCompare(right))
      .map((category) => [
        category,
        round((metrics.categoryAverages[category] ?? 0) - (baseline.categoryAverages[category] ?? 0)),
      ]),
  );
  return {
    mean: round(metrics.mean - baseline.mean),
    median: round(metrics.median - baseline.median),
    minimum: round(metrics.minimum - baseline.minimum),
    passRate: round(metrics.passRate - baseline.passRate),
    lifecycleCompletionRate: round(metrics.lifecycleCompletionRate - baseline.lifecycleCompletionRate),
    categoryAverages,
    efficiency: {
      meanToolCalls: subtractOptional(metrics.efficiency.meanToolCalls, baseline.efficiency.meanToolCalls),
      meanModelTokens: subtractOptional(metrics.efficiency.meanModelTokens, baseline.efficiency.meanModelTokens),
      meanModelCostUsd: subtractOptional(metrics.efficiency.meanModelCostUsd, baseline.efficiency.meanModelCostUsd, 6),
      meanModelAccountedCostUsd: subtractOptional(
        metrics.efficiency.meanModelAccountedCostUsd,
        baseline.efficiency.meanModelAccountedCostUsd,
        6,
      ),
      meanElapsedMs: subtractOptional(metrics.efficiency.meanElapsedMs, baseline.efficiency.meanElapsedMs),
      scorePerToolCall: subtractOptional(metrics.efficiency.scorePerToolCall, baseline.efficiency.scorePerToolCall),
      scorePerThousandModelTokens: subtractOptional(
        metrics.efficiency.scorePerThousandModelTokens,
        baseline.efficiency.scorePerThousandModelTokens,
      ),
    },
  };
};

const getPromotionDecision = (
  caseIds: readonly string[],
  baselineCaseIds: readonly string[],
  caseHash: string | undefined,
  baselineCaseHash: string | undefined,
  configuration: BenchmarkConfiguration,
  baselineConfiguration: BenchmarkConfiguration,
  metrics: GenerationMetrics,
  deltas: MetricDeltas,
  policy: PromotionPolicy,
  eligibilityIssues: readonly string[] = [],
  baselineEligibilityIssues: readonly string[] = [],
): PromotionDecision => {
  const reasons: string[] = [...eligibilityIssues];
  if (baselineEligibilityIssues.length > 0) reasons.push("baseline is not promotion-eligible");
  if (caseIds.join("\n") !== baselineCaseIds.join("\n")) reasons.push("case set differs from baseline");
  if (baselineCaseHash && caseHash !== baselineCaseHash) reasons.push("case hash differs from baseline");
  const mismatchedConfiguration = Object.keys(baselineConfiguration).filter((key) => {
    const field = key as keyof BenchmarkConfiguration;
    return (
      JSON.stringify(canonicalize(configuration[field])) !== JSON.stringify(canonicalize(baselineConfiguration[field]))
    );
  });
  if (mismatchedConfiguration.length > 0) {
    reasons.push(`configuration differs from baseline: ${mismatchedConfiguration.join(", ")}`);
  }
  if (deltas.mean < policy.minimumMeanImprovement) {
    reasons.push(`mean improvement ${deltas.mean} is below ${policy.minimumMeanImprovement}`);
  }
  if (deltas.minimum < -policy.maximumMinimumRegression)
    reasons.push(`minimum regressed by ${Math.abs(deltas.minimum)}`);
  if (deltas.passRate < -policy.maximumPassRateRegression) {
    reasons.push(`pass rate regressed by ${Math.abs(deltas.passRate)} points`);
  }
  if (deltas.lifecycleCompletionRate < -policy.maximumLifecycleCompletionRegression) {
    reasons.push(`lifecycle completion regressed by ${Math.abs(deltas.lifecycleCompletionRate)} points`);
  }
  if (configuration.split === "dev" && metrics.passRate < policy.minimumDevPassRate) {
    reasons.push(`dev pass rate ${metrics.passRate}% is below ${policy.minimumDevPassRate}%`);
  }
  if (configuration.split === "dev" && metrics.lifecycleCompletionRate < policy.minimumDevLifecycleCompletionRate) {
    reasons.push(
      `dev lifecycle completion ${metrics.lifecycleCompletionRate}% is below ${policy.minimumDevLifecycleCompletionRate}%`,
    );
  }
  reasons.push(EXPLORATORY_REPORT_PROMOTION_REASON);
  return { promote: reasons.length === 0, reasons };
};

const parseSummary = (value: unknown, source: string): GenerationSummary => {
  if (!isRecord(value) || !Array.isArray(value.results)) throw new Error(`${source}: expected an object with results`);
  const results = value.results.map((result, index) => {
    if (!isRecord(result) || typeof result.caseId !== "string") {
      throw new Error(`${source}: result ${index + 1} is missing caseId`);
    }
    return result as unknown as BenchmarkCaseSummary;
  });
  const summary = { ...(value as unknown as GenerationSummary), results };
  const assistantSummary = summary.mode === "assistant-tool-loop" || summary.benchmark?.promotionEligible !== undefined;
  if (assistantSummary) {
    const resultCaseIds = results.map(({ caseId }) => caseId);
    if (new Set(resultCaseIds).size !== resultCaseIds.length) {
      throw new Error(`${source}: result case IDs must be unique`);
    }
    const expectedCaseIds = [...(summary.benchmark?.caseIds ?? [])].toSorted();
    const actualCaseIds = resultCaseIds.toSorted();
    if (expectedCaseIds.length === 0 || expectedCaseIds.join("\n") !== actualCaseIds.join("\n")) {
      throw new Error(`${source}: results must exactly match benchmark.caseIds`);
    }
  }
  return summary;
};

export function compareGenerationSummaries(
  entries: readonly { source: string; summary: unknown }[],
  baselineSource: string,
  policy: PromotionPolicy = DEFAULT_PROMOTION_POLICY,
): BenchmarkComparison {
  if (entries.length === 0) throw new Error("At least one generation summary is required");
  const parsed = entries.map(({ source, summary }) => ({ source, summary: parseSummary(summary, source) }));
  const knownCategories = new Set(
    parsed.flatMap(({ summary }) => summary.results.flatMap((result) => Object.keys(result.categories ?? {}))),
  );
  const baselineEntry = parsed.find(({ source }) => source === baselineSource);
  if (!baselineEntry) throw new Error(`Baseline '${baselineSource}' is not one of the input summaries`);
  const baselineMetrics = aggregateGenerationMetrics(baselineEntry.summary.results);
  const baselineCaseIds = baselineEntry.summary.results.map(({ caseId }) => caseId).toSorted();
  const baselineCaseHash = getCaseHash(baselineEntry.summary);
  const baselineConfiguration = getBenchmarkConfiguration(baselineEntry.summary);
  const baselineEligibilityIssues = getPromotionEligibilityIssues(baselineEntry.summary);
  const baselineName = getGenerationName(baselineEntry.summary, baselineEntry.source);
  const ordered = parsed.toSorted((left, right) => {
    if (left.source === baselineSource) return -1;
    if (right.source === baselineSource) return 1;
    const leftName = getGenerationName(left.summary, left.source);
    const rightName = getGenerationName(right.summary, right.source);
    return leftName.localeCompare(rightName, undefined, { numeric: true });
  });
  const generations = ordered.map(({ source, summary }) => {
    const metrics = aggregateGenerationMetrics(summary.results);
    for (const category of [...knownCategories].toSorted((left, right) => left.localeCompare(right))) {
      metrics.categoryCoverage[category] ??= {
        gradedCases: 0,
        totalCases: metrics.cases,
        rate: 0,
      };
    }
    const caseIds = summary.results.map(({ caseId }) => caseId).toSorted();
    const configuration = getBenchmarkConfiguration(summary);
    const eligibilityIssues = getPromotionEligibilityIssues(summary);
    const baselinePromptBundleHash = baselineEntry.summary.assistantPromptBundle?.sha256;
    const candidatePromptBundleHash = summary.assistantPromptBundle?.sha256;
    if (
      source !== baselineSource &&
      eligibilityIssues.length === 0 &&
      baselineEligibilityIssues.length === 0 &&
      baselinePromptBundleHash?.trim() &&
      candidatePromptBundleHash === baselinePromptBundleHash
    ) {
      eligibilityIssues.push("candidate prompt bundle matches baseline");
    }
    const deltas = getDeltas(metrics, baselineMetrics);
    let promotion: PromotionDecision = { promote: false, reasons: ["baseline"] };
    if (source !== baselineSource) {
      promotion = getPromotionDecision(
        caseIds,
        baselineCaseIds,
        getCaseHash(summary),
        baselineCaseHash,
        configuration,
        baselineConfiguration,
        metrics,
        deltas,
        policy,
        eligibilityIssues,
        baselineEligibilityIssues,
      );
    }
    return {
      name: getGenerationName(summary, source),
      source,
      ...(summary.generatedAt ? { generatedAt: summary.generatedAt } : {}),
      ...(getPromptHash(summary) ? { promptHash: getPromptHash(summary) } : {}),
      ...(getCaseHash(summary) ? { caseHash: getCaseHash(summary) } : {}),
      caseIds,
      configuration,
      configurationHash: getConfigurationHash(configuration),
      metrics,
      deltas,
      promotion,
    };
  });
  return { baseline: baselineName, policy, generations };
}

const formatDelta = (value: number | null) => {
  if (value === null) return "n/a";
  if (value > 0) return `+${value}`;
  return String(value);
};

export function renderBenchmarkReport(comparison: BenchmarkComparison) {
  const lines = [
    "# Exploratory Custom Widget assistant benchmark",
    "",
    `Baseline: ${comparison.baseline}`,
    "",
    "Lifecycle is a case-level proxy: at least one `customWidget_createFromPreview` or `customWidget_updateFromPreview` call and one persisted widget. It does not prove one successful persistence call per requested widget.",
    "",
    "Single-run comparisons cannot authorize promotion. Use the paired repeated report for a promotion decision.",
    "",
    "| Generation | Config | Mean | Median | Minimum | Pass rate | Lifecycle | Tools/case | Tokens/case | Delta | Promotion eligible |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |",
  ];
  for (const generation of comparison.generations) {
    const { metrics } = generation;
    lines.push(
      `| ${generation.name} | ${generation.configurationHash.slice(0, 12)} | ${metrics.mean} | ${metrics.median} | ${metrics.minimum} | ${metrics.passRate}% | ${metrics.lifecycleCompletionRate}% | ${metrics.efficiency.meanToolCalls ?? "n/a"} | ${metrics.efficiency.meanModelTokens ?? "n/a"} | ${formatDelta(generation.deltas.mean)} | ${generation.promotion.promote ? "yes" : "no"} |`,
    );
  }
  lines.push("", "## Exploratory decisions", "");
  for (const generation of comparison.generations) {
    const decision = generation.promotion.promote ? "promote" : "do not promote";
    const reasons = generation.promotion.reasons.join("; ") || EXPLORATORY_REPORT_PROMOTION_REASON;
    lines.push(`- **${generation.name}: ${decision}.** ${reasons}`);
  }
  const categories = new Set(comparison.generations.flatMap(({ metrics }) => Object.keys(metrics.categoryAverages)));
  if (categories.size > 0) {
    const sortedCategories = [...categories].toSorted();
    lines.push("", "## Category averages", "");
    lines.push(`| Generation | ${sortedCategories.join(" | ")} |`);
    lines.push(`| --- | ${sortedCategories.map(() => "---:").join(" | ")} |`);
    for (const generation of comparison.generations) {
      lines.push(
        `| ${generation.name} | ${sortedCategories
          .map((category) => {
            const average = generation.metrics.categoryAverages[category];
            const coverage = generation.metrics.categoryCoverage[category];
            if (average === undefined || coverage === undefined) return "n/a (0 cases)";
            return `${average} (${coverage.gradedCases}/${coverage.totalCases} cases)`;
          })
          .join(" | ")} |`,
      );
    }
  }
  lines.push("", "## Configuration", "");
  for (const generation of comparison.generations) {
    const configuration = generation.configuration;
    lines.push(
      `- **${generation.name} (${generation.configurationHash.slice(0, 12)}):** suite=${configuration.suite}; split=${configuration.split ?? "n/a"}; mode=${configuration.mode ?? "n/a"}; provider=${configuration.providerBaseUrl ?? "n/a"}; generator=${configuration.generatorModel ?? "n/a"}; judge=${configuration.judgeModel ?? "n/a"}; loops=${configuration.maxLoops ?? "n/a"}; temperature=${configuration.temperature ?? "n/a"}; reasoning=${JSON.stringify(configuration.reasoning)}; requiredReasoning=${configuration.requiredReasoningEffort ?? "n/a"}; providerPreferences=${JSON.stringify(configuration.providerPreferences)}; maxOutputTokens=${configuration.maxOutputTokens ?? "n/a"}; judgeMaxOutputTokens=${configuration.judgeMaxOutputTokens ?? "n/a"}; concurrency=${configuration.concurrency ?? "n/a"}; requestTimeoutMs=${configuration.requestTimeoutMs ?? "n/a"}; spend=${JSON.stringify(configuration.spend)}; harness=${configuration.harnessSha256?.slice(0, 12) ?? "n/a"}; harnessFiles=${configuration.harnessFiles.length}; judgePolicy=${configuration.judgePolicySha256?.slice(0, 12) ?? "n/a"}`,
    );
  }
  const hashes = comparison.generations.filter(({ promptHash, caseHash }) => promptHash || caseHash);
  if (hashes.length > 0) {
    lines.push("", "## Reproducibility", "");
    for (const generation of hashes) {
      lines.push(
        `- **${generation.name}:** prompt ${generation.promptHash ?? "n/a"}; cases ${generation.caseHash ?? "n/a"}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export interface BenchmarkReportCliOptions {
  outputDirectory: string;
  baseline: string;
  summaries: string[];
}

const parseCliOptions = (args: readonly string[]): BenchmarkReportCliOptions => {
  const outputArgument = args.find((value) => value.startsWith("--output="));
  const baselineArgument = args.find((value) => value.startsWith("--baseline="));
  const summaries = args.filter((value) => !value.startsWith("--"));
  if (!outputArgument || !baselineArgument || summaries.length === 0) {
    throw new Error("Usage: tsx benchmark-report.ts --output=<directory> --baseline=<summary.json> <summary.json>...");
  }
  return {
    outputDirectory: path.resolve(outputArgument.slice("--output=".length)),
    baseline: path.resolve(baselineArgument.slice("--baseline=".length)),
    summaries: summaries.map((value) => path.resolve(value)),
  };
};

export async function writeBenchmarkComparison(options: BenchmarkReportCliOptions) {
  const entries = await Promise.all(
    options.summaries.map(async (source) => ({
      source,
      summary: JSON.parse(await readFile(source, "utf8")) as unknown,
    })),
  );
  const comparison = compareGenerationSummaries(entries, options.baseline);
  await mkdir(options.outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(options.outputDirectory, "comparison.json"),
      `${JSON.stringify(comparison, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(options.outputDirectory, "report.md"), renderBenchmarkReport(comparison), "utf8"),
  ]);
  return comparison;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const options = parseCliOptions(process.argv.slice(2));
  await writeBenchmarkComparison(options);
  process.stdout.write(`Wrote ${path.join(options.outputDirectory, "comparison.json")} and report.md\n`);
}
