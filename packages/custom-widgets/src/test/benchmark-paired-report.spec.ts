import { describe, expect, test } from "vitest";

import {
  comparePairedRepeatedSummaries,
  getOneSidedDiscordantPairResult,
  getStratifiedPairedBootstrapInterval,
  getWilsonInterval,
} from "../../scripts/benchmark-paired-report";

const cases = ["api-contract", "lifecycle-recovery"];

const createSummary = (arm: "baseline" | "candidate", repetition: number, split = "dev") => ({
  providerBaseUrl: "https://openrouter.ai/api/v1",
  generatorModel: "generator/model",
  judgeModel: "independent/judge",
  generation: {
    generationId: `${arm}-${repetition}`,
    maxLoops: 1,
    temperature: 0.2,
    reasoning: { effort: "medium", exclude: true },
    maxOutputTokens: 12_000,
    judgeMaxOutputTokens: 32_768,
  },
  assistantPromptBundle: {
    sha256: `${arm}-bundle`,
    id: `${arm}-prompt`,
    provenance: { commit: arm === "baseline" ? "release-v2" : "candidate" },
    stagingInstruction: { sha256: `${arm}-staging` },
    assistantPolicy: { sha256: `${arm}-policy` },
  },
  harness: { sha256: "fixed-harness", judgePolicySha256: "fixed-judge-policy" },
  benchmark: { split, sha256: `fixed-${split}-cases`, caseIds: cases },
  results: cases.map((caseId, index) => ({
    caseId,
    score: arm === "candidate" ? 90 + index : 40 + repetition + index,
    verdict: arm === "candidate" ? "pass" : "fail",
    calledTools: arm === "candidate" ? ["customWidget_createFromPreview"] : [],
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
