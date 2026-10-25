import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .toSorted()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
};
const canonicalDigest = (value) => digest(JSON.stringify(canonical(value)));

function stats(samples) {
  assert(samples.length > 0 && samples.every((value) => Number.isFinite(value) && value >= 0));
  const sorted = samples.toSorted((left, right) => left - right);
  return {
    samples: sorted.length,
    medianMs: sorted[Math.floor(sorted.length * 0.5)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
  };
}

export async function summarize(directory) {
  const load = async (path) => JSON.parse(await readFile(join(directory, path), "utf8"));
  const jsonl = async (path) =>
    (await readFile(join(directory, path), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
  const provenance = await load("provenance.json");
  assert.equal(provenance.baselineCommit, "c72a2e02b03c734b3a393914b5e99881e27e86d2");
  assert.equal(provenance.candidateCommit, "4ed24e5ac4ff1726e187d4ea3677e2f7979e3691");
  const originalSources = new Map(provenance.sources.map((entry) => [entry.path, entry]));
  for (const input of provenance.inputs) {
    const bytes = await readFile(join(directory, input.path));
    assert.equal(digest(bytes), input.packagedSha256, input.path);
    assert.equal(bytes.length, input.bytes, input.path);
    assert(input.sources.every((path) => originalSources.has(path)));
    if (input.byteIdentical) {
      assert.equal(input.packagedSha256, originalSources.get(input.sources[0]).originalSha256);
    }
  }
  if (process.env.EVIDENCE_SOURCE) {
    for (const input of provenance.sources) {
      const bytes = await readFile(join(process.env.EVIDENCE_SOURCE, input.path));
      assert.equal(digest(bytes), input.originalSha256, input.path);
      assert.equal(bytes.length, input.bytes, input.path);
    }
  }
  let archiveBytes = 0;
  let archiveFiles = 0;
  async function scan(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) await scan(full);
      else {
        assert(entry.isFile());
        const bytes = await readFile(full);
        const text = bytes.toString("utf8");
        assert(!/\/(?:Users|private\/var|var\/folders)\//u.test(text), full);
        assert(!/inheritedEnvironmentValueSha256|(?:authorization|x-api-key)\s*["']?\s*:/iu.test(text), full);
        assert(!/\b(?:sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{16,})/u.test(text), full);
        archiveBytes += bytes.length;
        archiveFiles++;
      }
    }
  }
  await scan(directory);
  const snapshots = await load("sources/snapshots.json");
  assert.equal(snapshots.length, 58);
  for (const side of ["baseline", "candidate"]) {
    const state = await load(`sources/${side}.json`);
    const expected = provenance.sourceStability.roots[side];
    assert.equal(canonicalDigest(state), expected.canonicalMapSha256);
    assert.equal(canonicalDigest(state.files), expected.originalFileMapSha256);
    assert.equal(Object.keys(state.files).length, expected.fileEntries);
    assert.equal(Object.values(state.files).filter((value) => value.sha256).length, expected.hashedFileEntries);
    assert.equal(Object.values(state.files).filter((value) => value.missing).length, expected.missingFileEntries);
    assert.equal(state.installedPackageManifestSha256, expected.installedPackageManifestSha256);
    assert.equal(state.installedPackageCount, expected.installedPackageCount);
    assert.equal(state.status, "");
    assert.deepEqual(state.packageErrors, []);
    for (const snapshot of snapshots) {
      assert.equal(snapshot.originalSha256, originalSources.get(snapshot.source).originalSha256);
      for (const root of snapshot.roots.filter((entry) => entry.side === side))
        assert.equal(root.canonicalMapSha256, expected.canonicalMapSha256);
    }
  }
  const invocations = await load("invocations.json");
  assert.equal(invocations.length, 29);
  assert.equal(new Set(invocations.map((entry) => entry.key)).size, 29);
  for (const entry of invocations) {
    assert(entry.sourceStable && entry.nodeStable);
    assert.equal(entry.nodeSha256Before, provenance.nodeSha256);
    assert.equal(entry.nodeSha256After, provenance.nodeSha256);
    assert.equal(entry.nodeVersion, "v24.22.1");
    assert.equal(entry.environmentOverrides.ROOT, entry.canonicalRoot);
    assert.equal(entry.cwd, entry.canonicalRoot);
    for (const path of entry.sourceSnapshots) assert(snapshots.some((snapshot) => snapshot.source === path));
    if (entry.key.startsWith("recovery-1-runtime-v2-")) {
      assert.deepEqual(entry.command.slice(0, 2), ["<node-24.22.1>", "--expose-gc"]);
      assert.equal(entry.exitCode, 0);
      assert(entry.preflight.passed);
      assert.equal(entry.preflight.stdout, "function");
    }
  }
  assert.equal(invocations.filter((entry) => entry.classification === "excluded").length, 6);
  assert.equal(invocations.filter((entry) => entry.classification === "excluded-failed-attempt").length, 1);
  assert.equal(invocations.filter((entry) => entry.classification === "excluded-preflight-failure").length, 1);
  const assertions = await load("assertions.json");
  for (const [key, value] of Object.entries(assertions.validity)) {
    if (key.endsWith("Claims")) assert.equal(value, false);
    else assert.equal(value, true);
  }
  assert(assertions.cleanupVerified);
  assert.deepEqual(assertions.browserOrder, [
    "baseline pair 1",
    "candidate pair 1",
    "baseline pair 2",
    "candidate pair 2",
  ]);
  assert.deepEqual(assertions.browserControl.viewport.command, [
    "agent-browser",
    "set",
    "viewport",
    "1440",
    "1000",
    "1",
  ]);
  assert.deepEqual(assertions.browserControl.colorScheme.command, ["agent-browser", "set", "media", "light"]);
  let numericSamples = 0;
  function recorded(samples, median, p95) {
    const value = stats(samples);
    assert.equal(value.medianMs, median);
    assert.equal(value.p95Ms, p95);
    numericSamples += samples.length;
  }
  const output = {
    baseline: provenance.baselineCommit,
    candidate: provenance.candidateCommit,
    percentile: "Pooled raw samples, sorted[floor(n * percentile)]; counted-run timings excluded",
    verifiedEvidenceFiles: provenance.inputs.length,
    archiveFiles,
    archiveBytes,
    runtime: {},
    router: {},
    response: {},
    management: {},
    workbench: {},
  };
  for (const side of ["baseline", "candidate"]) {
    const gate = await load(`runtime/verification-${side}.json`);
    assert.equal(gate.expectedNames.length, 32);
    assert.equal(new Set(gate.expectedNames).size, 32);
    assert(Object.values(gate.checks).every((value) => value === true));
    assert(gate.validForCounterClaims);
    const runs = await Promise.all(
      ["pair1-timed", "pair2-timed", "counts"].map((run) =>
        jsonl(`runtime/recovery-1-runtime-v2-${side}-${run}.jsonl`),
      ),
    );
    for (const run of runs) {
      assert.deepEqual(
        run.map((entry) => entry.name),
        gate.expectedNames,
      );
      for (const entry of run) {
        if (entry.ms) recorded(entry.ms.samples, entry.ms.median, entry.ms.p95);
        if (entry.counts) assert(Object.values(entry.counts).every((value) => Number.isInteger(value) && value >= 0));
      }
      assert.equal(run.find((entry) => entry.name === "publication-scope-validation").passed, 3);
      assert.equal(run.find((entry) => entry.name === "confirmation-callback-freshness").passed, 1);
      assert.equal(run.find((entry) => entry.name === "sanitize-memory").payloadBytes, 225511);
    }
    const counted = new Map(runs[2].map((entry) => [entry.name, entry]));
    assert.equal(counted.get("sanitize-2000-rows").counts.sanitizeVisits, 4801500);
    assert(counted.get("adapter-stable-parent").counts.displayRenders > 0);
    assert(counted.get("renderer-options-only").counts.rendererRenders > 0);
    const board = counted.get("board-20-stable-parent");
    assert.equal(board.updates, 10);
    assert.equal(board.counts.displayRenders, 200);
    for (const key of ["rendererRenders", "bindings", "evaluations"])
      assert.equal(board.counts[key] ?? 0, side === "baseline" ? 200 : 0);
    output.runtime[side] = Object.fromEntries(
      runs[0]
        .filter((entry) => entry.ms)
        .map((entry) => [
          entry.name,
          {
            pooled: stats(runs.slice(0, 2).flatMap((run) => run.find((item) => item.name === entry.name).ms.samples)),
            counts: counted.get(entry.name).counts ?? {},
          },
        ]),
    );
    output.runtime[side].observations = runs[2].filter((entry) => !entry.ms);
    const oldGate = await load(`rejected/verification-${side}.json`);
    assert.equal(oldGate.actualRecords, 31);
    assert.equal(oldGate.validForCounterClaims, false);
    assert.equal(oldGate.checks.expectedScenarioRecords, false);
    for (const run of ["pair1-timed", "pair2-timed", "counts"]) {
      const rejected = await jsonl(`rejected/runtime-${side}-${run}.jsonl`);
      assert.equal(rejected.length, 31);
      assert(!rejected.some((entry) => entry.name === "sanitize-memory"));
      assert.deepEqual(
        rejected.map((entry) => entry.name),
        gate.expectedNames.filter((name) => name !== "sanitize-memory"),
      );
    }
  }
  const server = {};
  for (const lane of ["router", "response", "management"]) {
    server[lane] = {};
    for (const side of ["baseline", "candidate"]) {
      const runs = await Promise.all([1, 2].map((pair) => load(`server/server-${lane}-${side}-pair${pair}.json`)));
      server[lane][side] = runs;
      for (const run of runs) {
        assert.equal(run.results.length, { router: 15, response: 6, management: 3 }[lane]);
        if (lane !== "management") assert(Object.values(run.checks).every((value) => value === true));
        assert.equal(new Set(run.results.map((entry) => entry.name)).size, run.results.length);
        for (const result of run.results) {
          recorded(result.samples, result.p50, result.p95);
          if (result.operations) {
            assert.equal(result.operations.length, result.samples.length);
            for (const operation of result.operations)
              assert(Object.values(operation).every((value) => Number.isInteger(value) && value >= 0));
          }
        }
      }
      assert.deepEqual(
        runs[0].results.map((entry) => entry.name),
        runs[1].results.map((entry) => entry.name),
      );
      output[lane][side] = Object.fromEntries(
        runs[0].results.map((entry) => {
          const matching = runs.map((run) => run.results.find((item) => item.name === entry.name));
          const operations = matching.flatMap((item) => item.operations ?? []);
          return [
            entry.name,
            {
              pooled: stats(matching.flatMap((item) => item.samples)),
              operationValues: Object.fromEntries(
                Object.keys(operations[0] ?? {}).map((key) => [
                  key,
                  [...new Set(operations.map((operation) => operation[key]))].toSorted((left, right) => left - right),
                ]),
              ),
            },
          ];
        }),
      );
      for (const mode of ["cold", "warm"]) {
        if (lane !== "router") continue;
        for (const kind of ["direct", "integration"]) {
          const result = output.router[side][`${kind}-20-${mode}`];
          assert.deepEqual(result.operationValues.reads, [
            side === "baseline" ? { direct: 23, integration: 63 }[kind] : { direct: 3, integration: 4 }[kind],
          ]);
          assert.deepEqual(result.operationValues.decrypts, [side === "baseline" ? 20 : 1]);
        }
      }
    }
  }
  output.management.publicDigests = {};
  for (const [index, pair] of ["pair1", "pair2"].entries()) {
    const parity = assertions.managementParity[pair];
    assert(parity.sameOperationSet && parity.publicOutputParity);
    output.management.publicDigests[pair] = {};
    for (const [name, reads, beforeBytes, afterBytes] of [
      ["get-8192-byte-secret", 1, 16711, 242],
      ["list-20-legacy", 2, 2641534, 1654],
      ["available-legacy", 3, 131467, 276],
    ]) {
      const before = server.management.baseline[index].results.find((entry) => entry.name === name);
      const after = server.management.candidate[index].results.find((entry) => entry.name === name);
      assert.equal(before.digest, after.digest);
      assert.equal(before.digest, parity.operations[name].baselineDigest);
      assert.equal(after.digest, parity.operations[name].candidateDigest);
      assert(parity.operations[name].publicDigestParity);
      assert(before.operations.every((operation) => operation.reads === reads && operation.bytes === beforeBytes));
      assert(after.operations.every((operation) => operation.reads === reads && operation.bytes === afterBytes));
      output.management.publicDigests[pair][name] = before.digest;
    }
  }
  const signatures = [];
  for (const [side, label] of [
    ["baseline", "before"],
    ["candidate", "after"],
  ]) {
    const runs = await Promise.all([1, 2].map((pair) => load(`workbench/browser-${label}${pair}.json`)));
    for (const run of runs) {
      signatures.push(digest(run.completions.signature));
      assert.equal(run.response.samples.length, 20);
      assert.equal(run.response.counts.tree ?? 0, side === "baseline" ? 25 : 0);
      assert.equal(run.response.counts.treeNodes ?? 0, side === "baseline" ? 5025 : 0);
      for (const key of ["response", "editor", "openedReference", "completions"])
        numericSamples += run[key].samples.length;
    }
    output.workbench[side] = Object.fromEntries(
      ["response", "editor", "openedReference", "completions"].map((key) => [
        key,
        {
          pooled: stats(runs.flatMap((run) => run[key].samples)),
          counts: runs.map((run) => run[key].counts),
        },
      ]),
    );
  }
  assert.equal(new Set(signatures).size, 1);
  output.workbench.completionSignatureSha256 = signatures[0];
  output.rawNumericSamples = numericSamples;
  output.integrity = { fullSnapshotComparisons: 58, uniqueInvocations: 29, excludedAttempts: 8, privacyScan: "passed" };
  if (provenance.inputs.some((input) => input.path === "summary.json")) {
    const { archiveFiles: files, archiveBytes: bytes, verifiedEvidenceFiles: verified, ...statistics } = output;
    assert(files > 0 && bytes > 0 && verified > 0);
    assert.deepEqual(await load("summary.json"), statistics);
    assert.equal(archiveFiles, provenance.inputs.length + 1);
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  console.log(
    JSON.stringify(
      await summarize(resolve(process.env.EVIDENCE ?? join(import.meta.dirname, "evidence/final-4ed24e5ac"))),
      null,
      2,
    ),
  );
}
