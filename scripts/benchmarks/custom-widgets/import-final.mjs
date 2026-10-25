import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { summarize } from "./summarize-final.mjs";

const source = resolve(process.env.EVIDENCE_SOURCE ?? "");
assert(process.env.EVIDENCE_SOURCE, "EVIDENCE_SOURCE must point to final-replay-2/recovery-1");
const destination = resolve(process.env.OUTPUT ?? join(import.meta.dirname, "evidence/final-4ed24e5ac"));
const baseline = "c72a2e02b03c734b3a393914b5e99881e27e86d2";
const candidate = "4ed24e5ac4ff1726e187d4ea3677e2f7979e3691";
const prefix = `results-${candidate}`;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const sources = new Map();
const inputs = [];
const encode = (value) => `${JSON.stringify(value, null, 2)}\n`;
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
const manifest = JSON.parse(await readFile(join(source, "archive-manifest.json"), "utf8"));
assert.equal(manifest.fileCount, 214);
assert.equal(manifest.files.length, 214);
const originals = new Map(manifest.files.map((file) => [file.path, file]));

async function original(path) {
  const content = await readFile(join(source, path));
  const record = { path, originalSha256: digest(content), bytes: content.length };
  const expected = originals.get(path);
  if (expected) {
    assert.equal(record.originalSha256, expected.sha256, path);
    assert.equal(record.bytes, expected.bytes, path);
  }
  sources.set(path, record);
  return content;
}

const load = async (path) => JSON.parse(await original(path));
await original("archive-manifest.json");
for (const file of manifest.files) await original(file.path);
const summary = await load("summary.json");
const previous = `../${prefix}`;
const oldSummary = await load(`${previous}/summary.json`);
assert.equal(sources.get(`${previous}/summary.json`).originalSha256, summary.previousRun.originalSummaryJsonSha256);
assert.equal(summary.candidateSha, candidate);
assert.equal(summary.baselineSha, baseline);
assert.equal(summary.status, "recovery-complete-with-preserved-prior-failures");
assert.equal(oldSummary.invocations.length, 21);
assert.equal(summary.invocations.length, 8);
const nodeSha256 = summary.nodeExecutableSha256;
const command = await load(`${prefix}/invocations/${summary.invocations[1].key}.command.json`);
const candidateRoot = summary.invocations.find((entry) => entry.key.includes("candidate")).canonicalRoot;
const baselineRoot = command.canonicalRoot;
const recordedRecovery = command.command.at(-1).split(`/${prefix}/`)[0];
const outputRoot = dirname(recordedRecovery);
const replacements = [
  [source, "<recovery>"],
  [recordedRecovery, "<recovery>"],
  [join(outputRoot, prefix), "<original>"],
  [command.executable, "<node-24.22.1>"],
  [candidateRoot, "<candidate>"],
  [baselineRoot, "<baseline>"],
  [outputRoot, "<private-output>"],
];

function portable(text) {
  for (const [path, token] of replacements) text = text.replaceAll(path, token);
  assert(!/\/(?:Users|private\/var|var\/folders)\//u.test(text), "Unselected machine-local path");
  assert(!/inheritedEnvironmentValueSha256|(?:authorization|x-api-key)\s*["']?\s*:/iu.test(text));
  return text;
}

async function preserve(path, value, selection, sourcePaths, exact = false) {
  let content;
  if (Buffer.isBuffer(value)) content = value;
  else if (typeof value === "string") content = Buffer.from(portable(value));
  else content = Buffer.from(portable(encode(value)));
  portable(content.toString("utf8"));
  await mkdir(dirname(join(destination, path)), { recursive: true });
  await writeFile(join(destination, path), content);
  assert.deepEqual(await readFile(join(destination, path)), content);
  if (exact) assert.deepEqual(content, await original(sourcePaths[0]));
  inputs.push({
    path,
    packagedSha256: digest(content),
    bytes: content.length,
    byteIdentical: exact,
    selection,
    sources: sourcePaths,
  });
}

const roots = {};
const snapshots = [];
for (const file of manifest.files.filter((record) => /source-hashes\/.*\.(before|after)\.json$/u.test(record.path))) {
  const data = await load(file.path);
  const entries = [];
  for (const { rawRoot, root, ...state } of data) {
    assert([baselineRoot, candidateRoot].includes(root));
    const side = root === baselineRoot ? "baseline" : "candidate";
    assert.equal(state.head, { baseline, candidate }[side]);
    assert.equal(state.status, "");
    assert.deepEqual(state.packageErrors, []);
    if (!roots[side]) roots[side] = state;
    else assert.deepEqual(state, roots[side], file.path);
    entries.push({ side, canonicalMapSha256: canonicalDigest(state) });
    assert(rawRoot === root || resolve(rawRoot) === root);
  }
  snapshots.push({ source: file.path, originalSha256: sources.get(file.path).originalSha256, roots: entries });
}
assert.equal(snapshots.length, 58);

const environmentKeys = new Set([
  "ROOT",
  "LABEL",
  "OUTPUT",
  "COUNTS",
  "NODE_ENV",
  "NODE_OPTIONS",
  "TZ",
  "LANG",
  "LC_ALL",
  "CI",
  "PORT",
  "ORIGIN",
  "FIXTURE_OUTPUT",
  "AGENT_BROWSER_SESSION",
  "AGENT_BROWSER_COLOR_SCHEME",
  "BUILD_ONLY",
  "SKIP_ENV_VALIDATION",
]);
const pickEnvironment = (value) => {
  assert(
    Object.keys(value).every((key) => environmentKeys.has(key)),
    "Unexpected environment override",
  );
  return value;
};
const invocations = [];
for (const [origin, entries] of [
  ["original", oldSummary.invocations],
  ["recovery", summary.invocations],
]) {
  for (const entry of entries) {
    const directory = origin === "original" ? previous : prefix;
    const commandPath = `${directory}/invocations/${entry.key}.command.json`;
    const completionPath = `${directory}/invocations/${entry.key}.completion.json`;
    const metadata = await load(commandPath);
    const completion = await load(completionPath);
    assert.equal(sources.get(commandPath).originalSha256, entry.commandManifestSha256);
    assert.equal(metadata.key, entry.key);
    assert.equal(metadata.executableSha256, nodeSha256);
    assert.equal(metadata.nodeVersion, "v24.22.1");
    assert.equal(completion.nodeSha256Before, nodeSha256);
    assert.equal(completion.nodeSha256After, nodeSha256);
    assert(completion.sourceStable && completion.nodeStable);
    assert.equal(completion.exitCode, entry.exitCode);
    const disposition = summary.previousRun.dispositions.find((item) => item.key === entry.key);
    let classification = "valid-recovery";
    let reason = "Corrected source-stable invocation";
    if (origin === "original") {
      assert(disposition);
      classification = disposition.disposition;
      reason = disposition.reason;
    } else if (entry.exitCode !== 0) {
      classification = "excluded-preflight-failure";
      reason = "Probe encoded a newline incorrectly; benchmark was not launched";
    }
    const snapshotPrefix =
      origin === "recovery"
        ? `${prefix}/source-hashes`
        : `${prefix}/reused/${classification.startsWith("excluded") ? "prior-attempts/" : ""}source-hashes`;
    const sourceSnapshots = ["before", "after"].map((phase) => `${snapshotPrefix}/${entry.key}.${phase}.json`);
    assert(sourceSnapshots.every((path) => snapshots.some((snapshot) => snapshot.source === path)));
    if (origin === "original") {
      for (const phase of ["before", "after"]) {
        assert.deepEqual(
          await original(`${previous}/source-hashes/${entry.key}.${phase}.json`),
          await original(`${snapshotPrefix}/${entry.key}.${phase}.json`),
        );
      }
    }
    const logPrefix =
      origin === "recovery"
        ? `${prefix}/invocations`
        : `${prefix}/reused/${classification.startsWith("excluded") ? "prior-attempts/" : ""}invocations`;
    const logs = {};
    for (const stream of ["stdout", "stderr"]) {
      const path = `${logPrefix}/${entry.key}.${stream}.log`;
      await original(path);
      logs[stream] = sources.get(path);
      if (origin === "original") {
        assert.deepEqual(await original(`${previous}/invocations/${entry.key}.${stream}.log`), await original(path));
      }
    }
    invocations.push({
      origin,
      key: entry.key,
      classification,
      reason,
      commandManifest: sources.get(commandPath),
      completionManifest: sources.get(completionPath),
      rawRoot: metadata.rawRoot,
      canonicalRoot: metadata.canonicalRoot,
      cwd: metadata.cwd,
      sourceRoots: metadata.sourceRoots,
      command: metadata.command,
      environmentOverrides: pickEnvironment(metadata.environmentOverrides ?? metadata.envOverrides),
      effectiveWhitelistedEnvironment: metadata.effectiveWhitelistedEnvironment ?? null,
      environmentSelection:
        "Explicit overrides and recorded safe whitelist only; original inherited-environment fingerprints omitted entirely; null means no safe effective whitelist was recorded",
      nodeVersion: metadata.nodeVersion,
      nodeSha256Before: completion.nodeSha256Before,
      nodeSha256After: completion.nodeSha256After,
      harnessSha256: metadata.scriptSha256,
      invokeRunnerSha256: metadata.invokeRunnerSha256,
      startedAt: metadata.startedAt,
      finishedAt: completion.finishedAt,
      preflight: metadata.preflight ?? completion.preflight ?? null,
      exitCode: entry.exitCode,
      sourceStable: completion.sourceStable,
      nodeStable: completion.nodeStable,
      sourceSnapshots,
      logs,
    });
    if (metadata.effectiveWhitelistedEnvironment) pickEnvironment(metadata.effectiveWhitelistedEnvironment);
  }
}
assert.equal(new Set(invocations.map((entry) => entry.key)).size, 29);
for (const side of ["baseline", "candidate"]) {
  const state = roots[side];
  await preserve(
    `sources/${side}.json`,
    state,
    "Complete invariant original files map, including missing entries, dependency-manifest aggregate, HEAD and clean status, stored once per root; only rawRoot/root omitted",
    snapshots.filter((entry) => entry.roots.some((root) => root.side === side)).map((entry) => entry.source),
  );
}
await preserve(
  "sources/snapshots.json",
  snapshots,
  "All 58 original snapshot hashes and canonical full-map references; full states compared before deduplication",
  snapshots.map((entry) => entry.source),
);
await preserve(
  "invocations.json",
  invocations,
  "All 21 original plus eight recovery invocations; explicit metadata allowlist, no inherited environment hashes; machine path prefixes tokenized, raw ROOT spelling retained",
  [
    "summary.json",
    `${previous}/summary.json`,
    ...invocations.flatMap((entry) => [entry.commandManifest.path, entry.completionManifest.path]),
  ],
);

for (const [key, value] of Object.entries(summary.runtime)) {
  const bytes = await original(value.rawLog);
  assert.equal(digest(bytes), value.rawLogSha256);
  assert.deepEqual(
    bytes
      .toString("utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line)),
    value.records,
  );
  await preserve(
    `runtime/${key}.jsonl`,
    bytes,
    "All 32 original records, byte-identical; counted timings retained but excluded from headline pooling",
    [value.rawLog],
    true,
  );
}
for (const [key, value] of Object.entries(summary.reusedServer)) {
  const bytes = await original(value.recoveryCopy);
  assert.equal(digest(bytes), value.originalSha256);
  assert.equal(value.originalSha256, value.recoveryCopySha256);
  const raw = JSON.parse(bytes);
  assert.deepEqual(raw.results, value.results);
  if (raw.checks) assert.deepEqual(raw.checks, value.checks);
  await preserve(
    `server/${key}.json`,
    raw,
    "Entire original result including every case, numeric sample, operation, public digest and check; only root path tokenized",
    [value.recoveryCopy],
  );
}
for (const [label, value] of Object.entries(summary.workbench.browserResults)) {
  const bytes = await original(value.rawFile);
  assert.equal(digest(bytes), value.rawSha256);
  assert.deepEqual(JSON.parse(bytes), value.raw);
  await preserve(
    `workbench/browser-${label}.json`,
    bytes,
    "Entire original browser result, byte-identical; all samples, counters, completion signatures and form observations",
    [value.rawFile],
    true,
  );
}
for (const side of ["baseline", "candidate"]) {
  const path = `${prefix}/runtime-verification-${side}.json`;
  assert.deepEqual(await load(path), summary.runtimeVerification[side]);
  const bundlePath = `${prefix}/runtime/recovery-1-runtime-v2-${side}-counts/generated-recovery-1-runtime-v2-${side}-counts.mjs`;
  const bundle = (await original(bundlePath)).toString("utf8");
  for (const insertion of ["sanitizeVisits", "rendererRenders", "displayRenders"]) assert(bundle.includes(insertion));
  await preserve(
    `runtime/verification-${side}.json`,
    summary.runtimeVerification[side],
    "All original corrected positive-control and bundle-insertion assertions; paths tokenized",
    [path],
  );
  const oldPath = `${previous}/runtime-counts-${side}-verification.json`;
  await preserve(
    `rejected/verification-${side}.json`,
    await load(oldPath),
    "Entire failed original counter gate, including the invalid renderer-stable-parent control; paths tokenized",
    [oldPath],
  );
}
for (const entry of invocations.filter((record) => record.origin === "original" && record.key.startsWith("runtime-"))) {
  const path = entry.logs.stdout.path;
  await preserve(
    `rejected/${entry.key}.jsonl`,
    await original(path),
    "All 31 records from invalid original invocation, byte-identical, excluded from all headline statistics",
    [path],
    true,
  );
}
for (const [output, path] of [
  ["rejected/browser.stderr.txt", `${prefix}/reused/prior-attempts/invocations/workbench-browser-pairs.stderr.log`],
  ["rejected/browser.stdout.txt", `${prefix}/reused/prior-attempts/invocations/workbench-browser-pairs.stdout.log`],
  [
    "rejected/preflight.stderr.txt",
    `${prefix}/invocations/recovery-1-runtime-baseline-pair1-timed.preflight.stderr.log`,
  ],
  ["reports/original-incomplete.md", `${previous}/RESULTS.md`],
  ["reports/recovery.md", "RESULTS.md"],
]) {
  await preserve(
    output,
    (await original(path)).toString("utf8"),
    "Entire original text; only documented machine path prefixes tokenized; original and packaged SHA-256 recorded separately",
    [path],
  );
}
assert.equal(sources.get(`${previous}/RESULTS.md`).originalSha256, summary.previousRun.originalResultsMdSha256);
await preserve(
  "assertions.json",
  {
    validity: summary.validity,
    managementParity: Object.fromEntries(
      Object.entries(summary.managementParity).map(([pair, value]) => [
        pair,
        {
          ...value,
          operations: Object.fromEntries(
            Object.entries(value.operations).map(([name, operation]) => [
              name,
              {
                baselineDigest: operation.baselineDigest,
                candidateDigest: operation.candidateDigest,
                publicDigestParity: operation.publicDigestParity,
                operationArrays: [
                  `server/server-management-baseline-${pair}.json#${name}`,
                  `server/server-management-candidate-${pair}.json#${name}`,
                ],
              },
            ]),
          ),
        },
      ]),
    ),
    browserControl: summary.workbench.browserControl,
    browserOrder: summary.workbench.order,
    cleanupVerified: summary.workbench.cleanupVerified,
    executionSequence: summary.executionSequence,
  },
  "All original validity assertions, management public digests/parity, browser settings/order and cleanup; duplicate management operation arrays referenced in full raw results",
  ["summary.json"],
);

const harness = [];
for (const file of manifest.files.filter((record) => record.path.startsWith(`${prefix}/harness/`))) {
  const local = file.path.slice(`${prefix}/harness/`.length);
  const bytes = await original(file.path);
  let matchesCheckedInHarness = false;
  if (!local.startsWith("workbench/replay-browser")) {
    matchesCheckedInHarness = digest(await readFile(join(import.meta.dirname, local))) === digest(bytes);
    assert(matchesCheckedInHarness, local);
  } else {
    await preserve(
      `harness/${local}`,
      bytes,
      "Exact original browser wrapper source, not a generated bundle; versioned failed and corrected commands retained",
      [file.path],
      true,
    );
  }
  harness.push({
    source: file.path,
    originalSha256: digest(bytes),
    checkedInPath: `scripts/benchmarks/custom-widgets/${local}`,
    matchesCheckedInHarness,
  });
}
await preserve(
  "harness.json",
  { files: harness, recoveryTools: summary.recoveryTools },
  "All measured fixture and wrapper source hashes; ten fixture files verified byte-identical to checked-in harness; recovery tool hashes only",
  ["summary.json"],
);
assert.equal(summary.workbench.reusedBuilds.files.length, 12);
for (const artifact of summary.workbench.reusedBuilds.files) {
  assert(artifact.matchesSource);
  const artifactPath = artifact.source.split("/workbench/browser-fixture/")[1];
  assert(artifactPath);
  assert(artifact.copy.endsWith(`/workbench/fixture-assets/${artifactPath}`));
  const originalBytes = await original(`${previous}/workbench/browser-fixture/${artifactPath}`);
  const reusedBytes = await original(`${prefix}/workbench/fixture-assets/${artifactPath}`);
  assert.deepEqual(originalBytes, reusedBytes);
  assert.equal(digest(originalBytes), artifact.sha256);
  assert.equal(originalBytes.length, artifact.bytes);
}
await preserve(
  "build-artifacts.json",
  summary.workbench.reusedBuilds,
  "All 12 original and reused browser build artifact hashes and byte counts, not bundle contents",
  ["summary.json", summary.workbench.reusedBuildManifest],
);

const provenance = {
  baselineCommit: baseline,
  candidateCommit: candidate,
  nodeVersion: summary.nodeVersion,
  nodeSha256,
  measuredAt: "2026-10-25",
  originalInvocationCount: 21,
  recoveryInvocationCount: 8,
  pathTokens: {
    "<baseline>": "Pinned baseline checkout",
    "<candidate>": "Pinned candidate checkout",
    "<node-24.22.1>": "Measured Node executable",
    "<original>": "Original incomplete 21-invocation result root",
    "<recovery>": "Recovery result directory",
    "<private-output>": "Parent private replay output directory",
  },
  sourceStability: {
    comparedSnapshots: snapshots.length,
    comparison:
      "Every full original files/dependency/HEAD/status state compared across all invocations, including rejected attempts, before selection; rawRoot/root spelling excluded from canonical state only",
    canonicalDigest:
      "SHA-256 of UTF-8 JSON.stringify with object keys recursively sorted, arrays in original order, no trailing newline",
    scope:
      "Original collector's entire recorded map, not a claim about unrecorded files or dependency implementation bytes; includes packages, selected app paths and root config. Its redundant unprefixed missing-file entries are preserved, not treated as successful hashes. Installed dependency manifest aggregate/count retained; original per-package map was not recorded",
    roots: Object.fromEntries(
      Object.entries(roots).map(([side, value]) => [
        side,
        {
          canonicalMapSha256: canonicalDigest(value),
          originalFileMapSha256: canonicalDigest(value.files),
          fileEntries: Object.keys(value.files).length,
          hashedFileEntries: Object.values(value.files).filter((entry) => entry.sha256).length,
          missingFileEntries: Object.values(value.files).filter((entry) => entry.missing).length,
          installedPackageCount: value.installedPackageCount,
          installedPackageManifestSha256: value.installedPackageManifestSha256,
        },
      ]),
    ),
  },
  privacy:
    "Only explicit safe command metadata selected; original inherited-environment hash maps and secret-variable fingerprints are never packaged. No environment dumps, generated bundles, sourcemaps, node_modules, screenshots, credentials, auth headers or provider traces. Source/report/manifest SHA-256 values identify files, not secret values",
  selection:
    "All valid raw numeric arrays and checks retained. Six valid runtime JSONLs and four browser JSONs byte-identical. Server JSON objects unchanged except documented root-prefix tokenization and whitespace. Six invalid 31-record JSONLs, both wrong original gates, browser failure and preflight error retained and excluded. Original reports and command hashes referenced separately from packaged hashes",
  sources: [...sources.values()],
  inputs,
};
await mkdir(destination, { recursive: true });
await writeFile(join(destination, "provenance.json"), portable(encode(provenance)));
const { archiveFiles, archiveBytes, verifiedEvidenceFiles, ...statistics } = await summarize(destination);
assert(archiveFiles > 0 && archiveBytes > 0 && verifiedEvidenceFiles > 0);
const rawSources = inputs
  .filter((input) => /^(runtime\/.*\.jsonl|server\/|workbench\/browser-)/u.test(input.path))
  .flatMap((input) => input.sources);
await preserve(
  "summary.json",
  statistics,
  "Recomputed pooled statistics and counter/parity validation from all valid raw arrays, not an average of run medians",
  rawSources,
);
const timing = (lane, name, side) => {
  const value = statistics[lane][side][name].pooled;
  return `${value.medianMs.toFixed(3)} / ${value.p95Ms.toFixed(3)}`;
};
const comparison = (lane, name) => `${timing(lane, name, "baseline")} → ${timing(lane, name, "candidate")}`;
await preserve(
  "RESULTS.md",
  `# Final pinned custom-widget evidence

Baseline **\`${baseline}\`** → candidate **\`${candidate}\`**, measured October 25, 2026 with Node 24.22.1. This archive-only update changes no product source and does not relabel the measured pin.

Synthetic local fixtures only, not production or full-Homarr end-to-end measurements. Values below are pooled **median / p95 milliseconds**, computed from original sorted raw arrays at index \`floor(n * percentile)\`, never an average of run medians. Count-mode timings are archived but excluded from timing pooling.

| Fixture | Baseline → candidate, median / p95 ms | Deterministic work |
| --- | --- | --- |
| Stable parent, 20 widgets | ${comparison("runtime", "board-20-stable-parent")} | Over 10 updates, renderer renders/evaluations/bindings 200 → 0 each; adapter displays 200 → 200 |
| Router, 20 integration queries, cold | ${comparison("router", "integration-20-cold")} | Per invocation, SELECTs 63 → 4; decryptions 20 → 1 |
| Router, 20 integration queries, warm | ${comparison("router", "integration-20-warm")} | Same counts; upstream requests 0 → 0 |
| Redaction, 4,000 records, no match | ${comparison("response", "redact-4000-records-no-match")} | Same generated JSON fixture |
| Redaction, 4,000 records, sparse match | ${comparison("response", "redact-4000-records-sparse-match")} | Same generated JSON fixture |
| Management list, 20 legacy definitions | ${comparison("management", "list-20-legacy")} | Serialized SQLite driver-result bytes 2,641,534 → 1,654; 2 → 2 SELECTs; identical public digests in both pairs |
| Workbench edit, stable 200-field response | ${comparison("workbench", "response")} | Per replay, 25 edits render 25 → 0 response trees and 5,025 → 0 rows |

## Retained evidence and gates

- All six corrected runtime JSONLs retain 32 unique records byte-for-byte, including memory and non-timing observations. Each root has two timed runs and a separate counted run. Both original corrected gates pass; sanitizer visits are 4,801,500, adapter-display counters are positive, and renderer-options-only renders are 40 / 20 (baseline / candidate). A zero stable-parent renderer count is not the positive control.
- All 12 original server result objects retain every case, sample, operation and check, including all three management operations. Public digests match in both pairs. get/available driver-result bytes are 16,711 → 242 / 131,467 → 276, with 1 / 3 reads respectively. Router direct-20 SELECTs are 23 → 3 and decryptions 20 → 1. These bytes are not response transfer, database wire or heap bytes.
- All four browser result JSON files are byte-identical; all editor, completion and form observations remain. Replay order is baseline → candidate twice, 1440×1000, scale 1, light scheme, agent-browser 0.39.2. Builds were reused only after byte/hash equality checks; bundle contents are not duplicated here.
- Six original 31-record runtime attempts, both failed original gates, the browser viewport-command failure and the failed recovery preflight are explicitly classified and retained under \`rejected/\`. None contributes headline statistics. The preflight failure launched no benchmark. Original reports are retained under \`reports/\`; their original hashes and all original command-manifest hashes remain in provenance. No original 21-call report or source file was overwritten.

## Integrity, selection and limits

All 58 complete original pre/post source/dependency snapshots were compared first, including rejected attempts; one invariant full recorded files map per root is stored under \`sources/\`. Original collector scope and missing entries remain explicit. Installed dependency manifest aggregates are not hashes of every dependency implementation file. Every one of the 29 unique invocations retains command, raw/canonical ROOT, cwd, pins through snapshot references, safe environment values, Node binary hashes, source snapshot hashes and canonical map digests. Ten measured fixtures match the checked-in harness byte-for-byte; the failed/corrected private browser wrappers are retained separately.

\`provenance.json\` distinguishes original SHA-256/bytes from packaged SHA-256/bytes and describes each selection. Runtime/browser samples and rejected runtime JSONLs are byte-exact; server objects differ only in whitespace and tokenized root prefixes. Machine-local checkout/output/executable prefixes are replaced with documented tokens, preserving raw ROOT spelling differences. No inherited-environment fingerprint maps or secret-variable hashes are copied. No generated bundles, sourcemaps, node_modules, environment dumps, credentials, auth headers, provider traces or screenshots are packaged.

The runtime fixture uses development React/jsdom, stable providers, a 2,000-row payload per widget, 5 warmups and 10 measured board updates; transport and host UI boundaries are stubbed. The router uses actual appRouter callers, in-memory SQLite, real encryption and loopback HTTP with 1 ms synthetic upstream delay, 3 warmups and 30 samples per headline case. Redaction uses 30 warmups and 120 samples of two calls per case. Management uses 5 warmups and 30 samples per operation. Browser fixtures use production React/esbuild and Chromium, 5 warmups and 20 timed edits; counters include all 25. No production latency, INP, token or cost conclusions follow from these fixtures.

Run \`node scripts/benchmarks/custom-widgets/summarize-final.mjs\` to verify hashes, assertions and pooled statistics without executing benchmarks. Set \`EVIDENCE_SOURCE\` to the private \`final-replay-2/recovery-1\` directory to also verify originals; \`import-final.mjs\` with that variable regenerates this selection. Historical archives and their summarizers are unchanged.
`,
  "New report generated from validated pooled raw statistics; original reports remain separate",
  rawSources,
);
await writeFile(join(destination, "provenance.json"), portable(encode(provenance)));
console.log(
  encode({
    directory: relative(process.cwd(), destination),
    files: inputs.length + 1,
    originalInputsVerified: sources.size,
    comparedSnapshots: snapshots.length,
  }),
);
