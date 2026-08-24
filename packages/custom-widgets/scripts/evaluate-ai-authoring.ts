import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "./ai-evaluation-cases";
import { evaluateCustomWidgetAssistantCase } from "./ai-assistant-evaluation";
import type { CustomWidgetAssistantEvaluationResult } from "./ai-assistant-evaluation";
import { evaluateCustomWidgetCase, resolveAiEvaluationProviderConfig } from "./ai-evaluation";
import type { AiEvaluationResult } from "./ai-evaluation";

const { apiKey, baseUrl: providerBaseUrl, generatorModel, judgeModel } = resolveAiEvaluationProviderConfig(process.env);
if (!apiKey) {
  throw new Error("AI_PROVIDER_API_KEY or OPENROUTER_API_KEY is required for the live Custom Widget AI evaluation");
}

const requestedCase = process.argv.find((value) => value.startsWith("--case="))?.slice("--case=".length);
const assistantMode = process.argv.includes("--assistant");
const configuredLoops = Number(process.env.CUSTOM_WIDGET_AI_MAX_LOOPS ?? 10);
const maxLoops = Number.isInteger(configuredLoops) && configuredLoops > 0 ? Math.min(configuredLoops, 10) : 10;
let selectableCases = CUSTOM_WIDGET_AI_EVALUATION_CASES;
if (assistantMode) {
  selectableCases = CUSTOM_WIDGET_AI_EVALUATION_CASES.filter(
    (testCase) =>
      (testCase.sampleResponse !== undefined || testCase.previewResponses?.length) &&
      testCase.expectations !== undefined,
  );
}
let selectedCases = selectableCases;
if (requestedCase)
  selectedCases = CUSTOM_WIDGET_AI_EVALUATION_CASES.filter((testCase) => testCase.id === requestedCase);
if (selectedCases.length === 0) throw new Error(`Unknown AI evaluation case '${requestedCase}'`);

const runId = new Date().toISOString().replaceAll(/[:.]/gu, "-");
const outputRoot = path.resolve(process.cwd(), ".ai-evaluations", runId);
await mkdir(outputRoot, { recursive: true });

const results: Array<AiEvaluationResult | CustomWidgetAssistantEvaluationResult> = [];
for (const testCase of selectedCases) {
  process.stdout.write(`Evaluating ${testCase.id}...\n`);
  let result: AiEvaluationResult | CustomWidgetAssistantEvaluationResult;
  if (assistantMode) {
    result = await evaluateCustomWidgetAssistantCase({
      testCase,
      apiKey,
      baseUrl: providerBaseUrl,
      outputRoot,
      maxLoops,
      generatorModel,
      judgeModel,
    });
  } else {
    result = await evaluateCustomWidgetCase({
      testCase,
      apiKey,
      baseUrl: providerBaseUrl,
      outputRoot,
      maxLoops,
      generatorModel,
      judgeModel,
    });
  }
  results.push(result);
  if (result.judge) {
    process.stdout.write(`  ${result.judge.total}/100 after ${result.attempts} attempt(s)\n`);
  } else {
    process.stdout.write(`  failed after ${result.attempts} attempt(s)\n`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  mode: assistantMode ? "assistant-tool-loop" : "manifest",
  providerBaseUrl,
  generatorModel,
  judgeModel,
  results: results.map((result) => ({
    caseId: result.caseId,
    attempts: result.attempts,
    score: result.judge?.total ?? null,
    verdict: result.judge?.verdict ?? "fail",
    categories: result.judge?.categories ?? null,
    errors: result.errors,
    calledTools: "calledTools" in result ? result.calledTools : undefined,
    outputDirectory: path.relative(process.cwd(), result.outputDirectory),
  })),
};
await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
process.stdout.write(`Results saved to ${path.relative(process.cwd(), outputRoot)}\n`);

if (results.some((result) => result.judge?.verdict !== "pass")) process.exitCode = 1;
