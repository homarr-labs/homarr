import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { customWidgetDefinitionSchema } from "../src/core/custom-jsx-schema";
import type { HomarrCustomWidgetV2 } from "../src/core/custom-jsx-schema";
import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "./ai-evaluation-cases";
import { createAssistantEvaluationCaseSnapshot } from "./ai-assistant-evaluation";
import {
  getCustomWidgetJudgePolicyHash,
  getAiEvaluationMaxOutputTokens,
  getDeterministicEvaluationMatches,
  getDeterministicEvaluationSuiteIssues,
  getExpectedWidgetCase,
  judgeCustomWidgetCase,
  resolveAiEvaluationProviderConfig,
} from "./ai-evaluation";
import type { CustomWidgetJudgeRequest, CustomWidgetJudgeResult } from "./ai-evaluation";

interface SourceResult {
  caseId: string;
  attempts?: number;
  score?: number | null;
  verdict?: string;
  categories?: Record<string, number> | null;
  errors?: string[];
  widgets?: number;
  widgetScores?: number[];
  outputDirectory: string;
  [key: string]: unknown;
}

interface AssistantSourceSummary {
  generatedAt?: string;
  mode: string;
  generation?: unknown;
  generatorModel?: string;
  judgeModel?: string;
  assistantPrompt?: unknown;
  assistantPromptBundle?: unknown;
  harness?: { judgePolicySha256?: string; [key: string]: unknown };
  benchmark: { split?: string; sha256: string; caseIds: string[] };
  results: SourceResult[];
  [key: string]: unknown;
}

export type RejudgeJudgeRunner = (
  args: CustomWidgetJudgeRequest & {
    onResponse?: (requestAttempt: number, raw: string) => void | Promise<void>;
  },
) => Promise<{ result: CustomWidgetJudgeResult; requestAttempts: number }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export function parseAndValidateRejudgeSourceSummary(value: unknown, source: string): AssistantSourceSummary {
  if (!isRecord(value) || value.mode !== "assistant-tool-loop") {
    throw new Error(`${source}: expected an assistant-tool-loop summary`);
  }
  if (!isRecord(value.benchmark) || typeof value.benchmark.sha256 !== "string") {
    throw new Error(`${source}: benchmark hash is required`);
  }
  if (!Array.isArray(value.benchmark.caseIds) || !value.benchmark.caseIds.every((id) => typeof id === "string")) {
    throw new Error(`${source}: benchmark caseIds are required`);
  }
  if (!Array.isArray(value.results)) throw new Error(`${source}: results are required`);
  const results = value.results.map((result, index) => {
    if (!isRecord(result) || typeof result.caseId !== "string" || typeof result.outputDirectory !== "string") {
      throw new Error(`${source}: result ${index + 1} is missing caseId or outputDirectory`);
    }
    if (
      result.errors !== undefined &&
      (!Array.isArray(result.errors) || !result.errors.every((error) => typeof error === "string"))
    ) {
      throw new Error(`${source}: result ${index + 1} has invalid errors`);
    }
    return result as SourceResult;
  });
  const caseIds = value.benchmark.caseIds as string[];
  const resultCaseIds = results.map(({ caseId }) => caseId);
  if (JSON.stringify(resultCaseIds) !== JSON.stringify(caseIds)) {
    throw new Error(`${source}: result case IDs do not match benchmark case IDs`);
  }
  const cases = caseIds.map((caseId) => {
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find((candidate) => candidate.id === caseId);
    if (!testCase) throw new Error(`${source}: unknown benchmark case '${caseId}'`);
    return testCase;
  });
  const currentSnapshot = createAssistantEvaluationCaseSnapshot(cases);
  if (currentSnapshot.sha256 !== value.benchmark.sha256) {
    throw new Error(
      `${source}: benchmark hash ${value.benchmark.sha256} does not match current cases ${currentSnapshot.sha256}`,
    );
  }
  return value as unknown as AssistantSourceSummary;
}

const hasLifecycleFailure = (result: SourceResult) =>
  result.score == null && (result.errors ?? []).some((error) => error.includes("lifecycle failed"));

const hasDeterministicFailure = (result: SourceResult) =>
  result.score == null && (result.errors ?? []).some((error) => error.includes("deterministic checks failed"));

const formatDeterministicIssues = (issues: ReturnType<typeof getDeterministicEvaluationSuiteIssues>) =>
  issues.map((issue) => ({
    path: issue.path ?? [],
    message: issue.message,
  }));

const resolveCaseDirectory = async (summaryPath: string, outputDirectory: string) => {
  const candidates = path.isAbsolute(outputDirectory)
    ? [outputDirectory]
    : [
        path.resolve(process.cwd(), outputDirectory),
        path.resolve(path.dirname(summaryPath), outputDirectory),
        path.resolve(path.dirname(summaryPath), path.basename(outputDirectory)),
      ];
  for (const candidate of [...new Set(candidates)]) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next source-relative location.
    }
  }
  throw new Error(`Unable to locate artifact directory '${outputDirectory}'`);
};

interface JudgeCandidate {
  expectedWidgetId: string;
  testCase: (typeof CUSTOM_WIDGET_AI_EVALUATION_CASES)[number];
  widget: HomarrCustomWidgetV2;
}

const loadJudgeCandidates = async (
  summaryPath: string,
  result: SourceResult,
  testCase: (typeof CUSTOM_WIDGET_AI_EVALUATION_CASES)[number],
): Promise<JudgeCandidate[]> => {
  const caseDirectory = await resolveCaseDirectory(summaryPath, result.outputDirectory);
  const entries = await readdir(caseDirectory);
  const widgetArtifacts = entries.flatMap((file) => {
    const match = /^widget-(\d+)-(.+)\.json$/u.exec(file);
    if (!match?.[1] || !match[2]) return [];
    return [{ file, attempt: Number(match[1]), expectedWidgetId: match[2] }];
  });
  if (widgetArtifacts.length > 0) {
    const latestAttempt = Math.max(...widgetArtifacts.map(({ attempt }) => attempt));
    return Promise.all(
      widgetArtifacts
        .filter(({ attempt }) => attempt === latestAttempt)
        .toSorted((left, right) => left.expectedWidgetId.localeCompare(right.expectedWidgetId))
        .map(async ({ file, expectedWidgetId }) => {
          let judgeCase = testCase;
          if (testCase.expectedWidgets?.length) {
            const expectedWidget = testCase.expectedWidgets.find(({ id }) => id === expectedWidgetId);
            if (!expectedWidget)
              throw new Error(`${result.caseId}: unknown expected widget artifact '${expectedWidgetId}'`);
            judgeCase = getExpectedWidgetCase(testCase, expectedWidget);
          } else if (expectedWidgetId !== testCase.id) {
            throw new Error(`${result.caseId}: unexpected widget artifact '${expectedWidgetId}'`);
          }
          const widget = customWidgetDefinitionSchema.parse(
            JSON.parse(await readFile(path.join(caseDirectory, file), "utf8")),
          );
          return { expectedWidgetId, testCase: judgeCase, widget };
        }),
    );
  }

  const previewArtifacts = entries.flatMap((file) => {
    const match = /^preview-candidates-(\d+)\.json$/u.exec(file);
    if (!match?.[1]) return [];
    return [{ file, attempt: Number(match[1]) }];
  });
  const latestPreview = previewArtifacts.toSorted((left, right) => right.attempt - left.attempt)[0];
  if (!latestPreview) throw new Error(`${result.caseId}: no persisted or preview candidate artifact was found`);
  const rawWidgets = JSON.parse(await readFile(path.join(caseDirectory, latestPreview.file), "utf8")) as unknown;
  if (!Array.isArray(rawWidgets)) throw new Error(`${result.caseId}: preview candidate artifact must contain an array`);
  const widgets = rawWidgets.map((widget) => customWidgetDefinitionSchema.parse(widget));
  const matches = getDeterministicEvaluationMatches(testCase, widgets);
  if (matches.length === 0)
    throw new Error(`${result.caseId}: preview candidates cannot be matched to requested widgets`);
  return matches.map((match) => ({
    expectedWidgetId: match.expectedWidgetId,
    testCase: match.testCase,
    widget: widgets[match.widgetIndex] as HomarrCustomWidgetV2,
  }));
};

const renderRejudgeReport = (summary: Record<string, unknown> & { results: SourceResult[] }) => {
  const lines = [
    "# Custom Widget assistant rejudge",
    "",
    `Source summary: ${String((summary.sourceSummary as { path: string }).path)}`,
    `Source SHA-256: ${String((summary.sourceSummary as { sha256: string }).sha256)}`,
    `Source judge: ${String((summary.sourceSummary as { judgeModel: string | null }).judgeModel)}`,
    `Source judge policy: ${String((summary.sourceSummary as { judgePolicySha256: string | null }).judgePolicySha256)}`,
    `Judge: ${String(summary.judgeModel)}`,
    `Judge max output tokens: ${String(summary.judgeMaxOutputTokens)}`,
    `Judge policy: ${String((summary.harness as { judgePolicySha256: string }).judgePolicySha256)}`,
    "",
    "| Case | Status | Score | Verdict |",
    "| --- | --- | ---: | :---: |",
  ];
  for (const result of summary.results) {
    const rejudge = result.rejudge as { status?: string } | undefined;
    lines.push(
      `| ${result.caseId} | ${rejudge?.status ?? "unknown"} | ${result.score ?? "n/a"} | ${result.verdict ?? "fail"} |`,
    );
  }
  return `${lines.join("\n")}\n`;
};

export async function rejudgeAssistantSummary(args: {
  sourceSummaryPath: string;
  outputRoot: string;
  apiKey: string;
  baseUrl: string;
  judgeModel: string;
  judgeRunner?: RejudgeJudgeRunner;
}) {
  const sourceSummaryPath = path.resolve(args.sourceSummaryPath);
  const sourceRaw = await readFile(sourceSummaryPath, "utf8");
  const source = parseAndValidateRejudgeSourceSummary(JSON.parse(sourceRaw) as unknown, sourceSummaryPath);
  const judgeRunner = args.judgeRunner ?? judgeCustomWidgetCase;
  await mkdir(args.outputRoot, { recursive: true });
  const results: SourceResult[] = [];
  for (const sourceResult of source.results) {
    if (hasLifecycleFailure(sourceResult)) {
      results.push({ ...sourceResult, rejudge: { status: "preserved", reason: "lifecycle-failure" } });
      continue;
    }
    const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find(({ id }) => id === sourceResult.caseId);
    if (!testCase) throw new Error(`Unknown benchmark case '${sourceResult.caseId}'`);
    const candidates = await loadJudgeCandidates(sourceSummaryPath, sourceResult, testCase);
    const candidateArtifacts = candidates.map(({ expectedWidgetId, widget }) => ({
      expectedWidgetId,
      sha256: sha256(JSON.stringify(widget)),
    }));
    let recoveredDeterministic = false;
    if (hasDeterministicFailure(sourceResult)) {
      const currentIssues = getDeterministicEvaluationSuiteIssues(
        testCase,
        candidates.map(({ widget }) => widget),
      );
      if (currentIssues.length > 0) {
        results.push({
          ...sourceResult,
          rejudge: {
            status: "preserved",
            reason: "deterministic-failure",
            candidateArtifacts,
            currentDeterministicIssues: formatDeterministicIssues(currentIssues),
          },
        });
        continue;
      }
      recoveredDeterministic = true;
    }
    const caseOutput = path.join(args.outputRoot, `assistant-${sourceResult.caseId}`);
    await mkdir(caseOutput, { recursive: true });
    const judges: CustomWidgetJudgeResult[] = [];
    let judgeRequests = 0;
    let judgeFailure: string | null = null;
    for (const candidate of candidates) {
      const basename = `judge-${candidate.expectedWidgetId}`;
      let candidateJudgeRequests = 0;
      try {
        const judged = await judgeRunner({
          testCase: candidate.testCase,
          widget: candidate.widget,
          apiKey: args.apiKey,
          baseUrl: args.baseUrl,
          judgeModel: args.judgeModel,
          onResponse: async (requestAttempt, raw) => {
            candidateJudgeRequests = Math.max(candidateJudgeRequests, requestAttempt);
            await writeFile(path.join(caseOutput, `${basename}.request-${requestAttempt}.json`), raw, "utf8");
            await writeFile(path.join(caseOutput, `${basename}.json`), raw, "utf8");
          },
        });
        candidateJudgeRequests = Math.max(candidateJudgeRequests, judged.requestAttempts);
        judges.push(judged.result);
      } catch (error) {
        judgeFailure = error instanceof Error ? error.message : "Unknown judge error";
      }
      judgeRequests += candidateJudgeRequests;
      if (judgeFailure) break;
    }
    if (judgeFailure) {
      results.push({
        ...sourceResult,
        sourceScore: sourceResult.score ?? null,
        sourceVerdict: sourceResult.verdict ?? "fail",
        sourceErrors: sourceResult.errors ?? [],
        score: null,
        verdict: "fail",
        categories: null,
        widgetScores: [],
        errors: [`Rejudge failed — ${judgeFailure}`],
        outputDirectory: path.relative(process.cwd(), caseOutput),
        rejudge: { status: "failed", judgeRequests, candidateArtifacts },
      });
      continue;
    }
    const weakest = judges.toSorted((left, right) => left.total - right.total)[0];
    if (!weakest) throw new Error(`${sourceResult.caseId}: no widget received a rejudge`);
    results.push({
      ...sourceResult,
      sourceScore: sourceResult.score ?? null,
      sourceVerdict: sourceResult.verdict ?? "fail",
      sourceErrors: sourceResult.errors ?? [],
      score: weakest.total,
      verdict: weakest.verdict,
      categories: weakest.categories,
      widgetScores: judges.map(({ total }) => total),
      errors: [],
      outputDirectory: path.relative(process.cwd(), caseOutput),
      rejudge: {
        status: recoveredDeterministic ? "recovered-deterministic" : "judged",
        judgeRequests,
        candidateArtifacts,
      },
    });
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: "assistant-rejudge",
    sourceSummary: {
      path: path.relative(process.cwd(), sourceSummaryPath),
      sha256: sha256(sourceRaw),
      generatedAt: source.generatedAt ?? null,
      generation: source.generation ?? null,
      judgeModel: source.judgeModel ?? null,
      judgePolicySha256: source.harness?.judgePolicySha256 ?? null,
    },
    providerBaseUrl: args.baseUrl,
    generatorModel: source.generatorModel ?? null,
    judgeModel: args.judgeModel,
    judgeMaxOutputTokens: getAiEvaluationMaxOutputTokens("judge", process.env.CUSTOM_WIDGET_AI_JUDGE_MAX_OUTPUT_TOKENS),
    assistantPrompt: source.assistantPrompt ?? null,
    assistantPromptBundle: source.assistantPromptBundle ?? null,
    harness: { judgePolicySha256: getCustomWidgetJudgePolicyHash() },
    benchmark: source.benchmark,
    results,
  };
  await Promise.all([
    writeFile(path.join(args.outputRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
    writeFile(path.join(args.outputRoot, "report.md"), renderRejudgeReport(summary), "utf8"),
  ]);
  return summary;
}

const parseCliOptions = (values: readonly string[]) => {
  const summary = values.find((value) => value.startsWith("--summary="))?.slice("--summary=".length);
  const output = values.find((value) => value.startsWith("--output="))?.slice("--output=".length);
  if (!summary || !output) {
    throw new Error("Usage: tsx rejudge-ai-authoring.ts --summary=<summary.json> --output=<directory>");
  }
  return { sourceSummaryPath: path.resolve(summary), outputRoot: path.resolve(output) };
};

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const options = parseCliOptions(process.argv.slice(2));
  const provider = resolveAiEvaluationProviderConfig(process.env);
  if (!provider.apiKey) throw new Error("AI_PROVIDER_API_KEY or OPENROUTER_API_KEY is required for rejudging");
  await rejudgeAssistantSummary({
    ...options,
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    judgeModel: provider.judgeModel,
  });
  process.stdout.write(`Wrote ${path.join(options.outputRoot, "summary.json")} and report.md\n`);
}
