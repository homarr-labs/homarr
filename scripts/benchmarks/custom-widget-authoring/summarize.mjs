import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const readArchive = async (name) =>
  JSON.parse(gunzipSync(await readFile(new URL(`./evidence/${name}.json.gz`, import.meta.url))));
const results = await readArchive("results");
const prompts = await readArchive("prompt-snapshots");
for (const [hash, text] of Object.entries(prompts)) {
  assert.equal(createHash("sha256").update(text).digest("hex"), hash);
}
const weights = {
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
for (const run of results.runs) {
  assert.ok(prompts[run.artifactSha256["system.md"]], run.id);
  const grading = run.artifacts["grading.json"];
  if (!grading?.judge || run.excluded) continue;
  const weighted = Math.round(
    Object.entries(weights).reduce((sum, [key, weight]) => sum + grading.judge.categories[key] * weight, 0) / 100,
  );
  assert.equal(grading.judge.weighted, weighted, run.id);
}
for (const summary of results.summaries) {
  const selected = results.runs.filter(
    (run) =>
      !run.excluded &&
      run.id.startsWith(`iter-${summary.iteration}/`) &&
      run.id.includes(`/${summary.variant}/`) &&
      run.caseId !== "seed-dispatcharr-channels",
  );
  assert.equal(selected.length, summary.runs);
  assert.equal(
    selected.reduce((sum, run) => sum + run.artifacts["grading.json"].judge.weighted, 0) / selected.length,
    summary.judgeMean,
  );
}
console.log(
  JSON.stringify(
    { archivedRuns: results.runs.length, promptSnapshots: Object.keys(prompts).length, summaries: results.summaries },
    null,
    2,
  ),
);
