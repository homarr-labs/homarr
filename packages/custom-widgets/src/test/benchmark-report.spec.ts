import { describe, expect, test } from "vitest";

import {
  aggregateGenerationMetrics,
  compareGenerationSummaries,
  renderBenchmarkReport,
} from "../../scripts/benchmark-report";

const baselineSummary = {
  generationName: "baseline",
  promptHash: "prompt-v0",
  caseHash: "cases-v1",
  results: [
    {
      caseId: "hard-api",
      score: 80,
      verdict: "pass",
      categories: { safety: 90, usefulness: 70 },
      calledTools: ["customWidget_createFromPreview"],
      widgets: 1,
      efficiency: { toolCalls: 8, modelInputTokens: 900, modelOutputTokens: 100 },
    },
    {
      caseId: "hard-layout",
      score: null,
      verdict: "fail",
      categories: null,
      calledTools: ["customWidget_validateTemplate"],
      widgets: 0,
      efficiency: { toolCalls: 12, modelInputTokens: 1_700, modelOutputTokens: 300 },
    },
  ],
};

const candidateSummary = {
  generation: 1,
  hashes: { prompt: "prompt-v1", cases: "cases-v1" },
  results: [
    {
      caseId: "hard-layout",
      score: 75,
      verdict: "pass",
      categories: { safety: 85, usefulness: 80 },
      calledTools: ["customWidget_createFromPreview"],
      widgets: 1,
      efficiency: { toolCalls: 10, modelInputTokens: 1_200, modelOutputTokens: 300 },
    },
    {
      caseId: "hard-api",
      score: 84,
      verdict: "pass",
      categories: { safety: 92, usefulness: 82 },
      calledTools: ["customWidget_createFromPreview"],
      widgets: 1,
      efficiency: { toolCalls: 8, modelInputTokens: 900, modelOutputTokens: 100 },
    },
  ],
};

const currentRunnerSummary = {
  generatedAt: "2026-09-20T10:00:00.000Z",
  mode: "assistant-tool-loop",
  generation: {
    runId: "2026-09-20T10-00-00-000Z",
    experimentId: "assistant-prompt-hard",
    generationId: "generation-2",
    maxLoops: 10,
    concurrency: 4,
    requestTimeoutMs: 450_000,
    model: "z-ai/glm-5.3-flash",
    temperature: 0.2,
    reasoning: { effort: "medium", exclude: true },
    providerPreferences: { order: ["DeepInfra"], allow_fallbacks: false, quantizations: ["fp8"] },
    maxOutputTokens: 32_768,
    judgeMaxOutputTokens: 32_768,
  },
  providerBaseUrl: "https://openrouter.ai/api/v1",
  generatorModel: "z-ai/glm-5.3-flash",
  judgeModel: "z-ai/glm-5.3-flash",
  spend: {
    enabled: true,
    maxUsd: 20,
    requestReservationUsd: 0.5,
    ceiling: { strategy: "openrouter-provider-max-price-v1" },
  },
  harness: {
    sha256: "harness-v2",
    judgePolicySha256: "judge-v2",
    files: ["packages/custom-widgets/scripts/ai-evaluation.ts", "pnpm-lock.yaml"],
  },
  assistantPrompt: {
    source: "candidate-file",
    sourceFile: "prompts/generation-2.md",
    text: "candidate",
    sha256: "prompt-v2",
  },
  assistantPromptBundle: {
    sha256: "prompt-bundle-v2",
  },
  benchmark: {
    suite: "integration-coverage",
    split: "heldout",
    caseIds: ["hard-multi-widget"],
    sha256: "cases-v2",
  },
  results: [
    {
      caseId: "hard-multi-widget",
      score: 86,
      verdict: "pass",
      categories: { safety: 90 },
      calledTools: ["customWidget_createFromPreview", "customWidget_createFromPreview"],
      widgets: 2,
      efficiency: { toolCalls: 18, modelInputTokens: 2_000, modelOutputTokens: 500 },
    },
  ],
};

describe("benchmark generation reporting", () => {
  test("aggregates failed outputs as zero and reports lifecycle and efficiency", () => {
    expect(aggregateGenerationMetrics(baselineSummary.results)).toEqual({
      cases: 2,
      scoredCases: 1,
      mean: 40,
      median: 40,
      minimum: 0,
      passRate: 50,
      lifecycleCompletionRate: 50,
      categoryAverages: { safety: 90, usefulness: 70 },
      categoryCoverage: {
        safety: { gradedCases: 1, totalCases: 2, rate: 50 },
        usefulness: { gradedCases: 1, totalCases: 2, rate: 50 },
      },
      efficiency: {
        measuredCases: 2,
        totalToolCalls: 20,
        meanToolCalls: 10,
        totalModelInputTokens: 2_600,
        totalModelOutputTokens: 400,
        totalModelTokens: 3_000,
        meanModelTokens: 1_500,
        scorePerToolCall: 4,
        scorePerThousandModelTokens: 26.67,
      },
    });
  });

  test("counts create and update preview persistence as completed lifecycles", () => {
    const metrics = aggregateGenerationMetrics([
      {
        caseId: "create",
        score: 80,
        verdict: "pass",
        calledTools: ["customWidget_createFromPreview"],
        widgets: 1,
      },
      {
        caseId: "update",
        score: 80,
        verdict: "pass",
        calledTools: ["customWidget_updateFromPreview"],
        widgets: 1,
      },
      {
        caseId: "not-persisted",
        score: 80,
        verdict: "pass",
        calledTools: ["customWidget_previewCreate"],
        widgets: 1,
      },
    ]);

    expect(metrics.lifecycleCompletionRate).toBe(66.67);
  });

  test("compares generations to a fixed baseline and promotes non-regressing improvements", () => {
    const comparison = compareGenerationSummaries(
      [
        { source: "/runs/generation-0/summary.json", summary: baselineSummary },
        { source: "/runs/generation-1/summary.json", summary: candidateSummary },
      ],
      "/runs/generation-0/summary.json",
    );

    expect(comparison.baseline).toBe("baseline");
    expect(comparison.generations[1]).toMatchObject({
      name: "1",
      promptHash: "prompt-v1",
      caseHash: "cases-v1",
      deltas: {
        mean: 39.5,
        median: 39.5,
        minimum: 75,
        passRate: 50,
        lifecycleCompletionRate: 50,
        categoryAverages: { safety: -1.5, usefulness: 11 },
      },
      promotion: { promote: true, reasons: [] },
    });
    expect(comparison.generations[1]?.metrics.efficiency).toMatchObject({
      meanToolCalls: 9,
      meanModelTokens: 1_250,
      scorePerToolCall: 8.83,
      scorePerThousandModelTokens: 63.6,
    });
  });

  test("rejects changed case sets and renders hashes and decisions", () => {
    const comparison = compareGenerationSummaries(
      [
        { source: "baseline/summary.json", summary: baselineSummary },
        {
          source: "candidate/summary.json",
          summary: { ...candidateSummary, results: candidateSummary.results.slice(0, 1) },
        },
      ],
      "baseline/summary.json",
    );
    const report = renderBenchmarkReport(comparison);

    expect(comparison.generations[1]?.promotion).toEqual({
      promote: false,
      reasons: ["case set differs from baseline"],
    });
    expect(report).toContain("| Generation | Config | Mean | Median | Minimum | Pass rate | Lifecycle |");
    expect(report).toContain("**1: do not promote.** case set differs from baseline");
    expect(report).toContain("prompt prompt-v1; cases cases-v1");
    expect(report).toContain("90 (1/2 cases)");
  });

  test("requires absolute strict-pass and lifecycle completion only for dev promotion", () => {
    const createSummary = (split: "dev" | "heldout", candidate: boolean) => ({
      generation: {
        generationId: candidate ? "candidate" : "baseline",
        maxLoops: 1,
        temperature: 0.2,
        reasoning: { effort: "medium" },
        maxOutputTokens: 16_384,
      },
      providerBaseUrl: "https://openrouter.ai/api/v1",
      generatorModel: "generator",
      judgeModel: "judge",
      benchmark: { split, sha256: `fixed-${split}` },
      harness: { sha256: "harness", judgePolicySha256: "judge-policy" },
      results: [
        {
          caseId: "hard-case",
          score: candidate ? 80 : 0,
          verdict: "fail",
          calledTools: [],
          widgets: 0,
        },
      ],
    });
    const devComparison = compareGenerationSummaries(
      [
        { source: "dev-baseline/summary.json", summary: createSummary("dev", false) },
        { source: "dev-candidate/summary.json", summary: createSummary("dev", true) },
      ],
      "dev-baseline/summary.json",
    );
    const heldoutComparison = compareGenerationSummaries(
      [
        { source: "heldout-baseline/summary.json", summary: createSummary("heldout", false) },
        { source: "heldout-candidate/summary.json", summary: createSummary("heldout", true) },
      ],
      "heldout-baseline/summary.json",
    );

    expect(devComparison.generations[1]?.promotion).toEqual({
      promote: false,
      reasons: ["dev pass rate 0% is below 100%", "dev lifecycle completion 0% is below 100%"],
    });
    expect(heldoutComparison.generations[1]?.promotion).toEqual({ promote: true, reasons: [] });
  });

  test("rejects a changed benchmark hash even when case identifiers match", () => {
    const comparison = compareGenerationSummaries(
      [
        { source: "baseline/summary.json", summary: baselineSummary },
        {
          source: "candidate/summary.json",
          summary: { ...candidateSummary, hashes: { prompt: "prompt-v1", cases: "cases-v2" } },
        },
      ],
      "baseline/summary.json",
    );

    expect(comparison.generations[1]?.promotion).toEqual({
      promote: false,
      reasons: ["case hash differs from baseline"],
    });
  });

  test("reads nested runner provenance and treats multi-widget completion as a case-level proxy", () => {
    const comparison = compareGenerationSummaries(
      [{ source: "generation-2/summary.json", summary: currentRunnerSummary }],
      "generation-2/summary.json",
    );
    const generation = comparison.generations[0];

    expect(generation).toMatchObject({
      name: "generation-2",
      generatedAt: "2026-09-20T10:00:00.000Z",
      promptHash: "prompt-bundle-v2",
      caseHash: "cases-v2",
      caseIds: ["hard-multi-widget"],
      metrics: { lifecycleCompletionRate: 100 },
      configuration: {
        suite: "integration-coverage",
        split: "heldout",
        mode: "assistant-tool-loop",
        providerBaseUrl: "https://openrouter.ai/api/v1",
        generatorModel: "z-ai/glm-5.3-flash",
        judgeModel: "z-ai/glm-5.3-flash",
        maxLoops: 10,
        concurrency: 4,
        requestTimeoutMs: 450_000,
        temperature: 0.2,
        reasoning: { effort: "medium", exclude: true },
        providerPreferences: { order: ["DeepInfra"], allow_fallbacks: false, quantizations: ["fp8"] },
        maxOutputTokens: 32_768,
        judgeMaxOutputTokens: 32_768,
        spend: {
          enabled: true,
          maxUsd: 20,
          requestReservationUsd: 0.5,
          ceiling: { strategy: "openrouter-provider-max-price-v1" },
        },
        harnessFiles: ["packages/custom-widgets/scripts/ai-evaluation.ts", "pnpm-lock.yaml"],
      },
    });
    expect(renderBenchmarkReport(comparison)).toContain(
      "It does not prove one successful persistence call per requested widget",
    );
    expect(renderBenchmarkReport(comparison)).toContain("judgeMaxOutputTokens=32768");
    expect(renderBenchmarkReport(comparison)).toContain("suite=integration-coverage; split=heldout");
    expect(renderBenchmarkReport(comparison)).toContain("concurrency=4; requestTimeoutMs=450000");
    expect(renderBenchmarkReport(comparison)).toContain(
      'providerPreferences={"order":["DeepInfra"],"allow_fallbacks":false,"quantizations":["fp8"]}',
    );
    expect(renderBenchmarkReport(comparison)).toContain('spend={"enabled":true,"maxUsd":20');
    expect(renderBenchmarkReport(comparison)).toContain("harnessFiles=2");
  });

  test("rejects promotion when the evaluation configuration differs", () => {
    const candidate = {
      ...currentRunnerSummary,
      generation: {
        ...currentRunnerSummary.generation,
        generationId: "generation-3",
        maxLoops: 9,
      },
      results: [{ ...currentRunnerSummary.results[0], score: 90 }],
    };
    const comparison = compareGenerationSummaries(
      [
        { source: "generation-2/summary.json", summary: currentRunnerSummary },
        { source: "generation-3/summary.json", summary: candidate },
      ],
      "generation-2/summary.json",
    );
    const [baseline, generation] = comparison.generations;

    expect(generation?.promotion).toEqual({
      promote: false,
      reasons: ["configuration differs from baseline: maxLoops"],
    });
    expect(generation?.configurationHash).not.toBe(baseline?.configurationHash);
    expect(renderBenchmarkReport(comparison)).toContain("loops=9; temperature=0.2");
  });

  test("rejects promotion when request execution settings differ", () => {
    const candidate = {
      ...currentRunnerSummary,
      generation: {
        ...currentRunnerSummary.generation,
        generationId: "generation-3",
        concurrency: 2,
        requestTimeoutMs: 300_000,
      },
      results: [{ ...currentRunnerSummary.results[0], score: 90 }],
    };
    const comparison = compareGenerationSummaries(
      [
        { source: "generation-2/summary.json", summary: currentRunnerSummary },
        { source: "generation-3/summary.json", summary: candidate },
      ],
      "generation-2/summary.json",
    );

    expect(comparison.generations[1]?.promotion).toEqual({
      promote: false,
      reasons: ["configuration differs from baseline: concurrency, requestTimeoutMs"],
    });
  });

  test("rejects promotion when provider, spend, or evaluator dependency provenance differs", () => {
    const candidate = {
      ...currentRunnerSummary,
      generation: {
        ...currentRunnerSummary.generation,
        generationId: "generation-3",
        providerPreferences: { order: ["Together"], allow_fallbacks: false, quantizations: ["fp8"] },
      },
      spend: { ...currentRunnerSummary.spend, requestReservationUsd: 0.4 },
      harness: { ...currentRunnerSummary.harness, files: ["packages/custom-widgets/scripts/ai-evaluation.ts"] },
      results: [{ ...currentRunnerSummary.results[0], score: 90 }],
    };
    const comparison = compareGenerationSummaries(
      [
        { source: "generation-2/summary.json", summary: currentRunnerSummary },
        { source: "generation-3/summary.json", summary: candidate },
      ],
      "generation-2/summary.json",
    );

    expect(comparison.generations[1]?.promotion.reasons).toContain(
      "configuration differs from baseline: providerPreferences, spend, harnessFiles",
    );
  });

  test("reports zero category coverage when a generation has no judge categories", () => {
    const ungradedCandidate = {
      ...candidateSummary,
      results: candidateSummary.results.map((result) => ({ ...result, categories: null })),
    };
    const comparison = compareGenerationSummaries(
      [
        { source: "baseline/summary.json", summary: baselineSummary },
        { source: "candidate/summary.json", summary: ungradedCandidate },
      ],
      "baseline/summary.json",
    );

    expect(comparison.generations[1]?.metrics.categoryAverages).toEqual({});
    expect(comparison.generations[1]?.metrics.categoryCoverage).toEqual({
      safety: { gradedCases: 0, totalCases: 2, rate: 0 },
      usefulness: { gradedCases: 0, totalCases: 2, rate: 0 },
    });
    expect(renderBenchmarkReport(comparison)).toContain("n/a (0 cases)");
  });
});
