import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CUSTOM_WIDGET_ASSISTANT_POLICY } from "../src/core/ai-prompt";
import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "./ai-evaluation-cases";
import {
  assistantEvaluationReasoningOptions,
  assistantEvaluationTemperature,
  createAssistantEvaluationCaseSnapshot,
  createAssistantEvaluationPromptSnapshot,
  evaluateCustomWidgetAssistantCase,
  getAssistantEvaluationMaxOutputTokens,
  resolveAssistantEvaluationMaxLoops,
  validateAssistantEvaluationExperimentConfiguration,
} from "./ai-assistant-evaluation";
import type { CustomWidgetAssistantEvaluationResult } from "./ai-assistant-evaluation";
import {
  evaluateCustomWidgetCase,
  getCustomWidgetJudgePolicyHash,
  resolveAiEvaluationProviderConfig,
} from "./ai-evaluation";
import type { AiEvaluationResult } from "./ai-evaluation";

const {
  apiKey,
  baseUrl: providerBaseUrl,
  generatorModel,
  judgeModel,
  generatorTemperature,
} = resolveAiEvaluationProviderConfig(process.env);

const requestedCaseArgument = process.argv.find((value) => value.startsWith("--case="))?.slice("--case=".length);
const splitArgument = process.argv.find((value) => value.startsWith("--split="))?.slice("--split=".length);
const evaluationSplits = ["train", "dev", "heldout"] as const;
const requestedSplit = evaluationSplits.find((split) => split === splitArgument);
const candidatePromptArgument = process.argv
  .find((value) => value.startsWith("--candidate-prompt="))
  ?.slice("--candidate-prompt=".length);
const outputRootArgument = process.argv
  .find((value) => value.startsWith("--output-root="))
  ?.slice("--output-root=".length);
const experimentId = process.argv.find((value) => value.startsWith("--experiment="))?.slice("--experiment=".length);
const generationId = process.argv.find((value) => value.startsWith("--generation="))?.slice("--generation=".length);
const maxLoopsArgument = process.argv.find((value) => value.startsWith("--max-loops="))?.slice("--max-loops=".length);
const assistantMode = process.argv.includes("--assistant");
if (requestedCaseArgument === "") throw new Error("--case requires a case ID");
if (splitArgument !== undefined && requestedSplit === undefined) {
  throw new Error("--split must be one of: train, dev, heldout");
}
if (requestedCaseArgument !== undefined && requestedSplit !== undefined) {
  throw new Error("--case and --split are mutually exclusive; choose one fixed selection mode");
}
if (candidatePromptArgument !== undefined && !assistantMode) {
  throw new Error("--candidate-prompt requires --assistant");
}
if (candidatePromptArgument === "") throw new Error("--candidate-prompt requires a file path");
if (outputRootArgument === "") throw new Error("--output-root requires a directory path");
if (experimentId === "") throw new Error("--experiment requires an identifier");
if (generationId === "") throw new Error("--generation requires an identifier");

const maxLoopsConfiguration = resolveAssistantEvaluationMaxLoops(
  maxLoopsArgument,
  process.env.CUSTOM_WIDGET_AI_MAX_LOOPS,
);
const maxLoops = maxLoopsConfiguration.value;
validateAssistantEvaluationExperimentConfiguration(
  maxLoops,
  experimentId,
  generationId,
  requestedSplit,
  candidatePromptArgument !== undefined,
);

const candidatePromptPath = candidatePromptArgument ? path.resolve(process.cwd(), candidatePromptArgument) : null;
const assistantPolicy = candidatePromptPath
  ? await readFile(candidatePromptPath, "utf8")
  : CUSTOM_WIDGET_ASSISTANT_POLICY;
if (assistantPolicy.trim().length === 0) throw new Error("The assistant candidate prompt must not be empty");
const assistantPromptSnapshot = createAssistantEvaluationPromptSnapshot({
  source: candidatePromptPath ? "candidate-file" : "built-in",
  sourceFile: candidatePromptPath ? path.relative(process.cwd(), candidatePromptPath) : null,
  text: assistantPolicy,
});

const harnessSourceUrls = [
  new URL("./evaluate-ai-authoring.ts", import.meta.url),
  new URL("./ai-assistant-evaluation.ts", import.meta.url),
  new URL("./ai-evaluation.ts", import.meta.url),
  new URL("../src/core/assistant-authoring-phase.ts", import.meta.url),
  new URL("../src/core/assistant-tool-input.ts", import.meta.url),
  new URL("../src/core/assistant-tool-step.ts", import.meta.url),
  new URL("../src/core/custom-jsx-schema.ts", import.meta.url),
];
const harnessSources = await Promise.all(harnessSourceUrls.map((url) => readFile(url, "utf8")));
const harnessSnapshot = {
  sha256: createHash("sha256").update(JSON.stringify(harnessSources), "utf8").digest("hex"),
  judgePolicySha256: getCustomWidgetJudgePolicyHash(),
  files: harnessSourceUrls.map((url) => path.relative(process.cwd(), url.pathname)),
};
if (!apiKey) {
  throw new Error("AI_PROVIDER_API_KEY or OPENROUTER_API_KEY is required for the live Custom Widget AI evaluation");
}
let selectableCases = CUSTOM_WIDGET_AI_EVALUATION_CASES.filter((testCase) => !testCase.expectedWidgets?.length);
if (assistantMode) {
  selectableCases = CUSTOM_WIDGET_AI_EVALUATION_CASES.filter(
    (testCase) =>
      (testCase.sampleResponse !== undefined || testCase.previewResponses?.length) &&
      (testCase.expectations !== undefined || testCase.expectedWidgets?.length),
  );
}
let selectedCases = selectableCases;
if (requestedSplit) selectedCases = selectableCases.filter((testCase) => testCase.split === requestedSplit);
if (requestedCaseArgument) {
  selectedCases = selectableCases.filter((testCase) => testCase.id === requestedCaseArgument);
}
if (selectedCases.length === 0 && requestedCaseArgument) {
  throw new Error(`Unknown AI evaluation case '${requestedCaseArgument}'`);
}
if (selectedCases.length === 0) throw new Error(`No eligible AI evaluation cases in split '${requestedSplit}'`);
const caseSnapshot = createAssistantEvaluationCaseSnapshot(selectedCases);
let selectedSplit: (typeof evaluationSplits)[number] | "all" = "all";
if (requestedSplit) selectedSplit = requestedSplit;
if (requestedCaseArgument && selectedCases[0]) selectedSplit = selectedCases[0].split;

const runId = new Date().toISOString().replaceAll(/[:.]/gu, "-");
const outputRoot = outputRootArgument
  ? path.resolve(process.cwd(), outputRootArgument)
  : path.resolve(process.cwd(), ".ai-evaluations", runId);
await mkdir(outputRoot, { recursive: true });

function getResultScoreFloor(result: AiEvaluationResult | CustomWidgetAssistantEvaluationResult) {
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
      judgeModel,
      assistantPolicy,
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
      generatorTemperature,
    });
  }
  results.push(result);
  if (result.judge) {
    const widgetCount = "widgets" in result ? result.widgets.length : 1;
    const scoreFloor = getResultScoreFloor(result);
    const status = result.judge.verdict === "pass" ? "passed" : "failed";
    process.stdout.write(
      `  ${scoreFloor}/100 floor across ${widgetCount} widget(s), ${status} after ${result.attempts} attempt(s)\n`,
    );
  } else {
    process.stdout.write(`  failed after ${result.attempts} attempt(s)\n`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  generation: {
    runId,
    experimentId: experimentId ?? null,
    generationId: generationId ?? null,
    maxLoops,
    maxLoopsConfiguration,
    model: generatorModel,
    temperature: assistantMode ? assistantEvaluationTemperature : generatorTemperature,
    reasoning: assistantMode ? assistantEvaluationReasoningOptions : null,
    maxOutputTokens: assistantMode
      ? getAssistantEvaluationMaxOutputTokens(process.env.CUSTOM_WIDGET_AI_MAX_OUTPUT_TOKENS)
      : null,
  },
  mode: assistantMode ? "assistant-tool-loop" : "manifest",
  providerBaseUrl,
  generatorModel,
  judgeModel,
  assistantPrompt: assistantMode ? assistantPromptSnapshot : null,
  harness: harnessSnapshot,
  benchmark: {
    split: selectedSplit,
    ...caseSnapshot,
  },
  ...(assistantMode ? {} : { generatorTemperature }),
  results: results.map((result) => ({
    caseId: result.caseId,
    attempts: result.attempts,
    score: getResultScoreFloor(result),
    verdict: result.judge?.verdict ?? "fail",
    categories: result.judge?.categories ?? null,
    errors: result.errors,
    calledTools: "calledTools" in result ? result.calledTools : undefined,
    widgets: "widgets" in result ? result.widgets.length : 1,
    widgetScores: "judges" in result ? result.judges.map((judge) => judge.total) : undefined,
    efficiency: "efficiency" in result ? result.efficiency : undefined,
    outputDirectory: path.relative(process.cwd(), result.outputDirectory),
  })),
};
await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
process.stdout.write(`Results saved to ${path.relative(process.cwd(), outputRoot)}\n`);

if (results.some((result) => result.judge?.verdict !== "pass")) process.exitCode = 1;
