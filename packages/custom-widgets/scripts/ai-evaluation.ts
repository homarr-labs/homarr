import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import { buildCustomWidgetAiPrompt } from "../src/core/ai-prompt";
import { getCustomWidgetSkillReference } from "../src/core/authoring-resources";
import { customWidgetDefinitionSchema } from "../src/core/custom-jsx-schema";
import type { HomarrCustomWidgetV2 } from "../src/core/custom-jsx-schema";
import { formatCustomWidgetImportIssues, parseCustomWidgetAiResponse } from "../src/core/import";
import type { CustomWidgetAiEvaluationCase } from "./ai-evaluation-cases";
import type { CustomWidgetAiExpectation } from "./ai-evaluation-cases";

// OpenRouter exposes the rolling "latest" route with a leading tilde. The non-tilde
// deepseek/deepseek-v4-flash-latest alias is rejected by the chat-completions API.
export const DEFAULT_GENERATOR_MODEL = "~deepseek/deepseek-v4-flash-latest";
export const DEFAULT_JUDGE_MODEL = "~deepseek/deepseek-v4-flash-latest";
export const DEFAULT_AI_PROVIDER_BASE_URL = "https://openrouter.ai/api/v1";
export const MAX_AI_EVALUATION_LOOPS = 10;
export function getAiEvaluationMaxOutputTokens(purpose: "generation" | "judge", configuredValue: string | undefined) {
  let defaultValue = 20_000;
  let minimum = 4_096;
  if (purpose === "judge") {
    defaultValue = 8_000;
    minimum = 2_000;
  }
  if (configuredValue === undefined) return defaultValue;
  const configured = Number(configuredValue);
  if (!Number.isInteger(configured) || configured <= 0) return defaultValue;
  return Math.min(defaultValue, Math.max(minimum, configured));
}
export const getAiProviderChatCompletionsUrl = (baseUrl = DEFAULT_AI_PROVIDER_BASE_URL) =>
  `${baseUrl.replace(/\/+$/u, "")}/chat/completions`;
export const resolveAiEvaluationProviderConfig = (environment: Record<string, string | undefined>) => {
  const configuredBaseUrl = environment.AI_PROVIDER_BASE_URL?.trim();
  const baseUrl = (configuredBaseUrl || DEFAULT_AI_PROVIDER_BASE_URL).replace(/\/+$/u, "");
  const homarrProvider = baseUrl.endsWith("/api/ai/v1");
  const openRouterProvider = baseUrl === DEFAULT_AI_PROVIDER_BASE_URL;
  const providerDefaultModel = homarrProvider ? "homarr/model" : DEFAULT_GENERATOR_MODEL;
  return {
    apiKey: environment.AI_PROVIDER_API_KEY ?? (openRouterProvider ? environment.OPENROUTER_API_KEY : undefined),
    baseUrl,
    generatorModel:
      environment.AI_PROVIDER_MODEL ??
      (openRouterProvider ? environment.OPENROUTER_GENERATOR_MODEL : undefined) ??
      providerDefaultModel,
    judgeModel:
      environment.AI_PROVIDER_JUDGE_MODEL ??
      (openRouterProvider ? environment.OPENROUTER_JUDGE_MODEL : undefined) ??
      (homarrProvider ? providerDefaultModel : DEFAULT_JUDGE_MODEL),
  };
};

const scoreSchema = z.number().int().min(0).max(100);
const judgeCategoriesSchema = z.strictObject({
  schemaAndBindings: scoreSchema,
  apiAndRequestDesign: scoreSchema,
  runtimeCompatibility: scoreSchema,
  goalFulfillment: scoreSchema,
  visualQuality: scoreSchema,
  responsiveAndTheme: scoreSchema,
  loadingEmptyErrorSuccess: scoreSchema,
  dailyUsefulness: scoreSchema,
  complexityDiscipline: scoreSchema,
  accessibility: scoreSchema,
  actionSafety: scoreSchema,
});
const categoryReasonSchema = z.string().min(1).max(600);
const judgeResultSchema = z.strictObject({
  total: scoreSchema,
  verdict: z.enum(["pass", "fail"]),
  dailyUseDecision: z.enum(["would-use-daily", "promising-but-not-daily", "not-practical"]),
  categories: judgeCategoriesSchema,
  categoryReasons: z.strictObject({
    schemaAndBindings: categoryReasonSchema,
    apiAndRequestDesign: categoryReasonSchema,
    runtimeCompatibility: categoryReasonSchema,
    goalFulfillment: categoryReasonSchema,
    visualQuality: categoryReasonSchema,
    responsiveAndTheme: categoryReasonSchema,
    loadingEmptyErrorSuccess: categoryReasonSchema,
    dailyUsefulness: categoryReasonSchema,
    complexityDiscipline: categoryReasonSchema,
    accessibility: categoryReasonSchema,
    actionSafety: categoryReasonSchema,
  }),
  strengths: z.array(z.string().min(1).max(400)).max(6),
  problems: z.array(z.string().min(1).max(500)).max(12),
  fatalProblems: z.array(z.string().min(1).max(500)).max(8),
  highestImpactFixes: z.array(z.string().min(1).max(500)).max(6),
});

const categoryWeights = {
  schemaAndBindings: 8,
  apiAndRequestDesign: 10,
  runtimeCompatibility: 8,
  goalFulfillment: 15,
  visualQuality: 15,
  responsiveAndTheme: 8,
  loadingEmptyErrorSuccess: 8,
  dailyUsefulness: 12,
  complexityDiscipline: 8,
  accessibility: 4,
  actionSafety: 4,
} as const satisfies Record<keyof z.infer<typeof judgeCategoriesSchema>, number>;

export type CustomWidgetJudgeResult = z.infer<typeof judgeResultSchema>;

export interface AiEvaluationResult {
  caseId: string;
  attempts: number;
  widget: HomarrCustomWidgetV2 | null;
  judge: CustomWidgetJudgeResult | null;
  outputDirectory: string;
  errors: string[];
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

export function buildEvaluationPrompt(testCase: CustomWidgetAiEvaluationCase): string {
  return buildCustomWidgetAiPrompt(
    undefined,
    getEvaluationResponseFixtureText(testCase),
    null,
    `${testCase.request}\n\nVerified API notes:\n${testCase.apiNotes}`,
    testCase.documentationUrl,
  );
}

export function getEvaluationResponseFixtureText(testCase: CustomWidgetAiEvaluationCase): string | null {
  if (testCase.previewResponses?.length) {
    return testCase.previewResponses
      .map(({ pathIncludes, response }) => `${pathIncludes}:\n${JSON.stringify(response, null, 2)}`)
      .join("\n\n");
  }
  return testCase.sampleResponse === undefined ? null : JSON.stringify(testCase.sampleResponse, null, 2);
}

const getExpectedBindingValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return JSON.stringify(value) ?? String(value);
  if ("$param" in value && typeof value.$param === "string") return `$param:${value.$param}`;
  if ("$option" in value && typeof value.$option === "string") return `$option:${value.$option}`;
  return JSON.stringify(value);
};

const bindingMatchesExpectation = (
  value: unknown,
  expected: string | readonly string[],
  options: HomarrCustomWidgetV2["options"],
): boolean => {
  if (Array.isArray(expected)) {
    return expected.some((candidate) => bindingMatchesExpectation(value, candidate, options));
  }
  const actual = getExpectedBindingValue(value);
  if (actual === expected) return true;
  if (expected === "$param:*" && actual.startsWith("$param:")) return true;
  if (expected === "$option:*" && actual.startsWith("$option:")) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  if (!("$option" in value) || typeof value.$option !== "string") return false;
  const option = options[value.$option];
  if (!option) return false;
  return getExpectedBindingValue(option.default) === expected;
};

export interface DeterministicEvaluationIssue {
  path?: Array<string | number>;
  message: string;
}

export const getExpectedWidgetCase = (
  testCase: CustomWidgetAiEvaluationCase,
  expectedWidget: NonNullable<CustomWidgetAiEvaluationCase["expectedWidgets"]>[number],
): CustomWidgetAiEvaluationCase => ({
  ...testCase,
  id: `${testCase.id}-${expectedWidget.id}`,
  request: expectedWidget.request,
  apiNotes: expectedWidget.apiNotes ?? testCase.apiNotes,
  previewResponses: testCase.previewResponses?.filter((previewResponse) =>
    expectedWidget.expectations.requests.some(
      (request) =>
        request.pathIncludes === previewResponse.pathIncludes &&
        (previewResponse.kind === undefined || request.kind === previewResponse.kind) &&
        (previewResponse.method === undefined || request.method === previewResponse.method),
    ),
  ),
  expectations: expectedWidget.expectations,
  expectedWidgets: undefined,
});

const getAuthName = (source: HomarrCustomWidgetV2["sources"][string] | undefined) =>
  typeof source?.auth === "object" ? source.auth.name : undefined;

const requestMatchesExpectation = (
  request: HomarrCustomWidgetV2["requests"][string],
  expected: CustomWidgetAiExpectation["requests"][number],
  options: HomarrCustomWidgetV2["options"],
  requests: HomarrCustomWidgetV2["requests"],
) => {
  if (
    request.kind !== expected.kind ||
    request.method !== expected.method ||
    !request.path.includes(expected.pathIncludes) ||
    (expected.trigger !== undefined && request.trigger !== expected.trigger) ||
    (expected.permission !== undefined && request.permission !== expected.permission)
  ) {
    return false;
  }
  const queryMatches = Object.entries(expected.queryIncludes ?? {}).every(([key, value]) =>
    bindingMatchesExpectation(request.query?.[key], value, options),
  );
  if (!queryMatches) return false;
  const bodyMatches = Object.entries(expected.bodyIncludes ?? {}).every(([key, value]) => {
    if (typeof request.body !== "object" || request.body === null || Array.isArray(request.body)) return false;
    const body = request.body as Record<string, unknown>;
    return bindingMatchesExpectation(body[key], value, options);
  });
  if (!bodyMatches) return false;
  const invalidates = new Set(request.invalidates ?? []);
  if (!(expected.invalidates ?? []).every((requestId) => invalidates.has(requestId))) return false;
  const invalidatedRequests = [...invalidates]
    .map((requestId) => requests[requestId])
    .filter((candidate) => candidate !== undefined);
  if (
    !(expected.invalidatesPaths ?? []).every((path) => invalidatedRequests.some((candidate) => candidate.path === path))
  ) {
    return false;
  }
  if (expected.requiresConfirmation === true && request.confirmation === undefined) return false;
  return true;
};

const getExpectedRequestConstraintSummary = (expected: CustomWidgetAiExpectation["requests"][number]) => {
  const formatBinding = (value: string | readonly string[]): string => {
    if (Array.isArray(value)) return value.map((candidate) => formatBinding(candidate)).join(" or ");
    if (value === "$param:*") return "any $param binding";
    if (value === "$option:*") return "any $option binding";
    return JSON.stringify(value);
  };
  const formatBindings = (bindings: Readonly<Record<string, string | readonly string[]>>) =>
    Object.entries(bindings)
      .map(([name, value]) => `${name}=${formatBinding(value)}`)
      .join(", ");
  const constraints: string[] = [];
  if (expected.trigger !== undefined) constraints.push(`trigger=${expected.trigger}`);
  if (expected.permission !== undefined) constraints.push(`permission=${expected.permission}`);
  if (expected.queryIncludes !== undefined) {
    constraints.push(`query bindings ${formatBindings(expected.queryIncludes)}`);
  }
  if (expected.bodyIncludes !== undefined) {
    constraints.push(`body bindings ${formatBindings(expected.bodyIncludes)}`);
  }
  if (expected.invalidatesPaths?.length) {
    constraints.push(`invalidates query request IDs for paths ${expected.invalidatesPaths.join(", ")}`);
  }
  if (expected.invalidates?.length) {
    constraints.push(`invalidates request IDs ${expected.invalidates.join(", ")}`);
  }
  if (expected.requiresConfirmation === true) constraints.push("confirmation is required");
  if (constraints.length === 0) return "";
  return ` Required: ${constraints.join("; ")}.`;
};

export function getDeterministicEvaluationIssues(
  testCase: CustomWidgetAiEvaluationCase,
  widget: HomarrCustomWidgetV2,
): DeterministicEvaluationIssue[] {
  const expectations = testCase.expectations;
  if (!expectations) return [];
  const issues: DeterministicEvaluationIssue[] = [];
  const source = widget.sources.default;
  if (!source || source.baseUrl !== expectations.sourceBaseUrl) {
    issues.push({
      path: ["sources", "default", "baseUrl"],
      message: `Use the verified source URL ${expectations.sourceBaseUrl}.`,
    });
  }
  const authType = typeof source?.auth === "string" ? source.auth : source?.auth.type;
  if (authType !== expectations.sourceAuth) {
    issues.push({
      path: ["sources", "default", "auth"],
      message: `Use the verified ${expectations.sourceAuth} authentication mode.`,
    });
  }
  if (expectations.sourceNetworkScope !== undefined && source?.networkScope !== expectations.sourceNetworkScope) {
    issues.push({
      path: ["sources", "default", "networkScope"],
      message: `Use the verified ${expectations.sourceNetworkScope} network scope.`,
    });
  }
  if (expectations.sourceAuthName !== undefined && getAuthName(source) !== expectations.sourceAuthName) {
    issues.push({
      path: ["sources", "default", "auth", "name"],
      message: `Use '${expectations.sourceAuthName}' as the verified API-key name.`,
    });
  }
  if (
    expectations.minimumTemplateCharacters !== undefined &&
    widget.template.length < expectations.minimumTemplateCharacters
  ) {
    issues.push({
      path: ["template"],
      message: `Build a substantive interface of at least ${expectations.minimumTemplateCharacters} JSX characters.`,
    });
  }
  const matchedRequestIds = new Set<string>();
  for (const expected of expectations.requests) {
    const match = Object.entries(widget.requests).find(([requestId, request]) => {
      if (matchedRequestIds.has(requestId)) return false;
      return requestMatchesExpectation(request, expected, widget.options, widget.requests);
    });
    if (!match) {
      issues.push({
        path: ["requests"],
        message: `${`Define the verified ${expected.trigger ?? ""} ${expected.kind} request ${expected.method} ${expected.pathIncludes}.`.replace(
          /\s+/gu,
          " ",
        )}${getExpectedRequestConstraintSummary(expected)}`,
      });
    } else {
      matchedRequestIds.add(match[0]);
      if (expected.requiresStatusBinding === true && !widget.template.includes(`status.${match[0]}`)) {
        issues.push({
          path: ["template"],
          message: `Read loading, error, and success state from status.${match[0]}; there is no global status.loading or status.ok.`,
        });
      }
    }
  }
  for (const requiredText of expectations.templateIncludes ?? []) {
    if (!widget.template.includes(requiredText)) {
      issues.push({
        path: ["template"],
        message: `Render or use the required '${requiredText}' capability from the verified response and request.`,
      });
    }
  }
  for (const alternatives of expectations.templateIncludesAny ?? []) {
    if (alternatives.some((text) => widget.template.includes(text))) continue;
    issues.push({
      path: ["template"],
      message: `Render or use one equivalent capability: ${alternatives.map((text) => `'${text}'`).join(", ")}.`,
    });
  }
  for (const match of widget.template.matchAll(/<Pagination\b([^>]*)>/gu)) {
    const attributes = match[1] ?? "";
    const binding = attributes.match(/\bbind\s*=\s*["']([^"']+)["']/u)?.[1];
    if (binding && widget.template.includes(`inputs.${binding}`)) continue;
    issues.push({
      path: ["template"],
      message:
        "Wire Pagination with bind and use its inputs value in a supported request/helper, or render pagination context as text instead.",
    });
  }
  return issues;
}

export interface DeterministicEvaluationMatch {
  expectedWidgetId: string;
  widgetIndex: number;
  testCase: CustomWidgetAiEvaluationCase;
  issues: DeterministicEvaluationIssue[];
}

const getWidgetIndexPermutations = (widgetCount: number, expectedCount: number) => {
  const permutations: number[][] = [];
  const visit = (selected: number[]) => {
    if (selected.length === expectedCount) {
      permutations.push(selected);
      return;
    }
    for (let widgetIndex = 0; widgetIndex < widgetCount; widgetIndex += 1) {
      if (selected.includes(widgetIndex)) continue;
      visit([...selected, widgetIndex]);
    }
  };
  visit([]);
  return permutations;
};

export function getDeterministicEvaluationMatches(
  testCase: CustomWidgetAiEvaluationCase,
  widgets: readonly HomarrCustomWidgetV2[],
): DeterministicEvaluationMatch[] {
  const expectedWidgets = testCase.expectedWidgets;
  if (!expectedWidgets?.length) {
    const widget = widgets[0];
    if (!widget) return [];
    return [
      {
        expectedWidgetId: testCase.id,
        widgetIndex: 0,
        testCase,
        issues: getDeterministicEvaluationIssues(testCase, widget),
      },
    ];
  }
  if (widgets.length < expectedWidgets.length) return [];
  let bestMatches: DeterministicEvaluationMatch[] = [];
  let bestIssueCount = Number.POSITIVE_INFINITY;
  for (const permutation of getWidgetIndexPermutations(widgets.length, expectedWidgets.length)) {
    const matches = expectedWidgets.map((expectedWidget, expectedIndex) => {
      const widgetIndex = permutation[expectedIndex] ?? -1;
      const expectedCase = getExpectedWidgetCase(testCase, expectedWidget);
      return {
        expectedWidgetId: expectedWidget.id,
        widgetIndex,
        testCase: expectedCase,
        issues: getDeterministicEvaluationIssues(expectedCase, widgets[widgetIndex] as HomarrCustomWidgetV2),
      };
    });
    const issueCount = matches.reduce((sum, match) => sum + match.issues.length, 0);
    if (issueCount >= bestIssueCount) continue;
    bestMatches = matches;
    bestIssueCount = issueCount;
  }
  return bestMatches;
}

export function getDeterministicEvaluationSuiteIssues(
  testCase: CustomWidgetAiEvaluationCase,
  widgets: readonly HomarrCustomWidgetV2[],
): DeterministicEvaluationIssue[] {
  if (!testCase.expectedWidgets?.length) {
    const widget = widgets[0];
    if (!widget) return [{ message: "Create the required widget." }];
    return getDeterministicEvaluationIssues(testCase, widget);
  }
  const issues: DeterministicEvaluationIssue[] = [];
  if (widgets.length !== testCase.expectedWidgets.length) {
    issues.push({
      message: `Create exactly ${testCase.expectedWidgets.length} independent widgets; received ${widgets.length}.`,
    });
  }
  const matches = getDeterministicEvaluationMatches(testCase, widgets);
  if (matches.length === 0) {
    issues.push({ message: "Every requested widget job needs its own complete manifest." });
    return issues;
  }
  for (const match of matches) {
    issues.push(
      ...match.issues.map((issue) => ({
        ...issue,
        message: `${match.expectedWidgetId}: ${issue.message}`,
      })),
    );
  }
  return issues;
}

export function buildRepairPrompt(
  originalPrompt: string,
  previousResponse: string,
  issues: readonly { path?: Array<string | number>; message: string }[],
): string {
  const diagnostics = issues
    .map((issue) => `${issue.path?.length ? `${issue.path.join(".")}: ` : ""}${issue.message}`)
    .join("\n");
  return `${originalPrompt}\n\nYour previous response did not validate. Correct only the generic contract/runtime problems below while preserving a polished design.\n\nDiagnostics:\n${diagnostics}\n\nPrevious response:\n${previousResponse}`;
}

const getJudgeRuntimeContext = (widget: HomarrCustomWidgetV2) => {
  const sections = [getCustomWidgetSkillReference("runtime").content];
  const hasMutation = Object.values(widget.requests).some((request) => request.kind === "action");
  const hasProtectedSource = Object.values(widget.sources).some((source) => {
    const authType = typeof source.auth === "string" ? source.auth : source.auth.type;
    return authType !== "none";
  });
  if (hasMutation || hasProtectedSource) sections.push(getCustomWidgetSkillReference("security").content);
  return sections.join("\n\n");
};

export function buildJudgePrompt(testCase: CustomWidgetAiEvaluationCase, widget: HomarrCustomWidgetV2): string {
  return `You are a hostile-but-fair product review panel evaluating a safe dashboard widget. Most competent drafts should score 55-75, not 90. Judge only evidence present in the manifest and JSX. Never reward unsupported capabilities, invented API routes, aspirational claims, or code that merely validates.

The installed Homarr skill and runtime references below are authoritative. The verified API notes and representative response fixtures are authoritative for endpoint paths, authentication requirements, and response shapes unless the validated manifest contradicts them. Do not invent external endpoint or authentication objections from outside assumptions. Judge only the scoped Request below; an endpoint mentioned in broader API notes is available, not automatically required, and an optional fixture field omitted by the scoped Request is not a missing capability. Decorative icons paired with equivalent adjacent visible status text need no separate aria-label. A Badge containing explicit visible status text is not color-only. Date.toLocaleString(value, "en-US", "UTC") is an installed safe static helper for concise absolute UTC timestamps; do not require relative time. In particular, request state is exposed as status.<requestId> with loading/ok/status/error fields while successful payloads are exposed as data.<requestId>. RefreshButton is an installed runtime helper: it refreshes load queries by default; inside a successful manual result, requestId targets and reruns that active query with unchanged parameters. A bound Pagination should declare defaultValue={1}; resetKey={inputs.query} restores that default when its dependent scalar query changes. SubFetch without trigger="manual" runs automatically and reruns when bound params change, so never demand a hidden input, debounce callback, or raw event. When the scoped Request requires manual search, do not penalize the required re-trigger after query or page changes. A manual SubFetch synchronously hides its old result and returns to its trigger when its request ID, normalized parameters, or effective definition changes; it cannot display stale results under edited inputs or fetch the new parameters before another trigger. ActionButton supplies pending UI, native success/error notification, confirmation, and declared invalidation; do not demand duplicate local action state. Safe templates forbid local declarations and helper functions, so do not penalize a repeated short literal label array used for distinct enum fields as an avoidable missing abstraction. Every component in this already-validated template exists in the installed release. Do not penalize those documented facts. The widget has already passed Homarr's real schema and JSX analyzer, which proves syntax and component compatibility but does not prove API correctness, visual quality, usefulness, or accessibility.

Task-relevant installed Homarr runtime references:
${getJudgeRuntimeContext(widget)}

Request:
${testCase.request}

Verified API notes:
${testCase.apiNotes}

Representative API response used by the preview test:
${getEvaluationResponseFixtureText(testCase) ?? "Not supplied."}

Validated widget:
${JSON.stringify(widget, null, 2)}

Scoring calibration:
- 95-100: exceptional, purpose-built quality; complete, beautiful, restrained, and something a demanding user would choose every day. Almost never award this.
- 85-94: excellent with only small, specific defects. It must fully achieve the request and feel deliberately designed.
- 70-84: good prototype or useful widget with visible compromises, generic design, missing polish, or avoidable complexity.
- 50-69: functional but incomplete, awkward, visually ordinary, overbuilt, or impractical for repeated use.
- 0-49: broken, misleading, unsafe, substantially incomplete, or incompatible.

Required review behavior:
- Compare every requested capability with concrete manifest/JSX evidence. A missing or invented core capability is fatal and caps total at 79.
- Judge whether the API design can actually reach the stated goal, including response paths, bindings, invalidation, and action safety.
- Judge visual quality, not component count: hierarchy, density, whitespace, typography, restrained color, scanability, and avoidance of repetitive nested cards.
- A purpose-specific asymmetric summary, divided hierarchy, responsive density, and restrained semantic accents can clear 75 without decorative chrome. Do not demand gradients, novelty, or a generic selected-row detail interaction.
- Judge daily usefulness: information priority, interaction cost, refresh behavior, narrow-tile usability, and whether the widget is pleasant rather than demo-like.
- A required manual search rerun is deliberate interaction, not daily-use friction. SubFetch owns failure and retry before its child renders; never demand an unreachable child error branch or a RefreshButton there.
- Judge complexity discipline: penalize duplicate requests/options, unnecessary controls, excessive JSX, cleverness, and UI chrome that does not help the goal. Complexity must earn its place.
- Recommend only interactions supported by the installed authoring contract. Do not suggest portals, modals, arbitrary event handlers, or other blocked capabilities. Prefer a responsive in-widget detail area when separation is useful.
- A visually generic but valid widget should normally score below 75 for visualQuality. A widget that is attractive but inconvenient should score below 75 for dailyUsefulness.
- Give a concrete evidence sentence for every category. List all score-capping issues under fatalProblems.
- Return an empty fatalProblems array when there are no fatal problems; never put "none" or an explanation of their absence in that array.

Homarr computes the weighted total and final verdict itself. Your total and verdict are advisory, but must be internally honest. A pass requires a weighted total of at least 85, every category at least 75, goalFulfillment at least 85, complexityDiscipline at least 80, no fatal problem, and dailyUseDecision="would-use-daily". Return only the requested structured object.`;
}

export function judgePasses(result: CustomWidgetJudgeResult): boolean {
  return (
    result.total >= 85 &&
    Object.values(result.categories).every((score) => score >= 75) &&
    result.categories.goalFulfillment >= 85 &&
    result.categories.complexityDiscipline >= 80 &&
    result.dailyUseDecision === "would-use-daily" &&
    result.fatalProblems.length === 0
  );
}

export function getJudgeResponseFormat() {
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "homarr_custom_widget_review",
      strict: true,
      schema: z.toJSONSchema(judgeResultSchema, { io: "output" }),
    },
  };
}

export async function requestCustomWidgetJudge(args: {
  testCase: CustomWidgetAiEvaluationCase;
  widget: HomarrCustomWidgetV2;
  apiKey: string;
  baseUrl?: string;
  judgeModel?: string;
}) {
  return callOpenRouter({
    apiKey: args.apiKey,
    baseUrl: args.baseUrl,
    model: args.judgeModel ?? DEFAULT_JUDGE_MODEL,
    prompt: buildJudgePrompt(args.testCase, args.widget),
    purpose: "judge",
  });
}

export async function judgeCustomWidgetCase(args: {
  testCase: CustomWidgetAiEvaluationCase;
  widget: HomarrCustomWidgetV2;
  apiKey: string;
  baseUrl?: string;
  judgeModel?: string;
}) {
  const raw = await requestCustomWidgetJudge(args);
  return { raw, result: parseJudgeResult(raw) };
}

export async function evaluateCustomWidgetCase(args: {
  testCase: CustomWidgetAiEvaluationCase;
  apiKey: string;
  baseUrl?: string;
  outputRoot: string;
  maxLoops: number;
  generatorModel?: string;
  judgeModel?: string;
}): Promise<AiEvaluationResult> {
  const caseDirectory = path.join(args.outputRoot, args.testCase.id);
  await mkdir(caseDirectory, { recursive: true });
  const originalPrompt = buildEvaluationPrompt(args.testCase);
  await writeFile(path.join(caseDirectory, "prompt.md"), originalPrompt, "utf8");

  let prompt = originalPrompt;
  const errors: string[] = [];
  let bestWidget: HomarrCustomWidgetV2 | null = null;
  let bestJudge: CustomWidgetJudgeResult | null = null;
  for (let attempt = 1; attempt <= Math.min(args.maxLoops, MAX_AI_EVALUATION_LOOPS); attempt += 1) {
    let response: string;
    try {
      response = await callOpenRouter({
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        model: args.generatorModel ?? DEFAULT_GENERATOR_MODEL,
        prompt,
        purpose: "generation",
      });
    } catch (error) {
      errors.push(
        `Attempt ${attempt}: generator request failed — ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      continue;
    }
    await writeFile(path.join(caseDirectory, `attempt-${attempt}.md`), response, "utf8");
    const parsed = parseCustomWidgetAiResponse(response);
    if (!parsed.success) {
      const message = formatCustomWidgetImportIssues(parsed.issues);
      errors.push(`Attempt ${attempt}: ${message}`);
      prompt = buildRepairPrompt(originalPrompt, response, parsed.issues);
      continue;
    }

    const canonical = customWidgetDefinitionSchema.parse(parsed.widget);
    const deterministicIssues = getDeterministicEvaluationIssues(args.testCase, canonical);
    if (deterministicIssues.length > 0) {
      errors.push(
        `Attempt ${attempt}: deterministic scenario checks failed — ${deterministicIssues.map((issue) => issue.message).join("; ")}`,
      );
      prompt = buildRepairPrompt(originalPrompt, response, deterministicIssues);
      continue;
    }
    await writeWidgetFiles(caseDirectory, canonical, `attempt-${attempt}`);
    let judge: CustomWidgetJudgeResult;
    try {
      const { raw: judgeRaw, result } = await judgeCustomWidgetCase({
        testCase: args.testCase,
        widget: canonical,
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        judgeModel: args.judgeModel,
      });
      await writeFile(path.join(caseDirectory, `judge-${attempt}.json`), judgeRaw, "utf8");
      judge = result;
    } catch (error) {
      errors.push(
        `Attempt ${attempt}: judge response invalid — ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      continue;
    }
    if (!bestJudge || judge.total > bestJudge.total) {
      bestJudge = judge;
      bestWidget = canonical;
      await writeWidgetFiles(caseDirectory, canonical, "best");
      await writeFile(path.join(caseDirectory, "best-judge.json"), JSON.stringify(judge, null, 2), "utf8");
    }
    if (judgePasses(judge)) {
      await writeFile(path.join(caseDirectory, "result.json"), JSON.stringify(judge, null, 2), "utf8");
      return {
        caseId: args.testCase.id,
        attempts: attempt,
        widget: canonical,
        judge,
        outputDirectory: caseDirectory,
        errors,
      };
    }
    errors.push(`Attempt ${attempt}: judge ${judge.total}/100 — ${judge.highestImpactFixes.join("; ")}`);
    prompt = buildRepairPrompt(
      originalPrompt,
      response,
      judge.highestImpactFixes.map((message) => ({ message })),
    );
  }

  return {
    caseId: args.testCase.id,
    attempts: Math.min(args.maxLoops, MAX_AI_EVALUATION_LOOPS),
    widget: bestWidget,
    judge: bestJudge,
    outputDirectory: caseDirectory,
    errors,
  };
}

export function parseJudgeResult(raw: string): CustomWidgetJudgeResult {
  const normalizedRaw = raw
    .trim()
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "");
  const parsed: unknown = JSON.parse(normalizedRaw);
  const result = judgeResultSchema.parse(parsed);
  const fatalProblems = result.fatalProblems.filter(
    (problem) => !/^(?:none|no fatal (?:problems?|issues?))(?:\b|\s*[:.-])/iu.test(problem.trim()),
  );
  const weightedTotal = Object.entries(categoryWeights).reduce(
    (sum, [category, weight]) => sum + result.categories[category as keyof typeof categoryWeights] * weight,
    0,
  );
  const normalized = {
    ...result,
    fatalProblems,
    total: Math.round(weightedTotal / 100),
  };
  return { ...normalized, verdict: judgePasses(normalized) ? "pass" : "fail" };
}

async function writeWidgetFiles(directory: string, widget: HomarrCustomWidgetV2, basename: string) {
  await writeFile(path.join(directory, `${basename}.widget.json`), JSON.stringify(widget, null, 2), "utf8");
}

async function callOpenRouter(args: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  prompt: string;
  purpose: "generation" | "judge";
}): Promise<string> {
  const isJudge = args.purpose === "judge";
  let configuredMaxOutputTokens = process.env.CUSTOM_WIDGET_AI_GENERATION_MAX_OUTPUT_TOKENS;
  if (isJudge) configuredMaxOutputTokens = process.env.CUSTOM_WIDGET_AI_JUDGE_MAX_OUTPUT_TOKENS;
  const response = await fetch(getAiProviderChatCompletionsUrl(args.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://homarr.dev",
      "X-Title": "Homarr Custom Widget AI Evaluation",
    },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: "user", content: args.prompt }],
      temperature: isJudge ? 0 : 0.2,
      max_tokens: getAiEvaluationMaxOutputTokens(args.purpose, configuredMaxOutputTokens),
      reasoning: isJudge ? { enabled: false, exclude: true } : { effort: "high", exclude: true },
      ...(isJudge ? { response_format: getJudgeResponseFormat() } : {}),
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const payload = (await response.json()) as OpenRouterResponse;
  if (!response.ok)
    throw new Error(`AI provider request failed (${response.status}): ${payload.error?.message ?? "Unknown error"}`);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no message content");
  return content;
}
