import { describe, expect, it } from "vitest";

import {
  aggregateQaFindings,
  collectCriticalCoverageGaps,
  collectHumanWidgetStatusErrors,
  collectReportIntegrityErrors,
  normalizeReportMetadata,
  releaseDecision,
} from "./report-integrity.mts";
import type { QaReportMetadata, QaWidgetCheck, ReportIntegrityOptions } from "./report-integrity.mts";

const assignedWidgetCheck: QaWidgetCheck = {
  widgetKind: "weather",
  viewport: "320x568",
  sizeRequirement: "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
  status: "not-reached",
};
const campaignCandidateSha = "f57a660088d6777c86aca22977354fa8b810e2be";
const integrityOptions: ReportIntegrityOptions = {
  campaignCandidateSha,
  packetId: "preflight-01",
  profiles: ["main-writable"],
  personas: ["avery-admin"],
  viewports: ["1280x900"],
  zooms: [100],
  inputs: ["mouse"],
  expectedProfileFlags: {
    "main-writable": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  },
};
const validMetadata = (): QaReportMetadata => ({
  packetId: "preflight-01",
  status: "passed",
  caseStatuses: { "PF01-FIXTURE-STATE": "passed" },
  execution: {
    candidateSha: campaignCandidateSha,
    url: "http://127.0.0.1:34401",
    actualPort: 34401,
    runtimeProfile: "main-writable",
    runtimeFlags: ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
    persona: "avery-admin",
    sessionId: "qa-v2-main-avery-admin",
    timestamp: "2026-09-01T00:00:00.000Z",
    viewport: "1280x900",
    input: "mouse",
    zoom: 100,
  },
  findings: [],
  artifacts: ["/tmp/qa-artifact.png"],
  widgetChecks: [],
  performance: { measurements: [], limitations: [] },
  independentReproductions: [],
  notes: "Complete.",
});

describe("release-v2 report integrity", () => {
  it("keeps the highest severity while merging duplicate finding evidence and reproductions", () => {
    const fingerprint = "same-defect";
    const findings = aggregateQaFindings([
      {
        packetId: "widgets-01",
        findings: [
          {
            fingerprint,
            severity: "P3",
            title: "Initial low-severity title",
            caseIds: ["W01-RENDER-STATE"],
            evidence: ["/tmp/first.png"],
          },
        ],
        independentReproductions: [
          {
            findingFingerprint: fingerprint,
            agentId: "reproducer-01",
            outcome: "reproduced",
            evidence: ["/tmp/repro-first.png"],
            notes: "First replay.",
          },
        ],
      },
      {
        packetId: "widgets-02",
        findings: [
          {
            fingerprint,
            severity: "P1",
            title: "Confirmed release blocker",
            caseIds: ["W02-RENDER-STATE"],
            evidence: ["/tmp/first.png", "/tmp/second.png"],
          },
        ],
        independentReproductions: [],
      },
      {
        packetId: "repro-widgets-02",
        findings: [],
        independentReproductions: [
          {
            findingFingerprint: fingerprint,
            agentId: "reproducer-01",
            outcome: "reproduced",
            evidence: ["/tmp/repro-second.png"],
            notes: "Second replay.",
          },
        ],
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: "P1",
      title: "Confirmed release blocker",
      packets: ["widgets-01", "widgets-02"],
      caseIds: ["W01-RENDER-STATE", "W02-RENDER-STATE"],
      evidence: ["/tmp/first.png", "/tmp/second.png"],
    });
    expect(findings[0]?.reproductions).toEqual([
      {
        findingFingerprint: fingerprint,
        agentId: "reproducer-01",
        outcome: "reproduced",
        evidence: ["/tmp/repro-first.png", "/tmp/repro-second.png"],
        notes: "First replay.; Second replay.",
      },
    ]);
    const severityTotals = { P0: 0, P1: findings.filter((finding) => finding.severity === "P1").length };
    expect(releaseDecision(severityTotals, [])).toBe("NO-GO");
  });

  it("requires each human widget status to exactly match the structured status", () => {
    const passedCheck = { ...assignedWidgetCheck, status: "passed" as const };
    const content = `## Widget kind × viewport checklist

| Widget kind | Viewport | Size | States | Permission/read-only | Options/persistence | Recovery | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| weather | 320x568 | ${assignedWidgetCheck.sizeRequirement} | healthy | owner | reload | recovered | evidence | not-reached |

## Findings`;

    expect(collectHumanWidgetStatusErrors(content, "widgets-01", [passedCheck])).toEqual([
      "widgets-01/weather/320x568: human widget status not-reached differs from structured status passed",
    ]);
    expect(
      collectHumanWidgetStatusErrors(content.replace("| not-reached |", "| passed |"), "widgets-01", [passedCheck]),
    ).toEqual([]);
  });

  it("keeps the release NO-GO when cases pass but an assigned widget check is not reached", () => {
    const gaps = collectCriticalCoverageGaps([
      {
        packetId: "widgets-01",
        caseStatuses: { "W01-RENDER-STATE": "passed" },
        widgetChecks: [assignedWidgetCheck],
      },
    ]);

    expect(gaps).toEqual([
      {
        packetId: "widgets-01",
        kind: "widget",
        itemId: "weather@320x568",
        status: "not-reached",
      },
    ]);
    expect(releaseDecision({ P0: 0, P1: 0 }, gaps)).toBe("NO-GO");
  });

  it("reports null and malformed metadata without throwing", () => {
    const normalize = () =>
      normalizeReportMetadata(
        {
          packetId: "widgets-01",
          status: "passed",
          caseStatuses: null,
          execution: { candidateSha: {}, runtimeFlags: null },
          findings: null,
          artifacts: null,
          widgetChecks: null,
          performance: null,
          independentReproductions: null,
        },
        {
          packetId: "widgets-01",
          expectedCaseIds: ["W01-RENDER-STATE"],
          expectedWidgetChecks: [assignedWidgetCheck],
        },
      );

    expect(normalize).not.toThrow();
    const result = normalize();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "widgets-01: caseStatuses must be an object",
        "widgets-01: findings must be an array",
        "widgets-01: widgetChecks must be an array",
        "widgets-01: execution.runtimeFlags must be an array",
        "widgets-01: execution.candidateSha must be a string or null",
      ]),
    );
    expect(result.metadata.caseStatuses).toEqual({ "W01-RENDER-STATE": "not-reached" });
    expect(result.metadata.findings).toEqual([]);
    expect(result.metadata.widgetChecks).toEqual([assignedWidgetCheck]);

    const gaps = collectCriticalCoverageGaps([
      {
        packetId: "widgets-01",
        caseStatuses: result.metadata.caseStatuses,
        widgetChecks: result.metadata.widgetChecks,
        metadataErrors: result.errors,
      },
    ]);
    expect(gaps.some((gap) => gap.kind === "metadata")).toBe(true);
    expect(releaseDecision({ P0: 0, P1: 0 }, gaps)).toBe("NO-GO");
  });

  it("turns a null metadata root into deterministic validation errors", () => {
    const result = normalizeReportMetadata(null, {
      packetId: "widgets-01",
      expectedCaseIds: ["W01-RENDER-STATE"],
      expectedWidgetChecks: [assignedWidgetCheck],
    });

    expect(result.errors[0]).toBe("widgets-01: report metadata must be an object");
    expect(result.metadata.caseStatuses["W01-RENDER-STATE"]).toBe("not-reached");
    expect(result.metadata.widgetChecks[0]?.status).toBe("not-reached");
  });

  it("forces a metadata gap and NO-GO for an executed report from the wrong candidate", () => {
    const metadata = validMetadata();
    metadata.execution.candidateSha = "0000000000000000000000000000000000000000";
    const metadataErrors = collectReportIntegrityErrors(metadata, integrityOptions);
    const gaps = collectCriticalCoverageGaps([
      { packetId: metadata.packetId, caseStatuses: metadata.caseStatuses, widgetChecks: [], metadataErrors },
    ]);

    expect(metadataErrors).toContain(
      `preflight-01: candidateSha must equal the campaign candidate ${campaignCandidateSha}`,
    );
    expect(gaps.some((gap) => gap.kind === "metadata")).toBe(true);
    expect(releaseDecision({ P0: 0, P1: 0 }, gaps)).toBe("NO-GO");
  });

  it("forces a metadata gap and NO-GO when packet status disagrees with passed cases", () => {
    const metadata = validMetadata();
    metadata.status = "failed";
    const metadataErrors = collectReportIntegrityErrors(metadata, integrityOptions);
    const gaps = collectCriticalCoverageGaps([
      { packetId: metadata.packetId, caseStatuses: metadata.caseStatuses, widgetChecks: [], metadataErrors },
    ]);

    expect(metadataErrors).toContain("preflight-01: report status failed does not match case rollup passed");
    expect(releaseDecision({ P0: 0, P1: 0 }, gaps)).toBe("NO-GO");
  });

  it("reports missing execution metadata after any assigned case was reached", () => {
    const metadata = validMetadata();
    metadata.execution.url = null;
    metadata.execution.actualPort = null;

    expect(collectReportIntegrityErrors(metadata, integrityOptions)).toEqual(
      expect.arrayContaining([
        "preflight-01: execution.url is required after execution",
        "preflight-01: execution.actualPort must be a positive integer after execution",
      ]),
    );
  });

  it("leaves valid structured report metadata unchanged", () => {
    const input = validMetadata();
    const normalized = normalizeReportMetadata(input, {
      packetId: "preflight-01",
      expectedCaseIds: ["PF01-FIXTURE-STATE"],
      expectedWidgetChecks: [],
    });

    expect(normalized.errors).toEqual([]);
    expect(normalized.metadata).toEqual(input);
    expect(collectReportIntegrityErrors(normalized.metadata, integrityOptions)).toEqual([]);
  });
});
