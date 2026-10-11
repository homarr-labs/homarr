import assert from "node:assert/strict";

import type {
  SpeedtestTrackerDashboardData,
  SpeedtestTrackerStats,
} from "../../../../packages/integrations/src/speedtest-tracker/speedtest-tracker-types.ts";
import type { TraefikDashboardData } from "../../../../packages/integrations/src/traefik/traefik-types.ts";
import type { UptimeKumaDashboardData } from "../../../../packages/integrations/src/uptime-kuma/uptime-kuma-types.ts";
import type { BenchmarkContext, Side } from "../lib.mts";
import { benchmarkPair } from "../lib.mts";

const required = <T,>(value: T | null | undefined): T => {
  assert.ok(value !== null && value !== undefined);
  return value;
};

const kumaFile = "packages/widgets/src/uptime-kuma/aggregate.ts";
const speedtestFile = "packages/widgets/src/speedtest-tracker/helpers.ts";
const tracearrFile = "packages/widgets/src/tracearr/component.tsx";
const traefikFile = "packages/widgets/src/traefik/component.tsx";

// Logical reference writes are derived from fixture lengths and the extracted
// spread/append source. They are not measured heap bytes or backing-store sizes.
const growingReferenceWrites = (lengths: number[]) => {
  let prefix = 0;
  let writes = 0;
  for (const length of lengths) {
    prefix += length;
    writes += prefix;
  }
  return writes;
};

const kumaFixture = (sources: number, rows: number): UptimeKumaDashboardData[] =>
  Array.from({ length: sources }, (_sourceValue, source) => ({
    totalMonitors: rows,
    upCount: Math.floor(rows / 2),
    downCount: Math.floor(rows / 3),
    pausedCount: rows - Math.floor(rows / 2) - Math.floor(rows / 3),
    averageUptimePercent: 0,
    monitors: Array.from({ length: rows }, (_rowValue, row) => ({
      id: row,
      name: `${source}:${row}`,
      status: "up",
      uptimePercent24h: row % 5 === 0 ? null : (source + row) % 101,
    })),
  }));

type KumaSummary = Omit<UptimeKumaDashboardData, "monitors">;
const kumaDisplay = (result: KumaSummary): KumaSummary => ({
  totalMonitors: result.totalMonitors,
  upCount: result.upCount,
  downCount: result.downCount,
  pausedCount: result.pausedCount,
  averageUptimePercent: result.averageUptimePercent,
});

const speedtestStats = (average: number, count: number): SpeedtestTrackerStats => ({
  ping: { avg: average, min: average - 1, max: average + 1 },
  download: { avg: average, avg_bits: average * 8, min: average - 2, max: average + 2 },
  upload: { avg: average, min: average - 3, max: average + 3 },
  total_results: count,
});
const speedtestFixture = (sources: number, rows: number): SpeedtestTrackerDashboardData[] =>
  Array.from({ length: sources }, (_sourceValue, source) => {
    const recentResults = Array.from({ length: rows }, (_rowValue, row) => ({
      id: row,
      ping: 10 + row,
      download_bits: 1000 + row,
      upload_bits: 100 + row,
      healthy: true,
      created_at: new Date(1000 + source * 100 + row),
    }));
    return { latestResult: recentResults.at(-1) ?? null, stats: speedtestStats(source + 5, rows), recentResults };
  });

type TraceRow = { id: string; label: string; bitrate: number | null };
type TraceSource = {
  integrationId: string;
  integrationName: string;
  dashboard: {
    stats: {
      activeStreams: number;
      totalUsers: number;
      totalSessions: number;
      recentViolations: number;
      timestamp: string;
    };
    streams: {
      data: TraceRow[];
      summary: {
        total: number;
        transcodes: number;
        directStreams: number;
        directPlays: number;
        totalBitrate: string;
        byServer: { serverId: string }[];
      };
    };
    violations: { data: TraceRow[]; meta: { total: number; page: number; pageSize: number } } | null;
    recentActivity: { data: TraceRow[]; meta: { total: number; page: number; pageSize: number } } | null;
  };
};
const tracearrFixture = (sources: number, rows: number): TraceSource[] =>
  Array.from({ length: sources }, (_sourceValue, source) => {
    const data = Array.from({ length: rows }, (_rowValue, row) => ({
      id: `${row}`,
      label: `${source}:${row}`,
      bitrate: 100 + row,
    }));
    return {
      integrationId: `tracearr-${source}`,
      integrationName: `Tracearr ${source}`,
      dashboard: {
        stats: {
          activeStreams: rows,
          totalUsers: source + 5,
          totalSessions: 50,
          recentViolations: 5,
          timestamp: `${source}`,
        },
        streams: {
          data,
          summary: {
            total: rows,
            transcodes: source + 1,
            directStreams: 2,
            directPlays: 3,
            totalBitrate: "unused",
            byServer: [{ serverId: `${source}` }],
          },
        },
        violations: { data: data.slice(0, 5), meta: { total: 50, page: 1, pageSize: 5 } },
        recentActivity: { data: data.slice(0, 5), meta: { total: 50, page: 1, pageSize: 5 } },
      },
    };
  });

type TraceSummary = { total: number; transcodes: number; totalBitrate: string };
type TraceResult = {
  combined: {
    stats: { activeStreams: number; totalUsers: number };
    streams?: { summary: TraceSummary };
    summary?: TraceSummary;
  };
  sourcedStreams: TraceRow[];
  sourcedViolations: TraceRow[];
  sourcedRecentActivity: TraceRow[];
  sectionVisibility: Record<string, boolean>;
  noSectionsEnabled: boolean;
};
const tracearrDisplay = (result: TraceResult) => {
  const summary = result.combined.summary ?? required(result.combined.streams).summary;
  return {
    stats: { activeStreams: result.combined.stats.activeStreams, totalUsers: result.combined.stats.totalUsers },
    summary: { total: summary.total, transcodes: summary.transcodes, totalBitrate: summary.totalBitrate },
    streams: result.sourcedStreams,
    violations: result.sourcedViolations,
    recentActivity: result.sourcedRecentActivity,
    sectionVisibility: result.sectionVisibility,
    noSectionsEnabled: result.noSectionsEnabled,
  };
};
const tracearrOperation = (ctx: BenchmarkContext, side: Side) => {
  const formatBitRate = ctx.evaluate(side, "packages/common/src/number.ts", [
    "pickUnitIndex",
    "pickRoundedUnitIndex",
    "BIT_RATE_UNITS",
    "formatBitRate",
  ]);
  const formatTotalTracearrBitrate = ctx.evaluate(
    side,
    "packages/widgets/src/tracearr/bitrate.ts",
    ["formatTracearrBitrate", "formatTotalTracearrBitrate"],
    { formatBitRate },
  );
  const attachTracearrSource = ctx.evaluate(side, "packages/widgets/src/tracearr/source.ts", "attachTracearrSource");
  const getTracearrSectionVisibility = ctx.evaluate(side, tracearrFile, "getTracearrSectionVisibility");
  let start = "  const sourcedStreams = successfulDashboards.flatMap";
  if (side === "before") start = "  // Merge data from all integrations";
  return ctx.evaluate<(sources: TraceSource[], mode: string, options: Record<string, boolean>) => TraceResult>(
    side,
    tracearrFile,
    { kind: "span", start, end: "  const showSource =" },
    { formatTotalTracearrBitrate, attachTracearrSource, getTracearrSectionVisibility },
    {
      parameters: ["successfulDashboards", "displayMode", "options"],
      returnExpression:
        "({combined, sourcedStreams, sourcedViolations, sourcedRecentActivity, sectionVisibility, noSectionsEnabled})",
    },
  );
};

type TraefikSource = { integrationId: string; integrationName: string; dashboard: TraefikDashboardData };
const traefikFixture = (sources: number, rows: number): TraefikSource[] =>
  Array.from({ length: sources }, (_sourceValue, source) => {
    const summary = { total: rows, enabled: rows - 3, warnings: 1, errors: 2 };
    const protocol = { routers: summary, services: summary, middlewares: summary };
    return {
      integrationId: `traefik-${source}`,
      integrationName: `Traefik ${source}`,
      dashboard: {
        version: `${source}`,
        entryPoints: ["web", "websecure", `${source}`],
        failedEndpoints: ["/api/http/routers", "/api/tcp/services"],
        resources: Array.from({ length: rows }, (_rowValue, row) => ({
          protocol: "http",
          type: "router",
          name: `router-${row}`,
          provider: null,
          status: "enabled",
        })),
        http: protocol,
        tcp: protocol,
        udp: { routers: summary, services: summary },
      },
    };
  });

type TraefikResult = {
  combined: Pick<TraefikDashboardData, "entryPoints" | "http" | "tcp" | "udp"> & {
    failedEndpointCount?: number;
    failedEndpoints?: string[];
  };
  totalRouters: number;
  totalErrors: number;
  totalWarnings: number;
  entryPoints: string[];
  protocolKeys: string[];
  displayedVersion: string | null;
};
const traefikDisplay = (result: TraefikResult) => ({
  ...result,
  combined: {
    entryPoints: result.combined.entryPoints,
    http: result.combined.http,
    tcp: result.combined.tcp,
    udp: result.combined.udp,
    failedEndpointCount: result.combined.failedEndpointCount ?? required(result.combined.failedEndpoints).length,
  },
});
const traefikOperation = (ctx: BenchmarkContext, side: Side) => {
  const helpers = ctx.evaluate<Record<string, unknown>>(
    side,
    traefikFile,
    [
      "emptySummary",
      "emptyProtocol",
      "emptyDashboard",
      "combineProtocol",
      "combineSummary",
      "getProtocolErrors",
      "getProtocolWarnings",
      "getUdpErrors",
      "getUdpWarnings",
      "dedupe",
      "getEntryPointLimit",
      "getTraefikProtocolKeys",
      "getVisibleTraefikEntryPoints",
    ],
    {},
    {
      returnExpression:
        "({emptyDashboard, combineProtocol, combineSummary, getProtocolErrors, getProtocolWarnings, getUdpErrors, getUdpWarnings, dedupe, getTraefikProtocolKeys, getVisibleTraefikEntryPoints})",
    },
  );
  return ctx.evaluate<
    (sources: TraefikSource[], mode: string, options: Record<string, boolean>, width: number) => TraefikResult
  >(
    side,
    traefikFile,
    { kind: "span", start: "  const combined = successfulData.reduce", end: "  const summary = (" },
    helpers,
    {
      parameters: ["successfulData", "displayMode", "options", "width"],
      returnExpression:
        "({combined, totalRouters, totalErrors, totalWarnings, entryPoints, protocolKeys, displayedVersion})",
    },
  );
};

const aggregateCases = (sourceCount: number) => [
  benchmarkPair({
    id: "WTA-1",
    title: "Remove unused Uptime Kuma monitor aggregates",
    files: [kumaFile],
    iterations: 2000,
    async: false,
    timing: true,
    fixture: `${sourceCount} integrations with 100 monitors each; non-null values weighted per monitor. Checks empty, one source, unequal source sizes, nulls, all four counters, and input immutability. Logical reference metrics exclude engine backing-store allocation.`,
    metricUnits: {
      aggregateMonitorReferenceWrites: "logical reference writes",
      temporaryUptimeSlotsWritten: "logical array slots",
      displayedCounterCount: "counters",
    },
    prepare(ctx) {
      type Aggregate = (dashboards: UptimeKumaDashboardData[]) => KumaSummary;
      const before = ctx.evaluate<Aggregate>("before", kumaFile, ["emptyDashboard", "aggregateUptimeKumaDashboards"]);
      const after = ctx.evaluate<Aggregate>("after", kumaFile, "aggregateUptimeKumaDashboards");
      const fixture = kumaFixture(sourceCount, 100);
      const snapshot = structuredClone(fixture);
      return {
        before: () => before(fixture),
        after: () => after(fixture),
        verify(a, b) {
          assert.deepEqual(kumaDisplay(b as KumaSummary), kumaDisplay(a as KumaSummary));
          const weighted = [required(kumaFixture(1, 1)[0]), required(kumaFixture(1, 3)[0])];
          required(required(weighted[0]).monitors[0]).uptimePercent24h = 100;
          for (const monitor of required(weighted[1]).monitors) monitor.uptimePercent24h = 0;
          for (const edge of [[], kumaFixture(1, 1), kumaFixture(2, 3), weighted]) {
            assert.deepEqual(kumaDisplay(after(edge)), kumaDisplay(before(edge)));
          }
          assert.equal(after(weighted).averageUptimePercent, 25);
          assert.deepEqual(kumaDisplay(after([])), {
            totalMonitors: 0,
            upCount: 0,
            downCount: 0,
            pausedCount: 0,
            averageUptimePercent: 0,
          });
          assert.deepEqual(fixture, snapshot);
        },
        metrics(_result, side) {
          let references = 0;
          let slots = 0;
          if (side === "before") {
            references = growingReferenceWrites(fixture.map(({ monitors }) => monitors.length));
            slots = fixture.reduce(
              (total, { monitors }) =>
                total + monitors.length + monitors.filter(({ uptimePercent24h }) => uptimePercent24h !== null).length,
              0,
            );
          }
          return {
            aggregateMonitorReferenceWrites: references,
            temporaryUptimeSlotsWritten: slots,
            displayedCounterCount: 4,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "WMB2-1",
    title: "Append Speedtest history without copying prefixes",
    files: [speedtestFile],
    iterations: 2000,
    async: false,
    timing: true,
    fixture: `${sourceCount} integrations with the API cap of 30 recent rows each. Checks null/empty stats, zero weights, missing bit rates, strict timestamp ties, source order, identity, and input immutability. No helper sorting.`,
    metricUnits: {
      historyReferenceWrites: "logical reference writes",
      historyArrayObjects: "logical array objects",
      displayedHistoryRows: "rows",
    },
    prepare(ctx) {
      type Combine = (dashboards: SpeedtestTrackerDashboardData[]) => SpeedtestTrackerDashboardData;
      const declarations = ["mergeStats", "selectLatestResult", "combineSpeedtestDashboards"];
      const before = ctx.evaluate<Combine>("before", speedtestFile, declarations);
      const after = ctx.evaluate<Combine>("after", speedtestFile, declarations);
      const fixture = speedtestFixture(sourceCount, 30);
      const snapshot = structuredClone(fixture);
      return {
        before: () => before(fixture),
        after: () => after(fixture),
        verify(a, b) {
          assert.deepEqual(b, a);
          const ties = speedtestFixture(3, 2);
          for (const dashboard of ties) required(dashboard.latestResult).created_at = new Date(1000);
          const zeroStats = speedtestFixture(3, 1);
          for (const dashboard of zeroStats) required(dashboard.stats).total_results = 0;
          const mixedStats = speedtestFixture(3, 1);
          delete required(required(mixedStats[1]).stats).download.avg_bits;
          required(required(mixedStats[0]).stats).upload.avg_bits = 24;
          for (const edge of [
            [],
            speedtestFixture(1, 0),
            speedtestFixture(1, 1),
            ties,
            zeroStats,
            mixedStats,
            [{ latestResult: null, stats: null, recentResults: [] }, ...speedtestFixture(2, 2)],
          ]) {
            assert.deepEqual(after(edge), before(edge));
          }
          assert.equal(after(ties).latestResult, required(ties[0]).latestResult);
          assert.deepEqual(
            after(fixture).recentResults,
            fixture.flatMap(({ recentResults }) => recentResults),
          );
          assert.equal(after(fixture).recentResults[0], required(fixture[0]).recentResults[0]);
          assert.deepEqual(fixture, snapshot);
        },
        metrics(result, side) {
          let writes = fixture.reduce((total, dashboard) => total + dashboard.recentResults.length, 0);
          let arrays = 1;
          if (side === "before") {
            writes = growingReferenceWrites(fixture.map(({ recentResults }) => recentResults.length));
            arrays += fixture.length;
          }
          return {
            historyReferenceWrites: writes,
            historyArrayObjects: arrays,
            displayedHistoryRows: (result as SpeedtestTrackerDashboardData).recentResults.length,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "WB-001",
    title: "Delete duplicate Tracearr aggregate rows",
    files: [tracearrFile, "packages/widgets/src/tracearr/stats-section.tsx"],
    iterations: 500,
    async: false,
    timing: true,
    fixture: `${sourceCount} integrations with 50 streams, one server summary, five violations and five activity rows each. Actual source-tagging and bitrate helpers run in both source blocks. Checks null sections, empty/one source, invalid bitrates, all display totals and ordered sourced rows. Timing excludes React rendering.`,
    metricUnits: { duplicateAggregateReferenceWrites: "logical reference writes", displayedRows: "rows" },
    prepare(ctx) {
      const before = tracearrOperation(ctx, "before");
      const after = tracearrOperation(ctx, "after");
      const fixture = tracearrFixture(sourceCount, 50);
      const snapshot = structuredClone(fixture);
      const options = { showStats: true, showStreams: true, showViolations: true, showRecentActivity: true };
      return {
        before: () => before(fixture, "compact", options),
        after: () => after(fixture, "compact", options),
        verify(a, b) {
          assert.deepEqual(tracearrDisplay(b as TraceResult), tracearrDisplay(a as TraceResult));
          const nullSections = tracearrFixture(2, 3);
          required(nullSections[0]).dashboard.violations = null;
          required(nullSections[1]).dashboard.recentActivity = null;
          const invalidRates = tracearrFixture(1, 6);
          [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, 500].forEach((bitrate, index) => {
            required(required(invalidRates[0]).dashboard.streams.data[index]).bitrate = bitrate;
          });
          for (const edge of [[], tracearrFixture(1, 0), tracearrFixture(1, 1), nullSections, invalidRates]) {
            for (const mode of ["compact", "advanced"])
              assert.deepEqual(
                tracearrDisplay(after(edge, mode, options)),
                tracearrDisplay(before(edge, mode, options)),
              );
          }
          assert.equal(tracearrDisplay(after(invalidRates, "compact", options)).summary.totalBitrate, "500 Kb/s");
          assert.equal(tracearrDisplay(after([], "compact", options)).summary.totalBitrate, "—");
          const hidden = { showStats: false, showStreams: false, showViolations: false, showRecentActivity: false };
          for (const mode of ["compact", "advanced"]) {
            assert.deepEqual(
              tracearrDisplay(after(fixture, mode, hidden)),
              tracearrDisplay(before(fixture, mode, hidden)),
            );
          }
          assert.equal(after(fixture, "compact", hidden).noSectionsEnabled, true);
          assert.equal(after(fixture, "advanced", hidden).noSectionsEnabled, false);
          assert.deepEqual(fixture, snapshot);
        },
        metrics(result, side) {
          let references = 0;
          if (side === "before") {
            references =
              growingReferenceWrites(fixture.map(({ dashboard }) => dashboard.streams.data.length)) +
              growingReferenceWrites(fixture.map(({ dashboard }) => dashboard.streams.summary.byServer.length)) +
              growingReferenceWrites(fixture.map(({ dashboard }) => dashboard.violations?.data.length ?? 0)) +
              growingReferenceWrites(fixture.map(({ dashboard }) => dashboard.recentActivity?.data.length ?? 0));
          }
          const output = result as TraceResult;
          return {
            duplicateAggregateReferenceWrites: references,
            displayedRows:
              output.sourcedStreams.length + output.sourcedViolations.length + output.sourcedRecentActivity.length,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "WB-002",
    title: "Count Traefik failed endpoints without combining detail rows",
    files: [traefikFile],
    iterations: 1000,
    async: false,
    timing: true,
    fixture: `${sourceCount} integrations with 250 resources, two failed endpoints and three entry points each. Timing covers existing aggregate/health block; advanced sourceDetails stays separate and its source tags/order are compared. Checks compact/advanced, empty/one source, all protocol counters and input immutability.`,
    metricUnits: {
      discardedDetailReferenceWrites: "logical reference writes",
      failedEndpointCount: "endpoints",
      advancedDetailRows: "rows",
    },
    prepare(ctx) {
      const before = traefikOperation(ctx, "before");
      const after = traefikOperation(ctx, "after");
      type Details = (sources: TraefikSource[]) => { resources: unknown[]; failedEndpoints: unknown[] };
      const beforeDetails = ctx.evaluate<Details>("before", traefikFile, "getTraefikSourceDetails");
      const afterDetails = ctx.evaluate<Details>("after", traefikFile, "getTraefikSourceDetails");
      const fixture = traefikFixture(sourceCount, 250);
      const snapshot = structuredClone(fixture);
      const options = { showTcp: false, showUdp: false };
      return {
        before: () => before(fixture, "compact", options, 300),
        after: () => after(fixture, "compact", options, 300),
        verify(a, b) {
          assert.deepEqual(traefikDisplay(b as TraefikResult), traefikDisplay(a as TraefikResult));
          for (const edge of [[], traefikFixture(1, 0), traefikFixture(1, 1), traefikFixture(3, 2)]) {
            for (const mode of ["compact", "advanced"])
              assert.deepEqual(
                traefikDisplay(after(edge, mode, options, 100)),
                traefikDisplay(before(edge, mode, options, 100)),
              );
            assert.deepEqual(afterDetails(edge), beforeDetails(edge));
          }
          assert.deepEqual(afterDetails(fixture), beforeDetails(fixture));
          assert.deepEqual(fixture, snapshot);
        },
        metrics(result, side) {
          let references = 0;
          if (side === "before")
            references =
              growingReferenceWrites(fixture.map(({ dashboard }) => dashboard.resources.length)) +
              growingReferenceWrites(fixture.map(({ dashboard }) => dashboard.failedEndpoints.length));
          const output = traefikDisplay(result as TraefikResult);
          return {
            discardedDetailReferenceWrites: references,
            failedEndpointCount: output.combined.failedEndpointCount,
            advancedDetailRows: fixture.reduce(
              (total, { dashboard }) => total + dashboard.resources.length + dashboard.failedEndpoints.length,
              0,
            ),
          };
        },
      };
    },
  }),
];

export const cases = [
  ...aggregateCases(8),
  ...aggregateCases(1).map((benchmark) => ({
    ...benchmark,
    id: `${benchmark.id}:small`,
    title: `${benchmark.title} (one integration)`,
  })),
];
