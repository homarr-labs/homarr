import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import { buildCustomWidgetAiPrompt } from "../src/core/ai-prompt";
import { customWidgetDefinitionSchema } from "../src/core/custom-jsx-schema";
import type { HomarrCustomWidgetV2 } from "../src/core/custom-jsx-schema";
import { formatCustomWidgetImportIssues, parseCustomWidgetAiResponse } from "../src/core/import";
import type { CustomWidgetAiEvaluationCase } from "./ai-evaluation-cases";

export const DEFAULT_GENERATOR_MODEL = "deepseek/deepseek-v4-pro";
export const DEFAULT_JUDGE_MODEL = "deepseek/deepseek-v4-flash";
export const MAX_AI_EVALUATION_LOOPS = 10;

const scoreSchema = z.number().int().min(0).max(100);
const judgeResultSchema = z.strictObject({
  total: scoreSchema,
  verdict: z.enum(["pass", "fail"]),
  categories: z.strictObject({
    schemaAndBindings: scoreSchema,
    apiAndRequestDesign: scoreSchema,
    runtimeCompatibility: scoreSchema,
    visualHierarchy: scoreSchema,
    responsiveAndTheme: scoreSchema,
    loadingEmptyErrorSuccess: scoreSchema,
    accessibility: scoreSchema,
    actionSafety: scoreSchema,
    simplicity: scoreSchema,
  }),
  strengths: z.array(z.string()).max(8),
  problems: z.array(z.string()).max(12),
  highestImpactFixes: z.array(z.string()).max(8),
});

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
  return `${originalPrompt}\n\nYour previous response did not validate. Correct only the generic contract/runtime problems below while preserving a polished design.\n\nDiagnostics:\n${diagnostics}\n\nPrevious response:\n${previousResponse}`;
}

export function buildJudgePrompt(testCase: CustomWidgetAiEvaluationCase, widget: HomarrCustomWidgetV2): string {
  return `You are a strict evaluator for a safe dashboard-widget language. Judge the widget against the request and API notes. Do not reward unsupported capabilities, invented API routes, or visual claims not present in the JSX.

Request:
${testCase.request}

Verified API notes:
${testCase.apiNotes}

Validated widget:
${JSON.stringify(widget, null, 2)}

Score every category from 0 to 100. The total must reflect the whole result. A pass requires total >= 80 and no category below 65. Return JSON only with this exact shape:
{"total":0,"verdict":"fail","categories":{"schemaAndBindings":0,"apiAndRequestDesign":0,"runtimeCompatibility":0,"visualHierarchy":0,"responsiveAndTheme":0,"loadingEmptyErrorSuccess":0,"accessibility":0,"actionSafety":0,"simplicity":0},"strengths":[],"problems":[],"highestImpactFixes":[]}`;
}

export function judgePasses(result: CustomWidgetJudgeResult): boolean {
  return result.total >= 80 && Object.values(result.categories).every((score) => score >= 65);
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
        json: false,
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
    let judge: CustomWidgetJudgeResult;
    try {
      const judgeRaw = await callOpenRouter({
        apiKey: args.apiKey,
        model: args.judgeModel ?? DEFAULT_JUDGE_MODEL,
        prompt: buildJudgePrompt(args.testCase, canonical),
        json: true,
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
  const fenced = /```(?:json)?\s*([\s\S]*?)```/iu.exec(raw)?.[1];
  const parsed: unknown = JSON.parse(fenced ?? raw);
  const result = judgeResultSchema.parse(parsed);
  const normalized = {
    ...result,
    total: Math.round(Object.values(result.categories).reduce((sum, score) => sum + score, 0) / 9),
  };
  return { ...normalized, verdict: judgePasses(normalized) ? "pass" : "fail" };
}

async function writeWidgetFiles(directory: string, widget: HomarrCustomWidgetV2, basename: string) {
  const { template, ...manifest } = widget;
  await Promise.all([
    writeFile(
      path.join(directory, `${basename}.widget.json`),
      JSON.stringify({ ...manifest, template: "__HOMARR_TEMPLATE__" }, null, 2),
      "utf8",
    ),
    writeFile(path.join(directory, `${basename}.widget.jsx`), template, "utf8"),
  ]);
}

async function callOpenRouter(args: { apiKey: string; model: string; prompt: string; json: boolean }): Promise<string> {
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
      temperature: args.json ? 0 : 0.25,
      max_tokens: args.json ? 8_000 : 20_000,
      ...(args.json ? { reasoning: { effort: "low", exclude: true } } : {}),
      ...(args.json ? { response_format: { type: "json_object" } } : {}),
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
