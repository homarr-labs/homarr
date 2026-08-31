export type QaStatus = "passed" | "failed" | "blocked" | "not-reached";

export interface QaWidgetCheck {
  widgetKind: string;
  viewport: string;
  sizeRequirement: string;
  status: QaStatus;
}

export type QaSeverity = "P0" | "P1" | "P2" | "P3";

export interface QaFinding {
  id?: string;
  fingerprint?: string;
  severity: QaSeverity;
  title: string;
  area?: string;
  summary?: string;
  caseIds?: string[];
  evidence?: string[];
}

export interface QaIndependentReproduction {
  findingFingerprint: string;
  agentId: string;
  outcome: string;
  evidence: string[];
  notes: string;
}

export interface AggregatedQaFinding extends QaFinding {
  packets: string[];
  caseIds: string[];
  evidence: string[];
  reproductions: QaIndependentReproduction[];
}

export interface QaReportMetadata {
  packetId: string;
  status: QaStatus;
  caseStatuses: Record<string, QaStatus>;
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
  findings: QaFinding[];
  artifacts: string[];
  widgetChecks: QaWidgetCheck[];
  performance: {
    measurements: {
      name: string;
      value: number | null;
      unit: string;
      threshold: string;
      status: QaStatus;
      evidence: string[];
    }[];
    limitations: string[];
  };
  independentReproductions: QaIndependentReproduction[];
  notes: string;
}

export interface CoverageGap {
  packetId: string;
  kind: "case" | "widget" | "metadata";
  itemId: string;
  status: QaStatus;
  detail?: string;
}

interface NormalizeOptions {
  packetId: string;
  expectedCaseIds: string[];
  expectedWidgetChecks: QaWidgetCheck[];
}

export interface ReportIntegrityOptions {
  campaignCandidateSha: string;
  packetId: string;
  profiles: string[];
  personas: string[];
  viewports: string[];
  zooms: number[];
  inputs: string[];
  expectedProfileFlags: Record<string, string[]>;
}

const allowedStatuses = new Set<QaStatus>(["passed", "failed", "blocked", "not-reached"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);
const numberOrNull = (value: unknown): number | null => (typeof value === "number" ? value : null);
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const statusOrNotReached = (value: unknown): QaStatus =>
  allowedStatuses.has(value as QaStatus) ? (value as QaStatus) : "not-reached";
const severityOrP3 = (value: unknown): QaSeverity =>
  ["P0", "P1", "P2", "P3"].includes(String(value)) ? (value as QaSeverity) : "P3";

const checkKey = (check: Pick<QaWidgetCheck, "widgetKind" | "viewport">): string =>
  `${check.widgetKind}\u0000${check.viewport}`;

const sameSet = <T,>(left: T[], right: T[]): boolean =>
  left.length === right.length && new Set(left).size === left.length && left.every((value) => right.includes(value));

const severityRank: Record<QaSeverity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

const uniqueStrings = (values: string[]): string[] => [...new Set(values)];

const reproductionKey = (reproduction: QaIndependentReproduction): string =>
  `${reproduction.findingFingerprint}\u0000${reproduction.agentId}\u0000${reproduction.outcome}`;

const mergeReproduction = (finding: AggregatedQaFinding, reproduction: QaIndependentReproduction): void => {
  const key = reproductionKey(reproduction);
  const existing = finding.reproductions.find((candidate) => reproductionKey(candidate) === key);
  if (!existing) {
    finding.reproductions.push({ ...reproduction, evidence: uniqueStrings(reproduction.evidence) });
    return;
  }
  existing.evidence = uniqueStrings([...existing.evidence, ...reproduction.evidence]);
  if (reproduction.notes && !existing.notes.includes(reproduction.notes)) {
    existing.notes = [existing.notes, reproduction.notes].filter(Boolean).join("; ");
  }
};

export const aggregateQaFindings = (
  reports: {
    packetId: string;
    findings: QaFinding[];
    independentReproductions: QaIndependentReproduction[];
  }[],
): AggregatedQaFinding[] => {
  const findings = new Map<string, AggregatedQaFinding>();
  for (const report of reports) {
    for (const finding of report.findings) {
      const key =
        finding.fingerprint ?? `${finding.severity}:${finding.area ?? "general"}:${finding.title}`.toLowerCase();
      const existing = findings.get(key);
      if (!existing) {
        findings.set(key, {
          ...finding,
          packets: [report.packetId],
          caseIds: uniqueStrings(finding.caseIds ?? []),
          evidence: uniqueStrings(finding.evidence ?? []),
          reproductions: [],
        });
        continue;
      }

      existing.packets = uniqueStrings([...existing.packets, report.packetId]);
      existing.caseIds = uniqueStrings([...existing.caseIds, ...(finding.caseIds ?? [])]);
      existing.evidence = uniqueStrings([...existing.evidence, ...(finding.evidence ?? [])]);
      if (severityRank[finding.severity] < severityRank[existing.severity]) {
        existing.severity = finding.severity;
        existing.id = finding.id ?? existing.id;
        existing.title = finding.title;
        existing.area = finding.area ?? existing.area;
        existing.summary = finding.summary ?? existing.summary;
      }
    }
  }

  for (const report of reports) {
    for (const reproduction of report.independentReproductions) {
      const finding = findings.get(reproduction.findingFingerprint);
      if (finding) mergeReproduction(finding, reproduction);
    }
  }

  return [...findings.values()].toSorted(
    (left, right) =>
      severityRank[left.severity] - severityRank[right.severity] || left.title.localeCompare(right.title),
  );
};

const markdownTableCells = (line: string): string[] | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.trim().replaceAll("\\|", "|"));
};

export const collectHumanWidgetStatusErrors = (
  content: string,
  packetId: string,
  expectedChecks: QaWidgetCheck[],
): string[] => {
  const heading = "## Widget kind × viewport checklist";
  const sectionStart = content.indexOf(heading);
  if (expectedChecks.length === 0) {
    if (sectionStart >= 0) return [`${packetId}: non-widget report must not contain a human widget checklist`];
    return [];
  }
  if (sectionStart < 0) return [`${packetId}: human widget checklist is missing`];

  const sectionBodyStart = sectionStart + heading.length;
  const duplicateSection = content.indexOf(heading, sectionBodyStart);
  const nextSection = content.indexOf("\n## ", sectionBodyStart);
  const section = content.slice(sectionBodyStart, nextSection < 0 ? undefined : nextSection);
  const rows = new Map<string, { status: string; count: number }>();
  for (const line of section.split("\n")) {
    const cells = markdownTableCells(line);
    if (!cells || cells.length !== 9 || cells[0] === "Widget kind" || cells.every((cell) => /^-+$/u.test(cell))) {
      continue;
    }
    const key = `${cells[0]}\u0000${cells[1]}`;
    const existing = rows.get(key);
    rows.set(key, { status: cells[8] ?? "", count: (existing?.count ?? 0) + 1 });
  }

  const errors: string[] = [];
  if (duplicateSection >= 0) errors.push(`${packetId}: human widget checklist is duplicated`);
  const expectedKeys = new Set(expectedChecks.map(checkKey));
  for (const check of expectedChecks) {
    const key = checkKey(check);
    const row = rows.get(key);
    if (!row) {
      errors.push(`${packetId}: human widget row is missing ${check.widgetKind} at ${check.viewport}`);
      continue;
    }
    if (row.count !== 1) {
      errors.push(`${packetId}: human widget row is duplicated ${check.widgetKind} at ${check.viewport}`);
    }
    if (row.status !== check.status) {
      errors.push(
        `${packetId}/${check.widgetKind}/${check.viewport}: human widget status ${row.status || "<empty>"} differs from structured status ${check.status}`,
      );
    }
  }
  for (const key of rows.keys()) {
    if (expectedKeys.has(key)) continue;
    const [widgetKind, viewport] = key.split("\u0000");
    errors.push(`${packetId}: human widget checklist contains unassigned row ${widgetKind}@${viewport}`);
  }
  return errors;
};

export const rollupQaStatuses = (statuses: QaStatus[]): QaStatus => {
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("not-reached")) return "not-reached";
  return "passed";
};

const hasExecutionResults = (metadata: QaReportMetadata): boolean =>
  metadata.status !== "not-reached" ||
  Object.values(metadata.caseStatuses).some((status) => status !== "not-reached") ||
  metadata.widgetChecks.some((check) => check.status !== "not-reached") ||
  metadata.findings.length > 0 ||
  metadata.artifacts.length > 0 ||
  metadata.performance.measurements.length > 0 ||
  metadata.performance.limitations.length > 0 ||
  metadata.independentReproductions.length > 0;

export const collectReportIntegrityErrors = (metadata: QaReportMetadata, options: ReportIntegrityOptions): string[] => {
  const errors: string[] = [];
  if (metadata.packetId !== options.packetId) {
    errors.push(`${options.packetId}: metadata packetId is ${metadata.packetId}`);
  }

  const caseRollup = rollupQaStatuses(Object.values(metadata.caseStatuses));
  if (metadata.status !== caseRollup) {
    errors.push(`${options.packetId}: report status ${metadata.status} does not match case rollup ${caseRollup}`);
  }

  if (metadata.execution.candidateSha !== options.campaignCandidateSha) {
    errors.push(`${options.packetId}: candidateSha must equal the campaign candidate ${options.campaignCandidateSha}`);
  }

  if (!hasExecutionResults(metadata)) return errors;

  const execution = metadata.execution;
  const requiredText = {
    candidateSha: execution.candidateSha,
    url: execution.url,
    runtimeProfile: execution.runtimeProfile,
    persona: execution.persona,
    sessionId: execution.sessionId,
    timestamp: execution.timestamp,
    viewport: execution.viewport,
    input: execution.input,
  };
  for (const [field, value] of Object.entries(requiredText)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${options.packetId}: execution.${field} is required after execution`);
    }
  }
  if (!Number.isInteger(execution.actualPort) || (execution.actualPort ?? 0) <= 0) {
    errors.push(`${options.packetId}: execution.actualPort must be a positive integer after execution`);
  }
  if (!Number.isFinite(execution.zoom) || (execution.zoom ?? 0) <= 0) {
    errors.push(`${options.packetId}: execution.zoom must be positive after execution`);
  }
  if (metadata.artifacts.length === 0) {
    errors.push(`${options.packetId}: executed report must link at least one artifact`);
  }

  if (execution.runtimeProfile && !options.profiles.includes(execution.runtimeProfile)) {
    errors.push(`${options.packetId}: execution.runtimeProfile is outside the packet assignment`);
  }
  if (execution.persona && !options.personas.includes(execution.persona)) {
    errors.push(`${options.packetId}: execution.persona is outside the packet assignment`);
  }
  if (execution.viewport && !options.viewports.includes(execution.viewport)) {
    errors.push(`${options.packetId}: execution.viewport is outside the packet assignment`);
  }
  if (execution.input && !options.inputs.includes(execution.input)) {
    errors.push(`${options.packetId}: execution.input is outside the packet assignment`);
  }
  if (execution.zoom && !options.zooms.includes(execution.zoom)) {
    errors.push(`${options.packetId}: execution.zoom is outside the packet assignment`);
  }

  const expectedFlags = execution.runtimeProfile ? options.expectedProfileFlags[execution.runtimeProfile] : undefined;
  if (!expectedFlags || !sameSet(execution.runtimeFlags, expectedFlags)) {
    errors.push(
      `${options.packetId}: execution.runtimeFlags do not match profile ${execution.runtimeProfile ?? "unknown"}`,
    );
  }

  if (execution.timestamp && Number.isNaN(Date.parse(execution.timestamp))) {
    errors.push(`${options.packetId}: execution.timestamp must be ISO-compatible`);
  }

  if (execution.url) {
    try {
      const url = new URL(execution.url);
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.push(`${options.packetId}: execution.url must use HTTP(S)`);
      }
      const defaultPort = url.protocol === "https:" ? 443 : 80;
      const urlPort = url.port.length > 0 ? Number(url.port) : defaultPort;
      if (execution.actualPort !== null && urlPort !== execution.actualPort) {
        errors.push(`${options.packetId}: execution.url port does not match execution.actualPort`);
      }
    } catch {
      errors.push(`${options.packetId}: execution.url must be an absolute HTTP(S) URL`);
    }
  }

  return errors;
};

export const normalizeReportMetadata = (
  value: unknown,
  options: NormalizeOptions,
): { metadata: QaReportMetadata; errors: string[] } => {
  const errors: string[] = [];
  const root = isRecord(value) ? value : {};
  if (!isRecord(value)) errors.push(`${options.packetId}: report metadata must be an object`);
  if (typeof root.packetId !== "string") errors.push(`${options.packetId}: packetId must be a string`);

  const caseStatuses: Record<string, QaStatus> = {};
  if (!isRecord(root.caseStatuses)) {
    errors.push(`${options.packetId}: caseStatuses must be an object`);
  }
  const rawCaseStatuses = isRecord(root.caseStatuses) ? root.caseStatuses : {};
  for (const caseId of options.expectedCaseIds) {
    const rawStatus = rawCaseStatuses[caseId];
    if (rawStatus === undefined) {
      errors.push(`${options.packetId}: caseStatuses is missing assigned case ${caseId}`);
    } else if (!allowedStatuses.has(rawStatus as QaStatus)) {
      errors.push(`${options.packetId}/${caseId}: invalid case status ${String(rawStatus)}`);
    }
    caseStatuses[caseId] = statusOrNotReached(rawStatus);
  }
  for (const caseId of Object.keys(rawCaseStatuses)) {
    if (!options.expectedCaseIds.includes(caseId)) {
      errors.push(`${options.packetId}: caseStatuses contains unknown case ${caseId}`);
    }
  }

  if (!Array.isArray(root.widgetChecks)) {
    errors.push(`${options.packetId}: widgetChecks must be an array`);
  }
  const expectedChecks = new Map(options.expectedWidgetChecks.map((check) => [checkKey(check), check]));
  const suppliedChecks = new Map<string, QaWidgetCheck>();
  for (const [index, valueAtIndex] of (Array.isArray(root.widgetChecks) ? root.widgetChecks : []).entries()) {
    if (!isRecord(valueAtIndex)) {
      errors.push(`${options.packetId}: widgetChecks[${index}] must be an object`);
      continue;
    }
    const widgetKind = typeof valueAtIndex.widgetKind === "string" ? valueAtIndex.widgetKind : "";
    const viewport = typeof valueAtIndex.viewport === "string" ? valueAtIndex.viewport : "";
    const key = checkKey({ widgetKind, viewport });
    if (!expectedChecks.has(key)) {
      errors.push(`${options.packetId}: widgetChecks contains unknown row ${widgetKind}@${viewport}`);
      continue;
    }
    if (suppliedChecks.has(key)) {
      errors.push(`${options.packetId}: widgetChecks contains duplicate row ${widgetKind}@${viewport}`);
      continue;
    }
    if (!allowedStatuses.has(valueAtIndex.status as QaStatus)) {
      errors.push(`${options.packetId}/${widgetKind}/${viewport}: invalid widget check status`);
    }
    if (typeof valueAtIndex.sizeRequirement !== "string") {
      errors.push(`${options.packetId}/${widgetKind}/${viewport}: sizeRequirement must be a string`);
    } else if (valueAtIndex.sizeRequirement !== expectedChecks.get(key)?.sizeRequirement) {
      errors.push(`${options.packetId}/${widgetKind}/${viewport}: sizeRequirement does not match the assignment`);
    }
    suppliedChecks.set(key, {
      widgetKind,
      viewport,
      sizeRequirement: typeof valueAtIndex.sizeRequirement === "string" ? valueAtIndex.sizeRequirement : "",
      status: statusOrNotReached(valueAtIndex.status),
    });
  }
  const widgetChecks = options.expectedWidgetChecks.map((expected) => {
    const supplied = suppliedChecks.get(checkKey(expected));
    if (supplied) return supplied;
    errors.push(
      `${options.packetId}: widgetChecks is missing assigned row ${expected.widgetKind}@${expected.viewport}`,
    );
    return { ...expected, status: "not-reached" as const };
  });

  if (!Array.isArray(root.findings)) errors.push(`${options.packetId}: findings must be an array`);
  const findings = (Array.isArray(root.findings) ? root.findings : []).flatMap((finding, index) => {
    if (!isRecord(finding)) {
      errors.push(`${options.packetId}: findings[${index}] must be an object`);
      return [];
    }
    if (!["P0", "P1", "P2", "P3"].includes(String(finding.severity))) {
      errors.push(`${options.packetId}: findings[${index}] has an invalid severity`);
    }
    if (typeof finding.title !== "string") {
      errors.push(`${options.packetId}: findings[${index}].title must be a string`);
    }
    if (finding.caseIds !== undefined && !Array.isArray(finding.caseIds)) {
      errors.push(`${options.packetId}: findings[${index}].caseIds must be an array`);
    } else if (Array.isArray(finding.caseIds) && finding.caseIds.some((caseId) => typeof caseId !== "string")) {
      errors.push(`${options.packetId}: findings[${index}].caseIds must contain only strings`);
    } else if (
      Array.isArray(finding.caseIds) &&
      finding.caseIds.some((caseId) => !options.expectedCaseIds.includes(String(caseId)))
    ) {
      errors.push(`${options.packetId}: findings[${index}].caseIds contains an unknown assigned case`);
    }
    if (finding.evidence !== undefined && !Array.isArray(finding.evidence)) {
      errors.push(`${options.packetId}: findings[${index}].evidence must be an array`);
    } else if (Array.isArray(finding.evidence) && finding.evidence.some((entry) => typeof entry !== "string")) {
      errors.push(`${options.packetId}: findings[${index}].evidence must contain only strings`);
    }
    return [
      {
        id: typeof finding.id === "string" ? finding.id : undefined,
        fingerprint: typeof finding.fingerprint === "string" ? finding.fingerprint : undefined,
        severity: severityOrP3(finding.severity),
        title: typeof finding.title === "string" ? finding.title : "",
        area: typeof finding.area === "string" ? finding.area : undefined,
        summary: typeof finding.summary === "string" ? finding.summary : undefined,
        caseIds: Array.isArray(finding.caseIds) ? strings(finding.caseIds) : undefined,
        evidence: Array.isArray(finding.evidence) ? strings(finding.evidence) : undefined,
      },
    ];
  });

  if (!Array.isArray(root.artifacts)) errors.push(`${options.packetId}: artifacts must be an array`);
  if (Array.isArray(root.artifacts) && root.artifacts.some((artifact) => typeof artifact !== "string")) {
    errors.push(`${options.packetId}: artifacts must contain only strings`);
  }
  const artifacts = strings(root.artifacts);

  const execution = isRecord(root.execution) ? root.execution : {};
  if (!isRecord(root.execution)) errors.push(`${options.packetId}: execution metadata must be an object`);
  if (!Array.isArray(execution.runtimeFlags)) {
    errors.push(`${options.packetId}: execution.runtimeFlags must be an array`);
  } else if (execution.runtimeFlags.some((flag) => typeof flag !== "string")) {
    errors.push(`${options.packetId}: execution.runtimeFlags must contain only strings`);
  }
  for (const field of [
    "candidateSha",
    "url",
    "runtimeProfile",
    "persona",
    "sessionId",
    "timestamp",
    "viewport",
    "input",
  ]) {
    const fieldValue = execution[field];
    if (fieldValue !== undefined && fieldValue !== null && typeof fieldValue !== "string") {
      errors.push(`${options.packetId}: execution.${field} must be a string or null`);
    }
  }
  for (const field of ["actualPort", "zoom"]) {
    const fieldValue = execution[field];
    if (fieldValue !== undefined && fieldValue !== null && typeof fieldValue !== "number") {
      errors.push(`${options.packetId}: execution.${field} must be a number or null`);
    }
  }

  const performance = isRecord(root.performance) ? root.performance : {};
  if (!isRecord(root.performance)) errors.push(`${options.packetId}: performance must be an object`);
  if (!Array.isArray(performance.measurements)) {
    errors.push(`${options.packetId}: performance.measurements must be an array`);
  }
  if (!Array.isArray(performance.limitations)) {
    errors.push(`${options.packetId}: performance.limitations must be an array`);
  } else if (performance.limitations.some((limitation) => typeof limitation !== "string")) {
    errors.push(`${options.packetId}: performance.limitations must contain only strings`);
  }
  const measurements = (Array.isArray(performance.measurements) ? performance.measurements : []).flatMap(
    (measurement, index) => {
      if (!isRecord(measurement)) {
        errors.push(`${options.packetId}: performance.measurements[${index}] must be an object`);
        return [];
      }
      for (const field of ["name", "unit", "threshold"]) {
        if (typeof measurement[field] !== "string") {
          errors.push(`${options.packetId}: performance.measurements[${index}].${field} must be a string`);
        }
      }
      if (measurement.value !== null && typeof measurement.value !== "number") {
        errors.push(`${options.packetId}: performance.measurements[${index}].value must be a number or null`);
      }
      if (!allowedStatuses.has(measurement.status as QaStatus)) {
        errors.push(`${options.packetId}: performance.measurements[${index}].status is invalid`);
      }
      if (!Array.isArray(measurement.evidence)) {
        errors.push(`${options.packetId}: performance.measurements[${index}].evidence must be an array`);
      } else if (measurement.evidence.some((entry) => typeof entry !== "string")) {
        errors.push(`${options.packetId}: performance.measurements[${index}].evidence must contain only strings`);
      }
      return [
        {
          name: typeof measurement.name === "string" ? measurement.name : "",
          value: numberOrNull(measurement.value),
          unit: typeof measurement.unit === "string" ? measurement.unit : "",
          threshold: typeof measurement.threshold === "string" ? measurement.threshold : "",
          status: statusOrNotReached(measurement.status),
          evidence: strings(measurement.evidence),
        },
      ];
    },
  );

  if (!Array.isArray(root.independentReproductions)) {
    errors.push(`${options.packetId}: independentReproductions must be an array`);
  }
  const independentReproductions = (
    Array.isArray(root.independentReproductions) ? root.independentReproductions : []
  ).flatMap((reproduction, index) => {
    if (!isRecord(reproduction)) {
      errors.push(`${options.packetId}: independentReproductions[${index}] must be an object`);
      return [];
    }
    for (const field of ["findingFingerprint", "agentId", "notes"]) {
      if (typeof reproduction[field] !== "string") {
        errors.push(`${options.packetId}: independentReproductions[${index}].${field} must be a string`);
      }
    }
    if (!["reproduced", "not-reproduced", "blocked", "not-reached"].includes(String(reproduction.outcome))) {
      errors.push(`${options.packetId}: independentReproductions[${index}].outcome is invalid`);
    }
    if (!Array.isArray(reproduction.evidence)) {
      errors.push(`${options.packetId}: independentReproductions[${index}].evidence must be an array`);
    } else if (reproduction.evidence.some((entry) => typeof entry !== "string")) {
      errors.push(`${options.packetId}: independentReproductions[${index}].evidence must contain only strings`);
    }
    return [
      {
        findingFingerprint: typeof reproduction.findingFingerprint === "string" ? reproduction.findingFingerprint : "",
        agentId: typeof reproduction.agentId === "string" ? reproduction.agentId : "",
        outcome: typeof reproduction.outcome === "string" ? reproduction.outcome : "not-reached",
        evidence: strings(reproduction.evidence),
        notes: typeof reproduction.notes === "string" ? reproduction.notes : "",
      },
    ];
  });

  if (!allowedStatuses.has(root.status as QaStatus)) {
    errors.push(`${options.packetId}: invalid report status ${String(root.status)}`);
  }
  if (typeof root.notes !== "string") errors.push(`${options.packetId}: notes must be a string`);

  return {
    metadata: {
      packetId: typeof root.packetId === "string" ? root.packetId : options.packetId,
      status: statusOrNotReached(root.status),
      caseStatuses,
      execution: {
        candidateSha: textOrNull(execution.candidateSha),
        url: textOrNull(execution.url),
        actualPort: numberOrNull(execution.actualPort),
        runtimeProfile: textOrNull(execution.runtimeProfile),
        runtimeFlags: strings(execution.runtimeFlags),
        persona: textOrNull(execution.persona),
        sessionId: textOrNull(execution.sessionId),
        timestamp: textOrNull(execution.timestamp),
        viewport: textOrNull(execution.viewport),
        input: textOrNull(execution.input),
        zoom: numberOrNull(execution.zoom),
      },
      findings,
      artifacts,
      widgetChecks,
      performance: {
        measurements,
        limitations: strings(performance.limitations),
      },
      independentReproductions,
      notes: typeof root.notes === "string" ? root.notes : "",
    },
    errors,
  };
};

export const collectCriticalCoverageGaps = (
  reports: {
    packetId: string;
    caseStatuses: Record<string, QaStatus>;
    widgetChecks: QaWidgetCheck[];
    metadataErrors?: string[];
  }[],
): CoverageGap[] =>
  reports.flatMap((report) => {
    const caseGaps = Object.entries(report.caseStatuses)
      .filter(([, status]) => status !== "passed")
      .map(([caseId, status]) => ({
        packetId: report.packetId,
        kind: "case" as const,
        itemId: caseId,
        status,
      }));
    const widgetGaps = report.widgetChecks
      .filter((check) => check.status !== "passed")
      .map((check) => ({
        packetId: report.packetId,
        kind: "widget" as const,
        itemId: `${check.widgetKind}@${check.viewport}`,
        status: check.status,
      }));
    const metadataGaps = (report.metadataErrors ?? []).map((detail, index) => ({
      packetId: report.packetId,
      kind: "metadata" as const,
      itemId: `metadata-${index + 1}`,
      status: "blocked" as const,
      detail,
    }));
    return [...caseGaps, ...widgetGaps, ...metadataGaps];
  });

export const releaseDecision = (severityTotals: { P0: number; P1: number }, gaps: CoverageGap[]): "GO" | "NO-GO" => {
  if (severityTotals.P0 > 0 || severityTotals.P1 > 0 || gaps.length > 0) return "NO-GO";
  return "GO";
};
