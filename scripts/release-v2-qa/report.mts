import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  aggregateQaFindings,
  collectCriticalCoverageGaps,
  collectHumanWidgetStatusErrors,
  collectReportIntegrityErrors,
  normalizeReportMetadata,
  releaseDecision,
} from "./report-integrity.mts";
import {
  assertSafeReportPath,
  readSafeReportFile,
  validateResolvedArtifactPath,
  validateResolvedReproductionEvidencePath,
  writeSafeReportFile,
} from "./report-path-integrity.mts";
import { resolveCheckoutCandidateSha } from "./provenance.mts";
import { createRuntimeExecutionContract } from "./runtime.mts";

type Status = "passed" | "failed" | "blocked" | "not-reached";
type Severity = "P0" | "P1" | "P2" | "P3";

interface Packet {
  id: string;
  wave: string;
  title: string;
  prRefs: number[];
  personas: string[];
  boards: string[];
  profiles: string[];
  viewports: string[];
  zooms: number[];
  inputs: string[];
  widgetKinds?: string[];
  cases: string[];
}

interface Manifest {
  pullRequests: { number: number; label: string }[];
  caseDimensions: Record<string, { id: string; expected: string }[]>;
  packets: Packet[];
}

interface Finding {
  id?: string;
  fingerprint?: string;
  severity: Severity;
  title: string;
  area?: string;
  summary?: string;
  caseIds?: string[];
  evidence?: string[];
}

interface ReportMetadata {
  packetId: string;
  status: Status;
  caseStatuses: Record<string, Status>;
  execution: {
    candidateSha: string | null;
    url: string | null;
    actualPort: number | null;
    runtimeProfile: string | null;
    runtimeFlags: string[];
    persona: string | null;
    sessionId: string | null;
    timestamp: string | null;
    viewport: string | null;
    input: string | null;
    zoom: number | null;
  };
  findings: Finding[];
  artifacts: string[];
  widgetChecks: WidgetCheck[];
  performance: {
    measurements: PerformanceMeasurement[];
    limitations: string[];
  };
  independentReproductions: IndependentReproduction[];
  notes: string;
}

interface WidgetCheck {
  widgetKind: string;
  viewport: string;
  sizeRequirement: string;
  status: Status;
}

interface PerformanceMeasurement {
  name: string;
  value: number | null;
  unit: string;
  threshold: string;
  status: Status;
  evidence: string[];
}

interface IndependentReproduction {
  findingFingerprint: string;
  agentId: string;
  outcome: "reproduced" | "not-reproduced" | "blocked" | "not-reached";
  evidence: string[];
  notes: string;
}

interface PlaceholderRefreshOptions<T> {
  read: (entry: T) => Promise<string>;
  isSafePlaceholder: (content: string, entry: T) => boolean;
  render: (entry: T) => string;
  write: (entry: T, content: string) => Promise<void>;
}

interface PlaceholderRefreshCounts {
  refreshed: number;
  skipped: number;
}

interface ReportSnapshot {
  content: string;
  mtimeMs: number;
  size: number;
}

interface ResolvedBlockerRolloverOptions<T, TSnapshot extends { content: string }> {
  read: (entry: T) => Promise<TSnapshot>;
  isEligible: (content: string, entry: T) => boolean;
  isUnchanged: (entry: T, snapshot: TSnapshot) => Promise<boolean>;
  render: (entry: T) => string;
  write: (entry: T, content: string) => Promise<void>;
}

interface ResolvedBlockerRolloverCounts {
  reset: number;
  skipped: number;
  concurrentlyChanged: number;
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const qaRoot = join(repoRoot, "qa/release-v2");
const reportsRoot = join(qaRoot, "reports");
const campaignCandidateSha = resolveCheckoutCandidateSha(repoRoot);
const runtimeExecutionContract = createRuntimeExecutionContract();
export const hostRuntimeLimitation =
  `The host's fs.inotify.max_user_instances=128 is too low for concurrent development watchers. ` +
  `QA apps use ${runtimeExecutionContract.runtimeMode} from a single candidate-pinned build produced by the ${runtimeExecutionContract.bundler} bundler. ` +
  "Source changes require a new committed candidate build before browser evidence is valid.";
const expectedProfileFlags: Record<string, string[]> = {
  "main-writable": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  "main-readonly": ["DEMO_MODE=true", "DEMO_READ_ONLY=true", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  "onboarding-fresh": ["DEMO_MODE=false", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  degraded: ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
};
const exhaustiveSizeWidgetKinds = new Set([
  "downloads",
  "calendar",
  "mediaServer",
  "mediaRequests-requestList",
  "mediaRequests-requestStats",
  "systemResources",
  "systemDisks",
  "dockerContainers",
  "networkControllerSummary",
  "networkControllerStatus",
  "beszelSystemStats",
  "uptimeKuma",
  "bookmarks",
  "notebook",
  "iframe",
  "customApi",
  "assistant",
]);
const manifest = JSON.parse(await readFile(join(qaRoot, "coverage-manifest.json"), "utf8")) as Manifest;
const init = process.argv.includes("--init");
const refresh = process.argv.includes("--refresh-placeholders");
const rolloverFlag = "--rollover-resolved-blocker";
const rolloverFlagIndex = process.argv.indexOf(rolloverFlag);
const rolloverResolvedBlocker = rolloverFlagIndex === -1 ? null : (process.argv[rolloverFlagIndex + 1] ?? null);

if (rolloverFlagIndex !== -1 && (!rolloverResolvedBlocker || rolloverResolvedBlocker.startsWith("--"))) {
  throw new Error(`${rolloverFlag} requires a finding fingerprint`);
}
if ([init, refresh, rolloverResolvedBlocker !== null].filter(Boolean).length > 1) {
  throw new Error("Use only one of --init, --refresh-placeholders, or --rollover-resolved-blocker");
}

const escapeCell = (value: string): string => value.replaceAll("|", "\\|").replaceAll("\n", " ");
const list = (values: (string | number)[]): string => (values.length === 0 ? "None" : values.join(", "));
const isBlockedOrNotReached = (status: Status): boolean => status === "blocked" || status === "not-reached";

const expandedCases = (packet: Packet): { id: string; expected: string }[] => {
  const dimensions = manifest.caseDimensions[packet.wave] ?? [];
  return packet.cases.flatMap((baseId) =>
    dimensions.map((dimension) => ({ id: `${baseId}-${dimension.id}`, expected: dimension.expected })),
  );
};

const sizeRequirement = (widgetKind: string) => {
  if (exhaustiveSizeWidgetKinds.has(widgetKind)) {
    return "every width 1-24 × every height 1-6";
  }
  return "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds";
};

const widgetChecks = (packet: Packet): WidgetCheck[] =>
  (packet.widgetKinds ?? []).flatMap((widgetKind) =>
    packet.viewports.map((viewport) => ({
      widgetKind,
      viewport,
      sizeRequirement: sizeRequirement(widgetKind),
      status: "not-reached",
    })),
  );

const reportMetadata = (packet: Packet): ReportMetadata => ({
  packetId: packet.id,
  status: "not-reached",
  caseStatuses: Object.fromEntries(expandedCases(packet).map(({ id }) => [id, "not-reached" as const])),
  execution: {
    candidateSha: campaignCandidateSha,
    url: null,
    actualPort: null,
    runtimeProfile: null,
    runtimeFlags: [],
    persona: null,
    sessionId: null,
    timestamp: null,
    viewport: null,
    input: null,
    zoom: null,
  },
  findings: [],
  artifacts: [],
  widgetChecks: widgetChecks(packet),
  performance: { measurements: [], limitations: [] },
  independentReproductions: [],
  notes: "Not executed.",
});

const renderPacketReportBase = (packet: Packet): string => {
  const artifactDirectory = resolve(repoRoot, ".screenshots/release-v2", packet.id);
  const metadata = reportMetadata(packet);
  const cases = expandedCases(packet)
    .map(
      ({ id, expected }) =>
        `| ${id} | not-reached | [planned screenshot](${artifactDirectory}/${id}.png) | Not executed | ${expected} |`,
    )
    .join("\n");
  const widgetMatrix = metadata.widgetChecks
    .map(
      (check) =>
        `| ${check.widgetKind} | ${check.viewport} | ${check.sizeRequirement} | loading / populated / empty / error | Owner / Editor / Viewer / read-only | mutate / save / reload / reset | fail / retry / healthy | [planned artifact](${artifactDirectory}/${check.widgetKind}-${check.viewport}.png) | ${check.status} |`,
    )
    .join("\n");
  const widgetSection =
    widgetMatrix.length === 0
      ? ""
      : `\n## Widget kind × viewport checklist\n\n| Widget kind | Viewport | Size | States | Permission/read-only | Options/persistence | Recovery | Evidence | Status |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${widgetMatrix}\n`;

  return `<!-- release-v2-qa-report\n${JSON.stringify(metadata, null, 2)}\n-->\n\n# ${packet.id}: ${packet.title}\n\n| Metadata | Value |\n| --- | --- |\n| Status | not-reached |\n| Wave | ${packet.wave} |\n| PR refs | ${packet.prRefs.map((number) => `#${number}`).join(", ")} |\n| Personas | ${list(packet.personas)} |\n| Boards | ${list(packet.boards)} |\n| Profiles | ${list(packet.profiles)} |\n| Chromium viewports | ${list(packet.viewports)} |\n| Zoom | ${list(packet.zooms.map((zoom) => `${zoom}%`))} |\n| Input | ${list(packet.inputs)} |\n| Widget kinds | ${list(packet.widgetKinds ?? [])} |\n| Artifact directory | [${artifactDirectory}](${artifactDirectory}) |\n| Candidate SHA | not-recorded |\n| URL / actual port | not-recorded |\n| Runtime profile / flags | not-recorded |\n| Executed persona | not-recorded |\n| Browser session ID | not-recorded |\n| Timestamp | not-recorded |\n| Executed viewport / input / zoom | not-recorded |\n\n## Dogfood evidence\n\n| Case ID | Status | Evidence | Observed | Expected |\n| --- | --- | --- | --- | --- |\n${cases}\n${widgetSection}\n## Findings\n\nNo findings recorded. Add structured findings to the metadata block and mirror them here.\n\n## Blockers and gaps\n\nNot executed.\n\n## Cleanup\n\nRecord created resources, cleanup outcome, console errors, and network failures. Never include secret values.\n`;
};

export const renderPacketReport = (packet: Packet): string =>
  renderPacketReportBase(packet)
    .replace("| Candidate SHA | not-recorded |", `| Candidate SHA | ${campaignCandidateSha} |`)
    .replace(
      "\n## Findings",
      "\n## Performance measurements and limitations\n\nRecord structured measurements in `performance.measurements` with units, thresholds, status, and evidence. Record every environmental or tooling limitation in `performance.limitations`; leave measurements empty instead of inventing a result.\n\n## Independent reproductions\n\nRecord a second agent's result in `independentReproductions` with the finding fingerprint, agent ID, outcome, evidence, and notes. An unattempted reproduction remains `not-reached`.\n\n## Findings",
    );

const parseMetadata = (content: string, packet: Packet): { metadata: ReportMetadata; errors: string[] } => {
  const metadata = content.match(/<!-- release-v2-qa-report\n([\s\S]*?)\n-->/)?.[1];
  let rawMetadata: unknown = null;
  const parseErrors: string[] = [];
  if (!metadata) {
    parseErrors.push(`${packet.id}: report metadata block is missing`);
  } else {
    try {
      rawMetadata = JSON.parse(metadata) as unknown;
    } catch (error) {
      parseErrors.push(`${packet.id}: report metadata is invalid JSON (${String(error)})`);
    }
  }
  const normalized = normalizeReportMetadata(rawMetadata, {
    packetId: packet.id,
    expectedCaseIds: expandedCases(packet).map(({ id }) => id),
    expectedWidgetChecks: widgetChecks(packet),
  });
  return {
    metadata: normalized.metadata as ReportMetadata,
    errors: [...parseErrors, ...normalized.errors],
  };
};

export const reportMetadataHasEvidence = (metadata: ReportMetadata): boolean => {
  const execution = metadata.execution;
  const hasExecutionMetadata =
    execution.url !== null ||
    execution.actualPort !== null ||
    execution.runtimeProfile !== null ||
    execution.runtimeFlags.length > 0 ||
    execution.persona !== null ||
    execution.sessionId !== null ||
    execution.timestamp !== null ||
    execution.viewport !== null ||
    execution.input !== null ||
    execution.zoom !== null;

  return (
    metadata.status !== "not-reached" ||
    Object.values(metadata.caseStatuses).some((status) => status !== "not-reached") ||
    metadata.widgetChecks.some((check) => check.status !== "not-reached") ||
    metadata.findings.length > 0 ||
    metadata.artifacts.length > 0 ||
    metadata.performance.measurements.length > 0 ||
    metadata.performance.limitations.length > 0 ||
    metadata.independentReproductions.length > 0 ||
    hasExecutionMetadata
  );
};

export const reportIsOnlyBlockedBy = (metadata: ReportMetadata, findingFingerprint: string): boolean => {
  if (!isBlockedOrNotReached(metadata.status)) return false;
  if (!Object.values(metadata.caseStatuses).every(isBlockedOrNotReached)) return false;
  if (!metadata.widgetChecks.every((check) => isBlockedOrNotReached(check.status))) return false;
  if (metadata.performance.measurements.length > 0) return false;
  if (metadata.findings.length === 0) return false;
  if (metadata.findings.some((finding) => finding.fingerprint !== findingFingerprint)) return false;
  if (metadata.independentReproductions.some((reproduction) => reproduction.findingFingerprint !== findingFingerprint))
    return false;
  return true;
};

export const reportContentIsOnlyBlockedBy = (content: string, packet: Packet, findingFingerprint: string): boolean => {
  const parsed = parseMetadata(content, packet);
  return parsed.errors.length === 0 && reportIsOnlyBlockedBy(parsed.metadata, findingFingerprint);
};

export const rolloverResolvedBlockerReports = async <T, TSnapshot extends { content: string }>(
  entries: T[],
  options: ResolvedBlockerRolloverOptions<T, TSnapshot>,
): Promise<ResolvedBlockerRolloverCounts> => {
  const counts: ResolvedBlockerRolloverCounts = { reset: 0, skipped: 0, concurrentlyChanged: 0 };
  for (const entry of entries) {
    let snapshot: TSnapshot;
    try {
      snapshot = await options.read(entry);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      counts.skipped += 1;
      continue;
    }

    if (!options.isEligible(snapshot.content, entry)) {
      counts.skipped += 1;
      continue;
    }
    if (!(await options.isUnchanged(entry, snapshot))) {
      counts.concurrentlyChanged += 1;
      continue;
    }

    await options.write(entry, options.render(entry));
    counts.reset += 1;
  }
  return counts;
};

export const refreshPlaceholderReports = async <T,>(
  entries: T[],
  options: PlaceholderRefreshOptions<T>,
): Promise<PlaceholderRefreshCounts> => {
  const counts: PlaceholderRefreshCounts = { refreshed: 0, skipped: 0 };
  for (const entry of entries) {
    let existingContent: string | null = null;
    try {
      existingContent = await options.read(entry);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    if (existingContent !== null && !options.isSafePlaceholder(existingContent, entry)) {
      counts.skipped += 1;
      continue;
    }

    await options.write(entry, options.render(entry));
    counts.refreshed += 1;
  }
  return counts;
};

const collectHumanReportErrors = (content: string, packet: Packet, metadata: ReportMetadata): string[] => {
  const errors: string[] = [];
  if (!content.includes(`| Status | ${metadata.status} |`)) {
    errors.push(`${packet.id}: human metadata status differs from structured metadata`);
  }
  if (!content.includes(`| Candidate SHA | ${campaignCandidateSha} |`)) {
    errors.push(`${packet.id}: human metadata does not show the campaign candidate`);
  }
  for (const [caseId, status] of Object.entries(metadata.caseStatuses)) {
    if (!content.includes(`| ${caseId} | ${status} |`)) {
      errors.push(`${packet.id}/${caseId}: human evidence row/status is missing`);
    }
  }
  errors.push(...collectHumanWidgetStatusErrors(content, packet.id, metadata.widgetChecks));

  const hasExecution =
    metadata.status !== "not-reached" ||
    Object.values(metadata.caseStatuses).some((status) => status !== "not-reached") ||
    metadata.widgetChecks.some((check) => check.status !== "not-reached") ||
    metadata.findings.length > 0 ||
    metadata.artifacts.length > 0;
  if (!hasExecution) return errors;

  const requiredValues = [
    metadata.execution.candidateSha,
    metadata.execution.url,
    metadata.execution.actualPort,
    metadata.execution.runtimeProfile,
    metadata.execution.persona,
    metadata.execution.sessionId,
    metadata.execution.timestamp,
    metadata.execution.viewport,
    metadata.execution.input,
    metadata.execution.zoom,
  ];
  for (const value of requiredValues) {
    if (value !== null && !content.includes(String(value))) {
      errors.push(`${packet.id}: human metadata does not include execution value ${String(value)}`);
    }
  }
  return errors;
};

const collectArtifactErrors = async (packet: Packet, metadata: ReportMetadata): Promise<string[]> => {
  const releaseArtifactDirectory = resolve(repoRoot, ".screenshots/release-v2");
  const packetArtifactDirectory = resolve(releaseArtifactDirectory, packet.id);
  const packetArtifacts = [
    ...metadata.artifacts.map((artifact) => ({ artifact, label: `${packet.id}: artifact` })),
    ...metadata.findings.flatMap((finding, findingIndex) =>
      (finding.evidence ?? []).map((artifact) => ({
        artifact,
        label: `${packet.id}: findings[${findingIndex}] evidence`,
      })),
    ),
    ...metadata.performance.measurements.flatMap((measurement, measurementIndex) =>
      measurement.evidence.map((artifact) => ({
        artifact,
        label: `${packet.id}: performance.measurements[${measurementIndex}] evidence`,
      })),
    ),
  ];

  const errors: string[] = [];
  for (const { artifact, label } of packetArtifacts) {
    const error = await validateResolvedArtifactPath(packetArtifactDirectory, artifact, label);
    if (error) errors.push(error);
  }
  for (const [reproductionIndex, reproduction] of metadata.independentReproductions.entries()) {
    for (const artifact of reproduction.evidence) {
      const error = await validateResolvedReproductionEvidencePath(
        releaseArtifactDirectory,
        artifact,
        `${packet.id}: independentReproductions[${reproductionIndex}] evidence`,
      );
      if (error) errors.push(error);
    }
  }
  return errors;
};

const ensureReports = async (): Promise<void> => {
  if (refresh || rolloverResolvedBlocker) {
    for (const packet of manifest.packets) {
      const packetDirectory = join(reportsRoot, packet.id);
      const reportPath = join(packetDirectory, "report.md");
      await assertSafeReportPath(qaRoot, reportPath, `${packet.id} report path`);
      await mkdir(packetDirectory, { recursive: true });
      await assertSafeReportPath(qaRoot, reportPath, `${packet.id} report path`);
    }
  }

  if (rolloverResolvedBlocker) {
    const reportSnapshot = async (packet: Packet): Promise<ReportSnapshot> => {
      const reportPath = join(reportsRoot, packet.id, "report.md");
      const content = await readSafeReportFile(qaRoot, reportPath, `${packet.id} report path`);
      const metadata = await stat(reportPath);
      return { content, mtimeMs: metadata.mtimeMs, size: metadata.size };
    };
    const counts = await rolloverResolvedBlockerReports(manifest.packets, {
      read: reportSnapshot,
      isEligible: (content, packet) => reportContentIsOnlyBlockedBy(content, packet, rolloverResolvedBlocker),
      isUnchanged: async (packet, snapshot) => {
        const current = await reportSnapshot(packet);
        return (
          current.content === snapshot.content && current.mtimeMs === snapshot.mtimeMs && current.size === snapshot.size
        );
      },
      render: renderPacketReport,
      write: async (packet, content) => {
        const reportPath = join(reportsRoot, packet.id, "report.md");
        await writeSafeReportFile(qaRoot, reportPath, content, `${packet.id} report path`);
      },
    });
    console.log(
      `release-v2 QA resolved-blocker rollover (${rolloverResolvedBlocker}): ${counts.reset} reset; ${counts.skipped} protected report(s) skipped; ${counts.concurrentlyChanged} concurrently changed report(s) skipped`,
    );
    return;
  }

  if (refresh) {
    const counts = await refreshPlaceholderReports(manifest.packets, {
      read: async (packet) => {
        const reportPath = join(reportsRoot, packet.id, "report.md");
        return readSafeReportFile(qaRoot, reportPath, `${packet.id} report path`);
      },
      isSafePlaceholder: (content, packet) => {
        const parsed = parseMetadata(content, packet);
        return parsed.errors.length === 0 && !reportMetadataHasEvidence(parsed.metadata);
      },
      render: renderPacketReport,
      write: async (packet, content) => {
        const reportPath = join(reportsRoot, packet.id, "report.md");
        await writeSafeReportFile(qaRoot, reportPath, content, `${packet.id} report path`);
      },
    });
    console.log(
      `release-v2 QA placeholder refresh: ${counts.refreshed} refreshed; ${counts.skipped} protected report(s) skipped`,
    );
    return;
  }

  for (const packet of manifest.packets) {
    const packetDirectory = join(reportsRoot, packet.id);
    const reportPath = join(packetDirectory, "report.md");
    await assertSafeReportPath(qaRoot, reportPath, `${packet.id} report path`);
    await mkdir(packetDirectory, { recursive: true });
    await assertSafeReportPath(qaRoot, reportPath, `${packet.id} report path`);
    try {
      await readSafeReportFile(qaRoot, reportPath, `${packet.id} report path`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await writeSafeReportFile(qaRoot, reportPath, renderPacketReport(packet), `${packet.id} report path`);
    }
  }
};

interface CoverageAssignment {
  label: string;
  detail?: string;
  status: Status;
}

const rollupStatuses = (statuses: Status[]): Status => {
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("not-reached")) return "not-reached";
  return "passed";
};

const matchingCaseStatus = (metadata: ReportMetadata, fragments: string[]) => {
  const statuses = Object.entries(metadata.caseStatuses)
    .filter(([caseId]) => fragments.some((fragment) => caseId.includes(fragment)))
    .map(([, status]) => status);
  if (statuses.length === 0) return metadata.status;
  return rollupStatuses(statuses);
};

const coverageTable = (assignments: CoverageAssignment[], labelHeading: string) => {
  const grouped = new Map<string, { detail: string; statuses: Status[] }>();
  for (const assignment of assignments) {
    const existing = grouped.get(assignment.label);
    if (existing) {
      existing.statuses.push(assignment.status);
      continue;
    }
    grouped.set(assignment.label, { detail: assignment.detail ?? "—", statuses: [assignment.status] });
  }
  if (grouped.size === 0)
    return `| ${labelHeading} | Detail | Passed | Failed | Blocked | Not reached | Total |\n| --- | --- | ---: | ---: | ---: | ---: | ---: |\n| — | Not recorded | 0 | 0 | 0 | 0 | 0 |`;
  const rows = [...grouped.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => {
      const count = (status: Status) => value.statuses.filter((current) => current === status).length;
      return `| ${escapeCell(label)} | ${escapeCell(value.detail)} | ${count("passed")} | ${count("failed")} | ${count("blocked")} | ${count("not-reached")} | ${value.statuses.length} |`;
    });
  return `| ${labelHeading} | Detail | Passed | Failed | Blocked | Not reached | Total |\n| --- | --- | ---: | ---: | ---: | ---: | ---: |\n${rows.join("\n")}`;
};

const main = async (): Promise<void> => {
  if (init || refresh || rolloverResolvedBlocker) await ensureReports();

  const reports: { packet: Packet; metadata: ReportMetadata; metadataErrors: string[] }[] = [];
  for (const packet of manifest.packets) {
    const reportPath = join(reportsRoot, packet.id, "report.md");
    await assertSafeReportPath(qaRoot, reportPath, `${packet.id} report path`);
    let content = "";
    const readErrors: string[] = [];
    try {
      content = await readSafeReportFile(qaRoot, reportPath, `${packet.id} report path`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      readErrors.push(`${packet.id}: report.md is missing`);
    }
    const parsed = parseMetadata(content, packet);
    const integrityErrors = collectReportIntegrityErrors(parsed.metadata, {
      campaignCandidateSha,
      packetId: packet.id,
      profiles: packet.profiles,
      personas: packet.personas,
      viewports: packet.viewports,
      zooms: packet.zooms,
      inputs: packet.inputs,
      expectedProfileFlags,
    });
    const humanReportErrors = collectHumanReportErrors(content, packet, parsed.metadata);
    const artifactErrors = await collectArtifactErrors(packet, parsed.metadata);
    reports.push({
      packet,
      metadata: parsed.metadata,
      metadataErrors: [...readErrors, ...parsed.errors, ...integrityErrors, ...humanReportErrors, ...artifactErrors],
    });
  }

  const packetTotals: Record<Status, number> = { passed: 0, failed: 0, blocked: 0, "not-reached": 0 };
  const caseTotals: Record<Status, number> = { passed: 0, failed: 0, blocked: 0, "not-reached": 0 };
  for (const { metadata } of reports) {
    packetTotals[metadata.status] += 1;
    for (const status of Object.values(metadata.caseStatuses)) caseTotals[status] += 1;
  }

  const findings = aggregateQaFindings(
    reports.map(({ packet, metadata }) => ({
      packetId: packet.id,
      findings: metadata.findings,
      independentReproductions: metadata.independentReproductions,
    })),
  );
  const severityTotals: Record<Severity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const finding of findings) severityTotals[finding.severity] += 1;

  const criticalGaps = collectCriticalCoverageGaps(
    reports.map(({ packet, metadata, metadataErrors }) => ({
      packetId: packet.id,
      caseStatuses: metadata.caseStatuses,
      widgetChecks: metadata.widgetChecks,
      metadataErrors,
    })),
  );
  const decision = releaseDecision(severityTotals, criticalGaps);
  const widgetTotals: Record<Status, number> = { passed: 0, failed: 0, blocked: 0, "not-reached": 0 };
  for (const { metadata } of reports) {
    for (const check of metadata.widgetChecks) widgetTotals[check.status] += 1;
  }

  const ledger = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    packetStatuses: Object.fromEntries(
      reports.map(({ packet, metadata }) => [packet.id, { status: metadata.status, cases: metadata.caseStatuses }]),
    ),
  };
  const ledgerPath = join(qaRoot, "ledger.json");
  const masterReportPath = join(qaRoot, "master-report.md");
  await assertSafeReportPath(qaRoot, ledgerPath, "release-v2 QA ledger path");
  await assertSafeReportPath(qaRoot, masterReportPath, "release-v2 QA master report path");
  await writeSafeReportFile(qaRoot, ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "release-v2 QA ledger path");

  const waveRows = Object.entries(Object.groupBy(reports, ({ packet }) => packet.wave)).map(([wave, entries]) => {
    const waveReports = entries ?? [];
    const passed = waveReports.filter(({ metadata }) => metadata.status === "passed").length;
    return `| ${wave} | ${passed} | ${waveReports.length} |`;
  });
  const findingRows =
    findings.length === 0
      ? "| — | — | No findings recorded | — | — |"
      : findings
          .map(
            (finding) =>
              `| ${finding.severity} | ${escapeCell(finding.area ?? "general")} | ${escapeCell(finding.title)} | ${list(finding.packets)} | ${list(finding.caseIds)} |`,
          )
          .join("\n");
  const gapRows =
    criticalGaps.length === 0
      ? "| — | — | — | — |"
      : criticalGaps
          .map(
            (gap) =>
              `| ${gap.packetId} | ${gap.kind} | ${escapeCell(gap.itemId)} | ${gap.status}${gap.detail ? ` — ${escapeCell(gap.detail)}` : ""} |`,
          )
          .join("\n");
  const prRows = manifest.pullRequests
    .map(
      (pullRequest) =>
        `| #${pullRequest.number} | ${pullRequest.label} | ${manifest.packets.filter((packet) => packet.prRefs.includes(pullRequest.number)).length} |`,
    )
    .join("\n");

  const prCoverage = coverageTable(
    manifest.pullRequests.flatMap((pullRequest) =>
      reports
        .filter(({ packet }) => packet.prRefs.includes(pullRequest.number))
        .map(({ metadata }) => ({
          label: `#${pullRequest.number}`,
          detail: pullRequest.label,
          status: metadata.status,
        })),
    ),
    "PR",
  );
  const featureCoverage = coverageTable(
    reports.map(({ packet, metadata }) => ({ label: packet.id, detail: packet.title, status: metadata.status })),
    "Feature / agent",
  );
  const widgetAssignments = reports.flatMap(({ packet, metadata }) =>
    (metadata.widgetChecks ?? widgetChecks(packet)).map((check) => ({
      label: check.widgetKind,
      detail: packet.id,
      status: check.status,
    })),
  );
  const widgetCoverage = coverageTable(widgetAssignments, "Widget kind");
  const sizeCoverage = coverageTable(
    reports.flatMap(({ packet, metadata }) =>
      (metadata.widgetChecks ?? widgetChecks(packet)).map((check) => ({
        label: check.widgetKind,
        detail: check.sizeRequirement,
        status: check.status,
      })),
    ),
    "Widget size threshold",
  );
  const viewportCoverage = coverageTable(
    reports.flatMap(({ packet, metadata }) =>
      packet.viewports.map((viewport) => ({ label: viewport, detail: packet.id, status: metadata.status })),
    ),
    "Viewport",
  );
  const personaCoverage = coverageTable(
    reports.flatMap(({ packet, metadata }) =>
      packet.personas.map((persona) => ({ label: persona, detail: packet.id, status: metadata.status })),
    ),
    "Persona",
  );
  const permissionCoverage = coverageTable(
    reports.flatMap(({ packet, metadata }) => {
      const status = matchingCaseStatus(metadata, ["ACCESS", "PERMISSION", "READONLY"]);
      return [
        ...packet.personas.map((persona) => ({ label: persona, detail: packet.id, status })),
        ...packet.profiles.map((profile) => ({ label: `profile:${profile}`, detail: packet.id, status })),
      ];
    }),
    "Permission boundary",
  );
  const mutationCoverage = coverageTable(
    reports.map(({ packet, metadata }) => ({
      label: packet.id,
      detail: packet.title,
      status: matchingCaseStatus(metadata, ["MUTATION", "PERSISTENCE", "OPTIONS"]),
    })),
    "Mutation area",
  );
  const stateCoverage = coverageTable(
    reports.map(({ packet, metadata }) => ({
      label: packet.id,
      detail: packet.title,
      status: matchingCaseStatus(metadata, ["STATE", "DEGRADED", "RECOVERY", "FAILURE", "EVIDENCE"]),
    })),
    "State / recovery area",
  );
  const performanceMeasurements = reports.flatMap(({ packet, metadata }) =>
    (metadata.performance?.measurements ?? []).map((measurement) => ({ packet, measurement })),
  );
  const performanceRows =
    performanceMeasurements.length === 0
      ? "| — | No measurement recorded | — | — | not-reached | — |"
      : performanceMeasurements
          .map(({ packet, measurement }) => {
            const value = measurement.value === null ? "not-recorded" : `${measurement.value} ${measurement.unit}`;
            return `| ${packet.id} | ${escapeCell(measurement.name)} | ${escapeCell(value)} | ${escapeCell(measurement.threshold)} | ${measurement.status} | ${list(measurement.evidence)} |`;
          })
          .join("\n");
  const limitationRows = [
    `| host-runtime | ${escapeCell(hostRuntimeLimitation)} |`,
    ...reports.flatMap(({ packet, metadata }) =>
      (metadata.performance?.limitations ?? []).map((limitation) => `| ${packet.id} | ${escapeCell(limitation)} |`),
    ),
  ];
  const reproductionRows = findings.flatMap((finding) =>
    finding.reproductions.map(
      (reproduction) =>
        `| ${list(finding.packets)} | ${escapeCell(reproduction.findingFingerprint)} | ${escapeCell(reproduction.agentId)} | ${reproduction.outcome} | ${list(reproduction.evidence)} | ${escapeCell(reproduction.notes)} |`,
    ),
  );

  const coverageAppendix = `## Coverage by required axis\n\n### Pull request\n\n${prCoverage}\n\n### Feature\n\n${featureCoverage}\n\n### Widget\n\n${widgetCoverage}\n\n### Size threshold\n\nHigh-risk widgets require every width 1–24 × every height 1–6 at all assigned mobile, breakpoint-edge, and desktop viewports. Other widgets require minimum, canonical, wide, tall, maximum, overflow, and behavior-changing threshold checks.\n\n${sizeCoverage}\n\n### Viewport\n\n${viewportCoverage}\n\n### Persona\n\n${personaCoverage}\n\n### Permission\n\n${permissionCoverage}\n\n### Mutation\n\n${mutationCoverage}\n\n### State and recovery\n\n${stateCoverage}\n\n## Performance measurements\n\n| Agent | Measurement | Value | Threshold | Status | Evidence |\n| --- | --- | --- | --- | --- | --- |\n${performanceRows}\n\n### Performance limitations\n\n| Agent | Limitation |\n| --- | --- |\n${limitationRows.length > 0 ? limitationRows.join("\n") : "| — | Not recorded |"}\n\n## Independent reproduction results\n\n| Agent | Finding fingerprint | Reproducing agent | Outcome | Evidence | Notes |\n| --- | --- | --- | --- | --- | --- |\n${reproductionRows.length > 0 ? reproductionRows.join("\n") : "| — | — | — | not-reached | — | Not recorded |"}\n\n`;

  const master = `# Release-v2 QA master report\n\nGenerated: ${new Date().toISOString()}\n\n## Decision: ${decision}\n\nGO requires zero P0/P1 findings and zero critical gaps across assigned cases, widget checks, and report metadata. Current critical gaps: **${criticalGaps.length}**.\n\n## Coverage\n\n| Measure | Passed | Failed | Blocked | Not reached | Total |\n| --- | ---: | ---: | ---: | ---: | ---: |\n| Packets | ${packetTotals.passed} | ${packetTotals.failed} | ${packetTotals.blocked} | ${packetTotals["not-reached"]} | ${reports.length} |\n| Cases | ${caseTotals.passed} | ${caseTotals.failed} | ${caseTotals.blocked} | ${caseTotals["not-reached"]} | ${Object.values(caseTotals).reduce((sum, count) => sum + count, 0)} |\n| Widget checks | ${widgetTotals.passed} | ${widgetTotals.failed} | ${widgetTotals.blocked} | ${widgetTotals["not-reached"]} | ${Object.values(widgetTotals).reduce((sum, count) => sum + count, 0)} |\n\n| Wave | Passed | Total |\n| --- | ---: | ---: |\n${waveRows.join("\n")}\n\n## Severity totals\n\n| P0 | P1 | P2 | P3 |\n| ---: | ---: | ---: | ---: |\n| ${severityTotals.P0} | ${severityTotals.P1} | ${severityTotals.P2} | ${severityTotals.P3} |\n\nDeduplicated by explicit fingerprint, or by severity + area + title when no fingerprint is supplied.\n\n| Severity | Area | Finding | Packets | Cases |\n| --- | --- | --- | --- | --- |\n${findingRows}\n\n## Critical gaps\n\n| Packet | Kind | Coverage item | Status / detail |\n| --- | --- | --- | --- |\n${gapRows}\n\n## PR coverage\n\n| PR | Area | Packets |\n| --- | --- | ---: |\n${prRows}\n\n## Packet reports\n\n${reports.map(({ packet, metadata }) => `- [${packet.id}: ${packet.title}](packets/${packet.id}/report.md) — ${metadata.status}`).join("\n")}\n`;
  const enrichedMaster = master
    .replace("## Severity totals", `${coverageAppendix}## Severity totals`)
    .replaceAll("(packets/", "(reports/")
    .replace("## Packet reports", "## Agent reports");
  await writeSafeReportFile(qaRoot, masterReportPath, enrichedMaster, "release-v2 QA master report path");

  console.log(
    `release-v2 QA report: ${decision}; ${reports.length} packets; ${findings.length} deduplicated findings; ${criticalGaps.length} critical gaps`,
  );
  const metadataErrors = reports.flatMap((report) => report.metadataErrors);
  if (metadataErrors.length > 0) {
    console.error(`release-v2 QA report found ${metadataErrors.length} metadata error(s):`);
    for (const error of metadataErrors) console.error(`- ${error}`);
    process.exitCode = 1;
  }
};

const entrypoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) await main();
