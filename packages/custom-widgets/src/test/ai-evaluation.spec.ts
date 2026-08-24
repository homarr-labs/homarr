import { describe, expect, it } from "vitest";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "../../scripts/ai-evaluation-cases";
import {
  buildEvaluationPrompt,
  buildJudgePrompt,
  buildRepairPrompt,
  DEFAULT_AI_PROVIDER_BASE_URL,
  DEFAULT_GENERATOR_MODEL,
  DEFAULT_JUDGE_MODEL,
  getAiProviderChatCompletionsUrl,
  getDeterministicEvaluationIssues,
  getEvaluationResponseFixtureText,
  getJudgeResponseFormat,
  judgePasses,
  parseJudgeResult,
  resolveAiEvaluationProviderConfig,
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
  it("defines distinct complex and public-API scenarios", () => {
    expect(CUSTOM_WIDGET_AI_EVALUATION_CASES).toHaveLength(9);
    expect(new Set(CUSTOM_WIDGET_AI_EVALUATION_CASES.map((entry) => entry.id)).size).toBe(9);
    expect(CUSTOM_WIDGET_AI_EVALUATION_CASES.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "pokedex",
        "fake-service-health",
        "coinmarketcap-keyless",
        "bored-activity",
        "agify-name",
      ]),
    );
  });

  it("grounds fixture-backed scenarios in verified routes and authentication", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "agify-name");
    if (!testCase) throw new Error("Agify evaluation case is missing");
    const validWidget = {
      $schema: "homarr-custom-widget-v2" as const,
      name: "Agify",
      sources: {
        default: {
          baseUrl: "https://api.agify.io",
          networkScope: "public" as const,
          auth: { type: "apiKeyQuery" as const, name: "apikey" },
        },
      },
      requests: {
        prediction: {
          source: "default",
          kind: "query" as const,
          method: "GET" as const,
          path: "/",
          trigger: "manual" as const,
          query: { name: { $param: "name" }, country_id: { $param: "country" } },
          auth: "inherit" as const,
          permission: "view" as const,
        },
      },
      options: {},
      template:
        '<Stack><TextInput bind="name" /><SubFetch requestId="prediction" params={{ name: inputs.name, country: "US" }}>{(result) => <Text>{result.age} from {result.count}</Text>}</SubFetch></Stack>',
    };
    expect(getDeterministicEvaluationIssues(testCase, validWidget)).toEqual([]);
    expect(
      getDeterministicEvaluationIssues(testCase, {
        ...validWidget,
        sources: { default: { ...validWidget.sources.default, auth: "none" as const } },
      }),
    ).toContainEqual(expect.objectContaining({ path: ["sources", "default", "auth"] }));
  });

  it("checks the public API response contract instead of only the endpoint", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "coinmarketcap-keyless");
    if (!testCase) throw new Error("CoinMarketCap evaluation case is missing");
    const widget = {
      $schema: "homarr-custom-widget-v2" as const,
      name: "Crypto",
      sources: {
        default: {
          baseUrl: "https://pro-api.coinmarketcap.com",
          networkScope: "public" as const,
          auth: "none" as const,
        },
      },
      requests: {
        prices: {
          source: "default",
          kind: "query" as const,
          method: "GET" as const,
          path: "/public-api/v3/cryptocurrency/quotes/latest",
          trigger: "load" as const,
          query: { id: "1,1027,5426", convert: "USD" },
          auth: "inherit" as const,
          permission: "view" as const,
        },
      },
      options: {},
      template:
        "<Stack><RefreshButton />{data.prices?.data?.map(item => <Text key={item.symbol}>{item.quote?.[0]?.percent_change_24h} {item.quote?.[0]?.market_cap} {item.quote?.[0]?.volume_24h} {item.last_updated}</Text>)}</Stack>",
    };

    expect(getDeterministicEvaluationIssues(testCase, widget)).toEqual([]);
    expect(
      getDeterministicEvaluationIssues(testCase, {
        ...widget,
        requests: { prices: { ...widget.requests.prices, query: { id: "1,1027", convert: "USD" } } },
      }),
    ).toContainEqual(expect.objectContaining({ path: ["requests"] }));
  });

  it("includes every path-specific Pokédex fixture in generator and judge context", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "pokedex");
    if (!testCase) throw new Error("Pokédex evaluation case is missing");
    const fixtureText = getEvaluationResponseFixtureText(testCase);

    expect(fixtureText).toContain("/api/v2/pokemon/{param:name}");
    expect(fixtureText).toContain('"official-artwork"');
    expect(fixtureText).toContain('"results"');
    expect(testCase.minimumPreviewCycles).toBe(3);
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
    expect(DEFAULT_GENERATOR_MODEL).toBe("~deepseek/deepseek-v4-flash-latest");
    expect(DEFAULT_JUDGE_MODEL).toBe("~deepseek/deepseek-v4-flash-latest");
    const format = getJudgeResponseFormat();
    expect(format.type).toBe("json_schema");
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.schema).toMatchObject({ type: "object", additionalProperties: false });
  });

  it("can run the same evaluation against the Homarr provider endpoint", () => {
    expect(getAiProviderChatCompletionsUrl("https://homarr.dev/api/ai/v1/")).toBe(
      "https://homarr.dev/api/ai/v1/chat/completions",
    );
    expect(getAiProviderChatCompletionsUrl()).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(
      resolveAiEvaluationProviderConfig({
        AI_PROVIDER_BASE_URL: "https://homarr.dev/api/ai/v1/",
        AI_PROVIDER_API_KEY: "workshop-token",
      }),
    ).toEqual({
      apiKey: "workshop-token",
      baseUrl: "https://homarr.dev/api/ai/v1",
      generatorModel: "homarr/model",
      judgeModel: "homarr/model",
    });
    expect(
      resolveAiEvaluationProviderConfig({
        AI_PROVIDER_BASE_URL: "   ",
        OPENROUTER_API_KEY: "legacy-key",
        OPENROUTER_GENERATOR_MODEL: "legacy-generator",
        OPENROUTER_JUDGE_MODEL: "legacy-judge",
      }),
    ).toEqual({
      apiKey: "legacy-key",
      baseUrl: DEFAULT_AI_PROVIDER_BASE_URL,
      generatorModel: "legacy-generator",
      judgeModel: "legacy-judge",
    });
    expect(
      resolveAiEvaluationProviderConfig({
        AI_PROVIDER_BASE_URL: "https://homarr.dev/api/ai/v1",
        AI_PROVIDER_API_KEY: "workshop-token",
        OPENROUTER_API_KEY: "must-not-leak",
        OPENROUTER_GENERATOR_MODEL: "must-not-apply",
        OPENROUTER_JUDGE_MODEL: "must-not-apply",
      }),
    ).toEqual({
      apiKey: "workshop-token",
      baseUrl: "https://homarr.dev/api/ai/v1",
      generatorModel: "homarr/model",
      judgeModel: "homarr/model",
    });
  });

  it("requires an excellent result without weak categories", () => {
    expect(
      judgePasses({
        ...makeJudgeResult(85),
        categories: {
          ...makeCategories(85),
          visualQuality: 76,
          dailyUsefulness: 76,
          complexityDiscipline: 80,
        },
      }),
    ).toBe(true);
    expect(judgePasses(makeJudgeResult(84))).toBe(false);
    expect(
      judgePasses({
        ...makeJudgeResult(90),
        categories: { ...makeCategories(90), accessibility: 74 },
      }),
    ).toBe(false);
    expect(
      judgePasses({
        ...makeJudgeResult(92),
        categories: { ...makeCategories(92), goalFulfillment: 84 },
      }),
    ).toBe(false);
    expect(
      judgePasses({
        ...makeJudgeResult(92),
        categories: { ...makeCategories(92), complexityDiscipline: 79 },
      }),
    ).toBe(false);
    expect(judgePasses({ ...makeJudgeResult(92), dailyUseDecision: "promising-but-not-daily" })).toBe(false);
    expect(judgePasses({ ...makeJudgeResult(95), fatalProblems: ["A requested core action is missing."] })).toBe(false);
  });

  it("gives the harsh judge the authoritative request-state runtime contract", () => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === "fake-service-health");
    if (!testCase) throw new Error("Fake service-health case is missing");
    const widget = {
      $schema: "homarr-custom-widget-v2" as const,
      name: "Health",
      sources: {
        default: { baseUrl: "https://status.example.test", networkScope: "public" as const, auth: "none" as const },
      },
      requests: {},
      options: {},
      template: "<Text>Health</Text>",
    };
    const prompt = buildJudgePrompt(testCase, widget);

    expect(prompt).toContain("status.<requestId> with loading/ok/status/error fields");
    expect(prompt).toContain("RefreshButton is an installed runtime helper");
    expect(prompt).toContain(JSON.stringify(testCase.sampleResponse, null, 2));
    expect(prompt).toContain("# Bundled file: references/runtime.md");
    expect(prompt).toContain("does not prove API correctness, visual quality, usefulness, or accessibility");
    expect(prompt).toContain(
      "verified API notes and representative response fixtures are authoritative for endpoint paths, authentication requirements, and response shapes",
    );
    expect(prompt).toContain("Do not invent external endpoint or authentication objections from outside assumptions");
    expect(prompt).toContain(
      "Decorative icons paired with equivalent adjacent visible status text need no separate aria-label",
    );
    expect(prompt).toContain("A Badge containing explicit visible status text is not color-only");
    expect(prompt).toContain(
      "A readable absolute UTC date and time is valid; do not require relative or localized time without a documented safe helper",
    );
    expect(prompt).toContain(
      'A pass requires a weighted total of at least 85, every category at least 75, goalFulfillment at least 85, complexityDiscipline at least 80, no fatal problem, and dailyUseDecision="would-use-daily"',
    );
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

  it("accepts a provider response that wraps structured review JSON in a code fence", () => {
    const parsed = parseJudgeResult(`\`\`\`json\n${JSON.stringify(makeJudgeResult(90))}\n\`\`\``);
    expect(parsed.total).toBe(90);
    expect(parsed.verdict).toBe("pass");
  });

  it("normalizes a prose 'none' entry out of an otherwise empty fatal-problem list", () => {
    const parsed = parseJudgeResult(
      JSON.stringify({ ...makeJudgeResult(90), fatalProblems: ["None: all requested capabilities are present."] }),
    );
    expect(parsed.fatalProblems).toEqual([]);
    expect(parsed.verdict).toBe("pass");
  });
});
