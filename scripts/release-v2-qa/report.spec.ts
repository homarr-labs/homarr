// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveCheckoutCandidateSha } from "./provenance.mts";
import {
  hostRuntimeLimitation,
  refreshPlaceholderReports,
  renderPacketReport,
  reportContentIsOnlyBlockedBy,
  reportMetadataHasEvidence,
  rolloverResolvedBlockerReports,
} from "./report.mts";
import { createRuntimeExecutionContract } from "./runtime.mts";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const candidateSha = resolveCheckoutCandidateSha(repoRoot);
const blockerFingerprint = "release-v2-auth-locale-redirect-loop";

describe("release-v2 QA report runtime limitation", () => {
  it("describes the bundler and polling interval from the runtime contract", () => {
    const runtimeExecutionContract = createRuntimeExecutionContract();

    expect(hostRuntimeLimitation).toContain(`the ${runtimeExecutionContract.bundler} bundler`);
    expect(hostRuntimeLimitation).toContain(
      `${runtimeExecutionContract.watcher.watchpackPollingIntervalMs}ms Watchpack polling`,
    );
    expect(hostRuntimeLimitation).not.toContain("Turbopack");
  });
});

interface TestPacket {
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

const coverageManifest = JSON.parse(
  await readFile(path.join(repoRoot, "qa/release-v2/coverage-manifest.json"), "utf8"),
) as { packets: TestPacket[] };
const packet = (packetId: string): TestPacket => {
  const result = coverageManifest.packets.find((entry) => entry.id === packetId);
  if (!result) throw new Error(`Missing test packet ${packetId}`);
  return result;
};

const blockedByResolvedFinding = (testPacket: TestPacket): string => {
  const placeholder = renderPacketReport(testPacket);
  const rawMetadata = placeholder.match(/<!-- release-v2-qa-report\n([\s\S]*?)\n-->/)?.[1];
  if (!rawMetadata) throw new Error(`Missing generated metadata for ${testPacket.id}`);
  const metadata = JSON.parse(rawMetadata) as Record<string, unknown> & {
    status: string;
    caseStatuses: Record<string, string>;
    execution: Record<string, unknown>;
    findings: unknown[];
    artifacts: string[];
    widgetChecks: { status: string }[];
    performance: { measurements: unknown[]; limitations: string[] };
    independentReproductions: unknown[];
  };
  metadata.status = "blocked";
  metadata.caseStatuses = Object.fromEntries(Object.keys(metadata.caseStatuses).map((caseId) => [caseId, "blocked"]));
  metadata.widgetChecks = metadata.widgetChecks.map((check) => ({ ...check, status: "blocked" }));
  metadata.execution = {
    ...metadata.execution,
    url: "http://127.0.0.1:34401",
    actualPort: 34401,
    runtimeProfile: "main-writable",
    runtimeFlags: ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
    persona: testPacket.personas[0] ?? "Avery Admin",
    sessionId: `qa-v2-${testPacket.id}`,
    timestamp: "2026-08-31T15:00:00.000Z",
    viewport: testPacket.viewports[0] ?? "desktop-1440",
    input: testPacket.inputs[0] ?? "mouse",
    zoom: testPacket.zooms[0] ?? 100,
  };
  metadata.findings = [
    {
      fingerprint: blockerFingerprint,
      severity: "P1",
      title: "Locale rewrite redirect loop",
      evidence: [`/tmp/${testPacket.id}/auth-loop.png`],
    },
  ];
  metadata.artifacts = [`/tmp/${testPacket.id}/auth-loop.png`];
  metadata.performance.limitations = ["The application never rendered because of the resolved auth blocker."];
  metadata.independentReproductions = [
    {
      findingFingerprint: blockerFingerprint,
      agentId: "preflight-01",
      outcome: "reproduced",
      evidence: [],
      notes: "Auth-only reproduction.",
    },
  ];
  return placeholder.replace(rawMetadata, JSON.stringify(metadata, null, 2));
};

const untouchedMetadata = () => ({
  packetId: "preflight-01",
  status: "not-reached" as const,
  caseStatuses: { "PF01-FIXTURE-STATE": "not-reached" as const },
  execution: {
    candidateSha: "f57a660088d6777c86aca22977354fa8b810e2be",
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
  widgetChecks: [],
  performance: { measurements: [], limitations: [] },
  independentReproductions: [],
  notes: "Not executed.",
});

describe("release-v2 QA report placeholder refresh", () => {
  it("preserves an executed report before refreshing a later untouched placeholder", async () => {
    const reports = new Map([
      ["preflight-01", "executed report evidence"],
      ["board-01", "untouched placeholder from the previous candidate"],
    ]);

    const counts = await refreshPlaceholderReports(["preflight-01", "board-01"], {
      read: async (packetId) => reports.get(packetId) ?? "",
      isSafePlaceholder: (content) => content.startsWith("untouched placeholder"),
      render: (packetId) => `refreshed placeholder for ${packetId}`,
      write: async (packetId, content) => {
        reports.set(packetId, content);
      },
    });

    expect(counts).toEqual({ refreshed: 1, skipped: 1 });
    expect(reports.get("preflight-01")).toBe("executed report evidence");
    expect(reports.get("board-01")).toBe("refreshed placeholder for board-01");
  });

  it("treats execution metadata as evidence even before a case status changes", () => {
    const metadata = untouchedMetadata();
    metadata.execution.url = "http://127.0.0.1:34401";

    expect(reportMetadataHasEvidence(metadata)).toBe(true);
  });

  it("protects every evidence-bearing report while allowing a candidate-only placeholder", () => {
    expect(reportMetadataHasEvidence(untouchedMetadata())).toBe(false);

    const evidenceReports = [
      () => ({ ...untouchedMetadata(), status: "passed" as const }),
      () => ({ ...untouchedMetadata(), caseStatuses: { "PF01-FIXTURE-STATE": "blocked" as const } }),
      () => ({
        ...untouchedMetadata(),
        widgetChecks: [
          { widgetKind: "weather", viewport: "320x568", sizeRequirement: "minimum", status: "passed" as const },
        ],
      }),
      () => ({
        ...untouchedMetadata(),
        findings: [{ severity: "P3" as const, title: "Observed defect" }],
      }),
      () => ({ ...untouchedMetadata(), artifacts: ["/tmp/evidence.png"] }),
      () => ({
        ...untouchedMetadata(),
        performance: {
          measurements: [
            {
              name: "render",
              value: 1,
              unit: "ms",
              threshold: "under 10 ms",
              status: "passed" as const,
              evidence: [],
            },
          ],
          limitations: [],
        },
      }),
      () => ({ ...untouchedMetadata(), performance: { measurements: [], limitations: ["Host limitation"] } }),
      () => ({
        ...untouchedMetadata(),
        independentReproductions: [
          {
            findingFingerprint: "finding",
            agentId: "reproducer",
            outcome: "reproduced" as const,
            evidence: [],
            notes: "Confirmed.",
          },
        ],
      }),
    ];

    for (const evidenceReport of evidenceReports) expect(reportMetadataHasEvidence(evidenceReport())).toBe(true);
  });
});

describe("release-v2 QA resolved-blocker rollover", () => {
  it("resets actual board and widget packet shapes while preserving an executed preflight", async () => {
    const preflightPacket = packet("preflight-01");
    const boardPacket = packet("board-01");
    const widgetPacket = packet("widgets-01");
    const executedPreflight = renderPacketReport(preflightPacket).replace(
      '"status": "not-reached"',
      '"status": "passed"',
    );
    const reports = new Map<string, { content: string; revision: number }>([
      [preflightPacket.id, { content: executedPreflight, revision: 1 }],
      [boardPacket.id, { content: blockedByResolvedFinding(boardPacket), revision: 1 }],
      [widgetPacket.id, { content: blockedByResolvedFinding(widgetPacket), revision: 1 }],
    ]);

    const counts = await rolloverResolvedBlockerReports([preflightPacket, boardPacket, widgetPacket], {
      read: async (entry) => {
        const report = reports.get(entry.id);
        if (!report) throw new Error(`Missing report ${entry.id}`);
        return { ...report };
      },
      isEligible: (content, entry) => reportContentIsOnlyBlockedBy(content, entry, blockerFingerprint),
      isUnchanged: async (entry, snapshot) => {
        const current = reports.get(entry.id);
        return current?.content === snapshot.content && current.revision === snapshot.revision;
      },
      render: renderPacketReport,
      write: async (entry, content) => {
        reports.set(entry.id, { content, revision: 2 });
      },
    });

    expect(counts).toEqual({ reset: 2, skipped: 1, concurrentlyChanged: 0 });
    expect(reports.get(preflightPacket.id)?.content).toBe(executedPreflight);
    for (const packetId of [boardPacket.id, widgetPacket.id]) {
      const refreshed = reports.get(packetId)?.content ?? "";
      expect(refreshed).toContain(`"candidateSha": "${candidateSha}"`);
      expect(refreshed).toContain(`| Candidate SHA | ${candidateSha} |`);
      expect(refreshed).toContain("| Status | not-reached |");
      expect(refreshed).not.toContain(blockerFingerprint);
    }
  });

  it("skips a report changed by an agent after eligibility was checked", async () => {
    const boardPacket = packet("board-01");
    const initial = blockedByResolvedFinding(boardPacket);
    const agentUpdate = `${initial}\nAgent completed new evidence.\n`;
    const reports = new Map([[boardPacket.id, { content: initial, revision: 1 }]]);

    const counts = await rolloverResolvedBlockerReports([boardPacket], {
      read: async () => ({ content: initial, revision: 1 }),
      isEligible: (content, entry) => reportContentIsOnlyBlockedBy(content, entry, blockerFingerprint),
      isUnchanged: async () => {
        reports.set(boardPacket.id, { content: agentUpdate, revision: 2 });
        return false;
      },
      render: renderPacketReport,
      write: async (entry, content) => {
        reports.set(entry.id, { content, revision: 3 });
      },
    });

    expect(counts).toEqual({ reset: 0, skipped: 0, concurrentlyChanged: 1 });
    expect(reports.get(boardPacket.id)?.content).toBe(agentUpdate);
  });
});
