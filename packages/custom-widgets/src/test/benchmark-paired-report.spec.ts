import { describe, expect, test } from "vitest";

import {
  comparePairedRepeatedSummaries,
  getOneSidedDiscordantPairResult,
  getStratifiedPairedBootstrapInterval,
  getWilsonInterval,
  renderPairedBenchmarkReport,
} from "../../scripts/benchmark-paired-report";

const cases = ["api-contract", "lifecycle-recovery"];
const candidatePersistenceTools = ["customWidget_createFromPreview", "customWidget_updateFromPreview"] as const;
const baselineCommit = "c6da4a4366fa852e8aae67fea7137a21bae7538b";
const baselineBundleHash = "203482d847485d6974439177805c7be27f04b7b33dc5b2bd4443317942d1f699";
const baselineStagingHash = "c7a2d3b65836e46d63fdc44a5ba5b4eb5aa8becc4b53c2cb4d35142c6d0db27e";
const baselinePolicyHash = "433c928714d06f3c09bf25b7219ca2710a34b3f4652f0e4999bc8de481978b5b";

const createSummary = (arm: "baseline" | "candidate", repetition: number, split = "dev") => ({
  mode: "assistant-tool-loop",
  providerBaseUrl: "https://openrouter.ai/api/v1",
  generatorModel: "generator/model",
  judgeModel: "independent/judge",
  generation: {
    experimentId: "paired-assistant-benchmark",
    generationId: `${arm}-${repetition}`,
    maxLoops: 1,
    concurrency: 3,
    requestTimeoutMs: 450_000,
    temperature: 0.2,
    reasoning: { effort: "max", exclude: true },
    requiredReasoningEffort: "max",
    providerPreferences: { order: ["DeepInfra"], allow_fallbacks: false },
    maxOutputTokens: 12_000,
    judgeMaxOutputTokens: 32_768,
  },
  spend: {
    enabled: true,
    maxUsd: 20,
    campaignMaxUsd: 60,
    budgetShards: 3,
    requestReservationUsd: 0.5,
    campaignLedger: { enabled: true, strategy: "shared-file-lock-v1", id: "campaign-ledger" },
    ceiling: { strategy: "openrouter-provider-max-price-v1" },
  },
  assistantPromptBundle: {
    sha256: arm === "baseline" ? baselineBundleHash : `${arm}-bundle`,
    id: arm === "baseline" ? `release-v2-${baselineCommit}` : "candidate-prompt",
    source: arm === "baseline" ? "candidate-bundle-file" : "built-in",
    sourceFile:
      arm === "baseline" ? `packages/custom-widgets/scripts/prompt-baselines/release-v2-${baselineCommit}.json` : null,
    provenance:
      arm === "baseline"
        ? {
            repository: "homarr-labs/homarr",
            ref: "release/v2",
            commit: baselineCommit,
            sourceFile: "packages/custom-widgets/src/core/ai-prompt.ts",
          }
        : null,
    stagingInstruction: { sha256: arm === "baseline" ? baselineStagingHash : `${arm}-staging` },
    assistantPolicy: { sha256: arm === "baseline" ? baselinePolicyHash : `${arm}-policy` },
  },
  harness: {
    sha256: "fixed-harness",
    judgePolicySha256: "fixed-judge-policy",
    files: ["packages/custom-widgets/scripts/ai-evaluation.ts", "pnpm-lock.yaml"],
  },
  benchmark: {
    suite: "core",
    split,
    sha256: `fixed-${split}-cases`,
    caseIds: cases,
    promotionEligible: true,
    promotionIneligibilityReasons: [] as string[],
  },
  results: cases.map((caseId, index) => ({
    caseId,
    score: arm === "candidate" ? 90 + index : 40 + repetition + index,
    verdict: arm === "candidate" ? "pass" : "fail",
    calledTools: arm === "candidate" ? [candidatePersistenceTools[index] ?? candidatePersistenceTools[0]] : [],
    widgets: arm === "candidate" ? 1 : 0,
  })),
});

const pairedInputs = Array.from({ length: 3 }, (_, index) => ({
  baselineSource: `baseline-${index + 1}.json`,
  candidateSource: `candidate-${index + 1}.json`,
  baseline: createSummary("baseline", index + 1),
  candidate: createSummary("candidate", index + 1),
}));

describe("paired repeated benchmark reporting", () => {
  test("pools paired repetitions and promotes only a complete statistically positive dev candidate", () => {
    const comparison = comparePairedRepeatedSummaries(pairedInputs);

    expect(comparison).toMatchObject({
      split: "dev",
      repetitions: 3,
      pairedObservations: 6,
      pooled: {
        baseline: {
          meanScore: 42.5,
          strictPass: { count: 0, total: 6, rate: 0 },
          lifecycle: { count: 0, total: 6, rate: 0 },
        },
        candidate: {
          meanScore: 90.5,
          strictPass: { count: 6, total: 6, rate: 100 },
          lifecycle: { count: 6, total: 6, rate: 100 },
        },
        delta: { meanScore: 48, strictPassRatePoints: 100, lifecycleRatePoints: 100 },
        discordantPass: { improvements: 6, regressions: 0, discordant: 6, oneSidedPValue: 0.015625 },
      },
      promotion: { promote: true, reasons: [] },
    });
    expect(comparison.pooled.delta.pairedBootstrap95.lower).toBeGreaterThan(0);
    expect(comparison.perCase).toEqual([
      expect.objectContaining({ caseId: "api-contract", meanScoreDelta: 48 }),
      expect.objectContaining({ caseId: "lifecycle-recovery", meanScoreDelta: 48 }),
    ]);
    expect(comparison.provenance.configuration).toMatchObject({
      suite: "core",
      mode: "assistant-tool-loop",
      concurrency: 3,
      requestTimeoutMs: 450_000,
      providerPreferences: { order: ["DeepInfra"], allow_fallbacks: false },
      spend: {
        enabled: true,
        maxUsd: 20,
        campaignMaxUsd: 60,
        budgetShards: 3,
        requestReservationUsd: 0.5,
        campaignLedger: { enabled: true, strategy: "shared-file-lock-v1", id: "campaign-ledger" },
      },
      harnessFiles: ["packages/custom-widgets/scripts/ai-evaluation.ts", "pnpm-lock.yaml"],
    });
    expect(renderPairedBenchmarkReport(comparison)).toContain(
      "Suite: core; split: dev; mode: assistant-tool-loop; required reasoning: max; concurrency: 3; request timeout: 450000 ms",
    );
    expect(renderPairedBenchmarkReport(comparison)).toContain(
      'provider preferences: {"order":["DeepInfra"],"allow_fallbacks":false}',
    );
    expect(renderPairedBenchmarkReport(comparison)).toContain("harness files: 2");
  });

  test("counts both create and update preview persistence as completed lifecycles", () => {
    const comparison = comparePairedRepeatedSummaries(pairedInputs);

    expect(comparison.pooled.candidate.lifecycle).toMatchObject({ count: 6, total: 6, rate: 100 });
  });

  test("rejects duplicate repetition identities and summary contents", () => {
    const duplicatePair = structuredClone(pairedInputs[0]);
    if (!duplicatePair) throw new Error("Missing duplicate repetition fixture");

    expect(() => comparePairedRepeatedSummaries([duplicatePair, structuredClone(duplicatePair)])).toThrow(
      "duplicate repetition summary",
    );

    const duplicateIdentity = structuredClone(pairedInputs.slice(0, 2));
    const firstPair = duplicateIdentity[0];
    const secondPair = duplicateIdentity[1];
    if (!firstPair || !secondPair) throw new Error("Missing duplicate identity fixture");
    (secondPair.baseline as ReturnType<typeof createSummary>).generation.generationId = (
      firstPair.baseline as ReturnType<typeof createSummary>
    ).generation.generationId;
    expect(() => comparePairedRepeatedSummaries(duplicateIdentity)).toThrow("duplicate repetition identity");
  });

  test("rejects an unchanged candidate prompt bundle", () => {
    const unchangedPrompt = structuredClone(pairedInputs);
    for (const pair of unchangedPrompt) {
      const baseline = pair.baseline as ReturnType<typeof createSummary>;
      const candidate = pair.candidate as ReturnType<typeof createSummary>;
      candidate.assistantPromptBundle = structuredClone(baseline.assistantPromptBundle);
    }

    expect(() => comparePairedRepeatedSummaries(unchangedPrompt)).toThrow(
      "candidate prompt bundle must differ from baseline",
    );
  });

  test("rejects missing, mutable, or swapped release/v2 arm provenance", () => {
    const missing = structuredClone(pairedInputs);
    const missingPair = missing[0];
    if (!missingPair) throw new Error("Missing baseline provenance fixture");
    (missingPair.baseline as ReturnType<typeof createSummary>).assistantPromptBundle.provenance = null;
    expect(() => comparePairedRepeatedSummaries(missing)).toThrow("immutable release/v2 provenance");

    const mutable = structuredClone(pairedInputs);
    const mutablePair = mutable[0];
    if (!mutablePair) throw new Error("Missing mutable baseline fixture");
    const mutableProvenance = (mutablePair.baseline as ReturnType<typeof createSummary>).assistantPromptBundle
      .provenance;
    if (!mutableProvenance) throw new Error("Missing mutable provenance object");
    mutableProvenance.commit = "release/v2";
    expect(() => comparePairedRepeatedSummaries(mutable)).toThrow("full commit");

    const swapped = structuredClone(pairedInputs);
    const swappedPair = swapped[0];
    if (!swappedPair) throw new Error("Missing swapped arm fixture");
    const baseline = (swappedPair.baseline as ReturnType<typeof createSummary>).assistantPromptBundle;
    const candidate = (swappedPair.candidate as ReturnType<typeof createSummary>).assistantPromptBundle;
    (swappedPair.baseline as ReturnType<typeof createSummary>).assistantPromptBundle = structuredClone(candidate);
    (swappedPair.candidate as ReturnType<typeof createSummary>).assistantPromptBundle = structuredClone(baseline);
    expect(() => comparePairedRepeatedSummaries(swapped)).toThrow("immutable release/v2 provenance");
  });

  test("rejects unknown release/v2 commits and mismatched approved baseline hashes", () => {
    const unknownCommit = "0".repeat(40);
    const unknown = structuredClone(pairedInputs);
    const unknownBaseline = (unknown[0]?.baseline as ReturnType<typeof createSummary> | undefined)
      ?.assistantPromptBundle;
    if (!unknownBaseline?.provenance) throw new Error("Missing unknown baseline fixture");
    unknownBaseline.provenance.commit = unknownCommit;
    unknownBaseline.id = `release-v2-${unknownCommit}`;
    unknownBaseline.sourceFile = `packages/custom-widgets/scripts/prompt-baselines/release-v2-${unknownCommit}.json`;
    expect(() => comparePairedRepeatedSummaries(unknown)).toThrow("approved checked-in release/v2 prompt bundle");

    for (const field of ["sha256", "stagingInstruction", "assistantPolicy"] as const) {
      const mismatched = structuredClone(pairedInputs);
      const bundle = (mismatched[0]?.baseline as ReturnType<typeof createSummary> | undefined)?.assistantPromptBundle;
      if (!bundle) throw new Error("Missing baseline hash fixture");
      if (field === "sha256") bundle.sha256 = "0".repeat(64);
      if (field === "stagingInstruction") bundle.stagingInstruction.sha256 = "0".repeat(64);
      if (field === "assistantPolicy") bundle.assistantPolicy.sha256 = "0".repeat(64);
      expect(() => comparePairedRepeatedSummaries(mismatched)).toThrow("approved checked-in release/v2 prompt bundle");
    }
  });

  test("rejects harness, model, case, and prompt drift before aggregation", () => {
    const judgeDrift = structuredClone(pairedInputs);
    const judgePair = judgeDrift[1];
    if (!judgePair) throw new Error("Missing judge-drift fixture");
    (judgePair.candidate as ReturnType<typeof createSummary>).judgeModel = "different/judge";
    expect(() => comparePairedRepeatedSummaries(judgeDrift)).toThrow(
      "evaluation configuration or benchmark provenance differs",
    );

    const promptDrift = structuredClone(pairedInputs);
    const promptPair = promptDrift[2];
    if (!promptPair) throw new Error("Missing prompt-drift fixture");
    (promptPair.candidate as ReturnType<typeof createSummary>).assistantPromptBundle.sha256 = "changed";
    expect(() => comparePairedRepeatedSummaries(promptDrift)).toThrow("candidate prompt bundle provenance differs");

    const caseDrift = structuredClone(pairedInputs);
    const casePair = caseDrift[0];
    if (!casePair) throw new Error("Missing case-drift fixture");
    (casePair.baseline as ReturnType<typeof createSummary>).results.pop();
    expect(() => comparePairedRepeatedSummaries(caseDrift)).toThrow("results must exactly match benchmark.caseIds");

    const suiteDrift = structuredClone(pairedInputs);
    const suitePair = suiteDrift[0];
    if (!suitePair) throw new Error("Missing suite-drift fixture");
    (suitePair.candidate as ReturnType<typeof createSummary>).benchmark.suite = "integrations";
    expect(() => comparePairedRepeatedSummaries(suiteDrift)).toThrow(
      "evaluation configuration or benchmark provenance differs",
    );

    const executionDrift = structuredClone(pairedInputs);
    const executionPair = executionDrift[0];
    if (!executionPair) throw new Error("Missing execution-drift fixture");
    (executionPair.candidate as ReturnType<typeof createSummary>).generation.concurrency = 1;
    expect(() => comparePairedRepeatedSummaries(executionDrift)).toThrow(
      "evaluation configuration or benchmark provenance differs",
    );

    const providerDrift = structuredClone(pairedInputs);
    const providerPair = providerDrift[0];
    if (!providerPair) throw new Error("Missing provider-drift fixture");
    (providerPair.candidate as ReturnType<typeof createSummary>).generation.providerPreferences.order = ["Together"];
    expect(() => comparePairedRepeatedSummaries(providerDrift)).toThrow(
      "evaluation configuration or benchmark provenance differs",
    );

    const campaignBudgetDrift = structuredClone(pairedInputs);
    const campaignBudgetPair = campaignBudgetDrift[0];
    if (!campaignBudgetPair) throw new Error("Missing campaign-budget fixture");
    (campaignBudgetPair.candidate as ReturnType<typeof createSummary>).spend.budgetShards = 2;
    expect(() => comparePairedRepeatedSummaries(campaignBudgetDrift)).toThrow("missing spend budget provenance");
  });

  test("rejects non-pass@1 or incomplete promotion provenance", () => {
    const maxLoopsDrift = structuredClone(pairedInputs);
    const maxLoopsPair = maxLoopsDrift[0];
    if (!maxLoopsPair) throw new Error("Missing max-loop fixture");
    (maxLoopsPair.candidate as ReturnType<typeof createSummary>).generation.maxLoops = 2;
    expect(() => comparePairedRepeatedSummaries(maxLoopsDrift)).toThrow("promotion requires maxLoops=1");

    const provenanceDrift = structuredClone(pairedInputs);
    const provenancePair = provenanceDrift[0];
    if (!provenancePair) throw new Error("Missing provenance fixture");
    (provenancePair.candidate as ReturnType<typeof createSummary>).providerBaseUrl = "";
    expect(() => comparePairedRepeatedSummaries(provenanceDrift)).toThrow("missing provider/model provenance");

    const reasoningDrift = structuredClone(pairedInputs);
    const reasoningPair = reasoningDrift[0];
    if (!reasoningPair) throw new Error("Missing reasoning fixture");
    (reasoningPair.candidate as ReturnType<typeof createSummary>).generation.reasoning = {
      effort: "high",
      exclude: true,
    };
    expect(() => comparePairedRepeatedSummaries(reasoningDrift)).toThrow("promotion requires recorded max reasoning");

    const ledgerDrift = structuredClone(pairedInputs);
    const ledgerPair = ledgerDrift[0];
    if (!ledgerPair) throw new Error("Missing campaign-ledger fixture");
    (ledgerPair.candidate as ReturnType<typeof createSummary>).spend.campaignLedger.enabled = false;
    expect(() => comparePairedRepeatedSummaries(ledgerDrift)).toThrow("missing spend budget provenance");

    const subsetRun = structuredClone(pairedInputs);
    const subsetPair = subsetRun[0];
    if (!subsetPair) throw new Error("Missing subset fixture");
    (subsetPair.candidate as ReturnType<typeof createSummary>).benchmark.promotionEligible = false;
    (subsetPair.candidate as ReturnType<typeof createSummary>).benchmark.promotionIneligibilityReasons = [
      "selected cases do not cover the complete requested split",
    ];
    expect(() => comparePairedRepeatedSummaries(subsetRun)).toThrow(
      "selected cases do not cover the complete requested split",
    );
  });

  test("rejects incomplete or inconsistent campaign spend provenance", () => {
    const variants = [
      (summary: ReturnType<typeof createSummary>) => {
        delete (summary.spend as Partial<typeof summary.spend>).campaignMaxUsd;
      },
      (summary: ReturnType<typeof createSummary>) => {
        delete (summary.spend as Partial<typeof summary.spend>).budgetShards;
      },
      (summary: ReturnType<typeof createSummary>) => {
        summary.spend.campaignMaxUsd = 61;
      },
      (summary: ReturnType<typeof createSummary>) => {
        summary.spend.ceiling = {} as typeof summary.spend.ceiling;
      },
    ];
    for (const invalidate of variants) {
      const inputs = structuredClone(pairedInputs);
      const candidate = inputs[0]?.candidate as ReturnType<typeof createSummary> | undefined;
      if (!candidate) throw new Error("Missing spend provenance fixture");
      invalidate(candidate);
      expect(() => comparePairedRepeatedSummaries(inputs)).toThrow("missing spend budget provenance");
    }
  });

  test("computes deterministic intervals and exact one-sided discordant probabilities", () => {
    expect(getWilsonInterval(6, 6)).toEqual({ lower: 0.6097, upper: 1 });
    expect(getOneSidedDiscordantPairResult([false, false, true], [true, true, false])).toEqual({
      improvements: 2,
      regressions: 1,
      discordant: 3,
      oneSidedPValue: 0.5,
    });
    const deltas = new Map([
      ["a", [10, 12, 14]],
      ["b", [4, 6, 8]],
    ]);
    expect(getStratifiedPairedBootstrapInterval(deltas, 1_000, 123)).toEqual(
      getStratifiedPairedBootstrapInterval(deltas, 1_000, 123),
    );
  });

  test("keeps heldout gates separate from dev significance thresholds", () => {
    const heldout = pairedInputs.map((pair, index) => ({
      ...pair,
      baseline: createSummary("baseline", index + 1, "heldout"),
      candidate: createSummary("candidate", index + 1, "heldout"),
    }));

    expect(comparePairedRepeatedSummaries(heldout).promotion).toEqual({ promote: true, reasons: [] });
  });
});
