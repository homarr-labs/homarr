import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "../../scripts/ai-evaluation-cases";
import { createAssistantEvaluationCaseSnapshot } from "../../scripts/ai-assistant-evaluation";
import { parseAndValidateRejudgeSourceSummary, rejudgeAssistantSummary } from "../../scripts/rejudge-ai-authoring";
import type { RejudgeJudgeRunner } from "../../scripts/rejudge-ai-authoring";
import { CUSTOM_WIDGET_STARTER, customWidgetDefinitionSchema } from "../core";
import type { CustomWidgetJudgeResult } from "../../scripts/ai-evaluation";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

const categories: CustomWidgetJudgeResult["categories"] = {
  schemaAndBindings: 90,
  apiAndRequestDesign: 90,
  runtimeCompatibility: 90,
  goalFulfillment: 90,
  visualQuality: 90,
  responsiveAndTheme: 90,
  loadingEmptyErrorSuccess: 90,
  dailyUsefulness: 90,
  complexityDiscipline: 90,
  accessibility: 90,
  actionSafety: 90,
};

const judgeResult: CustomWidgetJudgeResult = {
  total: 90,
  verdict: "pass",
  dailyUseDecision: "would-use-daily",
  categories,
  categoryReasons: Object.fromEntries(
    Object.keys(categories).map((category) => [category, `Evidence for ${category}.`]),
  ) as CustomWidgetJudgeResult["categoryReasons"],
  strengths: [],
  problems: [],
  fatalProblems: [],
  highestImpactFixes: [],
};

describe("assistant artifact rejudge", () => {
  it("recovers fixed deterministic failures, preserves current failures, and never recovers lifecycle failures", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "homarr-rejudge-"));
    temporaryDirectories.push(root);
    const sourceRoot = path.join(root, "source");
    const coinDirectory = path.join(sourceRoot, "assistant-coinmarketcap-keyless");
    const homeAssistantDirectory = path.join(sourceRoot, "assistant-home-assistant-control");
    const tautulliDirectory = path.join(sourceRoot, "assistant-tautulli-activity");
    const outputRoot = path.join(root, "rejudged");
    await Promise.all([
      mkdir(coinDirectory, { recursive: true }),
      mkdir(homeAssistantDirectory, { recursive: true }),
      mkdir(tautulliDirectory, { recursive: true }),
    ]);
    const widget = customWidgetDefinitionSchema.parse(CUSTOM_WIDGET_STARTER);
    const recoveredCoinWidget = customWidgetDefinitionSchema.parse({
      $schema: "homarr-custom-widget-v2",
      name: "Crypto",
      sources: {
        default: {
          baseUrl: "https://pro-api.coinmarketcap.com",
          networkScope: "public",
          auth: "none",
        },
      },
      requests: {
        prices: {
          path: "/public-api/v3/cryptocurrency/quotes/latest",
          trigger: "load",
          query: { id: "1,1027,5426", convert: "USD" },
        },
      },
      options: {},
      template:
        "<Stack><RefreshButton />{((data.prices ?? {}).data ?? []).map(item => <Text key={item.id}>{item.percent_change_24h} {item.market_cap} {item.volume_24h} {item.last_updated}</Text>)}</Stack>",
    });
    await writeFile(
      path.join(coinDirectory, "widget-1-coinmarketcap-keyless.json"),
      JSON.stringify(recoveredCoinWidget),
      "utf8",
    );
    await writeFile(path.join(homeAssistantDirectory, "preview-candidates-1.json"), JSON.stringify([widget]), "utf8");
    await writeFile(path.join(tautulliDirectory, "preview-candidates-1.json"), JSON.stringify([widget]), "utf8");

    const selectedCases = [
      "coinmarketcap-keyless",
      "home-assistant-control",
      "tautulli-activity",
      "policy-rule-administration",
    ].map((caseId) => {
      const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find((candidate) => candidate.id === caseId);
      if (!testCase) throw new Error(`Missing case ${caseId}`);
      return testCase;
    });
    const benchmark = { split: "dev", ...createAssistantEvaluationCaseSnapshot(selectedCases) };
    const sourceSummary = {
      generatedAt: "2026-09-21T00:00:00.000Z",
      mode: "assistant-tool-loop",
      generatorModel: "generator/model",
      judgeModel: "old/judge",
      harness: { judgePolicySha256: "old-policy" },
      benchmark,
      results: [
        {
          caseId: "coinmarketcap-keyless",
          score: null,
          verdict: "fail",
          errors: ["Attempt 1: deterministic checks failed — stale evaluator false negative"],
          widgets: 1,
          outputDirectory: coinDirectory,
        },
        {
          caseId: "home-assistant-control",
          score: null,
          verdict: "fail",
          errors: ["Attempt 1: judge failed — malformed JSON"],
          widgets: 1,
          outputDirectory: homeAssistantDirectory,
        },
        {
          caseId: "tautulli-activity",
          score: null,
          verdict: "fail",
          errors: ["Attempt 1: deterministic checks failed — response.data"],
          widgets: 1,
          outputDirectory: tautulliDirectory,
        },
        {
          caseId: "policy-rule-administration",
          score: null,
          verdict: "fail",
          errors: ["Attempt 1: lifecycle failed — no persisted widget"],
          widgets: 0,
          outputDirectory: path.join(sourceRoot, "assistant-policy-rule-administration"),
        },
      ],
    };
    const sourceRaw = JSON.stringify(sourceSummary, null, 2);
    const sourceSummaryPath = path.join(sourceRoot, "summary.json");
    await writeFile(sourceSummaryPath, sourceRaw, "utf8");
    const judgeRunner = vi.fn<RejudgeJudgeRunner>(async (args) => {
      await args.onResponse?.(1, JSON.stringify(judgeResult));
      return { result: judgeResult, requestAttempts: 1 };
    });

    const rejudged = await rejudgeAssistantSummary({
      sourceSummaryPath,
      outputRoot,
      apiKey: "test-key",
      baseUrl: "https://provider.example/v1",
      judgeModel: "new/judge",
      judgeRunner,
    });

    expect(judgeRunner).toHaveBeenCalledTimes(2);
    expect(rejudged.sourceSummary).toMatchObject({
      sha256: createHash("sha256").update(sourceRaw, "utf8").digest("hex"),
      judgeModel: "old/judge",
      judgePolicySha256: "old-policy",
    });
    expect(rejudged.judgeModel).toBe("new/judge");
    expect(rejudged.benchmark).toEqual(benchmark);
    expect(rejudged.results[0]).toMatchObject({
      caseId: "coinmarketcap-keyless",
      score: 90,
      verdict: "pass",
      sourceScore: null,
      rejudge: { status: "recovered-deterministic", judgeRequests: 1 },
    });
    expect(rejudged.results[1]).toMatchObject({
      caseId: "home-assistant-control",
      score: 90,
      rejudge: { status: "judged", judgeRequests: 1 },
    });
    expect(rejudged.results[2]).toMatchObject({
      caseId: "tautulli-activity",
      score: null,
      rejudge: {
        status: "preserved",
        reason: "deterministic-failure",
        currentDeterministicIssues: expect.arrayContaining([expect.objectContaining({ message: expect.any(String) })]),
      },
    });
    expect(rejudged.results[3]).toMatchObject({
      caseId: "policy-rule-administration",
      score: null,
      rejudge: { status: "preserved", reason: "lifecycle-failure" },
    });
    expect(
      await readFile(
        path.join(outputRoot, "assistant-coinmarketcap-keyless", "judge-coinmarketcap-keyless.request-1.json"),
        "utf8",
      ),
    ).toBe(JSON.stringify(judgeResult));
    expect(await readFile(path.join(outputRoot, "report.md"), "utf8")).toContain("old-policy");
  });

  it("rejects stale benchmark hashes and mismatched case lists", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "coinmarketcap-keyless");
    if (!testCase) throw new Error("CoinMarketCap case is missing");
    const result = { caseId: testCase.id, outputDirectory: "/tmp/not-read" };
    expect(() =>
      parseAndValidateRejudgeSourceSummary(
        {
          mode: "assistant-tool-loop",
          benchmark: { split: "dev", caseIds: [testCase.id], sha256: "stale" },
          results: [result],
        },
        "summary.json",
      ),
    ).toThrow("does not match current cases");
    expect(() =>
      parseAndValidateRejudgeSourceSummary(
        {
          mode: "assistant-tool-loop",
          benchmark: { split: "dev", ...createAssistantEvaluationCaseSnapshot([testCase]) },
          results: [{ ...result, caseId: "different" }],
        },
        "summary.json",
      ),
    ).toThrow("result case IDs do not match benchmark case IDs");
  });
});
