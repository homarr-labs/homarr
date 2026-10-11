import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Json = Record<string, any>;
type Disposition = { status: string; details: Json; lane: Json };
const directory = dirname(fileURLToPath(import.meta.url));
function resolveArtifact(path: string): string {
  if (path.startsWith("/") || path.startsWith("scripts/")) return resolve(path);
  return resolve(directory, path);
}
const options = {
  results: [] as string[],
  workdir: undefined as string | undefined,
  outdir: directory,
  allowIncomplete: false,
};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === "--help") {
    console.log(`Generate the complete 62-finding performance audit report.
  --results FILE/DIR   Paired result JSONs, repeatable; defaults to results directory
  --workdir DIR        Refresh bundled inputs.json from dispatch/manifests/workers
  --outdir DIR         REPORT.md, FINDINGS_TABLE.md, VARIANTS.md, REJECTED_CANDIDATES.md, report-data.json
  --allow-incomplete   Smoke only; explicitly mark missing results/dispositions`);
    process.exit(0);
  }
  if (argument === "--allow-incomplete") {
    options.allowIncomplete = true;
    continue;
  }
  const value = args[++index];
  if (!value) throw new Error(`Missing value for ${argument}`);
  switch (argument) {
    case "--results":
      options.results.push(resolve(value));
      break;
    case "--workdir":
      options.workdir = resolve(value);
      break;
    case "--outdir":
      options.outdir = resolve(value);
      break;
    default:
      throw new Error(`Unknown argument ${argument}`);
  }
}
if (options.results.length === 0) options.results.push(join(directory, "results"));

const read = (path: string): Json => JSON.parse(readFileSync(path, "utf8"));
const asText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(asText).join("; ");
  if (typeof value === "string") return value;
  return "";
};
const clean = (value: unknown): string => asText(value).replace(/\s+/gu, " ").trim();
function currentText(value: unknown): string {
  return clean(value)
    .split(/(?<=[.;])\s+/u)
    .filter((part) => !/\broot\b|pending final|serial timing will|will come from.*overlay/iu.test(part))
    .join(" ");
}
function humanText(value: unknown): string {
  return currentText(value)
    .replace(/([a-z])(?=\d)/gu, "$1 ")
    .replace(/(\d)(?=[a-z])/gu, "$1 ")
    .replace(/\b(CPU|wall)median\b/gu, "$1 median")
    .replace(/\bCPU(?=\d)/gu, "CPU ");
}
const clip = (value: unknown, length = 100): string => {
  const text = clean(value);
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
};
const cell = (value: unknown): string => clean(value).replaceAll("|", "\\|");
const number = (value: number): string => {
  if (value === 0) return "0";
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return Number(value.toPrecision(3)).toLocaleString("en-US", { maximumFractionDigits: 6 });
};
const exactMilliseconds = (value: number): string => value.toLocaleString("en-US", { maximumFractionDigits: 6 });
const link = (path: string): string => relative(options.outdir, path).replaceAll("\\", "/");

const findings = new Map<string, Json>();
const dispositions = new Map<string, Disposition>();
const lanes = new Map<string, Json>();
function status(value: unknown): string {
  const text = clean(value).toLowerCase();
  if (/revert|reject|withdraw/u.test(text)) return "reverted";
  if (/retain|unchanged|defer|no.change|not.implemented|keep/u.test(text)) return "retained";
  if (/implement|fixed|applied|complete|accept/u.test(text)) return "implemented";
  return "unreported";
}
function dispositionEntries(lane: Json): Json[] {
  for (const name of ["dispositions", "findings", "decisions", "results"]) {
    const entries = lane[name];
    if (Array.isArray(entries)) return entries;
    if (entries && typeof entries === "object") {
      return Object.entries(entries).map(([id, entry]) => {
        if (typeof entry === "string") return { id, status: entry };
        return { id, ...(entry as Json) };
      });
    }
  }
  return [];
}
if (options.workdir) {
  const dispatch = read(join(options.workdir, "dispatch.json"));
  for (const [lane, ids] of Object.entries(dispatch) as [string, string[]][]) {
    const manifest = read(join(options.workdir, "manifests", `${lane}.json`));
    for (const finding of manifest.findings) {
      assert.ok(ids.includes(finding.id), `${finding.id} is missing from dispatch`);
      assert.ok(!findings.has(finding.id), `Duplicate canonical finding: ${finding.id}`);
      findings.set(finding.id, { ...finding, lane, baselineCommit: manifest.baseline_commit });
    }
    const dispositionPath = join(options.workdir, `${lane}.json`);
    if (!existsSync(dispositionPath)) continue;
    const data = read(dispositionPath);
    lanes.set(lane, data);
    for (const entry of dispositionEntries(data)) {
      const id = entry.id ?? entry.findingId ?? entry.finding_id;
      if (!ids.includes(id)) continue;
      dispositions.set(id, {
        status: status(entry.disposition ?? entry.decision ?? data.statuses?.[id] ?? entry.status),
        details: entry,
        lane: data,
      });
    }
  }
} else {
  let inputPath = join(directory, "inputs.json");
  if (!existsSync(inputPath)) inputPath = join(options.outdir, "inputs.json");
  assert.ok(existsSync(inputPath), "Bundled inputs.json is missing; first run with --workdir to build it");
  const input = read(inputPath);
  for (const [name, data] of Object.entries(input.lanes)) lanes.set(name, data as Json);
  for (const finding of input.findings) {
    findings.set(finding.id, finding);
    const disposition = finding.disposition;
    if (!disposition) continue;
    dispositions.set(finding.id, { ...disposition, lane: lanes.get(finding.lane) ?? {} });
  }
}
assert.equal(findings.size, 62, "The canonical audit must contain exactly 62 findings");
const widgetRejections = lanes.get("widget_render")?.rejectedWidgetCandidates;
let rejectedWidgets: Json[] = [];
if (Array.isArray(widgetRejections)) rejectedWidgets = widgetRejections;
else if (widgetRejections && typeof widgetRejections === "object") {
  rejectedWidgets = Object.entries(widgetRejections).map(([id, candidate]) => ({ id, ...(candidate as Json) }));
}
for (const candidate of rejectedWidgets) {
  const archive = candidate.archive;
  if (!archive?.casesFile) continue;
  const path = resolveArtifact(archive.casesFile);
  assert.ok(existsSync(path), `${candidate.id} rejected candidate raw archive must remain available`);
  const raw = readFileSync(path);
  assert.match(archive.casesSha256 ?? "", /^[a-f0-9]{64}$/u, `${candidate.id} rejected candidate archive SHA256`);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    archive.casesSha256,
    `${candidate.id} raw archive SHA256`,
  );
  const data = JSON.parse(raw.toString("utf8"));
  const savedCases = Array.isArray(data) ? data : (data.results ?? data.cases);
  for (const entry of candidate.cases ?? []) {
    const saved = savedCases?.find((record: Json) => record.id === entry.id);
    assert.ok(saved, `${entry.id} must remain in the rejected candidate archive`);
    for (const field of ["metrics", "summaries", "source", "caseSha256", "timing", "verification"]) {
      assert.deepEqual(entry[field], saved[field], `${entry.id} archived ${field}`);
    }
    if (!entry.samples) entry.samples = saved.samples;
  }
}
const timerPrototypeIds: string[] = [];
if (lanes.get("notebook_timers")?.rejectedNotificationCandidate) timerPrototypeIds.push("WMB1-1");
if (lanes.get("notebook_timers")?.rejectedWazuhCandidate) timerPrototypeIds.push("A3");
const prototypeIds = [...timerPrototypeIds, ...rejectedWidgets.map((candidate) => candidate.id)];
for (const id of prototypeIds) {
  assert.ok(findings.has(id), `Unknown rejected prototype: ${id}`);
  const disposition = dispositions.get(id);
  if (disposition) disposition.status = "reverted";
}
const inputs: string[] = [];
for (const input of options.results) {
  if (statSync(input).isDirectory()) {
    for (const filename of readdirSync(input).toSorted()) {
      if (filename.endsWith(".json")) inputs.push(join(input, filename));
    }
  } else inputs.push(input);
}
const suppliedDocuments = inputs.map((path) => ({ path, data: read(path) }));
const abortedArtifacts = new Map<string, { path: string; data: Json; metadata: Json }>();
const ignoredArtifacts = new Set<string>();
for (const document of suppliedDocuments) {
  if (document.data.status !== "recovered_completed_cases") continue;
  const recovery = document.data.recovery;
  assert.ok(recovery?.abortedArtifact, "Recovered cases require abortedArtifact recovery metadata");
  const artifact = recovery.abortedArtifact;
  assert.ok(typeof artifact.path === "string" && artifact.path, "Recovery must identify the aborted raw artifact");
  assert.match(artifact.sha256 ?? "", /^[a-f0-9]{64}$/u, "Recovery must record the aborted raw SHA256");
  assert.ok(typeof artifact.reason === "string" && artifact.reason, "Recovery must explain the original abort");
  let artifactPath = resolve(dirname(document.path), artifact.path);
  if (!existsSync(artifactPath)) artifactPath = join(dirname(document.path), basename(artifact.path));
  assert.ok(existsSync(artifactPath), "The unmodified aborted raw artifact must remain available");
  const raw = readFileSync(artifactPath);
  assert.equal(createHash("sha256").update(raw).digest("hex"), artifact.sha256, "Aborted artifact SHA256");
  const original = JSON.parse(raw.toString("utf8"));
  assert.equal(original.status, artifact.status, "Recovery must preserve the original run status");
  assert.notEqual(original.status, "passed", "The aborted run must not masquerade as a passed run");
  assert.equal(original.results.length, artifact.completedCases, "Original completely saved case count");
  assert.equal(document.data.results.length, recovery.selectedCompletedCases, "Recovered selected case count");
  for (const entry of document.data.results) {
    const saved = original.results.find((candidate: Json) => candidate.id === entry.id);
    assert.ok(saved, `${entry.id} must have been completely saved before the abort`);
    assert.deepEqual(entry, saved, `${entry.id} recovered evidence must be unchanged`);
  }
  const path = resolve(artifactPath);
  ignoredArtifacts.add(path);
  abortedArtifacts.set(path, { path, data: original, metadata: artifact });
}
// A directory may contain the archived aborted JSON alongside its explicit recovery.
// It is a raw appendix artifact, never a source of final case selection on its own.
const documents = suppliedDocuments.filter(({ path }) => !ignoredArtifacts.has(resolve(path)));
const results = new Map<string, Json>();
for (const { path, data } of documents) {
  for (const entry of data.results ?? []) {
    const findingId = entry.findingId ?? entry.id.split(":")[0];
    assert.ok(findings.has(findingId), `Unknown benchmark finding: ${findingId}`);
    const previous = results.get(entry.id);
    // A newer verify-only artifact must not erase a completed timing run.
    if (previous?.timing && !entry.timing) continue;
    if (
      previous &&
      Boolean(previous.timing) === Boolean(entry.timing) &&
      (previous.completedAt ?? "") > (data.completedAt ?? "")
    )
      continue;
    results.set(entry.id, { ...entry, findingId, input: path, completedAt: data.completedAt, runtime: data.runtime });
  }
}
const groups = [...findings.values()].map((finding) => ({
  finding,
  disposition: dispositions.get(finding.id),
  cases: [...results.values()].filter((entry) => entry.findingId === finding.id),
}));
const missing = groups.filter(
  ({ disposition, cases }) => !cases.length || !disposition || disposition.status === "unreported",
);
const failures = documents.flatMap(({ data }) => data.failures ?? []);
const incompleteSources = [...results.values()].filter((entry) =>
  ["before", "after"].some((side) => !entry.source?.some((source: Json) => source.side === side && source.fileSha256)),
);
function assertCompleteSamples(entry: Json) {
  assert.equal(entry.verification, "passed", `${entry.id} semantic checks`);
  if (!entry.timing) {
    assert.equal(entry.samples?.length ?? 0, 0, `${entry.id} must not claim unperformed timing`);
    return;
  }
  assert.equal(entry.samples?.length, 18, `${entry.id} requires all 18 raw samples / 9 pairs`);
  const pairs = new Set<string>();
  for (const sample of entry.samples) {
    assert.ok(sample.side === "before" || sample.side === "after", `${entry.id} sample side`);
    assert.ok(Number.isInteger(sample.trial) && sample.trial >= 0 && sample.trial < 9, `${entry.id} sample trial`);
    const key = `${sample.trial}:${sample.side}`;
    assert.ok(!pairs.has(key), `${entry.id} duplicate trial/side sample`);
    pairs.add(key);
    for (const field of ["wallMs", "cpuUserMs", "cpuSystemMs", "iterations"]) {
      assert.ok(Number.isFinite(sample[field]) && sample[field] >= 0, `${entry.id} ${field}`);
    }
    assert.ok(sample.iterations > 0, `${entry.id} nonzero timed iterations`);
  }
}
if (!options.allowIncomplete) {
  assert.equal(
    missing.length,
    0,
    `Missing results/dispositions: ${missing.map(({ finding }) => finding.id).join(", ")}`,
  );
  assert.equal(
    failures.length,
    0,
    `Failed benchmark scenarios: ${failures.map((failure: Json) => failure.id).join(", ")}`,
  );
  assert.equal(incompleteSources.length, 0, "Every scenario needs before/after source hashes");
  for (const entry of results.values()) {
    assertCompleteSamples(entry);
    if (prototypeIds.includes(entry.findingId)) {
      for (const source of entry.source.filter((item: Json) => item.side === "after")) {
        assert.ok(
          entry.source.some(
            (before: Json) =>
              before.side === "before" && before.file === source.file && before.fileSha256 === source.fileSha256,
          ),
          `${entry.id} final rejected-prototype source must match baseline`,
        );
      }
    }
  }
  for (const candidate of rejectedWidgets) {
    assert.ok(candidate.cases?.length, `${candidate.id} rejected candidate needs measured cases`);
    for (const entry of candidate.cases) {
      assertCompleteSamples(entry);
      for (const side of ["before", "after"]) {
        assert.ok(
          entry.source?.some((source: Json) => source.side === side && source.fileSha256),
          `${entry.id} rejected candidate source provenance`,
        );
      }
    }
  }
  for (const { data } of documents) {
    assert.ok(
      data.status === "passed" || data.status === "recovered_completed_cases",
      "Input must be passed or explicitly recovered complete cases",
    );
    assert.equal(data.runtime?.node, "v24.18.0", "Input timing must use pinned Node 24.18.0");
    const firstGroup = groups[0];
    assert.ok(firstGroup, "Canonical findings must be present");
    const baseline = firstGroup.finding.baselineCommit;
    assert.equal(data.provenance?.baselineCommit, baseline, "Results must use the canonical baseline commit");
  }
}

function variant(entry: Json): string {
  if (entry.id === entry.findingId) return "base";
  return entry.id.slice(entry.findingId.length + 1);
}
function pairTiming(entry: Json, field: string): [number, number] | undefined {
  if (!entry.timing) return;
  const before = entry.summaries?.before?.[field];
  const after = entry.summaries?.after?.[field];
  if (typeof before !== "number" || typeof after !== "number") return;
  return [before * 1000, after * 1000];
}
function requiredTiming(entry: Json, field: string): [number, number] {
  const pair = pairTiming(entry, field);
  assert.ok(pair, `${entry.id} requires before/after ${field} summaries`);
  return pair;
}
function timingCell(cases: Json[]): string {
  const timed = cases.filter((entry) => pairTiming(entry, "wallMsPerOperation"));
  if (!timed.length) return "Not timed";
  const show = (entry: Json) => {
    const wall = requiredTiming(entry, "wallMsPerOperation");
    const cpu = requiredTiming(entry, "cpuMsPerOperation");
    let label = "";
    if (cases.length > 1) label = `${variant(entry)} `;
    return `${label}W ${number(wall[0])}→${number(wall[1])}; C ${number(cpu[0])}→${number(cpu[1])}`;
  };
  if (timed.length <= 2) return timed.map(show).join(" / ");
  const range = (field: string, side: 0 | 1) => {
    const values = timed.map((entry) => requiredTiming(entry, field)[side]);
    return `${number(Math.min(...values))}–${number(Math.max(...values))}`;
  };
  const regressions = timed.filter((entry) =>
    ["wallMsPerOperation", "cpuMsPerOperation"].some((field) => {
      const pair = requiredTiming(entry, field);
      return pair[1] > pair[0];
    }),
  );
  return `W ${range("wallMsPerOperation", 0)}→${range("wallMsPerOperation", 1)}; C ${range("cpuMsPerOperation", 0)}→${range("cpuMsPerOperation", 1)}; ↑ ${regressions.length}/${timed.length} variants`;
}
const isMemoryMetric = (name: string) => /heap|rss|(?:external|arrayBuffers).*bytes/iu.test(name);
function deterministicMetrics(entry: Json) {
  const before = entry.metrics?.before ?? {};
  const after = entry.metrics?.after ?? {};
  return Object.keys(before)
    .filter((name) => !/profiler|wallMs|cpuMs/iu.test(name) && !isMemoryMetric(name))
    .map((name) => ({ name, unit: entry.metricUnits?.[name] ?? "count", before: before[name], after: after[name] }));
}
function metricLabel(name: string): string {
  if (/allocated.?slots|copied.?slots/iu.test(name)) return "logical slots";
  return name.replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase();
}
function metricCell(cases: Json[], maximum = 2): string {
  const metrics = cases.flatMap((entry) =>
    deterministicMetrics(entry).map((metric) => ({ ...metric, variant: variant(entry) })),
  );
  const names = [...new Set(metrics.map((metric) => metric.name))];
  names.sort((left, right) => {
    const changed = (name: string) => metrics.some((metric) => metric.name === name && metric.before !== metric.after);
    return Number(changed(right)) - Number(changed(left));
  });
  const display = names.slice(0, maximum).map((name) => {
    const values = metrics.filter((metric) => metric.name === name);
    const format = (side: "before" | "after") => {
      const numbers = values.map((metric) => metric[side]);
      const minimum = Math.min(...numbers);
      const largest = Math.max(...numbers);
      if (minimum === largest) return number(minimum);
      return `${number(minimum)}–${number(largest)}`;
    };
    return `${clip(metricLabel(name), 28)} ${format("before")}→${format("after")}`;
  });
  if (names.length > maximum) display.push(`+${names.length - maximum} in data`);
  if (!display.length) return "None supplied";
  return display.join("; ");
}
function fixtureCell(cases: Json[]): string {
  if (!cases.length) return "Missing";
  const descriptions = [...new Set(cases.map((entry) => clean(entry.fixture)).filter(Boolean))];
  if (cases.length <= 2) return clip(descriptions.join(" / "), 100);
  return `${cases.length} variants (${clip(cases.map(variant).join(", "), 50)}); ${clip(descriptions[0], 45)}`;
}
function memoryCell(finding: Json, disposition: Disposition | undefined, cases: Json[]): string {
  const memory = cases.flatMap((entry) =>
    Object.keys(entry.metrics?.before ?? {})
      .filter(isMemoryMetric)
      .map((name) => ({ name, before: entry.metrics.before[name], after: entry.metrics.after[name] })),
  );
  const buffers = memory.find((metric) => /arrayBuffers/iu.test(metric.name));
  if (buffers) {
    const probe = cases.find((entry) => entry.metrics?.before?.[buffers.name] !== undefined);
    const scale = probe?.fixture?.match(/\b(?:32|64)\s*MiB/u)?.[0] ?? "fixture";
    const values = memory.map((metric) => {
      let label = "buffers";
      if (/rss/iu.test(metric.name)) label = "RSS";
      if (/external/iu.test(metric.name)) label = "external";
      return `${label} ${number(metric.before)}→${number(metric.after)} B`;
    });
    return `${scale} one-probe sampled peak growth: ${values.join("; ")}`;
  }
  if (memory.length) return "Sampled memory: one probe; raw data";
  const metrics = cases.flatMap(deterministicMetrics);
  const bytes = metrics.find((metric) => /bytes/iu.test(metric.name) && metric.before !== metric.after);
  if (bytes) return `Serialized fixture bytes ${number(bytes.before)}→${number(bytes.after)}; not heap`;
  if (disposition?.status !== "implemented") return "Final heap not measured";
  if (metrics.some((metric) => /slots|reference writes|array objects/iu.test(metric.unit))) {
    return "Fewer logical slots/refs; source formula, not heap";
  }
  if (metrics.some((metric) => /Arrays|ArrayCopies|StepObjects|copiedIds/u.test(metric.name))) {
    return "Fewer array/object constructions; bytes not measured";
  }
  if (finding.id === "SUI-002") return "One ref hook/write removed; bytes not measured";
  if (finding.id === "WIDGETS_B_005") return "One memo hook removed; bytes not measured";
  if (finding.id === "WIDGETS_B_009") return "Retain up to 2 locale formatters; bytes not measured";
  if (finding.id === "WIDGETS_B_006") return "Retain cached server counts; bytes not measured";
  if (finding.id === "SUI-001") return "Retain stable context object; bytes not measured";
  if (finding.id === "FW-002") return "Remove growing object copies; bytes not measured";
  if (["A3", "RS-001", "NMG-001"].includes(finding.id)) return "Timer/listener/request counts; not byte savings";
  if (["API-002", "API-006", "F3"].includes(finding.id)) return "Bounded in-flight work; heap not measured";
  if (
    [
      "API-001",
      "API-003",
      "A-1",
      "NRA-001",
      "MEGA-mega_forms-01",
      "WB-004",
      "MTAIL-001",
      "NMG-004",
      "SUI-006",
      "A4",
      "WIDGETS_B_002",
      "WIDGETS_B_003",
      "DCR-001",
      "F2",
    ].includes(finding.id)
  ) {
    return "Map/Set adds O(n) lookup storage; bytes not measured";
  }
  return "Not measured";
}
// Final fixture limits stay separate from the workers' historical execution notes.
const laneFixtureLimits: Record<string, string> = {
  api_core: "Synthetic sizes; deployed sizes unmeasured",
  api_io: "Mocked IO; upstream capacity unmeasured",
  services: "Source fixtures; no live service IO",
  custom_widgets: "Capped JSX fixtures; no browser timing",
  management: "Source/cache fixtures; no live requests",
  assistant: "Source derivations; no rendered UI/network",
  board_forms: "Source fixtures; no browser timing",
  widget_aggregates: "Synthetic integration data; no live IO",
  widget_lookups: "Source data operations; no live IO",
  widget_render: "Host UI stubs; no browser/live service proof",
  notebook_timers: "Fake clock/host UI; no browser validation",
  routes_assets: "Controlled route IO; no deployed measurement",
  accessibility: "No browser or screen-reader validation",
};
const findingFixtureLimits: Record<string, string> = {
  "API-003": "Docker/DB snapshots; no live daemon",
  "API-004": "SQLite run; PostgreSQL SQL compiled only",
  "API-005": "Mocked ORM JSON; no DB/network-byte measure",
  "API-006": "Mocked K8s reads; live API unmeasured",
  "A-1": "Mocked DB; no live feed fetching",
  CLI001: "SQLite query fixture; CLI UI not timed",
  CLI002: "SQLite query fixture; CLI UI not timed",
  CLI003: "SQLite query fixture; CLI UI not timed",
  "DCR-001": "Startup/weekly path; no live repository IO",
  "DCR-002": "Fixture scheduling; no live cron startup",
  "FW-002": "Locale/wide-object fixtures; output equal",
  F1: "Original RPCs; concurrency safety unproven",
  F2: "Redis registration fixture; no icon fetch",
  F3: "Mocked requests; live rate limits unknown",
  "FW-001": "O(1) cursor; backward scans reset position",
  "MTAIL-002": "Simulated request schedule; not timed",
  "NMG-001": "Fake clock; browser polling not measured",
  "NMG-002": "Real Flight fixture; no live API requests",
  "NMG-005": "Real Flight fixture; no live API requests",
  "NSC-1": "Simulated dependency schedule; not timed",
  "SUI-002": "Structural hook removal only; not timed",
  A2: "Synthetic session data; no React commit",
  A5: "Visibility variants vary; no broad CPU claim",
  WIDGETS_B_005: "Simpler code; no production CPU claim",
  WIDGETS_B_009: "Stable locale/data; mount-only excluded",
  "RS-001": "Fixture editor; no real TipTap cost",
  "WMA1-01": "Fixture text; TipTap traversal not measured",
  "MEGA-assets-01": "One peak probe; GC/read order affect it",
  "MEGA-mega_routes-01": "One peak probe; GC/read order affect it",
  "MEGA-mega_routes-02": "Semantic fixture; no live Docker proof",
  "MEGA-mega_design_board-01": "jsdom geometry; physical touch unverified",
};
function caveatCell(finding: Json, disposition: Disposition | undefined, cases: Json[]): string {
  if (!disposition) return "Disposition missing";
  let caveat =
    findingFixtureLimits[finding.id] ?? laneFixtureLimits[finding.lane] ?? "Fixture scope; no production measurement";
  if (timerPrototypeIds.includes(finding.id)) caveat = "Original clocks; final timing is noise";
  if (rejectedWidgets.some((candidate) => candidate.id === finding.id))
    caveat = "Original renderer; final timing is noise";
  if (!cases.length) return `${caveat}; result missing`;
  return caveat;
}

const header =
  "| ID | Finding | Disposition | Fixture | Wall / CPU µs, before→after | Deterministic work, before→after | Memory interpretation | Semantic checks | Caveats |\n|---|---|---|---|---|---|---|---|---|";
function renderRows(compact = false) {
  return groups.map(({ finding, disposition, cases }) => {
    const checks = cases.filter((entry) => entry.verification === "passed").length;
    const columns = [
      finding.id,
      clip(finding.title, compact ? 55 : 75),
      disposition?.status ?? "unreported",
      clip(fixtureCell(cases), compact ? 55 : 100),
      timingCell(cases),
      metricCell(cases, compact ? 1 : 2),
      memoryCell(finding, disposition, cases),
      `${checks}/${cases.length} passed`,
      clip(caveatCell(finding, disposition, cases), compact ? 45 : 100),
    ];
    return `| ${columns.map(cell).join(" | ")} |`;
  });
}
let table = `${header}\n${renderRows().join("\n")}\n`;
if (table.length > 25_000) table = `${header}\n${renderRows(true).join("\n")}\n`;
const variantsHeader =
  "| Finding / scenario | Fixture | Wall µs before→after | CPU µs before→after | Observed increases | Semantic checks |\n|---|---|---|---|---|---|";
const variantRows = [...results.values()].map((entry) => {
  const wall = pairTiming(entry, "wallMsPerOperation");
  const cpu = pairTiming(entry, "cpuMsPerOperation");
  const show = (pair: [number, number] | undefined) => {
    if (!pair) return "Not timed";
    return `${number(pair[0])}→${number(pair[1])}`;
  };
  const increased: string[] = [];
  for (const [name, pair] of [
    ["wall", wall],
    ["CPU", cpu],
  ] as const) {
    if (!pair || pair[1] <= pair[0]) continue;
    if (pair[0] === 0) increased.push(`${name} increased from zero`);
    else increased.push(`${name} +${number((pair[1] / pair[0] - 1) * 100)}%`);
  }
  const columns = [entry.id, entry.fixture, show(wall), show(cpu), increased.join("; ") || "—", entry.verification];
  return `| ${columns.map(cell).join(" | ")} |`;
});
const measuredCount = [...results.values()].filter((entry) => entry.timing).length;
const statusCounts = ["implemented", "retained", "reverted", "unreported"].map(
  (label) => `${groups.filter(({ disposition }) => (disposition?.status ?? "unreported") === label).length} ${label}`,
);
const baselineCommits = [...new Set(groups.map(({ finding }) => finding.baselineCommit))];
assert.equal(baselineCommits.length, 1, "All findings must use the same baseline");
const runtimes = [...new Set(documents.map(({ data }) => data.runtime?.node).filter(Boolean))];
const rawPaths = [...documents.map(({ path }) => path), ...abortedArtifacts.keys()];
for (const artifact of abortedArtifacts.values()) {
  let logPath = artifact.path.replace(/\.json$/u, ".log");
  if (artifact.metadata.logPath) logPath = resolve(dirname(artifact.path), artifact.metadata.logPath);
  if (existsSync(logPath)) rawPaths.push(logPath);
}
const rawLinks = [...new Set(rawPaths)].map((path) => `- [${relative(directory, path)}](${link(path)})`).join("\n");
const recoveredCases = documents
  .filter(({ data }) => data.status === "recovered_completed_cases")
  .reduce((total, { data }) => total + data.results.length, 0);
const freshRuns = documents.filter(({ data }) => data.status === "passed");
const freshCases = freshRuns.reduce((total, { data }) => total + data.results.length, 0);
let recoveryNote = "";
if (abortedArtifacts.size) {
  const completed = [...abortedArtifacts.values()].reduce(
    (total, artifact) => total + artifact.metadata.completedCases,
    0,
  );
  recoveryNote = `\nThe first combined benchmark run aborted with Node heap out of memory after ${completed} cases had been completely saved. ${recoveredCases} unchanged complete cases were recovered with the original raw artifact's SHA256 and status preserved; ${freshCases} replacement cases were run serially in ${freshRuns.length} fresh lane processes. This report accepts only fully saved case evidence with semantic checks and, for every timed case, all 18 raw samples / nine before-after pairs. The original aborted run remains a raw artifact and is not labeled passed. Invocation, warmup, iteration and runtime metadata remain per input process; cross-lane totals are not one same-process timing run.\n`;
}
const rejectedTimer = lanes.get("notebook_timers")?.rejectedNotificationCandidate;
const rejectedWazuh = lanes.get("notebook_timers")?.rejectedWazuhCandidate;
// Keep rejected-prototype timing separate from the newest final-source overlay.
if (rejectedWazuh && !rejectedWazuh.timing && !rejectedWazuh.summaries) {
  const initial = [...documents, ...abortedArtifacts.values()].find(({ data }) =>
    data.results?.some(
      (entry: Json) => entry.id === "A3" && entry.source?.some((source: Json) => source.file.includes("use-row-time")),
    ),
  );
  const candidateCase = initial?.data.results?.find((entry: Json) => entry.id === "A3");
  if (candidateCase && initial) {
    rejectedWazuh.summaries = candidateCase.summaries;
    rejectedWazuh.timingInput = initial.path;
  }
}
let rejectedNote = "";
if (rejectedTimer?.metrics) {
  const candidate = rejectedTimer.metrics;
  rejectedNote = `\nThe notification timer candidate was removed: at 10 rows label calculations increased ${candidate.before.labelCalculations_10Rows}→${candidate.after.labelCalculations_10Rows}, and at 100 rows ${candidate.before.labelCalculations_100Rows}→${candidate.after.labelCalculations_100Rows}, while timer counts fell ${candidate.before.peakTimers_10Rows}/${candidate.before.peakTimers_100Rows}→${candidate.after.peakTimers_10Rows}/${candidate.after.peakTimers_100Rows}. Existing row timers were retained. These rejected-candidate counters come from a separate replay, not the final paired current-code timings. The candidate reason, counter values and source hashes are preserved in the bundled inputs and report data.\n`;
}
if (rejectedWazuh?.metrics) {
  const candidate = rejectedWazuh.metrics;
  const timing = rejectedWazuh.summaries ?? rejectedWazuh.timing?.summaries ?? rejectedWazuh.timing;
  let timingNote = "";
  if (timing?.before && timing?.after) {
    const wallBefore = timing.before.wallMsPerOperation ?? timing.before.wallMs;
    const wallAfter = timing.after.wallMsPerOperation ?? timing.after.wallMs;
    const cpuBefore = timing.before.cpuMsPerOperation ?? timing.before.cpuMs;
    const cpuAfter = timing.after.cpuMsPerOperation ?? timing.after.cpuMs;
    if ([wallBefore, wallAfter, cpuBefore, cpuAfter].every((value) => typeof value === "number")) {
      timingNote = ` The rejected fixture's median wall was ${exactMilliseconds(wallBefore)}→${exactMilliseconds(wallAfter)} ms (+${number((wallAfter / wallBefore - 1) * 100)}%), and CPU ${exactMilliseconds(cpuBefore)}→${exactMilliseconds(cpuAfter)} ms (+${number((cpuAfter / cpuBefore - 1) * 100)}%).`;
    }
  }
  let winsNote = "";
  if (Number.isInteger(rejectedWazuh.pairedTrialWins) && Number.isInteger(rejectedWazuh.pairedTrials)) {
    winsNote = ` The prototype was faster in ${rejectedWazuh.pairedTrialWins} of ${rejectedWazuh.pairedTrials} recorded paired comparisons, reinforcing the timing variability.`;
  }
  rejectedNote += `\nThe Wazuh clock candidate was also removed: label calculations at 1/10/100 rows increased ${candidate.before.labelCalculations_1Rows}/${candidate.before.labelCalculations_10Rows}/${candidate.before.labelCalculations_100Rows}→${candidate.after.labelCalculations_1Rows}/${candidate.after.labelCalculations_10Rows}/${candidate.after.labelCalculations_100Rows}; at 100 rows timers fell ${candidate.before.peakTimers_100Rows}→${candidate.after.peakTimers_100Rows} and tick renders ${candidate.before.tickRenders_100Rows}→${candidate.after.tickRenders_100Rows}.${timingNote}${winsNote} These benefits did not justify the added shared-store complexity under the deletion priority. This does not establish a dashboard regression. Original per-row clocks were retained; their final identical-source before/after timing differences are noise. [The inert candidate source/fixture archive and measured record](candidates/wazuh-clock/measured-A3.json) preserve this separate prototype evidence; fixture provenance uses the raw caseSha256 field, separately from production source spans.\n`;
}
const candidateHeader =
  "| Rejected candidate / scenario | Fixture | Wall µs before→after | CPU µs before→after | Wall / CPU change | Paired wall / CPU wins | Deterministic work, before→after | Checks |\n|---|---|---|---|---|---|---|---|";
const candidateRows = rejectedWidgets.flatMap((candidate) =>
  (candidate.cases ?? []).map((entry: Json) => {
    const wall = pairTiming(entry, "wallMsPerOperation");
    const cpu = pairTiming(entry, "cpuMsPerOperation");
    const show = (pair: [number, number] | undefined) => {
      if (!pair) return "Not timed";
      return `${number(pair[0])}→${number(pair[1])}`;
    };
    const change = (pair: [number, number] | undefined) => {
      if (!pair) return "Not timed";
      if (pair[0] === 0) return "From zero";
      const percentage = (pair[1] / pair[0] - 1) * 100;
      let prefix = "";
      if (percentage > 0) prefix = "+";
      return `${prefix}${number(percentage)}%`;
    };
    const outcome = candidate.pairedOutcomes?.find((record: Json) => record.id === entry.id);
    let wins = "Not supplied";
    if (outcome)
      wins = `${outcome.pairedWallWins}/${outcome.pairedTrials}; ${outcome.pairedCpuWins}/${outcome.pairedTrials}`;
    const values = [
      entry.id,
      entry.fixture,
      show(wall),
      show(cpu),
      `W ${change(wall)}; C ${change(cpu)}`,
      wins,
      metricCell([{ ...entry, findingId: candidate.id }], Number.MAX_SAFE_INTEGER),
      entry.verification,
    ];
    return `| ${values.map(cell).join(" | ")} |`;
  }),
);
const candidateNotes = rejectedWidgets
  .map((candidate) => {
    const links: string[] = [];
    for (const [field, label] of [
      ["casesFile", "raw paired records"],
      ["sourceManifest", "source hash manifest"],
      ["caseFile", "inert case fixture"],
    ]) {
      const path = candidate.archive?.[field];
      if (typeof path === "string") links.push(`[${label}](${link(resolveArtifact(path))})`);
    }
    return `- **${candidate.id}:** ${clip(humanText(candidate.reason), 600)} ${links.join("; ")}`;
  })
  .join("\n");
let rejectedWidgetNote = "";
if (candidateRows.length) {
  rejectedWidgetNote = `\n## Rejected widget prototypes\n\nThe Coolify memo and cluster rendering candidates were removed after these separate candidate measurements. Every selected scenario is shown, including small/large improvements and regressions. Their final-source rows below use the restored original implementation; identical-source timing differences are noise. The candidate fixture, production source hashes, raw pairs and rejection reasons remain archived. Timings cover local React fixture operations and do not establish dashboard performance. Paired wins compare each same-trial before/after pair; changes compare separate side medians, so these statistics can differ.\n\n${candidateNotes}\n\n${candidateHeader}\n${candidateRows.join("\n")}\n\n`;
}
const implementedCount = groups.filter(({ disposition }) => disposition?.status === "implemented").length;
const unchanged = groups.filter(
  ({ finding, disposition }) => disposition?.status === "retained" && !prototypeIds.includes(finding.id),
);
const decisionLedger = `Decision ledger: ${implementedCount} implemented; ${unchanged.length} unchanged (${unchanged.map(({ finding }) => finding.id).join(", ") || "none"}); ${prototypeIds.length} rejected prototypes (${prototypeIds.join(", ") || "none"}), with original implementations retained. The rejected candidates comprise ${timerPrototypeIds.length} timer and ${rejectedWidgets.length} widget prototypes.`;
function implementationDetail(finding: Json, disposition: Disposition | undefined): string {
  let detail = clean(
    disposition?.details.change ??
      disposition?.details.summary ??
      disposition?.details.implementation ??
      disposition?.details.notes ??
      disposition?.details.reason,
  );
  if (timerPrototypeIds.includes(finding.id)) {
    detail =
      "Original per-row clocks retained; shared timer prototype removed. Candidate measurements and reasons are recorded in the separate rejection ledger above.";
  }
  if (rejectedWidgets.some((candidate) => candidate.id === finding.id)) {
    detail =
      "Original renderer retained; candidate memo/rewrite removed. Separate candidate scenario measurements include both gains and regressions, with archived source and fixture provenance.";
  }
  if (finding.id === "RS-001")
    detail =
      "Attach the color selection listener when editor or selection callback changes; preserve color updates and listener cleanup while removing attachment churn on unrelated renders.";
  if (finding.id === "WMA1-01")
    detail =
      "Read and split notebook text only while document statistics are visible; preserve visible counts and skip hidden text extraction.";
  if (finding.id === "WIDGETS_B_005")
    detail =
      "Remove the primitive timestamp memo and use the same value directly. Primitive values and effect behavior remain equivalent; retain the deletion for simpler code. Fixture timings do not establish a production CPU benefit.";
  if (finding.id === "A5")
    detail =
      "Skip the agent version sort and scan while the footer is hidden. Visible and resized states preserve displayed values. Timing results vary with visibility and fixture size; no universal CPU improvement is claimed.";
  if (finding.id === "WIDGETS_B_009")
    detail =
      "Reuse lazy date and timestamp formatters in a memo keyed by locale. Preserve UTC date-only and local timestamp formatting, invalid inputs and locale changes. Exact fixture medians remain in the timing tables.";
  detail = humanText(detail);
  if (!detail) detail = "See the lane validation and semantic outcomes in grouped report data.";
  return detail;
}
const implementationNotes = groups
  .map(({ finding, disposition }) => {
    return `- **${finding.id} (${disposition?.status ?? "unreported"}):** ${clip(implementationDetail(finding, disposition), 350)}`;
  })
  .join("\n");
let incomplete = "";
if (missing.length || failures.length || incompleteSources.length) {
  incomplete = `\nThis is an incomplete smoke report: ${missing.length} findings lack results/dispositions; ${failures.length} scenarios failed; ${incompleteSources.length} scenarios lack source hashes.\n`;
}
const report = `# Homarr performance audit before/after report

${groups.length} canonical findings: ${statusCounts.join(", ")}. ${results.size} scenario cases passed their supplied checks; ${measuredCount} cases include paired timings.${incomplete}

${decisionLedger}

${recoveryNote}

The table covers every finding once. Values are median wall (W) and process CPU (C) microseconds per case operation, before→after. Small/large pairs retain their labels; findings with more variants show timing ranges and the number with any observed increase. [All exact scenario pairs and increases](VARIANTS.md) remain visible. A range's endpoints may come from different scenarios; it is not a paired speedup. Every operation uses the fixture scope described by its case, which may contain multiple renders, records or mocked requests.

These are local fixture measurements, not production response latency, user-perceived speed, peak heap, or deployment acceptance. Structural/accessibility cases with timing:false are marked “Not timed”. React Profiler durations, when supplied, come from one cold verification probe and are excluded from deterministic work counts and warmed median timing claims. Logical allocated/copied slots count array work calculated from fixture cardinality and the selected source operations; they are not runtime allocation traces, bytes or peak memory. Batch heap/RSS snapshots are process noise and remain in the raw appendix; neither negative deltas nor lower snapshots prove memory savings. Stream cases separately sample process RSS/external/ArrayBuffer growth during one 32/64 MiB lazy-stream probe. Those sampled maxima are not the nine-trial timing medians or exact production peaks; GC and read order affect them.${rejectedNote}${rejectedWidgetNote}

${table}
## What changed

The table names the original findings. [Grouped report data](report-data.json) records each final implementation, validation and caveat. [Dispatch](DISPATCH.md) records the 13 lanes and all 62 findings.

API-001 replaces repeated opposite-collection membership searches with shared ID indexes: the membership phase changes from O(n×m) to expected O(n+m), while retaining ordered added/updated/removed outputs. API-003 builds Docker reconciliation Maps in linear configured-record work, then performs candidate lookups and required bucket checks; this does not imply the entire reconciliation is linear for every duplicate/candidate distribution. RSS restrictions and each bookmark query build a membership Set: expected O(n+m) membership work with O(m) auxiliary entries for that scope. Database reads, parsing, serialization, rendering and per-query repetition remain outside those claims.

Final implementation notes (full records and limits remain in the grouped data):

${implementationNotes}

## Reproduction and provenance

Baseline commit: \`${baselineCommits[0]}\`. Before source comes from the frozen archive \`/tmp/homarr-performance-before-bab37f7\`; the runner checks each before-file SHA256 against \`git show baselineCommit:path\`. Each case records source-file hashes, selected declaration/span hashes, the case-file hash and harness hashes in the raw JSON. After-source evidence records the measured working tree, including uncommitted changes; commit metadata alone does not identify all measured code.

Runtime(s): ${runtimes.join(", ") || "missing"}. Use pinned Node 24.18.0 and Bun 1.4.2 for dependencies. The source-extraction compiler is an isolated TypeScript 5.9.3 install; it does not replace the application's compiler. Dependencies are shared between before/after; baseline workspace imports point to baseline packages. Timed runs execute serial cases with alternating before/after trial order, warmups, explicit GC when available, and retained raw samples. Process CPU includes operation-loop overhead; short-case changes can be timing variance. Mocked I/O and fixture-clock outcomes do not establish real upstream concurrency, latency or scaling.

Follow the [README setup](README.md#reproduce) first to install pinned dependencies, create the archive/compiler, and link baseline workspace dependencies. After that setup:

\`\`\`sh
mkdir -p /tmp/homarr-reproduced-audit
for audit_lane in api_core api_io assistant board_forms custom_widgets management notebook_timers routes_assets services widget_aggregates widget_lookups widget_render accessibility; do
  BENCH_COMPILER_ROOT=/tmp/homarr-performance-compiler mise exec -- node --expose-gc scripts/benchmarks/performance-audit/run.mts --before /tmp/homarr-performance-before-bab37f7 --after "$PWD" --lane "$audit_lane" --out "/tmp/homarr-reproduced-audit/$audit_lane.json"
done
mise exec -- node scripts/benchmarks/performance-audit/report.mts --results /tmp/homarr-reproduced-audit
\`\`\`

The report generator reads committed [inputs.json](inputs.json) by default and needs no temporary worker files. Maintainers can refresh that compact bundle with \`--workdir /tmp/homarr-performance-work\`. It also accepts repeated \`--results FILE\` or a results directory. Recovered evidence uses status \`recovered_completed_cases\` and must identify the unmodified aborted artifact, its hash/status/reason, original completed count, and selected complete count; all selected case records must exactly match the saved original. Original aborted artifacts referenced by this metadata are excluded from final case selection and linked as raw evidence. Other input runs must be passed. For overlapping completed results, the newest timed result per variant supplies the final table; initial prototype data remains in the separate rejection ledger and [candidate measurements](REJECTED_CANDIDATES.md). Rejected widget records are checked against their archived raw JSON and SHA256; final rejected-prototype rows must use baseline-identical source hashes. Re-running current code reproduces retained implementations, not removed prototypes. \`--allow-incomplete\` is for smoke reports and marks missing coverage explicitly. Per-case iteration counts and fixture scales are recorded in the JSON. Fixture results establish only the tested data scales and behavior; extrapolation to production requires separate evidence.

## Raw appendix

[All grouped metrics, dispositions, fixture descriptions, semantic status and provenance](report-data.json). [All scenario timing pairs](VARIANTS.md). Raw per-batch heap/RSS/CPU/wall samples, runtime metadata, complete source hashes and verification details:

${rawLinks}
`;
mkdirSync(options.outdir, { recursive: true });
const compactDetails = (details: Json) =>
  Object.fromEntries(
    [
      "id",
      "status",
      "disposition",
      "decision",
      "change",
      "summary",
      "implementation",
      "reason",
      "rationale",
      "caveats",
      "limits",
      "notes",
      "complexity",
    ]
      .filter((name) => details[name] !== undefined)
      .map((name) => {
        if (["id", "status", "disposition", "decision"].includes(name)) return [name, details[name]];
        if (typeof details[name] === "string" || Array.isArray(details[name]))
          return [name, clip(currentText(details[name]), 600)];
        return [name, details[name]];
      }),
  );
const compactRejectedWidgets = rejectedWidgets.map((candidate) => ({
  ...candidate,
  cases: candidate.cases.map((entry: Json) => {
    if (candidate.archive?.casesFile) return { ...entry, samples: undefined };
    return entry;
  }),
}));
const compactLanes = Object.fromEntries(
  [...lanes].map(([name, lane]) => [
    name,
    Object.fromEntries(
      [
        "validation",
        "verification",
        "caveats",
        "limits",
        "commands",
        "rejectedNotificationCandidate",
        "rejectedWazuhCandidate",
        "rejectedWidgetCandidates",
      ]
        .filter((key) => lane[key] !== undefined)
        .map((key) => {
          if (key === "rejectedWidgetCandidates") return [key, compactRejectedWidgets];
          // Select metadata fields and omit duplicate raw samples, but preserve
          // every provenance string, including selector whitespace, exactly.
          return [key, lane[key]];
        }),
    ),
  ]),
);
if (options.workdir)
  writeFileSync(
    join(options.outdir, "inputs.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        baselineCommit: baselineCommits[0],
        lanes: compactLanes,
        findings: groups.map(({ finding, disposition }) => ({
          id: finding.id,
          title: finding.title,
          lane: finding.lane,
          baselineCommit: finding.baselineCommit,
          tradeoffs: clip(finding.tradeoffs, 300),
          disposition: disposition && {
            status: disposition.status,
            details: {
              ...compactDetails(disposition.details),
              status: disposition.status,
              change: implementationDetail(finding, disposition),
            },
          },
        })),
      },
      null,
      2,
    )}\n`,
  );
writeFileSync(join(options.outdir, "FINDINGS_TABLE.md"), table);
writeFileSync(
  join(options.outdir, "VARIANTS.md"),
  `# Exact scenario timing pairs\n\nBefore→after values are µs per case operation. Every observed wall/CPU increase is shown, including short-case noise. Not timed means no timing measurement was performed. Fixture descriptions identify the operation scale.\n\n${variantsHeader}\n${variantRows.join("\n")}\n`,
);
writeFileSync(join(options.outdir, "REPORT.md"), report);
writeFileSync(
  join(options.outdir, "REJECTED_CANDIDATES.md"),
  `# Rejected candidate evidence\n\nThe final source retains the original implementations for these findings. This ledger records separately measured removed prototypes; final identical-source timing differences are noise.\n${rejectedNote}${rejectedWidgetNote}`.trimEnd() +
    "\n",
);
writeFileSync(
  join(options.outdir, "report-data.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      incomplete: Boolean(missing.length || failures.length || incompleteSources.length),
      missing: missing.map(({ finding }) => finding.id),
      failures,
      recovery: documents
        .filter(({ data }) => data.recovery)
        .map(({ path, data }) => ({ input: path, ...data.recovery })),
      rejectedNotificationCandidate: rejectedTimer,
      rejectedWazuhCandidate: rejectedWazuh,
      rejectedWidgetCandidates: compactRejectedWidgets,
      provenance: documents.map(({ path, data }) => ({
        input: path,
        provenance: data.provenance,
        runtime: data.runtime,
        configuration: data.configuration,
        methodology: data.methodology,
        recovery: data.recovery,
      })),
      findings: groups.map(({ finding, disposition, cases }) => ({
        id: finding.id,
        title: finding.title,
        lane: finding.lane,
        disposition: disposition?.status ?? "unreported",
        details: {
          ...compactDetails(disposition?.details ?? {}),
          status: disposition?.status,
          change: implementationDetail(finding, disposition),
        },
        sourceLaneDisposition: { historical: true, record: disposition?.details },
        sourceLaneValidation: { historical: true, record: disposition?.lane.validation },
        sourceLaneLimits: { historical: true, record: disposition?.lane.limits ?? disposition?.lane.caveats },
        fixtureLimit: caveatCell(finding, disposition, cases),
        cases: cases.map((entry) => ({
          ...entry,
          samples: undefined,
          deterministicMetrics: deterministicMetrics(entry),
        })),
      })),
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${groups.length} finding rows, ${results.size} scenarios, ${measuredCount} timed; table ${table.length} characters; ${options.outdir}`,
);
if (table.length > 25_000)
  console.warn("Table exceeds the 25,000 character target; PR body remains separately reviewable.");
