/** Portable evidence from scripts/sanity; importing this module never starts a browser. */
export const sanityReportVersion = 1;
export const maxSanityReportBytes = 30 * 1024 * 1024;

export interface SanityIdentity {
  label: string;
  sourceSha: string;
  imageDigest?: string;
  sourceVerification?: "oci-label" | "buildkit-attestation";
  /** Informational origin of a disposable fixture instance. */
  url?: string;
}

export interface SanityCheck {
  id: string;
  label: string;
  status: "passed" | "failed";
  expected: string;
  observed: string;
}

export interface SanityCapture {
  status: "complete" | "error";
  checks: SanityCheck[];
  image?: string;
  /** Serialized board snapshot, validated separately by the board snapshot parser. */
  snapshot?: string;
  error?: string;
  durationMs: number;
}

export interface SanityScenario {
  id: string;
  title: string;
  viewport: { width: number; height: number };
  before: SanityCapture;
  after: SanityCapture;
}

export interface SanityReport {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  mode: "pr" | "release";
  base: SanityIdentity;
  candidate: SanityIdentity;
  fixture: { id: string; sha256: string };
  browser: { name: "chromium"; version: string; platform: "linux" };
  selection: {
    baseSha: string;
    headSha: string;
    scenarios: { id: string; reasons: string[] }[];
    unmappedPaths: string[];
    coverageDecisions?: { path: string; blobSha: string; reason: string; scenarios: string[] }[];
  };
  scenarios: SanityScenario[];
  deterministicStatus: "passed" | "failed" | "blocked";
  visualReview: { status: "pending" };
  timings: { startupMs: number; checksMs: number };
}

/** Trusted fixture and browser identity captured before running or accepting evidence. */
export interface SanityRunExpectation {
  fixture: SanityReport["fixture"];
  browser: SanityReport["browser"];
}

export function getSanityDeterministicStatus(
  report: Pick<SanityReport, "selection" | "scenarios">,
): SanityReport["deterministicStatus"] {
  if (report.selection.unmappedPaths.length > 0 || report.selection.scenarios.length === 0) return "blocked";
  const results = new Map(report.scenarios.map((scenario) => [scenario.id, scenario]));
  for (const selected of report.selection.scenarios) {
    const result = results.get(selected.id);
    if (!result || result.before.status === "error" || result.after.status === "error") return "blocked";
    if (
      result.before.checks.length === 0 ||
      result.after.checks.length === 0 ||
      !result.before.image ||
      !result.after.image
    )
      return "blocked";
  }
  if (report.scenarios.some((scenario) => scenario.after.checks.some((check) => check.status === "failed")))
    return "failed";
  return "passed";
}

/**
 * Shape validation permits historical inspection. Acceptance also supplies the
 * expected run identity, obtained independently from trusted fixtures and Chromium.
 */
export function parseSanityReport(text: string, expectedRun?: SanityRunExpectation): SanityReport {
  if (new TextEncoder().encode(text).byteLength > maxSanityReportBytes) throw new Error("Sanity report exceeds 30 MiB");
  const report: unknown = JSON.parse(text);
  object(report);
  if (report.schemaVersion !== sanityReportVersion) throw new Error("Unsupported sanity report version");
  string(report.runId);
  string(report.createdAt);
  choice(report.mode, ["pr", "release"]);
  identity(report.base);
  identity(report.candidate);
  object(report.fixture);
  string(report.fixture.id);
  hash(report.fixture.sha256, 64);
  object(report.browser);
  choice(report.browser.name, ["chromium"]);
  choice(report.browser.platform, ["linux"]);
  string(report.browser.version);
  object(report.selection);
  hash(report.selection.baseSha, 40);
  hash(report.selection.headSha, 40);
  if (report.selection.baseSha !== report.base.sourceSha || report.selection.headSha !== report.candidate.sourceSha)
    throw new Error("Report source identities disagree with selection");
  array(report.selection.scenarios, 100);
  array(report.selection.unmappedPaths, 10000);
  report.selection.unmappedPaths.forEach((path) => string(path));
  const selectedIds = new Set<string>();
  for (const selected of report.selection.scenarios) {
    object(selected);
    string(selected.id);
    if (selectedIds.has(selected.id)) throw new Error("Duplicate selected scenario");
    selectedIds.add(selected.id);
    array(selected.reasons, 10000);
    selected.reasons.forEach((reason) => string(reason));
  }
  if (report.selection.coverageDecisions !== undefined) {
    array(report.selection.coverageDecisions, 10000);
    for (const decision of report.selection.coverageDecisions) {
      object(decision);
      string(decision.path);
      if (decision.blobSha !== "deleted") hash(decision.blobSha, 40);
      string(decision.reason);
      array(decision.scenarios, 100);
      decision.scenarios.forEach((id) => string(id));
    }
  }
  array(report.scenarios, 100);
  const resultIds = new Set<string>();
  for (const scenario of report.scenarios) {
    object(scenario);
    string(scenario.id);
    if (!selectedIds.has(scenario.id) || resultIds.has(scenario.id))
      throw new Error("Unexpected or duplicate scenario evidence");
    resultIds.add(scenario.id);
    string(scenario.title);
    object(scenario.viewport);
    integer(scenario.viewport.width, 1, 4096);
    integer(scenario.viewport.height, 1, 4096);
    capture(scenario.before);
    capture(scenario.after);
  }
  object(report.visualReview);
  choice(report.visualReview.status, ["pending"]);
  object(report.timings);
  integer(report.timings.startupMs, 0, 86400000);
  integer(report.timings.checksMs, 0, 86400000);
  choice(report.deterministicStatus, ["passed", "failed", "blocked"]);
  const typed = report as unknown as SanityReport;
  if (typed.deterministicStatus !== getSanityDeterministicStatus(typed))
    throw new Error("Report status disagrees with its evidence");
  if (typed.mode === "release" && (!typed.base.imageDigest || !typed.candidate.imageDigest))
    throw new Error("Release evidence needs both exact image digests");
  if (expectedRun !== undefined) {
    object(expectedRun);
    object(expectedRun.fixture);
    object(expectedRun.browser);
    if (typed.fixture.id !== expectedRun.fixture.id || typed.fixture.sha256 !== expectedRun.fixture.sha256)
      throw new Error("Sanity report fixture identity does not match the expected run");
    if (
      typed.browser.name !== expectedRun.browser.name ||
      typed.browser.version !== expectedRun.browser.version ||
      typed.browser.platform !== expectedRun.browser.platform
    )
      throw new Error("Sanity report browser identity does not match the expected run");
  }
  return typed;
}

function capture(value: unknown): void {
  object(value);
  choice(value.status, ["complete", "error"]);
  integer(value.durationMs, 0, 86400000);
  array(value.checks, 1000);
  for (const check of value.checks) {
    object(check);
    for (const key of ["id", "label", "expected", "observed"]) string(check[key]);
    choice(check.status, ["passed", "failed"]);
  }
  if (value.error !== undefined) string(value.error);
  if (value.snapshot !== undefined) string(value.snapshot, 10 * 1024 * 1024);
  if (value.image !== undefined) {
    string(value.image, 8 * 1024 * 1024);
    if (!/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(value.image))
      throw new Error("Sanity captures must be embedded PNG images");
  }
}

function identity(value: unknown): asserts value is Record<string, unknown> & SanityIdentity {
  object(value);
  string(value.label);
  hash(value.sourceSha, 40);
  if (value.imageDigest !== undefined) {
    string(value.imageDigest);
    if (!/^sha256:[a-f0-9]{64}$/.test(value.imageDigest)) throw new Error("Image identity must be a sha256 digest");
  }
  if (value.sourceVerification !== undefined) choice(value.sourceVerification, ["oci-label", "buildkit-attestation"]);
  if (value.url !== undefined) {
    string(value.url);
    const url = new URL(value.url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      throw new Error("Invalid fixture instance URL");
  }
}
function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid sanity report object");
}
function string(value: unknown, maximum = 4096): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum)
    throw new Error("Invalid sanity report string");
}
function array(value: unknown, maximum: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > maximum) throw new Error("Invalid sanity report array");
}
function choice(value: unknown, values: string[]): void {
  if (typeof value !== "string" || !values.includes(value)) throw new Error("Invalid sanity report value");
}
function hash(value: unknown, length: number): void {
  string(value);
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(value)) throw new Error("Invalid source or fixture hash");
}
function integer(value: unknown, minimum: number, maximum: number): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new Error("Invalid sanity report number");
}
