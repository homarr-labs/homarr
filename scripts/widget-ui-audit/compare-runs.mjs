import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const root = resolve(process.argv[2] ?? "tools/widget-ui-report/public");
const beforeName = process.argv[3] ?? "before";
const afterName = process.argv[4] ?? "after";
const before = JSON.parse(await readFile(join(root, "runs", beforeName, "manifest.json")));
const after = JSON.parse(await readFile(join(root, "runs", afterName, "manifest.json")));
try {
  after.reviewSummary = JSON.parse(await readFile(join(root, "runs", afterName, "review-summary.json")));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (process.argv[5]) {
  after.changedWidgets = process.argv[5].split(",").filter(Boolean);
  for (const kind of after.changedWidgets) {
    if (!after.widgets.some((widget) => widget.id === kind)) throw new Error(`Unknown changed widget: ${kind}`);
  }
}
const comparisons = [];
for (const widget of after.widgets) {
  const oldWidget = before.widgets.find((entry) => entry.id === widget.id);
  for (const size of after.sizes) {
    for (const viewport of after.viewports) {
      const previous = oldWidget?.screenshots?.[size]?.[viewport.id];
      const current = widget.screenshots?.[size]?.[viewport.id];
      const entry = { widget: widget.id, size, viewport: viewport.id, comparable: false, changed: false };
      if (previous?.path && current?.path) {
        const hash = async (run, path) =>
          createHash("sha256")
            .update(await readFile(join(root, "runs", run, path)))
            .digest("hex");
        entry.beforeHash = await hash(beforeName, previous.path);
        entry.afterHash = await hash(afterName, current.path);
        entry.comparable =
          previous.captureOutcome === "ready" &&
          current.captureOutcome === "ready" &&
          before.fixtureRevision === after.fixtureRevision;
        entry.changed = entry.comparable && entry.beforeHash !== entry.afterHash;
      }
      comparisons.push(entry);
    }
  }
}
function prefixPaths(value, prefix) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      ["path", "screenshot", "boardScreenshot"].includes(key) &&
      typeof child === "string" &&
      child.startsWith("screenshots/")
    )
      value[key] = `${prefix}/${child}`;
    else prefixPaths(child, prefix);
  }
}
prefixPaths(before, `runs/${beforeName}`);
prefixPaths(after, `runs/${afterName}`);
const comparison = {
  before,
  after,
  comparisons,
  summary: {
    total: comparisons.length,
    comparable: comparisons.filter((entry) => entry.comparable).length,
    changed: comparisons.filter((entry) => entry.changed).length,
  },
  note: "Image differences include dynamic data and timestamps; they are not proof of improvement. Failed captures cannot be approved as visual improvements.",
};
await writeFile(join(root, "comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`);
console.log(JSON.stringify(comparison.summary));
