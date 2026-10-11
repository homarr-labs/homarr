#!/usr/bin/env node
// Author-only harness. Smoke attempts currently fail fixture cancel assertions; see notebook-measurement.md.
const harnessStartedAt = process.hrtime.bigint();
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const currentSourcePath = resolve(repo, "packages/widgets/src/notebook/notebook.tsx");
const baselineSourcePath = resolve(
  repo,
  "audit-evidence/2026-10-11/baseline-source/packages/widgets/src/notebook/notebook.tsx",
);
const fixtureHtml = (await readFile(resolve(here, "notebook-fixture.html"), "utf8")).replace(
  /\s*<script type="module" src="\/fixture\.js"><\/script>/,
  "",
);
const [currentSource, baselineSource] = await Promise.all([
  readFile(currentSourcePath, "utf8"),
  readFile(baselineSourcePath, "utf8"),
]);

const phaseArg = process.argv.find((value) => value.startsWith("--phase="))?.split("=")[1];
const inferredPhase = currentSource.includes("setContent(editor.getHTML())") ? "baseline" : "after";
const phase = phaseArg ?? inferredPhase;
if (phase !== "baseline" && phase !== "after") throw new Error("--phase must be baseline or after");

const hasCurrentPerTransactionSerialization = currentSource.includes("setContent(editor.getHTML())");
const editorSetupStart = currentSource.indexOf("const editor = useEditor");
const updateStart = currentSource.indexOf("onUpdate:", editorSetupStart);
const createStart = currentSource.indexOf("onCreate:", updateStart);
const updateBlock = updateStart < 0 ? "" : currentSource.slice(updateStart, createStart < 0 ? updateStart + 1200 : createStart);
const saveHandlerStart = currentSource.indexOf("const handleEditToggle = useCallback");
const saveHandlerEnd = currentSource.indexOf("const handleDoubleClick", saveHandlerStart);
const saveHandler = saveHandlerStart < 0 ? "" : currentSource.slice(saveHandlerStart, saveHandlerEnd < 0 ? saveHandlerStart + 1800 : saveHandlerEnd);
const sourceAnchors = [
  ["preserved baseline proves per-transaction serialization", baselineSource.includes("setContent(editor.getHTML())")],
  [
    phase === "baseline" ? "current source proves baseline callback" : "current source has no per-transaction HTML state update",
    phase === "baseline"
      ? updateBlock.includes("setContent(editor.getHTML())")
      : !hasCurrentPerTransactionSerialization && !updateBlock.includes("editor.getHTML()"),
  ],
  ["current transaction rerender setting", currentSource.includes("shouldRerenderOnTransaction: true")],
  [
    phase === "baseline" ? "read-only commit serializes complete HTML" : "read-only commit still serializes complete HTML",
    currentSource.includes("const nextContent = editor.getHTML()"),
  ],
  [
    phase === "baseline" ? "save path consumes current content state" : "save path serializes editor at commit",
    phase === "baseline"
      ? saveHandler.includes("handleContentUpdate(content)")
      : saveHandler.includes("editor.getHTML()"),
  ],
  ["cancel/task rollback restores previous editor content", currentSource.includes("editor.commands.setContent(previousContentRef.current)")],
];
if (sourceAnchors.some(([, found]) => !found)) {
  throw new Error(`Notebook source no longer matches the harness anchors: ${JSON.stringify(sourceAnchors)}`);
}

const bundle = await build({
  absWorkingDir: repo,
  entryPoints: [resolve(here, "notebook-fixture.tsx")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome120"],
  jsx: "automatic",
  write: false,
  sourcemap: "inline",
});
const fixtureJs = bundle.outputFiles[0].text;
const args = new Map(process.argv.slice(2).map((value) => {
  const [key, raw] = value.replace(/^--/, "").split("=");
  return [key, raw ?? "true"];
}));
const pairs = Number(args.get("pairs") ?? 9);
const editCount = Number(args.get("edits") ?? 12);
const lifecycleCycles = Number(args.get("cycles") ?? 3);
const sizes = (args.get("sizes") ?? "small,representative,large").split(",");
if (![pairs, editCount, lifecycleCycles].every(Number.isInteger) || pairs < 1 || editCount < 1 || lifecycleCycles < 0) {
  throw new Error("pairs/edits/cycles must be valid positive integers (cycles may be zero)");
}

const hash = (source) => createHash("sha256").update(source).digest("hex");
const percentile = (values, percentage) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil((percentage / 100) * sorted.length) - 1)];
};
async function collectHeap(cdp) {
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(metrics.filter(({ name }) => ["JSHeapUsedSize", "JSHeapTotalSize"].includes(name)).map(({ name, value }) => [name, value]));
}

async function waitForHarness(page, browserDiagnostics) {
  try {
    await page.waitForFunction(() => Boolean(window.__notebookMeasure), undefined, { timeout: 10_000 });
    await page.waitForFunction(
      () => document.querySelectorAll(".ProseMirror").length === 1,
      undefined,
      { timeout: 10_000 },
    );
  } catch (error) {
    throw new Error(`${error.message}; browser diagnostics: ${browserDiagnostics.join(" | ")}`);
  }
}

async function runOne(size, variant) {
  const browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const browserDiagnostics = [];
  page.on("pageerror", (error) => browserDiagnostics.push(`pageerror: ${error.stack ?? error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserDiagnostics.push(`console: ${message.text()}`);
  });
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.enable");
  try {
  await page.setContent(fixtureHtml);
  await page.evaluate(({ size, variant }) => {
    window.__fixtureOptions = { size, variant };
  }, { size, variant });
  await page.addScriptTag({ content: fixtureJs, type: "module" });
  await waitForHarness(page, browserDiagnostics);
  const noEditSaveStrings = await page.evaluate(async () => {
    const measure = window.__notebookMeasure;
    if (!measure) throw new Error("Harness unavailable");
    const rawHtml = measure.initialRawHtml();
    const normalizedEditorHtml = measure.currentHtml();
    const persistedHtml = await measure.save(true);
    if (persistedHtml === undefined) throw new Error("No-edit save did not return persisted HTML");
    await measure.externalRefresh(rawHtml);
    measure.startEditing();
    return {
      rawHtml,
      normalizedEditorHtml,
      persistedHtml,
      rawUtf16Units: rawHtml.length,
      normalizedUtf16Units: normalizedEditorHtml.length,
      rawEqualsNormalizedEditorHtml: rawHtml === normalizedEditorHtml,
      persistedUtf16Units: persistedHtml.length,
      rawUtf8Bytes: new TextEncoder().encode(rawHtml).length,
      normalizedUtf8Bytes: new TextEncoder().encode(normalizedEditorHtml).length,
      persistedUtf8Bytes: new TextEncoder().encode(persistedHtml).length,
      noEditSavePreservedRawHtml: persistedHtml === rawHtml,
    };
  });
  const { rawHtml, normalizedEditorHtml, persistedHtml, ...compatibilityCounts } = noEditSaveStrings;
  const noEditSaveCompatibility = {
    ...compatibilityCounts,
    rawSha256: hash(rawHtml),
    normalizedEditorSha256: hash(normalizedEditorHtml),
    persistedSha256: hash(persistedHtml),
  };
  if (args.get("compatibility-only") === "true") {
    return { size, variant, browserVersion, noEditSaveCompatibility };
  }
  await page.evaluate(() => window.__notebookMeasure?.clearTelemetry());
  const heapBefore = await collectHeap(cdp);
  const typing = await page.evaluate(async (count) => {
    const measure = window.__notebookMeasure;
    if (!measure) throw new Error("Harness unavailable");
    const durations = await measure.runEdits(count);
    return { durations, snapshot: measure.snapshot() };
  }, editCount);
  await page.evaluate(() => window.__notebookMeasure?.clearTelemetry());
  const heapAfterTyping = await collectHeap(cdp);

  const scenarios = await page.evaluate(async (cycles) => {
    const measure = window.__notebookMeasure;
    if (!measure) throw new Error("Harness unavailable");
    const savedHtml = measure.currentHtml();
    const savedText = measure.currentText();
    await measure.save(true);
    await measure.runEdits(2);
    await measure.cancel();
    const cancelRestored = measure.currentText() === savedText;
    await measure.runEdits(2);
    await measure.save(false);
    const failedSaveKeptDraft = measure.currentText() !== savedText;
    await measure.cancel();
    const failedSaveCancelRestored = measure.currentText() === savedText;
    const refreshedHtml = `${savedHtml}<p>external-refresh</p>`;
    await measure.externalRefresh(refreshedHtml);
    const externalRefreshApplied = measure.currentHtml().includes("external-refresh");
    await measure.toggleTask(true);
    const taskSuccessHtml = measure.currentHtml();
    const taskSuccessChecked = taskSuccessHtml.includes('data-checked="true"');
    await measure.toggleTask(false);
    const failedTaskRestored = measure.currentHtml() === taskSuccessHtml;
    await measure.repeatLifecycle(cycles);
    await new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
    const finalSnapshot = measure.snapshot();
    const finalHtmlUtf8Bytes = new TextEncoder().encode(measure.currentHtml()).length;
    const checks = {
      cancelRestored,
      failedSaveKeptDraft,
      failedSaveCancelRestored,
      externalRefreshApplied,
      taskSuccessChecked,
      failedTaskRestored,
    };
    if (Object.values(checks).some((passed) => !passed)) throw new Error(`Notebook state-path check failed: ${JSON.stringify({ checks, savedTextTail: savedText.slice(-120), currentTextTail: measure.currentText().slice(-120) })}`);
    if (finalSnapshot.taskCommits !== 2) throw new Error(`Expected two read-only task commits, got ${finalSnapshot.taskCommits}`);
    return {
      ...checks,
      finalSnapshot,
      finalHtmlUtf8Bytes,
    };
  }, lifecycleCycles);
  await page.evaluate(() => window.__notebookMeasure?.clearTelemetry());
  const heapAfter = await collectHeap(cdp);
  const userAgent = await page.evaluate(() => navigator.userAgent);
  return {
    size,
    variant,
    browserVersion,
    userAgent,
    heapBefore,
    heapAfterTyping,
    heapAfter,
    noEditSaveCompatibility,
    typing,
    scenarios,
    domEditorCountAfterCycles: await page.locator(".ProseMirror").count(),
  };
  } finally {
    await cdp.detach();
    await context.close();
    await browser.close();
  }
}

const rows = [];
for (const size of sizes) {
  for (let pair = 0; pair < pairs; pair += 1) {
    const order = pair % 2 === 0 ? ["baseline", "candidate"] : ["candidate", "baseline"];
    for (const variant of order) rows.push({ pair: pair + 1, order, result: await runOne(size, variant) });
  }
}

if (args.get("compatibility-only") === "true") {
  process.stdout.write(`${JSON.stringify({
    harness: "notebook-tiptap3-no-edit-save-compatibility-smoke",
    status: "compatibility-smoke-only",
    validPerformanceBenchmark: false,
    phase,
    runtime: { browserVersions: [...new Set(rows.map(({ result }) => result.browserVersion))], processPolicy: "fresh Chromium process per variant" },
    parameters: { pairs, sizes, editCount, lifecycleCycles },
    results: rows.map(({ pair, result }) => ({ pair, ...result })),
    currentNotebookSha256: hash(currentSource),
    baselineNotebookSha256: hash(baselineSource),
  })}\n`);
  process.exit(0);
}

const report = {
  harness: "notebook-tiptap3-isolated-browser",
  status: "measured",
  phase,
  generatedAt: new Date().toISOString(),
  runtime: { browserVersions: [...new Set(rows.map(({ result }) => result.browserVersion))], contextPolicy: "fresh Chromium process, BrowserContext, and page per variant run" },
  elapsedSeconds: Number(process.hrtime.bigint() - harnessStartedAt) / 1e9,
  source: {
    currentNotebookSha256: hash(currentSource),
    baselineNotebookSha256: hash(baselineSource),
    anchors: sourceAnchors.map(([name]) => name),
  },
  parameters: { pairs, editCount, lifecycleCycles, sizes },
  notes: [
    "Fixture bundles installed React 19 and installed Tiptap 3 packages; task node view and transaction helper are imported from the actual notebook source.",
    "Baseline and candidate reproduce the notebook onUpdate/save/cancel/external-refresh/read-only-task state paths in an isolated React fixture; they do not mount the full Homarr application.",
    "editCommandMs includes editor transaction plus synchronous React update scheduling. serializationMs times editor.getHTML only.",
    "serializedUtf16Units is a serialization-output count, not retained heap. CDP JSHeapUsedSize is sampled after forced GC and is an approximate renderer-wide retained-heap indicator.",
    "No whole-app CPU, latency, bundle, or memory claim follows from this fixture.",
  ],
  pairedSummary: sizes.flatMap((size) =>
    Array.from({ length: pairs }, (_, index) => {
      const pair = rows.filter((row) => row.pair === index + 1 && row.result.size === size);
      const baseline = pair.find((row) => row.result.variant === "baseline")?.result;
      const candidate = pair.find((row) => row.result.variant === "candidate")?.result;
      const summarize = (run) => {
        if (!run) return null;
        const commands = run.typing.durations;
        return {
          editCommandMs: { p50: percentile(commands, 50), p95: percentile(commands, 95) },
          updateSerializationMs: {
            p50: percentile(run.typing.snapshot.serializationMs, 50),
            p95: percentile(run.typing.snapshot.serializationMs, 95),
          },
          typedSerializationCalls: run.typing.snapshot.serializationCalls,
          typedSerializedUtf16Units: run.typing.snapshot.serializedUtf16Units,
          retainedHeapBytesAfterGc: run.heapAfter.JSHeapUsedSize,
          retainedHeapDeltaDuringTypingBytesAfterGc:
            run.heapAfterTyping.JSHeapUsedSize - run.heapBefore.JSHeapUsedSize,
          retainedHeapDeltaAfterCyclesBytesAfterGc:
            run.heapAfter.JSHeapUsedSize - run.heapBefore.JSHeapUsedSize,
          finalHtmlUtf8Bytes: run.scenarios.finalHtmlUtf8Bytes,
          editorInstancesCreated: run.scenarios.finalSnapshot.editorInstancesCreated,
          editorInstancesDestroyed: run.scenarios.finalSnapshot.editorInstancesDestroyed,
          domEditorCount: run.domEditorCountAfterCycles,
        };
      };
      return {
        size,
        pair: index + 1,
        order: pair[0]?.order,
        baseline: summarize(baseline),
        candidate: summarize(candidate),
      };
    }),
  ),
  runs: rows,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
