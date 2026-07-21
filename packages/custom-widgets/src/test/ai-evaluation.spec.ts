import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "../../scripts/ai-evaluation-cases";
import { buildEvaluationPrompt, buildRepairPrompt, judgePasses, parseJudgeResult } from "../../scripts/ai-evaluation";

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

  it("requires a strong overall and category score", () => {
    const categories = {
      schemaAndBindings: 90,
      apiAndRequestDesign: 90,
      runtimeCompatibility: 90,
      visualHierarchy: 90,
      responsiveAndTheme: 90,
      loadingEmptyErrorSuccess: 90,
      accessibility: 90,
      actionSafety: 90,
      simplicity: 90,
    };
    expect(
      judgePasses({ total: 90, verdict: "pass", categories, strengths: [], problems: [], highestImpactFixes: [] }),
    ).toBe(true);
    expect(
      judgePasses({
        total: 90,
        verdict: "pass",
        categories: { ...categories, accessibility: 64 },
        strengths: [],
        problems: [],
        highestImpactFixes: [],
      }),
    ).toBe(false);
  });

  it("normalizes a judge verdict from numeric scores", () => {
    const parsed = parseJudgeResult(
      JSON.stringify({
        total: 84,
        verdict: "fail",
        categories: {
          schemaAndBindings: 85,
          apiAndRequestDesign: 82,
          runtimeCompatibility: 84,
          visualHierarchy: 86,
          responsiveAndTheme: 83,
          loadingEmptyErrorSuccess: 82,
          accessibility: 80,
          actionSafety: 87,
          simplicity: 85,
        },
        strengths: [],
        problems: [],
        highestImpactFixes: [],
      }),
    );
    expect(parsed.verdict).toBe("pass");
  });
});
