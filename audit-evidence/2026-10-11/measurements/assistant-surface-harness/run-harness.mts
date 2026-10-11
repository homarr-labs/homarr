import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright";

const harnessRoot = import.meta.dirname;
const args = process.argv.slice(2);
const isWorker = args.includes("--worker");
const getArg = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1] ?? fallback;
};
if (!isWorker && args.includes("--paired")) {
  for (let pair = 1; pair <= 9; pair += 1) {
    for (const mode of ["baseline", "live"]) {
      const workerArgs = ["--import", "tsx", import.meta.filename, "--worker", "--mode", mode, "--pair", String(pair)];
      if (pair === 1) workerArgs.push("--snapshot");
      const result = spawnSync(process.execPath, workerArgs, {
        cwd: process.cwd(), stdio: "inherit",
        env: { ...process.env, ASSISTANT_SURFACE_SOURCE_MODE: mode },
      });
      if (result.status !== 0) throw new Error(`${mode} pair ${pair} failed with status ${result.status}`);
    }
  }
  process.exit(0);
}
if (!isWorker && args.includes("--followup")) {
  for (const mode of ["baseline", "live"]) {
    const workerArgs = ["--import", "tsx", import.meta.filename, "--worker", "--mode", mode, "--pair", "outside-focus", "--outside-focus", "--snapshot"];
    const result = spawnSync(process.execPath, workerArgs, {
      cwd: process.cwd(), stdio: "inherit",
      env: { ...process.env, ASSISTANT_SURFACE_SOURCE_MODE: mode },
    });
    if (result.status !== 0) throw new Error(`${mode} outside-focus follow-up failed with status ${result.status}`);
  }
  process.exit(0);
}
const mode = getArg("--mode", process.env.ASSISTANT_SURFACE_SOURCE_MODE ?? "baseline");
const pair = getArg("--pair", "baseline-only");
const takeSnapshots = args.includes("--snapshot");
const outsideFocus = args.includes("--outside-focus");
if (mode !== "baseline" && mode !== "live") throw new Error(`Unknown source mode: ${mode}`);
const outputDirectory = `/tmp/homarr-assistant-surface-harness/${mode}/pair-${pair}`;
const startedAt = performance.now();
process.env.ASSISTANT_SURFACE_SOURCE_MODE = mode;
const server = await createServer({ configFile: `${harnessRoot}/vite.config.mts` });
await server.listen();

const serverUrl = server.resolvedUrls?.local[0];
if (!serverUrl) throw new Error("Vite did not expose the local audit harness URL");

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Runtime.enable");
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.enable");
  await page.goto(serverUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.auditReady === "true");
  const browserVersion = browser.version();
  const sourceMetadata = await page.evaluate(() =>
    (window as Window & { __assistantSurfaceSourceMetadata?: { sourceMode: string; sourcePath: string; sourceHash: string } })
      .__assistantSurfaceSourceMetadata,
  );
  if (sourceMetadata?.sourceMode !== mode) throw new Error(`Selected source mismatch: ${JSON.stringify(sourceMetadata)}`);

  await mkdir(outputDirectory, { recursive: true });
  const samples: Record<string, unknown>[] = [];
  const counts = [1, 10, 50];
  const waitForFrames = () => page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });

const forcedGc = async () => {
  await cdp.send("HeapProfiler.collectGarbage");
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
};

const findSentinelShallowGraphBytes = (snapshotText: string, heapObjectId: string) => {
  const snapshot = JSON.parse(snapshotText) as {
    snapshot: { meta: { node_fields: string[]; node_types: Array<string[]>; edge_fields: string[]; edge_types: Array<string[]> } };
    nodes: number[];
    edges: number[];
    strings: string[];
  };
  const nodeFields = snapshot.snapshot.meta.node_fields;
  const edgeFields = snapshot.snapshot.meta.edge_fields;
  const nodeStride = nodeFields.length;
  const edgeStride = edgeFields.length;
  const idField = nodeFields.indexOf("id");
  const selfSizeField = nodeFields.indexOf("self_size");
  const edgeCountField = nodeFields.indexOf("edge_count");
  const edgeTypeField = edgeFields.indexOf("type");
  const edgeNameField = edgeFields.indexOf("name_or_index");
  const edgeTargetField = edgeFields.indexOf("to_node");
  const nodeTypes = snapshot.snapshot.meta.node_types[0] ?? [];
  const edgeTypes = snapshot.snapshot.meta.edge_types[0] ?? [];
  let targetNodeIndex = -1;
  let payloadSentinelEdge = -1;
  for (let offset = 0; offset < snapshot.nodes.length; offset += nodeStride) {
    if (String(snapshot.nodes[offset + idField]) === heapObjectId) targetNodeIndex = offset / nodeStride;
  }
  if (targetNodeIndex < 0) return null;

  const edgeStarts: number[] = [];
  let edgeCursor = 0;
  for (let offset = 0; offset < snapshot.nodes.length; offset += nodeStride) {
    edgeStarts.push(edgeCursor);
    edgeCursor += snapshot.nodes[offset + edgeCountField];
  }

  const payloadOffset = targetNodeIndex * nodeStride;
  const payloadEdgeBegin = edgeStarts[targetNodeIndex] * edgeStride;
  const payloadEdgeEnd = payloadEdgeBegin + snapshot.nodes[payloadOffset + edgeCountField] * edgeStride;
  for (let edgeOffset = payloadEdgeBegin; edgeOffset < payloadEdgeEnd; edgeOffset += edgeStride) {
    const edgeType = edgeTypes[snapshot.edges[edgeOffset + edgeTypeField]];
    const edgeName = snapshot.strings[snapshot.edges[edgeOffset + edgeNameField]];
    if (edgeType !== "property" || edgeName !== "sentinel") continue;
    payloadSentinelEdge = edgeOffset;
    break;
  }
  if (payloadSentinelEdge < 0) return null;

  const sentinelOffset = snapshot.edges[payloadSentinelEdge + edgeTargetField];
  const sentinelIndex = sentinelOffset / nodeStride;
  const retainedStringNodes = new Set<number>();
  const collectStringTree = (nodeIndex: number) => {
    if (retainedStringNodes.has(nodeIndex)) return;
    const nodeOffset = nodeIndex * nodeStride;
    const nodeType = nodeTypes[snapshot.nodes[nodeOffset]];
    if (nodeType !== "string") return;
    retainedStringNodes.add(nodeIndex);
    const start = edgeStarts[nodeIndex] * edgeStride;
    const end = start + snapshot.nodes[nodeOffset + edgeCountField] * edgeStride;
    for (let edgeOffset = start; edgeOffset < end; edgeOffset += edgeStride) {
      collectStringTree(snapshot.edges[edgeOffset + edgeTargetField] / nodeStride);
    }
  };
  collectStringTree(sentinelIndex);
  const retainedStringBytes = [...retainedStringNodes].reduce(
    (total, nodeIndex) => total + snapshot.nodes[nodeIndex * nodeStride + selfSizeField],
    0,
  );
  return snapshot.nodes[payloadOffset + selfSizeField] + retainedStringBytes;
};

  const snapshot = async (label: string) => {
    const state = await page.evaluate(() => {
      const audit = (window as Window & { __assistantSurfaceAudit?: { state(): { lastFocusedSurfaceElement: HTMLElement | null }; weakTargets: WeakRef<HTMLElement>[] } })
        .__assistantSurfaceAudit;
      return Boolean(audit?.state().lastFocusedSurfaceElement ?? audit?.weakTargets.some((reference) => reference.deref()));
    });
    let targetHeapObjectId: string | null = null;
    if (state) {
      const remote = await cdp.send("Runtime.evaluate", {
        expression: "(() => { const audit = window.__assistantSurfaceAudit; const focused = audit.state().lastFocusedSurfaceElement; const weakTarget = [...audit.weakTargets].reverse().map((reference) => reference.deref()).find(Boolean); return (focused ?? weakTarget)?.__auditPayload; })()",
        returnByValue: false,
      });
      const objectId = remote.result.objectId;
      if (objectId) {
        targetHeapObjectId = (await cdp.send("HeapProfiler.getHeapObjectId", { objectId })).heapSnapshotObjectId;
        await cdp.send("Runtime.releaseObject", { objectId });
      }
    }

    const chunks: string[] = [];
    const onChunk = ({ chunk }: { chunk: string }) => chunks.push(chunk);
    cdp.on("HeapProfiler.addHeapSnapshotChunk", onChunk);
    await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false, captureNumericValue: false });
    cdp.off("HeapProfiler.addHeapSnapshotChunk", onChunk);
    const snapshotText = chunks.join("");
    const retainedSentinelBytes = targetHeapObjectId ? findSentinelShallowGraphBytes(snapshotText, targetHeapObjectId) : null;
    const snapshotPath = `${outputDirectory}/assistant-surface-${label}.heapsnapshot`;
    await writeFile(snapshotPath, snapshotText);
    return {
      snapshotPath,
      snapshotBytes: Buffer.byteLength(snapshotText),
      targetHeapObjectId,
      retainedSentinelShallowGraphBytes: retainedSentinelBytes,
    };
  };

  const sample = async (label: string, completedCycles: number) => {
    await forcedGc();
    const [dom, metrics, weakReferences, state, focusState] = await Promise.all([
      cdp.send("Memory.getDOMCounters"),
      cdp.send("Performance.getMetrics"),
      page.evaluate(() => {
        const audit = (window as Window & { __assistantSurfaceAudit?: { weakTargets: WeakRef<HTMLTextAreaElement>[] } })
          .__assistantSurfaceAudit;
        return audit?.weakTargets.map((reference) => reference.deref() !== undefined) ?? [];
      }),
      page.evaluate(() => {
        const audit = (window as Window & {
          __assistantSurfaceAudit?: {
            state(): { surfaceIds: string[]; lastFocusedSurfaceElement: HTMLElement | null; lastFocusedSurfaceAt: number };
          };
        }).__assistantSurfaceAudit;
        const current = audit?.state();
        return {
          surfaceIds: current?.surfaceIds ?? [],
          retainedFocusElementConnected: current?.lastFocusedSurfaceElement?.isConnected ?? null,
          retainedFocusElementTag: current?.lastFocusedSurfaceElement?.tagName ?? null,
        };
      }),
      page.evaluate(() => {
        const active = document.activeElement;
        const outside = document.querySelector("[data-audit-outside-focus]");
        return {
          activeElementTag: active?.tagName ?? null,
          outsideButtonIsActive: active === outside,
          activeElementIsDetachedTarget: active?.matches("[data-audit-target]") && !active.isConnected,
        };
      }),
    ]);
    const isFollowupSample = label === "after-neutral-render-outside-focus";
    const heap = takeSnapshots && completedCycles === 50 && (!outsideFocus || isFollowupSample)
      ? await snapshot(label)
      : null;
    const value = {
      label,
      completedCycles,
      elapsedSeconds: Number(((performance.now() - startedAt) / 1000).toFixed(3)),
      domCounters: dom,
      jsHeapUsedSize: metrics.metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value ?? null,
      weakTargetsStillAlive: weakReferences.filter(Boolean).length,
      weakTargetsCollected: weakReferences.filter((value) => !value).length,
      weakTargetCount: weakReferences.length,
      narrowReferenceState: state,
      documentFocusState: focusState,
      heapSnapshot: heap,
    };
    samples.push(value);
    console.log(JSON.stringify(value));
  };

  await page.evaluate(() => {
    const audit = (window as Window & {
      __assistantSurfaceAudit?: { mountTarget(cycle: number): void; removeTarget(cycle: number): void; weakTargets: WeakRef<HTMLTextAreaElement>[] };
    }).__assistantSurfaceAudit;
    if (!audit) throw new Error("Assistant lifecycle harness did not initialize");
    audit.weakTargets.length = 0;
  });
  await sample("cycle-0", 0);

  let cycle = 0;
  for (const requestedCount of counts) {
    while (cycle < requestedCount) {
      cycle += 1;
      await page.evaluate((number) => {
        const audit = (window as Window & {
          __assistantSurfaceAudit?: { mountTarget(cycle: number): void };
        }).__assistantSurfaceAudit;
        audit?.mountTarget(number);
      }, cycle);
      await waitForFrames();
      await page.evaluate((number) => {
        const audit = (window as Window & {
          __assistantSurfaceAudit?: { weakTargets: WeakRef<HTMLTextAreaElement>[] };
        }).__assistantSurfaceAudit;
        const target = document.querySelector<HTMLTextAreaElement>(`[data-audit-target="${number}"]`);
        if (!audit || !target) throw new Error(`Missing target for cycle ${number}`);
        audit.weakTargets.push(new WeakRef(target));
        target.focus();
      }, cycle);
      await page.evaluate((number) => {
        const target = document.querySelector<HTMLTextAreaElement>(`[data-audit-target="${number}"]`);
        const audit = (window as Window & {
          __assistantSurfaceAudit?: { state(): { lastFocusedSurfaceElement: HTMLElement | null } };
        }).__assistantSurfaceAudit;
        if (!target || audit?.state().lastFocusedSurfaceElement !== target) {
          throw new Error(`The actual boundary did not record focus for cycle ${number}`);
        }
      }, cycle);
      await page.evaluate((number) => {
        const audit = (window as Window & { __assistantSurfaceAudit?: { removeTarget(cycle: number): void } }).__assistantSurfaceAudit;
        audit?.removeTarget(number);
      }, cycle);
      await waitForFrames();
      // No other assistant surface is focused after target removal.
    }
    await sample(`cycle-${requestedCount}`, requestedCount);
  }

  if (outsideFocus) {
    await page.evaluate(() => {
      const audit = (window as Window & { __assistantSurfaceAudit?: { commitNeutralRender(): void } }).__assistantSurfaceAudit;
      audit?.commitNeutralRender();
    });
    await waitForFrames();
    const outsideFocusResult = await page.evaluate(() => {
      const outsideButton = document.querySelector<HTMLButtonElement>("[data-audit-outside-focus]");
      if (!outsideButton) throw new Error("Missing outside-assistant focus target");
      outsideButton.focus();
      return {
        activeElementTag: document.activeElement?.tagName ?? null,
        outsideButtonIsActive: document.activeElement === outsideButton,
        activeElementIsDetachedTarget: document.activeElement?.matches("[data-audit-target]") && !document.activeElement.isConnected,
      };
    });
    if (!outsideFocusResult.outsideButtonIsActive) throw new Error(`Outside focus failed: ${JSON.stringify(outsideFocusResult)}`);
    await waitForFrames();
    await sample("after-neutral-render-outside-focus", 50);
  }

  const focusOwnership = await page.evaluate(async () => {
    const audit = (window as Window & {
    __assistantSurfaceAudit?: { mountTarget(cycle: number): void; removeTarget(cycle: number): void; emitRunStart(): void; state(): { lastFocusedSurfaceElement: HTMLElement | null } };
    }).__assistantSurfaceAudit;
    const survivor = document.querySelector<HTMLTextAreaElement>("[data-audit-survivor-input]");
    if (!audit || !survivor) throw new Error("Missing focus ownership test elements");
    audit.mountTarget(9001);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const target = document.querySelector<HTMLTextAreaElement>('[data-audit-target="9001"]');
    if (!target) throw new Error("Missing active focus-preservation target");
    target.focus();
    audit.emitRunStart();
    survivor.focus();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const focusWasRestored = document.activeElement === target;
    audit.mountTarget(9002);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const otherTarget = document.querySelector<HTMLTextAreaElement>('[data-audit-target="9002"]');
    if (!otherTarget) throw new Error("Missing second-boundary target");
    otherTarget.focus();
    const otherBoundaryOwnedReference = audit.state().lastFocusedSurfaceElement === otherTarget;
    audit.removeTarget(9001);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const referenceSurvivesDifferentBoundaryUnmount = audit.state().lastFocusedSurfaceElement === otherTarget;
    audit.removeTarget(9002);
    return { focusWasRestored, otherBoundaryOwnedReference, referenceSurvivesDifferentBoundaryUnmount };
  });
  if (
    !focusOwnership.focusWasRestored ||
    !focusOwnership.otherBoundaryOwnedReference ||
    !focusOwnership.referenceSurvivesDifferentBoundaryUnmount
  ) {
    throw new Error(`Focus ownership behavior regressed: ${JSON.stringify(focusOwnership)}`);
  }

  const result = {
    protocol: "assistant-surface-retained-dom-v2",
    sourceMode: mode,
    sourcePath: sourceMetadata.sourcePath,
    sourceHash: sourceMetadata.sourceHash,
    browserVersion,
    pair,
    focusOwnership,
    samples,
    notes: [
      "The focused element, module globals, boundary, and focus-preserver component are AST-extracted from the explicitly selected baseline or live source; esbuild/Vite compiles JSX without transforming component logic.",
      "Only assistant-ui hooks, translations, and notifications unrelated to DOM ownership are stubbed.",
      "The synthetic element carries a 512 KiB ASCII calibration string. Snapshot measurement of this string is a controlled retention sentinel, not an estimate of production DOM size.",
      "DOM counters, weak references, a narrow read of the actual module reference, CDP JSHeapUsedSize, and heap snapshots are reported independently. Samples are timestamped by console order; no slow user-agent memory API is called.",
      "Every worker launches a separate Chromium process. Nine paired runs alternate baseline then live and write raw snapshots only under /tmp.",
    ],
  };
  const summary = { ...result, samples: result.samples.map(({ heapSnapshot, ...sample }) => ({ ...sample, heapSnapshot: heapSnapshot ? { snapshotBytes: heapSnapshot.snapshotBytes, targetHeapObjectId: heapSnapshot.targetHeapObjectId, retainedSentinelShallowGraphBytes: heapSnapshot.retainedSentinelShallowGraphBytes } : null })) };
  const summaryPath = `${harnessRoot}/summary-${mode}-${pair}.json`;
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Wrote summary ${summaryPath}; raw heap snapshots are in ${outputDirectory}`);
} finally {
  await browser.close();
  await server.close();
}
