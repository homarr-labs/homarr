import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderWidget, runtimeError, textContent } from "./render.mts";

const root = path.resolve(process.env.ROOT ?? process.cwd());
const iterationDirectoryArgument = process.argv[2];
if (!iterationDirectoryArgument) throw new Error("Provide an evaluation run directory");
const iterationDirectory = path.resolve(iterationDirectoryArgument);
const { CUSTOM_WIDGET_AI_EVALUATION_CASES } = await import(
  `${root}/packages/custom-widgets/scripts/ai-evaluation-cases.ts`
);
const evaluation = await import(`${root}/packages/custom-widgets/scripts/ai-evaluation.ts`);
const harness = await import(`${root}/packages/custom-widgets/scripts/ai-assistant-evaluation.ts`);

type Widget = Parameters<typeof renderWidget>[0];

const judgeOutputSchema = `Return ONLY one JSON object (no prose, no code fence) with exactly these keys:
{"total": 0-100, "verdict": "pass"|"fail", "dailyUseDecision": "would-use-daily"|"promising-but-not-daily"|"not-practical",
 "categories": {"schemaAndBindings":0-100,"apiAndRequestDesign":0-100,"runtimeCompatibility":0-100,"goalFulfillment":0-100,"visualQuality":0-100,"responsiveAndTheme":0-100,"loadingEmptyErrorSuccess":0-100,"dailyUsefulness":0-100,"complexityDiscipline":0-100,"accessibility":0-100,"actionSafety":0-100},
 "categoryReasons": {same keys: one evidence sentence each},
 "strengths": [..<=6], "problems": [..<=12], "fatalProblems": [..<=8], "highestImpactFixes": [..<=6]}`;

async function findRuns(directory: string): Promise<string[]> {
  if (existsSync(path.join(directory, "meta.json"))) return [directory];
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => findRuns(path.join(directory, entry.name))),
  );
  return nested.flat();
}

const loadIds = (widget: Widget) =>
  Object.entries(widget.requests)
    .filter(([, request]) => (request.kind ?? "query") === "query" && (request.trigger ?? "load") === "load")
    .map(([id]) => id);

for (const runDirectory of await findRuns(iterationDirectory)) {
  const meta = JSON.parse(await readFile(path.join(runDirectory, "meta.json"), "utf8"));
  const testCase = CUSTOM_WIDGET_AI_EVALUATION_CASES.find((candidate: { id: string }) => candidate.id === meta.caseId);
  const summaryPath = path.join(runDirectory, "summary.json");
  const widgetsPath = path.join(runDirectory, "widgets.json");
  const summary = existsSync(summaryPath) ? JSON.parse(await readFile(summaryPath, "utf8")) : null;
  const widgets: Widget[] = existsSync(widgetsPath) ? JSON.parse(await readFile(widgetsPath, "utf8")) : [];
  const expectations: Array<{ text: string; passed: boolean; evidence: string }> = [];
  const expected = testCase.expectedWidgets?.length ?? 1;
  expectations.push({
    text: `Persists ${expected} tested widget(s) through customWidget_createFromPreview`,
    passed: widgets.length === expected,
    evidence: `created ${widgets.length}; ${summary ? `${summary.toolCalls} tool calls` : "run not finished"}`,
  });
  const lifecycle: string[] = summary?.lifecycleIssues ?? ["run not finished"];
  expectations.push({
    text: "Follows the preview lifecycle (preview, every query/action evidence, persistence)",
    passed: lifecycle.length === 0,
    evidence: lifecycle.join(" | ") || "complete",
  });
  const suiteIssues = widgets.length
    ? (evaluation.getDeterministicEvaluationSuiteIssues(testCase, widgets) as Array<{ message: string }>)
    : [{ message: "no widget" }];
  expectations.push({
    text: "Meets the case's deterministic contract (requests, bindings, required template capabilities)",
    passed: suiteIssues.length === 0,
    evidence:
      suiteIssues
        .map((issue) => issue.message)
        .join(" | ")
        .slice(0, 600) || "all matched",
  });
  const widget = widgets[0];
  if (widget) {
    const ids = loadIds(widget);
    const okData = Object.fromEntries(
      ids.map((id) => [
        id,
        harness.getAssistantEvaluationPreviewResponse(
          testCase,
          widget.requests[id],
          widget.sources[widget.requests[id].source ?? "default"],
        ),
      ]),
    );
    const okStatus = Object.fromEntries(
      ids.map((id) => [id, { loading: false, ok: true, status: 200, statusText: "OK" }]),
    );
    let renderEvidence = "rendered";
    let renderPassed = true;
    try {
      const html = renderWidget(widget, okData, okStatus);
      if (html.includes("RUNTIME_RENDER_ERROR")) {
        renderPassed = false;
        renderEvidence = runtimeError(html);
      } else renderEvidence = `rendered ${textContent(html).length} text chars`;
    } catch (error) {
      renderPassed = false;
      renderEvidence = `threw ${(error as Error).message}`;
    }
    expectations.push({
      text: "Renders the fixture success state without a runtime error",
      passed: renderPassed,
      evidence: renderEvidence,
    });
    const stateProblems: string[] = [];
    for (const [label, status] of [
      ["loading", { loading: true }],
      [
        "failed",
        { loading: false, ok: false, status: 500, statusText: "Internal Server Error", error: "Upstream failed" },
      ],
    ] as const) {
      try {
        const html = renderWidget(widget, {}, Object.fromEntries(ids.map((id) => [id, status])));
        if (html.includes("RUNTIME_RENDER_ERROR")) stateProblems.push(`${label}: ${runtimeError(html)}`);
      } catch (error) {
        stateProblems.push(`${label} threw: ${(error as Error).message}`);
      }
    }
    expectations.push({
      text: "Renders loading and failed request states without a runtime error",
      passed: stateProblems.length === 0,
      evidence: stateProblems.join(" | ") || "rendered",
    });
    await writeFile(
      path.join(runDirectory, "judge-prompt.md"),
      `${evaluation.buildJudgePrompt(testCase, widget)}\n\n${judgeOutputSchema}\n`,
    );
  } else {
    expectations.push({
      text: "Renders the fixture success state without a runtime error",
      passed: false,
      evidence: "no widget",
    });
    expectations.push({
      text: "Renders loading and failed request states without a runtime error",
      passed: false,
      evidence: "no widget",
    });
  }
  const judgePath = path.join(runDirectory, "judge.json");
  let judge: Record<string, unknown> | null = null;
  if (existsSync(judgePath)) {
    try {
      const raw = (await readFile(judgePath, "utf8")).trim().replace(/^```(?:json)?\s*|\s*```$/gu, "");
      judge = JSON.parse(raw);
    } catch {
      judge = null;
    }
  }
  let weighted: number | null = null;
  let judgePass = false;
  if (judge && judge.categories && typeof judge.categories === "object") {
    const categories = judge.categories as Record<string, number>;
    weighted = evaluation.getWeightedJudgeTotal ? evaluation.getWeightedJudgeTotal(categories) : null;
    if (weighted === null) {
      const weights: Record<string, number> = {
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
      };
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      weighted = Math.round(
        Object.entries(weights).reduce((sum, [key, weight]) => sum + (categories[key] ?? 0) * weight, 0) / totalWeight,
      );
    }
    const fatal = Array.isArray(judge.fatalProblems) ? judge.fatalProblems.length : 0;
    judgePass =
      weighted >= 85 &&
      Object.values(categories).every((score) => score >= 75) &&
      (categories.goalFulfillment ?? 0) >= 85 &&
      (categories.complexityDiscipline ?? 0) >= 80 &&
      judge.dailyUseDecision === "would-use-daily" &&
      fatal === 0;
  }
  const passed = expectations.filter((expectation) => expectation.passed).length;
  const grading = {
    expectations,
    summary: {
      passed,
      failed: expectations.length - passed,
      total: expectations.length,
      pass_rate: Number((passed / expectations.length).toFixed(4)),
    },
    metrics: summary && {
      toolCalls: summary.toolCalls,
      systemChars: summary.systemChars,
      toolInputChars: summary.toolInputChars,
      toolOutputChars: summary.toolOutputChars,
      cumulativeContextChars: summary.cumulativeContextChars,
      efficiencyIssues: summary.efficiencyIssues,
    },
    judge: judge && {
      weighted,
      pass: judgePass,
      decision: judge.dailyUseDecision,
      categories: judge.categories,
      fatalProblems: judge.fatalProblems,
    },
  };
  await writeFile(path.join(runDirectory, "grading.json"), `${JSON.stringify(grading, null, 2)}\n`);
  process.stdout.write(
    `${path.relative(iterationDirectory, runDirectory)}\t${passed}/${expectations.length}\tctx=${summary?.cumulativeContextChars ?? "-"}\tcalls=${summary?.toolCalls ?? "-"}\tjudge=${weighted ?? "-"}${judgePass ? " PASS" : ""}\n`,
  );
}
