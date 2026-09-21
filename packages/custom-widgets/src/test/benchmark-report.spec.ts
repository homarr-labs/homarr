import { describe, expect, test } from "vitest";

import {
  aggregateGenerationMetrics,
  compareGenerationSummaries,
  renderBenchmarkReport,
} from "../../scripts/benchmark-report";

const assistantPromotionProvenance = (generationId: string, promptHash: string) => ({
  mode: "assistant-tool-loop",
  generation: {
    experimentId: "assistant-promotion-test",
    generationId,
    maxLoops: 1,
    concurrency: 2,
    requestTimeoutMs: 300_000,
    temperature: 0.2,
    reasoning: { effort: "max", exclude: true },
    requiredReasoningEffort: "max",
    providerPreferences: null,
    maxOutputTokens: 32_768,
    judgeMaxOutputTokens: 8_000,
  },
  providerBaseUrl: "https://openrouter.ai/api/v1",
  generatorModel: "generator/model",
  judgeModel: "judge/model",
  spend: {
    enabled: true,
    maxUsd: 10,
    campaignMaxUsd: 30,
    budgetShards: 3,
    requestReservationUsd: 0.5,
    campaignLedger: { enabled: true, strategy: "shared-file-lock-v1", id: "campaign-ledger" },
    ceiling: { strategy: "openrouter-provider-max-price-v1" },
  },
  assistantPromptBundle: {
    sha256: promptHash,
    stagingInstruction: { sha256: "staging" },
    assistantPolicy: { sha256: promptHash },
  },
  harness: { sha256: "harness", judgePolicySha256: "judge-policy", files: ["harness.ts"] },
  benchmark: {
    suite: "core",
    split: "dev",
    sha256: "cases-v1",
    caseIds: ["hard-api", "hard-layout"],
    promotionEligible: true,
    promotionIneligibilityReasons: [] as string[],
  },
});

const baselineSummary = {
  ...assistantPromotionProvenance("baseline", "prompt-v0"),
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
      efficiency: { toolCalls: 8, modelInputTokens: 900, modelOutputTokens: 100, modelCostUsd: 0.1, elapsedMs: 1_000 },
    },
    {
      caseId: "hard-layout",
      score: null,
      verdict: "fail",
      categories: null,
      calledTools: ["customWidget_validateTemplate"],
      widgets: 0,
      efficiency: {
        toolCalls: 12,
        modelInputTokens: 1_700,
        modelOutputTokens: 300,
        modelCostUsd: 0.2,
        elapsedMs: 3_000,
      },
    },
  ],
};

const candidateSummary = {
  ...assistantPromotionProvenance("1", "prompt-v1"),
  generationName: "1",
  hashes: { prompt: "prompt-v1", cases: "cases-v1" },
  results: [
    {
      caseId: "hard-layout",
      score: 75,
      verdict: "pass",
      categories: { safety: 85, usefulness: 80 },
      calledTools: ["customWidget_createFromPreview"],
      widgets: 1,
      efficiency: {
        toolCalls: 10,
        modelInputTokens: 1_200,
        modelOutputTokens: 300,
        modelCostUsd: 0.12,
        elapsedMs: 1_500,
      },
    },
    {
      caseId: "hard-api",
      score: 84,
      verdict: "pass",
      categories: { safety: 92, usefulness: 82 },
      calledTools: ["customWidget_createFromPreview"],
      widgets: 1,
      efficiency: {
        toolCalls: 8,
        modelInputTokens: 900,
        modelOutputTokens: 100,
        modelCostUsd: 0.08,
        elapsedMs: 900,
      },
    },
  ],
};

const createPromotionSummary = (name: string) => ({
  generationName: name,
  mode: "assistant-tool-loop",
  generation: {
    experimentId: "assistant-experiment",
    generationId: name,
    maxLoops: 1,
    reasoning: { effort: "max", exclude: true },
    requiredReasoningEffort: "max",
  },
  providerBaseUrl: "https://openrouter.ai/api/v1",
  generatorModel: "generator/model",
  judgeModel: "judge/model",
  spend: {
    enabled: true,
    maxUsd: 20,
    campaignMaxUsd: 20,
    budgetShards: 1,
    requestReservationUsd: 0.5,
    campaignLedger: { enabled: true, strategy: "shared-file-lock-v1", id: "campaign-ledger" },
    ceiling: { strategy: "openrouter-provider-max-price-v1" },
  },
  assistantPromptBundle: {
    sha256: `${name}-prompt`,
    stagingInstruction: { sha256: `${name}-staging` },
    assistantPolicy: { sha256: `${name}-policy` },
  },
  harness: { sha256: "harness", judgePolicySha256: "judge-policy", files: ["harness.ts"] },
  benchmark: {
    suite: "core",
    split: "dev",
    sha256: "cases",
    caseIds: ["case-a"],
    promotionEligible: true,
  },
  results: [{ caseId: "case-a", score: name === "candidate" ? 90 : 80, verdict: "pass" }],
});

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
    reasoning: { effort: "max", exclude: true },
    requiredReasoningEffort: "max",
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
    campaignMaxUsd: 20,
    budgetShards: 1,
    requestReservationUsd: 0.5,
    campaignLedger: { enabled: true, strategy: "shared-file-lock-v1", id: "campaign-ledger" },
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
        measuredCostCases: 2,
        totalModelCostUsd: 0.3,
        meanModelCostUsd: 0.15,
        accountedCostCases: 2,
        totalModelAccountedCostUsd: 0.3,
        meanModelAccountedCostUsd: 0.15,
        measuredDurationCases: 2,
        totalElapsedMs: 4_000,
        meanElapsedMs: 2_000,
        scorePerToolCall: 4,
        scorePerThousandModelTokens: 26.67,
      },
    });
  });

  test("uses cumulative attempt spend and keeps unreported provider cost non-exact", () => {
    const metrics = aggregateGenerationMetrics([
      {
        caseId: "retried-case",
        score: 90,
        verdict: "pass",
        efficiency: {
          toolCalls: 8,
          modelInputTokens: 900,
          modelOutputTokens: 100,
          modelCostUsd: 0.05,
          elapsedMs: 1_000,
        },
        cumulativeEfficiency: {
          modelCostUsd: null,
          modelAccountedCostUsd: 0.5,
          modelCostExact: false,
          elapsedMs: 5_000,
        },
      },
    ]);

    expect(metrics.efficiency).toMatchObject({
      measuredCostCases: 0,
      totalModelCostUsd: 0,
      meanModelCostUsd: null,
      accountedCostCases: 1,
      totalModelAccountedCostUsd: 0.5,
      meanModelAccountedCostUsd: 0.5,
      measuredDurationCases: 1,
      totalElapsedMs: 5_000,
      meanElapsedMs: 5_000,
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

  test("compares generations to a fixed baseline without promoting from one run", () => {
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
      promotion: {
        promote: false,
        reasons: ["single-run reports are exploratory; use the paired repeated report for promotion"],
      },
    });
    expect(comparison.generations[1]?.metrics.efficiency).toMatchObject({
      meanToolCalls: 9,
      meanModelTokens: 1_250,
      meanModelCostUsd: 0.1,
      meanElapsedMs: 1_200,
      scorePerToolCall: 8.83,
      scorePerThousandModelTokens: 63.6,
    });
  });

  test("rejects incomplete or duplicate result coverage against benchmark provenance", () => {
    const subsetBaseline = {
      ...baselineSummary,
      results: baselineSummary.results.slice(0, 1),
    };
    const subsetCandidate = {
      ...candidateSummary,
      results: candidateSummary.results.slice(1),
    };

    expect(() =>
      compareGenerationSummaries(
        [
          { source: "baseline/summary.json", summary: subsetBaseline },
          { source: "candidate/summary.json", summary: subsetCandidate },
        ],
        "baseline/summary.json",
      ),
    ).toThrow("results must exactly match benchmark.caseIds");

    const duplicateCandidate = {
      ...candidateSummary,
      results: [candidateSummary.results[0], candidateSummary.results[0]],
    };
    expect(() =>
      compareGenerationSummaries(
        [
          { source: "baseline/summary.json", summary: baselineSummary },
          { source: "candidate/summary.json", summary: duplicateCandidate },
        ],
        "baseline/summary.json",
      ),
    ).toThrow("result case IDs must be unique");
  });

  test("does not promote an unchanged assistant prompt", () => {
    const unchangedCandidate = {
      ...candidateSummary,
      assistantPromptBundle: baselineSummary.assistantPromptBundle,
    };
    const comparison = compareGenerationSummaries(
      [
        { source: "baseline/summary.json", summary: baselineSummary },
        { source: "candidate/summary.json", summary: unchangedCandidate },
      ],
      "baseline/summary.json",
    );

    expect(comparison.generations[1]?.promotion).toEqual({
      promote: false,
      reasons: [
        "candidate prompt bundle matches baseline",
        "single-run reports are exploratory; use the paired repeated report for promotion",
      ],
    });
  });

  test("renders hashes and decisions", () => {
    const comparison = compareGenerationSummaries(
      [
        { source: "baseline/summary.json", summary: baselineSummary },
        { source: "candidate/summary.json", summary: candidateSummary },
      ],
      "baseline/summary.json",
    );
    const report = renderBenchmarkReport(comparison);

    expect(report).toContain("| Generation | Config | Mean | Median | Minimum | Pass rate | Lifecycle |");
    expect(report).toContain(
      "**1: do not promote.** single-run reports are exploratory; use the paired repeated report for promotion",
    );
    expect(report).toContain("prompt prompt-v1; cases cases-v1");
    expect(report).toContain("90 (1/2 cases)");
  });

  test("keeps all single-run split comparisons exploratory", () => {
    const createSummary = (split: "dev" | "heldout", candidate: boolean) => {
      const generationId = candidate ? "candidate" : "baseline";
      const provenance = assistantPromotionProvenance(generationId, `${generationId}-prompt`);
      return {
        ...provenance,
        benchmark: {
          ...provenance.benchmark,
          split,
          sha256: `fixed-${split}`,
          caseIds: ["hard-case"],
        },
        results: [
          {
            caseId: "hard-case",
            score: candidate ? 80 : 0,
            verdict: "fail",
            calledTools: [],
            widgets: 0,
          },
        ],
      };
    };
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
      reasons: [
        "dev pass rate 0% is below 100%",
        "dev lifecycle completion 0% is below 100%",
        "single-run reports are exploratory; use the paired repeated report for promotion",
      ],
    });
    expect(heldoutComparison.generations[1]?.promotion).toEqual({
      promote: false,
      reasons: ["single-run reports are exploratory; use the paired repeated report for promotion"],
    });
  });

  test("rejects a changed benchmark hash even when case identifiers match", () => {
    const comparison = compareGenerationSummaries(
      [
        { source: "baseline/summary.json", summary: baselineSummary },
        {
          source: "candidate/summary.json",
          summary: {
            ...candidateSummary,
            benchmark: { ...candidateSummary.benchmark, sha256: "cases-v2" },
          },
        },
      ],
      "baseline/summary.json",
    );

    expect(comparison.generations[1]?.promotion).toEqual({
      promote: false,
      reasons: [
        "case hash differs from baseline",
        "single-run reports are exploratory; use the paired repeated report for promotion",
      ],
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
        reasoning: { effort: "max", exclude: true },
        requiredReasoningEffort: "max",
        providerPreferences: { order: ["DeepInfra"], allow_fallbacks: false, quantizations: ["fp8"] },
        maxOutputTokens: 32_768,
        judgeMaxOutputTokens: 32_768,
        spend: {
          enabled: true,
          maxUsd: 20,
          campaignMaxUsd: 20,
          budgetShards: 1,
          requestReservationUsd: 0.5,
          campaignLedger: { enabled: true, strategy: "shared-file-lock-v1", id: "campaign-ledger" },
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
      reasons: [
        "run is not marked promotion-eligible",
        "promotion requires maxLoops=1",
        "missing assistant prompt provenance",
        "baseline is not promotion-eligible",
        "configuration differs from baseline: maxLoops",
        "single-run reports are exploratory; use the paired repeated report for promotion",
      ],
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
      reasons: [
        "run is not marked promotion-eligible",
        "promotion requires maxLoops=1",
        "missing assistant prompt provenance",
        "baseline is not promotion-eligible",
        "configuration differs from baseline: concurrency, requestTimeoutMs",
        "single-run reports are exploratory; use the paired repeated report for promotion",
      ],
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
      spend: {
        ...currentRunnerSummary.spend,
        campaignMaxUsd: 40,
        budgetShards: 2,
        requestReservationUsd: 0.4,
      },
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

  test("blocks assistant promotion when pass@1 or provenance is missing", () => {
    const baseline = createPromotionSummary("baseline");
    const candidate = { ...createPromotionSummary("candidate"), providerBaseUrl: undefined };
    const comparison = compareGenerationSummaries(
      [
        { source: "baseline/summary.json", summary: baseline },
        { source: "candidate/summary.json", summary: candidate },
      ],
      "baseline/summary.json",
    );

    expect(comparison.generations[1]?.promotion).toMatchObject({ promote: false });
    expect(comparison.generations[1]?.promotion.reasons).toContain("missing provider/model provenance");
  });

  test("blocks summaries with incomplete or inconsistent campaign spend provenance", () => {
    const variants = [
      (summary: ReturnType<typeof createPromotionSummary>) => {
        delete (summary.spend as Partial<typeof summary.spend>).campaignMaxUsd;
      },
      (summary: ReturnType<typeof createPromotionSummary>) => {
        delete (summary.spend as Partial<typeof summary.spend>).budgetShards;
      },
      (summary: ReturnType<typeof createPromotionSummary>) => {
        summary.spend.campaignMaxUsd = 21;
      },
      (summary: ReturnType<typeof createPromotionSummary>) => {
        summary.spend.ceiling = {} as typeof summary.spend.ceiling;
      },
    ];
    for (const invalidate of variants) {
      const baseline = createPromotionSummary("baseline");
      const candidate = createPromotionSummary("candidate");
      invalidate(candidate);
      const comparison = compareGenerationSummaries(
        [
          { source: "baseline/summary.json", summary: baseline },
          { source: "candidate/summary.json", summary: candidate },
        ],
        "baseline/summary.json",
      );
      expect(comparison.generations[1]?.promotion.reasons).toContain("missing spend budget provenance");
    }
  });
});
