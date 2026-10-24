import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve(process.env.EVIDENCE ?? `${import.meta.dirname}/evidence`);
const load = async (path) => JSON.parse(await readFile(`${directory}/${path}`, "utf8"));
const provenance = await load("provenance.json");
for (const input of provenance.inputs) {
  const content = await readFile(`${directory}/${input.path}`);
  assert.equal(createHash("sha256").update(content).digest("hex"), input.packagedSha256, input.path);
}

function stats(samples) {
  const sorted = samples.toSorted((left, right) => left - right);
  return {
    samples: sorted.length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
  };
}

const output = { provenance, runtime: {}, router: {}, redaction: {}, management: {}, workbench: {} };
for (const label of ["before", "after"]) {
  const samples = [];
  for (const run of [1, 2]) {
    const result = await load(`runtime/${label}-${run}.jsonl`);
    samples.push(...result.ms.samples);
  }
  const counted = await load(`runtime/${label}-counts.jsonl`);
  output.runtime[label] = { ...stats(samples), counts: counted.counts, countedUpdates: counted.updates };
  output.router[label] = [];
  for (const run of [2, 3]) {
    const { results } = await load(`server/router-${label}-${run}.json`);
    for (const result of results) {
      assert(
        result.operations.every(
          (entry) => entry.reads === result.operations[0].reads && entry.decrypts === result.operations[0].decrypts,
        ),
      );
      output.router[label].push({ run, name: result.name, ...stats(result.samples), operations: result.operations[0] });
    }
  }
  output.redaction[label] = [];
  output.management[label] = [];
  output.workbench[label] = [];
  for (const run of [1, 2]) {
    for (const result of (await load(`server/response-${label}-${run}.json`)).results) {
      output.redaction[label].push({ run, name: result.name, bytes: result.bytes, ...stats(result.samples) });
    }
    for (const result of (await load(`server/management-${label}-${run}.json`)).results) {
      assert(
        result.operations.every(
          (entry) => entry.bytes === result.operations[0].bytes && entry.reads === result.operations[0].reads,
        ),
      );
      output.management[label].push({
        run,
        name: result.name,
        ...stats(result.samples),
        operations: result.operations[0],
        publicOutputSha256: result.digest,
      });
    }
    const { response, responseInitial } = await load(`workbench/browser-${label}${run}.json`);
    output.workbench[label].push({
      run,
      ...stats(response.samples),
      counts: response.counts,
      responseInitial,
      countedUpdates: 25,
    });
  }
}
for (const before of output.management.before) {
  const after = output.management.after.find((result) => result.run === before.run && result.name === before.name);
  assert.equal(before.publicOutputSha256, after.publicOutputSha256);
}
console.log(
  JSON.stringify(
    {
      verifiedEvidenceFiles: provenance.inputs.length,
      baseline: provenance.baselineCommit,
      runtime: output.runtime,
      router: output.router,
      redaction: output.redaction,
      management: output.management,
      workbench: output.workbench,
    },
    null,
    2,
  ),
);
