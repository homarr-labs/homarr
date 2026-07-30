import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import { buildCustomWidgetAiPrompt } from "../src/core/ai-prompt";
import { customWidgetDefinitionSchema } from "../src/core/custom-jsx-schema";
import type { HomarrCustomWidgetV2 } from "../src/core/custom-jsx-schema";
import { formatCustomWidgetImportIssues, parseCustomWidgetAiResponse } from "../src/core/import";
import { collectCustomWidgetRequestReferences } from "../src/core/request-schema";
import type { CustomWidgetAiEvaluationCase } from "./ai-evaluation-cases";

export const DEFAULT_GENERATOR_MODEL = "deepseek/deepseek-v4-pro";
export const DEFAULT_JUDGE_MODEL = "deepseek/deepseek-v4-flash";
export const MAX_AI_EVALUATION_LOOPS = 10;

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
    null,
    null,
    `${testCase.request}\n\nVerified API notes:\n${testCase.apiNotes}`,
    testCase.documentationUrl,
  );
}

export function buildRepairPrompt(
  originalPrompt: string,
  previousResponse: string,
  issues: readonly { path?: Array<string | number>; message: string }[],
): string {
  const diagnostics = issues
    .map((issue) => `${issue.path?.length ? `${issue.path.join(".")}: ` : ""}${issue.message}`)
    .join("\n");
  return `${originalPrompt}\n\nYour previous response did not meet the release quality bar. Correct every diagnosed contract, runtime, goal-fulfillment, visual, and UX problem below. Preserve grounded API behavior and the strongest working parts, but redesign weak areas when the feedback requires it.\n\nDiagnostics:\n${diagnostics}\n\nPrevious response:\n${previousResponse}`;
}

export function buildJudgePrompt(testCase: CustomWidgetAiEvaluationCase, widget: HomarrCustomWidgetV2): string {
  return `You are a hostile-but-fair product review panel evaluating a safe dashboard widget. Most competent drafts should score 55-75, not 90. Judge only evidence present in the manifest and JSX. Never reward unsupported capabilities, invented API routes, aspirational claims, or code that merely validates.

Request:
${testCase.request}

Verified API notes:
${testCase.apiNotes}

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
- A visually generic but valid widget should normally score below 75 for visualQuality. A widget that is attractive but inconvenient should score below 75 for dailyUsefulness.
- Give a concrete evidence sentence for every category. List all score-capping issues under fatalProblems.

Homarr computes the weighted total and final verdict itself. Your total and verdict are advisory, but must be internally honest. A pass requires a weighted total of at least 90, every category at least 75, goalFulfillment/visualQuality/dailyUsefulness at least 85, complexityDiscipline at least 80, no fatal problem, and dailyUseDecision="would-use-daily". Return only the requested structured object.`;
}

export function judgePasses(result: CustomWidgetJudgeResult): boolean {
  return (
    result.total >= 90 &&
    Object.values(result.categories).every((score) => score >= 75) &&
    result.categories.goalFulfillment >= 85 &&
    result.categories.visualQuality >= 85 &&
    result.categories.dailyUsefulness >= 85 &&
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

function matchesScenarioRequestRule(
  request: HomarrCustomWidgetV2["requests"][string],
  rule: CustomWidgetAiEvaluationCase["acceptance"]["requestRules"][number],
) {
  if (!request.path.includes(rule.pathIncludes)) return false;
  if (rule.kind && request.kind !== rule.kind) return false;
  if (rule.method && request.method !== rule.method) return false;
  if (rule.trigger && request.trigger !== rule.trigger) return false;
  const references = collectCustomWidgetRequestReferences(request);
  if (rule.optionReference && !references.options.has(rule.optionReference)) return false;
  if (rule.parameterReference && !references.params.has(rule.parameterReference)) return false;
  return true;
}

export function getScenarioAcceptanceIssues(
  testCase: CustomWidgetAiEvaluationCase,
  widget: HomarrCustomWidgetV2,
): Array<{ path?: Array<string | number>; message: string }> {
  const issues: Array<{ path?: Array<string | number>; message: string }> = [];
  const expectedAuth = testCase.acceptance.sourceAuth;
  if (expectedAuth) {
    const matches = Object.values(widget.sources).some((source) => {
      const actualType = typeof source.auth === "string" ? source.auth : source.auth.type;
      if (actualType !== expectedAuth.type) return false;
      return (
        expectedAuth.name === undefined ||
        (typeof source.auth !== "string" && source.auth.name.toLowerCase() === expectedAuth.name.toLowerCase())
      );
    });
    if (!matches) {
      issues.push({
        path: ["sources"],
        message: `The scenario requires ${expectedAuth.type}${expectedAuth.name ? ` '${expectedAuth.name}'` : ""} authentication.`,
      });
    }
  }

  const requestEntries = Object.entries(widget.requests);
  const candidateMatches = new Map<string, [string, HomarrCustomWidgetV2["requests"][string]]>();
  const candidateRequestIds = new Set<string>();
  for (const rule of testCase.acceptance.requestRules) {
    const match = requestEntries.find(
      ([requestId, request]) => !candidateRequestIds.has(requestId) && matchesScenarioRequestRule(request, rule),
    );
    if (match) {
      candidateMatches.set(rule.label, match);
      candidateRequestIds.add(match[0]);
    }
  }

  const requestIdsByLabel = new Map([...candidateMatches].map(([label, [requestId]]) => [label, requestId] as const));
  for (const rule of testCase.acceptance.requestRules) {
    const match = candidateMatches.get(rule.label);
    const invalidatedRequestId = rule.invalidatesRequest ? requestIdsByLabel.get(rule.invalidatesRequest) : undefined;
    if (
      !match ||
      (rule.invalidatesRequest && (!invalidatedRequestId || !match[1].invalidates?.includes(invalidatedRequestId)))
    ) {
      issues.push({
        path: ["requests"],
        message: `Missing grounded ${rule.label} request (${rule.pathIncludes}).`,
      });
    }
  }

  for (const component of testCase.acceptance.templateComponents) {
    if (!widget.template.includes(`<${component}`)) {
      issues.push({ path: ["template"], message: `The ${testCase.id} scenario requires ${component}.` });
    }
  }
  return issues;
}

export async function evaluateCustomWidgetCase(args: {
  testCase: CustomWidgetAiEvaluationCase;
  apiKey: string;
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
    await writeWidgetFiles(caseDirectory, canonical, `attempt-${attempt}`);
    const acceptanceIssues = getScenarioAcceptanceIssues(args.testCase, canonical);
    if (acceptanceIssues.length > 0) {
      errors.push(
        `Attempt ${attempt}: deterministic acceptance failed — ${acceptanceIssues.map(({ message }) => message).join("; ")}`,
      );
      prompt = buildRepairPrompt(originalPrompt, response, acceptanceIssues);
      continue;
    }
    let judge: CustomWidgetJudgeResult;
    try {
      const judgeRaw = await callOpenRouter({
        apiKey: args.apiKey,
        model: args.judgeModel ?? DEFAULT_JUDGE_MODEL,
        prompt: buildJudgePrompt(args.testCase, canonical),
        purpose: "judge",
      });
      await writeFile(path.join(caseDirectory, `judge-${attempt}.json`), judgeRaw, "utf8");
      judge = parseJudgeResult(judgeRaw);
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
  const parsed: unknown = JSON.parse(raw);
  const result = judgeResultSchema.parse(parsed);
  const weightedTotal = Object.entries(categoryWeights).reduce(
    (sum, [category, weight]) => sum + result.categories[category as keyof typeof categoryWeights] * weight,
    0,
  );
  const normalized = {
    ...result,
    total: Math.round(weightedTotal / 100),
  };
  return { ...normalized, verdict: judgePasses(normalized) ? "pass" : "fail" };
}

async function writeWidgetFiles(directory: string, widget: HomarrCustomWidgetV2, basename: string) {
  await writeFile(path.join(directory, `${basename}.widget.json`), JSON.stringify(widget, null, 2), "utf8");
}

async function callOpenRouter(args: {
  apiKey: string;
  model: string;
  prompt: string;
  purpose: "generation" | "judge";
}): Promise<string> {
  const isJudge = args.purpose === "judge";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      reasoning: { effort: "xhigh", exclude: true },
      ...(isJudge ? { response_format: getJudgeResponseFormat() } : {}),
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const payload = (await response.json()) as OpenRouterResponse;
  if (!response.ok)
    throw new Error(`OpenRouter request failed (${response.status}): ${payload.error?.message ?? "Unknown error"}`);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned no message content");
  return content;
}
