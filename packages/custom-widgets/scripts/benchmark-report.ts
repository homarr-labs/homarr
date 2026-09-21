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
        temperature?: number | null;
        reasoning?: unknown;
        maxOutputTokens?: number | null;
        judgeMaxOutputTokens?: number | null;
      };
  assistantPrompt?: {
    sha256?: string;
  } | null;
  assistantPromptBundle?: {
    sha256?: string;
  } | null;
  benchmark?: {
    sha256?: string;
    split?: string;
    caseIds?: string[];
  };
  harness?: {
    sha256?: string;
    judgePolicySha256?: string;
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

interface EfficiencyMetrics {
  measuredCases: number;
  totalToolCalls: number;
  meanToolCalls: number | null;
  totalModelInputTokens: number;
  totalModelOutputTokens: number;
  totalModelTokens: number;
  meanModelTokens: number | null;
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
  split: string | null;
  providerBaseUrl: string | null;
  generatorModel: string | null;
  judgeModel: string | null;
  maxLoops: number | null;
  temperature: number | null;
  reasoning: unknown;
  maxOutputTokens: number | null;
  judgeMaxOutputTokens: number | null;
  harnessSha256: string | null;
  judgePolicySha256: string | null;
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

const round = (value: number) => Math.round(value * 100) / 100;

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
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

const subtractOptional = (value: number | null, baseline: number | null) => {
  if (value === null || baseline === null) return null;
  return round(value - baseline);
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

const getBenchmarkConfiguration = (summary: GenerationSummary): BenchmarkConfiguration => {
  const generation = isRecord(summary.generation) ? summary.generation : null;
  const generationTemperature = typeof generation?.temperature === "number" ? generation.temperature : null;
  return {
    split: summary.benchmark?.split ?? null,
    providerBaseUrl: summary.providerBaseUrl ?? null,
    generatorModel: summary.generatorModel ?? null,
    judgeModel: summary.judgeModel ?? null,
    maxLoops: typeof generation?.maxLoops === "number" ? generation.maxLoops : null,
    temperature: generationTemperature ?? summary.generatorTemperature ?? null,
    reasoning: generation && "reasoning" in generation ? (generation.reasoning ?? null) : null,
    maxOutputTokens: typeof generation?.maxOutputTokens === "number" ? generation.maxOutputTokens : null,
    judgeMaxOutputTokens: typeof generation?.judgeMaxOutputTokens === "number" ? generation.judgeMaxOutputTokens : null,
    harnessSha256: summary.harness?.sha256 ?? null,
    judgePolicySha256: summary.harness?.judgePolicySha256 ?? null,
  };
};

const hasCompletedLifecycle = (result: BenchmarkCaseSummary) => {
  if (!result.calledTools?.includes("customWidget_createFromPreview")) return false;
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
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, values]) => [category, mean(values)]),
  );
  const categoryCoverage = Object.fromEntries(
    [...categoryValues.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
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
      scorePerToolCall: totalToolCalls > 0 ? round(totalScore / totalToolCalls) : null,
      scorePerThousandModelTokens: totalModelTokens > 0 ? round((totalScore * 1_000) / totalModelTokens) : null,
    },
  };
}

const getDeltas = (metrics: GenerationMetrics, baseline: GenerationMetrics): MetricDeltas => {
  const categories = new Set([...Object.keys(metrics.categoryAverages), ...Object.keys(baseline.categoryAverages)]);
  const categoryAverages = Object.fromEntries(
    [...categories]
      .sort((left, right) => left.localeCompare(right))
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
): PromotionDecision => {
  const reasons: string[] = [];
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
  return { ...(value as unknown as GenerationSummary), results };
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
    for (const category of [...knownCategories].sort((left, right) => left.localeCompare(right))) {
      metrics.categoryCoverage[category] ??= {
        gradedCases: 0,
        totalCases: metrics.cases,
        rate: 0,
      };
    }
    const caseIds = summary.results.map(({ caseId }) => caseId).toSorted();
    const configuration = getBenchmarkConfiguration(summary);
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
    "# Custom Widget assistant benchmark",
    "",
    `Baseline: ${comparison.baseline}`,
    "",
    "Lifecycle is a case-level proxy: at least one `customWidget_createFromPreview` call and one created widget. It does not prove one successful create call per requested widget.",
    "",
    "| Generation | Config | Mean | Median | Minimum | Pass rate | Lifecycle | Tools/case | Tokens/case | Delta | Promote |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |",
  ];
  for (const generation of comparison.generations) {
    const { metrics } = generation;
    lines.push(
      `| ${generation.name} | ${generation.configurationHash.slice(0, 12)} | ${metrics.mean} | ${metrics.median} | ${metrics.minimum} | ${metrics.passRate}% | ${metrics.lifecycleCompletionRate}% | ${metrics.efficiency.meanToolCalls ?? "n/a"} | ${metrics.efficiency.meanModelTokens ?? "n/a"} | ${formatDelta(generation.deltas.mean)} | ${generation.promotion.promote ? "yes" : "no"} |`,
    );
  }
  lines.push("", "## Decisions", "");
  for (const generation of comparison.generations) {
    const decision = generation.promotion.promote ? "promote" : "do not promote";
    const reasons = generation.promotion.reasons.join("; ") || "all promotion gates passed";
    lines.push(`- **${generation.name}: ${decision}.** ${reasons}`);
  }
  const categories = new Set(comparison.generations.flatMap(({ metrics }) => Object.keys(metrics.categoryAverages)));
  if (categories.size > 0) {
    lines.push("", "## Category averages", "");
    lines.push(`| Generation | ${[...categories].sort().join(" | ")} |`);
    lines.push(
      `| --- | ${[...categories]
        .sort()
        .map(() => "---:")
        .join(" | ")} |`,
    );
    for (const generation of comparison.generations) {
      lines.push(
        `| ${generation.name} | ${[...categories]
          .sort()
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
      `- **${generation.name} (${generation.configurationHash.slice(0, 12)}):** split=${configuration.split ?? "n/a"}; provider=${configuration.providerBaseUrl ?? "n/a"}; generator=${configuration.generatorModel ?? "n/a"}; judge=${configuration.judgeModel ?? "n/a"}; loops=${configuration.maxLoops ?? "n/a"}; temperature=${configuration.temperature ?? "n/a"}; reasoning=${JSON.stringify(configuration.reasoning)}; maxOutputTokens=${configuration.maxOutputTokens ?? "n/a"}; judgeMaxOutputTokens=${configuration.judgeMaxOutputTokens ?? "n/a"}; harness=${configuration.harnessSha256?.slice(0, 12) ?? "n/a"}; judgePolicy=${configuration.judgePolicySha256?.slice(0, 12) ?? "n/a"}`,
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
