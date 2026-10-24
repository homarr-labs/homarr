import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const source = process.env.EVIDENCE_SOURCE;
if (!source) throw new Error("EVIDENCE_SOURCE must point to the consolidated runtime/server/workbench directory");
const destination = resolve(process.env.OUTPUT ?? join(import.meta.dirname, "evidence/consolidated"));
const baseline = "c72a2e02b03c734b3a393914b5e99881e27e86d2";
const candidate = "1677c940ca76ad8b7562d5faefd8f591aae88873";
const digest = (value) => createHash("sha256").update(value).digest("hex");
const sources = new Map();
const inputs = [];
const expected = new Map();

async function original(path) {
  const content = await readFile(join(source, path), "utf8");
  sources.set(path, { path, originalSha256: digest(content) });
  return content;
}

const load = async (path) => JSON.parse(await original(path));
const runtimeStart = await load("runtime/source-hashes-start.json");
const environment = await load("runtime/environment.json");
const runs = await load("runtime/runs.json");
const replacements = [
  [dirname(runs[0].envOverrides.OUTPUT), "<output>"],
  [runtimeStart.roots.baseline.root, "<baseline>"],
  [runtimeStart.roots.candidate.root, "<candidate>"],
  [environment.execPath, "<node-24.22.1>"],
];

function portable(value) {
  let text = JSON.stringify(value);
  for (const [path, token] of replacements) text = text.replaceAll(path, token);
  assert(!/\/(?:Users|private\/var|var\/folders)\//.test(text), "Unselected machine-local path");
  return JSON.parse(text);
}

async function preserve(path, value, selection, sourcePaths) {
  const output = join(destination, path);
  await mkdir(join(output, ".."), { recursive: true });
  expected.set(path, value);
  let content = value;
  if (typeof value !== "string") content = `${JSON.stringify(portable(value), null, 2)}\n`;
  await writeFile(output, content);
  inputs.push({ path, selection, sources: sourcePaths });
}

for (const lane of ["runtime", "server", "workbench"]) {
  await original(`${lane}/RESULTS.md`);
  await original(`${lane}/summary.json`);
}
const runtimeHashes = await load("runtime/artifact-sha256.json");
for (const run of runs) {
  assert.equal(run.exitCode, 0);
  const path = `runtime/${run.rawStdout}`;
  const content = await original(path);
  assert.equal(digest(content), run.stdoutSha256);
  assert.equal(digest(content), runtimeHashes[run.rawStdout]);
  await preserve(
    path,
    content,
    "All 32 original JSONL records, byte-for-byte; includes counts-run samples, excluded from timing summaries",
    [path],
  );
  for (const snapshot of [run.sourceSnapshotStart, run.sourceSnapshotEnd]) {
    assert.deepEqual((await load(`runtime/${snapshot}`)).roots, runtimeStart.roots);
  }
}
assert.deepEqual((await load("runtime/source-hashes-end.json")).roots, runtimeStart.roots);
const runtimeInputs = await load("runtime/runtime-inputs.json");
const runtimeSources = {};
for (const [side, root] of Object.entries(runtimeStart.roots)) {
  assert.equal(root.head, { baseline, candidate }[side]);
  runtimeSources[side] = {
    head: root.head,
    status: root.status,
    checkedFiles: Object.keys(root.sha256).length,
    files: Object.fromEntries(
      Object.entries(root.sha256).filter(
        ([path]) =>
          path in runtimeInputs[side] || path.startsWith("scripts/benchmarks/custom-widgets/") || !path.includes("/"),
      ),
    ),
  };
}
await preserve(
  "runtime/source-hashes.json",
  runtimeSources,
  "Initial SHA-256 map selected to emitted repository inputs, benchmark files and root configuration; all 14 complete original maps compared equal",
  ["runtime/source-hashes-start.json", "runtime/runtime-inputs.json"],
);
await preserve(
  "runtime/runs.json",
  runs,
  "All original run metadata; absolute executable/checkout/output prefixes replaced with documented tokens; sourceSnapshot references name original hashed inputs",
  ["runtime/runs.json"],
);
const environmentKeys = [
  "nodeExecutableSha256",
  "versions",
  "platform",
  "arch",
  "dependencies",
  "timestamp",
  "os",
  "hardware",
  "logicalCpus",
  "memoryBytes",
  "env",
  "miseVersion",
  "harnessSha256",
  "fixtureSha256",
  "method",
];
await preserve(
  "runtime/environment.json",
  Object.fromEntries(environmentKeys.map((key) => [key, environment[key]])),
  "Named environment fields only; hostname and absolute executable/harness omitted; dependency paths tokenized",
  ["runtime/environment.json"],
);
await preserve(
  "runtime/instrumentation-coverage.json",
  await load("runtime/instrumentation-coverage.json"),
  "All original insertion-point coverage; unmatched evaluationContexts retained",
  ["runtime/instrumentation-coverage.json"],
);

const invocations = (await load("server/invocations.json")).filter((entry) =>
  ["router", "response"].includes(entry.name),
);
assert.equal(invocations.length, 8);
const serverSources = {};
for (const side of ["before", "after"]) {
  const initial = await load(`server/source-hashes/initial-${side}.json`);
  assert.equal(initial.head, { before: baseline, after: candidate }[side]);
  for (const invocation of invocations) {
    for (const phase of ["pre", "post"]) {
      const snapshot = await load(`server/source-hashes/${invocation.key}-${phase}-${side}.json`);
      for (const key of ["files", "head", "status", "trackedContentSha256"])
        assert.deepEqual(snapshot[key], initial[key]);
    }
  }
  serverSources[side] = {
    head: initial.head,
    status: initial.status,
    checkedFiles: initial.trackedFileCount,
    trackedContentSha256: initial.trackedContentSha256,
    files: Object.fromEntries(
      Object.entries(initial.files).filter(
        ([path]) =>
          /^(packages\/(custom-widgets|db)\/|packages\/api\/src\/router\/custom-widget\/|scripts\/benchmarks\/custom-widgets\/)/.test(
            path,
          ) || !path.includes("/"),
      ),
    ),
  };
}
for (const invocation of invocations) {
  assert.equal(invocation.status, 0);
  for (const state of Object.values(invocation.sourceStable)) {
    assert(state.unchangedDuringRun && state.matchesInitial);
  }
  const path = `server/raw/${invocation.key}.json`;
  const content = await original(path);
  assert.equal(digest(content), invocation.output.sha256);
  const data = JSON.parse(content);
  let results = data.results.filter((entry) => entry.name.startsWith("redact-"));
  let selection =
    "Original redact-* result objects and checks; all exact samples preserved; root and non-redaction cases omitted";
  if (invocation.name === "router") {
    results = data.results.filter((entry) => /^(direct|integration)-20-(cold|warm)$/.test(entry.name));
    selection =
      "Original direct/integration 20-query cold/warm result objects and checks; samples and per-sample operations unchanged; root and other cases omitted";
  }
  await preserve(`server/${invocation.key}.json`, { results, checks: data.checks }, selection, [path]);
}
await preserve(
  "server/source-hashes.json",
  serverSources,
  "Initial tracked-file metadata selected to custom-widgets, db, API custom-widget router, benchmark and root files; 32 complete pre/post maps compared to initial; management period excluded",
  ["server/source-hashes/initial-before.json", "server/source-hashes/initial-after.json"],
);
await preserve(
  "server/invocations.json",
  invocations,
  "Only eight source-stable router/response invocations; all fields retained with absolute paths tokenized",
  ["server/invocations.json"],
);
const toolchain = await load("server/toolchain.json");
await preserve(
  "server/toolchain.json",
  { node: toolchain.node, dependencies: toolchain.dependencies },
  "Node and dependency metadata only; machine commands/logs omitted; absolute paths tokenized",
  ["server/toolchain.json"],
);
const harness = await load("server/harness-provenance.json");
await preserve(
  "server/harness.json",
  { rootHandling: harness.rootHandling, modifications: harness.modifications, files: harness.files },
  "Original candidate harness hashes; sourceRoot omitted; management harness hash is provenance only, not evidence of a valid management run",
  ["server/harness-provenance.json"],
);
for (const file of harness.files) {
  assert.equal(digest(await original(`server/original-harness/${file.path}`)), file.sha256);
}

const workbenchHashes = await load("workbench/evidence-sha256.json");
for (const side of ["before", "after"]) {
  for (const run of [1, 2]) {
    const path = `workbench/browser-${side}${run}.json`;
    const content = await original(path);
    assert.equal(digest(content), workbenchHashes[`browser-${side}${run}.json`]);
    await preserve(
      path,
      JSON.parse(content),
      "All original browser result fields, exact numeric samples, counts, form results and completion signature; JSON whitespace normalized",
      [path],
    );
  }
}
const workbenchStart = await load("workbench/source-hashes-start.json");
assert.deepEqual((await load("workbench/source-hashes-end.json")).roots, workbenchStart.roots);
const workbenchSources = {};
for (const [side, root] of Object.entries(workbenchStart.roots)) {
  assert.equal(root.head, { before: baseline, after: candidate }[side]);
  workbenchSources[side] = { head: root.head, status: root.status, files: root.files };
}
await preserve(
  "workbench/source-hashes.json",
  { scopes: workbenchStart.scopes, roots: workbenchSources },
  "All original scoped tracked source hashes; equal start/end maps stored once; absolute roots omitted",
  ["workbench/source-hashes-start.json", "workbench/source-hashes-end.json"],
);
const bundledStart = await load("workbench/bundled-module-hashes-start.json");
assert.deepEqual((await load("workbench/bundled-module-hashes-end.json")).roots, bundledStart.roots);
const bundledSources = {};
for (const [side, root] of Object.entries(bundledStart.roots)) {
  const files = Object.values(root.files);
  bundledSources[side] = {
    checkedFiles: files.length,
    files: Object.fromEntries(
      files
        .filter((file) => !file.relativeToRoot.startsWith("node_modules/"))
        .map((file) => [file.relativeToRoot, file.sha256]),
    ),
  };
}
await preserve(
  "workbench/bundled-source-hashes.json",
  bundledSources,
  "Physical bundle inputs outside node_modules selected by relativeToRoot; original SHA-256 values unchanged; all 16013 module entries compared start/end; dependency module maps omitted for compactness",
  ["workbench/bundled-module-hashes-start.json", "workbench/bundled-module-hashes-end.json"],
);
await preserve(
  "workbench/instrumentation-coverage.json",
  await load("workbench/instrumentation-coverage.json"),
  "All original insertion-point coverage",
  ["workbench/instrumentation-coverage.json"],
);
const workbenchSummary = await load("workbench/summary.json");
await preserve(
  "workbench/method.json",
  {
    measuredAt: workbenchSummary.measuredAt,
    method: workbenchSummary.method,
    integrity: workbenchSummary.integrity,
    limitations: workbenchSummary.limitations,
  },
  "Original measurement window, controls, source-stability checks and limitations; no cleanup PIDs or checkout paths",
  ["workbench/summary.json"],
);

execFileSync(
  "bun",
  [
    "x",
    "oxfmt",
    ...inputs.filter((input) => input.path.endsWith(".json")).map((input) => join(destination, input.path)),
  ],
  { cwd: resolve(import.meta.dirname, "../../.."), stdio: "inherit" },
);
for (const input of inputs) {
  const content = await readFile(join(destination, input.path), "utf8");
  input.packagedSha256 = digest(content);
  if (input.path.endsWith(".jsonl")) assert.equal(content, expected.get(input.path));
  else assert.deepEqual(JSON.parse(content), portable(expected.get(input.path)));
}
await writeFile(
  join(destination, "provenance.json"),
  `${JSON.stringify(
    {
      baselineCommit: baseline,
      candidateCommit: candidate,
      scope:
        "Latest retained PR7358 replay against dev at the recorded baseline, not a claim about subsequent dev/PR HEADs",
      pathTokens: {
        "<baseline>": "Pinned baseline checkout",
        "<candidate>": "Pinned candidate checkout",
        "<output>": "Original private consolidated output directory",
        "<node-24.22.1>": "Measured Node executable",
      },
      sourceStability: {
        runtime: "14 complete scoped snapshots equal",
        server: "Initial plus 16 complete pre/post snapshots per checkout equal across router/response only",
        workbench: "Scoped source and all physical bundle-input maps equal start/end",
      },
      excluded:
        "Management measurements excluded: ai-prompt.ts changed during management-after-1; no management timing, byte or output-parity claim is made for this replay. No quality snapshot: maintained separately under custom-widget-authoring. No bundles, databases, logs, credentials or personal paths packaged.",
      rawParity:
        "All selected original data objects deep-equal after formatting; runtime JSONL is byte-identical; numeric samples and counters are neither rounded nor recomputed",
      sources: [...sources.values()],
      inputs,
    },
    null,
    2,
  )}\n`,
);
execFileSync("bun", ["x", "oxfmt", join(destination, "provenance.json")], {
  cwd: resolve(import.meta.dirname, "../../.."),
  stdio: "inherit",
});
console.log(JSON.stringify({ files: inputs.length + 1, rawParity: true, sources: sources.size }));
