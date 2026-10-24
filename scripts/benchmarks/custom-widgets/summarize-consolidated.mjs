import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve(process.env.EVIDENCE ?? `${import.meta.dirname}/evidence/consolidated`);
const load = async (path) => JSON.parse(await readFile(`${directory}/${path}`, "utf8"));
const jsonl = async (path) =>
  (await readFile(`${directory}/${path}`, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const provenance = await load("provenance.json");
for (const input of provenance.inputs) {
  assert.equal(digest(await readFile(`${directory}/${input.path}`)), input.packagedSha256, input.path);
}
if (process.env.EVIDENCE_SOURCE) {
  for (const source of provenance.sources) {
    assert.equal(
      digest(await readFile(`${process.env.EVIDENCE_SOURCE}/${source.path}`)),
      source.originalSha256,
      source.path,
    );
  }
}

function stats(samples) {
  assert(samples.length > 0 && samples.every((value) => typeof value === "number" && Number.isFinite(value)));
  const sorted = samples.toSorted((left, right) => left - right);
  return {
    samples: sorted.length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
  };
}

function recorded(samples, median, p95) {
  const result = stats(samples);
  assert.equal(result.medianMs, median);
  assert.equal(result.p95Ms, p95);
  return result;
}

const output = {
  baseline: provenance.baselineCommit,
  candidate: provenance.candidateCommit,
  verifiedEvidenceFiles: provenance.inputs.length,
  percentile: "sorted[floor(n * percentile)]",
  runtime: {},
  router: {},
  redaction: {},
  management: "Excluded: source changed during measurement; requires a source-stable rerun after prompt finalization",
  workbench: {},
};
let rawSamples = 0;
let runtimeOrder;
for (const side of ["baseline", "candidate"]) {
  const runs = await Promise.all([1, 2, "counts"].map((run) => jsonl(`runtime/${side}-${run}.jsonl`)));
  for (const run of runs) {
    if (!runtimeOrder) runtimeOrder = run.map((record) => record.name);
    assert.deepEqual(
      run.map((record) => record.name),
      runtimeOrder,
    );
    assert.equal(run.length, 32);
    for (const record of run) {
      if (record.ms) {
        recorded(record.ms.samples, record.ms.median, record.ms.p95);
        rawSamples += record.ms.samples.length;
      }
      if (record.name === "publication-scope-validation") assert.equal(record.passed, 3);
      if (record.name === "confirmation-callback-freshness") assert.equal(record.passed, 1);
    }
  }
  output.runtime[side] = {
    timings: runs[0]
      .filter((record) => record.ms)
      .map((record) => {
        const timed = runs.slice(0, 2).map((run) => run.find((entry) => entry.name === record.name));
        const counted = runs[2].find((entry) => entry.name === record.name);
        return {
          name: record.name,
          pooled: stats(timed.flatMap((entry) => entry.ms.samples)),
          runs: timed.map((entry) => stats(entry.ms.samples)),
          counts: counted.counts,
        };
      }),
    observations: runs[2].filter((record) => !record.ms),
  };
}
for (const [name, lane] of [
  ["router", "router"],
  ["response", "redaction"],
]) {
  for (const side of ["before", "after"]) {
    const runs = await Promise.all([1, 2].map((run) => load(`server/${name}-${side}-${run}.json`)));
    for (const run of runs) {
      assert(Object.values(run.checks).every((value) => value === true));
      for (const result of run.results) {
        recorded(result.samples, result.p50, result.p95);
        rawSamples += result.samples.length;
        if (result.operations) assert.equal(result.operations.length, result.samples.length);
      }
    }
    output[lane][side] = runs[0].results.map((result) => {
      const matching = runs.map((run) => run.results.find((entry) => entry.name === result.name));
      const operations = matching.flatMap((entry) => entry.operations ?? []);
      const operationValues = {};
      for (const key of Object.keys(operations[0] ?? {})) {
        operationValues[key] = [...new Set(operations.map((entry) => entry[key]))].toSorted(
          (left, right) => left - right,
        );
      }
      return {
        name: result.name,
        pooled: stats(matching.flatMap((entry) => entry.samples)),
        runs: matching.map((entry) => stats(entry.samples)),
        operationValues,
      };
    });
  }
}
const signatures = [];
for (const side of ["before", "after"]) {
  const runs = await Promise.all([1, 2].map((run) => load(`workbench/browser-${side}${run}.json`)));
  for (const run of runs) {
    signatures.push(digest(run.completions.signature));
    for (const key of ["response", "editor", "openedReference", "completions"]) rawSamples += run[key].samples.length;
  }
  output.workbench[side] = {
    timings: Object.fromEntries(
      ["response", "editor", "openedReference", "completions"].map((key) => [
        key,
        {
          pooled: stats(runs.flatMap((run) => run[key].samples)),
          runs: runs.map((run) => ({ ...stats(run[key].samples), counts: run[key].counts })),
        },
      ]),
    ),
    observations: runs.map(({ initial, responseInitial, form }) => ({ initial, responseInitial, form })),
  };
}
assert.equal(new Set(signatures).size, 1);
output.workbench.completionSignatureSha256 = signatures[0];
output.rawNumericSamples = rawSamples;
console.log(JSON.stringify(output, null, 2));
