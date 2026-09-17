#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createBrowserCapture } from "./browser-capture.mjs";
import { waitForCaptureReadiness } from "./readiness.mjs";

const DEFAULT_VIEWPORTS = [
  { id: "desktop-1080p", label: "1080p desktop", width: 1920, height: 1080, scale: 1 },
  { id: "desktop-1440p", label: "2k desktop", width: 2560, height: 1440, scale: 1 },
  { id: "macbook-pro", label: "MacBook Pro", width: 1512, height: 982, scale: 2 },
];

const DEFAULT_SIZES = ["1x1", "1x2", "2x1", "2x2", "2x3", "3x2", "3x3", "5x3", "3x5", "5x5"];

const usage = () => {
  console.error(`Usage: capture.mjs --board <name-or-url> [options]

Options:
  --base-url <url>       Homarr origin (default: http://localhost:3000)
  --board <value>        Board name or URL; repeat for multiple boards
  --family <name>        Family label written to the manifest
  --out <directory>      Output directory (default: tools/widget-ui-report/public)
  --session <name>       Isolated agent-browser session name
  --viewport <id>        Recapture one viewport in an existing authenticated fragment
  --expected-count <n>   Required mounted widget count per board
  --settle-ms <number>   Wait for fixture data after mounting (default: 1500, max: 30000)
  --username <name>      Login username (default: demo)
  --password <value>     Login password (default: demo)
  --no-login             Skip the login attempt
  --keep-open            Keep the browser session open after capture
  --help                 Show this help

Screenshots are emitted under <out>/screenshots/<family>/<viewport>/.
The generated manifest is <out>/manifest-<family>.json.`);
};

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const values = (name) => args.flatMap((value, index) => (value === name ? [args[index + 1]] : []));

if (args.includes("--help")) {
  usage();
  process.exit(0);
}

const boards = values("--board");
if (boards.length === 0) {
  usage();
  process.exit(2);
}

const baseUrl = (option("--base-url", "http://localhost:3000") ?? "").replace(/\/$/, "");
const family = option("--family", "unassigned");
const outputDir = resolve(option("--out", "tools/widget-ui-report/public"));
const session = option("--session", `widget-ui-audit-${family}`);
const username = option("--username", "demo");
const password = option("--password", "demo");
const shouldLogin = !args.includes("--no-login");
const viewportFilter = option("--viewport", null);
const settleMs = Number(option("--settle-ms", "1500"));
if (!Number.isFinite(settleMs) || settleMs < 0 || settleMs > 30000) throw new Error("Invalid settle delay");
const captureViewports = DEFAULT_VIEWPORTS.filter((viewport) => !viewportFilter || viewport.id === viewportFilter);
if (captureViewports.length === 0) throw new Error(`Unknown viewport: ${viewportFilter}`);

const sanitize = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unnamed";

const run = (commandArgs, { allowFailure = false } = {}) => {
  const result = spawnSync(process.env.AGENT_BROWSER_BIN ?? "agent-browser", ["--session", session, ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, AGENT_BROWSER_SESSION: session, AGENT_BROWSER_ARGS: "--no-sandbox" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `agent-browser ${commandArgs.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout.trim();
};

const cropScreenshots = (source, captures, scale) => {
  const commands = [source];
  for (const capture of captures) {
    const { rect } = capture;
    const x = Math.max(0, Math.round(rect.x * scale));
    const y = Math.max(0, Math.round(rect.y * scale));
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));
    const target = join(outputDir, capture.screenshot);
    commands.push(
      "(",
      "+clone",
      "-crop",
      `${width}x${height}+${x}+${y}`,
      "+repage",
      "-write",
      `PNG24:${target}`,
      "+delete",
      ")",
    );
  }
  commands.push("null:");
  const result = spawnSync("convert", commands, { cwd: process.cwd(), encoding: "utf8" });
  if (result.status !== 0) throw new Error(`convert crop failed (${result.status}): ${result.stderr || result.stdout}`);
};

const imageSize = (path) => {
  const result = spawnSync("identify", ["-format", "%w %h", path], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`identify failed (${result.status}): ${result.stderr || result.stdout}`);
  const [width, height] = result.stdout.trim().split(/\s+/).map(Number);
  return { width, height };
};

const evaluate = (script) => {
  const encoded = Buffer.from(script).toString("base64");
  const output = run(["eval", "--base64", encoded, "--json"]);
  try {
    const parsed = JSON.parse(output);
    return parsed?.data?.result ?? parsed?.result ?? parsed;
  } catch {
    throw new Error(`Could not parse browser evaluation result: ${output}`);
  }
};

const loginIfNeeded = () => {
  if (!shouldLogin) return false;
  const loginPresent = evaluate(`Boolean(document.querySelector('#username') && document.querySelector('#password'))`);
  if (!loginPresent) return false;
  run([
    "wait",
    "--fn",
    `(() => { const form = document.querySelector('#username')?.closest('form'); return Boolean(form && Object.keys(form).some((key) => key.startsWith('__reactProps'))); })()`,
  ]);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    run(["fill", "#username", username]);
    run(["fill", "#password", password]);
    run(["click", 'button[type="submit"][value="credentials"]']);
    run(["wait", "--fn", "!document.querySelector('#username')"], { allowFailure: true });
    if (!evaluate(`Boolean(document.querySelector('#username') && document.querySelector('#password'))`)) return true;
  }
  return false;
};

const waitForSurface = () =>
  run(
    [
      "wait",
      "--fn",
      `Boolean(document.querySelector('#username') || document.querySelector('[data-grid-item-type="item"]'))`,
    ],
    { allowFailure: true },
  );

const buildBoardUrl = (value) => {
  if (/^https?:\/\//i.test(value)) return value;
  const path = value === "/" ? "/boards" : `/boards/${encodeURIComponent(value.replace(/^\/+/, ""))}`;
  return `${baseUrl}${path}`;
};

const readWidgets = (read = evaluate) =>
  read(`(() => {
    const all = [...document.querySelectorAll('[data-grid-item-type="item"]')];
    const rect = (element) => { const value = element.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; };
    return all.map((element, index) => {
      const section = element.closest('[data-grid-section-id]');
      const ready = element.querySelector('[data-homarr-widget-ready]');
      const error = element.querySelector('[data-homarr-widget-error]');
      const loadingElements = element.querySelectorAll('[aria-busy="true"], [class*="skeleton" i], [class*="mantine-loader" i]');
      const errorText = error?.innerText.slice(0, 240) ?? null;
      return {
        index,
        id: element.getAttribute('data-grid-item-id'),
        kind: element.getAttribute('data-kind'),
        type: element.getAttribute('data-grid-item-type'),
        sectionId: section?.getAttribute('data-grid-section-id') ?? null,
        x: Number(element.getAttribute('data-grid-x')),
        y: Number(element.getAttribute('data-grid-y')),
        w: Number(element.getAttribute('data-grid-w')),
        h: Number(element.getAttribute('data-grid-h')),
        ready: ready?.getAttribute('data-homarr-widget-ready') ?? null,
        error: Boolean(error),
        errorText,
        loading: loadingElements.length > 0,
        loadingCount: loadingElements.length,
        text: element.innerText.slice(0, 160),
        rect: rect(element),
      };
    });
  })()`);

const overlapDiagnostics = (widgets) => {
  const bySection = new Map();
  for (const widget of widgets) {
    const key = widget.sectionId ?? "root";
    const bucket = bySection.get(key) ?? [];
    bucket.push(widget);
    bySection.set(key, bucket);
  }
  const overlaps = [];
  for (const [sectionId, bucket] of bySection) {
    for (let leftIndex = 0; leftIndex < bucket.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < bucket.length; rightIndex += 1) {
        const left = bucket[leftIndex];
        const right = bucket[rightIndex];
        if (
          left.x < right.x + right.w &&
          left.x + left.w > right.x &&
          left.y < right.y + right.h &&
          left.y + left.h > right.y
        ) {
          overlaps.push({ sectionId, left: left.id, right: right.id });
        }
      }
    }
  }
  return overlaps;
};

const capture = async () => {
  await mkdir(join(outputDir, "screenshots"), { recursive: true });
  const runInfoPath = join(outputDir, "run-info.json");
  try {
    await writeFile(
      runInfoPath,
      JSON.stringify({ runId: `${outputDir.split("/").at(-1)}-${randomUUID()}`, startedAt: new Date().toISOString() }),
      { flag: "wx" },
    );
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const runInfo = JSON.parse(await readFile(runInfoPath, "utf8"));
  const manifest = {
    version: 1,
    runId: runInfo.runId,
    sourceRevision: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
    sourceFingerprint: createHash("sha256")
      .update(spawnSync("git", ["diff", "HEAD", "--", "packages/widgets", "apps/nextjs"], { encoding: "utf8" }).stdout)
      .digest("hex"),
    fixtureRevision: createHash("sha256")
      .update(await readFile("packages/db/migrations/widget-ui-audit/fixtures.ts"))
      .update(await readFile("packages/db/migrations/widget-ui-audit/index.ts"))
      .digest("hex"),
    browserVersion: run(["--version"]),
    generatedAt: new Date().toISOString(),
    baseUrl,
    family,
    columns: 12,
    gridColumns: 12,
    sizes: DEFAULT_SIZES,
    viewports: DEFAULT_VIEWPORTS,
    boards: [],
  };

  const manifestPath = join(outputDir, `manifest-${sanitize(family)}.json`);
  let previous;
  if (viewportFilter) {
    previous = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!previous.authenticated || previous.screenshotMethod !== "native-viewport-full-board-crop") {
      throw new Error(
        "Single-viewport recapture requires an existing authenticated CDP capture; rerun the full family",
      );
    }
    for (const field of ["runId", "sourceRevision", "sourceFingerprint", "fixtureRevision"]) {
      if (!manifest[field] || previous[field] !== manifest[field]) {
        throw new Error(`Single-viewport recapture has different ${field}; capture a fresh run instead`);
      }
    }
    for (const board of boards) {
      const oldBoard = previous.boards.find((candidate) => candidate.name === board);
      if (
        !oldBoard ||
        DEFAULT_VIEWPORTS.some((viewport) => !oldBoard.viewports.some((entry) => entry.id === viewport.id))
      ) {
        throw new Error(`Previous capture is missing the board or its viewports: ${board}`);
      }
    }
  }

  if (shouldLogin) {
    run(["open", `${baseUrl}/auth/login`]);
    run(["wait", "--load", "domcontentloaded"], { allowFailure: true });
    waitForSurface();
    loginIfNeeded();
  }
  const authenticated = evaluate(
    `fetch('/api/auth/session').then((response) => response.json()).then((session) => Boolean(session.user))`,
  );
  if (!authenticated)
    throw new Error(`No authenticated demo session at ${baseUrl}; refusing anonymous primary captures`);
  manifest.authenticated = true;
  manifest.screenshotMethod = "native-viewport-full-board-crop";
  if (args.includes("--check-auth")) {
    console.log(JSON.stringify({ authenticated: true, origin: baseUrl }));
    return;
  }

  for (const board of boards) {
    const boardRecord = { name: board, url: buildBoardUrl(board), viewports: [] };
    // Live subscriptions can outlast the CLI navigation timeout. The explicit
    // grid/readiness checks below determine whether the board actually loaded.
    run(["open", boardRecord.url], { allowFailure: true });
    run(["wait", "--load", "domcontentloaded"], { allowFailure: true });
    waitForSurface();
    if (loginIfNeeded()) {
      run(["open", boardRecord.url]);
      waitForSurface();
    }
    const nativeCapture = await createBrowserCapture(run(["get", "cdp-url"]), boardRecord.url);
    try {
      for (const viewport of captureViewports) {
        await nativeCapture.viewport(viewport);
        await nativeCapture.reload();
        await nativeCapture.ready();
        await nativeCapture.evaluate(`(async () => {
          const step = Math.max(1, Math.floor(innerHeight * 0.8));
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
          scrollTo(0, 0);
          await document.fonts.ready;
        })()`);
        await new Promise((resolve) => setTimeout(resolve, settleMs));
        const mountedWidgets = await readWidgets(nativeCapture.evaluate);
        const expectedCount = Number(option("--expected-count", String(mountedWidgets.length)));
        const readiness = await waitForCaptureReadiness(nativeCapture.evaluate, expectedCount);
        const widgets = await readWidgets(nativeCapture.evaluate);
        if (widgets.length === 0)
          throw new Error(
            `No widget grid mounted for ${boardRecord.url} at ${viewport.id}; refusing to record a successful empty capture`,
          );
        const boardSlug = sanitize(board);
        const familySlug = sanitize(family);
        const viewportDir = join(outputDir, "screenshots", familySlug, viewport.id);
        await mkdir(viewportDir, { recursive: true });
        const prefix = `${familySlug}__${boardSlug}__${viewport.id}`;
        const boardPath = join(viewportDir, `${prefix}__board.png`);
        await nativeCapture.evaluate("window.scrollTo(0, 0)");
        await nativeCapture.screenshot(boardPath, viewport.width);
        await nativeCapture.evaluate("window.scrollTo(0, 0)");
        const boardImageSize = imageSize(boardPath);
        if (Math.abs(boardImageSize.width - viewport.width * viewport.scale) > 2)
          throw new Error(`Unexpected board screenshot density: ${boardImageSize.width}`);
        const refreshedWidgets = await readWidgets(nativeCapture.evaluate);
        const captures = [];
        for (const widget of widgets) {
          if (!widget.id) continue;
          const kindSlug = sanitize(widget.kind);
          const widgetPath = join(
            viewportDir,
            `${prefix}__${String(widget.index + 1).padStart(2, "0")}__${kindSlug}__${widget.w}x${widget.h}.png`,
          );
          const refreshed = refreshedWidgets.find((candidate) => candidate.id === widget.id) ?? widget;
          const issues = readiness.widgets.find((entry) => entry.id === widget.id)?.issues ?? ["missing-readiness"];
          if (!readiness.stable) issues.push("unstable-geometry");
          if (!readiness.fontsReady) issues.push("fonts-not-ready");
          if (!readiness.countMatches) issues.push("unexpected-widget-count");
          if (readiness.notifications.length) issues.push("visible-notification");
          captures.push({
            ...widget,
            ...refreshed,
            issues,
            captureOutcome: issues.length ? "failed" : "ready",
            screenshot: widgetPath.slice(outputDir.length + 1),
          });
        }
        cropScreenshots(boardPath, captures, viewport.scale);
        boardRecord.viewports.push({
          ...viewport,
          readiness,
          boardScreenshot: boardPath.slice(outputDir.length + 1),
          widgetCount: widgets.length,
          readyCount: captures.filter((widget) => widget.ready).length,
          errorCount: captures.filter((widget) => widget.error).length,
          loadingCount: captures.filter((widget) => widget.loading).length,
          overlaps: overlapDiagnostics(captures),
          widgets: captures,
        });
      }
    } finally {
      nativeCapture.close();
    }
    manifest.boards.push(boardRecord);
  }

  if (previous) {
    for (const board of manifest.boards) {
      const oldBoard = previous.boards.find((candidate) => candidate.name === board.name);
      if (!oldBoard) throw new Error(`No previous board capture for ${board.name}`);
      const updated = new Map(oldBoard.viewports.map((viewport) => [viewport.id, viewport]));
      for (const viewport of board.viewports) updated.set(viewport.id, viewport);
      board.viewports = DEFAULT_VIEWPORTS.map((viewport) => updated.get(viewport.id));
      if (board.viewports.some((viewport) => !viewport)) throw new Error("Previous capture is missing other viewports");
    }
  }
  if (previous) {
    const updatedBoards = new Map(manifest.boards.map((board) => [board.name, board]));
    manifest.boards = previous.boards.map((board) => updatedBoards.get(board.name) ?? board);
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        manifest: manifestPath,
        boards: manifest.boards.length,
        screenshots: manifest.boards
          .flatMap((board) => board.viewports)
          .reduce((count, viewport) => count + viewport.widgetCount + 1, 0),
      },
      null,
      2,
    ),
  );
};

capture()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (!args.includes("--keep-open")) run(["close"], { allowFailure: true });
  });
