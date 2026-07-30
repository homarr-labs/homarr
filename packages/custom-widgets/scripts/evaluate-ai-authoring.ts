import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "./ai-evaluation-cases";
import { DEFAULT_GENERATOR_MODEL, DEFAULT_JUDGE_MODEL, evaluateCustomWidgetCase } from "./ai-evaluation";
import type { AiEvaluationResult } from "./ai-evaluation";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error("OPENROUTER_API_KEY is required for the live Custom Widget AI evaluation");

const requestedCase = process.argv.find((value) => value.startsWith("--case="))?.slice("--case=".length);
const configuredLoops = Number(process.env.CUSTOM_WIDGET_AI_MAX_LOOPS ?? 10);
const totalLoopBudget = Number.isInteger(configuredLoops) && configuredLoops > 0 ? Math.min(configuredLoops, 10) : 10;
const selectedCases = requestedCase
  ? CUSTOM_WIDGET_AI_EVALUATION_CASES.filter((testCase) => testCase.id === requestedCase)
  : CUSTOM_WIDGET_AI_EVALUATION_CASES;
if (selectedCases.length === 0) throw new Error(`Unknown AI evaluation case '${requestedCase}'`);
if (totalLoopBudget < selectedCases.length) {
  throw new Error(`CUSTOM_WIDGET_AI_MAX_LOOPS must be at least ${selectedCases.length} for this run`);
}

const runId = new Date().toISOString().replaceAll(/[:.]/gu, "-");
const outputRoot = path.resolve(process.cwd(), ".ai-evaluations", runId);
await mkdir(outputRoot, { recursive: true });

const results: AiEvaluationResult[] = [];
let remainingLoopBudget = totalLoopBudget;
for (const testCase of selectedCases) {
  const remainingCases = selectedCases.length - results.length;
  const maxLoops = Math.max(1, Math.floor(remainingLoopBudget / remainingCases));
  process.stdout.write(`Evaluating ${testCase.id}...\n`);
  const result = await evaluateCustomWidgetCase({
    testCase,
    apiKey,
    outputRoot,
    maxLoops,
    generatorModel: process.env.OPENROUTER_GENERATOR_MODEL ?? DEFAULT_GENERATOR_MODEL,
    judgeModel: process.env.OPENROUTER_JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL,
  });
  results.push(result);
  remainingLoopBudget -= result.attempts;
  process.stdout.write(
    result.judge
      ? `  ${result.judge.total}/100 after ${result.attempts} attempt(s)\n`
      : `  failed after ${result.attempts} attempt(s)\n`,
  );
}

const summary = {
  generatedAt: new Date().toISOString(),
  generatorModel: process.env.OPENROUTER_GENERATOR_MODEL ?? DEFAULT_GENERATOR_MODEL,
  judgeModel: process.env.OPENROUTER_JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL,
  results: results.map((result) => ({
    caseId: result.caseId,
    attempts: result.attempts,
    score: result.judge?.total ?? null,
    verdict: result.judge?.verdict ?? "fail",
    categories: result.judge?.categories ?? null,
    errors: result.errors,
    outputDirectory: path.relative(process.cwd(), result.outputDirectory),
  })),
};
await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
process.stdout.write(`Results saved to ${path.relative(process.cwd(), outputRoot)}\n`);

if (results.some((result) => result.judge?.verdict !== "pass")) process.exitCode = 1;
