import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { basename } from "node:path";

const output = resolve(process.argv[2] ?? "tools/widget-ui-report/public");
function sourceFingerprint() {
  try {
    return createHash("sha256")
      .update(execFileSync("git", ["diff", "HEAD", "--", "packages/widgets", "apps/nextjs"], { encoding: "utf8" }))
      .digest("hex");
  } catch (error) {
    if (error.status === 0 && typeof error.stdout === "string")
      return createHash("sha256").update(error.stdout).digest("hex");
    return "unavailable";
  }
}
function sourceRevision() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch (error) {
    const value = String(error.stdout ?? "").trim();
    if (/^[a-f0-9]{40}$/.test(value)) return value;
    return "unavailable";
  }
}
const source = resolve("packages/db/migrations/widget-ui-audit/families");
const locale = JSON.parse(await readFile("packages/translation/src/lang/en.json", "utf8"));
const sizes = ["1x1", "1x2", "2x1", "2x2", "2x3", "3x2", "3x3", "5x3", "3x5", "5x5"];
const viewports = [
  { id: "desktop-1080p", label: "1080p desktop", width: 1920, height: 1080, scale: 1 },
  { id: "desktop-1440p", label: "1440p desktop", width: 2560, height: 1440, scale: 1 },
  { id: "macbook-pro", label: "MacBook Pro", width: 1512, height: 982, scale: 2 },
];
const integrationNames = {
  coolify: "Coolify",
  paperlessNgx: "Paperless-ngx",
  patchmon: "PatchMon",
  bazarr: "Bazarr",
  tracearr: "Tracearr",
  uptimeKuma: "Uptime Kuma",
  traefik: "Traefik",
};
const boards = [];
const widgets = [];
const errors = [];
const supplementalBoards = [];
const provenance = [];
for (const file of (await readdir(source)).sort()) {
  if (file === "index.ts" || !file.endsWith(".ts")) continue;
  const text = await readFile(join(source, file), "utf8");
  const id = text.match(/id: "([^"]+)"/)?.[1];
  const name = text.match(/name: "([^"]+)"/)?.[1];
  const description = text.match(/description: "([^"]+)"/)?.[1];
  const kinds = [...(text.match(/kinds: \[([^\]]+)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  if (!id || !name || !kinds.length) throw new Error(`Invalid family definition: ${file}`);
  boards.push({
    id,
    name,
    family: name,
    description,
    role: `family_${id.replaceAll("-", "_")}`,
    widgets: kinds,
    screenshots: {},
  });
  for (const kind of kinds) {
    widgets.push({
      id: kind,
      name: integrationNames[kind] ?? locale.widget[kind]?.name ?? kind,
      family: name,
      role: `family_${id.replaceAll("-", "_")}`,
      screenshots: {},
    });
  }
}
await mkdir(output, { recursive: true });
const fragments = (await readdir(output))
  .filter((name) => /^manifest-.+\.json$/.test(name))
  .sort((a, b) => Number(a.includes("assistant-isolated")) - Number(b.includes("assistant-isolated")));
const fragmentRecords = await Promise.all(
  fragments.map(async (file) => ({ file, fragment: JSON.parse(await readFile(join(output, file), "utf8")) })),
);
const matchedRun = fragmentRecords.some(({ fragment }) =>
  ["runId", "sourceRevision", "sourceFingerprint", "fixtureRevision"].every((field) => Boolean(fragment[field])),
);
for (const { fragment } of fragmentRecords) {
  provenance.push({
    runId: fragment.runId,
    sourceRevision: fragment.sourceRevision,
    sourceFingerprint: fragment.sourceFingerprint,
    fixtureRevision: fragment.fixtureRevision,
  });
  const isolated = fragment.family === "assistant-isolated";
  const family = boards.find((board) => board.id === fragment.family || (isolated && board.id === "home"));
  if (!family) {
    errors.push(`Unrecognized fragment family: ${fragment.family}`);
    continue;
  }
  if (matchedRun && (!fragment.authenticated || fragment.screenshotMethod !== "native-viewport-full-board-crop")) {
    errors.push(`${family.name}: capture needs regeneration with authenticated, corrected screenshot tooling`);
    continue;
  }
  for (const board of fragment.boards ?? []) {
    if (isolated) supplementalBoards.push(board);
    if (!isolated) {
      family.url = board.url;
      family.capturedAt = fragment.generatedAt;
      family.browserVersion = fragment.browserVersion ?? "not recorded";
      family.screenshotMethod = fragment.screenshotMethod;
    }
    for (const viewport of board.viewports ?? []) {
      let expectedCount = family.widgets.length * sizes.length;
      if (isolated) expectedCount = 1;
      if (viewport.widgetCount !== expectedCount || viewport.widgets?.length !== expectedCount) {
        errors.push(
          `${family.name}/${viewport.id}: incomplete board capture (${viewport.widgetCount ?? 0}/${expectedCount} widgets)`,
        );
        continue;
      }
      const id = { "1080p": "desktop-1080p", "2k": "desktop-1440p" }[viewport.id] ?? viewport.id;
      if (matchedRun && viewport.readiness?.outcome !== "ready")
        errors.push(`${family.name}/${id}: capture is not ready (${viewport.readiness?.outcome ?? "unverified"})`);
      if (!isolated)
        family.screenshots[id] = {
          path: viewport.boardScreenshot,
          status: matchedRun && viewport.readiness?.outcome !== "ready" ? "failed" : "ok",
          captureOutcome: viewport.readiness?.outcome ?? "unverified",
          state: "captured",
          note: `${viewport.errorCount ?? 0} widget error markers; ${viewport.overlaps?.length ?? 0} grid overlaps`,
          evidence: { ...viewport, widgets: undefined },
        };
      for (const capture of viewport.widgets ?? []) {
        const widget = widgets.find((entry) => entry.id === capture.kind);
        if (!widget) {
          errors.push(`Unknown captured widget: ${capture.kind}`);
          continue;
        }
        const size = `${capture.w}x${capture.h}`;
        widget.screenshots[size] ??= {};
        const captureOutcome = capture.captureOutcome ?? "unverified";
        let state = "mounted";
        if (capture.loading || capture.skeletons > 0) state = "loading";
        if (capture.error) state = "error";
        if (!capture.ready && !capture.error) state = "unconfirmed";
        widget.screenshots[size][id] = {
          path: capture.screenshot,
          status: matchedRun && captureOutcome !== "ready" ? "failed" : "ok",
          captureOutcome,
          issues: capture.issues ?? [],
          state,
          note: capture.text ?? capture.textSample ?? "",
          evidence: capture,
        };
      }
      if (viewport.overlaps?.length) errors.push(`${family.name}/${id}: ${viewport.overlaps.length} grid overlaps`);
    }
  }
}
if (matchedRun) {
  const isolatedFragment = fragmentRecords.find(({ fragment }) => fragment.family === "assistant-isolated")?.fragment;
  const isolatedBoards = isolatedFragment?.boards ?? [];
  const expectedIsolatedBoards = new Set(sizes.map((size) => `widget-ui-audit-assistant-${size}`));
  if (!isolatedFragment) errors.push("Missing isolated Assistant capture fragment");
  if (isolatedBoards.length !== sizes.length)
    errors.push(`Incomplete isolated Assistant board set (${isolatedBoards.length}/${sizes.length} boards)`);
  const isolatedNames = new Set(isolatedBoards.map((board) => board.name));
  for (const name of expectedIsolatedBoards)
    if (!isolatedNames.has(name)) errors.push(`Missing isolated Assistant board: ${name}`);
  for (const board of isolatedBoards) {
    const viewportsById = new Map((board.viewports ?? []).map((viewport) => [viewport.id, viewport]));
    if (viewportsById.size !== viewports.length) errors.push(`Incomplete isolated Assistant viewports: ${board.name}`);
    for (const viewport of viewports) {
      const captured = viewportsById.get(viewport.id);
      if (!captured) {
        errors.push(`Missing isolated Assistant viewport: ${board.name}/${viewport.id}`);
        continue;
      }
      if (captured.readiness?.outcome !== "ready")
        errors.push(`Isolated Assistant capture not ready: ${board.name}/${viewport.id}`);
    }
  }
}
const reviews = [];
for (const board of boards) {
  try {
    const notes = await readFile(`scripts/widget-ui-audit/findings/${board.id}.md`, "utf8");
    reviews.push({ family: board.name, notes });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const manifest = {
  generatedAt: new Date().toISOString(),
  gridColumns: 12,
  viewports,
  sizes,
  boards,
  supplementalBoards,
  widgets,
  errors,
  reviews,
  methodology:
    "Chromium on Linux at the specified desktop and MacBook viewports; this is not native Safari coverage. Existing demo and public-source fixtures. A captured file does not establish visual correctness. Mounted state means the widget wrapper mounted; query data may still be loading.",
};
if (matchedRun) {
  manifest.sourceRevision = sourceRevision();
  manifest.runId = basename(output);
  manifest.sourceFingerprint = sourceFingerprint();
  manifest.fixtureRevision = createHash("sha256")
    .update(await readFile("packages/db/migrations/widget-ui-audit/fixtures.ts"))
    .update(await readFile("packages/db/migrations/widget-ui-audit/index.ts"))
    .digest("hex");
}
for (const field of ["runId", "sourceRevision", "sourceFingerprint", "fixtureRevision"]) {
  const values = [...new Set(provenance.map((entry) => entry[field]).filter(Boolean))];
  if (values.length === 1) manifest[field] = values[0];
  if (values.length > 1) {
    manifest[field] = "mixed";
    errors.push(`Mixed capture provenance: ${field}`);
  }
}
manifest.captureOutcome = "ready";
manifest.failedCaptures = widgets.flatMap((widget) =>
  Object.entries(widget.screenshots).flatMap(([size, screens]) =>
    Object.entries(screens)
      .filter(([, capture]) => capture.status === "failed" || (matchedRun && capture.captureOutcome !== "ready"))
      .map(([viewport, capture]) => ({ widget: widget.id, size, viewport, issues: capture.issues })),
  ),
);
const captureCount = widgets.flatMap((widget) => Object.values(widget.screenshots).flatMap(Object.values)).length;
if (
  errors.length ||
  manifest.failedCaptures.length ||
  captureCount !== widgets.length * sizes.length * viewports.length
)
  manifest.captureOutcome = "failed";
await writeFile(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      widgets: widgets.length,
      boards: boards.length,
      captures: widgets.flatMap((widget) => Object.values(widget.screenshots).flatMap((size) => Object.values(size)))
        .length,
      errors,
    },
    null,
    2,
  ),
);
