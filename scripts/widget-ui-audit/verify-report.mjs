import { readFile, stat } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { dirname, resolve, relative, isAbsolute } from "node:path";

const manifestPath = resolve(process.argv[2] ?? "tools/widget-ui-report/public/manifest.json");
const root = dirname(manifestPath);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const registry = await readFile(new URL("../../packages/definitions/src/widget.ts", import.meta.url), "utf8");
const kinds = [...registry.split("] as const")[0].matchAll(/"([^"\n]+)"/g)].map((match) => match[1]);
const sizes = ["1x1", "1x2", "2x1", "2x2", "2x3", "3x2", "3x3", "5x3", "3x5", "5x5"];
const viewportSpecs = [
  { id: "desktop-1080p", width: 1920, scale: 1 },
  { id: "desktop-1440p", width: 2560, scale: 1 },
  { id: "macbook-pro", width: 1512, scale: 2 },
];
const viewports = viewportSpecs.map(({ id }) => id);
const viewportById = new Map(viewportSpecs.map((viewport) => [viewport.id, viewport]));
const issues = [];
const paths = new Set();
let verified = 0;
const matchedRun = ["runId", "sourceRevision", "sourceFingerprint", "fixtureRevision"].every((field) => Boolean(manifest[field]));

async function checkCapture(raw, label, scale = 1, expectedDimensions) {
  const path = typeof raw === "string" ? raw : raw?.path;
  if (!path) {
    issues.push(`${label}: missing capture`);
    return;
  }
  const fullPath = resolve(root, path.replace(/^\.\//, ""));
  const localPath = relative(root, fullPath);
  if (localPath.startsWith("..") || isAbsolute(localPath)) {
    issues.push(`${label}: path leaves report directory`);
    return;
  }
  if (paths.has(fullPath)) issues.push(`${label}: screenshot path reused`);
  paths.add(fullPath);
  if (matchedRun && (typeof raw !== "object" || raw?.captureOutcome !== "ready" || raw?.status !== "ok"))
    issues.push(`${label}: capture is not ready`);
  try {
    const metadata = await stat(fullPath);
    const bytes = await readFile(fullPath);
    if (!metadata.isFile() || bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      issues.push(`${label}: invalid PNG`);
      return;
    }
    if (bytes.readUInt32BE(16) === 0 || bytes.readUInt32BE(20) === 0) {
      issues.push(`${label}: empty image dimensions`);
      return;
    }
    const rect = raw?.evidence?.rect;
    if (
      rect &&
      (Math.abs(bytes.readUInt32BE(16) - rect.width * scale) > 3 ||
        Math.abs(bytes.readUInt32BE(20) - rect.height * scale) > 3)
    )
      issues.push(`${label}: PNG dimensions do not match the rendered widget and device scale`);
    const expectedWidth = expectedDimensions?.width;
    if (expectedWidth && Math.abs(bytes.readUInt32BE(16) - expectedWidth) > 3)
      issues.push(`${label}: PNG width does not match the manifest viewport width and device scale`);
    if (isUniformPng(bytes)) issues.push(`${label}: uniform-color image requires inspection`);
    verified++;
  } catch (error) {
    issues.push(`${label}: ${error.code ?? error.message}`);
  }
}

const widgets = manifest.widgets ?? [];
if (new Set(widgets.map((widget) => widget.id)).size !== widgets.length) issues.push("Duplicate widget IDs");
for (const widget of widgets) {
  if (!kinds.includes(widget.id)) issues.push(`Unexpected widget: ${widget.id}`);
}
for (const kind of kinds) {
  const widget = widgets.find((entry) => entry.id === kind);
  for (const size of sizes) {
    for (const viewport of viewports) {
      let scale = 1;
      if (viewport === "macbook-pro") scale = 2;
      await checkCapture(widget?.screenshots?.[size]?.[viewport], `${kind}/${size}/${viewport}`, scale);
    }
  }
}
const widgetCaptures = verified;
for (const board of manifest.boards ?? []) {
  for (const viewport of viewports) {
    const spec = viewportById.get(viewport);
    await checkCapture(
      board.screenshots?.[viewport],
      `board/${board.id}/${viewport}`,
      spec?.scale ?? 1,
      spec ? { width: spec.width * spec.scale } : undefined,
    );
    checkGeometry(board.screenshots?.[viewport]?.evidence?.readiness?.widgets, `board/${board.id}/${viewport}`);
  }
}
for (const board of manifest.supplementalBoards ?? []) {
  for (const viewport of board.viewports ?? []) {
    const spec = viewportById.get(viewport.id);
    await checkCapture(
      {
        path: viewport.boardScreenshot,
        status: viewport.readiness?.outcome === "ready" ? "ok" : "failed",
        captureOutcome: viewport.readiness?.outcome,
      },
      `isolated-board/${board.name}/${viewport.id}`,
      spec?.scale ?? 1,
      spec ? { width: spec.width * spec.scale } : undefined,
    );
    checkGeometry(viewport.readiness?.widgets, `isolated-board/${board.name}/${viewport.id}`);
    if (
      matchedRun &&
      (viewport.readiness?.outcome !== "ready" ||
        viewport.widgetCount !== 1 ||
        viewport.widgets?.length !== 1 ||
        viewport.widgets?.[0]?.kind !== "assistant" ||
        viewport.widgets?.[0]?.captureOutcome !== "ready")
    )
      issues.push(`Invalid isolated Assistant board: ${board.name}/${viewport.id}`);
  }
}
if (matchedRun) {
  const expectedNames = new Set(sizes.map((size) => `widget-ui-audit-assistant-${size}`));
  const supplemental = manifest.supplementalBoards ?? [];
  if (supplemental.length !== sizes.length) issues.push(`Incomplete isolated Assistant board set (${supplemental.length}/${sizes.length})`);
  const names = new Set(supplemental.map((board) => board.name));
  for (const name of expectedNames) if (!names.has(name)) issues.push(`Missing isolated Assistant board: ${name}`);
  for (const board of supplemental) {
    const viewportIds = new Set((board.viewports ?? []).map((viewport) => viewport.id));
    for (const viewport of viewports) if (!viewportIds.has(viewport)) issues.push(`Missing isolated Assistant viewport: ${board.name}/${viewport}`);
  }
  if (manifest.captureOutcome !== "ready") issues.push(`Manifest capture outcome is ${manifest.captureOutcome ?? "unverified"}`);
  if (manifest.failedCaptures?.length) issues.push(`Manifest contains ${manifest.failedCaptures.length} failed captures`);
}
const result = {
  expectedWidgetTypes: kinds.length,
  expectedWidgetCaptures: kinds.length * sizes.length * viewports.length,
  verifiedWidgetCaptures: widgetCaptures,
  boards: manifest.boards?.length ?? 0,
  verifiedBoardCaptures: verified - widgetCaptures,
  issues,
  captureOutcome: manifest.captureOutcome ?? "unverified",
  failedCaptures: manifest.failedCaptures ?? [],
  scope: "PNG integrity, matrix completeness, geometry, and recorded readiness; this does not assert visual approval or live integration correctness.",
};
console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exitCode = 1;

function checkGeometry(entries, label) {
  if (!Array.isArray(entries)) {
    if (matchedRun) issues.push(`${label}: missing widget geometry`);
    return;
  }
  const rectangles = entries.flatMap((entry) => {
    const geometry = entry.geometry;
    if (!Array.isArray(geometry) || geometry.length !== 4 || geometry.some((value) => typeof value !== "number")) return [];
    return [{ id: entry.id ?? "unknown", x: geometry[0], y: geometry[1], width: geometry[2], height: geometry[3] }];
  });
  for (let index = 0; index < rectangles.length; index++) {
    const left = rectangles[index];
    for (const right of rectangles.slice(index + 1)) {
      const horizontal = Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x);
      const vertical = Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y);
      if (horizontal > 0.5 && vertical > 0.5)
        issues.push(`${label}: widget rectangles overlap (${left.id}, ${right.id})`);
    }
  }
}

function isUniformPng(bytes) {
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const colorType = bytes[25];
  if (bytes[24] !== 8 || bytes[28] !== 0 || ![2, 6].includes(colorType)) return false;
  let channels = 3;
  if (colorType === 6) channels = 4;
  const chunks = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString("ascii", offset + 4, offset + 8) === "IDAT")
      chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  let previous = Buffer.alloc(stride);
  let first;
  for (let y = 0; y < height; y++) {
    const row = Buffer.allocUnsafe(stride);
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      let left = 0;
      let upperLeft = 0;
      if (x >= channels) {
        left = row[x - channels];
        upperLeft = previous[x - channels];
      }
      const up = previous[x];
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const p = left + up - upperLeft;
        const a = Math.abs(p - left),
          b = Math.abs(p - up),
          c = Math.abs(p - upperLeft);
        predictor = upperLeft;
        if (a <= b && a <= c) predictor = left;
        else if (b <= c) predictor = up;
      }
      row[x] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
      if (x % channels === channels - 1) {
        const pixel = row.subarray(x - channels + 1, x + 1);
        if (!first) first = Buffer.from(pixel);
        else if (!pixel.equals(first)) return false;
      }
    }
    previous = row;
  }
  return true;
}
