import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CUSTOM_WIDGET_ASSISTANT_POLICY, CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION } from "../src/core/ai-prompt";
import { getCustomWidgetAiEvaluationSuite, resolveCustomWidgetAiEvaluationSuiteId } from "./ai-evaluation-suites";
import {
  assistantEvaluationProviderPreferences,
  assistantEvaluationTemperature,
  createAssistantEvaluationCaseSnapshot,
  createAssistantEvaluationPromptSnapshot,
  evaluateCustomWidgetAssistantCase,
  getAssistantEvaluationMaxOutputTokens,
  getAssistantEvaluationPromotionEligibility,
  getAssistantEvaluationReasoningOptions,
  getAssistantEvaluationStepTimeoutMs,
  getRequiredAssistantEvaluationReasoningEffort,
  resolveAssistantEvaluationMaxLoops,
  validateAssistantEvaluationExperimentConfiguration,
} from "./ai-assistant-evaluation";
import type { CustomWidgetAssistantEvaluationResult } from "./ai-assistant-evaluation";
import { createAssistantPromptBundleSnapshot, parseAssistantPromptBundle } from "./assistant-prompt-bundle";
import type { AssistantPromptBundleFile } from "./assistant-prompt-bundle";
import {
  aiEvaluationSpendBudget,
  assertLiveAiEvaluationSpendCap,
  evaluateCustomWidgetCase,
  getAiEvaluationMaxOutputTokens,
  getAiEvaluationConcurrency,
  getAiEvaluationRequestTimeoutMs,
  getCustomWidgetJudgePolicyHash,
  mapAiEvaluationCasesWithConcurrency,
  resolveAiEvaluationProviderConfig,
} from "./ai-evaluation";
import type { AiEvaluationResult } from "./ai-evaluation";
import { createAiEvaluationHarnessSnapshot } from "./ai-evaluation-provenance";

const {
  apiKey,
  baseUrl: providerBaseUrl,
  generatorModel,
  judgeModel,
  generatorTemperature,
} = resolveAiEvaluationProviderConfig(process.env);
assertLiveAiEvaluationSpendCap(aiEvaluationSpendBudget, providerBaseUrl);

const requestedCaseArgument = process.argv.find((value) => value.startsWith("--case="))?.slice("--case=".length);
const suiteArgument = process.argv.find((value) => value.startsWith("--suite="))?.slice("--suite=".length);
const splitArgument = process.argv.find((value) => value.startsWith("--split="))?.slice("--split=".length);
const evaluationSplits = ["train", "dev", "heldout"] as const;
const requestedSplit = evaluationSplits.find((split) => split === splitArgument);
const candidatePromptArgument = process.argv
  .find((value) => value.startsWith("--candidate-prompt="))
  ?.slice("--candidate-prompt=".length);
const candidatePromptBundleArgument = process.argv
  .find((value) => value.startsWith("--candidate-prompt-bundle="))
  ?.slice("--candidate-prompt-bundle=".length);
const outputRootArgument = process.argv
  .find((value) => value.startsWith("--output-root="))
  ?.slice("--output-root=".length);
const experimentId = process.argv.find((value) => value.startsWith("--experiment="))?.slice("--experiment=".length);
const generationId = process.argv.find((value) => value.startsWith("--generation="))?.slice("--generation=".length);
const maxLoopsArgument = process.argv.find((value) => value.startsWith("--max-loops="))?.slice("--max-loops=".length);
const concurrencyArgument = process.argv
  .find((value) => value.startsWith("--concurrency="))
  ?.slice("--concurrency=".length);
const assistantMode = process.argv.includes("--assistant");
const ciMode = process.argv.includes("--ci");
if (requestedCaseArgument === "") throw new Error("--case requires a case ID");
const selectedSuiteId = resolveCustomWidgetAiEvaluationSuiteId(suiteArgument ?? process.env.CUSTOM_WIDGET_AI_SUITE);
const evaluationCases = getCustomWidgetAiEvaluationSuite(selectedSuiteId);
if (splitArgument !== undefined && requestedSplit === undefined) {
  throw new Error("--split must be one of: train, dev, heldout");
}
if (requestedCaseArgument !== undefined && requestedSplit !== undefined) {
  throw new Error("--case and --split are mutually exclusive; choose one fixed selection mode");
}
if (candidatePromptArgument !== undefined && !assistantMode) {
  throw new Error("--candidate-prompt requires --assistant");
}
if (candidatePromptBundleArgument !== undefined && !assistantMode) {
  throw new Error("--candidate-prompt-bundle requires --assistant");
}
if (candidatePromptArgument !== undefined && candidatePromptBundleArgument !== undefined) {
  throw new Error("--candidate-prompt and --candidate-prompt-bundle are mutually exclusive");
}
if (candidatePromptArgument === "") throw new Error("--candidate-prompt requires a file path");
if (candidatePromptBundleArgument === "") throw new Error("--candidate-prompt-bundle requires a file path");
if (outputRootArgument === "") throw new Error("--output-root requires a directory path");
if (experimentId === "") throw new Error("--experiment requires an identifier");
if (generationId === "") throw new Error("--generation requires an identifier");
if (concurrencyArgument === "") throw new Error("--concurrency requires an integer");
if (ciMode && maxLoopsArgument !== undefined && maxLoopsArgument !== "1") {
  throw new Error("--ci requires --max-loops=1");
}

const maxLoopsConfiguration = resolveAssistantEvaluationMaxLoops(
  maxLoopsArgument ?? (ciMode ? "1" : undefined),
  process.env.CUSTOM_WIDGET_AI_MAX_LOOPS,
);
const maxLoops = maxLoopsConfiguration.value;
const concurrency = getAiEvaluationConcurrency(concurrencyArgument ?? process.env.CUSTOM_WIDGET_AI_CONCURRENCY);
const requestTimeoutMs = assistantMode
  ? getAssistantEvaluationStepTimeoutMs(process.env.CUSTOM_WIDGET_AI_REQUEST_TIMEOUT_MS, Number.MAX_SAFE_INTEGER)
  : getAiEvaluationRequestTimeoutMs(process.env.CUSTOM_WIDGET_AI_REQUEST_TIMEOUT_MS);
const assistantMaxOutputTokens = getAssistantEvaluationMaxOutputTokens(process.env.CUSTOM_WIDGET_AI_MAX_OUTPUT_TOKENS);
const assistantReasoningOptions = getAssistantEvaluationReasoningOptions(
  process.env.CUSTOM_WIDGET_AI_REASONING_EFFORT,
  generatorModel,
);
validateAssistantEvaluationExperimentConfiguration(
  maxLoops,
  experimentId,
  generationId,
  requestedSplit,
  candidatePromptArgument !== undefined || candidatePromptBundleArgument !== undefined,
);

const candidatePromptPath = candidatePromptArgument ? path.resolve(process.cwd(), candidatePromptArgument) : null;
const candidatePromptBundlePath = candidatePromptBundleArgument
  ? path.resolve(process.cwd(), candidatePromptBundleArgument)
  : null;
let assistantPromptBundle: AssistantPromptBundleFile = {
  schemaVersion: 1,
  stagingInstruction: CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION,
  assistantPolicy: CUSTOM_WIDGET_ASSISTANT_POLICY,
};
if (candidatePromptPath) {
  assistantPromptBundle = {
    ...assistantPromptBundle,
    assistantPolicy: await readFile(candidatePromptPath, "utf8"),
  };
}
if (candidatePromptBundlePath) {
  const serializedBundle = await readFile(candidatePromptBundlePath, "utf8");
  assistantPromptBundle = parseAssistantPromptBundle(JSON.parse(serializedBundle) as unknown);
}
const { stagingInstruction, assistantPolicy } = assistantPromptBundle;
if (assistantPolicy.trim().length === 0) throw new Error("The assistant candidate prompt must not be empty");
const assistantPromptSourcePath = candidatePromptPath ?? candidatePromptBundlePath;
const assistantPromptSourceFile = assistantPromptSourcePath
  ? path.relative(process.cwd(), assistantPromptSourcePath)
  : null;
const assistantPromptSnapshot = createAssistantEvaluationPromptSnapshot({
  source: assistantPromptSourcePath ? "candidate-file" : "built-in",
  sourceFile: assistantPromptSourceFile,
  text: assistantPolicy,
});
let assistantPromptBundleSource: "built-in" | "candidate-policy-file" | "candidate-bundle-file" = "built-in";
if (candidatePromptPath) assistantPromptBundleSource = "candidate-policy-file";
if (candidatePromptBundlePath) assistantPromptBundleSource = "candidate-bundle-file";
const assistantPromptBundleSnapshot = createAssistantPromptBundleSnapshot({
  bundle: assistantPromptBundle,
  source: assistantPromptBundleSource,
  sourceFile: assistantPromptSourceFile,
});

const evaluatorHarnessSnapshot = await createAiEvaluationHarnessSnapshot();
const harnessSnapshot = {
  ...evaluatorHarnessSnapshot,
  judgePolicySha256: getCustomWidgetJudgePolicyHash(),
};
if (!apiKey) {
  throw new Error("AI_PROVIDER_API_KEY or OPENROUTER_API_KEY is required for the live Custom Widget AI evaluation");
}
let selectableCases = evaluationCases.filter((testCase) => !testCase.expectedWidgets?.length);
if (assistantMode) {
  selectableCases = evaluationCases.filter(
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

const promotionEligibility = getAssistantEvaluationPromotionEligibility({
  assistantMode,
  requestedCase: requestedCaseArgument,
  requestedSplit,
  experimentId,
  generationId,
  maxLoops,
  selectedCaseIds: selectedCases.map(({ id }) => id),
  expectedCaseIds:
    requestedSplit === undefined
      ? []
      : selectableCases.filter((testCase) => testCase.split === requestedSplit).map(({ id }) => id),
  generatorModel,
  reasoningEffort: assistantReasoningOptions.effort,
  maxOutputTokens: assistantMaxOutputTokens,
});

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

const results = await mapAiEvaluationCasesWithConcurrency(selectedCases, concurrency, async (testCase) => {
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
      stagingInstruction,
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
  return result;
});

const summary = {
  generatedAt: new Date().toISOString(),
  generation: {
    runId,
    experimentId: experimentId ?? null,
    generationId: generationId ?? null,
    ci: ciMode,
    maxLoops,
    concurrency,
    requestTimeoutMs,
    maxLoopsConfiguration,
    model: generatorModel,
    temperature: assistantMode ? assistantEvaluationTemperature : generatorTemperature,
    reasoning: assistantMode ? assistantReasoningOptions : null,
    requiredReasoningEffort: assistantMode ? getRequiredAssistantEvaluationReasoningEffort(generatorModel) : null,
    providerPreferences: assistantMode ? (assistantEvaluationProviderPreferences ?? null) : null,
    maxOutputTokens: assistantMode
      ? assistantMaxOutputTokens
      : getAiEvaluationMaxOutputTokens("generation", process.env.CUSTOM_WIDGET_AI_GENERATION_MAX_OUTPUT_TOKENS),
    judgeMaxOutputTokens: getAiEvaluationMaxOutputTokens("judge", process.env.CUSTOM_WIDGET_AI_JUDGE_MAX_OUTPUT_TOKENS),
  },
  mode: assistantMode ? "assistant-tool-loop" : "manifest",
  providerBaseUrl,
  generatorModel,
  judgeModel,
  spend: aiEvaluationSpendBudget.snapshot(),
  assistantPrompt: assistantMode ? assistantPromptSnapshot : null,
  assistantPromptBundle: assistantMode ? assistantPromptBundleSnapshot : null,
  harness: harnessSnapshot,
  benchmark: {
    suite: selectedSuiteId,
    split: selectedSplit,
    promotionEligible: promotionEligibility.eligible,
    promotionIneligibilityReasons: promotionEligibility.reasons,
    ...caseSnapshot,
  },
  ...(assistantMode ? {} : { generatorTemperature }),
  results: results.map((result) => ({
    caseId: result.caseId,
    attempts: result.attempts,
    selectedAttempt: "selectedAttempt" in result ? result.selectedAttempt : result.attempts,
    score: getResultScoreFloor(result),
    verdict: result.judge?.verdict ?? "fail",
    categories: result.judge?.categories ?? null,
    errors: result.errors,
    calledTools: "calledTools" in result ? result.calledTools : undefined,
    widgets: "widgets" in result ? result.widgets.length : 1,
    widgetScores: "judges" in result ? result.judges.map((judge) => judge.total) : undefined,
    efficiency: "efficiency" in result ? result.efficiency : undefined,
    cumulativeEfficiency: "cumulativeEfficiency" in result ? result.cumulativeEfficiency : undefined,
    outputDirectory: path.relative(process.cwd(), result.outputDirectory),
  })),
};
await writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
process.stdout.write(`Results saved to ${path.relative(process.cwd(), outputRoot)}\n`);

if (results.some((result) => result.judge?.verdict !== "pass")) process.exitCode = 1;
