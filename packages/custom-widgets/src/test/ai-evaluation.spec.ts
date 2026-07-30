import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "../../scripts/ai-evaluation-cases";
import {
  buildEvaluationPrompt,
  buildRepairPrompt,
  DEFAULT_GENERATOR_MODEL,
  DEFAULT_JUDGE_MODEL,
  getJudgeResponseFormat,
  getScenarioAcceptanceIssues,
  judgePasses,
  parseJudgeResult,
} from "../../scripts/ai-evaluation";
import type { CustomWidgetJudgeResult } from "../../scripts/ai-evaluation";
import { BUNDLED_CUSTOM_WIDGETS, CUSTOM_WIDGET_STARTER, customWidgetDefinitionSchema } from "../core";
import { PORTAINER_REFERENCE_WIDGET } from "./fixtures/reference-widgets";

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
    expect(CUSTOM_WIDGET_AI_EVALUATION_CASES.map(({ id }) => id)).toEqual([
      "pokedex",
      "portainer-containers",
      "football-dashboard",
      "jellyfin-activity",
      "home-assistant-control",
    ]);
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
    expect(prompt).toContain("visual, and UX problem");
    expect(prompt).toContain("redesign weak areas");
  });

  it("requires grounded scenario capabilities before model judging", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "pokedex");
    const pokedex = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex");
    if (!testCase || !pokedex) throw new Error("Expected Pokédex evaluation fixtures");
    expect(getScenarioAcceptanceIssues(testCase, customWidgetDefinitionSchema.parse(pokedex.widget))).toEqual([]);

    const issues = getScenarioAcceptanceIssues(
      testCase,
      customWidgetDefinitionSchema.parse({ ...CUSTOM_WIDGET_STARTER, template: "<Text>Pokémon</Text>" }),
    );
    expect(issues.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Pokémon list"),
        expect.stringContaining("manual Pokémon detail"),
        expect.stringContaining("SubFetch"),
      ]),
    );
  });

  it("requires the exact option bindings and invalidation target for scenario actions", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "portainer-containers");
    if (!testCase) throw new Error("Expected the Portainer evaluation case");
    const portainer = customWidgetDefinitionSchema.parse(PORTAINER_REFERENCE_WIDGET);
    expect(getScenarioAcceptanceIssues(testCase, portainer)).toEqual([]);
    expect(
      getScenarioAcceptanceIssues(
        {
          ...testCase,
          acceptance: {
            ...testCase.acceptance,
            requestRules: testCase.acceptance.requestRules.toReversed(),
          },
        },
        portainer,
      ),
    ).toEqual([]);

    const wrongBinding = customWidgetDefinitionSchema.parse({
      ...portainer,
      requests: {
        ...portainer.requests,
        start: {
          ...portainer.requests.start,
          path: portainer.requests.start?.path.replace("{option:endpointId}", "{option:showAll}"),
        },
      },
    });
    expect(getScenarioAcceptanceIssues(testCase, wrongBinding).map(({ message }) => message)).toContain(
      "Missing grounded start action request (/start).",
    );

    const wrongInvalidation = customWidgetDefinitionSchema.parse({
      ...portainer,
      requests: {
        ...portainer.requests,
        health: { path: "/api/status" },
        start: { ...portainer.requests.start, invalidates: ["health"] },
      },
    });
    expect(getScenarioAcceptanceIssues(testCase, wrongInvalidation).map(({ message }) => message)).toContain(
      "Missing grounded start action request (/start).",
    );
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
