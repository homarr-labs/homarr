import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "./ai-evaluation-cases";
import { evaluateCustomWidgetAssistantCase } from "./ai-assistant-evaluation";
import type { CustomWidgetAssistantEvaluationResult } from "./ai-assistant-evaluation";
import {
  evaluateCustomWidgetCase,
  getAiEvaluationBudgetUsage,
  resolveAiEvaluationProviderConfig,
} from "./ai-evaluation";
import type { AiEvaluationResult } from "./ai-evaluation";

const {
  apiKey,
  baseUrl: providerBaseUrl,
  generatorModel,
  judgeApiKey,
  judgeBaseUrl,
  judgeModel,
} = resolveAiEvaluationProviderConfig(process.env);
if (!apiKey) {
  throw new Error("AI_PROVIDER_API_KEY or OPENROUTER_API_KEY is required for the live Custom Widget AI evaluation");
}
if (!judgeApiKey) {
  throw new Error(
    "AI_JUDGE_PROVIDER_API_KEY, AI_PROVIDER_API_KEY, or OPENROUTER_API_KEY is required for the live judge panel",
  );
}
if (
  providerBaseUrl === judgeBaseUrl &&
  generatorModel === judgeModel &&
  process.env.CUSTOM_WIDGET_AI_ALLOW_SELF_JUDGE !== "true"
) {
  throw new Error(
    "The generator and judge must use different models. Set AI_JUDGE_PROVIDER_MODEL or explicitly opt in with CUSTOM_WIDGET_AI_ALLOW_SELF_JUDGE=true.",
  );
}

const getPositiveConfiguration = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};
const maxProviderCalls = getPositiveConfiguration(process.env.CUSTOM_WIDGET_AI_MAX_PROVIDER_CALLS, 100);
const maxSpendUsd = Number(process.env.CUSTOM_WIDGET_AI_MAX_SPEND_USD);
if (!Number.isFinite(maxSpendUsd) || maxSpendUsd <= 0) {
  throw new Error(
    "CUSTOM_WIDGET_AI_MAX_SPEND_USD is required. For parallel evaluator processes, allocate shares whose sum does not exceed the approved total budget.",
  );
}

const requestedCase = process.argv.find((value) => value.startsWith("--case="))?.slice("--case=".length);
const assistantMode = process.argv.includes("--assistant");
const configuredLoops = Number(process.env.CUSTOM_WIDGET_AI_MAX_LOOPS ?? 10);
const maxLoops = Number.isInteger(configuredLoops) && configuredLoops > 0 ? Math.min(configuredLoops, 10) : 10;
let selectableCases = CUSTOM_WIDGET_AI_EVALUATION_CASES.filter((testCase) => !testCase.expectedWidgets?.length);
if (assistantMode) {
  selectableCases = CUSTOM_WIDGET_AI_EVALUATION_CASES.filter(
    (testCase) =>
      (testCase.sampleResponse !== undefined || testCase.previewResponses?.length) &&
      (testCase.expectations !== undefined || testCase.expectedWidgets?.length),
  );
}
let selectedCases = selectableCases;
if (requestedCase) selectedCases = selectableCases.filter((testCase) => testCase.id === requestedCase);
if (selectedCases.length === 0) throw new Error(`Unknown AI evaluation case '${requestedCase}'`);

const runId = `${new Date().toISOString().replaceAll(/[:.]/gu, "-")}-${process.pid}`;
const outputRoot = path.resolve(process.cwd(), ".ai-evaluations", runId);
await mkdir(outputRoot, { recursive: true });

function getResultScoreFloor(result: AiEvaluationResult | CustomWidgetAssistantEvaluationResult) {
  if ("judgePanels" in result && result.judgePanels.length > 0) {
    const medians = result.judgePanels.flatMap((panel) => (panel.medianTotal === null ? [] : [panel.medianTotal]));
    if (medians.length > 0) return Math.min(...medians);
  }
  if ("judgePanel" in result && result.judgePanel?.medianTotal !== null) {
    return result.judgePanel?.medianTotal ?? null;
  }
  if ("judges" in result && result.judges.length > 0) {
    return Math.min(...result.judges.map((judge) => judge.total));
  }
  return result.judge?.total ?? null;
}

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
      judgeApiKey,
      judgeBaseUrl,
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
      judgeApiKey,
      judgeBaseUrl,
      judgeModel,
    });
  }
  results.push(result);
  if (result.judge) {
    const widgetCount = "widgets" in result ? result.widgets.length : 1;
    const scoreFloor = getResultScoreFloor(result);
    const status = result.judgeStatus === "pass" ? "passed" : result.judgeStatus;
    process.stdout.write(
      `  ${scoreFloor}/100 floor across ${widgetCount} widget(s), ${status} after ${result.attempts} attempt(s)\n`,
    );
  } else {
    process.stdout.write(`  failed after ${result.attempts} attempt(s)\n`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  mode: assistantMode ? "assistant-tool-loop" : "manifest",
  providerBaseUrl,
  generatorModel,
  judgeBaseUrl,
  judgeModel,
  budget: {
    maxProviderCalls,
    maxSpendUsd,
    ...getAiEvaluationBudgetUsage(),
  },
  results: results.map((result) => ({
    caseId: result.caseId,
    attempts: result.attempts,
    score: getResultScoreFloor(result),
    verdict: result.judgeStatus,
    categories: result.judge?.categories ?? null,
    errors: result.errors,
    calledTools: "calledTools" in result ? result.calledTools : undefined,
    widgets: "widgets" in result ? result.widgets.length : 1,
    widgetScores: "judges" in result ? result.judges.map((judge) => judge.total) : undefined,
    judgePanels:
      "judgePanels" in result
        ? result.judgePanels.map(({ status, artifactHash, passVotes, failVotes, medianTotal, scoreRange }) => ({
            status,
            artifactHash,
            passVotes,
            failVotes,
            medianTotal,
            scoreRange,
          }))
        : result.judgePanel,
    efficiency: "efficiency" in result ? result.efficiency : undefined,
    outputDirectory: path.relative(process.cwd(), result.outputDirectory),
  })),
};
await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
process.stdout.write(`Results saved to ${path.relative(process.cwd(), outputRoot)}\n`);

if (results.some((result) => result.judgeStatus !== "pass")) process.exitCode = 1;
