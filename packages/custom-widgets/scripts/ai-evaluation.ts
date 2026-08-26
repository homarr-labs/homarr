import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import { buildCustomWidgetAiPrompt } from "../src/core/ai-prompt";
import { getCustomWidgetSkillContent } from "../src/core/authoring-resources";
import { customWidgetDefinitionSchema } from "../src/core/custom-jsx-schema";
import type { HomarrCustomWidgetV2 } from "../src/core/custom-jsx-schema";
import { formatCustomWidgetImportIssues, parseCustomWidgetAiResponse } from "../src/core/import";
import type { CustomWidgetAiEvaluationCase } from "./ai-evaluation-cases";

// OpenRouter exposes the rolling "latest" route with a leading tilde. The non-tilde
// deepseek/deepseek-v4-flash-latest alias is rejected by the chat-completions API.
export const DEFAULT_GENERATOR_MODEL = "~deepseek/deepseek-v4-flash-latest";
export const DEFAULT_JUDGE_MODEL = "~deepseek/deepseek-v4-flash-latest";
export const DEFAULT_AI_PROVIDER_BASE_URL = "https://openrouter.ai/api/v1";
export const MAX_AI_EVALUATION_LOOPS = 10;
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
  if (typeof value !== "object" || value === null || Array.isArray(value)) return JSON.stringify(value);
  if ("$param" in value && typeof value.$param === "string") return `$param:${value.$param}`;
  if ("$option" in value && typeof value.$option === "string") return `$option:${value.$option}`;
  return JSON.stringify(value);
};

export function getDeterministicEvaluationIssues(
  testCase: CustomWidgetAiEvaluationCase,
  widget: HomarrCustomWidgetV2,
): Array<{ path?: Array<string | number>; message: string }> {
  const expectations = testCase.expectations;
  if (!expectations) return [];
  const issues: Array<{ path?: Array<string | number>; message: string }> = [];
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
  if (
    expectations.sourceAuth === "apiKeyQuery" &&
    typeof source?.auth === "object" &&
    source.auth.name !== expectations.sourceAuthName
  ) {
    issues.push({
      path: ["sources", "default", "auth", "name"],
      message: `Use '${expectations.sourceAuthName}' as the verified API-key query parameter.`,
    });
  }
  const matchedRequestIds = new Set<string>();
  for (const expected of expectations.requests) {
    const match = Object.entries(widget.requests).find(([requestId, request]) => {
      if (matchedRequestIds.has(requestId)) return false;
      if (
        request.kind !== expected.kind ||
        request.method !== expected.method ||
        !request.path.includes(expected.pathIncludes) ||
        (expected.trigger !== undefined && request.trigger !== expected.trigger)
      ) {
        return false;
      }
      return Object.entries(expected.queryIncludes ?? {}).every(
        ([key, value]) => getExpectedBindingValue(request.query?.[key]) === value,
      );
    });
    if (!match) {
      issues.push({
        path: ["requests"],
        message:
          `Define the verified ${expected.trigger ?? ""} ${expected.kind} request ${expected.method} ${expected.pathIncludes} with its documented query bindings.`.replace(
            /\s+/gu,
            " ",
          ),
      });
    } else {
      matchedRequestIds.add(match[0]);
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

export function buildJudgePrompt(testCase: CustomWidgetAiEvaluationCase, widget: HomarrCustomWidgetV2): string {
  return `You are a hostile-but-fair product review panel evaluating a safe dashboard widget. Most competent drafts should score 55-75, not 90. Judge only evidence present in the manifest and JSX. Never reward unsupported capabilities, invented API routes, aspirational claims, or code that merely validates.

The installed Homarr skill and runtime references below are authoritative. The verified API notes and representative response fixtures are authoritative for endpoint paths, authentication requirements, and response shapes unless the validated manifest contradicts them. Do not invent external endpoint or authentication objections from outside assumptions. Decorative icons paired with equivalent adjacent visible status text need no separate aria-label. A Badge containing explicit visible status text is not color-only. A readable absolute UTC date and time is valid; do not require relative or localized time without a documented safe helper. In particular, request state is exposed as status.<requestId> with loading/ok/status/error fields while successful payloads are exposed as data.<requestId>. RefreshButton is an installed runtime helper that manually refreshes load queries. Every component in this already-validated template exists in the installed release. Do not penalize those documented facts. The widget has already passed Homarr's real schema and JSX analyzer, which proves syntax and component compatibility but does not prove API correctness, visual quality, usefulness, or accessibility.

Installed Homarr Custom Widget authoring contract:
${getCustomWidgetSkillContent()}

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
- Judge daily usefulness: information priority, interaction cost, refresh behavior, narrow-tile usability, and whether the widget is pleasant rather than demo-like.
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
    (problem) => !/^(?:none|no fatal problems?)(?:\b|\s*[:.-])/iu.test(problem.trim()),
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
      max_tokens: isJudge ? 8_000 : 20_000,
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
