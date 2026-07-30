import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "../../scripts/ai-evaluation-cases";
import {
  buildEvaluationPrompt,
  buildRepairPrompt,
  DEFAULT_GENERATOR_MODEL,
  DEFAULT_JUDGE_MODEL,
  getJudgeResponseFormat,
  judgePasses,
  parseJudgeResult,
} from "../../scripts/ai-evaluation";
import type { CustomWidgetJudgeResult } from "../../scripts/ai-evaluation";

const categoryNames = [
  "schemaAndBindings",
  "apiAndRequestDesign",
  "runtimeCompatibility",
  "goalFulfillment",
  "visualQuality",
  "responsiveAndTheme",
  "loadingEmptyErrorSuccess",
  "dailyUsefulness",
  "complexityDiscipline",
  "accessibility",
  "actionSafety",
] as const;

const makeCategories = (score: number) =>
  Object.fromEntries(categoryNames.map((name) => [name, score])) as CustomWidgetJudgeResult["categories"];
const makeReasons = () =>
  Object.fromEntries(
    categoryNames.map((name) => [name, `Concrete evidence for ${name}.`]),
  ) as CustomWidgetJudgeResult["categoryReasons"];

const makeJudgeResult = (score: number) => ({
  total: score,
  verdict: "pass" as const,
  dailyUseDecision: "would-use-daily" as const,
  categories: makeCategories(score),
  categoryReasons: makeReasons(),
  strengths: [],
  problems: [],
  fatalProblems: [],
  highestImpactFixes: [],
});

describe("AI authoring evaluation", () => {
  it("defines five distinct complex scenarios", () => {
    expect(CUSTOM_WIDGET_AI_EVALUATION_CASES).toHaveLength(5);
    expect(new Set(CUSTOM_WIDGET_AI_EVALUATION_CASES.map((entry) => entry.id)).size).toBe(5);
  });

  it("uses the exact clipboard prompt and grounded API notes", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.at(0);
    if (!testCase) throw new Error("Expected at least one AI evaluation case");
    const prompt = buildEvaluationPrompt(testCase);
    expect(prompt.length).toBeLessThanOrEqual(12_000);
    expect(prompt).toContain("Verified API notes");
    expect(prompt).not.toContain("customWidget_validate");
    expect(prompt).not.toContain("homarr://");
  });

  it("keeps validation failures concrete during repair", () => {
    const prompt = buildRepairPrompt("original", "bad response", [
      { path: ["requests", "list", "path"], message: "Required" },
    ]);
    expect(prompt).toContain("requests.list.path: Required");
    expect(prompt).toContain("bad response");
  });

  it("uses the requested DeepSeek models and strict structured judge output", () => {
    expect(DEFAULT_GENERATOR_MODEL).toBe("deepseek/deepseek-v4-pro");
    expect(DEFAULT_JUDGE_MODEL).toBe("deepseek/deepseek-v4-flash");
    const format = getJudgeResponseFormat();
    expect(format.type).toBe("json_schema");
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.schema).toMatchObject({ type: "object", additionalProperties: false });
  });

  it("requires exceptional goal, design, practicality, and complexity scores", () => {
    expect(judgePasses(makeJudgeResult(90))).toBe(true);
    expect(
      judgePasses({
        ...makeJudgeResult(92),
        categories: { ...makeCategories(92), dailyUsefulness: 84 },
      }),
    ).toBe(false);
    expect(judgePasses({ ...makeJudgeResult(95), fatalProblems: ["A requested core action is missing."] })).toBe(false);
  });

  it("computes the weighted score and refuses inflated advisory verdicts", () => {
    const parsed = parseJudgeResult(
      JSON.stringify({
        ...makeJudgeResult(95),
        total: 99,
        categories: { ...makeCategories(95), visualQuality: 70 },
        categoryReasons: makeReasons(),
        strengths: [],
        problems: [],
        fatalProblems: [],
        highestImpactFixes: [],
      }),
    );
    expect(parsed.total).toBe(91);
    expect(parsed.verdict).toBe("fail");
  });
});
